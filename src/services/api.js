import axios from 'axios';
import { toast } from "react-toastify";

// Set API base URL dynamically using environment variable
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost/laundry/public/api';

const API = axios.create({
    baseURL: API_BASE_URL,  // Dynamic base URL
});

// Axios Response Interceptor
API.interceptors.response.use(
    (response) => response,  // Pass successful responses
    (error) => {
        if (error.response) {
            if (error.response.status === 419 || error.response.status === 401) {
                toast.error('Session expired. Redirecting to login...');
                localStorage.removeItem('token');  // Clear any stored token
                window.location.href = '/driver/login';   // Redirect to login page
            } else {
                toast.error(error.response.data.message || 'An error occurred.');
            }
        } else {
            toast.error('Network error or server not reachable.');
        }
        return Promise.reject(error);
    }
);

// Login API
export const login = async (email, password) => {
    const response = await API.post('/driver/login', {
        email,
        password,
        type: 'driver',
    });
    return response.data;
};

// Logout API
export const logout = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No token found, user might already be logged out.');
    }

    try {
        console.log('Logout Token:', token); // Debug token
        const response = await API.get('/driver/logout', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        console.log('Logout Response:', response.data); // Debug response
        return response.data;
    } catch (err) {
        console.error('Logout error:', err.response?.data || err.message);
        throw err;
    }
};

// Fetch all orders for the driver
export const fetchOrders = async (token) => {
    try {
        const response = await API.get('/orders', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        console.log('Order Response:', response.data.orders);
        return response.data.orders;
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
        console.log('API Response:', response.data);
        return response.data.orders;
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
// Fetch Driver Routes
export const fetchDriverRoutes = async (token) => {
    const response = await API.get('/driver/routes', {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.routes;
};

// Accept Route API Call
export const acceptRoute = async (routeId) => {
    const token = localStorage.getItem('token');

    try {
        const response = await API.post(
            `/driver/routes/${routeId}/accept`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
            toast.success('Route accepted successfully!');
            return response.data;
        } else {
            toast.error('Failed to accept route.');
            return null;
        }
    } catch (error) {
        toast.error('Error accepting route.');
        throw error;
    }
};

// Upload Photo
export const uploadPhoto = async (orderId, routeId, file, action, token) => {
    const formData = new FormData();
    formData.append('photo', file, 'photo.png');
    formData.append('order_id', orderId);
    formData.append('route_id', routeId);
    formData.append('action', action);

    const response = await API.post(
        `/driver/orders/${orderId}/upload-photo`,
        formData,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
        }
    );
    return response.data;
};

// Collect Bags
export const collectBags = async (routeId, bagCount, barcodeCount, token) => {
    const response = await API.post(
        `/driver/orders/${routeId}/collect-bags`,
        {
            route_id: routeId,
            bag_count: bagCount,
            barcode_count: barcodeCount,
            activity_type: 'Bag Collection',
            description: `Collected ${bagCount} bags and ${barcodeCount} barcodes.`,
        },
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    return response.data;
};

// Complete Route
export const completeRoute = async (routeId, token) => {
    const response = await API.post(
        `/driver/routes/${routeId}/complete`,
        {},
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    return response.data;
};

export default API;
