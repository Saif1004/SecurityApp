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

FINGERPRINT_MAP_FILE = "fingerprint_map.json"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Globals
PI_HARDWARE_AVAILABLE = True
picam2 = None
known_face_encodings = []
known_face_names = []
detection_lock = Lock()
latest_detections = []
frame_buffer = deque(maxlen=100)
EXPO_DEVICE_PUSH_TOKEN = None
LOCK_GPIO_PIN = 18

# Setup dirs
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/videos", exist_ok=True)
os.makedirs("dataset", exist_ok=True)

# GPIO Setup
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)
GPIO.setup(LOCK_GPIO_PIN, GPIO.OUT)
GPIO.output(LOCK_GPIO_PIN, 1)

# Fingerprint UART
uart = serial.Serial("/dev/ttyAMA0", baudrate=57600, timeout=1)
finger = Adafruit_Fingerprint(uart)

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

def lock_immediately():
    logger.info("Locking immediately")
    GPIO.output(LOCK_GPIO_PIN, 1)
    GPIO.setup(LOCK_GPIO_PIN, GPIO.IN)

def load_encodings():
    global known_face_encodings, known_face_names
    try:
        with open("encodings.pickle", "rb") as f:
            data = pickle.load(f)
            known_face_encodings = data["encodings"]
            known_face_names = data["names"]
            logger.info(f"Loaded {len(known_face_names)} encodings")
    except Exception as e:
        logger.error(f"Encoding load error: {e}")

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
    known_face_encodings[:] = encodings
    known_face_names[:] = names

# Utility to load/save fingerprint map
def load_fingerprint_map():
    if os.path.exists(FINGERPRINT_MAP_FILE):
        with open(FINGERPRINT_MAP_FILE, "r") as f:
            return json.load(f)
    return {}

def save_fingerprint_map(data):
    with open(FINGERPRINT_MAP_FILE, "w") as f:
        json.dump(data, f)

# Update enroll_fingerprint to store mapping
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
        # Save mapping
        fp_map = load_fingerprint_map()
        fp_map[str(new_id)] = name
        save_fingerprint_map(fp_map)
        return jsonify({"status": "success", "message": f"Fingerprint stored with ID {new_id}."})
    return jsonify({"status": "error", "message": "Store failed"}), 500

# Update scan_fingerprint to return matched name
@app.route('/scan_fingerprint', methods=['GET'])
def scan_fingerprint():
    while finger.get_image() != Adafruit_Fingerprint.OK:
        time.sleep(0.5)
    if finger.image_2_tz(1) != Adafruit_Fingerprint.OK:
        return jsonify({"status": "error", "message": "Template failed"}), 500
    if finger.finger_search() == Adafruit_Fingerprint.OK:
        matched_id = finger.finger_id
        confidence = finger.confidence
        fp_map = load_fingerprint_map()
        name = fp_map.get(str(matched_id), "Unknown")
        Thread(target=unlock_lock_for_seconds, args=(5,), daemon=True).start()
        return jsonify({"status": "success", "id": matched_id, "name": name, "confidence": confidence})
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
    if not frames:
        return None
    h, w, _ = frames[0].shape
    path = os.path.join("static/videos", filename)
    out = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*'XVID'), fps, (w, h))
    for f in frames:
        out.write(f)
    out.release()
    return "/" + path

def generate_frames():
    while True:
        if picam2:
            frame = picam2.capture_array()
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            _, buffer = cv2.imencode('.jpg', rgb)
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
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


 