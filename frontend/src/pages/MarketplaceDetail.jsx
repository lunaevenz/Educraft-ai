import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';

function MarketplaceDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        // Since we don't have a single item fetch endpoint yet, we'll find it in the list
        const response = await axios.get('/api/marketplace');
        const found = response.data.find(i => i.id === id);
        if (found) {
          setItem(found);
        } else {
          setError('Resource not found.');
        }
      } catch (err) {
        setError('Failed to load resource details.');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  if (loading) return <div className="text-center py-12">Loading details...</div>;
  if (error) return <div className="text-center py-12 text-red-600">{error}</div>;
  if (!item) return <div className="text-center py-12">Resource not found.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4">
      <Link to="/marketplace" className="text-indigo-600 hover:underline mb-6 inline-block">
        &larr; Back to Marketplace
      </Link>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2 bg-indigo-100 h-64 md:h-auto flex items-center justify-center">
            {item.preview_url ? (
              <img src={item.preview_url} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-indigo-400 font-bold text-6xl">{item.subject[0]}</span>
            )}
          </div>
          <div className="md:w-1/2 p-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{item.title}</h1>
                <p className="text-lg text-gray-500 mt-2">{item.grade} Grade • {item.subject}</p>
              </div>
              <span className="text-2xl font-bold text-indigo-600">${item.price.toFixed(2)}</span>
            </div>
            
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900">Description</h2>
              <p className="text-gray-600 mt-2 whitespace-pre-wrap">{item.description}</p>
            </div>
            
            <div className="mt-8 flex items-center space-x-4">
              <span className="text-sm text-gray-500">Published by <strong>{item.creator_name}</strong></span>
            </div>
            
            <div className="mt-10">
              <button className="w-full bg-indigo-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-indigo-700 transition">
                {item.price > 0 ? `Purchase for $${item.price.toFixed(2)}` : 'Download for Free'}
              </button>
              <p className="text-xs text-center text-gray-400 mt-3 italic">
                Secure checkout and instant delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketplaceDetail;
