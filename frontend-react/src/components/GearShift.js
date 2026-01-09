import React from 'react';
import { motion } from 'framer-motion';
import { useCar } from '../context/CarContext';
import './GearShift.css';

function GearShift() {
  const { state, dispatch } = useCar();

  const gears = [
    ['1', '2'],
    ['3', '4'],
    ['5', 'R'],
  ];

  const canShift = state.clutch > 70 || state.speed < 5;

  const handleGearChange = (gear) => {
    if (!canShift && state.gear !== 'N') {
      return;
    }
    dispatch({ type: 'SET_GEAR', payload: gear });
  };

  return (
    <div className="control-card gear-card">
      <h3>Gear Shift</h3>
      <div className="gear-container">
        {/* Gear gate pattern */}
        <div className="gear-gate">
          <svg viewBox="0 0 120 160" className="gate-pattern">
            {/* H-pattern lines */}
            <path 
              d="M 30 30 L 30 70 M 90 30 L 90 70 M 30 50 L 90 50
                 M 30 70 L 30 110 M 90 70 L 90 110 M 30 90 L 90 90
                 M 30 110 L 30 150 M 90 110 L 90 150 M 30 130 L 90 130
                 M 60 150 L 60 130" 
              stroke="#444" 
              strokeWidth="3" 
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          
          {/* Gear buttons */}
          <div className="gear-grid">
            {gears.map((row, rowIndex) => (
              <div key={rowIndex} className="gear-row">
                {row.map((gear) => (
                  <motion.button
                    key={gear}
                    className={`gear-btn ${state.gear === gear ? 'active' : ''} ${gear === 'R' ? 'reverse' : ''}`}
                    onClick={() => handleGearChange(gear)}
                    disabled={!canShift && state.gear !== 'N'}
                    whileHover={{ scale: canShift ? 1.1 : 1 }}
                    whileTap={{ scale: canShift ? 0.95 : 1 }}
                    animate={{
                      boxShadow: state.gear === gear 
                        ? gear === 'R' 
                          ? '0 0 25px rgba(231, 76, 60, 0.7), inset 0 0 15px rgba(231, 76, 60, 0.3)'
                          : '0 0 25px rgba(0, 212, 255, 0.7), inset 0 0 15px rgba(0, 212, 255, 0.3)'
                        : '0 5px 15px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {gear}
                  </motion.button>
                ))}
              </div>
            ))}
            
            {/* Neutral */}
            <div className="gear-row neutral-row">
              <motion.button
                className={`gear-btn neutral ${state.gear === 'N' ? 'active' : ''}`}
                onClick={() => handleGearChange('N')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: state.gear === 'N' 
                    ? '0 0 25px rgba(241, 196, 15, 0.7), inset 0 0 15px rgba(241, 196, 15, 0.3)'
                    : '0 5px 15px rgba(0, 0, 0, 0.3)'
                }}
              >
                N
              </motion.button>
            </div>
          </div>
        </div>
        
        {/* Gear knob visualization */}
        <div className="gear-knob-container">
          <motion.div 
            className="gear-knob"
            animate={{ 
              y: state.gear === 'N' ? 0 : -5,
              rotateX: state.gear === 'R' ? 10 : 0
            }}
          >
            <div className="knob-top">
              <span>{state.gear}</span>
            </div>
            <div className="knob-body" />
            <div className="knob-boot" />
          </motion.div>
        </div>
        
        {/* Clutch warning */}
        {!canShift && (
          <motion.div 
            className="clutch-warning"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            ⚠️ Press clutch to shift
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default GearShift;
