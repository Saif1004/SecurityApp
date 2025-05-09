from flask import Flask, Response, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import face_recognition
import cv2
import numpy as np
import time
import pickle
import os
import requests
import RPi.GPIO as GPIO
from datetime import datetime
from threading import Thread, Lock
from collections import deque
from imutils import paths
import logging
import serial
import json
from adafruit_fingerprint import Adafruit_Fingerprint

# Configuration Constants
FINGERPRINT_MAP_FILE = "fingerprint_map.json"
LOCK_GPIO_PIN = 18
EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'
FRAME_BUFFER_SIZE = 100
DETECTION_HISTORY_LIMIT = 50
UNLOCK_DURATION = 5  # seconds
MOTION_THRESHOLD = 800
MOTION_COOLDOWN = 10  # seconds
FINGERPRINT_TIMEOUT = 10  # seconds
FINGERPRINT_RETRIES = 3
SERIAL_PORT = "/dev/ttyAMA0"
SERIAL_BAUDRATE = 57600

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Global variables
PI_HARDWARE_AVAILABLE = True
picam2 = None
known_face_encodings = []
known_face_names = []
detection_lock = Lock()
latest_detections = []
frame_buffer = deque(maxlen=FRAME_BUFFER_SIZE)
EXPO_DEVICE_PUSH_TOKEN = None
finger = None  # Fingerprint sensor instance
fingerprint_initialized = False

# Create required directories
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/videos", exist_ok=True)
os.makedirs("dataset", exist_ok=True)

def initialize_fingerprint_sensor():
    global finger, fingerprint_initialized, PI_HARDWARE_AVAILABLE
    
    for attempt in range(FINGERPRINT_RETRIES):
        try:
            # Close any existing serial connection
            if finger and hasattr(finger, 'ser'):
                finger.ser.close()
            
            # Initialize new connection
            uart = serial.Serial(SERIAL_PORT, baudrate=SERIAL_BAUDRATE, timeout=1)
            finger = Adafruit_Fingerprint(uart)
            
            # Verify password
            if finger.verify_password():
                logger.info("Fingerprint sensor initialized successfully")
                fingerprint_initialized = True
                return True
            else:
                logger.error("Failed to verify fingerprint sensor password")
        
        except Exception as e:
            logger.error(f"Fingerprint initialization attempt {attempt + 1} failed: {e}")
            time.sleep(2)  # Wait before retrying
    
    logger.error("All fingerprint initialization attempts failed")
    fingerprint_initialized = False
    PI_HARDWARE_AVAILABLE = False
    return False

# Hardware initialization
def initialize_hardware():
    global picam2, PI_HARDWARE_AVAILABLE
    
    # GPIO Setup
    GPIO.setwarnings(False)
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(LOCK_GPIO_PIN, GPIO.OUT)
    lock_immediately()  # Start with locked state
    
    # Camera Setup
    try:
        from picamera2 import Picamera2
        picam2 = Picamera2()
        config = picam2.create_preview_configuration(main={"size": (640, 480)})
        picam2.configure(config)
        picam2.start()
        logger.info("Camera initialized successfully")
    except Exception as e:
        logger.error(f"Camera initialization failed: {e}")
        PI_HARDWARE_AVAILABLE = False
    
    # Fingerprint Sensor Setup
    initialize_fingerprint_sensor()

# Lock control functions
def unlock_lock_for_seconds(seconds=UNLOCK_DURATION):
    logger.info(f"Unlocking lock for {seconds} seconds")
    GPIO.output(LOCK_GPIO_PIN, 0)
    time.sleep(seconds)
    lock_immediately()

def lock_immediately():
    logger.info("Locking immediately")
    GPIO.output(LOCK_GPIO_PIN, 1)
    GPIO.setup(LOCK_GPIO_PIN, GPIO.IN)

# Face recognition functions (keep existing)
def load_encodings():
    global known_face_encodings, known_face_names
    try:
        with open("encodings.pickle", "rb") as f:
            data = pickle.load(f)
            known_face_encodings = data["encodings"]
            known_face_names = data["names"]
            logger.info(f"Loaded {len(known_face_names)} face encodings")
    except Exception as e:
        logger.error(f"Error loading face encodings: {e}")
        known_face_encodings, known_face_names = [], []

def retrain_encodings():
    image_paths = list(paths.list_images("dataset"))
    encodings, names = [], []
    
    for path in image_paths:
        name = os.path.basename(os.path.dirname(path))
        try:
            img = cv2.imread(path)
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            boxes = face_recognition.face_locations(rgb)
            for enc in face_recognition.face_encodings(rgb, boxes):
                encodings.append(enc)
                names.append(name)
        except Exception as e:
            logger.error(f"Error processing image {path}: {e}")
    
    with open("encodings.pickle", "wb") as f:
        pickle.dump({"encodings": encodings, "names": names}, f)
    
    global known_face_encodings, known_face_names
    known_face_encodings, known_face_names = encodings, names
    logger.info(f"Retrained encodings with {len(names)} faces")

