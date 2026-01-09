import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCar } from '../context/CarContext';
import './DestinationPanel.css';

function DestinationPanel() {
  const { state, dispatch } = useCar();
  const [startAddress, setStartAddress] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [isLoadingStart, setIsLoadingStart] = useState(false);
  const [isLoadingDest, setIsLoadingDest] = useState(false);
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const startInputRef = useRef(null);
  const destInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setStartSuggestions([]);
        setDestSuggestions([]);
        setActiveInput(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = async (query, type) => {
    if (query.length < 3) {
      type === 'start' ? setStartSuggestions([]) : setDestSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();
      
      if (type === 'start') {
        setStartSuggestions(data);
      } else {
        setDestSuggestions(data);
      }
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const handleStartInputChange = (e) => {
    const value = e.target.value;
    setStartAddress(value);
    setActiveInput('start');
    searchAddress(value, 'start');
  };

  const handleDestInputChange = (e) => {
    const value = e.target.value;
    setDestAddress(value);
    setActiveInput('dest');
    searchAddress(value, 'dest');
  };

  const selectStartPosition = (suggestion) => {
    const pos = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    };
    setStartAddress(suggestion.display_name.split(',').slice(0, 3).join(', '));
    setStartSuggestions([]);
    setActiveInput(null);
    dispatch({ type: 'SET_START_POSITION', payload: pos });
  };

  const selectDestination = async (suggestion) => {
    const dest = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    };

    setDestAddress(suggestion.display_name.split(',').slice(0, 3).join(', '));
    setDestSuggestions([]);
    setActiveInput(null);
    dispatch({ type: 'SET_DESTINATION', payload: dest });

    // Calculate route
    setIsLoadingDest(true);
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${state.position.lng},${state.position.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`
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
    setIsLoadingDest(false);
  };

  const handleSetStartPosition = async () => {
    if (!startAddress.trim()) return;

    setIsLoadingStart(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startAddress)}&limit=1`
      );
      const data = await response.json();

      if (data.length > 0) {
        selectStartPosition(data[0]);
      } else {
        alert('Address not found. Please try a different address.');
      }
    } catch (error) {
      console.error('Error geocoding:', error);
    }
    setIsLoadingStart(false);
  };

  const handleSetDestination = async () => {
    if (!destAddress.trim()) return;

    setIsLoadingDest(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destAddress)}&limit=1`
      );
      const data = await response.json();

      if (data.length > 0) {
        selectDestination(data[0]);
      } else {
        alert('Address not found. Please try a different address.');
      }
    } catch (error) {
      console.error('Error geocoding:', error);
    }
    setIsLoadingDest(false);
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          dispatch({ type: 'SET_START_POSITION', payload: location });
          setStartAddress('Current Location');
        },
        (err) => {
          console.error('Geolocation error:', err);
          alert('Could not get current location. Please enter an address.');
        }
      );
    }
  };

  const clearRoute = () => {
    dispatch({ type: 'CLEAR_ROUTE' });
    setDestAddress('');
    setDestSuggestions([]);
  };

  return (
    <div className="destination-panel" ref={suggestionsRef}>
      {/* Start Position Section */}
      <div className="panel-section">
        <label className="section-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="label-icon start-icon">
            <circle cx="12" cy="12" r="3"/>
            <circle cx="12" cy="12" r="8" strokeDasharray="4 4"/>
          </svg>
          Start Position
        </label>
        <div className="input-row">
          <div className="search-input-wrapper">
            <input
              ref={startInputRef}
              type="text"
              value={startAddress}
              onChange={handleStartInputChange}
              onFocus={() => setActiveInput('start')}
              onKeyPress={(e) => e.key === 'Enter' && handleSetStartPosition()}
              placeholder="Enter start location..."
              className="search-input"
            />
            {startAddress && (
              <button className="clear-input" onClick={() => { setStartAddress(''); setStartSuggestions([]); }}>
                ×
              </button>
            )}
          </div>
          <motion.button
            className="action-btn set-btn"
            onClick={handleSetStartPosition}
            disabled={isLoadingStart}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoadingStart ? <span className="loading-spinner" /> : 'Set'}
          </motion.button>
          <motion.button
            className="action-btn gps-btn"
            onClick={useCurrentLocation}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title="Use current location"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
            </svg>
          </motion.button>
        </div>

        {/* Start Suggestions */}
        <AnimatePresence>
          {activeInput === 'start' && startSuggestions.length > 0 && (
            <motion.div
              className="suggestions-dropdown"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
            >
              {startSuggestions.map((suggestion, index) => (
                <motion.div
                  key={`start-${index}`}
                  className="suggestion-item"
                  onClick={() => selectStartPosition(suggestion)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ backgroundColor: 'rgba(0, 212, 255, 0.15)' }}
                >
                  <svg className="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="10" r="3"/>
                    <path d="M12 2a8 8 0 0 1 8 8c0 5.4-8 12-8 12s-8-6.6-8-12a8 8 0 0 1 8-8z"/>
                  </svg>
                  <div className="suggestion-text">
                    <span className="suggestion-main">{suggestion.display_name.split(',').slice(0, 2).join(', ')}</span>
                    <span className="suggestion-sub">{suggestion.display_name.split(',').slice(2, 4).join(', ')}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Destination Section */}
      <div className="panel-section">
        <label className="section-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="label-icon dest-icon">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Destination
        </label>
        <div className="input-row">
          <div className="search-input-wrapper">
            <input
              ref={destInputRef}
              type="text"
              value={destAddress}
              onChange={handleDestInputChange}
              onFocus={() => setActiveInput('dest')}
              onKeyPress={(e) => e.key === 'Enter' && handleSetDestination()}
              placeholder="Enter destination..."
              className="search-input"
            />
            {destAddress && (
              <button className="clear-input" onClick={() => { setDestAddress(''); setDestSuggestions([]); }}>
                ×
              </button>
            )}
          </div>
          <motion.button
            className="action-btn navigate-btn"
            onClick={handleSetDestination}
            disabled={isLoadingDest}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoadingDest ? <span className="loading-spinner" /> : 'Go'}
          </motion.button>
          {state.route && (
            <motion.button
              className="action-btn clear-btn"
              onClick={clearRoute}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              ×
            </motion.button>
          )}
        </div>

        {/* Destination Suggestions */}
        <AnimatePresence>
          {activeInput === 'dest' && destSuggestions.length > 0 && (
            <motion.div
              className="suggestions-dropdown"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
            >
              {destSuggestions.map((suggestion, index) => (
                <motion.div
                  key={`dest-${index}`}
                  className="suggestion-item"
                  onClick={() => selectDestination(suggestion)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ backgroundColor: 'rgba(231, 76, 60, 0.15)' }}
                >
                  <svg className="location-icon dest" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <div className="suggestion-text">
                    <span className="suggestion-main">{suggestion.display_name.split(',').slice(0, 2).join(', ')}</span>
                    <span className="suggestion-sub">{suggestion.display_name.split(',').slice(2, 4).join(', ')}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Route Info */}
      <AnimatePresence>
        {state.destination && (
          <motion.div
            className="route-info"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="route-detail">
              <span className="detail-icon">📍</span>
              <div>
                <span className="detail-label">Distance</span>
                <span className="detail-value">{state.distance ? `${state.distance.toFixed(2)} km` : 'Calculating...'}</span>
              </div>
            </div>
            <div className="route-detail">
              <span className="detail-icon">🚗</span>
              <div>
                <span className="detail-label">Current Speed</span>
                <span className="detail-value">{Math.round(state.speed)} km/h</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DestinationPanel;
