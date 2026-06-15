import { useState } from 'react';
import axios from 'axios';

const GRADES = ['K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const SUBJECTS = ['Math', 'Science', 'English/Language Arts', 'History', 'Social Studies', 'Foreign Language', 'Art', 'Music'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const STYLES = ['Visual', 'Textual', 'Hands-on', 'Mixed'];

function Generator() {
  const [formData, setFormData] = useState({
    grade: '5th',
    subject: 'Math',
    skill: '',
    difficulty: 'Medium',
    theme: '',
    learningStyle: 'Mixed'
  });
  const [loading, setLoading] = useState(false);
  const [worksheet, setWorksheet] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setWorksheet(null);
    try {
      const response = await axios.post('/api/generate-worksheet', formData);
      setWorksheet(response.data);
    } catch (err) {
      setError('Failed to generate worksheet. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (worksheet) {
      window.location.href = `/api/worksheets/${worksheet.id}/pdf`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Worksheet Generator</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Grade Level</label>
            <select name="grade" value={formData.grade} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <select name="subject" value={formData.subject} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Specific Skill (e.g. Fractions)</label>
            <input type="text" name="skill" value={formData.skill} onChange={handleChange} placeholder="e.g. Multiplication" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Difficulty</label>
            <select name="difficulty" value={formData.difficulty} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Theme (Optional)</label>
            <input type="text" name="theme" value={formData.theme} onChange={handleChange} placeholder="e.g. Space, Dinosaurs" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Learning Style</label>
            <select name="learningStyle" value={formData.learningStyle} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
              {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={loading} className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {loading ? 'Generating...' : 'Generate Worksheet'}
            </button>
          </div>
        </form>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8 text-red-700">{error}</div>}

      {worksheet && (
        <div className="bg-white shadow rounded-lg p-8 mb-8 border-t-8 border-blue-600">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{worksheet.title}</h2>
              <p className="text-sm text-gray-500">Grade: {worksheet.grade} | Subject: {worksheet.subject} | Difficulty: {worksheet.difficulty}</p>
            </div>
            <button onClick={handleDownloadPdf} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">Download PDF</button>
          </div>
          
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap mb-6">{worksheet.instructions}</p>
            
            <div className="space-y-8">
              {worksheet.questions.map((q, idx) => (
                <div key={q.id} className="border-b pb-4 last:border-0">
                  <p className="font-semibold text-lg">{idx + 1}. {q.prompt} <span className="text-sm text-gray-400">({q.points} pts)</span></p>
                  {q.options && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map(opt => (
                        <div key={opt} className="flex items-center space-x-2 border rounded p-2 bg-gray-50">
                          <div className="w-4 h-4 border border-gray-400 rounded-full"></div>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === 'short-answer' && (
                    <div className="mt-3 border-b-2 border-gray-200 h-10 w-full"></div>
                  )}
                  {q.type === 'true-false' && (
                    <div className="mt-3 flex space-x-4">
                      <span className="flex items-center space-x-1"><div className="w-4 h-4 border border-gray-400 rounded-full"></div><span>True</span></span>
                      <span className="flex items-center space-x-1"><div className="w-4 h-4 border border-gray-400 rounded-full"></div><span>False</span></span>
                    </div>
                  )}
                  {q.type === 'fill-in-the-blank' && (
                    <div className="mt-3 text-gray-500 italic">Type: Fill in the blank</div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 p-4 bg-gray-50 rounded border border-dashed border-gray-300">
              <h3 className="text-lg font-bold mb-2">Answer Key (For Teachers Only)</h3>
              <ul className="list-disc list-inside">
                {Object.entries(worksheet.answerKey).map(([id, ans], idx) => (
                  <li key={id}><strong>Question {idx + 1}:</strong> {ans}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Generator;
