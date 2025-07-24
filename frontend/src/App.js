import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddCustomer from './pages/AddCustomer';
import AddTransaction from './pages/AddTransaction';
import Stats from './pages/Stats';
import Navbar from './components/Navbar';
import CustomerSummary from './pages/CustomerSummary';
import ManageMenu from './pages/ManageMenu';


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

const MainRoutes = () => {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <>
      {isAuthenticated && <></>}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/add-customer" element={<PrivateRoute><AddCustomer /></PrivateRoute>} />
        <Route path="/add-transaction" element={<PrivateRoute><AddTransaction /></PrivateRoute>} />
        <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
        <Route path="/customer-summary" element={<PrivateRoute><CustomerSummary /></PrivateRoute>} />
        <Route path="/manage-menu" element={<PrivateRoute><ManageMenu /></PrivateRoute>} />



      </Routes>
    </>
  );
};

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default App;
