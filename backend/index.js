import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import OpenAI from 'openai';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import PromptManager from './prompt-manager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'educraft-secret-key-123';

const promptManager = new PromptManager('v1');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

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

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Subscription middleware
const checkSubscription = (req, res, next) => {
  const userId = req.user.id;
  try {
    const subs = runTeamDb(`SELECT * FROM subscriptions WHERE user_id = '${userId}' AND status = 'active'`);
    
    if (!subs || subs.length === 0) {
      return res.status(403).json({ 
        error: 'Subscription required', 
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'An active subscription is required to generate worksheets.' 
      });
    }
    req.subscription = subs[0];
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
};

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'EduCraft AI Backend is running', 
    aiEnabled: !!openai 
  });
});

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    // Check if user exists
    const existing = runTeamDb(`SELECT id FROM users WHERE email = '${email}'`);
    if (existing && existing.length > 0) return res.status(400).json({ error: 'User already exists' });

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    
    runTeamDb(`INSERT INTO users (id, email, password_hash, name) VALUES ('${id}', '${email}', '${passwordHash}', '${name || ''}')`);
    
    const token = jwt.sign({ id, email, name }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id, email, name } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const users = runTeamDb(`SELECT * FROM users WHERE email = '${email}'`);
    if (!users || users.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Subscription Routes
app.get('/api/subscription', authenticateToken, (req, res) => {
  const userId = req.user.id;
  try {
    const subs = runTeamDb(`SELECT * FROM subscriptions WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 1`);
    res.json(subs[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

app.post('/api/subscription/checkout', authenticateToken, async (req, res) => {
  const { planType } = req.body;
  const userId = req.user.id;
  const userEmail = req.user.email;

  if (!stripe) {
    // Mock successful subscription if no stripe key (for dev/demo)
    const id = uuidv4();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    
    runTeamDb(`INSERT INTO subscriptions (id, user_id, plan_type, status, current_period_end) 
               VALUES ('${id}', '${userId}', '${planType}', 'active', '${periodEnd.toISOString()}')`);
    
    return res.json({ url: '/dashboard?status=success' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `EduCraft AI - ${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`,
          },
          unit_amount: planType === 'individual' ? 999 : (planType === 'team' ? 2999 : 9999),
        },
        quantity: 1,
      }],
      mode: 'payment', // Should be 'subscription' in a real app with Products/Prices
      success_url: `${req.headers.origin}/dashboard?status=success`,
      cancel_url: `${req.headers.origin}/pricing?status=canceled`,
      customer_email: userEmail,
      client_reference_id: userId,
      metadata: { planType, type: 'subscription' }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Marketplace Purchase Routes
app.post('/api/marketplace/:id/purchase', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userEmail = req.user.email;

  try {
    const items = runTeamDb(`SELECT * FROM marketplace_items WHERE id = '${id}'`);
    if (!items || items.length === 0) return res.status(404).json({ error: 'Item not found' });
    const item = items[0];

    if (!stripe || item.price === 0) {
      // Mock successful purchase or handle free items
      const purchaseId = uuidv4();
      runTeamDb(`INSERT INTO purchases (id, user_id, item_id, amount, status) 
                 VALUES ('${purchaseId}', '${userId}', '${id}', ${item.price}, 'completed')`);
      
      return res.json({ url: `/marketplace/${id}?status=success` });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.title,
            description: item.description,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin}/marketplace/${id}?status=success`,
      cancel_url: `${req.headers.origin}/marketplace/${id}?status=canceled`,
      customer_email: userEmail,
      client_reference_id: userId,
      metadata: { itemId: id, type: 'marketplace_purchase' }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Failed to initiate purchase' });
  }
});

app.post('/api/generate-worksheet', authenticateToken, checkSubscription, async (req, res) => {
  const { grade, subject, skill, difficulty, theme, learningStyle } = req.body;
  const userId = req.user.id;

  if (!grade || !subject) {
    return res.status(400).json({ error: 'Grade and Subject are required' });
  }

  let worksheetData = null;

  if (openai) {
    try {
      const { systemPrompt, userPrompt } = promptManager.generatePrompt({
        grade, subject, skill, difficulty, theme, learningStyle
      });

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });

      worksheetData = JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI Error:', error.message);
    }
  }

  if (!worksheetData) {
    // Fallback Mock data for dev
    worksheetData = {
      title: `${subject} Worksheet: ${skill || 'General'}`,
      learning_objectives: [`Understand basic concepts of ${skill || subject}`],
      standards_alignment: ["Generic Standard 1.A"],
      sections: [
        {
          section_title: "Warm-up",
          instructions: "Answer these quick questions.",
          questions: [
            { id: 'q1', type: 'multiple-choice', prompt: `What is the core concept of ${skill || subject}?`, points: 5, options: ['Option A', 'Option B', 'Option C', 'Option D'] }
          ]
        },
        {
          section_title: "Guided Practice",
          instructions: "Complete these with help if needed.",
          questions: [
            { id: 'q2', type: 'short-answer', prompt: `Describe a real-world application of ${skill || subject}.`, points: 10 }
          ]
        },
        {
          section_title: "Independent Practice",
          instructions: "Show what you know!",
          questions: [
            { id: 'q3', type: 'true-false', prompt: `Is ${skill || subject} related to ${theme || 'other fields'}?`, points: 5 },
            { id: 'q4', type: 'fill-in-the-blank', prompt: `${skill || subject} is a fundamental part of the ________ curriculum.`, points: 5 }
          ]
        },
        {
          section_title: "Challenge",
          instructions: "Think deep!",
          questions: [
            { id: 'q5', type: 'multiple-choice', prompt: `Which of these is most likely related to ${theme || subject}?`, points: 5, options: ['Concept 1', 'Concept 2', 'Concept 3', 'Concept 4'] }
          ]
        }
      ],
      answer_key: {
        q1: 'Option A',
        q2: 'Sample answer describing real-world application.',
        q3: 'True',
        q4: 'School',
        q5: 'Concept 1'
      },
      reflection_question: "What was the most challenging part of this worksheet?"
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
    const questionsJson = JSON.stringify(fullWorksheet.sections);
    const objectivesJson = JSON.stringify(fullWorksheet.learning_objectives);
    const standardsJson = JSON.stringify(fullWorksheet.standards_alignment);
    const answerKeyJson = JSON.stringify(fullWorksheet.answer_key);

    const sql = `INSERT INTO worksheets (id, title, grade, subject, skill, difficulty, theme, learning_style, instructions, content, answer_key, user_id, learning_objectives, standards_alignment, reflection_question) 
                 VALUES ('${fullWorksheet.id}', '${fullWorksheet.title.replace(/'/g, "''")}', '${fullWorksheet.grade}', '${fullWorksheet.subject.replace(/'/g, "''")}', '${fullWorksheet.skill.replace(/'/g, "''")}', '${fullWorksheet.difficulty}', '${fullWorksheet.theme.replace(/'/g, "''")}', '${fullWorksheet.learningStyle}', '${(fullWorksheet.instructions || '').replace(/'/g, "''")}', '${questionsJson.replace(/'/g, "''")}', '${answerKeyJson.replace(/'/g, "''")}', '${userId}', '${objectivesJson.replace(/'/g, "''")}', '${standardsJson.replace(/'/g, "''")}', '${(fullWorksheet.reflection_question || '').replace(/'/g, "''")}')`;
    
    runTeamDb(sql);
    res.status(201).json(fullWorksheet);
  } catch (error) {
    console.error('Error storing worksheet:', error);
    res.status(500).json({ error: 'Failed to generate and store worksheet' });
  }
});

app.get('/api/worksheets', authenticateToken, (req, res) => {
  const userId = req.user.id;
  try {
    const worksheets = runTeamDb(`SELECT * FROM worksheets WHERE user_id = '${userId}' ORDER BY created_at DESC`);
    res.json(worksheets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch worksheets' });
  }
});

// Marketplace Routes
app.get('/api/marketplace', (req, res) => {
  const { subject, grade } = req.query;
  let query = 'SELECT m.*, u.name as creator_name FROM marketplace_items m JOIN users u ON m.creator_id = u.id';
  const conditions = [];
  
  if (subject) conditions.push(`m.subject = '${subject}'`);
  if (grade) conditions.push(`m.grade = '${grade}'`);
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY m.created_at DESC';

  try {
    const items = runTeamDb(query);
    res.json(items);
  } catch (error) {
    console.error('Marketplace fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace items' });
  }
});

app.post('/api/marketplace', authenticateToken, (req, res) => {
  const { title, description, subject, grade, price, file_url, preview_url } = req.body;
  const creatorId = req.user.id;

  if (!title || !subject || !grade) {
    return res.status(400).json({ error: 'Title, subject, and grade are required' });
  }

  const id = uuidv4();
  try {
    const sql = `INSERT INTO marketplace_items (id, creator_id, title, description, subject, grade, price, file_url, preview_url) 
                 VALUES ('${id}', '${creatorId}', '${title.replace(/'/g, "''")}', '${(description || '').replace(/'/g, "''")}', '${subject}', '${grade}', ${price || 0}, '${file_url || ''}', '${preview_url || ''}')`;
    runTeamDb(sql);
    res.status(201).json({ id, title, creatorId });
  } catch (error) {
    console.error('Marketplace publish error:', error);
    res.status(500).json({ error: 'Failed to publish marketplace item' });
  }
});

app.get('/api/worksheets/:id/pdf', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const results = runTeamDb(`SELECT * FROM worksheets WHERE id = '${id}' AND user_id = '${userId}'`);
    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'Worksheet not found or access denied' });
    }

    const worksheet = results[0];
    const sections = JSON.parse(worksheet.content);
    const answerKey = JSON.parse(worksheet.answer_key);
    const learningObjectives = JSON.parse(worksheet.learning_objectives || '[]');
    const standardsAlignment = JSON.parse(worksheet.standards_alignment || '[]');

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

    // Learning Objectives & Standards
    if (learningObjectives.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Learning Objectives:');
      learningObjectives.forEach(obj => {
        doc.fontSize(10).font('Helvetica').text(`• ${obj}`);
      });
      doc.moveDown(0.5);
    }
    if (standardsAlignment.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Standards Alignment:');
      doc.fontSize(10).font('Helvetica').text(standardsAlignment.join(', '));
      doc.moveDown();
    }

    // Sections & Questions
    sections.forEach((section) => {
      if (doc.y > 600) doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#2563eb').text(section.section_title);
      doc.fillColor('black');
      if (section.instructions) {
        doc.fontSize(11).font('Helvetica-Oblique').text(section.instructions);
      }
      doc.moveDown(0.5);

      section.questions.forEach((q, index) => {
        if (doc.y > 700) doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text(`${q.prompt} (${q.points} pts)`);
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
        } else if (q.type === 'matching' && q.matching_pairs) {
          const pairs = q.matching_pairs;
          const left = pairs.left_side || [];
          const right = [...(pairs.right_side || [])].sort(() => Math.random() - 0.5);
          
          left.forEach((l, i) => {
            const r = right[i] || '';
            doc.fontSize(11).font('Helvetica').text(`${i + 1}. ${l.padEnd(30)} ________    A. ${r}`);
            doc.moveDown(0.2);
          });
        } else if (q.type === 'ordering' && q.ordering_items) {
          q.ordering_items.forEach((item, i) => {
            doc.fontSize(11).font('Helvetica').text(`   ____  ${item}`);
            doc.moveDown(0.2);
          });
        } else if (q.type === 'diagram-labeling') {
          if (q.visual_aid) {
            doc.fontSize(10).font('Courier').text(q.visual_aid, { align: 'center' });
            doc.moveDown();
          }
          doc.fontSize(11).font('Helvetica-Bold').text('Labels to use: ' + (q.options || []).join(', '));
          doc.moveDown(2);
        } else {
          doc.moveDown(1.5);
        }
        doc.moveDown(1);
      });
      doc.moveDown();
    });

    // Reflection Question
    if (worksheet.reflection_question) {
      if (doc.y > 700) doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('Reflection');
      doc.fontSize(12).font('Helvetica').text(worksheet.reflection_question);
      doc.moveDown(1.5);
      doc.moveTo(70, doc.y).lineTo(530, doc.y).stroke();
    }

    // Answer Key Page
    doc.addPage();
    doc.fontSize(20).font('Helvetica-Bold').text('Answer Key', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    
    // Iterate sections again for answer key
    sections.forEach((section) => {
      doc.fontSize(14).font('Helvetica-Bold').text(section.section_title);
      section.questions.forEach((q) => {
        const answer = answerKey[q.id] || 'N/A';
        doc.fontSize(11).font('Helvetica-Bold').text(`${q.prompt.substring(0, 50)}...: `, { continued: true });
        doc.font('Helvetica').text(answer);
        doc.moveDown(0.3);
      });
      doc.moveDown();
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
