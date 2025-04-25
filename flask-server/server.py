from flask import Flask, Response, jsonify, send_from_directory
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
from collections import deque

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Load encodings
try:
    with open("encodings.pickle", "rb") as f:
        data = pickle.load(f)
        known_face_encodings = data["encodings"]
        known_face_names = data["names"]
        logger.info(f"Loaded {len(known_face_names)} face encodings")
except Exception as e:
    logger.error(f"Encoding load error: {e}")

# Ensure folders exist
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/videos", exist_ok=True)
os.makedirs("static", exist_ok=True)  # for favicon

# Add a basic favicon
with open("static/favicon.ico", "wb") as f:
    f.write(bytes.fromhex(
        "00000100010010101000000000006804000016000000280000001000000020000000010004000000000040000000000000000000000000000000000000000000000000000000000000FFFFFF0000000000"
    ))

# Initialize Pi camera
def initialize_hardware():
    global picam2, PI_HARDWARE_AVAILABLE
    try:
        from picamera2 import Picamera2
        picam2 = Picamera2()
        config = picam2.create_preview_configuration(main={"size": (640, 480)})  # Lowered res for performance
        picam2.configure(config)
        picam2.start()
        logger.info("Camera initialized")
    except Exception as e:
        logger.error(f"Camera init failed: {e}")
        PI_HARDWARE_AVAILABLE = False

# Save video from buffer
def save_video_clip(frames, filename="latest.mp4", fps=10):
    height, width, _ = frames[0].shape
    video_path = os.path.join("static/videos", filename)
    out = cv2.VideoWriter(video_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))
    for frame in frames:
        out.write(frame)
    out.release()
    return f"/static/videos/{filename}"

# MJPEG stream
def generate_frames():
    global last_encoded_frame
    while True:
        try:
            if picam2:
                frame = picam2.capture_array()
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                # Cache latest frame for detection thread
                frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                with detection_lock:
                    frame_buffer.append(frame_bgr)

                # Encode JPEG
                ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 50])
                if ret:
                    last_encoded_frame = buffer.tobytes()
                    yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' +
                           last_encoded_frame + b'\r\n')

            time.sleep(0.1)  # ~10 FPS cap

        except Exception as e:
            logger.error(f"Frame error: {e}")
            time.sleep(1)

# Face detection thread
def detect_faces():
    global latest_detections
    while True:
        if picam2 and PI_HARDWARE_AVAILABLE:
            try:
                frame = picam2.capture_array()
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_bgr = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2BGR)

                with detection_lock:
                    frame_buffer.append(frame_bgr)

                face_locations = face_recognition.face_locations(rgb_frame)
                face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

                current_detections = []
                for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
                    matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.6)
                    name = "Unknown"
                    if True in matches:
                        name = known_face_names[matches.index(True)]

                    timestamp = datetime.now().isoformat()
                    img_filename = f"static/images/{timestamp.replace(':', '-')}.jpg"
                    cv2.imwrite(img_filename, frame_bgr)

                    video_filename = f"{timestamp.replace(':', '-')}.mp4"
                    video_path = save_video_clip(list(frame_buffer), filename=video_filename)

                    current_detections.append({
                        "name": name,
                        "timestamp": timestamp,
                        "image": f"/{img_filename}",
                        "video": video_path
                    })

                with detection_lock:
                    latest_detections = current_detections

            except Exception as e:
                logger.error(f"Detection error: {e}")
        time.sleep(5)

# Routes
@app.route('/')
def home():
    return 'Face Recognition Security System'

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/view')
def view():
    return """
    <html>
      <head><title>Live Feed</title><link rel="icon" href="/favicon.ico" /></head>
      <body style="margin:0; padding:0; background:black;">
        <img src="/video_feed" style="width:100%; height:auto;" />
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

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    return response

# Start
if __name__ == '__main__':
    initialize_hardware()
    Thread(target=detect_faces, daemon=True).start()
    app.run(host='0.0.0.0', port=5000, threaded=True)
