import { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [worksheets, setWorksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorksheets = async () => {
      try {
        const response = await axios.get('/api/worksheets');
        setWorksheets(response.data);
      } catch (err) {
        setError('Failed to load worksheets.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorksheets();
  }, []);

  const handleDownload = (id) => {
    window.location.href = `/api/worksheets/${id}/pdf`;
  };

  if (loading) return <div className="text-center py-12">Loading worksheets...</div>;
  if (error) return <div className="text-center py-12 text-red-600">{error}</div>;

  return (
    <div className="px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Generated Worksheets</h1>
      
      {worksheets.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg mb-6">You haven't generated any worksheets yet.</p>
          <a href="/generate" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            Create Your First Worksheet
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {worksheets.map((ws) => (
            <div key={ws.id} className="bg-white overflow-hidden shadow rounded-lg border-t-4 border-blue-500 flex flex-col">
              <div className="p-5 flex-grow">
                <h3 className="text-lg font-medium text-gray-900 truncate">{ws.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{ws.grade} {ws.subject}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {ws.difficulty}
                  </span>
                  {ws.theme && ws.theme !== 'General' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {ws.theme}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-4 flex justify-between items-center">
                <span className="text-xs text-gray-400">{new Date(ws.created_at).toLocaleDateString()}</span>
                <button 
                  onClick={() => handleDownload(ws.id)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                >
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
