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
from adafruit_fingerprint import Adafruit_Fingerprint

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Global setup
PI_HARDWARE_AVAILABLE = True
picam2 = None
known_face_encodings = []
known_face_names = []
detection_lock = Lock()
latest_detections = []
frame_buffer = deque(maxlen=100)
last_encoded_frame = None

# Directories
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/videos", exist_ok=True)
os.makedirs("dataset", exist_ok=True)

# GPIO Setup
LOCK_GPIO_PIN = 18
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)
GPIO.setup(LOCK_GPIO_PIN, GPIO.OUT)
GPIO.output(LOCK_GPIO_PIN, 1)

# Fingerprint Sensor
uart = serial.Serial("/dev/ttyS0", baudrate=57600, timeout=1)
finger = Adafruit_Fingerprint(uart)

# Push Notification
EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'
EXPO_DEVICE_PUSH_TOKEN = None

# Load encodings
try:
    with open("encodings.pickle", "rb") as f:
        data = pickle.load(f)
        known_face_encodings = data["encodings"]
        known_face_names = data["names"]
        logger.info(f"Loaded {len(known_face_names)} encodings")
except Exception as e:
    logger.error(f"Encoding load error: {e}")

# Functions
def initialize_hardware():
    global picam2, PI_HARDWARE_AVAILABLE
    try:
        from picamera2 import Picamera2
        picam2 = Picamera2()
        config = picam2.create_preview_configuration(main={"size": (640, 480)})
        picam2.configure(config)
        picam2.start()
        logger.info("Camera initialized")
    except Exception as e:
        logger.error(f"Camera init failed: {e}")
        PI_HARDWARE_AVAILABLE = False

def unlock_lock_for_seconds(seconds=5):
    logger.info(f"Unlocking lock for {seconds} seconds")
    GPIO.output(LOCK_GPIO_PIN, 0)
    time.sleep(seconds)
    GPIO.output(LOCK_GPIO_PIN, 1)
    GPIO.setup(LOCK_GPIO_PIN, GPIO.IN)
    logger.info("Lock re-locked and pin set to INPUT")

def lock_immediately():
    logger.info("Locking immediately")
    GPIO.output(LOCK_GPIO_PIN, 1)
    GPIO.setup(LOCK_GPIO_PIN, GPIO.IN)

# Routes
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
            Thread(target=retrain_encodings, daemon=True).start()
            return jsonify({"status": "success", "message": f"User '{name}' deleted."})
        else:
            return jsonify({"status": "error", "message": "User not found"}), 404
    except Exception as e:
        logger.error(f"Error deleting user {name}: {e}")
        return jsonify({"status": "error", "message": "Internal server error"}), 500

@app.route('/register_token', methods=['POST'])
def register_token():
    global EXPO_DEVICE_PUSH_TOKEN
    data = request.get_json()
    token = data.get('token')
    if token:
        EXPO_DEVICE_PUSH_TOKEN = token
        return jsonify({"status": "success", "message": "Token registered"})
    return jsonify({"status": "error", "message": "No token"}), 400

@app.route('/unlock', methods=['POST'])
def unlock_door():
    Thread(target=unlock_lock_for_seconds, args=(5,), daemon=True).start()
    return jsonify({"status": "success", "message": "Door unlocked"})

@app.route('/lock', methods=['POST'])
def lock_door():
    lock_immediately()
    return jsonify({"status": "success", "message": "Door locked"})

