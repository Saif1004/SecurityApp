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

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
os.makedirs("static/videos", exist_ok=True)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Global variables
PI_HARDWARE_AVAILABLE = True
picam2 = None
known_face_encodings = []
known_face_names = []
detection_lock = Lock()
latest_detections = []
frame_buffer = deque(maxlen=100)
last_encoded_frame = None

# GPIO Setup
LOCK_GPIO_PIN = 18
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)
GPIO.setup(LOCK_GPIO_PIN, GPIO.OUT)
GPIO.output(LOCK_GPIO_PIN, 1)

EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'
EXPO_DEVICE_PUSH_TOKEN = None

try:
    with open("encodings.pickle", "rb") as f:
        data = pickle.load(f)
        known_face_encodings = data["encodings"]
        known_face_names = data["names"]
        logger.info(f"Loaded {len(known_face_names)} encodings")
except Exception as e:
    logger.error(f"Encoding load error: {e}")

os.makedirs("static/images", exist_ok=True)
os.makedirs("static/videos", exist_ok=True)
os.makedirs("dataset", exist_ok=True)

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
    GPIO.setup(LOCK_GPIO_PIN, GPIO.OUT)
    GPIO.output(LOCK_GPIO_PIN, 0)
    time.sleep(seconds)
    GPIO.output(LOCK_GPIO_PIN, 1)
    GPIO.setup(LOCK_GPIO_PIN, GPIO.IN)
    logger.info("Lock re-locked and pin set to INPUT")

def lock_immediately():
    logger.info("Locking immediately")
    GPIO.setup(LOCK_GPIO_PIN, GPIO.OUT)
    GPIO.output(LOCK_GPIO_PIN, 1)
    GPIO.setup(LOCK_GPIO_PIN, GPIO.IN)
    logger.info("Lock set to HIGH and pin set to INPUT")

def save_video_clip(frames, filename="latest.avi", fps=10):
    try:
        height, width, _ = frames[0].shape
        video_path = os.path.join("static/videos", filename)
        out = cv2.VideoWriter(video_path, cv2.VideoWriter_fourcc(*'XVID'), fps, (width, height))
        for frame in frames:
            out.write(frame)
        out.release()
        time.sleep(0.2)
        if os.path.exists(video_path):
            logger.info(f"Video saved: {video_path}")
            return f"/static/videos/{filename}"
        else:
            logger.error(f"File does not exist after saving: {video_path}")
            return None
    except Exception as e:
        logger.error(f"Error saving video: {e}")
        return None



def detect_motion():
    global latest_detections
    last_frame_gray = None
    last_motion_time = 0
    cooldown_seconds = 10
    while True:
        if picam2 and PI_HARDWARE_AVAILABLE:
            try:
                frame = picam2.capture_array()
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                frame_bgr = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2BGR)
                with detection_lock:
                    frame_buffer.append(frame_bgr)
                motion_detected = False
                if last_frame_gray is not None:
                    frame_diff = cv2.absdiff(last_frame_gray, gray_frame)
                    _, thresh = cv2.threshold(frame_diff, 30, 255, cv2.THRESH_BINARY)
                    if cv2.countNonZero(thresh) > 800:
                        motion_detected = True
                last_frame_gray = gray_frame
                now = time.time()
                if motion_detected and (now - last_motion_time) > cooldown_seconds:
                    last_motion_time = now
                    timestamp = datetime.now().isoformat()
                    img_filename = f"static/images/{timestamp.replace(':', '-')}.jpg"
                    cv2.imwrite(img_filename, frame_bgr)
                    video_filename = f"{timestamp.replace(':', '-')}.mp4"
                    video_path = save_video_clip(list(frame_buffer), filename=video_filename)
                    detection_entry = {
                        "name": "Motion Detected",
                        "timestamp": timestamp,
                        "image": f"/{img_filename}",
                        "video": video_path
                    }
                    with detection_lock:
                        latest_detections = [detection_entry] + latest_detections[:49]
                    logger.info(f"Motion detected at {timestamp}")
            except Exception as e:
                logger.error(f"Motion detection error: {e}")
        time.sleep(0.5)

