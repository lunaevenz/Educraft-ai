import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

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
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await axios.get('/api/user/usage');
      setUsage(response.data);
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    }
  };

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
      fetchUsage();
    } catch (err) {
      if (err.response?.data?.code === 'LIMIT_REACHED' || err.response?.data?.code === 'SUBSCRIPTION_REQUIRED') {
        setError(
          <div className="flex flex-col items-center">
            <p className="mb-4 text-center font-medium">{err.response.data.message}</p>
            <Link to="/pricing" className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition font-bold">
              Upgrade Now
            </Link>
          </div>
        );
      } else {
        setError('Failed to generate worksheet. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (worksheet) {
      const token = localStorage.getItem('token');
      window.location.href = `/api/worksheets/${worksheet.id}/pdf?token=${token}`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Worksheet Generator</h1>
      
      {usage && !usage.subscription && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 flex justify-between items-center">
          <p className="text-blue-700 font-medium">
            Free Tier: {usage.freeGenerationsRemaining} of {usage.totalFreeLimit} remaining this month
          </p>
          <Link to="/pricing" className="text-sm font-bold text-blue-600 hover:text-blue-800 underline">
            Upgrade for unlimited
          </Link>
        </div>
      )}

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
            {worksheet.learning_objectives && (
              <div className="mb-6">
                <h3 className="text-lg font-bold">Learning Objectives</h3>
                <ul className="list-disc list-inside">
                  {worksheet.learning_objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                </ul>
              </div>
            )}

            {worksheet.sections.map((section, sIdx) => (
              <div key={sIdx} className="mb-10">
                <h3 className="text-xl font-bold text-blue-700 border-b-2 border-blue-100 pb-1 mb-3">{section.section_title}</h3>
                <p className="text-gray-600 italic mb-4">{section.instructions}</p>

                <div className="space-y-8">
                  {section.questions.map((q, idx) => (
                    <div key={q.id || idx} className="border-b pb-4 last:border-0">
                      <p className="font-semibold text-lg">{q.prompt} <span className="text-sm text-gray-400">({q.points} pts)</span></p>

                      {q.type === 'multiple-choice' && q.options && (
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

                      {q.type === 'matching' && q.matching_pairs && (
                        <div className="mt-3 grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            {q.matching_pairs.left_side.map((item, i) => (
                              <div key={i} className="p-2 border bg-gray-50 rounded">{i+1}. {item}</div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            {q.matching_pairs.right_side.map((item, i) => (
                              <div key={i} className="flex items-center space-x-2">
                                <div className="w-12 h-8 border-b-2 border-gray-300"></div>
                                <div className="p-2 border bg-gray-50 rounded flex-grow">{String.fromCharCode(65+i)}. {item}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {q.type === 'ordering' && q.ordering_items && (
                        <div className="mt-3 space-y-2">
                          {q.ordering_items.map((item, i) => (
                            <div key={i} className="flex items-center space-x-3">
                              <div className="w-8 h-8 border rounded flex items-center justify-center text-gray-300">#</div>
                              <div className="p-2 border bg-gray-50 rounded flex-grow">{item}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'diagram-labeling' && (
                        <div className="mt-3 space-y-4">
                          {q.visual_aid && (
                            <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-x-auto font-mono text-xs">
                              {q.visual_aid}
                            </pre>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {q.options && q.options.map(opt => (
                              <span key={opt} className="px-3 py-1 border-2 border-dashed border-gray-300 rounded text-sm text-gray-600 font-bold">{opt}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {q.type === 'fill-in-the-blank' && (
                        <div className="mt-3 text-gray-500 italic">Type: Fill in the blank</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {worksheet.reflection_question && (
              <div className="mt-12 pt-6 border-t">
                <h3 className="text-lg font-bold mb-2">Reflection</h3>
                <p className="mb-4">{worksheet.reflection_question}</p>
                <div className="border-b-2 border-gray-200 h-20 w-full"></div>
              </div>
            )}

            <div className="mt-12 p-4 bg-gray-50 rounded border border-dashed border-gray-300">
              <h3 className="text-lg font-bold mb-2">Answer Key (For Teachers Only)</h3>
              <div className="space-y-4">
                {Object.entries(worksheet.answer_key).map(([id, ans]) => (
                  <div key={id}><strong>{id}:</strong> {ans}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Generator;
