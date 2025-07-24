import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AddTransaction = () => {
  const [customers, setCustomers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [customer_id, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('credit');
  const [manualDescription, setManualDescription] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchMenuItems();
  }, []);

  const fetchCustomers = async () => {
    const res = await axios.get('http://localhost:3010/customers');
    setCustomers(res.data);
  };

  const fetchMenuItems = async () => {
    const res = await axios.get('http://localhost:3010/menu-items');
    setMenuItems(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalDescription = manualDescription.trim() || description;

    if (!finalDescription) {
      alert('Please select or enter a description');
      return;
    }

    try {
      await axios.post('http://localhost:3010/addTransaction', {
        customer_id,
        amount,
        description: finalDescription,
        type,
      });
      alert('✅ Transaction added successfully!');
      setAmount('');
      setDescription('');
      setManualDescription('');
    } catch (err) {
      console.error(err);
      alert('❌ Error adding transaction');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 p-6 flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-lg">
        <h3 className="text-2xl font-bold mb-6 text-center text-purple-700">Add New Transaction</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Customer</label>
            <select
              value={customer_id}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="border border-gray-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">Select Customer</option>
              {customers.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              placeholder="Amount"
              onChange={(e) => setAmount(e.target.value)}
              required
              className="border border-gray-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Menu Item</label>
            <select
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border border-gray-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">Select Menu Item</option>
              {menuItems.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Or enter description manually</label>
            <input
              type="text"
              value={manualDescription}
              placeholder="Custom description"
              onChange={(e) => setManualDescription(e.target.value)}
              className="border border-gray-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Transaction Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              className={`border px-3 py-2 w-full rounded focus:outline-none focus:ring-2 ${
                type === 'credit' ? 'border-green-400 focus:ring-green-400' : 'border-red-400 focus:ring-red-400'
              }`}
            >
              <option value="credit" className="text-green-600">
                Credit
              </option>
              <option value="debit" className="text-red-600">
                Debit
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded w-full font-semibold transition"
          >
            Add Transaction
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTransaction;
