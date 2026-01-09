import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCar } from '../context/CarContext';
import './Pedals.css';

function Pedal({ type, value, onChange, color, label }) {
  const trackRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);

  const updateValue = useCallback((clientY) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const percentage = Math.max(0, Math.min(100, ((rect.height - y) / rect.height) * 100));
    onChange(percentage);
  }, [onChange]);

  const handleStart = useCallback((e) => {
    setIsPressed(true);
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    updateValue(clientY);
  }, [updateValue]);

  const handleMove = useCallback((e) => {
    if (!isPressed) return;
    e.preventDefault();
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    updateValue(clientY);
  }, [isPressed, updateValue]);

  const handleEnd = useCallback(() => {
    setIsPressed(false);
    onChange(0);
  }, [onChange]);

  useEffect(() => {
    if (isPressed) {
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
  }, [isPressed, handleMove, handleEnd]);

  return (
    <div className="pedal-wrapper">
      <div 
        ref={trackRef}
        className="pedal-track"
        onMouseDown={handleStart}
        onTouchStart={handleStart}
      >
        {/* Pedal fill effect */}
        <motion.div 
          className="pedal-fill"
          style={{ 
            height: `${value}%`,
            background: `linear-gradient(to top, ${color}80 0%, ${color}20 100%)`
          }}
        />
        
        {/* Track markings */}
        <div className="track-markings">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="track-mark" />
          ))}
        </div>
        
        {/* The pedal itself */}
        <motion.div 
          className={`pedal pedal-${type}`}
          style={{ 
            bottom: `${5 + (value / 100) * 120}px`,
            background: `linear-gradient(145deg, ${color}, ${color}aa)`
          }}
          animate={{ 
            scale: isPressed ? 0.95 : 1,
            boxShadow: isPressed 
              ? `0 0 20px ${color}80, inset 0 -5px 10px rgba(0,0,0,0.3)` 
              : `0 5px 15px rgba(0,0,0,0.3), inset 0 -2px 5px rgba(0,0,0,0.2)`
          }}
        >
          {/* Pedal texture */}
          <div className="pedal-texture">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="texture-line" />
            ))}
          </div>
          <span className="pedal-letter">{label[0]}</span>
        </motion.div>
      </div>
      
      <div className="pedal-info">
        <span className="pedal-label">{label}</span>
        <span className="pedal-value" style={{ color }}>{Math.round(value)}%</span>
      </div>
    </div>
  );
}

function Pedals() {
  const { state, dispatch } = useCar();

  return (
    <div className="control-card pedals-card">
      <h3>Pedals</h3>
      <div className="pedals-container">
        <Pedal
          type="clutch"
          value={state.clutch}
          onChange={(v) => dispatch({ type: 'SET_CLUTCH', payload: v })}
          color="#9b59b6"
          label="Clutch"
        />
        <Pedal
          type="brake"
          value={state.brake}
          onChange={(v) => dispatch({ type: 'SET_BRAKE', payload: v })}
          color="#e74c3c"
          label="Brake"
        />
        <Pedal
          type="accelerator"
          value={state.accelerator}
          onChange={(v) => dispatch({ type: 'SET_ACCELERATOR', payload: v })}
          color="#2ecc71"
          label="Accelerator"
        />
      </div>
    </div>
  );
}

export default Pedals;
