import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrderHistory from './pages/OrderHistory';
import DriverRoutes from "./pages/DriverRoutes";  // Import DriverRoutes
import { ToastContainer } from "react-toastify";


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token'); // Check for auth token
  return token ? children : <Navigate to="/" />;
};

const App = () => {
  return (
    <Router basename="/driver-app">
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/order-history" 
          element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/driver-routes" 
          element={
            <ProtectedRoute>
              <DriverRoutes />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" />} />

          </Routes>
          <ToastContainer position="top-right" autoClose={5000} />
    </Router>
  );
};

export default App;
