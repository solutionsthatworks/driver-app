import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

const CameraComponent = ({ step, action, onPhotoCaptured }) => {
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [facingMode, setFacingMode] = useState("environment"); // Default to back camera
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Open Camera and Start Video Stream
    const openCamera = () => {
        setIsCameraOpen(true);
        startCamera(facingMode);
    };

    // Start the Camera with the Selected Facing Mode
    const startCamera = (mode) => {
        navigator.mediaDevices
            .getUserMedia({
                video: { facingMode: mode },
            })
            .then((stream) => {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            })
            .catch((err) => {
                toast.error("Unable to access camera");
                console.error(err);
            });
    };

    // Toggle Between Front and Back Camera
    const toggleCamera = () => {
        const newMode = facingMode === "environment" ? "user" : "environment";
        setFacingMode(newMode);

        // Stop Current Stream
        const tracks = videoRef.current.srcObject?.getTracks();
        tracks?.forEach((track) => track.stop());

        // Restart Camera with New Mode
        startCamera(newMode);
    };

    // Capture Photo from Video Stream
    const capturePhoto = () => {
        const context = canvasRef.current.getContext("2d");
        context.drawImage(
            videoRef.current,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
        );

        canvasRef.current.toBlob((blob) => {
            if (!blob) {
                toast.error("Failed to capture photo.");
                return;
            }

            const file = new File([blob], "photo.png", { type: "image/png" });
            setIsCameraOpen(false);
            videoRef.current.srcObject.getTracks().forEach((track) => track.stop());

            // Pass Captured Photo to Parent Component
            onPhotoCaptured(file, step, action);
        }, "image/png");
    };

    return (
        <div>
            {!isCameraOpen && (
                <button onClick={openCamera} style={styles.openCameraButton}>
                    Open Camera
                </button>
            )}

            {isCameraOpen && (
                <div style={styles.cameraContainer}>
                    <video ref={videoRef} style={styles.video} />

                    {/* Toggle Front/Back Camera */}
                    <button onClick={toggleCamera} style={styles.toggleButton}>
                        {facingMode === "environment"
                            ? "Switch to Front Camera"
                            : "Switch to Back Camera"}
                    </button>

                    {/* Capture Photo */}
                    <button onClick={capturePhoto} style={styles.captureButton}>
                        Capture Photo
                    </button>

                    {/* Hidden Canvas to Process Photo */}
                    <canvas
                        ref={canvasRef}
                        style={{ display: "none" }}
                        width="640"
                        height="480"
                    ></canvas>
                </div>
            )}
        </div>
    );
};

// Add Styling for Buttons
const styles = {
    openCameraButton: {
        padding: "15px 20px",
        backgroundColor: "#007BFF",
        color: "#fff",
        fontSize: "16px",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        marginTop: "20px",
    },
    cameraContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: "20px",
    },
    video: {
        width: "100%",
        maxWidth: "400px",
        borderRadius: "10px",
    },
    toggleButton: {
        marginTop: "10px",
        padding: "10px 15px",
        backgroundColor: "#28A745",
        color: "#fff",
        fontSize: "14px",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
    },
    captureButton: {
        marginTop: "15px",
        padding: "12px 20px",
        backgroundColor: "#DC3545",
        color: "#fff",
        fontSize: "16px",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
    },
};

export default CameraComponent;
