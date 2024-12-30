import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { fetchDriverRoutes } from "../services/api";


const DriverRoutes = () => {
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const token = localStorage.getItem("token");
        const fetchedRoutes = await fetchDriverRoutes(token);

        if (fetchedRoutes.length > 0) {
          setRoutes(fetchedRoutes);
        } else {
          toast.info("No routes assigned.");
        }
      } catch (err) {
        console.error("Error fetching routes:", err);
        toast.error("Failed to fetch routes.");
      }
    };

    fetchRoutes();
  }, []);

  return (
    <div style={styles.container}>
      <h1>Driver Routes</h1>
      <ul style={styles.routeList}>
        {routes.length > 0 ? (
          routes.map((route) => (
            <li key={route.id} style={styles.routeItem}>
              <p><strong>Route Name:</strong> {route.name}</p>
              <p><strong>Created On:</strong> {route.created_at}</p>
              <p><strong>Total Orders:</strong> {route.sequence.length}</p>
            </li>
          ))
        ) : (
          <p>No routes assigned yet.</p>
        )}
      </ul>
    </div>
  );
};

// Basic styling
const styles = {
  container: { padding: "20px" },
  routeList: { listStyleType: "none", padding: 0 },
  routeItem: {
    padding: "10px",
    marginBottom: "10px",
    backgroundColor: "#f4f4f4",
    borderRadius: "5px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
};

export default DriverRoutes;
