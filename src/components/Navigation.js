import React from 'react';
import { Link } from 'react-router-dom';

const Navigation = () => (
  <nav style={{ padding: '10px', backgroundColor: '#f0f0f0' }}>
    <Link to="/" style={{ margin: '10px' }}>Home</Link>
    <Link to="/dashboard" style={{ margin: '10px' }}>Dashboard</Link>
    <Link to="/profile" style={{ margin: '10px' }}>Profile</Link>
  </nav>
);

export default Navigation;
