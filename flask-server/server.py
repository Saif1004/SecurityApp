from flask import Flask, jsonify
from flask_cors import CORS
import face_recognition
import cv2
import numpy as np
import time
import pickle
import sqlite3
from datetime import datetime
import os
import base64
import subprocess

try:
    from picamera2 import Picamera2
    from gpiozero import LED, MotionSensor
    PI_HARDWARE_AVAILABLE = True
except ImportError:
    print("[WARNING] Pi camera or GPIO modules not found. Running in mock mode.")
    PI_HARDWARE_AVAILABLE = False

app = Flask(__name__)
CORS(app)

if PI_HARDWARE_AVAILABLE:
    green_led = LED(17)
    pir = MotionSensor(4)
    green_led.off()
else:
    green_led = None
    pir = None

print("[INFO] Loading face encodings...")
with open("../encodings.pickle", "rb") as f:
    data = pickle.loads(f.read())
known_face_encodings = data["encodings"]
known_face_names = data["names"]


if PI_HARDWARE_AVAILABLE:
    picam2 = Picamera2()
    picam2.configure(picam2.create_preview_configuration(main={"format": 'XRGB8888', "size": (1280, 720)}))
    picam2.start()
else:
    picam2 = None

cv_scaler = 4
prev_detected_names = set()

def image_to_base64(image):
    _, buffer = cv2.imencode('.jpg', image)
    return base64.b64encode(buffer).decode('utf-8')

def detect():
    global prev_detected_names

    if PI_HARDWARE_AVAILABLE:
        pir.wait_for_motion()
        print("Motion Detected")
        green_led.on()
    else:
        print("[MOCK] Simulating motion detection...")

    detected_faces_data = []

    if PI_HARDWARE_AVAILABLE:
        while pir.motion_detected:
            frame = picam2.capture_array()
            resized_frame = cv2.resize(frame, (0, 0), fx=(1 / cv_scaler), fy=(1 / cv_scaler))
            rgb_resized_frame = cv2.cvtColor(resized_frame, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb_resized_frame)
            face_encodings = face_recognition.face_encodings(rgb_resized_frame, face_locations, model='large')

            face_names = []
            for face_encoding in face_encodings:
                matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
                name = "Unknown"
                face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = known_face_names[best_match_index]

                face_names.append(name)

            detected_set = set(face_names)
            if detected_set != prev_detected_names:
                prev_detected_names = detected_set

                base64_image = image_to_base64(frame)

                for name in face_names:
                    detected_faces_data.append({
                        "name": name,
                        "timestamp": datetime.now().strftime("%H:%M:%S"),
                        "image": base64_image
                    })

                break

        green_led.off()
        print("Motion Stopped")

    else:
        dummy_image = np.zeros((720, 1280, 3), dtype=np.uint8)
        base64_image = image_to_base64(dummy_image)
        detected_faces_data = [{
            "name": "Mock Person",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "image": base64_image
        }]

    return detected_faces_data if detected_faces_data else [{
        "name": "No Face Detected",
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "image": ""
    }]

def record_motion_clip():
    video_path = f"static/videos/motion_{int(time.time())}.mp4"
    if PI_HARDWARE_AVAILABLE:
        command = [
            "ffmpeg",
            "-t", "10",
            "-f", "v4l2",
            "-i", "/dev/video0",
            "-vcodec", "libx264",
            "-preset", "ultrafast",
            video_path
        ]
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        with open(video_path, "w") as f:
            f.write("Mock video content")
    return video_path

@app.route('/detect', methods=['GET'])
def detect_motion():
    try:
        detected_faces = detect()
        video_path = record_motion_clip()
        video_url = f"http://127.0.0.1:5000/{video_path}"  # <-- Replace with actual IP or domain

        alert_data = [
            {
                "name": face["name"],
                "image": face["image"],
                "timestamp": face["timestamp"],
                "video": video_url
            }
            for face in detected_faces
        ]

        return jsonify({"status": "success", "detected_faces": alert_data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
