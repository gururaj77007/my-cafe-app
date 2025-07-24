import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Stats = () => {
  const [customers, setCustomers] = useState([]);
  const [totalCredit, setTotalCredit] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:3010/customers');
      setCustomers(res.data);

      fetchTotalCredits();
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchTotalCredits = async () => {
    const res = await axios.get('http://localhost:3010/totalCredits');
    setTotalCredit(res.data.totalCredits);
  };

  const handleCardClick = (customerId) => {
    navigate(`/customer-summary?customerId=${customerId}`);
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-100">
      <h3 className="text-3xl font-bold mb-6 text-center text-gray-700">Customer Credits</h3>

      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-4 mb-6">
        <p className="text-lg font-semibold text-gray-800 text-center">
          Total Credits Given: <span className="text-green-600">₹{totalCredit}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {customers.map((c) => (
          <div
            key={c.id}
            onClick={() => handleCardClick(c.id)}
            className="bg-white rounded-xl shadow p-4 flex flex-col items-start space-y-2 hover:shadow-lg transition cursor-pointer"
          >
            <h4 className="text-xl font-semibold text-gray-800">{c.name}</h4>
            <p className="text-gray-600">📞 {c.phone}</p>
            <p className="text-gray-700 font-bold">Credit: ₹{c.credit}</p>
          </div>
        ))}
      </div>

      {customers.length === 0 && (
        <p className="text-center text-gray-500 mt-6">No customer data available.</p>
      )}
    </div>
  );
};

export default Stats;
