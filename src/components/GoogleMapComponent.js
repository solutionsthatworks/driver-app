import React, { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  InfoWindow,
} from "@react-google-maps/api";
import useGoogleMaps from "../hooks/useGoogleMaps";

const mapContainerStyle = {
  width: "100%",
  height: "600px",
};

const GoogleMapComponent = ({ route }) => {
  const [directions, setDirections] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [activeMarker, setActiveMarker] = useState(null);
  const mapRef = useRef(null);

  const isLoaded = useGoogleMaps(process.env.REACT_APP_GOOGLE_MAPS_API_KEY);

  useEffect(() => {
    if (
      isLoaded &&
      route &&
      route.sequence &&
      route.sequence.length > 0 &&
      window.google
    ) {
      prepareRoute(route.sequence);
    }
  }, [isLoaded, route]);

  // Prepare Route and Markers
  const prepareRoute = (sequence) => {
    loadDirections(sequence);
    setMarkers(sequence);
  };

  // Load Route Directions
  const loadDirections = (sequence) => {
    if (sequence.length < 2) {
      console.error("Invalid route data.");
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();

    const origin = sequence[0];
    const destination = sequence[sequence.length - 1];

    if (
      isNaN(origin.latitude) ||
      isNaN(origin.longitude) ||
      isNaN(destination.latitude) ||
      isNaN(destination.longitude)
    ) {
      console.error("Invalid coordinates for route.");
      return;
    }

    const waypoints = sequence
      .slice(1, -1)
      .filter((point) => point.latitude && point.longitude)
      .map((point) => ({
        location: new window.google.maps.LatLng(point.latitude, point.longitude),
        stopover: true,
      }));

    directionsService.route(
      {
        origin: new window.google.maps.LatLng(origin.latitude, origin.longitude),
        destination: new window.google.maps.LatLng(
          destination.latitude,
          destination.longitude
        ),
        waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);
        } else {
          console.error("Directions request failed:", status);
        }
      }
    );
  };

  // Get Icon for Markers Based on Type (From Public Folder)
  const getIcon = (type) => {
    switch (type) {
      case "Driver":
        return `${process.env.PUBLIC_URL}/driver-marker.gif`;
      case "Shop":
        return `${process.env.PUBLIC_URL}/final-shop.png`;
      case "Order Placed":
        return `${process.env.PUBLIC_URL}/pick-up.gif`;
      case "Ready for Delivery":
        return `${process.env.PUBLIC_URL}/delivery.gif`;
      default:
        return `${process.env.PUBLIC_URL}/default-marker.png`;
    }
  };

  const handleMarkerClick = (index) => {
    setActiveMarker(index);
  };

  const customPolylineOptions = {
    strokeColor: "#FFA500",
    strokeOpacity: 0.9,
    strokeWeight: 6,
  };

  if (!isLoaded) {
    return <div>Loading map...</div>;
  }

  const center = route?.sequence?.[0]
    ? {
        lat: parseFloat(route.sequence[0].latitude) || 0,
        lng: parseFloat(route.sequence[0].longitude) || 0,
      }
    : { lat: 0, lng: 0 };

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={12}
      center={center}
      onLoad={(map) => {
        mapRef.current = map;
      }}
    >
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            polylineOptions: customPolylineOptions,
            suppressMarkers: true,
          }}
        />
      )}

      {markers.map((point, index) => {
        const icon = getIcon(point.type);

        return (
          <Marker
            key={index}
            position={{
              lat: parseFloat(point.latitude),
              lng: parseFloat(point.longitude),
            }}
            icon={{
              url: icon,
              scaledSize: new window.google.maps.Size(50, 50),
            }}
            onClick={() => handleMarkerClick(index)}  // Click to show InfoWindow
          >
            {activeMarker === index && (
              <InfoWindow
                position={{
                  lat: parseFloat(point.latitude),
                  lng: parseFloat(point.longitude),
                }}
                onCloseClick={() => setActiveMarker(null)}
              >
                <div>
                  <strong>{point.address || "No Address Available"}</strong>
                  <br />
                  {point.type}
                </div>
              </InfoWindow>
            )}
          </Marker>
        );
      })}
    </GoogleMap>
  );
};

export default GoogleMapComponent;
