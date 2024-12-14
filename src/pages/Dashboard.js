import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { fetchDriverOrders } from "../services/api";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentView, setCurrentView] = useState("active"); // Toggle between active and processed
  const [loading, setLoading] = useState(true);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadingOrderId, setUploadingOrderId] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();


  // Fetch active orders
  const fetchActiveOrders = async () => {
    const token = localStorage.getItem("token");
    try {

      const fetchedOrders = await fetchDriverOrders(token);

      const filteredOrders = fetchedOrders.filter(
        (order) =>

          order.order_status === "Pickup Scheduled" ||
          order.order_status === "Driver En Route for Pickup" ||
          order.order_status === "Picked Up" ||
          order.order_status === "Delivery Scheduled" ||
          order.order_status === "Driver En Route for Delivery" ||
          order.order_status === "Delivery Picked Up"
      );

      const updatedOrders = filteredOrders.map((order) => ({

        ...order,
        showPickUpButton: order.order_status === "Driver En Route for Pickup",
        showDropToShopButton: order.order_status === "Picked Up",
        showDeliveryPickupButton: order.order_status === "Driver En Route for Delivery",
        showDeliveryCompleteButton: order.order_status === "Delivery Picked Up",
      }));
      setOrders(updatedOrders);
    } catch (err) {
      console.error("Error fetching active orders:", err.message);
      toast.error("Failed to fetch active orders. Please try again.");
    }
  };

    useEffect(() => {
    // Fetch orders and group them by `order_id`
    const fetchAndGroupOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const fetchedOrders = await fetchDriverOrders(token);
        const groupedOrders = groupOrdersById(fetchedOrders);
        setOrders(groupedOrders);
      } catch (err) {
        console.error("Error fetching orders:", err.message);
        toast.error("Failed to fetch orders. Please try again.");
      }
    };

    fetchAndGroupOrders();
  }, []);

  const groupOrdersById = (orders) => {
    const grouped = orders.reduce((acc, order) => {
      const { order_id, assigned_for } = order;
      if (!acc[order_id]) {
        acc[order_id] = { ...order, assigned_for: [] };
      }
      acc[order_id].assigned_for.push(assigned_for);
      return acc;
    }, {});
    return Object.values(grouped);
  };

  
