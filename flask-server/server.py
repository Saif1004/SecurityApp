from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import face_recognition
import cv2
import numpy as np
import time
import pickle
import os
from datetime import datetime
from threading import Thread, Lock
import logging
from werkzeug.serving import make_server

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={
    r"/detect": {"origins": "*"},
    r"/video_feed": {"origins": "*"}
})

# Global variables
PI_HARDWARE_AVAILABLE = True
picam2 = None
known_face_encodings = []
known_face_names = []
detection_lock = Lock()
latest_detections = []

# Load face encodings
try:
    with open("encodings.pickle", "rb") as f:
        data = pickle.load(f)
        known_face_encodings = data["encodings"]
        known_face_names = data["names"]
        logger.info(f"Loaded {len(known_face_names)} known face encodings")
except Exception as e:
    logger.error(f"Face encoding load error: {e}")

# Create folders
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/videos", exist_ok=True)

def initialize_hardware():
    global picam2, PI_HARDWARE_AVAILABLE
    try:
        from picamera2 import Picamera2
        picam2 = Picamera2()
        config = picam2.create_preview_configuration(main={"size": (1280, 720)})
        picam2.configure(config)
        picam2.start()
        logger.info("Camera initialized successfully")
    except Exception as e:
        logger.error(f"Hardware initialization failed: {e}")
        PI_HARDWARE_AVAILABLE = False

def generate_frames():
    while True:
        with detection_lock:
            try:
                if picam2:
                    frame = picam2.capture_array()
                    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    ret, buffer = cv2.imencode('.jpg', frame)
                    if not ret:
                        continue
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            except Exception as e:
                logger.error(f"Frame generation error: {e}")
                time.sleep(1)

def detect_faces():
    global latest_detections
    while True:
        if picam2 and PI_HARDWARE_AVAILABLE:
            try:
                frame = picam2.capture_array()
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                face_locations = face_recognition.face_locations(rgb_frame)
                face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
                
                current_detections = []
                for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
                    matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.6)
                    name = "Unknown"
                    
                    if True in matches:
                        first_match_index = matches.index(True)
                        name = known_face_names[first_match_index]
                    
                    timestamp = datetime.now().isoformat()
                    img_filename = f"static/images/{timestamp.replace(':', '-')}.jpg"
                    cv2.imwrite(img_filename, cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2BGR))
                    
                    current_detections.append({
                        "name": name,
                        "timestamp": timestamp,
                        "image": f"/{img_filename}",
                        "video": "/static/videos/latest.mp4"
                    })
                
                with detection_lock:
                    latest_detections = current_detections
                
            except Exception as e:
                logger.error(f"Face detection error: {e}")
        time.sleep(5)

@app.route('/')
def home():
    return 'Face Recognition Security System'

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/detect', methods=['GET'])
def get_detections():
    with detection_lock:
        return jsonify({
            "status": "success",
            "detected_faces": latest_detections
        })

@app.after_request
def after_request(response):
    response.headers.add('Content-Type', 'application/json')
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    return response

if __name__ == '__main__':
    initialize_hardware()
    
    # Start face detection thread
    detection_thread = Thread(target=detect_faces, daemon=True)
    detection_thread.start()
    
    # Start Flask server
    app.run(host='0.0.0.0', port=5000, threaded=True)