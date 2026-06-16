import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const GRADES = ['All', 'K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const SUBJECTS = ['All', 'Math', 'Science', 'English/Language Arts', 'History', 'Social Studies', 'Foreign Language', 'Art', 'Music'];

function Marketplace() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ subject: 'All', grade: 'All' });

  useEffect(() => {
    fetchItems();
  }, [filters]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = '/api/marketplace';
      const params = new URLSearchParams();
      if (filters.subject !== 'All') params.append('subject', filters.subject);
      if (filters.grade !== 'All') params.append('grade', filters.grade);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const response = await axios.get(url);
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching marketplace items:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Creator Marketplace</h1>
        <Link to="/publish" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">
          Publish Resource
        </Link>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-8 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select 
            value={filters.subject} 
            onChange={(e) => setFilters({...filters, subject: e.target.value})}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
          <select 
            value={filters.grade} 
            onChange={(e) => setFilters({...filters, grade: e.target.value})}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading resources...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">No resources found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white overflow-hidden shadow rounded-lg flex flex-col hover:shadow-lg transition">
              <div className="h-40 bg-indigo-100 flex items-center justify-center">
                {item.preview_url ? (
                  <img src={item.preview_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-indigo-400 font-bold text-4xl">{item.subject[0]}</span>
                )}
              </div>
              <div className="p-4 flex-grow">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{item.title}</h3>
                  <span className="text-indigo-600 font-bold">${item.price.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{item.grade} Grade • {item.subject}</p>
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{item.description}</p>
              </div>
              <div className="px-4 py-3 bg-gray-50 flex justify-between items-center border-t">
                <span className="text-xs text-gray-500">By {item.creator_name}</span>
                <Link to={`/marketplace/${item.id}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Marketplace;