@app.route('/capture_face', methods=['POST'])
def capture_face():
    name = request.form.get('name')
    if not name:
        return jsonify({"status": "error", "message": "Name required"}), 400
    folder = os.path.join("dataset", name)
    os.makedirs(folder, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S%f")
    filename = f"{name}_{timestamp}.jpg"
    path = os.path.join(folder, filename)
    if picam2 and PI_HARDWARE_AVAILABLE:
        frame = picam2.capture_array()
        cv2.imwrite(path, frame)
        logger.info(f"Captured image for {name}: {filename}")
    else:
        return jsonify({"status": "error", "message": "Camera not available"}), 500
    Thread(target=retrain_encodings, daemon=True).start()
    return jsonify({"status": "success", "message": f"Photo saved as {filename}."})

@app.route('/enroll_fingerprint', methods=['POST'])
def enroll_fingerprint():
    name = request.form.get('name')
    if not name:
        return jsonify({"status": "error", "message": "Name required"}), 400
    if finger.read_templates() != Adafruit_Fingerprint.OK:
        return jsonify({"status": "error", "message": "Could not read templates"}), 500
    new_id = 0
    while new_id in set(finger.templates):
        new_id += 1
    if new_id >= finger.library_size:
        return jsonify({"status": "error", "message": "Storage full"}), 500
    for i in range(1, 3):
        while finger.get_image() != Adafruit_Fingerprint.OK:
            time.sleep(0.5)
        if finger.image_2_tz(i) != Adafruit_Fingerprint.OK:
            return jsonify({"status": "error", "message": f"Template {i} failed"}), 500
        time.sleep(1)
        while finger.get_image() != Adafruit_Fingerprint.NOFINGER:
            time.sleep(0.1)
    if finger.create_model() != Adafruit_Fingerprint.OK:
        return jsonify({"status": "error", "message": "Model failed"}), 500
    if finger.store_model(new_id) == Adafruit_Fingerprint.OK:
        return jsonify({"status": "success", "message": f"Fingerprint stored with ID {new_id}."})
    return jsonify({"status": "error", "message": "Store failed"}), 500

@app.route('/scan_fingerprint', methods=['GET'])
def scan_fingerprint():
    while finger.get_image() != Adafruit_Fingerprint.OK:
        time.sleep(0.5)
    if finger.image_2_tz(1) != Adafruit_Fingerprint.OK:
        return jsonify({"status": "error", "message": "Template failed"}), 500
    if finger.finger_search() == Adafruit_Fingerprint.OK:
        Thread(target=unlock_lock_for_seconds, args=(5,), daemon=True).start()
        return jsonify({"status": "success", "id": finger.finger_id, "confidence": finger.confidence})
    return jsonify({"status": "error", "message": "No match"}), 404

@app.route('/detect', methods=['GET'])
def get_detections():
    with detection_lock:
        return jsonify({"status": "success", "detected_faces": latest_detections})

# Background Threads
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
                    if cv2.countNonZero(thresh) > 800:
                        if time.time() - last_motion_time > 10:
                            last_motion_time = time.time()
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
                                latest_detections[:] = latest_detections[:50]
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
                        Thread(target=unlock_lock_for_seconds, args=(5,), daemon=True).start()
                    timestamp = datetime.now().isoformat()
                    img_filename = f"static/images/{timestamp.replace(':','-')}.jpg"
                    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
                    cv2.imwrite(img_filename, bgr)
            except Exception as e:
                logger.error(f"Face detection error: {e}")
        time.sleep(2)

def save_video_clip(frames, filename="clip.avi", fps=10):
    if not frames: return None
    h, w, _ = frames[0].shape
    path = os.path.join("static/videos", filename)
    out = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*'XVID'), fps, (w, h))
    for f in frames: out.write(f)
    out.release()
    return "/" + path

def generate_frames():
    while True:
        if picam2:
            frame = picam2.capture_array()
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            _, buffer = cv2.imencode('.jpg', rgb)
            yield (b'--frame\\r\\nContent-Type: image/jpeg\\r\\n\\r\\n' + buffer.tobytes() + b'\\r\\n')
        time.sleep(0.05)

def retrain_encodings():
    imagePaths = list(paths.list_images("dataset"))
    encodings, names = [], []
    for path in imagePaths:
        name = os.path.basename(os.path.dirname(path))
        img = cv2.imread(path)
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        boxes = face_recognition.face_locations(rgb)
        for enc in face_recognition.face_encodings(rgb, boxes):
            encodings.append(enc)
            names.append(name)
    with open("encodings.pickle", "wb") as f:
        pickle.dump({"encodings": encodings, "names": names}, f)
    global known_face_encodings, known_face_names
    known_face_encodings, known_face_names = encodings, names
    logger.info("Encodings retrained.")

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    return response

if __name__ == '__main__':
    initialize_hardware()
    lock_immediately()
    Thread(target=detect_motion, daemon=True).start()
    Thread(target=detect_faces, daemon=True).start()
    app.run(host='0.0.0.0', port=5000, threaded=True)
