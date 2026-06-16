import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PromptManager {
  constructor(version = 'v1') {
    this.version = version;
    this.basePath = path.join(__dirname, 'prompts', version);
  }

  loadTemplate(name) {
    const filePath = path.join(this.basePath, name);
    return fs.readFileSync(filePath, 'utf8');
  }

  getStandards(subject, grade) {
    const standards = JSON.parse(this.loadTemplate('standards.json'));
    const subjectStandards = standards[subject] || {};
    
    // Simple logic to find best matching grade
    if (subjectStandards[grade]) return subjectStandards[grade];
    
    // Check ranges like "K-2", "3-5", etc if applicable
    for (const key in subjectStandards) {
      if (key.includes('-')) {
        const [start, end] = key.split('-').map(s => s === 'K' ? 0 : parseInt(s));
        const current = grade === 'K' ? 0 : parseInt(grade);
        if (current >= start && current <= end) return subjectStandards[key];
      }
    }
    
    return subjectStandards['9-12'] || []; // Default
  }

  generatePrompt(params) {
    const { grade, subject, skill, difficulty, theme, learningStyle } = params;
    
    const baseSystem = this.loadTemplate('base_system.md');
    const template = this.loadTemplate('worksheet_template.json');
    const standards = this.getStandards(subject, grade);

    return {
      systemPrompt: baseSystem,
      userPrompt: `
        Generate a structured educational worksheet for:
        - Grade: ${grade}
        - Subject: ${subject}
        - Skill/Topic: ${skill || 'General'}
        - Difficulty: ${difficulty}
        - Theme: ${theme || 'None'}
        - Learning Style: ${learningStyle || 'Mixed'}

        Relevant Curriculum Standards:
        ${standards.join(', ')}

        You must follow this exact JSON structure:
        ${template}

        Ensure:
        1. Age-appropriate vocabulary for grade ${grade}.
        2. High-quality content for ${subject}.
        3. Clear instructions.
        4. Sections include Warm-up, Guided Practice, Independent Practice, and Challenge.
        5. At least 8 questions across different sections.
        6. Include specific learning objectives and alignment to the standards mentioned above.
        7. If "Matching" type is used, provide "matching_pairs".
        8. If "Ordering" type is used, provide "ordering_items".
      `
    };
  }
}

export default PromptManager;
