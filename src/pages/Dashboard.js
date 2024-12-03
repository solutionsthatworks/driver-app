import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { fetchDriverOrders, acceptOrderPickup, rejectOrderPickup } from '../services/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const validateTokenAndFetchOrders = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error('Token not found. Redirecting to login.');
        navigate('/');
        return;
      }

      try {
        const orders = await fetchDriverOrders(token);
        setOrders(orders || []);
        trackLiveLocation(); // Start tracking live location
      } catch (err) {
        console.error('Error fetching orders:', err.message);
        setError('Failed to fetch orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    validateTokenAndFetchOrders();
  }, [navigate]);

  const trackLiveLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log(`Latitude: ${latitude}, Longitude: ${longitude}, Accuracy: ${accuracy} meters`);

          // Update location state regardless of accuracy
          setCurrentLocation({ latitude, longitude, accuracy });

          // Fetch human-readable address using Google Maps API
          const googleApiKey = 'AIzaSyBNbZwQ5xuZqg5ariGiE__P2knhxpLcHhg'; // Replace with your Google Maps API key
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}`;

          try {
            const response = await axios.get(geocodeUrl);
            const address = response.data.results[0]?.formatted_address || 'Address not available';
            setCurrentLocation((prev) => ({ ...prev, address }));
          } catch (error) {
            console.error('Error fetching address:', error.message);
          }
        },
        (error) => {
          console.error('Geolocation error:', error.message);
          setLocationError('Unable to fetch location.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      console.error('Geolocation not supported by your browser.');
      setLocationError('Geolocation not supported by your browser.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.info('Logged out successfully.');
    navigate('/');
  };

  const handleAction = async (orderId, action) => {
    const token = localStorage.getItem('token');
    try {
      if (action === 'accept') {
        await acceptOrderPickup(token, orderId);
        toast.success(`Order ${orderId} accepted for pickup!`);
      } else if (action === 'reject') {
        await rejectOrderPickup(token, orderId);
        toast.warning(`Order ${orderId} rejected!`);
      }

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: action === 'accept' ? 'Accepted' : 'Rejected' } : order
        )
      );
    } catch (err) {
      console.error(`Error performing ${action} on order ${orderId}:`, err.message);
      toast.error(`Failed to ${action} the order. Please try again.`);
    }
  };

  return (
    <div>
      <h1>Welcome to the Driver Dashboard!</h1>
      <button onClick={handleLogout} style={styles.button}>
        Logout
      </button>

      {currentLocation && (
        <div style={styles.locationBox}>
          <h2>Current Location:</h2>
          {locationError ? (
            <p style={styles.error}>{locationError}</p>
          ) : (
            <p>
              <strong>Latitude:</strong> {currentLocation.latitude}, <strong>Longitude:</strong>{' '}
              {currentLocation.longitude}
              <br />
              <strong>Accuracy:</strong> ±{currentLocation.accuracy} meters
              <br />
              <strong>Address:</strong> {currentLocation.address || 'Fetching address...'}
            </p>
          )}
        </div>
      )}

      {loading ? (
        <p>Loading orders...</p>
      ) : error ? (
        <p style={styles.error}>{error}</p>
      ) : (
        <div>
          <h2>Pickup Scheduled Orders</h2>
          {orders.length > 0 ? (
            <ul style={styles.orderList}>
              {orders.map((order) => (
                <li key={order.id} style={styles.orderItem}>
                  <p><strong>Order ID:</strong> {order.id}</p>
                  <p><strong>Address:</strong> {order.address}</p>
                  <p><strong>Pickup Date:</strong> {order.pick_date}</p>
                  <p><strong>Pickup Slot:</strong> {order.pick_hour}</p>
                  <button
                    onClick={() => handleAction(order.id, 'accept')}
                    disabled={order.status === 'Accepted' || order.status === 'Rejected'}
                    style={{
                      ...styles.acceptButton,
                      cursor: order.status === 'Accepted' || order.status === 'Rejected' ? 'not-allowed' : 'pointer',
                      backgroundColor: order.status === 'Accepted' || order.status === 'Rejected' ? '#ccc' : '#28a745',
                    }}
                  >
                    Accept Pickup
                  </button>
                  <button
                    onClick={() => handleAction(order.id, 'reject')}
                    disabled={order.status === 'Accepted' || order.status === 'Rejected'}
                    style={{
                      ...styles.rejectButton,
                      cursor: order.status === 'Accepted' || order.status === 'Rejected' ? 'not-allowed' : 'pointer',
                      backgroundColor: order.status === 'Accepted' || order.status === 'Rejected' ? '#ccc' : '#dc3545',
                    }}
                  >
                    Reject Pickup
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No orders available.</p>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    color: '#fff',
    backgroundColor: '#007BFF',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginBottom: '20px',
  },
  locationBox: {
    padding: '10px',
    borderRadius: '5px',
    backgroundColor: '#f0f0f0',
    marginBottom: '20px',
  },
  acceptButton: {
    padding: '8px 15px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#28a745',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '10px',
    marginRight: '10px',
  },
  rejectButton: {
    padding: '8px 15px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#dc3545',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  error: {
    color: 'red',
    marginBottom: '20px',
  },
  orderList: {
    listStyleType: 'none',
    padding: 0,
  },
  orderItem: {
    border: '1px solid #ddd',
    padding: '10px',
    marginBottom: '10px',
    borderRadius: '5px',
    backgroundColor: '#f9f9f9',
  },
};

export default Dashboard;
