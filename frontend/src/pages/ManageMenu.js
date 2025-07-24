import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ManageMenu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    const res = await axios.get('http://localhost:3010/menu-items');
    setMenuItems(res.data);
  };

  const addItem = async () => {
    if (!newItem.trim()) return;
    await axios.post('http://localhost:3010/menu-items', { name: newItem });
    setNewItem('');
    fetchMenuItems();
  };

  const deleteItem = async (id) => {
    await axios.delete(`http://localhost:3010/menu-items/${id}`);
    fetchMenuItems();
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Manage Menu Items</h2>

      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="New item name"
          className="border px-2 py-1 flex-1 rounded"
        />
        <button onClick={addItem} className="bg-green-600 text-white px-4 py-2 rounded">
          Add
        </button>
      </div>

      <ul className="space-y-2">
        {menuItems.map(item => (
          <li key={item.id} className="flex justify-between items-center border-b pb-1">
            <span>{item.name}</span>
            <button
              onClick={() => deleteItem(item.id)}
              className="text-red-600 text-sm"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManageMenu;
