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
from adafruit_fingerprint import Adafruit_Fingerprint as AF

# Configuration Constants
FINGERPRINT_MAP_FILE = "fingerprint_map.json"
LOCK_GPIO_PIN = 18
EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'
FRAME_BUFFER_SIZE = 100
DETECTION_HISTORY_LIMIT = 50
UNLOCK_DURATION = 5  # seconds
MOTION_THRESHOLD = 800
MOTION_COOLDOWN = 10  # seconds

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

# Create required directories
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/videos", exist_ok=True)
os.makedirs("dataset", exist_ok=True)

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
    try:
        global uart, finger
        uart = serial.Serial("/dev/ttyAMA0", baudrate=57600, timeout=1)
        finger = AF(uart)
        FINGERPRINT_OK = 0
        FINGERPRINT_NOFINGER = 2
        logger.info("Fingerprint sensor initialized")
    except Exception as e:
        logger.error(f"Fingerprint sensor initialization failed: {e}")
        PI_HARDWARE_AVAILABLE = False

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

# Face recognition functions
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
    if finger.read_templates() != AF.OK:
        return None
    new_id = 0
    while new_id in set(finger.templates):
        new_id += 1
    return new_id if new_id < finger.library_size else None

# Video processing functions
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
        time.sleep(0.05)

# Background detection threads
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

# API Routes
@app.route('/')
def home():
    return 'Face, Motion & Fingerprint Detection Server Running'

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/view')
def view():
    return """
    <html><body style="margin:0">
    <img src="/video_feed" style="width:100vw;height:100vh;object-fit:contain;" />
    </body></html>
    """

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/static/videos/<path:filename>')
def serve_video(filename):
    return send_file(os.path.join("static/videos", filename), mimetype='video/x-msvideo')

@app.route('/dataset/<path:filename>')
def serve_dataset(filename):
    return send_from_directory('dataset', filename)

@app.route('/users', methods=['GET'])
def list_users():
    users = {}
    for person in os.listdir('dataset'):
        path = os.path.join('dataset', person)
        if os.path.isdir(path):
            users[person] = [f"/dataset/{person}/{img}" for img in os.listdir(path)]
    return jsonify(users)

@app.route('/delete_user/<name>', methods=['DELETE'])
def delete_user(name):
    try:
        folder = os.path.join("dataset", name)
        if os.path.exists(folder):
            for file in os.listdir(folder):
                os.remove(os.path.join(folder, file))
            os.rmdir(folder)
            
            # Also remove from fingerprint map if exists
            fp_map = load_fingerprint_map()
            for fid, fname in list(fp_map.items()):
                if fname == name:
                    del fp_map[fid]
            save_fingerprint_map(fp_map)
            
            Thread(target=retrain_encodings, daemon=True).start()
            return jsonify({"status": "success", "message": f"User '{name}' deleted."})
        return jsonify({"status": "error", "message": "User not found"}), 404
    except Exception as e:
        logger.error(f"Error deleting user {name}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/register_token', methods=['POST'])
def register_token():
    global EXPO_DEVICE_PUSH_TOKEN
    data = request.get_json()
    token = data.get('token')
    if token:
        EXPO_DEVICE_PUSH_TOKEN = token
        return jsonify({"status": "success", "message": "Token registered"})
    return jsonify({"status": "error", "message": "No token provided"}), 400

@app.route('/unlock', methods=['POST'])
def unlock_door():
    Thread(target=unlock_lock_for_seconds, daemon=True).start()
    return jsonify({"status": "success", "message": "Door unlocked"})

@app.route('/lock', methods=['POST'])
def lock_door():
    lock_immediately()
    return jsonify({"status": "success", "message": "Door locked"})

@app.route('/capture_face', methods=['POST'])
def capture_face():
    name = request.form.get('name')
    if not name:
        return jsonify({"status": "error", "message": "Name is required"}), 400
    
    folder = os.path.join("dataset", name)
    os.makedirs(folder, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S%f")
    filename = f"{name}_{timestamp}.jpg"
    path = os.path.join(folder, filename)
    
    if picam2 and PI_HARDWARE_AVAILABLE:
        try:
            frame = picam2.capture_array()
            cv2.imwrite(path, frame)
            logger.info(f"Captured image for {name}: {filename}")
            Thread(target=retrain_encodings, daemon=True).start()
            return jsonify({"status": "success", "message": f"Photo saved as {filename}"})
        except Exception as e:
            logger.error(f"Error capturing face: {e}")
            return jsonify({"status": "error", "message": "Failed to capture image"}), 500
    return jsonify({"status": "error", "message": "Camera not available"}), 503

@app.route('/enroll_fingerprint', methods=['POST'])
def enroll_fingerprint():
    name = request.form.get('name')
    if not name:
        return jsonify({"status": "error", "message": "Name is required"}), 400

    FINGERPRINT_OK = 0
    FINGERPRINT_NOFINGER = 2

    new_id = get_next_fingerprint_id()
    if new_id is None:
        return jsonify({"status": "error", "message": "No available fingerprint slots"}), 500

    for i in range(1, 3):  # Two samples needed
        while finger.get_image() != FINGERPRINT_OK:
            time.sleep(0.5)
        if finger.image_2_tz(i) != FINGERPRINT_OK:
            return jsonify({"status": "error", "message": f"Template {i} creation failed"}), 500
        time.sleep(1)
        while finger.get_image() != FINGERPRINT_NOFINGER:
            time.sleep(0.1)

    if finger.create_model() != FINGERPRINT_OK:
        return jsonify({"status": "error", "message": "Model creation failed"}), 500

    if finger.store_model(new_id) == FINGERPRINT_OK:
        fp_map = load_fingerprint_map()
        fp_map[str(new_id)] = name
        save_fingerprint_map(fp_map)
        return jsonify({
            "status": "success",
            "message": f"Fingerprint enrolled with ID {new_id}",
            "id": new_id
        })

    return jsonify({"status": "error", "message": "Failed to store fingerprint"}), 500



@app.route('/scan_fingerprint', methods=['GET'])
def scan_fingerprint():
    FINGERPRINT_OK = 0
    try:
        while finger.get_image() != FINGERPRINT_OK:
            time.sleep(0.5)
        
        if finger.image_2_tz(1) != FINGERPRINT_OK:
            return jsonify({"status": "error", "message": "Template creation failed"}), 500
        
        if finger.finger_search() == FINGERPRINT_OK:
            matched_id = finger.finger_id
            confidence = finger.confidence
            fp_map = load_fingerprint_map()
            name = fp_map.get(str(matched_id), "Unknown")
            
            if name != "Unknown":
                Thread(target=unlock_lock_for_seconds, daemon=True).start()
            
            return jsonify({
                "status": "success",
                "id": matched_id,
                "name": name,
                "confidence": confidence
            })
        return jsonify({"status": "error", "message": "No matching fingerprint found"}), 404
    except Exception as e:
        logger.error(f"Fingerprint scan error: {e}")
        return jsonify({"status": "error", "message": f"Fingerprint scan failed: {str(e)}"}), 500


@app.route('/detect', methods=['GET'])
def get_detections():
    with detection_lock:
        logger.info(f"Returning {len(latest_detections)} alerts")
        return jsonify({
            "status": "success", 
            "detected_faces": latest_detections,
            "count": len(latest_detections)
        })


@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    return response

if __name__ == '__main__':
    initialize_hardware()
    load_encodings()
    
    # Start background threads
    Thread(target=detect_motion, daemon=True).start()
    Thread(target=detect_faces, daemon=True).start()
    
    # Start Flask app
    app.run(host='0.0.0.0', port=5000, threaded=True)