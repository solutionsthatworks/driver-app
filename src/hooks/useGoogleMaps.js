// src/hooks/useGoogleMaps.js
import { useState, useEffect } from "react";

const useGoogleMaps = (apiKey) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {

    // Use a global variable to track script loading status
    if (window.google && window.google.maps) {
        setLoaded(true);
        return;
        }

        const existingScript = document.querySelector(
            `script[src*="https://maps.googleapis.com/maps/api/js"]`
        );

        if (existingScript) {
            existingScript.addEventListener("load", () => setLoaded(true));
            existingScript.addEventListener("error", () =>
                setError("Failed to load Google Maps API.")
            );
            return;
        }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
        script.onload = () => setLoaded(true);  // Set loaded to true when script loads
        script.onerror = () => {
            setError("Failed to load Google Maps API.");
            console.error("Google Maps API failed to load.");
        };

    document.body.appendChild(script);

        return () => {
            script.removeEventListener("load", () => setLoaded(true));
            script.removeEventListener("error", () =>
                setError("Failed to load Google Maps API.")
            );
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [apiKey]);

  return loaded;
};

export default useGoogleMaps;
