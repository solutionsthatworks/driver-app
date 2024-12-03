import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { fetchTripDetails } from '../services/api';

const TripDetails = () => {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    const loadTripDetails = async () => {
      const data = await fetchTripDetails(id);
      setTrip(data);
    };

    loadTripDetails();
  }, [id]);

  if (!trip) return <p>Loading...</p>;

  return (
    <div>
      <Navigation />
      <h1>Trip to {trip.destination}</h1>
      <p>Status: {trip.status}</p>
      <p>Details: {trip.details}</p>
    </div>
  );
};

export default TripDetails;
