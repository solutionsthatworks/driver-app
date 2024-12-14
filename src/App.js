import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrderHistory from "./pages/OrderHistory";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
         <Route path="/order-history" element={<OrderHistory />} />
      </Routes>
    </Router>
  );
};



export default App;
