# 🚗 Car Simulator - React

A fully interactive car simulator built with React, featuring realistic steering wheel, pedals, gear shifter, and navigation using OpenStreetMap.

## ✨ Features

### 🎮 Interactive Controls
- **Steering Wheel**: Drag to rotate (supports mouse and touch), up to ±540° rotation
- **Pedals**: Interactive clutch, brake, and accelerator with visual feedback
- **Gear Shifter**: 5-speed + Reverse with H-pattern and clutch requirement
- **Engine Control**: Start/stop button with indicator lights

### 🗺️ Navigation
- **Start Position**: Set your starting location by searching or using GPS
- **Destination**: Search for destinations or click on the map
- **Route Planning**: Automatic route calculation with OSRM
- **Real-time Map**: Leaflet with OpenStreetMap tiles

### 📊 Dashboard
- **Speedometer**: Animated gauge (0-220 km/h)
- **Tachometer**: RPM gauge with redline indicator
- **Position Display**: Real-time GPS coordinates
- **Trip Info**: Distance, ETA, heading

### ⚙️ Physics Engine
- Realistic acceleration per gear
- Engine braking simulation
- Speed-dependent steering sensitivity
- RPM calculation based on gear and speed

## 🎹 Keyboard Controls

| Key | Action |
|-----|--------|
| `E` | Start/Stop Engine |
| `W` | Accelerator |
| `S` / `Space` | Brake |
| `C` | Clutch (hold) |
| `←` / `→` | Steer left/right |
| `1-5` | Select forward gear |
| `N` | Neutral |
| `R` | Reverse |

## 🚀 Quick Start

```bash
# Navigate to the React frontend
cd car-simulator/frontend-react

# Install dependencies (if not already done)
npm install

# Start the development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎮 How to Drive

1. **Set Start Position** (optional):
   - Enter an address in "Start Position" field, OR
   - Click the GPS button to use current location

2. **Start the Engine**: 
   - Press `E` or click the power button

3. **Shift into First Gear**:
   - Press `C` (hold clutch) + `1` (first gear)
   - Or click the clutch pedal and then click gear 1

4. **Accelerate**:
   - Release clutch (`C` key)
   - Press and hold `W` for throttle

5. **Steer**:
   - Use `←` / `→` arrow keys
   - Or drag the steering wheel with mouse

6. **Shift Up**:
   - As speed increases, press `C` + higher gear number

7. **Brake**:
   - Press `S` or `Space`

8. **Set Destination** (optional):
   - Enter address in "Destination" field
   - Or click anywhere on the map
   - Follow the blue route line!

## 📁 Project Structure

```
car-simulator/
├── frontend-react/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SteeringWheel.js   # Interactive steering
│   │   │   ├── Pedals.js          # Clutch/Brake/Accelerator
│   │   │   ├── GearShift.js       # Gear selector
│   │   │   ├── Dashboard.js       # Speed/RPM gauges
│   │   │   ├── EngineControl.js   # Engine start/stop
│   │   │   ├── Map.js             # Leaflet map
│   │   │   └── DestinationPanel.js # Navigation
│   │   ├── context/
│   │   │   └── CarContext.js      # State & physics
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── backend/                       # Python Flask (optional)
└── README.md
```

## 🛠️ Technologies

- **React 18** - UI framework
- **Framer Motion** - Animations
- **Leaflet + React-Leaflet** - Maps
- **OpenStreetMap** - Map tiles
- **OSRM** - Routing
- **Nominatim** - Geocoding

## 📜 License

MIT License
