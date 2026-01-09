import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useCar } from '../context/CarContext';
import 'leaflet/dist/leaflet.css';
import './Map.css';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Destination icon
const destinationIcon = L.divIcon({
  className: 'destination-marker-icon',
  html: `
    <div class="destination-icon">
      <svg viewBox="0 0 40 50" width="40" height="50">
        <defs>
          <linearGradient id="destGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#e74c3c;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#c0392b;stop-opacity:1" />
          </linearGradient>
        </defs>
        <path d="M20 0 C31 0 40 9 40 20 C40 35 20 50 20 50 C20 50 0 35 0 20 C0 9 9 0 20 0 Z" 
              fill="url(#destGradient)" stroke="#fff" stroke-width="2"/>
        <circle cx="20" cy="18" r="8" fill="#fff"/>
      </svg>
    </div>
  `,
  iconSize: [40, 50],
  iconAnchor: [20, 50],
});

// Car marker component with proper rotation
function CarMarker({ position, heading }) {
  const carIcon = useMemo(() => {
    return L.divIcon({
      className: 'car-marker-icon',
      html: `
        <div class="car-icon-wrapper" style="transform: rotate(${heading}deg)">
          <svg viewBox="0 0 40 40" width="40" height="40">
            <defs>
              <linearGradient id="carGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#0099cc;stop-opacity:1" />
              </linearGradient>
            </defs>
            <g>
              <path d="M20 5 L30 15 L30 30 L25 35 L15 35 L10 30 L10 15 Z" 
                    fill="url(#carGrad)" stroke="#fff" stroke-width="2"/>
              <path d="M15 13 L25 13 L27 18 L13 18 Z" fill="rgba(255,255,255,0.4)"/>
              <circle cx="14" cy="10" r="2" fill="#ffeb3b"/>
              <circle cx="26" cy="10" r="2" fill="#ffeb3b"/>
              <path d="M20 2 L24 9 L16 9 Z" fill="#ff6b35"/>
            </g>
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }, [heading]);

  return <Marker position={position} icon={carIcon} />;
}

// Map click handler component
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Map updater component - follows car when moving
function MapUpdater({ position, speed, shouldFollow }) {
  const map = useMap();

  useEffect(() => {
    if (shouldFollow && speed > 1) {
      map.setView([position.lat, position.lng], map.getZoom(), {
        animate: true,
        duration: 0.3,
      });
    }
  }, [position.lat, position.lng, speed, shouldFollow, map]);

  return null;
}

// Initial position setter
function SetViewOnChange({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map, zoom]);
  
  return null;
}

function Map() {
  const { state, dispatch } = useCar();

  const handleMapClick = async (latlng) => {
    const { lat, lng } = latlng;
    dispatch({ type: 'SET_DESTINATION', payload: { lat, lng } });

    // Calculate route using OSRM
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${state.position.lng},${state.position.lat};${lng},${lat}?overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        const distance = route.distance / 1000;
        dispatch({ type: 'SET_ROUTE', payload: { route: coordinates, distance } });
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  return (
    <div className="map-wrapper">
      <MapContainer
        center={[state.position.lat, state.position.lng]}
        zoom={17}
        className="map-container"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        {/* Car marker */}
        <CarMarker 
          position={[state.position.lat, state.position.lng]} 
          heading={state.heading}
        />

        {/* Route line */}
        {state.route && state.route.length > 0 && (
          <Polyline
            positions={state.route}
            pathOptions={{
              color: '#00d4ff',
              weight: 6,
              opacity: 0.8,
            }}
          />
        )}

        {/* Destination marker */}
        {state.destination && (
          <Marker
            position={[state.destination.lat, state.destination.lng]}
            icon={destinationIcon}
          />
        )}

        <MapClickHandler onMapClick={handleMapClick} />
        <MapUpdater 
          position={state.position} 
          speed={state.speed} 
          shouldFollow={state.speed > 1}
        />
      </MapContainer>

      {/* Compass overlay */}
      <div className="map-overlay">
        <div className="compass">
          <div className="compass-ring">
            <div className="compass-arrow" style={{ transform: `rotate(${-state.heading}deg)` }}>
              <div className="arrow-north"></div>
              <div className="arrow-south"></div>
            </div>
            <span className="compass-n">N</span>
            <span className="compass-s">S</span>
            <span className="compass-e">E</span>
            <span className="compass-w">W</span>
          </div>
        </div>
      </div>

      {/* Speed overlay */}
      <div className="speed-overlay">
        <span className="speed-value">{Math.round(state.speed)}</span>
        <span className="speed-unit">km/h</span>
      </div>
    </div>
  );
}

export default Map;
