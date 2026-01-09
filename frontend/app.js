// Car Simulator Application
class CarSimulator {
    constructor() {
        // Car state
        this.state = {
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
            route: null
        };

        // Physics constants
        this.physics = {
            maxSpeed: [0, 40, 80, 120, 160, 200], // km/h per gear
            acceleration: 5, // km/h per second at full throttle
            brakeForce: 15, // km/h per second at full brake
            engineBrake: 2, // km/h per second natural deceleration
            turnRate: 45, // degrees per second at max steering
            maxRpm: 8000,
            idleRpm: 800
        };

        // Backend URL
        this.backendUrl = 'http://localhost:5000';

        // Initialize components
        this.initMap();
        this.initSteering();
        this.initPedals();
        this.initGearbox();
        this.initEngine();
        this.initDestination();

        // Start game loop
        this.lastUpdate = Date.now();
        this.gameLoop();
    }

    // Initialize Leaflet Map
    initMap() {
        this.map = L.map('map').setView([this.state.position.lat, this.state.position.lng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Create car icon
        const carIcon = L.divIcon({
            className: 'car-marker',
            html: `<div style="
                width: 30px;
                height: 30px;
                background: #00d4ff;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid #fff;
                box-shadow: 0 0 10px rgba(0,212,255,0.5);
            "><div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(45deg);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 10px solid #fff;
            "></div></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        this.carMarker = L.marker([this.state.position.lat, this.state.position.lng], {
            icon: carIcon,
            rotationAngle: 0
        }).addTo(this.map);

        this.routeLine = null;
        this.destinationMarker = null;

        // Try to get user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.state.position = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    };
                    this.updateMapPosition();
                },
                () => console.log('Could not get location, using default')
            );
        }
    }

    // Initialize Steering Wheel
    initSteering() {
        const wheel = document.getElementById('steering-wheel');
        let isDragging = false;
        let startAngle = 0;
        let currentRotation = 0;

        const getAngle = (e, rect) => {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const x = (e.clientX || e.touches[0].clientX) - centerX;
            const y = (e.clientY || e.touches[0].clientY) - centerY;
            return Math.atan2(y, x) * (180 / Math.PI);
        };

        const startDrag = (e) => {
            isDragging = true;
            const rect = wheel.getBoundingClientRect();
            startAngle = getAngle(e, rect) - currentRotation;
            wheel.style.cursor = 'grabbing';
        };

        const drag = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const rect = wheel.getBoundingClientRect();
            let angle = getAngle(e, rect) - startAngle;
            
            // Limit steering angle
            angle = Math.max(-540, Math.min(540, angle));
            currentRotation = angle;
            
            wheel.style.transform = `rotate(${angle}deg)`;
            this.state.steeringAngle = angle;
            document.getElementById('steering-angle').textContent = Math.round(angle);
        };

        const endDrag = () => {
            isDragging = false;
            wheel.style.cursor = 'grab';
        };

        // Mouse events
        wheel.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);

        // Touch events
        wheel.addEventListener('touchstart', startDrag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', endDrag);

        // Keyboard controls for steering
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                currentRotation = Math.max(-540, currentRotation - 15);
                wheel.style.transform = `rotate(${currentRotation}deg)`;
                this.state.steeringAngle = currentRotation;
                document.getElementById('steering-angle').textContent = Math.round(currentRotation);
            } else if (e.key === 'ArrowRight') {
                currentRotation = Math.min(540, currentRotation + 15);
                wheel.style.transform = `rotate(${currentRotation}deg)`;
                this.state.steeringAngle = currentRotation;
                document.getElementById('steering-angle').textContent = Math.round(currentRotation);
            }
        });
    }

    // Initialize Pedals
    initPedals() {
        const setupPedal = (pedalId, fillId, valueId, stateKey) => {
            const pedal = document.getElementById(pedalId);
            const fill = document.getElementById(fillId);
            const valueDisplay = document.getElementById(valueId);
            const track = pedal.parentElement;
            
            let isPressed = false;

            const updatePedal = (e) => {
                if (!isPressed) return;
                e.preventDefault();
                
                const rect = track.getBoundingClientRect();
                const y = (e.clientY || e.touches[0].clientY) - rect.top;
                const percentage = Math.max(0, Math.min(100, ((rect.height - y) / rect.height) * 100));
                
                this.state[stateKey] = percentage;
                fill.style.height = percentage + '%';
                pedal.style.bottom = (5 + (percentage / 100) * 100) + 'px';
                valueDisplay.textContent = Math.round(percentage) + '%';
            };

            const startPress = (e) => {
                isPressed = true;
                updatePedal(e);
            };

            const endPress = () => {
                isPressed = false;
                // Pedals return to 0 when released (except for gradual release)
                this.state[stateKey] = 0;
                fill.style.height = '0%';
                pedal.style.bottom = '5px';
                valueDisplay.textContent = '0%';
            };

            // Mouse events
            pedal.addEventListener('mousedown', startPress);
            track.addEventListener('mousedown', startPress);
            document.addEventListener('mousemove', updatePedal);
            document.addEventListener('mouseup', endPress);

            // Touch events
            pedal.addEventListener('touchstart', startPress);
            track.addEventListener('touchstart', startPress);
            document.addEventListener('touchmove', updatePedal, { passive: false });
            document.addEventListener('touchend', endPress);
        };

        setupPedal('clutch-pedal', 'clutch-fill', 'clutch-value', 'clutch');
        setupPedal('brake-pedal', 'brake-fill', 'brake-value', 'brake');
        setupPedal('accelerator-pedal', 'accelerator-fill', 'accelerator-value', 'accelerator');

        // Keyboard controls for pedals
        const keyState = { w: false, s: false, space: false };
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'w' || e.key === 'W') {
                keyState.w = true;
                this.state.accelerator = 100;
                document.getElementById('accelerator-fill').style.height = '100%';
                document.getElementById('accelerator-pedal').style.bottom = '105px';
                document.getElementById('accelerator-value').textContent = '100%';
            }
            if (e.key === 's' || e.key === 'S' || e.key === ' ') {
                keyState.s = true;
                this.state.brake = 100;
                document.getElementById('brake-fill').style.height = '100%';
                document.getElementById('brake-pedal').style.bottom = '105px';
                document.getElementById('brake-value').textContent = '100%';
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'w' || e.key === 'W') {
                keyState.w = false;
                this.state.accelerator = 0;
                document.getElementById('accelerator-fill').style.height = '0%';
                document.getElementById('accelerator-pedal').style.bottom = '5px';
                document.getElementById('accelerator-value').textContent = '0%';
            }
            if (e.key === 's' || e.key === 'S' || e.key === ' ') {
                keyState.s = false;
                this.state.brake = 0;
                document.getElementById('brake-fill').style.height = '0%';
                document.getElementById('brake-pedal').style.bottom = '5px';
                document.getElementById('brake-value').textContent = '0%';
            }
        });
    }

    // Initialize Gearbox
    initGearbox() {
        const gearBtns = document.querySelectorAll('.gear-btn');
        
        gearBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Need clutch to change gear
                if (this.state.clutch < 70 && this.state.speed > 5) {
                    console.log('Press clutch to change gear!');
                    return;
                }

                gearBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.gear = btn.dataset.gear;
                document.getElementById('gear-display').textContent = this.state.gear;
            });
        });

        // Keyboard gear controls
        document.addEventListener('keydown', (e) => {
            const gearKeys = ['1', '2', '3', '4', '5', 'r', 'n'];
            if (gearKeys.includes(e.key.toLowerCase())) {
                if (this.state.clutch < 70 && this.state.speed > 5) return;
                
                const gear = e.key.toUpperCase();
                gearBtns.forEach(b => {
                    b.classList.remove('active');
                    if (b.dataset.gear === gear) b.classList.add('active');
                });
                this.state.gear = gear;
                document.getElementById('gear-display').textContent = gear;
            }
        });
    }

    // Initialize Engine
    initEngine() {
        const engineBtn = document.getElementById('engine-btn');
        const engineStatus = document.getElementById('engine-status');

        engineBtn.addEventListener('click', () => {
            this.state.engineOn = !this.state.engineOn;
            
            if (this.state.engineOn) {
                engineBtn.textContent = 'Stop Engine';
                engineBtn.classList.remove('engine-off');
                engineBtn.classList.add('engine-on');
                engineStatus.textContent = 'Engine Running';
                engineStatus.style.color = '#2ecc71';
            } else {
                engineBtn.textContent = 'Start Engine';
                engineBtn.classList.remove('engine-on');
                engineBtn.classList.add('engine-off');
                engineStatus.textContent = 'Engine Off';
                engineStatus.style.color = '#e74c3c';
                this.state.rpm = 0;
            }
        });
    }

    // Initialize Destination
    initDestination() {
        const destinationInput = document.getElementById('destination-input');
        const setDestBtn = document.getElementById('set-destination-btn');
        const clearRouteBtn = document.getElementById('clear-route-btn');

        setDestBtn.addEventListener('click', async () => {
            const address = destinationInput.value.trim();
            if (!address) return;

            try {
                // Geocode address using Nominatim (OpenStreetMap)
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
                );
                const data = await response.json();

                if (data.length > 0) {
                    const dest = {
                        lat: parseFloat(data[0].lat),
                        lng: parseFloat(data[0].lon)
                    };
                    this.state.destination = dest;
                    this.setDestinationMarker(dest);
                    this.calculateRoute();
                } else {
                    alert('Address not found. Please try a different address.');
                }
            } catch (error) {
                console.error('Error geocoding:', error);
                alert('Error finding address. Please try again.');
            }
        });

        clearRouteBtn.addEventListener('click', () => {
            this.clearRoute();
        });

        // Allow clicking on map to set destination
        this.map.on('click', (e) => {
            this.state.destination = { lat: e.latlng.lat, lng: e.latlng.lng };
            this.setDestinationMarker(this.state.destination);
            this.calculateRoute();
        });
    }

    setDestinationMarker(dest) {
        if (this.destinationMarker) {
            this.map.removeLayer(this.destinationMarker);
        }

        const destIcon = L.divIcon({
            className: 'destination-marker',
            html: `<div style="
                width: 30px;
                height: 30px;
                background: #e74c3c;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid #fff;
                box-shadow: 0 0 10px rgba(231,76,60,0.5);
            "></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        this.destinationMarker = L.marker([dest.lat, dest.lng], { icon: destIcon }).addTo(this.map);
    }

    async calculateRoute() {
        if (!this.state.destination) return;

        try {
            // Use OSRM for routing
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${this.state.position.lng},${this.state.position.lat};${this.state.destination.lng},${this.state.destination.lat}?overview=full&geometries=geojson`
            );
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                this.state.route = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                if (this.routeLine) {
                    this.map.removeLayer(this.routeLine);
                }

                this.routeLine = L.polyline(this.state.route, {
                    color: '#00d4ff',
                    weight: 5,
                    opacity: 0.8
                }).addTo(this.map);

                // Fit map to show entire route
                const bounds = L.latLngBounds([
                    [this.state.position.lat, this.state.position.lng],
                    [this.state.destination.lat, this.state.destination.lng]
                ]);
                this.map.fitBounds(bounds, { padding: [50, 50] });

                // Update distance display
                const distance = route.distance / 1000; // Convert to km
                document.getElementById('distance-display').textContent = distance.toFixed(2) + ' km';
            }
        } catch (error) {
            console.error('Error calculating route:', error);
        }
    }

    clearRoute() {
        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
            this.routeLine = null;
        }
        if (this.destinationMarker) {
            this.map.removeLayer(this.destinationMarker);
            this.destinationMarker = null;
        }
        this.state.destination = null;
        this.state.route = null;
        document.getElementById('distance-display').textContent = '--';
        document.getElementById('destination-input').value = '';
    }

    // Update car physics
    updatePhysics(deltaTime) {
        if (!this.state.engineOn) {
            // Engine off - car decelerates
            this.state.speed = Math.max(0, this.state.speed - this.physics.engineBrake * deltaTime);
            this.state.rpm = 0;
            return;
        }

        const gearIndex = this.state.gear === 'N' ? 0 : 
                         this.state.gear === 'R' ? 1 : 
                         parseInt(this.state.gear);

        // Calculate RPM based on speed and gear
        const maxSpeedForGear = this.physics.maxSpeed[gearIndex] || 0;
        const speedRatio = maxSpeedForGear > 0 ? this.state.speed / maxSpeedForGear : 0;
        
        // Handle acceleration
        if (this.state.gear !== 'N' && this.state.clutch < 50) {
            const throttle = this.state.accelerator / 100;
            const brake = this.state.brake / 100;

            // Acceleration
            if (throttle > 0 && this.state.speed < maxSpeedForGear) {
                const accel = this.physics.acceleration * throttle * (1 - speedRatio * 0.5);
                if (this.state.gear === 'R') {
                    this.state.speed = Math.min(30, this.state.speed + accel * deltaTime);
                } else {
                    this.state.speed = Math.min(maxSpeedForGear, this.state.speed + accel * deltaTime);
                }
            }

            // Braking
            if (brake > 0) {
                const brakeForce = this.physics.brakeForce * brake;
                this.state.speed = Math.max(0, this.state.speed - brakeForce * deltaTime);
            }

            // Engine braking when no throttle
            if (throttle === 0 && brake === 0) {
                this.state.speed = Math.max(0, this.state.speed - this.physics.engineBrake * deltaTime);
            }
        } else {
            // In neutral or clutch pressed - engine brake only
            this.state.speed = Math.max(0, this.state.speed - this.physics.engineBrake * 0.5 * deltaTime);
        }

        // Calculate RPM
        if (this.state.clutch > 50) {
            // Clutch pressed - RPM responds to throttle directly
            this.state.rpm = this.physics.idleRpm + (this.state.accelerator / 100) * (this.physics.maxRpm - this.physics.idleRpm);
        } else if (this.state.gear === 'N') {
            this.state.rpm = this.physics.idleRpm + (this.state.accelerator / 100) * 3000;
        } else {
            this.state.rpm = this.physics.idleRpm + speedRatio * (this.physics.maxRpm - this.physics.idleRpm);
        }

        // Update RPM display
        const rpmFill = document.getElementById('rpm-fill');
        rpmFill.style.width = (this.state.rpm / this.physics.maxRpm * 100) + '%';
        document.getElementById('rpm-display').textContent = Math.round(this.state.rpm);
    }

    // Update car position based on speed and steering
    updatePosition(deltaTime) {
        if (this.state.speed < 0.1) return;

        // Calculate turn rate based on steering angle and speed
        const steeringFactor = this.state.steeringAngle / 540; // Normalize to -1 to 1
        const speedFactor = Math.min(1, this.state.speed / 50); // Less turning at high speed
        const turnRate = this.physics.turnRate * steeringFactor * speedFactor;

        // Update heading
        if (this.state.gear === 'R') {
            this.state.heading -= turnRate * deltaTime; // Reverse steering in reverse gear
        } else {
            this.state.heading += turnRate * deltaTime;
        }
        
        // Normalize heading to 0-360
        this.state.heading = ((this.state.heading % 360) + 360) % 360;

        // Calculate movement
        const headingRad = (this.state.heading - 90) * (Math.PI / 180); // Convert to radians, adjust for map coords
        const speedMs = (this.state.speed * 1000) / 3600; // Convert km/h to m/s
        const distance = speedMs * deltaTime; // Distance in meters

        // Convert distance to lat/lng delta (approximate)
        const metersPerDegreeLat = 111320;
        const metersPerDegreeLng = 111320 * Math.cos(this.state.position.lat * Math.PI / 180);

        let latDelta = (distance * Math.cos(headingRad)) / metersPerDegreeLat;
        let lngDelta = (distance * Math.sin(headingRad)) / metersPerDegreeLng;

        // Reverse direction for reverse gear
        if (this.state.gear === 'R') {
            latDelta = -latDelta;
            lngDelta = -lngDelta;
        }

        this.state.position.lat += latDelta;
        this.state.position.lng += lngDelta;
    }

    // Update map display
    updateMapPosition() {
        this.carMarker.setLatLng([this.state.position.lat, this.state.position.lng]);
        
        // Rotate car marker
        const markerElement = this.carMarker.getElement();
        if (markerElement) {
            markerElement.style.transform += ` rotate(${this.state.heading}deg)`;
        }

        // Center map on car if moving
        if (this.state.speed > 0) {
            this.map.panTo([this.state.position.lat, this.state.position.lng], { animate: true, duration: 0.1 });
        }

        // Update distance to destination
        if (this.state.destination) {
            const distance = this.calculateDistance(
                this.state.position.lat, this.state.position.lng,
                this.state.destination.lat, this.state.destination.lng
            );
            document.getElementById('distance-display').textContent = distance.toFixed(2) + ' km';

            // Check if reached destination
            if (distance < 0.05) { // Within 50 meters
                alert('You have reached your destination!');
                this.clearRoute();
            }
        }
    }

    // Calculate distance between two points (Haversine formula)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Update UI displays
    updateUI() {
        document.getElementById('position-display').textContent = 
            `${this.state.position.lat.toFixed(4)}, ${this.state.position.lng.toFixed(4)}`;
        document.getElementById('speed-display').textContent = Math.round(this.state.speed);
        document.getElementById('heading-display').textContent = Math.round(this.state.heading);
    }

    // Send state to backend
    async sendStateToBackend() {
        try {
            const response = await fetch(`${this.backendUrl}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.state)
            });
            
            if (response.ok) {
                const data = await response.json();
                // Backend can override position calculations if needed
                if (data.position) {
                    this.state.position = data.position;
                }
            }
        } catch (error) {
            // Backend not available - continue with client-side calculations
            console.debug('Backend not available, using client-side physics');
        }
    }

    // Main game loop
    gameLoop() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000; // Convert to seconds
        this.lastUpdate = now;

        // Update physics
        this.updatePhysics(deltaTime);
        
        // Update position
        this.updatePosition(deltaTime);
        
        // Update map
        this.updateMapPosition();
        
        // Update UI
        this.updateUI();

        // Send state to backend periodically (every 500ms)
        if (now % 500 < 20) {
            this.sendStateToBackend();
        }

        // Continue game loop
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize the simulator when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.carSimulator = new CarSimulator();
});
