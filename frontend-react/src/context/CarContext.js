import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';

const CarContext = createContext();

const initialState = {
  position: { lat: 12.9716, lng: 77.5946 }, // Default: Bangalore
  heading: 0, // degrees (0 = North)
  speed: 0, // km/h
  rpm: 0,
  gear: 'N',
  engineOn: false,
  steeringAngle: 0, // -540 to 540 degrees
  clutch: 0, // 0-100%
  brake: 0, // 0-100%
  accelerator: 0, // 0-100%
  destination: null,
  route: null,
  distance: null,
  startPosition: null, // For setting custom start
};

const physics = {
  maxSpeed: { 'N': 0, 'R': 30, '1': 50, '2': 80, '3': 120, '4': 160, '5': 200 },
  acceleration: 12, // Increased for more responsive acceleration
  brakeForce: 25,
  engineBrake: 4,
  turnRate: 60,
  maxRpm: 8000,
  idleRpm: 800,
};

function carReducer(state, action) {
  switch (action.type) {
    case 'SET_STEERING':
      return { ...state, steeringAngle: action.payload };
    case 'SET_ACCELERATOR':
      return { ...state, accelerator: action.payload };
    case 'SET_BRAKE':
      return { ...state, brake: action.payload };
    case 'SET_CLUTCH':
      return { ...state, clutch: action.payload };
    case 'SET_GEAR':
      return { ...state, gear: action.payload };
    case 'TOGGLE_ENGINE':
      const newEngineState = !state.engineOn;
      return { 
        ...state, 
        engineOn: newEngineState, 
        rpm: newEngineState ? physics.idleRpm : 0,
        speed: newEngineState ? state.speed : 0
      };
    case 'UPDATE_PHYSICS':
      return { ...state, ...action.payload };
    case 'SET_DESTINATION':
      return { ...state, destination: action.payload };
    case 'SET_ROUTE':
      return { ...state, route: action.payload.route, distance: action.payload.distance };
    case 'CLEAR_ROUTE':
      return { ...state, destination: null, route: null, distance: null };
    case 'SET_POSITION':
      return { ...state, position: action.payload };
    case 'SET_START_POSITION':
      return { 
        ...state, 
        position: action.payload, 
        startPosition: action.payload,
        heading: 0,
        speed: 0,
        destination: null,
        route: null,
        distance: null
      };
    case 'RESET_CAR':
      return {
        ...state,
        heading: 0,
        speed: 0,
        rpm: state.engineOn ? physics.idleRpm : 0,
        gear: 'N',
        steeringAngle: 0,
        clutch: 0,
        brake: 0,
        accelerator: 0,
      };
    default:
      return state;
  }
}

