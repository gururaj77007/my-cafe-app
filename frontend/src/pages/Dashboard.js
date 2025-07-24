import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="p-4">
      <h2 className="text-3xl font-bold mb-6 text-center text-purple-700">Zenzone</h2>

      <div className="grid grid-cols-1 gap-4">
        {/* Card 1 */}
        <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold mb-2">Manage Customers</h3>
          <p className="mb-4">Add new customers and view existing customers with their credit details.</p>
          <Link
            to="/add-customer"
            className="bg-white text-green-700 px-4 py-2 rounded shadow hover:bg-gray-200 transition"
          >
            Add Customer
          </Link>
        </div>

        {/* Card 2 */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold mb-2">Manage Transactions</h3>
          <p className="mb-4">Add transactions for customers and track daily cafe stats.</p>
          <div className="flex space-x-2">
            <Link
              to="/add-transaction"
              className="bg-white text-purple-700 px-4 py-2 rounded shadow hover:bg-gray-200 transition"
            >
              Add Transaction
            </Link>
            <Link
              to="/stats"
              className="bg-white text-purple-700 px-4 py-2 rounded shadow hover:bg-gray-200 transition"
            >
              View Stats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
