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
    instructions: 'Complete the following basic multiplication problems.',
    content: JSON.stringify([
      { id: 'q1', type: 'multiple-choice', prompt: 'What is 2 x 3?', points: 5, options: ['4', '5', '6', '7'] },
      { id: 'q2', type: 'multiple-choice', prompt: 'What is 5 x 2?', points: 5, options: ['7', '10', '12', '15'] }
    ]),
    answer_key: JSON.stringify({ q1: '6', q2: '10' }),
    user_id: 'demo-user-id'
  },
  {
    id: uuidv4(),
    title: 'Science: The Solar System',
    grade: '5th',
    subject: 'Science',
    skill: 'Astronomy',
    difficulty: 'Medium',
    theme: 'Space',
    learningStyle: 'Visual',
    instructions: 'Explore the wonders of our solar system.',
    content: JSON.stringify([
      { id: 'q1', type: 'true-false', prompt: 'Is Mars called the Red Planet?', points: 5 },
      { id: 'q2', type: 'short-answer', prompt: 'Which planet is closest to the Sun?', points: 10 }
    ]),
    answer_key: JSON.stringify({ q1: 'True', q2: 'Mercury' }),
    user_id: 'demo-user-id'
  }
];

try {
  // Create demo user
  const demoUserSql = `INSERT OR IGNORE INTO users (id, email, password_hash, name) VALUES ('demo-user-id', 'demo@example.com', '$2b$10$DEMO_HASH_NOT_REAL_BUT_WORKS_FOR_INSERT', 'Demo Teacher')`;
  execSync(`team-db '${demoUserSql.replace(/'/g, "'\\''")}'`);

  samples.forEach(s => {
    const sql = `INSERT OR IGNORE INTO worksheets (id, title, grade, subject, skill, difficulty, theme, learning_style, instructions, content, answer_key, user_id) 
                 VALUES ('${s.id}', '${s.title}', '${s.grade}', '${s.subject}', '${s.skill}', '${s.difficulty}', '${s.theme}', '${s.learningStyle}', '${s.instructions}', '${s.content.replace(/'/g, "''")}', '${s.answer_key.replace(/'/g, "''")}', '${s.user_id}')`;
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
