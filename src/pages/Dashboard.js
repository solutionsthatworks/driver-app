import React, { useState, useEffect, useRef } from "react";
import SidebarMenu from "../components/SidebarMenu";
import axios from "axios";
import Select from "react-select";
import GoogleMapComponent from "../components/GoogleMapComponent";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaBars } from "react-icons/fa";
import { fetchDriverRoutes, acceptRoute, uploadPhoto, collectBags, completeRoute as apiCompleteRoute  } from '../services/api';  // Import API functions
import CameraComponent from "../components/CameraComponent";



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
    const [startTime, setStartTime] = useState(null);


    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

  useEffect(() => {
    fetchRoutes();
  }, []);

    useEffect(() => {
        if (isCameraOpen) {
            openCamera();
        }
    }, [isCameraOpen]);

  useEffect(() => {
    setIsCameraOpen(false);
  }, [selectedRoute]);

    // Handle Photo Capture and Upload
    const handlePhotoCaptured = (file, step, action) => {
        // Ensure step and action are correctly set
        setPhoto({ file, step, action });
        uploadPhoto(step, action, file);
    };

  // Fetch Driver Routes
    const fetchRoutes = async () => {
        const token = localStorage.getItem("token");
        try {
            const fetchedRoutes = await fetchDriverRoutes(token);

            const parsedRoutes = fetchedRoutes.map((route) => ({
                ...route,
                sequence: route.sequence.map((step) => ({
                    ...step,
                    currentStatus:
                        step.bagsCollected && step.currentStatus === "Shop"
                            ? "Bags Collected"
                            : step.currentStatus,
                    bag_count: step.bag_count || 0,
                    barcode_count: step.barcode_count || 0,
                })),
                accepted: route.is_accept === 1,
            }));

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



    // Accept Route API Call
    const handleAcceptRoute = async (routeId) => {
        try {
            const response = await acceptRoute(routeId);
            

            if (response) {
                //toast.success("Route accepted successfully!");
                setStartTime(Date.now());  // Capture start time
                fetchRoutes();  // Refresh routes to reflect acceptance
            } else {
                toast.error("Failed to accept route.");
            }
        } catch (error) {
            toast.error("Error accepting route.");
        }
    };


  // Handle Route Selection
  const handleRouteChange = (selectedOption) => {
    const selected = routes.find((route) => route.id === selectedOption.value);
    setSelectedRoute(selected);
  };


// Open Camera and Capture Photo for Specific Step and Action
    const openCamera = (step, action) => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast.error("Camera access is not supported in this browser.");
            console.error("MediaDevices or getUserMedia not available.");
            return;
        }

        setIsCameraOpen(true);

        navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((stream) => {
                if (!videoRef.current) {
                    toast.error("Video element is unavailable.");
                    return;
                }
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            })
            .catch((err) => {
                toast.error("Unable to access the camera.");
                console.error("Camera Error:", err);
            });

        // Store step and action for later use, validate step structure
        if (!step || (!step.order_code && !step.id && !step.order_id)) {
            console.error("Invalid step object passed to openCamera:", step);
            toast.error("Step information is missing. Cannot proceed.");
            return;
        }

        setPhoto({ step, action });
    };

    const capturePhoto = () => {
        if (!canvasRef.current || !videoRef.current) {
            toast.error("Camera or canvas element is not available.");
            return;
        }

        const context = canvasRef.current.getContext("2d");
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

        canvasRef.current.toBlob(
            (blob) => {
                if (!blob) {
                    toast.error("Failed to capture photo.");
                    return;
                }

                const file = new File([blob], "photo.png", { type: "image/png" });
                setIsCameraOpen(false);

                // Stop the camera stream
                if (videoRef.current?.srcObject) {
                    videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
                }

                if (!photo || !photo.step || !photo.action) {
                    console.error("Photo or action details missing:", photo);
                    toast.error("Failed to capture photo. Step or action is missing.");
                    return;
                }

                const isConfirmed = window.confirm("Do you want to upload this photo?");
                if (isConfirmed) {
                    uploadPhoto(photo.step, photo.action, file);
                }
            },
            "image/png"
        );
    };


