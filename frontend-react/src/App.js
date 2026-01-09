import React, { useEffect, useRef, useCallback } from 'react';
import { useCar } from './context/CarContext';
import Map from './components/Map';
import SteeringWheel from './components/SteeringWheel';
import Pedals from './components/Pedals';
import GearShift from './components/GearShift';
import Dashboard from './components/Dashboard';
import EngineControl from './components/EngineControl';
import DestinationPanel from './components/DestinationPanel';
import './App.css';

function App() {
  const { state, dispatch, updatePhysics } = useCar();
  const lastTimeRef = useRef(Date.now());
  const keysPressed = useRef({});

  // Game loop with proper timing
  useEffect(() => {
    let animationId;

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Only update if reasonable delta (prevents huge jumps)
      if (deltaTime > 0 && deltaTime < 0.5) {
        updatePhysics(deltaTime);
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [updatePhysics]);

  // Keyboard controls
  const handleKeyDown = useCallback((e) => {
    // Prevent default for game controls
    if (['w', 's', ' ', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }

    // Prevent repeat events
    if (keysPressed.current[e.key]) return;
    keysPressed.current[e.key] = true;

    const key = e.key.toLowerCase();

    switch (key) {
      case 'w':
        dispatch({ type: 'SET_ACCELERATOR', payload: 100 });
        break;
      case 's':
      case ' ':
        dispatch({ type: 'SET_BRAKE', payload: 100 });
        break;
      case 'arrowleft':
        dispatch({ type: 'SET_STEERING', payload: Math.max(-540, state.steeringAngle - 25) });
        break;
      case 'arrowright':
        dispatch({ type: 'SET_STEERING', payload: Math.min(540, state.steeringAngle + 25) });
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        if (state.clutch > 70 || state.speed < 5) {
          dispatch({ type: 'SET_GEAR', payload: e.key });
        }
        break;
      case 'n':
        dispatch({ type: 'SET_GEAR', payload: 'N' });
        break;
      case 'r':
        if (state.clutch > 70 || state.speed < 5) {
          dispatch({ type: 'SET_GEAR', payload: 'R' });
        }
        break;
      case 'e':
        dispatch({ type: 'TOGGLE_ENGINE' });
        break;
      case 'c':
        dispatch({ type: 'SET_CLUTCH', payload: 100 });
        break;
      default:
        break;
    }
  }, [dispatch, state.steeringAngle, state.clutch, state.speed]);

  const handleKeyUp = useCallback((e) => {
    keysPressed.current[e.key] = false;
    const key = e.key.toLowerCase();

    switch (key) {
      case 'w':
        dispatch({ type: 'SET_ACCELERATOR', payload: 0 });
        break;
      case 's':
      case ' ':
        dispatch({ type: 'SET_BRAKE', payload: 0 });
        break;
      case 'c':
        dispatch({ type: 'SET_CLUTCH', payload: 0 });
        break;
      default:
        break;
    }
  }, [dispatch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚗 Car Simulator</h1>
        <div className="keyboard-hint">
          <kbd>E</kbd> Engine 
          <span className="separator">|</span>
          <kbd>W</kbd>/<kbd>S</kbd> Throttle/Brake 
          <span className="separator">|</span>
          <kbd>←</kbd>/<kbd>→</kbd> Steer
          <span className="separator">|</span>
          <kbd>C</kbd> Clutch
          <span className="separator">|</span>
          <kbd>1-5</kbd>/<kbd>R</kbd>/<kbd>N</kbd> Gears
        </div>
      </header>
      
      <main className="app-main">
        <section className="map-section">
          <Map />
          <DestinationPanel />
          <Dashboard />
        </section>
        
        <section className="controls-section">
          <EngineControl />
          <SteeringWheel />
          <GearShift />
          <Pedals />
        </section>
      </main>

      {/* Status indicator */}
      <div className={`engine-status-indicator ${state.engineOn ? 'on' : 'off'}`}>
        {state.engineOn ? '🟢 Engine Running' : '🔴 Engine Off'}
      </div>
    </div>
  );
}

export default App;
