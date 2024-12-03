import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost/laundry/public/api', // Base API URL
});

// Login API
export const login = async (email, password) => {
  const response = await API.post('/driver/login', {
    email,
    password,
    type: 'driver', // Pass the type as 'driver'
  });
  return response.data;
};

// Logout API
export const logout = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No token found, user might already be logged out.');
  }

  console.log('Logout Token:', token); // Debug token
  const response = await API.get('/driver/logout', {
    headers: {
      Authorization: `Bearer ${token}`, // Include the token
    },
  });

  console.log('Logout Response:', response.data); // Debug response
  return response.data;
};

// Fetch all orders for the driver
export const fetchOrders = async (token) => {
  try {
    const response = await API.get('/orders', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Order Response:', response.data.orders); // Log the orders array
    return response.data.orders; // Access the orders array from the response
  } catch (err) {
    console.error('Error fetching orders:', err.response?.data || err.message);
    throw err;
  }
};

// Fetch driver-specific orders
export const fetchDriverOrders = async (token) => {
  try {
    const response = await API.get('/driver/orders', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('API Response:', response.data); // Log the entire API response
    return response.data.orders; // Return the "orders" array from the response
  } catch (err) {
    console.error('Error fetching orders:', err.response?.data || err.message);
    throw err;
  }
};


// Accept order pickup
export const acceptOrderPickup = async (token, orderId) => {
  try {
    const response = await API.post(`/driver/orders/${orderId}/accept`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err) {
    console.error(`Error accepting order ${orderId}:`, err.response?.data || err.message);
    throw err;
  }
};

// Reject order pickup
export const rejectOrderPickup = async (token, orderId) => {
  try {
    const response = await API.post(`/driver/orders/${orderId}/reject`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err) {
    console.error(`Error rejecting order ${orderId}:`, err.response?.data || err.message);
    throw err;
  }
};

export default API;
