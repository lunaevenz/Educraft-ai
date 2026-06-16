import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

console.log('Seeding demo data...');

const samples = [
  {
    id: uuidv4(),
    title: 'Math: Multiplication Basics',
    grade: '3rd',
    subject: 'Math',
    skill: 'Multiplication',
    difficulty: 'Easy',
    theme: 'None',
    learningStyle: 'Mixed',
    learning_objectives: JSON.stringify(['Understand the concept of multiplication as repeated addition', 'Recall basic multiplication facts (up to 5x5)']),
    standards_alignment: JSON.stringify(['CCSS.MATH.CONTENT.3.OA.A.1']),
    sections: JSON.stringify([
      {
        section_title: 'Warm-up',
        instructions: 'Answer these quick addition problems.',
        questions: [
          { id: 'q1', type: 'short-answer', prompt: 'What is 2 + 2 + 2?', points: 2 }
        ]
      },
      {
        section_title: 'Guided Practice',
        instructions: 'Let\'s turn those additions into multiplication.',
        questions: [
          { id: 'q2', type: 'multiple-choice', prompt: 'Which multiplication fact is the same as 2 + 2 + 2?', points: 5, options: ['2 x 2', '2 x 3', '2 x 4', '3 x 3'] }
        ]
      },
      {
        section_title: 'Independent Practice',
        instructions: 'Solve these multiplication problems.',
        questions: [
          { id: 'q3', type: 'short-answer', prompt: 'What is 5 x 2?', points: 5 },
          { id: 'q4', type: 'true-false', prompt: '5 x 0 is 5.', points: 5 }
        ]
      }
    ]),
    answer_key: JSON.stringify({ q1: '6', q2: '2 x 3', q3: '10', q4: 'False' }),
    reflection_question: 'How is multiplication different from addition?',
    user_id: 'demo-user-id'
  },
  {
    id: uuidv4(),
    title: 'Science: The Water Cycle',
    grade: '5th',
    subject: 'Science',
    skill: 'Water Cycle',
    difficulty: 'Medium',
    theme: 'Nature',
    learningStyle: 'Visual',
    learning_objectives: JSON.stringify(['Identify the main stages of the water cycle', 'Explain how evaporation works']),
    standards_alignment: JSON.stringify(['5-ESS2-1']),
    sections: JSON.stringify([
      {
        section_title: 'Warm-up',
        instructions: 'Look at the diagram below and answer.',
        questions: [
          { 
            id: 'q1', 
            type: 'diagram-labeling', 
            prompt: 'Label the stage where water turns into vapor.', 
            visual_aid: '    ~~~~~~ (Cloud)\n      / \\  \n     /   \\ (Rain)\n    v     v\n  ~~~~~~~~~~ (Ocean)',
            options: ['Evaporation', 'Precipitation', 'Condensation'],
            points: 10 
          }
        ]
      },
      {
        section_title: 'Independent Practice',
        instructions: 'Multiple choice questions.',
        questions: [
          { id: 'q2', type: 'multiple-choice', prompt: 'What provides the energy for the water cycle?', points: 5, options: ['The Moon', 'The Wind', 'The Sun', 'The Earth\'s core'] }
        ]
      }
    ]),
    answer_key: JSON.stringify({ q1: 'Evaporation', q2: 'The Sun' }),
    reflection_question: 'Why is the water cycle important for life on Earth?',
    user_id: 'demo-user-id'
  }
];

try {
  // Create demo user
  const demoUserSql = `INSERT OR IGNORE INTO users (id, email, password_hash, name) VALUES ('demo-user-id', 'demo@example.com', '$2b$10$DEMO_HASH_NOT_REAL_BUT_WORKS_FOR_INSERT', 'Demo Teacher')`;
  execSync(`team-db '${demoUserSql.replace(/'/g, "'\\''")}'`);

  samples.forEach(s => {
    const sql = `INSERT OR IGNORE INTO worksheets (id, title, grade, subject, skill, difficulty, theme, learning_style, content, answer_key, user_id, learning_objectives, standards_alignment, reflection_question) 
                 VALUES ('${s.id}', '${s.title.replace(/'/g, "''")}', '${s.grade}', '${s.subject.replace(/'/g, "''")}', '${s.skill.replace(/'/g, "''")}', '${s.difficulty}', '${s.theme.replace(/'/g, "''")}', '${s.learningStyle}', '${s.sections.replace(/'/g, "''")}', '${s.answer_key.replace(/'/g, "''")}', '${s.user_id}', '${s.learning_objectives.replace(/'/g, "''")}', '${s.standards_alignment.replace(/'/g, "''")}', '${s.reflection_question.replace(/'/g, "''")}')`;
    // Escape for shell
    const shellSql = sql.replace(/'/g, "'\\''");
    execSync(`team-db '${shellSql}'`);
  });
  console.log('Successfully seeded 2 sample worksheets.');
} catch (error) {
  console.error('Error seeding data:', error.message);
}

console.log('Building frontend...');
execSync('npm run build:frontend', { stdio: 'inherit' });

console.log('Starting server on port 3000...');
execSync('npm start', { stdio: 'inherit' });
