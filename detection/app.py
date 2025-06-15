from flask import Flask, Response, jsonify, send_from_directory, request
from flask_cors import CORS
from ultralytics import YOLO
import cv2, os, time, json
from datetime import datetime
import numpy as np
from threading import Thread
from shapely.geometry import Polygon, Point
from utils.alerts import send_email_alert, send_sms_alert
import firebase_admin
from firebase_admin import credentials, auth
from functools import wraps
from deepface import DeepFace

# Firebase Admin SDK setup
cred = credentials.Certificate("firebase-adminsdk.json")
firebase_admin.initialize_app(cred)

app = Flask(__name__)
CORS(app)

def verify_firebase_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Missing Authorization Header"}), 401

        token = auth_header.split("Bearer ")[-1]
        try:
            decoded_token = auth.verify_id_token(token)
            request.user = decoded_token
        except Exception as e:
            print("Token verification failed:", e)
            return jsonify({"error": "Invalid or expired token"}), 401

        return f(*args, **kwargs)
    return decorated

model = YOLO("yolov8n.pt")
with open("roi_config/roi.json") as f:
    roi_coords = json.load(f)["roi"]
roi_polygon = Polygon(roi_coords)

camera = cv2.VideoCapture(0)
snapshot_dir = "snapshots"
known_faces_dir = "detection/known_faces"
os.makedirs(snapshot_dir, exist_ok=True)
intrusion_flag = False
last_intrusion_time = 0

def save_snapshot(frame):
    timestamp = datetime.now()
    timestamp_str = timestamp.strftime('%Y-%m-%d %H:%M:%S')
    filename = f"intrusion_{timestamp.strftime('%Y%m%d_%H%M%S')}.jpg"
    path = os.path.join(snapshot_dir, filename)
    cv2.putText(frame, timestamp_str, (10, frame.shape[0] - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    cv2.imwrite(path, frame)
    return path, timestamp_str, filename

def is_known_face(face_img, threshold=0.4):
    temp_path = "temp_face.jpg"
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    known_faces_dir = os.path.join(BASE_DIR, "known_faces")

    cv2.imwrite(temp_path, face_img)
    
    for filename in os.listdir(known_faces_dir):
        known_path = os.path.join(known_faces_dir, filename)
        try:
            result = DeepFace.verify(img1_path=temp_path, img2_path=known_path, enforce_detection=False)
            if result["verified"] and result["distance"] < threshold:
                print(f"Matched with {filename}")
                return True
        except Exception as e:
            print("DeepFace error:", e)
            continue
    
    return False


def detect_and_annotate(frame):
    global intrusion_flag, last_intrusion_time

    results = model(frame)[0]
    annotated_frame = results.plot()

    for box in results.boxes.data:
        cls = int(box[5])
        if cls == 0:  # person class
            x1, y1, x2, y2 = map(int, box[:4])
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            if roi_polygon.contains(Point(cx, cy)):
                person_crop = frame[y1:y2, x1:x2]
                whitelisted = is_known_face(person_crop)

                if not whitelisted and (time.time() - last_intrusion_time > 10):
                    intrusion_flag = True
                    last_intrusion_time = time.time()

                    path, ts, _ = save_snapshot(annotated_frame)
                    print(f"[ALERT] Intrusion detected at {ts}")
                    send_email_alert("Intrusion Detected", f"Intruder detected at {ts}", path)
                    send_sms_alert(f"[ALERT] Intrusion at {ts}")

                if whitelisted:
                    cv2.putText(annotated_frame, "Whitelisted", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 2)

                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.circle(annotated_frame, (cx, cy), 5, (0, 0, 255), -1)

    cv2.polylines(annotated_frame, [np.array(roi_coords, dtype=np.int32)], True, (0, 255, 0), 2)
    return annotated_frame

def generate_frames():
    while True:
        success, frame = camera.read()
        if not success:
            print("❌ Failed to read from camera.")
            break
        frame = detect_and_annotate(frame)
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

def event_stream():
    while True:
        if intrusion_flag and time.time() - last_intrusion_time < 5:
            yield "data: intrusion\\n\\n"
        else:
            yield "data: clear\\n\\n"
        time.sleep(1)

@app.route("/")
def index():
    return "Intrusion Detection Backend Running."

@app.route("/video_feed")
def video_feed():
    return Response(generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/events")
def sse():
    return Response(event_stream(), mimetype="text/event-stream")

@app.route("/snapshots")
@verify_firebase_token
def list_snapshots():
    date_filter = request.args.get("date")
    files = sorted([f for f in os.listdir(snapshot_dir) if f.endswith(".jpg")], reverse=True)
    response = []

    for f in files:
        try:
            parts = f.split("_")
            if len(parts) < 3:
                continue
            date_part = parts[1]
            time_part = parts[2].split(".")[0]
            timestamp_str = f"{date_part}_{time_part}"
            timestamp = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
            date_str = timestamp.strftime("%Y-%m-%d")

            if date_filter and date_filter != date_str:
                continue

            response.append({
                "url": f"/snapshots/{f}",
                "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S")
            })
        except Exception as e:
            print(f"Skipping invalid file {f}: {e}")

    return jsonify(response)

@app.route("/snapshots/<filename>")
def get_snapshot(filename):
    return send_from_directory(snapshot_dir, filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
