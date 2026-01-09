import React from 'react';
import { motion } from 'framer-motion';
import { useCar } from '../context/CarContext';
import './EngineControl.css';

function EngineControl() {
  const { state, dispatch } = useCar();

  return (
    <div className="control-card engine-card">
      <h3>Engine Control</h3>
      <div className="engine-container">
        {/* Engine start/stop button */}
        <motion.button
          className={`engine-button ${state.engineOn ? 'on' : 'off'}`}
          onClick={() => dispatch({ type: 'TOGGLE_ENGINE' })}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: state.engineOn
              ? [
                  '0 0 20px rgba(231, 76, 60, 0.5)',
                  '0 0 40px rgba(231, 76, 60, 0.8)',
                  '0 0 20px rgba(231, 76, 60, 0.5)',
                ]
              : '0 0 20px rgba(46, 204, 113, 0.3)',
          }}
          transition={{
            boxShadow: {
              duration: 1,
              repeat: state.engineOn ? Infinity : 0,
            },
          }}
        >
          <div className="button-ring">
            <div className="button-inner">
              <svg viewBox="0 0 24 24" className="power-icon">
                <path
                  d="M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </motion.button>

        {/* Engine status */}
        <div className="engine-status">
          <motion.div
            className={`status-indicator ${state.engineOn ? 'on' : 'off'}`}
            animate={{
              scale: state.engineOn ? [1, 1.2, 1] : 1,
              opacity: state.engineOn ? 1 : 0.5,
            }}
            transition={{
              scale: {
                duration: 0.5,
                repeat: state.engineOn ? Infinity : 0,
              },
            }}
          />
          <span className="status-text">
            {state.engineOn ? 'Engine Running' : 'Engine Off'}
          </span>
        </div>

        {/* Additional indicators */}
        <div className="indicators">
          <div className={`indicator ${state.engineOn ? 'active' : ''}`}>
            <div className="indicator-light oil" />
            <span>OIL</span>
          </div>
          <div className={`indicator ${state.engineOn ? 'active' : ''}`}>
            <div className="indicator-light battery" />
            <span>BATT</span>
          </div>
          <div className={`indicator ${state.brake > 0 ? 'warning' : ''}`}>
            <div className="indicator-light brake" />
            <span>BRAKE</span>
          </div>
          <div className={`indicator ${state.engineOn && state.rpm > 7000 ? 'warning' : ''}`}>
            <div className="indicator-light temp" />
            <span>TEMP</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EngineControl;
