import sys
from pathlib import Path
import cv2
import face_recognition
import numpy as np
from PySide6.QtCore import Qt, QTimer, QDateTime
from PySide6.QtGui import QImage, QPixmap
from PySide6.QtWidgets import (
    QWidget, QLabel, QPushButton, QVBoxLayout, QHBoxLayout, QMessageBox, QLineEdit
)

class FaceRecWidget(QWidget):
    def __init__(self, parent=None, api_client=None, user_store=None):
        super().__init__(parent)
        self.setWindowTitle("Big Brother - Face Recognition & Session Tracker")
        self.resize(900, 750)

        self.api_client = api_client
        self.user_store = user_store

        self.camera_index = 0
        self.video_capture = None
        self.frame_counter = 0
        self.face_locations = []
        self.face_names = []
        self.face_ids = []

        self.session_active_seconds = {}
        self.session_start_time = None
        self.is_session_running = False

        # 1. UI Elements & Status Labels
        self.preview_label = QLabel("Camera feed will appear here")
        self.preview_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.preview_label.setStyleSheet("border: 1px solid #444; background: #111; color: white;")
        self.preview_label.setMinimumSize(640, 480)

        self.status_label = QLabel("Initializing face recognition...")
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.timer_display_label = QLabel("Session Time: 0.00 hrs")
        self.timer_display_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #00aa00;")
        self.timer_display_label.setAlignment(Qt.AlignmentFlag.AlignCenter)

        # 2. Input fields for User ID, Email, and Password
        self.userid_input = QLineEdit()
        self.userid_input.setPlaceholderText("Enter Build Club ID (User ID)")
        if self.user_store and hasattr(self.user_store, 'userID'):
            uid_val = self.user_store.userID.value if hasattr(self.user_store.userID, 'value') else self.user_store.userID
            self.userid_input.setText(str(uid_val))

        self.email_input = QLineEdit()
        self.email_input.setPlaceholderText("Enter Email for Verification")
        if self.user_store and hasattr(self.user_store, 'email'):
            self.email_input.setText(getattr(self.user_store, 'email', ''))

        self.pass_input = QLineEdit()
        self.pass_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.pass_input.setPlaceholderText("Enter Password for Verification")

        cred_layout = QVBoxLayout()
        cred_layout.addWidget(QLabel("User Credentials & ID:"))
        cred_layout.addWidget(self.userid_input)
        cred_layout.addWidget(self.email_input)
        cred_layout.addWidget(self.pass_input)

        self.fetch_faces_btn = QPushButton("Load Faces from Backend")
        self.fetch_faces_btn.clicked.connect(self.fetch_backend_faces)
        cred_layout.addWidget(self.fetch_faces_btn)

        # 3. Action Buttons
        self.start_btn = QPushButton("Start Session / Camera")
        self.start_btn.clicked.connect(self.start_camera_feed)

        self.stop_btn = QPushButton("Stop & Submit Session Data")
        self.stop_btn.clicked.connect(self.stop_and_submit_session)
        self.stop_btn.setStyleSheet("background-color: #d9534f; color: white; font-weight: bold;")

        btn_layout = QHBoxLayout()
        btn_layout.addWidget(self.start_btn)
        btn_layout.addWidget(self.stop_btn)

        # 4. Main Widget Layout Assembly
        layout = QVBoxLayout(self)
        layout.addWidget(self.preview_label)
        layout.addWidget(self.timer_display_label)
        layout.addWidget(self.status_label)
        layout.addLayout(cred_layout)
        layout.addLayout(btn_layout)

        # 5. Timers and Data Lists
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.update_frame)

        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []

        self.session_timer = QTimer(self)
        self.session_timer.timeout.connect(self.track_session_ticks)

        QTimer.singleShot(500, self.start_camera_feed)

    def fetch_backend_faces(self):
        try:
            build_club_id = self.userid_input.text().strip()

            if not build_club_id:
                self.status_label.setText("Warning: Please enter a build_club_id to fetch faces.")
                return

            if self.api_client and hasattr(self.api_client, 'bigbro_get'):
                response = self.api_client.bigbro_get({"build_club_id": build_club_id})
                
                if not response.get("ok"):
                    self.status_label.setText(f"Error: {response.get('error', 'User not found')}")
                    return

                members = response.get("members", [])
                
                self.known_face_encodings.clear()
                self.known_face_names.clear()
                self.known_face_ids.clear()

                for m in members:
                    encoded_data = m.get("encoded_face")
                    if encoded_data:
                        enc_np = np.array(encoded_data, dtype=np.float32).flatten()
                        self.known_face_encodings.append(enc_np)
                        self.known_face_names.append(m.get("name", "Unknown"))
                        
                        user_id = m.get("id") or m.get("uid") or m.get("build_club_id")
                        self.known_face_ids.append(user_id)

                self.status_label.setText(f"Successfully loaded {len(self.known_face_encodings)} face(s) from backend.")
        except Exception as e:
            self.status_label.setText(f"Failed loading backend faces: {e}")

    def start_camera_feed(self):
        if self.video_capture is not None:
            self.video_capture.release()

        for idx in [0, 1, 2, 3]:
            cap = cv2.VideoCapture(idx)
            if cap.isOpened():
                self.video_capture = cap
                self.camera_index = idx
                self.timer.start(1000 // 24)
                
                self.is_session_running = True
                self.session_start_time = QDateTime.currentDateTime()
                self.session_active_seconds.clear()
                self.session_timer.start(1000)

                self.status_label.setText(f"Camera running (Index {idx}). Session started.")
                return

        self.status_label.setText("Error: Unable to open camera feed.")

    def track_session_ticks(self):
        if not self.is_session_running:
            return

        unique_detected_ids = set(self.face_ids)
        for uid in unique_detected_ids:
            self.session_active_seconds[uid] = self.session_active_seconds.get(uid, 0) + 1

        total_sec = sum(self.session_active_seconds.values())
        hours = total_sec / 3600.0
        self.timer_display_label.setText(f"Session Active Time: {hours:.2f} hrs ({total_sec} secs logged)")

    def update_frame(self):
        if self.video_capture is None:
            return

        ret, frame = self.video_capture.read()
        if not ret or frame is None:
            return

        self.frame_counter += 1
        should_process = self.frame_counter % 12 == 0

        if should_process:
            small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
            rgb_small_frame = np.ascontiguousarray(small_frame[:, :, ::-1])

            self.face_locations = face_recognition.face_locations(rgb_small_frame)
            face_encodings = face_recognition.face_encodings(rgb_small_frame, self.face_locations)

            self.face_names = []
            self.face_ids = []

            for face_encoding in face_encodings:
                name = "Unknown"
                matched_id = None
                if self.known_face_encodings:
                    matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding, tolerance=0.6)
                    face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                    
                    if len(face_distances) > 0:
                        best_match_index = int(np.argmin(face_distances))
                        if matches[best_match_index]:
                            name = self.known_face_names[best_match_index]
                            matched_id = self.known_face_ids[best_match_index]

                self.face_names.append(name)
                if matched_id:
                    self.face_ids.append(matched_id)

        scale = 4
        for (top, right, bottom, left), name in zip(self.face_locations, self.face_names):
            top = int(top * scale)
            right = int(right * scale)
            bottom = int(bottom * scale)
            left = int(left * scale)
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 255, 0), cv2.FILLED)
            cv2.putText(frame, name, (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 0, 0), 1)

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        h, w, ch = rgb_frame.shape
        q_img = QImage(rgb_frame.data, w, h, ch * w, QImage.Format.Format_RGB888)
        self.preview_label.setPixmap(QPixmap.fromImage(q_img).scaled(
            self.preview_label.size(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation
        ))

    def stop_and_submit_session(self):
        self.timer.stop()
        self.session_timer.stop()
        self.is_session_running = False

        if self.video_capture is not None:
            self.video_capture.release()
            self.video_capture = None

        build_club_id = self.userid_input.text().strip()
        email = self.email_input.text().strip()
        password = self.pass_input.text().strip()

        if not build_club_id or not email or not password:
            QMessageBox.warning(self, "Missing Fields", "Please enter your Build Club ID, email, and password.")
            return

        if not self.session_active_seconds:
            QMessageBox.information(self, "No Activity", "No recognized user faces were captured during this session.")
            return

        current_active_time = QDateTime.currentDateTime().toMSecsSinceEpoch()

        try:
            success_count = 0
            for uid, sec_duration in self.session_active_seconds.items():
                decimal_hours = round(sec_duration / 3600.0, 2)

                payload = {
                    "build_club_id": build_club_id,
                    "gmail": email,
                    "password": password,
                    "time_logged": decimal_hours,
                    "active_time": current_active_time
                }

                if self.api_client and hasattr(self.api_client, 'bigbro_post'):
                    res = self.api_client.bigbro_post(payload)
                    if res.get("ok"):
                        success_count += 1

            QMessageBox.information(self, "Success", f"Session data successfully posted for user ID: {build_club_id}!")
            self.status_label.setText("Session data submitted successfully.")
        except Exception as e:
            QMessageBox.critical(self, "API Error", f"Failed to post session logs: {e}")
            self.status_label.setText("Failed to submit session data.")

    def closeEvent(self, event):
        if self.video_capture is not None:
            self.video_capture.release()
        super().closeEvent(event)