// Upload the Captured Photo to the API
    const uploadPhoto = async (step, action, file) => {
        const token = localStorage.getItem("token");
        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL; // Fetch base URL from .env

        if (!file) {
            toast.error("No photo captured!");
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();

            // Validate step and order details
            const orderId = step?.order_code || step?.id || step?.order_id;
            if (!orderId) {
                toast.error("Order ID is missing or invalid.");
                console.error("Step object missing valid order details:", step);
                return;
            }

            formData.append("photo", file, "photo.png");
            formData.append("order_id", orderId);
            formData.append("route_id", selectedRoute?.id);
            formData.append("action", action);

            const response = await axios.post(
                `${API_BASE_URL}/driver/orders/${orderId}/upload-photo`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (response?.data?.message === "Photo uploaded successfully") {
                toast.success("Photo uploaded successfully!");
                fetchRoutes();
                setPhoto(null);
            } else {
                toast.error("Failed to upload photo.");
                console.error("Photo upload failed:", response.data);
            }
        } catch (error) {
            toast.error("Error during upload.");
            console.error("Upload Error:", error.response || error.message);
        } finally {
            setUploading(false);
        }
    };



// Upload Photo for Pickup or Delivery
    const handleUploadAndAction = async (step, action) => {
        if (
            step.currentStatus === "Delivery Scheduled" ||
            step.currentStatus === "Driver En Route for Delivery" ||
            step.currentStatus === "Pickup Scheduled" ||
            step.currentStatus === "Picked Up" ||
            step.currentStatus === "Driver En Route for Pickup" &&
            (step.nextStatus === "To be Delivered" || step.nextStatus === "Drop in Shop")
        ) {
            openCamera(step, action);
            return;
        }

        const token = localStorage.getItem("token");

        try {
            setUploading(true);

            // Use step.id or step.order_code if available
            const orderId = step.order_code || step.id || step.order_id;

            if (!orderId) {
                toast.error("Order ID is missing!");
                return;
            }

            // Check if photo exists and is a File or Blob
            if (photo instanceof Blob || photo instanceof File) {
                const file = new File([photo], "photo.png", { type: "image/png" });

                console.log("Uploading photo for order:", orderId);

                // Call the API function to upload the photo
                const response = await uploadPhoto(orderId, selectedRoute.id, file, action, token);

                if (response.message === "Photo uploaded successfully") {
                    toast.success("Photo uploaded successfully!");
                    fetchRoutes();  // Refresh the routes
                } else {
                    toast.error("Failed to upload photo.");
                }
            } else {
                toast.error("No valid photo available for upload.");
            }
        } catch (error) {
            toast.error("Error during upload.");
            console.error("Upload Error:", error);
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
      // Use the API function for bag collection
    const data = await collectBags(selectedRoute.id, bagCount, barcodeCount, token);


      if (data.success) {
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


    const completeRoute = async () => {
        if (!selectedRoute) return;

        const token = localStorage.getItem("token");

        try {
            const response = await apiCompleteRoute(selectedRoute.id, token);

            if (response && response.success) {
                toast.success("Route marked as complete!");

                // Refresh routes without full reload
                await fetchRoutes();

                // Reset selected route if no routes are left
                if (routes.length === 1) {
                    setSelectedRoute(null);
                }
            } else {
                toast.error("Failed to complete the route.");
            }
        } catch (error) {
            toast.error("Error completing route.");
            console.error("Complete Route Error:", error);
        }
    };




    const renderActionButton = (step, index) => {
        if (!step) {
            console.error("Step object is missing or invalid:", step);
            return null;
        }

        if (step.type === "Driver") return null; // Skip rendering for driver steps

        // Exit early if route not accepted
        if (!selectedRoute?.accepted) return null;

        // Handle statuses with fixed text (e.g., Delivered or Dropped in Shop)
        const statusMessages = {
            Delivered: "Delivered to Customer✔️",
            "Dropped in Shop": "Dropped in Shop ✔️",
            "Bags Collected": `Bags Collected ✔️ Bags: ${step.bag_count || "N/A"}, Barcodes: ${step.barcode_count || "N/A"}`,
        };



        if (statusMessages[step.currentStatus]) {
            return (
                <p style={{ color: "#28A745", fontWeight: "bold" }}>
                    {statusMessages[step.currentStatus]}
                </p>
            );
        }

        // Button configurations for dynamic actions
        const buttonConfig = {
            "Order Placed": {
                label: "Upload Live Photo of Bar Code and Mark as Ready for Pickup",
                style: { backgroundColor: "#17A2B8" },
            },
            "Driver En Route for Delivery": {
                label: "Upload live photo before marking Order as Delivered",
                style: { backgroundColor: "#28A745" },
            },
            "Ready for Delivery": {
                label: "Upload Live Photo and Pick-up from Shop",
                style: { backgroundColor: "#28A745" },
            },
            "Delivery Scheduled": {
                label: "Pickup Delivery, Upload Live Photo and Mark as Driver En Route for Delivery",
                style: { backgroundColor: "#28A745" },
            },
            "Pickup Scheduled": {
                label: "Upload live photo before Order Pickup from Customer",
                style: { backgroundColor: "#17A2B8" },
            },
            "Picked Up": {
                label: "Upload live photo before dropping Order in Shop",
                style: { backgroundColor: "#D22B2B" },
            },
            default: {
                label: "Upload Live Photo and Pick-up from Customer",
                style: { backgroundColor: "#007BFF" },
            },
        };

        // Handle Collect Bags button
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

        // Determine button label and style from configuration
        const { label, style } = buttonConfig[step.currentStatus] || buttonConfig.default;

        // Render the completion button for "End of Route"
        if (step.nextStatus === "End of Route") {
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

        return (
            <button
                style={{ ...styles.actionButton, ...style }}
                onClick={() => handleUploadAndAction(step, "ShopAction")}
                disabled={uploading}
            >
                {uploading ? "Uploading..." : label}
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
                <CameraComponent
                    step={photo?.step || null}
          action={photo?.action || null}
          onPhotoCaptured={handlePhotoCaptured}
                />
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
                            onClick={() => handleAcceptRoute(selectedRoute.id)}
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
