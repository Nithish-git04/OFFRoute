import React from 'react';
import { motion } from 'framer-motion';
import { useCar } from '../context/CarContext';
import './Dashboard.css';

function Dashboard() {
  const { state, physics } = useCar();

  const maxSpeed = 220;
  const speedPercentage = Math.min(100, (state.speed / maxSpeed) * 100);
  const rpmPercentage = Math.min(100, (state.rpm / physics.maxRpm) * 100);
  const isRevLimiter = state.rpm > physics.maxRpm * 0.9;

  // Calculate ETA if we have destination
  const eta = state.distance && state.speed > 0 
    ? (state.distance / state.speed * 60).toFixed(0) 
    : null;

  return (
    <div className="dashboard">
      {/* Speedometer */}
      <div className="gauge speedometer">
        <svg viewBox="0 0 200 120" className="gauge-svg">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Speed arc */}
          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#speedGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray="251.2"
            initial={{ strokeDashoffset: 251.2 }}
            animate={{ strokeDashoffset: 251.2 - (speedPercentage / 100) * 251.2 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2ecc71" />
              <stop offset="50%" stopColor="#f1c40f" />
              <stop offset="100%" stopColor="#e74c3c" />
            </linearGradient>
          </defs>
          {/* Speed marks */}
          {[0, 50, 100, 150, 200].map((speed, i) => {
            const angle = -180 + (i / 4) * 180;
            const rad = (angle * Math.PI) / 180;
            const x1 = 100 + 62 * Math.cos(rad);
            const y1 = 100 + 62 * Math.sin(rad);
            const x2 = 100 + 72 * Math.cos(rad);
            const y2 = 100 + 72 * Math.sin(rad);
            const tx = 100 + 50 * Math.cos(rad);
            const ty = 100 + 50 * Math.sin(rad);
            return (
              <g key={speed}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#555" strokeWidth="2" />
                <text x={tx} y={ty + 4} fill="#666" fontSize="11" textAnchor="middle" fontFamily="Orbitron">
                  {speed}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="gauge-value">
          <motion.span 
            className="value"
            animate={{ color: state.speed > 180 ? '#e74c3c' : '#fff' }}
          >
            {Math.round(state.speed)}
          </motion.span>
          <span className="unit">km/h</span>
        </div>
        <div className="gauge-label">SPEED</div>
      </div>

      {/* RPM Gauge */}
      <div className="gauge rpm-gauge">
        <svg viewBox="0 0 200 120" className="gauge-svg">
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Redline zone background */}
          <path
            d="M 155 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgba(231, 76, 60, 0.2)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#rpmGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray="251.2"
            initial={{ strokeDashoffset: 251.2 }}
            animate={{ strokeDashoffset: 251.2 - (rpmPercentage / 100) * 251.2 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="rpmGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3498db" />
              <stop offset="60%" stopColor="#9b59b6" />
              <stop offset="85%" stopColor="#e74c3c" />
              <stop offset="100%" stopColor="#ff0000" />
            </linearGradient>
          </defs>
          {/* RPM marks */}
          {[0, 2, 4, 6, 8].map((rpm, i) => {
            const angle = -180 + (i / 4) * 180;
            const rad = (angle * Math.PI) / 180;
            const x1 = 100 + 62 * Math.cos(rad);
            const y1 = 100 + 62 * Math.sin(rad);
            const x2 = 100 + 72 * Math.cos(rad);
            const y2 = 100 + 72 * Math.sin(rad);
            const tx = 100 + 50 * Math.cos(rad);
            const ty = 100 + 50 * Math.sin(rad);
            return (
              <g key={rpm}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={rpm >= 7 ? '#e74c3c' : '#555'} strokeWidth="2" />
                <text x={tx} y={ty + 4} fill={rpm >= 7 ? '#e74c3c' : '#666'} fontSize="11" textAnchor="middle" fontFamily="Orbitron">
                  {rpm}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="gauge-value">
          <motion.span 
            className="value"
            animate={{ 
              color: isRevLimiter ? '#e74c3c' : '#fff',
              scale: isRevLimiter ? [1, 1.05, 1] : 1
            }}
            transition={{ duration: 0.2 }}
          >
            {Math.round(state.rpm)}
          </motion.span>
          <span className="unit">RPM</span>
        </div>
        <div className="gauge-label">TACHOMETER</div>
      </div>

      {/* Info display */}
      <div className="info-display">
        <div className="info-row">
          <div className="info-item">
            <span className="info-label">Gear</span>
            <motion.span 
              className="info-value gear-display"
              animate={{ 
                color: state.gear === 'R' ? '#e74c3c' : state.gear === 'N' ? '#f1c40f' : 'var(--primary-color)',
                scale: [1, 1.1, 1]
              }}
              key={state.gear}
            >
              {state.gear}
            </motion.span>
          </div>
          <div className="info-item">
            <span className="info-label">Heading</span>
            <span className="info-value">{Math.round(state.heading)}°</span>
          </div>
          <div className="info-item">
            <span className="info-label">Engine</span>
            <span className={`info-value ${state.engineOn ? 'engine-on' : 'engine-off'}`}>
              {state.engineOn ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
        <div className="info-row">
          <div className="info-item wide">
            <span className="info-label">Position</span>
            <span className="info-value small">
              {state.position.lat.toFixed(5)}, {state.position.lng.toFixed(5)}
            </span>
          </div>
          {state.distance && (
            <div className="info-item">
              <span className="info-label">ETA</span>
              <span className="info-value">{eta ? `${eta} min` : '--'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
