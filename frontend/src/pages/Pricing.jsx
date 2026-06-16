import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    id: 'individual',
    name: 'Individual Teacher',
    price: '$9.99',
    interval: '/month',
    description: 'Perfect for single classrooms and individual tutors.',
    features: [
      'Unlimited AI Generations',
      'PDF Exports with Answer Keys',
      'Personal Dashboard',
      'Custom Themes & Styles'
    ]
  },
  {
    id: 'team',
    name: 'Grade Level Team',
    price: '$29.99',
    interval: '/month',
    description: 'Collaborate with your fellow grade-level teachers.',
    features: [
      'Everything in Individual',
      'Up to 5 Team Members',
      'Shared Resource Library',
      'Collaborative Editing'
    ],
    popular: true
  },
  {
    id: 'school',
    name: 'School / District',
    price: '$99.99',
    interval: '/month',
    description: 'Full access for your entire educational institution.',
    features: [
      'Everything in Team',
      'Unlimited Users',
      'LMS Integration (Canvas/Google)',
      'Priority Support & Training'
    ]
  }
];

function Pricing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentSub, setCurrentSub] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      axios.get('/api/subscription').then(res => setCurrentSub(res.data));
    }
  }, [user]);

  const handleCheckout = async (planId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/subscription/checkout', { planType: planId });
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout process.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Choose the plan that fits your classroom needs.
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`bg-white border rounded-lg shadow-sm divide-y divide-gray-200 flex flex-col ${plan.popular ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-200'}`}>
              <div className="p-6">
                {plan.popular && (
                  <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-indigo-100 text-indigo-600 mb-4">
                    Most Popular
                  </span>
                )}
                <h3 className="text-2xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-4 text-sm text-gray-500">{plan.description}</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-base font-medium text-gray-500">{plan.interval}</span>
                </p>
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loading}
                  className={`mt-8 block w-full py-3 px-6 border rounded-md text-center font-semibold transition ${
                    plan.popular 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {currentSub?.plan_type === plan.id ? 'Current Plan' : 'Get Started'}
                </button>
              </div>
              <div className="pt-6 pb-8 px-6 flex-grow">
                <h4 className="text-sm font-medium text-gray-900 tracking-wide uppercase">What's included</h4>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex space-x-3">
                      <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Pricing;
