import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { fetchDriverOrders, acceptOrderPickup, rejectOrderPickup } from "../services/api";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadingOrderId, setUploadingOrderId] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const validateTokenAndFetchOrders = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Token not found. Redirecting to login.");
        navigate("/");
        return;
      }

      try {
        const fetchedOrders = await fetchDriverOrders(token);
        const filteredOrders = fetchedOrders.filter(
          (order) =>
            order.order_status === "Pickup Scheduled" ||
            order.order_status === "Driver En Route for Pickup" ||
            order.order_status === "Picked Up"
        );
        const updatedOrders = filteredOrders.map((order) => ({
          ...order,
          showPickUpButton: order.order_status === "Driver En Route for Pickup",
        }));
        setOrders(updatedOrders || []);
        trackLiveLocation();
      } catch (err) {
        console.error("Error fetching orders:", err.message);
        toast.error("Failed to fetch orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    validateTokenAndFetchOrders();
  }, [navigate]);

  const trackLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported.");
      return;
    }
    navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        updateLocation(latitude, longitude);
      },
      (error) => {
        console.error("Geolocation error:", error.message);
        toast.error("Unable to fetch location.");
      },
      { enableHighAccuracy: true }
    );
  };

  const updateLocation = async (latitude, longitude) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_API_KEY`
      );
      const address = response.data.results[0]?.formatted_address || "Address not available";
      setCurrentLocation({ latitude, longitude, address });
    } catch (error) {
      console.error("Error fetching address:", error.message);
      setCurrentLocation({ latitude, longitude, address: "Unable to fetch address" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.info("Logged out successfully.");
    navigate("/");
  };

  const handleAction = async (orderId, action) => {
    const token = localStorage.getItem("token");
    try {
      if (action === "accept") {
        await acceptOrderPickup(token, orderId);
        toast.success(`Order ${orderId} accepted for pickup!`);
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.order_id === orderId
              ? { ...order, order_status: "Driver En Route for Pickup", showPickUpButton: true }
              : order
          )
        );
      } else if (action === "reject") {
        await rejectOrderPickup(token, orderId);
        toast.warning(`Order ${orderId} rejected!`);
        setOrders((prevOrders) => prevOrders.filter((order) => order.order_id !== orderId));
      }
    } catch (err) {
      console.error(`Error performing ${action} on order ${orderId}:`, err.message);
      toast.error(`Failed to ${action} the order. Please try again.`);
    }
  };

  const handleCapturePhoto = (orderId) => {
    setUploadingOrderId(orderId);
    setShowCamera(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.error("Error accessing camera:", err.message);
          toast.error("Camera access denied. Please allow camera access.");
        });
    } else {
      toast.error("Camera not supported on this device.");
    }
  };

  const handleTakePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL("image/jpeg");
      setCapturedImage(imageData);
      video.srcObject.getTracks().forEach((track) => track.stop());
      setShowCamera(false);
    } else {
      toast.error("Camera or canvas element not found.");
    }
  };

  const handleUploadPhoto = async () => {
    if (!capturedImage) {
      toast.error("No image to upload.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication token is missing. Please log in again.");
      return;
    }

    const blob = await fetch(capturedImage).then((res) => res.blob()); // Convert base64 to blob
    const formData = new FormData();
    formData.append("image", blob, `order-${uploadingOrderId}.jpg`);

    try {
      const response = await axios.post(
        `http://localhost/laundry/public/api/driver/orders/${uploadingOrderId}/upload-photo`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Photo uploaded successfully!");
      setCapturedImage(null);

      // Ask for confirmation to mark as picked up
      const confirmPickup = window.confirm(
        "Photo uploaded successfully. Would you like to mark this order as 'Picked Up'?"
      );
      if (confirmPickup) {
        handleMarkPickedUp(uploadingOrderId);
      }

      setUploadingOrderId(null);
    } catch (error) {
      console.error("Error uploading photo:", error.response?.data || error.message);
      toast.error("Failed to upload photo. Please try again.");
    }
  };

  const handleMarkPickedUp = async (orderId) => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.post(
        `http://localhost/laundry/public/api/driver/orders/${orderId}/mark-picked-up`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success(response.data.message);
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.order_id === orderId
            ? { ...order, order_status: "Picked Up", showPickUpButton: false }
            : order
        )
      );
    } catch (err) {
      console.error("Error marking order as picked up:", err.message);
      toast.error("Failed to mark order as picked up. Please try again.");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Driver Dashboard</h1>

      <div style={styles.locationBox}>
        <h2>Current Location</h2>
        {currentLocation ? (
          <p>
            <strong>Address:</strong> {currentLocation.address || "Fetching address..."}
          </p>
        ) : (
          <p>Fetching location...</p>
        )}
      </div>

      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length > 0 ? (
        <ul style={styles.orderList}>
          {orders.map((order) => (
            <li key={order.order_id} style={styles.orderItem}>
              <p>
                <strong>Order Code:</strong> {order.order_code}
              </p>
              <p>
                <strong>Address:</strong> {order.address}
              </p>
              <p>
                <strong>Status:</strong> {order.order_status}
              </p>
              {order.showPickUpButton && (
                <button
                  style={styles.pickUpButton}
                  onClick={() => handleMarkPickedUp(order.order_id)}
                >
                  Mark as Picked Up
                </button>
              )}
              {order.order_status === "Driver En Route for Pickup" && (
                <>
                  <button
                    style={styles.captureButton}
                    onClick={() => handleCapturePhoto(order.order_id)}
                  >
                    Capture Photo
                  </button>
                </>
              )}
              {order.order_status === "Pickup Scheduled" && (
                <>
                  <button
                    style={styles.acceptButton}
                    onClick={() => handleAction(order.order_id, "accept")}
                  >
                    Accept
                  </button>
                  <button
                    style={styles.rejectButton}
                    onClick={() => handleAction(order.order_id, "reject")}
                  >
                    Reject
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No orders available.</p>
      )}

      {showCamera && (
        <div style={styles.cameraBox}>
          <video ref={videoRef} style={styles.video} />
          <button onClick={handleTakePhoto} style={styles.captureButton}>
            Take Photo
          </button>
        </div>
      )}

      {capturedImage && (
        <div>
          <img src={capturedImage} alt="Captured" style={styles.capturedImage} />
          <button onClick={handleUploadPhoto} style={styles.uploadButton}>
            Upload Photo
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

const styles = {
  container: { padding: "10px" },
  header: { fontSize: "24px", fontWeight: "bold", textAlign: "center", marginBottom: "20px" },
  locationBox: { padding: "10px", marginBottom: "20px", backgroundColor: "#f0f0f0" },
  orderList: { listStyleType: "none", padding: 0 },
  orderItem: { padding: "10px", marginBottom: "10px", backgroundColor: "#e6e6e6" },
  pickUpButton: { backgroundColor: "#007BFF", color: "#fff", padding: "10px", borderRadius: "5px" },
  captureButton: { backgroundColor: "#28A745", color: "#fff", padding: "10px", borderRadius: "5px" },
  acceptButton: { backgroundColor: "#28A745", color: "#fff", padding: "10px", borderRadius: "5px" },
  rejectButton: { backgroundColor: "#DC3545", color: "#fff", padding: "10px", borderRadius: "5px" },
  uploadButton: { backgroundColor: "#007BFF", color: "#fff", padding: "10px", borderRadius: "5px" },
  cameraBox: { textAlign: "center", marginTop: "20px" },
  video: { width: "100%", height: "auto", marginBottom: "10px" },
  capturedImage: { width: "100%", marginTop: "10px" },
};

export default Dashboard;
