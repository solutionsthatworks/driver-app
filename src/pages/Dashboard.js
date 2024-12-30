import React, { useState, useEffect, useRef  } from "react";
import axios from "axios";
import Select from "react-select";
import GoogleMapComponent from "../components/GoogleMapComponent";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Dashboard = () => {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    setIsCameraOpen(false);
  }, [selectedRoute]);

  // Fetch Driver Routes
  const fetchRoutes = async () => {
  const token = localStorage.getItem("token");
  try {
    const response = await axios.get(
      "http://localhost/laundry/public/api/driver/routes",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const parsedRoutes = response.data.routes.map((route) => {
      const driverOrder = route.driverOrders?.[0] || {};  // Use driverOrders here
      return {
        ...route,
        sequence: route.sequence.map((step) => ({
          ...step,
          currentStatus: step.bagsCollected
            ? "Bags Collected"
            : step.currentStatus,
        })),
        order_id: driverOrder.order_id || null,
        order_status: driverOrder.status || "N/A",
        accepted: route.is_accept === 1,
      };
    });

    setRoutes(parsedRoutes);
    if (parsedRoutes.length > 0) {
      setSelectedRoute(parsedRoutes[0]);
    }
  } catch (error) {
    toast.error("Failed to fetch routes");
  } finally {
    setLoading(false);
  }
};


  // Handle Route Selection
  const handleRouteChange = (selectedOption) => {
    const selected = routes.find((route) => route.id === selectedOption.value);
    setSelectedRoute(selected);
  };


const [startTime, setStartTime] = useState(null);

  // Accept Route API Call
  const acceptRoute = async (routeId) => {
    const token = localStorage.getItem("token");

    try {
      const response = await axios.post(
        `http://localhost/laundry/public/api/driver/routes/${routeId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Route accepted successfully!");
        setStartTime(Date.now());  // Capture start time
        fetchRoutes();  // Refresh routes to reflect acceptance
      } else {
        toast.error("Failed to accept route.");
      }
    } catch (error) {
      toast.error("Error accepting route.");
    }
  };


// Open Camera and Capture Photo for Specific Step and Action
// Open Camera and Capture Photo for Specific Step and Action
const openCamera = (step, action) => {
  setIsCameraOpen(true);
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    })
    .catch((err) => {
      toast.error("Unable to access camera");
      console.error(err);
    });

  // Store step and action for later upload
  setPhoto({ step, action });
};

// Capture Photo and Confirm for Upload
const capturePhoto = () => {
  const context = canvasRef.current.getContext("2d");
  context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
  
  canvasRef.current.toBlob((blob) => {
    if (!blob) {
      toast.error("Failed to capture photo.");
      return;
    }

    const file = new File([blob], "photo.png", { type: "image/png" });
    setPhoto(file);  // Store photo as a real File object
    setIsCameraOpen(false);
    videoRef.current.srcObject.getTracks().forEach((track) => track.stop());

    const isConfirmed = window.confirm("Do you want to upload this photo?");
    if (isConfirmed) {
      uploadPhoto(photo.step, photo.action, file);  // Pass file directly
    }
  }, "image/png");
};

// Upload the Captured Photo to the API
const uploadPhoto = async (step, action, file) => {
  const token = localStorage.getItem("token");

  if (!file) {
    toast.error("No photo captured!");
    return;
  }

  try {
    setUploading(true);
    const formData = new FormData();
    const orderId = step.order_code || step.id || step.order_id;

    if (!orderId) {
      toast.error("Order ID is missing!");
      return;
    }

    formData.append("photo", file, "photo.png");  // Ensure correct key and value
    formData.append("order_id", orderId);
    formData.append("route_id", selectedRoute.id);
    formData.append("action", action);

    // Debugging Log
    console.log("Form Data Before Upload:");
    formData.forEach((value, key) => {
      console.log(key, value);
    });

    const response = await axios.post(
      `http://localhost/laundry/public/api/driver/orders/${orderId}/upload-photo`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (response.data.message === "Photo uploaded successfully") {
      toast.success("Photo uploaded successfully!");
      fetchRoutes();
      setPhoto(null);
    } else {
      toast.error("Failed to upload photo.");
    }
  } catch (error) {
    toast.error("Error during upload.");
    console.error("Upload Error:", error.response ? error.response.data : error.message);
  } finally {
    setUploading(false);
  }
};



// Upload Photo for Pickup or Delivery
const handleUploadAndAction = async (step, action) => {
  if (
    step.currentStatus === "Ready for Delivery" &&
    step.nextStatus === "To be Delivered"
  ) {
    openCamera(step, action);
    return;
  }

  const token = localStorage.getItem("token");

  try {
    setUploading(true);
    const formData = new FormData();

    // Use step.id or step.order_code if available
    const orderId = step.order_code || step.id || step.order_id;

    if (!orderId) {
      toast.error("Order ID is missing!");
      return;
    }

    formData.append("order_id", orderId);
    formData.append("route_id", selectedRoute.id);
    formData.append("action", action);

    if (photo) {
      const blob = await fetch(photo).then((res) => res.blob());
      formData.append("image", photo, "photo.png");
    }

    console.log("Form Data Before Upload:");
    formData.forEach((value, key) => {
      console.log(key, value);
    });

    const response = await axios.post(
      `http://localhost/laundry/public/api/driver/orders/${orderId}/upload-photo`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.message === "Photo uploaded successfully") {
      toast.success("Photo uploaded successfully!");
      fetchRoutes();
    } else {
      toast.error("Failed to upload photo.");
    }
  } catch (error) {
    toast.error("Error during upload.");
  } finally {
    setUploading(false);
  }
};




 const handleCollectBags = async (step, index) => {
  const token = localStorage.getItem("token");

  try {
    setUploading(true);
    const response = await axios.post(
      `http://localhost/laundry/public/api/driver/orders/${step.id}/collect-bags`,
      {
        route_id: selectedRoute.id,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.data.success) {
      toast.success("Bags and bar codes collected successfully!");

      // Update sequence to reflect "Bags Collected"
      const updatedSequence = selectedRoute.sequence.map((s, i) => {
        if (i === index) {
          return { ...s, currentStatus: "Bags Collected", bagsCollected: true };
        }
        return s;
      });

      // Update route state
      setSelectedRoute({ ...selectedRoute, sequence: updatedSequence });
    } else {
      toast.error("Failed to collect bags and bar codes.");
    }
  } catch (error) {
    toast.error("Error during bag collection.");
  } finally {
    setUploading(false);
  }
};



// Render Button Based on Status and Step Type
// Render Button Based on Status and Step Type
const renderActionButton = (step, index) => {
  if (step.type === "Driver") return null;

  // Do not show any buttons if the route is not accepted
  if (!selectedRoute.accepted) {
    return null;
  }

  // Collect Bags Button Logic
  if (
    step.currentStatus === "Shop" &&
    index === 1 &&
    !step.bagsCollected
  ) {
    return (
      <button
        style={{ ...styles.actionButton, backgroundColor: "#DC3545" }}  // Red for Shop
        onClick={() => handleCollectBags(step, index)}
        disabled={uploading}
      >
        {uploading ? "Processing..." : "Collect Bags and Bar Codes from Shop"}
      </button>
    );
  }

  // Show collected status if bags are collected
  if (step.bagsCollected) {
    return <p style={{ color: "#28A745" }}>Bags Collected ✔️</p>;
  }

  // Other Button Logic (Delivery or Pickup)
  const buttonLabel =
    step.currentStatus === "Ready for Delivery"
      ? "Pick-up from shop and Upload Live Photo"
      : "Pick-up OR Drop-in and Upload Live Photo";

  const buttonStyle = {
    ...styles.actionButton,
    backgroundColor:
      step.currentStatus === "Ready for Delivery"
        ? "#28A745"
        : step.currentStatus === "Shop"
        ? "#DC3545"
        : "#007BFF",
  };

  return (
    <button
      style={buttonStyle}
      onClick={() => handleUploadAndAction(step, "ShopAction")}
      disabled={uploading}
    >
      {uploading ? "Uploading..." : buttonLabel}
    </button>
  );
};


  return (
    <div style={styles.container}>
      <h1>Driver Dashboard</h1>

      {loading ? (
        <p>Loading routes...</p>
      ) : (
        <Select
          options={routes.map((route) => ({
            value: route.id,
            label: route.name,
          }))}
          onChange={handleRouteChange}
          placeholder="Select Route"
          styles={{ width: "100%" }}
        />
      )}

      {selectedRoute && (
        <div style={styles.mapContainer}>
          <GoogleMapComponent route={selectedRoute} />
        </div>
      )}

      {isCameraOpen && (
  <div>
    <video ref={videoRef} style={{ width: "100%" }} />
    <button onClick={capturePhoto}>Capture Photo</button>
    <canvas ref={canvasRef} style={{ display: "none" }} width="640" height="480"></canvas>
  </div>
)}

{photo && (
  <div>
    <h4>Captured Photo:</h4>
    <img src={photo} alt="Captured" style={{ width: "100%" }} />
  </div>
)}

      {selectedRoute && (
        <div style={styles.cardContainer}>
          <h3>Route Details</h3>
          {selectedRoute.is_accept === null && (
  <button
    style={styles.acceptButton}
    onClick={() => acceptRoute(selectedRoute.id)}
  >
    Accept Route
  </button>
)}


          {selectedRoute.sequence.map((step, index) => (
  <div key={index} style={styles.card}>
    <div style={styles.cardHeader}>
      <span style={styles.step}>Step {index + 1}</span>
    </div>
    <div style={styles.cardBody}>
      {index === 0 && step.type === "Driver" ? (
        <>
          <p><strong>Order ID (Driver):</strong> {step.name || "N/A"}</p>
          <p><strong>Current Location:</strong> {step.address || "N/A"}</p>
        </>
      ) : (
        <>
          <p><strong>Address:</strong> {step.address || "N/A"}</p>
          <p><strong>Order ID:</strong> {step.name || "N/A"}</p>
          <p><strong>Current Status:</strong> {
            step.currentStatus === "Shop" && index === 1
              ? "Collect Bags and Bar Codes from Shop"
              : step.currentStatus
          }</p>
          <p><strong>Next Step:</strong> {step.nextStatus || "N/A"}</p>
          <p><strong>Distance:</strong> {step.distance || "N/A"} Miles</p>
          <p><strong>Duration:</strong> {step.duration || "N/A"} min</p>
          
          {/* Show the new Collect Bags button conditionally */}
          {renderActionButton(step, index)}
        </>
      )}
    </div>
  </div>
))}





        </div>
      )}

    </div>
  );
};


// Styles
const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "20px",
  },
  mapContainer: {
    width: "100%",
    height: "600px",
    margin: "20px 0",
  },
  cardContainer: {
    marginTop: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
    padding: "15px",
    border: "1px solid #ddd",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
  },
  step: {
    fontSize: "18px",
    fontWeight: "bold",
  },
  cardBody: {
    fontSize: "14px",
    color: "#555",
  },
  acceptButton: {
    padding: "15px",
    backgroundColor: "#28A745",
    color: "#fff",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
    marginBottom: "20px",
    borderRadius: "5px",
  },
  actionButton: {
    marginTop: "10px",
    padding: "12px 20px",
    backgroundColor: "#007BFF",
    color: "#fff",
    fontSize: "14px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default Dashboard;