def detect_faces():
    while True:
        if picam2 and PI_HARDWARE_AVAILABLE:
            try:
                frame = picam2.capture_array()
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                face_locations = face_recognition.face_locations(rgb_frame)
                face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
                for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
                    matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.5)
                    name = "Unknown"
                    if True in matches:
                        name = known_face_names[matches.index(True)]
                    timestamp = datetime.now().isoformat()
                    img_filename = f"static/images/{timestamp.replace(':', '-')}.jpg"
                    frame_bgr = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2BGR)
                    cv2.imwrite(img_filename, frame_bgr)
                    logger.info(f"Face detected: {name} at {timestamp}")
                    if name != "Unknown":
                        Thread(target=unlock_lock_for_seconds, args=(5,), daemon=True).start()
                    if EXPO_DEVICE_PUSH_TOKEN:
                        detection_entry = {
                            "name": name,
                            "timestamp": timestamp,
                            "image": f"/{img_filename}",
                            "video": None
                        }
                        send_push_notification(EXPO_DEVICE_PUSH_TOKEN, detection_entry)
            except Exception as e:
                logger.error(f"Face detection error: {e}")
        time.sleep(2)

def send_push_notification(token, alert):
    message = {
        'to': token,
        'sound': 'default',
        'title': f'{alert["name"]} Detected!',
        'body': f"At {alert['timestamp']}",
        'data': alert
    }
    try:
        requests.post(EXPO_PUSH_ENDPOINT, json=message)
        logger.info("Push notification sent")
    except Exception as e:
        logger.error(f"Push error: {e}")

@app.route('/static/videos/<path:filename>')
def serve_video(filename):
    return send_file(os.path.join("static/videos", filename), mimetype='video/x-msvideo')


@app.route('/')
def home():
    return 'Face & Motion Detection Server Running'

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/view')
def view():
    return """
    <html><head><link rel='icon' href='/favicon.ico' /></head>
    <body style="margin:0;background:#fff;">
    <img src="/video_feed" style="width:100vw;height:100vh;object-fit:contain;" />
    </body></html>
    """

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

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

@app.route('/detect', methods=['GET'])
def get_detections():
    with detection_lock:
        return jsonify({"status": "success", "detected_faces": latest_detections})

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

@app.route('/register_face', methods=['POST'])
def register_face():
    name = request.form.get('name')
    files = request.files.getlist('images')
    if not name or not files:
        return jsonify({"status": "error", "message": "Name and images required"}), 400
    folder = os.path.join("dataset", name)
    os.makedirs(folder, exist_ok=True)
    for file in files:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S%f")
        path = os.path.join(folder, f"{name}_{timestamp}.jpg")
        file.save(path)
    Thread(target=retrain_encodings, daemon=True).start()
    return jsonify({"status": "success", "message": f"{len(files)} images saved. Training started."})

@app.route('/capture_face', methods=['POST'])
def capture_face():
    name = request.form.get('name')
    if not name:
        return jsonify({"status": "error", "message": "Name is required"}), 400
    try:
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
        return jsonify({"status": "success", "message": f"Photo captured and saved as {filename}."})
    except Exception as e:
        logger.error(f"Capture error: {e}")
        return jsonify({"status": "error", "message": "Failed to capture image"}), 500

def retrain_encodings():
    try:
        logger.info("Retraining encodings...")
        imagePaths = list(paths.list_images("dataset"))
        encodings = []
        names = []
        for path in imagePaths:
            name = path.split(os.path.sep)[-2]
            image = cv2.imread(path)
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            boxes = face_recognition.face_locations(rgb, model="hog")
            for enc in face_recognition.face_encodings(rgb, boxes):
                encodings.append(enc)
                names.append(name)
        data = {"encodings": encodings, "names": names}
        with open("encodings.pickle", "wb") as f:
            pickle.dump(data, f)
        global known_face_encodings, known_face_names
        known_face_encodings = data["encodings"]
        known_face_names = data["names"]
        logger.info("Retraining complete")
    except Exception as e:
        logger.error(f"Retraining failed: {e}")

def generate_frames():
    global last_encoded_frame
    while True:
        try:
            if picam2:
                frame = picam2.capture_array()
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
                with detection_lock:
                    frame_buffer.append(frame_bgr)
                ret, buffer = cv2.imencode('.jpg', frame_rgb, [int(cv2.IMWRITE_JPEG_QUALITY), 50])
                if ret:
                    last_encoded_frame = buffer.tobytes()
                    yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + last_encoded_frame + b'\r\n')
            time.sleep(0.05)
        except Exception as e:
            logger.error(f"Frame generation error: {e}")
            time.sleep(1)

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
