import React, { useState, useEffect } from 'react';

const DriverRoutes = () => {
    const [location, setLocation] = useState({ latitude: null, longitude: null });
    const [watchId, setWatchId] = useState(null);

    // Start tracking location
    useEffect(() => {
        if (navigator.geolocation) {
            const id = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocation({ latitude, longitude });
                    sendLocationToServer(latitude, longitude);  // Send to backend
                },
                (error) => {
                    console.error("Error getting location:", error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 10000, // Cache for 10 seconds
                    timeout: 5000,
                }
            );
            setWatchId(id);
        } else {
            alert("Geolocation is not supported by this browser.");
        }

        // Stop tracking on unmount
        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, []);

    // Function to send location to the server
    const sendLocationToServer = async (latitude, longitude) => {
        try {
            const response = await fetch('/api/driver/location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ latitude, longitude }),
            });

            if (!response.ok) {
                throw new Error('Failed to send location');
            }
        } catch (error) {
            console.error("Error sending location:", error);
        }
    };

    return (
        <div>
            <h1>Driver Routes</h1>
            {location.latitude && location.longitude ? (
                <p>Current Location: {location.latitude}, {location.longitude}</p>
            ) : (
                <p>Tracking location...</p>
            )}
        </div>
    );
};

export default DriverRoutes;