# Fingerprint functions
def load_fingerprint_map():
    if os.path.exists(FINGERPRINT_MAP_FILE):
        try:
            with open(FINGERPRINT_MAP_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading fingerprint map: {e}")
    return {}

def save_fingerprint_map(data):
    with open(FINGERPRINT_MAP_FILE, "w") as f:
        json.dump(data, f)

def get_next_fingerprint_id():
    try:
        if finger.read_templates() != Adafruit_Fingerprint.OK:
            logger.error("Failed to read fingerprint templates")
            return None
        
        new_id = 0
        while new_id in set(finger.templates):
            new_id += 1
            if new_id >= finger.library_size:
                logger.error("Fingerprint storage is full")
                return None
        return new_id
    except Exception as e:
        logger.error(f"Error getting next fingerprint ID: {e}")
        return None

def wait_for_finger(timeout=FINGERPRINT_TIMEOUT):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            if finger.get_image() == Adafruit_Fingerprint.OK:
                return True
        except Exception as e:
            logger.error(f"Error waiting for finger: {e}")
            return False
        time.sleep(0.1)
    return False

def check_fingerprint_sensor():
    if not fingerprint_initialized:
        if not initialize_fingerprint_sensor():
            return False
    return True

# Video processing functions (keep existing)
def save_video_clip(frames, filename="clip.avi", fps=10):
    if not frames:
        return None
    h, w, _ = frames[0].shape
    path = os.path.join("static/videos", filename)
    try:
        out = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*'XVID'), fps, (w, h))
        for frame in frames:
            out.write(frame)
        out.release()
        return "/" + path
    except Exception as e:
        logger.error(f"Error saving video clip: {e}")
        return None

def generate_frames():
    while True:
        if picam2 and PI_HARDWARE_AVAILABLE:
            try:
                frame = picam2.capture_array()
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                _, buffer = cv2.imencode('.jpg', rgb)
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            except Exception as e:
                logger.error(f"Error generating video frame: {e}")
                time.sleep(1)
        else:
            # Generate black frame if camera isn't available
            black_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            _, buffer = cv2.imencode('.jpg', black_frame)
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.1)

# Background detection threads (keep existing)
def detect_motion():
    last_frame_gray = None
    last_motion_time = 0
    
    while True:
        if picam2 and PI_HARDWARE_AVAILABLE:
            try:
                frame = picam2.capture_array()
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                bgr = frame
                
                with detection_lock:
                    frame_buffer.append(bgr)
                
                if last_frame_gray is not None:
                    diff = cv2.absdiff(last_frame_gray, gray)
                    _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)
                    
                    if cv2.countNonZero(thresh) > MOTION_THRESHOLD:
                        current_time = time.time()
                        if current_time - last_motion_time > MOTION_COOLDOWN:
                            last_motion_time = current_time
                            timestamp = datetime.now().isoformat()
                            img_path = f"static/images/{timestamp.replace(':','-')}.jpg"
                            video_path = save_video_clip(list(frame_buffer), f"{timestamp.replace(':','-')}.avi")
                            cv2.imwrite(img_path, bgr)
                            
                            with detection_lock:
                                latest_detections.insert(0, {
                                    "name": "Motion",
                                    "timestamp": timestamp,
                                    "image": "/" + img_path,
                                    "video": video_path
                                })
                                latest_detections[:] = latest_detections[:DETECTION_HISTORY_LIMIT]
                
                last_frame_gray = gray
            except Exception as e:
                logger.error(f"Motion detection error: {e}")
        time.sleep(0.5)

def detect_faces():
    while True:
        if picam2 and PI_HARDWARE_AVAILABLE:
            try:
                frame = picam2.capture_array()
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                locations = face_recognition.face_locations(rgb)
                encodings = face_recognition.face_encodings(rgb, locations)
                
                for (top, right, bottom, left), face_encoding in zip(locations, encodings):
                    matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
                    name = "Unknown"
                    
                    if True in matches:
                        name = known_face_names[matches.index(True)]
                    
                    if name != "Unknown":
                        Thread(target=unlock_lock_for_seconds, daemon=True).start()
                    
                    timestamp = datetime.now().isoformat()
                    img_filename = f"static/images/{timestamp.replace(':','-')}.jpg"
                    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
                    cv2.imwrite(img_filename, bgr)
                    
                    with detection_lock:
                        latest_detections.insert(0, {
                            "name": name,
                            "timestamp": timestamp,
                            "image": "/" + img_filename,
                            "video": None
                        })
                        latest_detections[:] = latest_detections[:DETECTION_HISTORY_LIMIT]
            except Exception as e:
                logger.error(f"Face detection error: {e}")
        time.sleep(2)

