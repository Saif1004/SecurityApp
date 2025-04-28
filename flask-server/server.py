from flask import Flask, Response, jsonify, request, send_from_directory
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
import logging
from collections import deque

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Globals
PI_HARDWARE_AVAILABLE = True
picam2 = None
known_face_encodings = []
known_face_names = []
detection_lock = Lock()
latest_detections = []
frame_buffer = deque(maxlen=100)
last_encoded_frame = None

# Solenoid Lock GPIO setup
LOCK_GPIO_PIN = 16
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)
GPIO.setup(LOCK_GPIO_PIN, GPIO.OUT)
GPIO.output(LOCK_GPIO_PIN, 1)  # LOW = LOCKED at startup

# Push notifications
EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'
EXPO_DEVICE_PUSH_TOKEN = None

# Load known faces
try:
    with open("encodings.pickle", "rb") as f:
        data = pickle.load(f)
        known_face_encodings = data["encodings"]
        known_face_names = data["names"]
        logger.info(f"Loaded {len(known_face_names)} face encodings")
except Exception as e:
    logger.error(f"Encoding load error: {e}")

# Ensure folders
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/videos", exist_ok=True)
os.makedirs("static", exist_ok=True)

# Camera setup
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

# Solenoid Lock control
def unlock_lock_for_seconds(seconds=5):
    logger.info(f"Unlocking lock for {seconds} seconds")
    GPIO.output(LOCK_GPIO_PIN, 0)  # HIGH = UNLOCK
    time.sleep(seconds)
    GPIO.output(LOCK_GPIO_PIN, 1)  # LOW = LOCK
    logger.info("Lock re-locked")

def lock_immediately():
    logger.info("Locking door immediately")
    GPIO.output(LOCK_GPIO_PIN, 1)  # LOW = LOCK

# Save video
def save_video_clip(frames, filename="latest.mp4", fps=10):
    height, width, _ = frames[0].shape
    video_path = os.path.join("static/videos", filename)
    out = cv2.VideoWriter(video_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))
    for frame in frames:
        out.write(frame)
    out.release()
    return f"/static/videos/{filename}"

# Motion Detection
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
                    motion_area = cv2.countNonZero(thresh)

                    if motion_area > 800:
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
                        latest_detections = [detection_entry] + latest_detections
                        latest_detections = latest_detections[:50]

                    logger.info(f"Motion detected at {timestamp} (cooldown applied)")

            except Exception as e:
                logger.error(f"Motion detection error: {e}")

        time.sleep(0.5)

# Face Recognition
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
                        first_match_index = matches.index(True)
                        name = known_face_names[first_match_index]

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

# Push Notification
def send_push_notification(expo_push_token, alert):
    message = {
        'to': expo_push_token,
        'sound': 'default',
        'title': f'{alert["name"]} Detected!',
        'body': f"At {alert['timestamp']}",
        'data': alert
    }
    try:
        requests.post(EXPO_PUSH_ENDPOINT, json=message)
        logger.info("Push notification sent")
    except Exception as e:
        logger.error(f"Push notification error: {e}")

# Routes
@app.route('/')
def home():
    return 'Face & Motion Detection System'

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/view')
def view():
    return """
    <html>
      <head>
        <title>Live Feed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" href="/favicon.ico" />
        <style>
          body, html { margin: 0; padding: 0; background: black; height: 100%; width: 100%; display: flex; justify-content: center; align-items: center; }
          img { max-width: 100%; max-height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <img src="/video_feed" />
      </body>
    </html>
    """

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/detect', methods=['GET'])
def get_detections():
    with detection_lock:
        return jsonify({"status": "success", "detected_faces": latest_detections})

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
    Thread(target=unlock_lock_for_seconds, args=(5,), daemon=True).start()
    return jsonify({"status": "success", "message": "Door unlocked"})

@app.route('/lock', methods=['POST'])
def lock_door():
    logger.info("Manual lock triggered")
    GPIO.output(LOCK_GPIO_PIN, 1)  # HIGH for 0.2s
    time.sleep(0.2)
    GPIO.output(LOCK_GPIO_PIN, 0)  # LOW to stay locked
    return jsonify({"status": "success", "message": "Door locked"})


# Stream frames
def generate_frames():
    global last_encoded_frame
    while True:
        try:
            if picam2:
                frame = picam2.capture_array()
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                with detection_lock:
                    frame_buffer.append(frame_bgr)
                ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 50])
                if ret:
                    last_encoded_frame = buffer.tobytes()
                    yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + last_encoded_frame + b'\r\n')
            time.sleep(0.05)
        except Exception as e:
            logger.error(f"Frame error: {e}")
            time.sleep(1)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    return response

# Main
if __name__ == '__main__':
    initialize_hardware()
    Thread(target=detect_motion, daemon=True).start()
    Thread(target=detect_faces, daemon=True).start()
    app.run(host='0.0.0.0', port=5000, threaded=True)
