import face_recognition
import os

def load_known_faces(known_dir="known_faces"):
    known_encodings = []
    known_names = []

    for filename in os.listdir(known_dir):
        if filename.endswith(".jpg") or filename.endswith(".png"):
            path = os.path.join(known_dir, filename)
            image = face_recognition.load_image_file(path)
            encodings = face_recognition.face_encodings(image)
            if encodings:
                known_encodings.append(encodings[0])
                name = os.path.splitext(filename)[0]
                known_names.append(name)
                print(f"[INFO] Loaded known face: {name}")
            else:
                print(f"[WARN] No face found in {filename}")

    return known_encodings, known_names
