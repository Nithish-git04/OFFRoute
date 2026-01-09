"""
Car Simulator Backend Server
Handles physics calculations and route management using OpenStreetMap APIs
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import math
import requests
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any, List, Tuple
import time

app = Flask(__name__)
CORS(app)

@dataclass
class CarState:
    """Represents the current state of the car"""
    lat: float = 12.9716  # Bangalore default
    lng: float = 77.5946
    heading: float = 0  # degrees (0 = North)
    speed: float = 0  # km/h
    rpm: float = 0
    gear: str = 'N'
    engine_on: bool = False
    steering_angle: float = 0  # -540 to 540 degrees
    clutch: float = 0  # 0-100%
    brake: float = 0  # 0-100%
    accelerator: float = 0  # 0-100%


class PhysicsEngine:
    """Handles all physics calculations for the car"""
    
    # Physics constants
    MAX_SPEED_PER_GEAR = {
        'N': 0,
        'R': 30,
        '1': 40,
        '2': 80,
        '3': 120,
        '4': 160,
        '5': 200
    }
    
    ACCELERATION = 5  # km/h per second at full throttle
    BRAKE_FORCE = 15  # km/h per second at full brake
    ENGINE_BRAKE = 2  # km/h per second natural deceleration
    TURN_RATE = 45  # degrees per second at max steering
    MAX_RPM = 8000
    IDLE_RPM = 800
    
    # Earth constants for coordinate calculations
    METERS_PER_DEGREE_LAT = 111320
    
    @classmethod
    def meters_per_degree_lng(cls, lat: float) -> float:
        """Calculate meters per degree of longitude at a given latitude"""
        return cls.METERS_PER_DEGREE_LAT * math.cos(math.radians(lat))
    
    @classmethod
    def update_physics(cls, state: CarState, delta_time: float) -> CarState:
        """
        Update car physics based on current state and time elapsed
        
        Args:
            state: Current car state
            delta_time: Time elapsed since last update in seconds
            
        Returns:
            Updated car state
        """
        if not state.engine_on:
            # Engine off - car decelerates
            state.speed = max(0, state.speed - cls.ENGINE_BRAKE * delta_time)
            state.rpm = 0
            return state
        
        max_speed_for_gear = cls.MAX_SPEED_PER_GEAR.get(state.gear, 0)
        speed_ratio = state.speed / max_speed_for_gear if max_speed_for_gear > 0 else 0
        
        # Handle acceleration and braking
        if state.gear != 'N' and state.clutch < 50:
            throttle = state.accelerator / 100
            brake = state.brake / 100
            
            # Acceleration
            if throttle > 0 and state.speed < max_speed_for_gear:
                accel = cls.ACCELERATION * throttle * (1 - speed_ratio * 0.5)
                if state.gear == 'R':
                    state.speed = min(30, state.speed + accel * delta_time)
                else:
                    state.speed = min(max_speed_for_gear, state.speed + accel * delta_time)
            
            # Braking
            if brake > 0:
                brake_force = cls.BRAKE_FORCE * brake
                state.speed = max(0, state.speed - brake_force * delta_time)
            
            # Engine braking
            if throttle == 0 and brake == 0:
                state.speed = max(0, state.speed - cls.ENGINE_BRAKE * delta_time)
        else:
            # In neutral or clutch pressed
            state.speed = max(0, state.speed - cls.ENGINE_BRAKE * 0.5 * delta_time)
        
        # Calculate RPM
        if state.clutch > 50:
            state.rpm = cls.IDLE_RPM + (state.accelerator / 100) * (cls.MAX_RPM - cls.IDLE_RPM)
        elif state.gear == 'N':
            state.rpm = cls.IDLE_RPM + (state.accelerator / 100) * 3000
        else:
            state.rpm = cls.IDLE_RPM + speed_ratio * (cls.MAX_RPM - cls.IDLE_RPM)
        
        return state
    
    @classmethod
    def update_position(cls, state: CarState, delta_time: float) -> CarState:
        """
        Update car position based on speed and steering
        
        Args:
            state: Current car state
            delta_time: Time elapsed since last update in seconds
            
        Returns:
            Updated car state with new position
        """
        if state.speed < 0.1:
            return state
        
        # Calculate turn rate based on steering angle and speed
        steering_factor = state.steering_angle / 540  # Normalize to -1 to 1
        speed_factor = min(1, state.speed / 50)  # Less turning at high speed
        turn_rate = cls.TURN_RATE * steering_factor * speed_factor
        
        # Update heading
        if state.gear == 'R':
            state.heading -= turn_rate * delta_time
        else:
            state.heading += turn_rate * delta_time
        
        # Normalize heading to 0-360
        state.heading = ((state.heading % 360) + 360) % 360
        
        # Calculate movement
        heading_rad = math.radians(state.heading - 90)  # Adjust for map coords
        speed_ms = (state.speed * 1000) / 3600  # Convert km/h to m/s
        distance = speed_ms * delta_time  # Distance in meters
        
        # Convert distance to lat/lng delta
        lat_delta = (distance * math.cos(heading_rad)) / cls.METERS_PER_DEGREE_LAT
        lng_delta = (distance * math.sin(heading_rad)) / cls.meters_per_degree_lng(state.lat)
        
        # Reverse direction for reverse gear
        if state.gear == 'R':
            lat_delta = -lat_delta
            lng_delta = -lng_delta
        
        state.lat += lat_delta
        state.lng += lng_delta
        
        return state


class RouteManager:
    """Handles routing and navigation using OpenStreetMap APIs"""
    
    NOMINATIM_URL = "https://nominatim.openstreetmap.org"
    OSRM_URL = "https://router.project-osrm.org"
    
    @classmethod
    def geocode_address(cls, address: str) -> Optional[Tuple[float, float]]:
        """
        Convert address to coordinates using Nominatim
        
        Args:
            address: The address to geocode
            
        Returns:
            Tuple of (lat, lng) or None if not found
        """
        try:
            response = requests.get(
                f"{cls.NOMINATIM_URL}/search",
                params={
                    "format": "json",
                    "q": address
                },
                headers={"User-Agent": "CarSimulator/1.0"}
            )
            response.raise_for_status()
            data = response.json()
            
            if data:
                return (float(data[0]["lat"]), float(data[0]["lon"]))
            return None
        except Exception as e:
            print(f"Geocoding error: {e}")
            return None
    
    @classmethod
    def reverse_geocode(cls, lat: float, lng: float) -> Optional[str]:
        """
        Convert coordinates to address using Nominatim
        
        Args:
            lat: Latitude
            lng: Longitude
            
        Returns:
            Address string or None if not found
        """
        try:
            response = requests.get(
                f"{cls.NOMINATIM_URL}/reverse",
                params={
                    "format": "json",
                    "lat": lat,
                    "lon": lng
                },
                headers={"User-Agent": "CarSimulator/1.0"}
            )
            response.raise_for_status()
            data = response.json()
            
            return data.get("display_name")
        except Exception as e:
            print(f"Reverse geocoding error: {e}")
            return None
    
    @classmethod
    def calculate_route(
        cls, 
        start_lat: float, 
        start_lng: float, 
        end_lat: float, 
        end_lng: float
    ) -> Optional[Dict[str, Any]]:
        """
        Calculate route between two points using OSRM
        
        Args:
            start_lat, start_lng: Starting coordinates
            end_lat, end_lng: Ending coordinates
            
        Returns:
            Route data including geometry, distance, and duration
        """
        try:
            response = requests.get(
                f"{cls.OSRM_URL}/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}",
                params={
                    "overview": "full",
                    "geometries": "geojson",
                    "steps": "true"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("routes"):
                route = data["routes"][0]
                return {
                    "coordinates": [
                        [coord[1], coord[0]] 
                        for coord in route["geometry"]["coordinates"]
                    ],
                    "distance": route["distance"],  # meters
                    "duration": route["duration"],  # seconds
                    "steps": [
                        {
                            "instruction": step.get("maneuver", {}).get("instruction", ""),
                            "distance": step.get("distance", 0),
                            "duration": step.get("duration", 0)
                        }
                        for leg in route.get("legs", [])
                        for step in leg.get("steps", [])
                    ]
                }
            return None
        except Exception as e:
            print(f"Routing error: {e}")
            return None
    
    @classmethod
    def calculate_distance(
        cls, 
        lat1: float, 
        lon1: float, 
        lat2: float, 
        lon2: float
    ) -> float:
        """
        Calculate distance between two points using Haversine formula
        
        Args:
            lat1, lon1: First point coordinates
            lat2, lon2: Second point coordinates
            
        Returns:
            Distance in kilometers
        """
        R = 6371  # Earth's radius in km
        
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(d_lat/2) ** 2 + 
             math.cos(math.radians(lat1)) * 
             math.cos(math.radians(lat2)) * 
             math.sin(d_lon/2) ** 2)
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c


# Global state storage
car_states: Dict[str, CarState] = {}
last_update_time: Dict[str, float] = {}


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "car-simulator-backend"})


@app.route('/update', methods=['POST'])
def update_car_state():
    """
    Update car state with physics calculations
    
    Expects JSON body with car state data
    Returns updated position and state
    """
    try:
        data = request.get_json()
        session_id = data.get('session_id', 'default')
        
        # Get or create car state
        if session_id not in car_states:
            car_states[session_id] = CarState()
            last_update_time[session_id] = time.time()
        
        state = car_states[session_id]
        
        # Update state from request
        if 'position' in data:
            state.lat = data['position'].get('lat', state.lat)
            state.lng = data['position'].get('lng', state.lng)
        state.heading = data.get('heading', state.heading)
        state.speed = data.get('speed', state.speed)
        state.gear = data.get('gear', state.gear)
        state.engine_on = data.get('engineOn', state.engine_on)
        state.steering_angle = data.get('steeringAngle', state.steering_angle)
        state.clutch = data.get('clutch', state.clutch)
        state.brake = data.get('brake', state.brake)
        state.accelerator = data.get('accelerator', state.accelerator)
        
        # Calculate delta time
        current_time = time.time()
        delta_time = current_time - last_update_time[session_id]
        last_update_time[session_id] = current_time
        
        # Limit delta time to prevent huge jumps
        delta_time = min(delta_time, 0.1)
        
        # Update physics
        state = PhysicsEngine.update_physics(state, delta_time)
        state = PhysicsEngine.update_position(state, delta_time)
        
        car_states[session_id] = state
        
        return jsonify({
            "success": True,
            "position": {
                "lat": state.lat,
                "lng": state.lng
            },
            "heading": state.heading,
            "speed": state.speed,
            "rpm": state.rpm
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/geocode', methods=['POST'])
def geocode():
    """
    Geocode an address to coordinates
    
    Expects JSON body with 'address' field
    Returns coordinates if found
    """
    try:
        data = request.get_json()
        address = data.get('address', '')
        
        if not address:
            return jsonify({"success": False, "error": "Address required"}), 400
        
        coords = RouteManager.geocode_address(address)
        
        if coords:
            return jsonify({
                "success": True,
                "lat": coords[0],
                "lng": coords[1]
            })
        else:
            return jsonify({
                "success": False,
                "error": "Address not found"
            }), 404
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/reverse-geocode', methods=['POST'])
def reverse_geocode():
    """
    Reverse geocode coordinates to address
    
    Expects JSON body with 'lat' and 'lng' fields
    Returns address if found
    """
    try:
        data = request.get_json()
        lat = data.get('lat')
        lng = data.get('lng')
        
        if lat is None or lng is None:
            return jsonify({
                "success": False, 
                "error": "Latitude and longitude required"
            }), 400
        
        address = RouteManager.reverse_geocode(lat, lng)
        
        if address:
            return jsonify({
                "success": True,
                "address": address
            })
        else:
            return jsonify({
                "success": False,
                "error": "Location not found"
            }), 404
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/route', methods=['POST'])
def calculate_route():
    """
    Calculate route between two points
    
    Expects JSON body with 'start' and 'end' objects containing lat/lng
    Returns route geometry, distance, and duration
    """
    try:
        data = request.get_json()
        
        start = data.get('start', {})
        end = data.get('end', {})
        
        if not all([
            start.get('lat'), start.get('lng'),
            end.get('lat'), end.get('lng')
        ]):
            return jsonify({
                "success": False,
                "error": "Start and end coordinates required"
            }), 400
        
        route = RouteManager.calculate_route(
            start['lat'], start['lng'],
            end['lat'], end['lng']
        )
        
        if route:
            return jsonify({
                "success": True,
                "route": route
            })
        else:
            return jsonify({
                "success": False,
                "error": "Could not calculate route"
            }), 404
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/distance', methods=['POST'])
def calculate_distance():
    """
    Calculate distance between two points
    
    Expects JSON body with 'from' and 'to' objects containing lat/lng
    Returns distance in kilometers
    """
    try:
        data = request.get_json()
        
        from_point = data.get('from', {})
        to_point = data.get('to', {})
        
        if not all([
            from_point.get('lat'), from_point.get('lng'),
            to_point.get('lat'), to_point.get('lng')
        ]):
            return jsonify({
                "success": False,
                "error": "From and to coordinates required"
            }), 400
        
        distance = RouteManager.calculate_distance(
            from_point['lat'], from_point['lng'],
            to_point['lat'], to_point['lng']
        )
        
        return jsonify({
            "success": True,
            "distance_km": distance
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/state/<session_id>', methods=['GET'])
def get_state(session_id: str):
    """
    Get current car state for a session
    
    Returns the current state or 404 if session not found
    """
    if session_id in car_states:
        state = car_states[session_id]
        return jsonify({
            "success": True,
            "state": {
                "position": {"lat": state.lat, "lng": state.lng},
                "heading": state.heading,
                "speed": state.speed,
                "rpm": state.rpm,
                "gear": state.gear,
                "engine_on": state.engine_on
            }
        })
    else:
        return jsonify({
            "success": False,
            "error": "Session not found"
        }), 404


@app.route('/reset', methods=['POST'])
def reset_state():
    """
    Reset car state to initial values
    
    Optionally accepts a session_id in the request body
    """
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id', 'default')
        
        # Reset to default position or specified position
        initial_lat = data.get('lat', 12.9716)
        initial_lng = data.get('lng', 77.5946)
        
        car_states[session_id] = CarState(lat=initial_lat, lng=initial_lng)
        last_update_time[session_id] = time.time()
        
        return jsonify({
            "success": True,
            "message": "State reset successfully"
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


if __name__ == '__main__':
    print("Starting Car Simulator Backend Server...")
    print("Server running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
