import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import OpenAI from 'openai';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const runTeamDb = (sql) => {
  try {
    const escapedSql = sql.replace(/'/g, "'\\''");
    const output = execSync(`team-db '${escapedSql}'`, { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    console.error('team-db error:', error.message);
    throw error;
  }
};

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'EduCraft AI Backend is running', 
    aiEnabled: !!openai 
  });
});

app.post('/api/generate-worksheet', async (req, res) => {
  const { grade, subject, skill, difficulty, theme, learningStyle } = req.body;

  if (!grade || !subject) {
    return res.status(400).json({ error: 'Grade and Subject are required' });
  }

  let worksheetData = null;

  if (openai) {
    try {
      const prompt = `
        Generate a structured educational worksheet in JSON format.
        Parameters:
        - Grade: ${grade}
        - Subject: ${subject}
        - Skill/Topic: ${skill || 'General'}
        - Difficulty: ${difficulty}
        - Theme: ${theme || 'None'}
        - Learning Style: ${learningStyle}

        The JSON should follow this structure:
        {
          "title": "String",
          "instructions": "String",
          "questions": [
            {
              "id": "q1",
              "type": "multiple-choice | short-answer | true-false | fill-in-the-blank",
              "prompt": "String",
              "points": Number,
              "options": ["Array of strings if multiple-choice", null otherwise]
            }
          ],
          "answerKey": {
            "q1": "Correct answer string"
          }
        }
        
        Ensure there are at least 5 questions of diverse types.
        Make the content age-appropriate and aligned with standard curriculum for ${grade} ${subject}.
        Return ONLY the JSON object.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: "You are a helpful educational content generator." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      worksheetData = JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI Error:', error.message);
    }
  }

  if (!worksheetData) {
    worksheetData = {
      title: `${subject} Worksheet: ${skill || 'General'}`,
      instructions: `Instructions: Complete the following activities for ${grade} ${subject}. Theme: ${theme || 'None'}.`,
      questions: [
        { id: 'q1', type: 'multiple-choice', prompt: `What is the core concept of ${skill || subject}?`, points: 5, options: ['Option A', 'Option B', 'Option C', 'Option D'] },
        { id: 'q2', type: 'short-answer', prompt: `Describe a real-world application of ${skill || subject}.`, points: 10 },
        { id: 'q3', type: 'true-false', prompt: `Is ${skill || subject} related to ${theme || 'other fields'}?`, points: 5 },
        { id: 'q4', type: 'fill-in-the-blank', prompt: `${skill || subject} is a fundamental part of the ________ curriculum.`, points: 5 },
        { id: 'q5', type: 'multiple-choice', prompt: `Which of these is most likely related to ${theme || subject}?`, points: 5, options: ['Concept 1', 'Concept 2', 'Concept 3', 'Concept 4'] }
      ],
      answerKey: {
        q1: 'Option A',
        q2: 'Sample answer describing real-world application.',
        q3: 'True',
        q4: 'School',
        q5: 'Concept 1'
      }
    };
  }

  const worksheetId = uuidv4();
  const fullWorksheet = {
    id: worksheetId,
    grade,
    subject,
    skill: skill || 'N/A',
    difficulty: difficulty || 'Medium',
    theme: theme || 'General',
    learningStyle: learningStyle || 'Mixed',
    ...worksheetData
  };

  try {
    const sql = `INSERT INTO worksheets (id, title, grade, subject, skill, difficulty, theme, learning_style, instructions, content, answer_key) 
                 VALUES ('${fullWorksheet.id}', '${fullWorksheet.title.replace(/'/g, "''")}', '${fullWorksheet.grade}', '${fullWorksheet.subject.replace(/'/g, "''")}', '${fullWorksheet.skill.replace(/'/g, "''")}', '${fullWorksheet.difficulty}', '${fullWorksheet.theme.replace(/'/g, "''")}', '${fullWorksheet.learningStyle}', '${fullWorksheet.instructions.replace(/'/g, "''")}', '${JSON.stringify(fullWorksheet.questions).replace(/'/g, "''")}', '${JSON.stringify(fullWorksheet.answerKey).replace(/'/g, "''")}')`;
    
    runTeamDb(sql);
    res.status(201).json(fullWorksheet);
  } catch (error) {
    console.error('Error storing worksheet:', error);
    res.status(500).json({ error: 'Failed to generate and store worksheet' });
  }
});

app.get('/api/worksheets', (req, res) => {
  try {
    const worksheets = runTeamDb('SELECT * FROM worksheets ORDER BY created_at DESC');
    res.json(worksheets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch worksheets' });
  }
});

app.get('/api/worksheets/:id/pdf', async (req, res) => {
  const { id } = req.params;

  try {
    const results = runTeamDb(`SELECT * FROM worksheets WHERE id = '${id}'`);
    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'Worksheet not found' });
    }

    const worksheet = results[0];
    const questions = JSON.parse(worksheet.content);
    const answerKey = JSON.parse(worksheet.answer_key);

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="worksheet-${id}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text(worksheet.title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Grade: ${worksheet.grade} | Subject: ${worksheet.subject} | Difficulty: ${worksheet.difficulty}`, { align: 'center' });
    if (worksheet.theme && worksheet.theme !== 'General') {
      doc.text(`Theme: ${worksheet.theme}`, { align: 'center' });
    }
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Instructions
    doc.fontSize(14).font('Helvetica-Bold').text('Instructions:');
    doc.fontSize(12).font('Helvetica').text(worksheet.instructions);
    doc.moveDown(2);

    // Questions
    questions.forEach((q, index) => {
      if (doc.y > 650) doc.addPage();
      doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${q.prompt} (${q.points} pts)`);
      doc.moveDown(0.5);
      if (q.type === 'multiple-choice' && q.options) {
        q.options.forEach((opt) => {
          doc.fontSize(11).font('Helvetica').text(`   [  ] ${opt}`);
          doc.moveDown(0.2);
        });
      } else if (q.type === 'short-answer') {
        doc.moveDown(1);
        doc.moveTo(70, doc.y).lineTo(530, doc.y).stroke();
        doc.moveDown(1);
        doc.moveTo(70, doc.y).lineTo(530, doc.y).stroke();
      } else if (q.type === 'true-false') {
        doc.fontSize(11).font('Helvetica').text(`   (   ) True      (   ) False`);
      } else {
        doc.moveDown(1.5);
      }
      doc.moveDown(1.5);
    });

    // Answer Key Page
    doc.addPage();
    doc.fontSize(20).font('Helvetica-Bold').text('Answer Key', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    questions.forEach((q, index) => {
      const answer = answerKey[q.id] || answerKey[index + 1] || 'N/A';
      doc.fontSize(12).font('Helvetica-Bold').text(`Question ${index + 1}: `, { continued: true });
      doc.font('Helvetica').text(answer);
      doc.moveDown(0.5);
    });
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