# API Routes (keep existing routes, update fingerprint endpoints)

@app.route('/enroll_fingerprint', methods=['POST'])
def enroll_fingerprint():
    if not check_fingerprint_sensor():
        return jsonify({"status": "error", "message": "Fingerprint hardware not available"}), 503

    name = request.form.get('name')
    if not name:
        return jsonify({"status": "error", "message": "Name is required"}), 400

    try:
        # Get next available ID
        new_id = get_next_fingerprint_id()
        if new_id is None:
            return jsonify({"status": "error", "message": "No available fingerprint slots"}), 500

        # First finger scan
        logger.info("Place finger to scan (first time)...")
        if not wait_for_finger():
            return jsonify({"status": "error", "message": "Finger not detected (timeout)"}), 408
        
        if finger.image_2_tz(1) != Adafruit_Fingerprint.OK:
            return jsonify({"status": "error", "message": "First scan failed"}), 500

        logger.info("Remove finger...")
        while finger.get_image() != Adafruit_Fingerprint.NOFINGER:
            time.sleep(0.1)

        # Second finger scan
        logger.info("Place same finger again...")
        if not wait_for_finger():
            return jsonify({"status": "error", "message": "Finger not detected (timeout)"}), 408
        
        if finger.image_2_tz(2) != Adafruit_Fingerprint.OK:
            return jsonify({"status": "error", "message": "Second scan failed"}), 500

        # Create model
        if finger.create_model() != Adafruit_Fingerprint.OK:
            return jsonify({"status": "error", "message": "Failed to create fingerprint model"}), 500

        # Store model
        if finger.store_model(new_id) != Adafruit_Fingerprint.OK:
            return jsonify({"status": "error", "message": "Failed to store fingerprint"}), 500

        # Save mapping
        fp_map = load_fingerprint_map()
        fp_map[str(new_id)] = name
        save_fingerprint_map(fp_map)

        return jsonify({
            "status": "success", 
            "message": f"Fingerprint enrolled with ID {new_id}",
            "id": new_id,
            "name": name
        })

    except Exception as e:
        logger.error(f"Fingerprint enrollment error: {e}")
        # Attempt to reinitialize sensor on failure
        initialize_fingerprint_sensor()
        return jsonify({"status": "error", "message": f"Enrollment failed: {str(e)}"}), 500

@app.route('/scan_fingerprint', methods=['GET'])
def scan_fingerprint():
    if not check_fingerprint_sensor():
        return jsonify({"status": "error", "message": "Fingerprint hardware not available"}), 503

    try:
        logger.info("Waiting for finger...")
        if not wait_for_finger():
            return jsonify({"status": "error", "message": "Finger not detected (timeout)"}), 408

        if finger.image_2_tz(1) != Adafruit_Fingerprint.OK:
            return jsonify({"status": "error", "message": "Failed to process fingerprint"}), 500

        result = finger.finger_fast_search()
        if result == Adafruit_Fingerprint.OK:
            fp_map = load_fingerprint_map()
            name = fp_map.get(str(finger.finger_id), "Unknown")
            
            if name != "Unknown":
                Thread(target=unlock_lock_for_seconds, daemon=True).start()
            
            return jsonify({
                "status": "success",
                "id": finger.finger_id,
                "name": name,
                "confidence": finger.confidence
            })
        else:
            return jsonify({"status": "error", "message": "No match found"}), 404

    except Exception as e:
        logger.error(f"Fingerprint scan error: {e}")
        # Attempt to reinitialize sensor on failure
        initialize_fingerprint_sensor()
        return jsonify({"status": "error", "message": f"Scan failed: {str(e)}"}), 500

# Add a new endpoint to check fingerprint sensor status
@app.route('/fingerprint_status', methods=['GET'])
def fingerprint_status():
    status = {
        "initialized": fingerprint_initialized,
        "hardware_available": PI_HARDWARE_AVAILABLE,
        "templates_count": len(finger.templates) if fingerprint_initialized else 0,
        "library_size": finger.library_size if fingerprint_initialized else 0
    }
    return jsonify(status)

# Keep all other existing routes and functions

if __name__ == '__main__':
    initialize_hardware()
    load_encodings()
    
    # Start background threads
    Thread(target=detect_motion, daemon=True).start()
    Thread(target=detect_faces, daemon=True).start()
    
    # Start Flask app
    app.run(host='0.0.0.0', port=5000, threaded=True)