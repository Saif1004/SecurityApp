from flask import Flask, jsonify, request
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
from libcamera import controls

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
prev_detected_names = set()

CV_SCALER = 4
MOTION_TIMEOUT = 5

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

# ... [save_image, detect_faces, detect, record_motion_clip, and routes unchanged]

# Start everything
def initialize_hardware():
    global picam2, green_led, pir, PI_HARDWARE_AVAILABLE

    try:
        green_led = LED(17)
        pir = MotionSensor(4)
        green_led.off()

        picam2 = Picamera2()
        config = picam2.create_preview_configuration(
            main={"size": (1280, 720)},
        )
        picam2.configure(config)
        picam2.start()

    except Exception as e:
        print(f"[ERROR] Hardware init failed: {e}")
        PI_HARDWARE_AVAILABLE = False

def start_qt_preview():
    global preview

    try:
        # Detach any existing preview
        picam2.stop_preview()
    except Exception as e:
        print(f"[WARN] Could not stop previous preview: {e}")

    try:
        preview = QGlPicamera2(picam2, width=1280, height=720)
        picam2.attach_preview(preview)
        preview.show()
        print("[INFO] Qt preview started successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to start Qt preview: {e}")
        preview = None

@flask_app.route('/')
def home():
    return 'Security app backend is running'

@flask_app.route('/favicon.ico')
def favicon():
    return '', 204

# Main
if __name__ == '__main__':
    initialize_hardware()

    if os.getenv("DISPLAY"):
        qt_app = QApplication(sys.argv)

        start_qt_preview()  # <== Robust preview handler

        flask_thread = Thread(target=lambda: flask_app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False), daemon=True)
        flask_thread.start()

        if preview:
            qt_app.exec_()
        else:
            print("[INFO] Preview failed, but continuing with Flask only.")
            flask_thread.join()
    else:
        print("[INFO] No DISPLAY detected, skipping Qt preview.")
        flask_app.run(host="0.0.0.0", port=5000, debug=True)

