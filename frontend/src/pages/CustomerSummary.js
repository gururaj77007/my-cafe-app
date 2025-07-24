import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const CustomerSummary = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const customerId = params.get('customerId');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const sendReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3010/sendDailyReport/${customerId}`);
      alert(res.data.message);
    } catch (err) {
      alert('Failed to send report');
    }
    setLoading(false);
  };

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`http://localhost:3010/customerSummary/${customerId}`, {
        params: { startDate, endDate },
      });
      setSummary(res.data);
    } catch (err) {
      console.error(err);
      alert('Error fetching customer summary');
    }
  };

  useEffect(() => {
    if (customerId) {
      // optionally fetch immediately
      // fetchSummary();
    }
  }, [customerId]);

  return (
    <div className="p-4 bg-gradient-to-r from-purple-200 via-pink-200 to-red-200 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Customer Summary</h2>

      <div className="bg-white shadow rounded p-4 space-y-3 max-w-md mx-auto">
        <p className="text-lg font-semibold">Customer ID: {customerId}</p>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border px-2 py-1 w-full rounded"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border px-2 py-1 w-full rounded"
        />
        <button
          onClick={fetchSummary}
          className="bg-purple-600 text-white px-4 py-2 rounded w-full"
        >
          Fetch Summary
        </button>
      </div>
      <button
      disabled={loading}
      onClick={sendReport}
      className="bg-blue-600 text-white px-4 py-2 rounded"
    >
      {loading ? 'Sending...' : 'Send Daily Report SMS'}
    </button>

      {summary && (
        <div className="mt-6 max-w-2xl mx-auto bg-white shadow rounded p-4">
          <h3 className="text-xl font-semibold mb-2">Summary for Customer ID: {customerId}</h3>
          <p><strong>Opening Balance:</strong> ₹{summary.openingBalance}</p>
          <p><strong>Closing Balance:</strong> ₹{summary.closingBalance}</p>
          <p><strong>Date Range:</strong> {summary.startDate} to {summary.endDate}</p>

          <h4 className="mt-4 font-semibold">Transactions:</h4>
          <ul className="space-y-2">
            {summary.transactions.map((txn) => (
              <li key={txn.id} className="border-b pb-2">
                <div><strong>{txn.type.toUpperCase()}</strong>: ₹{txn.amount}</div>
                <div>{txn.description}</div>
                <div className="text-gray-500 text-sm">{new Date(txn.timestamp).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomerSummary;