// Fetch orders based on the current view
  const fetchOrders = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Token not found. Redirecting to login.");
      navigate("/");
      return;
    }

    setLoading(true);
    try {
      if (currentView === "active") {
        const fetchedOrders = await fetchDriverOrders(token);
        const filteredOrders = fetchedOrders.filter(
          (order) =>
            order.order_status === "Pickup Scheduled" ||
            order.order_status === "Driver En Route for Pickup" ||
            order.order_status === "Picked Up" ||
            order.order_status === "Delivery Scheduled" ||
            order.order_status === "Driver En Route for Delivery" ||
            order.order_status === "Delivery Picked Up"
        );
        const updatedOrders = filteredOrders.map((order) => ({
          ...order,
          showPickUpButton: order.order_status === "Driver En Route for Pickup",
          showDropToShopButton: order.order_status === "Picked Up",
          showDeliveryPickupButton: order.order_status === "Driver En Route for Delivery",
          showDeliveryCompleteButton: order.order_status === "Delivery Picked Up",
        }));
        setOrders(updatedOrders);
      } else if (currentView === "processed") {
        const response = await axios.get(
          "http://localhost/laundry/public/api/driver/orders/processed",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(response.data.orders || []);
      }
    } catch (error) {
      console.error(`Error fetching ${currentView} orders:`, error.message);
      toast.error(`Failed to fetch ${currentView} orders. Please try again.`);
    } finally {
      setLoading(false);
    }
  };


  // Fetch processed orders
  const fetchProcessedOrders = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(
        "http://localhost/laundry/public/api/driver/orders/processed",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error("Error fetching processed orders:", error.message);
      toast.error("Failed to fetch processed orders. Please try again.");
    }
  };


    // Fetch orders on initial load
  useEffect(() => {
    fetchOrders();
    trackLiveLocation();
  }, []);

    // Fetch orders on view change
  useEffect(() => {
    fetchOrders();
  }, [currentView]);


    // Fetch orders based on the current view
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      if (currentView === "active") {
        await fetchActiveOrders();
      } else {
        await fetchProcessedOrders();
      }
      setLoading(false);
    };
    fetchOrders();
  }, [currentView]);


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

  const handleAction = async (orderId, action, orderType) => {
    const token = localStorage.getItem("token");
    try {
      let apiEndpoint = "";
      let successMessage = "";

      if (action === "accept") {
        if (orderType === "pickup") {
          apiEndpoint = `http://localhost/laundry/public/api/driver/orders/${orderId}/accept-pickup`;
          successMessage = `Order ${orderId} accepted for pickup!`;
        } else if (orderType === "delivery") {
          apiEndpoint = `http://localhost/laundry/public/api/driver/orders/${orderId}/accept-delivery`;
          successMessage = `Order ${orderId} accepted for delivery!`;
        }
      } else if (action === "reject") {
        if (orderType === "pickup") {
          apiEndpoint = `http://localhost/laundry/public/api/driver/orders/${orderId}/reject-pickup`;
          successMessage = `Order ${orderId} rejected for pickup!`;
        } else if (orderType === "delivery") {
          apiEndpoint = `http://localhost/laundry/public/api/driver/orders/${orderId}/reject-delivery`;
          successMessage = `Order ${orderId} rejected for delivery!`;
        }
      }

      if (!apiEndpoint) {
        throw new Error("Invalid action or order type.");
      }

      await axios.post(apiEndpoint, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(successMessage);

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.order_id === orderId
            ? {
                ...order,
                order_status: action === "accept"
                  ? orderType === "pickup"
                    ? "Driver En Route for Pickup"
                    : "Driver En Route for Delivery"
                  : order.order_status,
                showPickUpButton: orderType === "pickup" && action === "accept",
                showDeliveryPickupButton: orderType === "delivery" && action === "accept",
              }
            : order
        )
      );

      if (action === "reject") {
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

  const handleUploadPhoto = async (orderId, nextStatus) => {
    if (!capturedImage) {
      toast.error("No image to upload.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication token is missing. Please log in again.");
      return;
    }

    const blob = await fetch(capturedImage).then((res) => res.blob());
    const formData = new FormData();
    formData.append("image", blob, `status-update-${orderId}.jpg`);

    try {
      await axios.post(
        `http://localhost/laundry/public/api/driver/orders/${orderId}/upload-photo`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Photo uploaded successfully!");

      const confirmNextStatus = window.confirm(
        `Photo uploaded successfully. Would you like to mark this order as '${nextStatus}'?`
      );

      if (confirmNextStatus) {
        if (nextStatus === "Picked Up") {
          handleMarkPickedUp(orderId);
        } else if (nextStatus === "Dropped in Shop") {
          handleMarkDroppedInShop(orderId);
        } else if (nextStatus === "Delivery Picked Up") {
          handleMarkDeliveryPickedUp(orderId);
        } else if (nextStatus === "Delivered") {
          handleMarkDelivered(orderId);
        }
      }

      setCapturedImage(null);
      setUploadingOrderId(null);
    } catch (error) {
      console.error("Error uploading photo:", error.response?.data || error.message);
      toast.error("Failed to upload photo. Please try again.");
    }
  };

  const handleMarkPickedUp = async (orderId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://localhost/laundry/public/api/driver/orders/${orderId}/mark-picked-up`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Order marked as Picked Up.");
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.order_id === orderId
            ? { ...order, order_status: "Picked Up", showPickUpButton: false, showDropToShopButton: true }
            : order
        )
      );
    } catch (err) {
      console.error("Error marking order as Picked Up:", err.message);
      toast.error("Failed to mark order as Picked Up. Please try again.");
    }
  };

  const handleMarkDroppedInShop = async (orderId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://localhost/laundry/public/api/driver/orders/${orderId}/mark-dropped-in-shop`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Order marked as Dropped in Shop.");
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.order_id === orderId
            ? { ...order, order_status: "Dropped in Shop", showDropToShopButton: false }
            : order
        )
      );
    } catch (err) {
      console.error("Error marking order as Dropped in Shop:", err.message);
      toast.error("Failed to mark order as Dropped in Shop. Please try again.");
    }
  };

  const handleMarkDeliveryPickedUp = async (orderId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://localhost/laundry/public/api/driver/orders/${orderId}/mark-delivery-picked-up`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Order marked as Delivery Picked Up.");
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.order_id === orderId
            ? { ...order, order_status: "Delivery Picked Up", showDeliveryPickupButton: false, showDeliveryCompleteButton: true }
            : order
        )
      );
    } catch (err) {
      console.error("Error marking order as Delivery Picked Up:", err.message);
      toast.error("Failed to mark order as Delivery Picked Up. Please try again.");
    }
  };

  const handleMarkDelivered = async (orderId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://localhost/laundry/public/api/driver/orders/${orderId}/mark-delivered`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Order marked as Delivered.");
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.order_id === orderId
            ? { ...order, order_status: "Delivered", showDeliveryCompleteButton: false }
            : order
        )
      );
    } catch (err) {
      console.error("Error marking order as Delivered:", err.message);
      toast.error("Failed to mark order as Delivered. Please try again.");
    }
  };

  return (
    <div>
      <h1>Driver Dashboard</h1>

      {/* Menu */}
     <div style={styles.menu}>
     <button
        style={styles.tab}
        onClick={() => window.location.reload()} // Refresh the page
      >
        Active Orders
      </button>
      <button
  style={styles.historyButton}
  onClick={() => navigate("/order-history")}
>
  View Order History
</button>
      
      <button style={styles.logoutButton} onClick={handleLogout}>
        Logout
      </button>
    </div>


      {/* Location Display */}
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



      <ul style={styles.orderList}>
        {orders.map((order, index) => (
          <li key={order.order_id} style={styles.orderItem}>
            <p><strong>Order Code:</strong> {order.order_code}</p>
            <p><strong> Order Address:</strong> {order.address}</p>
            
            <p><strong>Order Status:</strong> {order.assign_for} </p>

            
            {order.showPickUpButton && (
              <>
                <p><strong>Pick-up Date:</strong> {order.pick_date}</p>
                <p><strong>Pick-up Time:</strong> {order.pick_hour}</p>
                <button onClick={() => handleCapturePhoto(order.order_id)}>
                  Capture Photo before Pickup
                </button>
                {capturedImage && uploadingOrderId === order.order_id && (
                  <button onClick={() => handleUploadPhoto(order.order_id, "Picked Up")}>
                    Upload and Mark as Picked Up
                  </button>
                )}
              </>
            )}
            {order.showDropToShopButton && (
              <>
                <p><strong>Pick-up Date:</strong> {order.pick_date}</p>
                <p><strong>Pick-up Time:</strong> {order.pick_hour}</p>
                <button onClick={() => handleCapturePhoto(order.order_id)}>
                  Capture Photo after Drop to Shop
                </button>
                {capturedImage && uploadingOrderId === order.order_id && (
                  <button onClick={() => handleUploadPhoto(order.order_id, "Dropped in Shop")}>
                    Upload and Mark as Dropped in Shop
                  </button>
                )}
              </>
            )}
            {order.showDeliveryPickupButton && (
              <>
                <p><strong>Pick-up Date:</strong> {order.delivery_date}</p>
                <p><strong>Pick-up Time:</strong> {order.delivery_hour}</p>
                <button onClick={() => handleCapturePhoto(order.order_id)}>
                  Capture Photo before Delivery Pickup
                </button>
                {capturedImage && uploadingOrderId === order.order_id && (
                  <button onClick={() => handleUploadPhoto(order.order_id, "Delivery Picked Up")}>
                    Upload and Mark as Delivery Picked Up
                  </button>
                )}
              </>
            )}
            {order.showDeliveryCompleteButton && (
              <>
                <p><strong>Pick-up Date:</strong> {order.delivery_date}</p>
                <p><strong>Pick-up Time:</strong> {order.delivery_hour}</p>
                <button onClick={() => handleCapturePhoto(order.order_id)}>
                  Capture Photo before Delivery Completion
                </button>
                {capturedImage && uploadingOrderId === order.order_id && (
                  <button onClick={() => handleUploadPhoto(order.order_id, "Delivered")}>
                    Upload and Mark as Delivered
                  </button>
                )}
              </>
            )}
            {order.order_status === "Pickup Scheduled" && (
              <>
                <p><strong>Pick-up Date:</strong> {order.pick_date}</p>
                <p><strong>Pick-up Time:</strong> {order.pick_hour}</p>
                <button onClick={() => handleAction(order.order_id, "accept", "pickup")}>
                  Accept Pickup
                </button>
                <button onClick={() => handleAction(order.order_id, "reject", "pickup")}>
                  Reject Pickup
                </button>
              </>
            )}
            {order.order_status === "Delivery Scheduled" && (
              <>
                <p><strong>Pick-up Date:</strong> {order.delivery_date}</p>
                <p><strong>Pick-up Time:</strong> {order.delivery_hour}</p>
                <button onClick={() => handleAction(order.order_id, "accept", "delivery")}>
                  Accept Delivery
                </button>
                <button onClick={() => handleAction(order.order_id, "reject", "delivery")}>
                  Reject Delivery
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {showCamera && (
        <div>
          <video ref={videoRef} />
          <button onClick={handleTakePhoto}>Take Photo</button>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

const styles = {
  container: { padding: "10px" },
  header: { fontSize: "24px", fontWeight: "bold", textAlign: "center", marginBottom: "20px" },
  menu: { display: "flex", justifyContent: "space-around", marginBottom: "20px" },
  tab: { padding: "10px", cursor: "pointer" },
  activeTab: { padding: "10px", cursor: "pointer", fontWeight: "bold", borderBottom: "2px solid black" },
  locationBox: { padding: "10px", marginBottom: "20px", backgroundColor: "#f0f0f0" },
  orderList: { listStyleType: "none", padding: 0 },
  orderItem: { padding: "10px", marginBottom: "10px", backgroundColor: "#e6e6e6" },
  captureButton: { backgroundColor: "#28A745", color: "#fff", padding: "10px", borderRadius: "5px" },
  uploadButton: { backgroundColor: "#007BFF", color: "#fff", padding: "10px", borderRadius: "5px" },
  acceptButton: { backgroundColor: "#28A745", color: "#fff", padding: "10px", borderRadius: "5px" },
  rejectButton: { backgroundColor: "#DC3545", color: "#fff", padding: "10px", borderRadius: "5px" },
  cameraBox: { textAlign: "center", marginTop: "20px" },
  video: { width: "100%", height: "auto", marginBottom: "10px" },
  homeButton: {   backgroundColor: "#FF7F50", color: "#fff", padding: "10px", borderRadius: "5px", cursor: "pointer", marginLeft: "5px", },
};

export default Dashboard;
