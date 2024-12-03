import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import { updateProfile } from '../services/api';

const Profile = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateProfile({ name, email });
    alert('Profile updated!');
  };

  return (
    <div>
      <Navigation />
      <h1>Update Profile</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label>Email:</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit">Update</button>
      </form>
    </div>
  );
};

export default Profile;