export function CarProvider({ children }) {
  const [state, dispatch] = useReducer(carReducer, initialState);
  // eslint-disable-next-line no-unused-vars
  const lastUpdateRef = useRef(Date.now());

  const updatePhysics = useCallback((deltaTime) => {
    // Clamp deltaTime to prevent huge jumps
    const dt = Math.min(deltaTime, 0.1);
    
    let newSpeed = state.speed;
    let newRpm = state.rpm;
    let newHeading = state.heading;
    let newPosition = { ...state.position };

    // Engine must be on to move
    if (!state.engineOn) {
      // Coast to a stop when engine is off
      if (state.speed > 0) {
        newSpeed = Math.max(0, state.speed - physics.engineBrake * dt);
      }
      dispatch({ 
        type: 'UPDATE_PHYSICS', 
        payload: { speed: newSpeed, rpm: 0 } 
      });
      return;
    }

    const gearKey = state.gear;
    const maxSpeedForGear = physics.maxSpeed[gearKey] || 0;
    const speedRatio = maxSpeedForGear > 0 ? Math.min(1, state.speed / maxSpeedForGear) : 0;

    // Calculate throttle and brake inputs
    const throttle = state.accelerator / 100;
    const brake = state.brake / 100;
    const clutchEngaged = state.clutch < 50; // Clutch is engaged when pedal is NOT pressed

    // Handle gear-based movement
    if (gearKey !== 'N' && clutchEngaged) {
      // Acceleration
      if (throttle > 0) {
        // More acceleration at lower speeds, less at higher speeds
        const accelerationFactor = 1 - (speedRatio * 0.7);
        const accel = physics.acceleration * throttle * accelerationFactor;
        
        if (gearKey === 'R') {
          // Reverse gear
          newSpeed = Math.min(physics.maxSpeed['R'], Math.max(0, state.speed + accel * dt));
        } else {
          // Forward gears
          if (state.speed < maxSpeedForGear) {
            newSpeed = Math.min(maxSpeedForGear, state.speed + accel * dt);
          }
        }
      }

      // Engine braking when no throttle
      if (throttle === 0 && brake === 0 && state.speed > 0) {
        newSpeed = Math.max(0, state.speed - physics.engineBrake * dt);
      }
    } else if (gearKey === 'N' || !clutchEngaged) {
      // In neutral or clutch pressed - slow coast
      if (state.speed > 0) {
        newSpeed = Math.max(0, state.speed - physics.engineBrake * 0.5 * dt);
      }
    }

    // Braking (works regardless of gear)
    if (brake > 0 && state.speed > 0) {
      const brakeDecel = physics.brakeForce * brake;
      newSpeed = Math.max(0, newSpeed - brakeDecel * dt);
    }

    // Calculate RPM
    if (!clutchEngaged) {
      // Clutch pressed - RPM responds to throttle directly
      newRpm = physics.idleRpm + throttle * (physics.maxRpm - physics.idleRpm) * 0.8;
    } else if (gearKey === 'N') {
      // Neutral - RPM responds to throttle
      newRpm = physics.idleRpm + throttle * 4000;
    } else {
      // In gear with clutch engaged - RPM based on speed and throttle
      const baseRpm = physics.idleRpm + speedRatio * (physics.maxRpm - physics.idleRpm - 1000);
      const throttleBoost = throttle * 1500;
      newRpm = Math.min(physics.maxRpm, baseRpm + throttleBoost);
    }

    // Update position if moving
    if (newSpeed > 0.5) {
      // Calculate turn rate based on steering and speed
      const steeringFactor = state.steeringAngle / 540; // -1 to 1
      // Turn rate decreases at higher speeds (more realistic)
      const speedFactor = Math.max(0.3, 1 - (newSpeed / 150));
      const turnRate = physics.turnRate * steeringFactor * speedFactor;

      // Update heading
      if (gearKey === 'R') {
        // Reverse steering direction in reverse
        newHeading = state.heading - turnRate * dt;
      } else {
        newHeading = state.heading + turnRate * dt;
      }
      
      // Normalize heading to 0-360
      newHeading = ((newHeading % 360) + 360) % 360;

      // Calculate movement
      const headingRad = (newHeading - 90) * (Math.PI / 180);
      const speedMs = (newSpeed * 1000) / 3600; // km/h to m/s
      const distanceM = speedMs * dt;

      // Convert to lat/lng
      const metersPerDegreeLat = 111320;
      const metersPerDegreeLng = 111320 * Math.cos(state.position.lat * Math.PI / 180);

      let latDelta = (distanceM * Math.cos(headingRad)) / metersPerDegreeLat;
      let lngDelta = (distanceM * Math.sin(headingRad)) / metersPerDegreeLng;

      // Reverse direction in reverse gear
      if (gearKey === 'R') {
        latDelta = -latDelta;
        lngDelta = -lngDelta;
      }

      newPosition = {
        lat: state.position.lat + latDelta,
        lng: state.position.lng + lngDelta,
      };
    }

    dispatch({
      type: 'UPDATE_PHYSICS',
      payload: {
        speed: newSpeed,
        rpm: Math.round(newRpm),
        heading: newHeading,
        position: newPosition,
      },
    });
  }, [state]);

  return (
    <CarContext.Provider value={{ state, dispatch, updatePhysics, physics }}>
      {children}
    </CarContext.Provider>
  );
}

export function useCar() {
  const context = useContext(CarContext);
  if (!context) {
    throw new Error('useCar must be used within a CarProvider');
  }
  return context;
}
