# server.py
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

# Setup
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

# GPIO Setup
LOCK_GPIO_PIN = 18
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)
GPIO.setup(LOCK_GPIO_PIN, GPIO.OUT)
GPIO.output(LOCK_GPIO_PIN, 1)

# Directories
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/videos", exist_ok=True)
os.makedirs("dataset", exist_ok=True)

# Push Notifications
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

# Camera
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

# Lock control
def unlock_lock_for_seconds(seconds=5):
    logger.info("Unlocking lock")
    GPIO.output(LOCK_GPIO_PIN, 0)
    time.sleep(seconds)
    GPIO.output(LOCK_GPIO_PIN, 1)
    logger.info("Lock re-engaged")

def lock_immediately():
    GPIO.output(LOCK_GPIO_PIN, 1)
    logger.info("Lock forced")

# Video Save
def save_video_clip(frames, filename="latest.mp4", fps=10):
    height, width, _ = frames[0].shape
    path = os.path.join("static/videos", filename)
    out = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))
    for frame in frames:
        out.write(frame)
    out.release()
    time.sleep(0.2)
    return f"/static/videos/{filename}" if os.path.exists(path) else None

# Motion Detection
def detect_motion():
    last_frame_gray = None
    last_motion_time = 0
    cooldown = 10

    while True:
        if picam2 and PI_HARDWARE_AVAILABLE:
            try:
                frame = picam2.capture_array()
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
                with detection_lock:
                    frame_buffer.append(bgr)

                motion = False
                if last_frame_gray is not None:
                    diff = cv2.absdiff(last_frame_gray, gray)
                    _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)
                    if cv2.countNonZero(thresh) > 800:
                        motion = True
                last_frame_gray = gray

                if motion and (time.time() - last_motion_time) > cooldown:
                    last_motion_time = time.time()
                    timestamp = datetime.now().isoformat()
                    img_file = f"static/images/{timestamp.replace(':', '-')}.jpg"
                    video_file = f"{timestamp.replace(':', '-')}.mp4"

                    cv2.imwrite(img_file, bgr)
                    video_path = save_video_clip(list(frame_buffer), filename=video_file)

                    if not video_path:
                        logger.warning("Video save failed, skipping detection entry")
                        continue

                    detection = {
                        "name": "Motion Detected",
                        "timestamp": timestamp,
                        "image": f"/{img_file}",
                        "video": video_path
                    }

                    with detection_lock:
                        latest_detections.insert(0, detection)
                        latest_detections[:] = latest_detections[:50]
                    logger.info(f"Motion detected at {timestamp}")
            except Exception as e:
                logger.error(f"Motion detection error: {e}")
        time.sleep(0.5)

# Face Detection
def detect_faces():
    while True:
        if picam2 and PI_HARDWARE_AVAILABLE:
            try:
                frame = picam2.capture_array()
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                locs = face_recognition.face_locations(rgb)
                encs = face_recognition.face_encodings(rgb, locs)

                for (top, right, bottom, left), enc in zip(locs, encs):
                    matches = face_recognition.compare_faces(known_face_encodings, enc, tolerance=0.5)
                    name = "Unknown"
                    if True in matches:
                        name = known_face_names[matches.index(True)]

                    timestamp = datetime.now().isoformat()
                    img_file = f"static/images/{timestamp.replace(':', '-')}.jpg"
                    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
                    cv2.imwrite(img_file, bgr)

                    logger.info(f"Face detected: {name}")
                    if name != "Unknown":
                        Thread(target=unlock_lock_for_seconds, daemon=True).start()

                    if EXPO_DEVICE_PUSH_TOKEN:
                        send_push_notification(EXPO_DEVICE_PUSH_TOKEN, {
                            "name": name,
                            "timestamp": timestamp,
                            "image": f"/{img_file}",
                            "video": None
                        })

            except Exception as e:
                logger.error(f"Face detection error: {e}")
        time.sleep(2)

# Push Notification
def send_push_notification(token, alert):
    payload = {
        'to': token,
        'sound': 'default',
        'title': f'{alert["name"]} Detected!',
        'body': f'At {alert["timestamp"]}',
        'data': alert
    }
    try:
        requests.post(EXPO_PUSH_ENDPOINT, json=payload)
        logger.info("Push sent")
    except Exception as e:
        logger.error(f"Push failed: {e}")

# Routes
@app.route('/')
def home():
    return 'Face & Motion Detection Server Running'

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/static/videos/<path:filename>')
def serve_video(filename):
    return send_file(os.path.join("static/videos", filename), mimetype='video/mp4')

@app.route('/users')
def list_users():
    users = {}
    for person in os.listdir('dataset'):
        path = os.path.join('dataset', person)
        if os.path.isdir(path):
            users[person] = [f"/dataset/{person}/{f}" for f in os.listdir(path)]
    return jsonify(users)

@app.route('/detect')
def get_detections():
    with detection_lock:
        return jsonify({"status": "success", "detected_faces": latest_detections})

@app.route('/delete_user/<name>', methods=['DELETE'])
def delete_user(name):
    path = os.path.join("dataset", name)
    if not os.path.exists(path):
        return jsonify({"status": "error", "message": "User not found"}), 404
    for file in os.listdir(path):
        os.remove(os.path.join(path, file))
    os.rmdir(path)
    Thread(target=retrain_encodings, daemon=True).start()
    return jsonify({"status": "success", "message": f"User {name} deleted."})

@app.route('/register_token', methods=['POST'])
def register_token():
    global EXPO_DEVICE_PUSH_TOKEN
    token = request.get_json().get('token')
    if not token:
        return jsonify({"status": "error", "message": "No token"}), 400
    EXPO_DEVICE_PUSH_TOKEN = token
    return jsonify({"status": "success", "message": "Token registered"})

@app.route('/unlock', methods=['POST'])
def unlock_door():
    Thread(target=unlock_lock_for_seconds, daemon=True).start()
    return jsonify({"status": "success", "message": "Unlocked"})

@app.route('/lock', methods=['POST'])
def lock_door():
    lock_immediately()
    return jsonify({"status": "success", "message": "Locked"})

@app.route('/register_face', methods=['POST'])
def register_face():
    name = request.form.get('name')
    files = request.files.getlist('images')
    if not name or not files:
        return jsonify({"status": "error", "message": "Missing data"}), 400
    folder = os.path.join("dataset", name)
    os.makedirs(folder, exist_ok=True)
    for file in files:
        filename = f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S%f')}.jpg"
        file.save(os.path.join(folder, filename))
    Thread(target=retrain_encodings, daemon=True).start()
    return jsonify({"status": "success", "message": "Images saved"})

# Retrain
def retrain_encodings():
    try:
        paths_list = list(paths.list_images("dataset"))
        encodings, names = [], []
        for path in paths_list:
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
        known_face_encodings = encodings
        known_face_names = names
        logger.info("Encodings retrained")
    except Exception as e:
        logger.error(f"Retraining failed: {e}")

# Frame Generator
def generate_frames():
    while True:
        try:
            if picam2:
                frame = picam2.capture_array()
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                _, buffer = cv2.imencode('.jpg', rgb)
                if buffer is not None:
                    yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.05)
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            time.sleep(1)

# Start
if __name__ == '__main__':
    initialize_hardware()
    Thread(target=detect_motion, daemon=True).start()
    Thread(target=detect_faces, daemon=True).start()
    app.run(host='0.0.0.0', port=5000)
