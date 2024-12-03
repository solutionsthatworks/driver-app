import React from 'react';
import { Link } from 'react-router-dom';

const TripList = ({ trips }) => (
  <div>
    <h2>Available Trips</h2>
    <ul>
      {trips.map((trip) => (
        <li key={trip.id}>
          <Link to={`/trip/${trip.id}`}>{trip.destination} - {trip.status}</Link>
        </li>
      ))}
    </ul>
  </div>
);

export default TripList;
