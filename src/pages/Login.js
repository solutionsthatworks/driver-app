import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api'; // Import login function from api.js

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Both fields are required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Call the login API from api.js
            const response = await login(email, password);
            const token = response.data.access.token;

            // Store token in local storage
            localStorage.setItem('token', token);

            // Fetch user's location and send to server
            collectUserLocation(token);

            // Navigate to dashboard after successful login
            navigate('/dashboard');
        } catch (err) {
            // Handle API errors
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const collectUserLocation = (token) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);

                    const googleApiKey = ''; // Replace with your Google API key
                    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}`;

                    try {
                        const geocodeResponse = await fetch(geocodeUrl);
                        const data = await geocodeResponse.json();
                        const address = data.results[0]?.formatted_address || 'Address not found';
                        console.log('Address:', address);

                        // Send location data to the server
                        await fetch(`${process.env.REACT_APP_API_BASE_URL}/driver/location`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ latitude, longitude, address }),
                        });
                    } catch (geoErr) {
                        console.error('Error fetching address:', geoErr.message);
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error.message);
                },
                { enableHighAccuracy: true }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
        }
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Driver Login</h1>
            <form onSubmit={handleLogin} style={styles.form}>
                {error && <p style={styles.error}>{error}</p>}
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={styles.input}
                        placeholder="Enter your email"
                        required
                    />
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={styles.input}
                        placeholder="Enter your password"
                        required
                    />
                </div>
                <button
                    type="submit"
                    style={{ ...styles.button, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                    disabled={loading}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: '2rem',
        marginBottom: '20px',
    },
    form: {
        width: '300px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    inputGroup: {
        marginBottom: '15px',
    },
    label: {
        marginBottom: '5px',
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #ddd',
        fontSize: '1rem',
    },
    button: {
        padding: '10px',
        borderRadius: '5px',
        backgroundColor: '#007BFF',
        color: '#fff',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        border: 'none',
        transition: 'opacity 0.2s ease',
    },
    error: {
        color: 'red',
        marginBottom: '15px',
    },
};

export default Login;
