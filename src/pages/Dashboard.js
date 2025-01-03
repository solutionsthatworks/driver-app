import React, { useState, useEffect, useRef } from "react";
import SidebarMenu from "../components/SidebarMenu";
import axios from "axios";
import Select from "react-select";
import GoogleMapComponent from "../components/GoogleMapComponent";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaBars } from "react-icons/fa";


const Dashboard = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [photo, setPhoto] = useState(null);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

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
    step.currentStatus === "Delivery Scheduled" 
    || step.currentStatus === "Driver En Route for Delivery" 
    || step.currentStatus === "Pickup Scheduled" 
    || step.currentStatus === "Driver En Route for Pickup" &&
    step.nextStatus === "To be Delivered" 
    || step.nextStatus === "Drop in Shop"
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

  // Prompt the driver to input bag and barcode count
  const bagCount = prompt("Enter the number of bags collected:");
  const barcodeCount = prompt("Enter the number of barcodes collected:");

  // Validate input
  if (!bagCount || !barcodeCount || isNaN(bagCount) || isNaN(barcodeCount)) {
    toast.error("Please enter valid numbers for bags and barcodes.");
    return;
  }

  try {
    setUploading(true);
    const response = await axios.post(
      `http://localhost/laundry/public/api/driver/orders/${selectedRoute.id}/collect-bags`,
      {
        route_id: selectedRoute.id,
        bag_count: bagCount,
        barcode_count: barcodeCount,
        activity_type: "Bag Collection",
        description: `Collected ${bagCount} bags and ${barcodeCount} barcodes from shop.`,

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
          return {
            ...s,
            currentStatus: "Bags Collected",
            bagsCollected: true,
            bag_count: bagCount,
            barcode_count: barcodeCount,
          };
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
    console.error("Bag Collection Error:", error.response ? error.response.data : error.message);

  } finally {
    setUploading(false);
  }
};

    // Function to check if route can be completed
    const canCompleteRoute = () => {
        if (!selectedRoute || !selectedRoute.sequence) return false;

        // Check if all steps meet the required status
        return selectedRoute.sequence.every(
            (step) =>
                step.currentStatus === "Bags Collected" ||
                step.currentStatus === "Delivered" ||
                step.currentStatus === "Dropped in Shop" ||
                step.currentStatus === "Shop" ||
                step.currentStatus === "Driver"

        );
    };

const completeRoute = async (routeId) => {
   if (!selectedRoute) return;

  const token = localStorage.getItem("token");

  try {
      const response = await axios.post(
          `http://localhost/laundry/public/api/driver/routes/${selectedRoute.id}/complete`,
          {},
          {
              headers: { Authorization: `Bearer ${token}` },
          }
      );

    if (response.data.success) {
      toast.success("Route marked as complete!");
       // Refresh the routes after completion
        await fetchRoutes();
        // If no routes are available, reset the selected route
        if (routes.length === 0) {
            setSelectedRoute(null);
        }
    } else {
      toast.error("Failed to complete the route.");
    }
  } catch (error) {
    toast.error("Error completing route.");
    console.error("Complete Route Error:", error.response ? error.response.data : error.message);
  }
};


// Render Button Based on Status and Step Type
const renderActionButton = (step, index) => {
  if (step.type === "Driver") return null;

  // Exit early if route not accepted
  if (!selectedRoute.accepted) {
    return null;
  }

  // Show completion icon if the item is delivered
  if (step.currentStatus === "Delivered") {
    return (
      <p style={{ color: "#28A745", fontWeight: "bold" }}>
        Delivered to Customer✔️
      </p>
    );
  }

  // Show completion icon if the item is delivered
  if (step.currentStatus === "Dropped in Shop") {
    return (
      <p style={{ color: "#28A745", fontWeight: "bold" }}>
        Dropped in Shop ✔️
      </p>
    );
  }

  let buttonLabel = "";
  let buttonStyle = { ...styles.actionButton };

  // Collect Bags from Shop
  if (step.currentStatus === "Shop" && index === 1 && !step.bagsCollected) {
    return (
      <button
        style={{ ...styles.actionButton, backgroundColor: "#DC3545" }}
        onClick={() => handleCollectBags(step, index)}
        disabled={uploading}
      >
        {uploading ? "Processing..." : "Collect Bags and Bar Codes from Shop"}
      </button>
    );
  }

  // Display bag collection status
  if (step.bagsCollected) {
    return (
      <p style={{ color: "#28A745" }}>
        Bags Collected ✔️ <br />
        Bags: {step.bag_count || "N/A"}, Barcodes: {step.barcode_count || "N/A"}
      </p>
    );
  }

  // Upload and Mark as Picked from Customer
  if (step.currentStatus === "Order Placed") {
    buttonLabel = "Upload Live Photo and Mark as Ready for Pickup";
    buttonStyle.backgroundColor = "#17A2B8";
  } 
  else if (step.nextStatus === "End of Route") {
    buttonLabel = "Mark route as completed";
    buttonStyle.backgroundColor = "#6C757D";

      // Render the "Mark route as completed" button
      return (
          <div>
              {selectedRoute && canCompleteRoute() && (
                  <button
                      onClick={() => completeRoute(selectedRoute.id)}
                      style={{
                          padding: "12px 20px",
                          backgroundColor: "#28A745",
                          color: "#fff",
                          fontSize: "16px",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                          marginTop: "20px",
                      }}
                  >
                      Mark route as completed
                  </button>
              )}
          </div>
      );
  } 
  else if (step.currentStatus === "Driver En Route for Delivery") {
    buttonLabel = "Upload live photo before marking Order as Delivered";
    buttonStyle.backgroundColor = "#28A745";
  } 
  else if (step.currentStatus === "Ready for Delivery") {
    buttonLabel = "Upload Live Photo and Pick-up from Shop";
    buttonStyle.backgroundColor = "#28A745";
  } 
  else if (step.currentStatus === "Delivery Scheduled") {
    buttonLabel = "Pickup Delivery, Upload Live Photo and Mark as Driver En Route for Pickup";
    buttonStyle.backgroundColor = "#28A745";
  }
  else if (step.currentStatus === "Pickup Scheduled") {
    buttonLabel = "Upload live photo before Order Pickup from Customer";
    buttonStyle.backgroundColor = "#17A2B8";
  } 
  else if (step.currentStatus === "Picked Up") {
    buttonLabel = "Upload live photo  before dropping Order in Shop";
    buttonStyle.backgroundColor = "#D22B2B";
  } 
  else {
    buttonLabel = "Upload Live Photo and Pick-up from Customer";
    buttonStyle.backgroundColor = "#007BFF";
  }

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
            <SidebarMenu isOpen={isMenuOpen} toggleMenu={toggleMenu} />
            
            <header style={styles.header}>
                <FaBars style={styles.menuIcon} onClick={toggleMenu} />
                <h1>Driver Dashboard</h1>
            </header>

            {loading ? (
                <p>Loading routes...</p>
            ) : routes.length === 0 ? (
                <p style={{ color: "#28A745", fontSize: "18px", marginTop: "20px" }}>
                    No active routes available. All routes are completed!
                </p>
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
                    <canvas
                        ref={canvasRef}
                        style={{ display: "none" }}
                        width="640"
                        height="480"
                    ></canvas>
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
                                        <p>
                                            <strong>Order ID (Driver):</strong> {step.name || "N/A"}
                                        </p>
                                        <p>
                                            <strong>Current Location:</strong> {step.address || "N/A"}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p>
                                            <strong>Address:</strong> {step.address || "N/A"}
                                        </p>
                                        <p>
                                            <strong>Order ID:</strong> {step.name || "N/A"}
                                        </p>
                                        <p>
                                            <strong>Current Status:</strong>{" "}
                                            {step.currentStatus === "Shop" && index === 1
                                                ? "Collect Bags and Bar Codes from Shop"
                                                : step.currentStatus}
                                        </p>
                                        <p>
                                            <strong>Next Step:</strong> {step.nextStatus || "N/A"}
                                        </p>
                                        <p>
                                            <strong>Distance:</strong> {step.distance || "N/A"} Miles
                                        </p>
                                        <p>
                                            <strong>Duration:</strong> {step.duration || "N/A"} min
                                        </p>
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
