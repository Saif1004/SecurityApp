from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import face_recognition
import cv2
import numpy as np
import time
import pickle
import os
from datetime import datetime
from threading import Thread

from PyQt5.QtWidgets import QApplication
from picamera2 import Picamera2
from picamera2.previews.qt import QGlPicamera2
from gpiozero import LED, MotionSensor

import sys

flask_app = Flask(__name__)
CORS(flask_app)

# Globals
PI_HARDWARE_AVAILABLE = True
picam2 = None
green_led = None
pir = None
preview = None
qt_app = None

# Load face encodings
known_face_encodings = []
known_face_names = []
try:
    with open("encodings.pickle", "rb") as f:
        data = pickle.loads(f.read())
        known_face_encodings = data["encodings"]
        known_face_names = data["names"]
        print(f"Loaded {len(known_face_names)} known face encodings")
except Exception as e:
    print(f"Face encoding load error: {e}")

# Create folders
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/videos", exist_ok=True)

# MJPEG streaming generator
def generate_frames():
    global picam2
    while True:
        try:
            frame = picam2.capture_array()
            ret, buffer = cv2.imencode('.jpg', frame)
            if not ret:
                continue
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        except Exception as e:
            print(f"[ERROR] Frame generation failed: {e}")
            break

@flask_app.route('/')
def home():
    return 'Security app backend is running'

@flask_app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# Init
def initialize_hardware():
    global picam2, green_led, pir, PI_HARDWARE_AVAILABLE
    try:
        green_led = LED(17)
        pir = MotionSensor(4)
        green_led.off()
        picam2 = Picamera2()
        config = picam2.create_preview_configuration(main={"size": (1280, 720)})
        picam2.configure(config)
        picam2.start()
    except Exception as e:
        print(f"[ERROR] Hardware init failed: {e}")
        PI_HARDWARE_AVAILABLE = False

def start_qt_preview():
    global preview
    try:
        picam2.stop_preview()
    except Exception:
        pass

    try:
        preview = QGlPicamera2(picam2, width=1280, height=720)
        picam2.attach_preview(preview)
        preview.show()
        print("[INFO] Qt preview started successfully.")
    except Exception as e:
        print(f"[ERROR] Qt preview failed: {e}")
        preview = None

# Main
if __name__ == '__main__':
    initialize_hardware()
    if os.getenv("DISPLAY"):
        qt_app = QApplication(sys.argv)
        start_qt_preview()
        flask_thread = Thread(target=lambda: flask_app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False), daemon=True)
        flask_thread.start()
        if preview:
            qt_app.exec_()
        else:
            flask_thread.join()
    else:
        flask_app.run(host="0.0.0.0", port=5000, debug=True)
