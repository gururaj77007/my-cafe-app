import React, { useState } from 'react';
import axios from 'axios';

const AddCustomer = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3010/addCustomer', { name, phone });
      alert('Customer added');
      setName('');
      setPhone('');
    } catch (err) {
      console.error(err);
      alert('Error adding customer');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-100 to-pink-100">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-2xl font-bold mb-4 text-center text-gray-700">Add Customer</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            placeholder="Name"
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
            required
          />
          <input
  type="tel"
  value={phone}
  placeholder="Phone"
  onChange={(e) => setPhone(e.target.value)}
  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
  required
  pattern="[0-9]*"
  inputMode="numeric"
/>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded px-4 py-2 hover:from-blue-600 hover:to-purple-600 transition"
          >
            Add Customer
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddCustomer;
