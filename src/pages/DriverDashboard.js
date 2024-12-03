import React, { useEffect, useState } from 'react';
import TripList from '../components/TripList';
import Navigation from '../components/Navigation';
import { fetchTrips } from '../services/api';

const DriverDashboard = () => {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    const loadTrips = async () => {
      const data = await fetchTrips();
      setTrips(data);
    };

    loadTrips();
  }, []);

  return (
    <div>
      <Navigation />
      <h1>Driver Dashboard</h1>
      <TripList trips={trips} />
    </div>
  );
};

export default DriverDashboard;
