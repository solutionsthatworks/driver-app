// src/hooks/useGoogleMaps.js
import { useState, useEffect } from "react";

const useGoogleMaps = (apiKey) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const existingScript = document.querySelector(
      `script[src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places"]`
    );

    if (existingScript) {
      setLoaded(true);  // If script already exists, just set loaded to true
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);  // Set loaded to true when script loads

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [apiKey]);

  return loaded;
};

export default useGoogleMaps;
