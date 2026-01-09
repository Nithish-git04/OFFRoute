import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useCar } from '../context/CarContext';
import './SteeringWheel.css';

function SteeringWheel() {
  const { state, dispatch } = useCar();
  const wheelRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const startAngleRef = useRef(0);

  const getAngle = useCallback((clientX, clientY) => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  }, []);

  const handleStart = useCallback((e) => {
    setIsDragging(true);
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    startAngleRef.current = getAngle(clientX, clientY) - state.steeringAngle;
  }, [getAngle, state.steeringAngle]);

  const handleMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    let angle = getAngle(clientX, clientY) - startAngleRef.current;
    angle = Math.max(-540, Math.min(540, angle));
    dispatch({ type: 'SET_STEERING', payload: angle });
  }, [isDragging, getAngle, dispatch]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  return (
    <div className="control-card steering-card">
      <h3>Steering Wheel</h3>
      <div className="steering-container">
        <motion.div
          ref={wheelRef}
          className="steering-wheel"
          style={{ rotate: state.steeringAngle }}
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Wheel outer ring */}
          <div className="wheel-ring">
            {/* Grip textures */}
            {[...Array(24)].map((_, i) => (
              <div 
                key={i} 
                className="grip-texture"
                style={{ transform: `rotate(${i * 15}deg)` }}
              />
            ))}
          </div>
          
          {/* Spokes */}
          <div className="spoke spoke-top" />
          <div className="spoke spoke-left" />
          <div className="spoke spoke-right" />
          
          {/* Center hub */}
          <div className="wheel-center">
            <div className="center-logo">
              <span>RS</span>
            </div>
          </div>
          
          {/* Center marker */}
          <div className="center-marker" />
        </motion.div>
        
        {/* Steering indicator */}
        <div className="steering-indicator">
          <div className="indicator-track">
            <motion.div 
              className="indicator-thumb"
              style={{ left: `${((state.steeringAngle + 540) / 1080) * 100}%` }}
            />
          </div>
          <div className="indicator-labels">
            <span>L</span>
            <span className="angle-display">{Math.round(state.steeringAngle)}°</span>
            <span>R</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SteeringWheel;
