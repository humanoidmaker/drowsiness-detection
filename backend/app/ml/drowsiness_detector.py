import cv2
import numpy as np
import mediapipe as mp
from enum import Enum
from typing import Optional
from datetime import datetime, timezone
import time


class AlertLevel(str, Enum):
    ALERT = "ALERT"
    DROWSY = "DROWSY"
    SLEEPING = "SLEEPING"
    YAWNING = "YAWNING"


class DrowsinessDetector:
    """Drowsiness detection using MediaPipe Face Mesh (468 landmarks).

    Monitors:
    - Eye Aspect Ratio (EAR): ratio of vertical to horizontal eye opening
    - Mouth Aspect Ratio (MAR): lip opening ratio for yawn detection
    - Head Pose: pitch angle from face landmarks (nodding = drowsy)
    """

    # Face Mesh landmark indices for eyes
    # Right eye
    RIGHT_EYE = [33, 160, 158, 133, 153, 144]  # p1, p2, p3, p4, p5, p6
    # Left eye
    LEFT_EYE = [362, 385, 387, 263, 373, 380]   # p1, p2, p3, p4, p5, p6

    # Mouth landmarks for MAR
    UPPER_LIP = [13]
    LOWER_LIP = [14]
    LEFT_MOUTH = [78]
    RIGHT_MOUTH = [308]
    UPPER_LIP_TOP = [12]
    LOWER_LIP_BOTTOM = [15]

    # Head pose landmarks
    NOSE_TIP = 1
    CHIN = 152
    LEFT_EYE_CORNER = 263
    RIGHT_EYE_CORNER = 33
    LEFT_MOUTH_CORNER = 287
    RIGHT_MOUTH_CORNER = 57

    # Thresholds
    EAR_DROWSY = 0.25
    EAR_SLEEPING = 0.20
    MAR_YAWN = 0.6
    DROWSY_TIME = 2.0    # seconds with low EAR
    SLEEPING_TIME = 5.0   # seconds with very low EAR
    HEAD_PITCH_THRESHOLD = -15  # degrees, negative = nodding forward

    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        # Tracking state
        self.low_ear_start: Optional[float] = None
        self.very_low_ear_start: Optional[float] = None
        self.yawn_start: Optional[float] = None
        self.alert_count = 0
        self.drowsy_episodes = 0
        self.session_start: Optional[float] = None

    def _distance(self, p1, p2):
        """Euclidean distance between two 2D points."""
        return np.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)

    def _compute_ear(self, landmarks, eye_indices):
        """Compute Eye Aspect Ratio.

        EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)

        Where p1-p6 are the eye landmark points:
        p1 = outer corner, p2 = upper-outer, p3 = upper-inner,
        p4 = inner corner, p5 = lower-inner, p6 = lower-outer
        """
        p1 = np.array([landmarks[eye_indices[0]].x, landmarks[eye_indices[0]].y])
        p2 = np.array([landmarks[eye_indices[1]].x, landmarks[eye_indices[1]].y])
        p3 = np.array([landmarks[eye_indices[2]].x, landmarks[eye_indices[2]].y])
        p4 = np.array([landmarks[eye_indices[3]].x, landmarks[eye_indices[3]].y])
        p5 = np.array([landmarks[eye_indices[4]].x, landmarks[eye_indices[4]].y])
        p6 = np.array([landmarks[eye_indices[5]].x, landmarks[eye_indices[5]].y])

        vertical1 = self._distance(p2, p6)
        vertical2 = self._distance(p3, p5)
        horizontal = self._distance(p1, p4)

        if horizontal < 1e-6:
            return 0.3  # Default open value

        ear = (vertical1 + vertical2) / (2.0 * horizontal)
        return ear

    def _compute_mar(self, landmarks):
        """Compute Mouth Aspect Ratio for yawn detection.

        MAR = (||upper_top - lower_bottom||) / (||left - right||)
        """
        upper = np.array([landmarks[self.UPPER_LIP_TOP[0]].x, landmarks[self.UPPER_LIP_TOP[0]].y])
        lower = np.array([landmarks[self.LOWER_LIP_BOTTOM[0]].x, landmarks[self.LOWER_LIP_BOTTOM[0]].y])
        left = np.array([landmarks[self.LEFT_MOUTH[0]].x, landmarks[self.LEFT_MOUTH[0]].y])
        right = np.array([landmarks[self.RIGHT_MOUTH[0]].x, landmarks[self.RIGHT_MOUTH[0]].y])

        vertical = self._distance(upper, lower)
        horizontal = self._distance(left, right)

        if horizontal < 1e-6:
            return 0.0

        return vertical / horizontal

    def _compute_head_pitch(self, landmarks, img_w, img_h):
        """Estimate head pitch angle from face landmarks.

        Uses nose tip and chin to estimate forward/backward tilt.
        Negative pitch = head tilting forward (nodding).
        """
        nose = landmarks[self.NOSE_TIP]
        chin = landmarks[self.CHIN]
        left_eye = landmarks[self.LEFT_EYE_CORNER]
        right_eye = landmarks[self.RIGHT_EYE_CORNER]

        # Simple pitch estimation using nose-chin vector
        nose_pt = np.array([nose.x * img_w, nose.y * img_h, nose.z * img_w])
        chin_pt = np.array([chin.x * img_w, chin.y * img_h, chin.z * img_w])

        # Vector from nose to chin
        vec = chin_pt - nose_pt
        # Pitch angle: angle between this vector and vertical
        vertical = np.array([0, 1, 0])
        cos_angle = np.dot(vec[:2], vertical[:2]) / (np.linalg.norm(vec[:2]) * np.linalg.norm(vertical[:2]) + 1e-6)
        cos_angle = np.clip(cos_angle, -1, 1)
        angle = np.degrees(np.arccos(cos_angle))

        # Use z-component to determine forward vs backward
        if nose.z > chin.z:
            angle = -angle  # Head tilting forward

        return angle

    def analyze(self, image_bytes: bytes) -> dict:
        """Analyze a single frame for drowsiness.

        Args:
            image_bytes: Raw image bytes (JPEG/PNG)

        Returns:
            dict with status, ear, mar, head_pitch, alert_level, duration_seconds
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return {
                "status": AlertLevel.ALERT.value,
                "ear": 0,
                "mar": 0,
                "head_pitch": 0,
                "alert_level": "ok",
                "duration_seconds": 0,
                "error": "Could not decode image",
            }

        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            return {
                "status": AlertLevel.ALERT.value,
                "ear": 0,
                "mar": 0,
                "head_pitch": 0,
                "alert_level": "ok",
                "duration_seconds": 0,
                "face_detected": False,
            }

        landmarks = results.multi_face_landmarks[0].landmark
        now = time.time()

        # Compute metrics
        left_ear = self._compute_ear(landmarks, self.LEFT_EYE)
        right_ear = self._compute_ear(landmarks, self.RIGHT_EYE)
        avg_ear = (left_ear + right_ear) / 2.0

        mar = self._compute_mar(landmarks)
        head_pitch = self._compute_head_pitch(landmarks, w, h)

        # Determine status
        status = AlertLevel.ALERT
        alert_level = "ok"
        duration = 0.0

        # Check for sleeping (very low EAR for extended time)
        if avg_ear < self.EAR_SLEEPING:
            if self.very_low_ear_start is None:
                self.very_low_ear_start = now
            duration = now - self.very_low_ear_start
            if duration >= self.SLEEPING_TIME:
                status = AlertLevel.SLEEPING
                alert_level = "critical"
                self.alert_count += 1
            elif duration >= self.DROWSY_TIME:
                status = AlertLevel.DROWSY
                alert_level = "warning"
        else:
            self.very_low_ear_start = None

        # Check for drowsy (low EAR)
        if status == AlertLevel.ALERT and avg_ear < self.EAR_DROWSY:
            if self.low_ear_start is None:
                self.low_ear_start = now
            duration = now - self.low_ear_start
            if duration >= self.DROWSY_TIME:
                status = AlertLevel.DROWSY
                alert_level = "warning"
                self.drowsy_episodes += 1
        else:
            if self.low_ear_start and status == AlertLevel.ALERT:
                self.low_ear_start = None

        # Check for yawning
        if mar > self.MAR_YAWN and status == AlertLevel.ALERT:
            status = AlertLevel.YAWNING
            alert_level = "warning"

        # Check head pitch (nodding)
        if head_pitch < self.HEAD_PITCH_THRESHOLD and status == AlertLevel.ALERT:
            status = AlertLevel.DROWSY
            alert_level = "warning"

        # Extract face mesh landmarks for overlay (subset for performance)
        face_landmarks = []
        key_indices = list(set(
            self.LEFT_EYE + self.RIGHT_EYE +
            self.UPPER_LIP + self.LOWER_LIP +
            self.LEFT_MOUTH + self.RIGHT_MOUTH +
            self.UPPER_LIP_TOP + self.LOWER_LIP_BOTTOM +
            [self.NOSE_TIP, self.CHIN]
        ))
        for i in key_indices:
            lm = landmarks[i]
            face_landmarks.append({
                "id": i,
                "x": round(lm.x, 4),
                "y": round(lm.y, 4),
            })

        return {
            "status": status.value,
            "ear": round(avg_ear, 4),
            "mar": round(mar, 4),
            "head_pitch": round(head_pitch, 1),
            "alert_level": alert_level,
            "duration_seconds": round(duration, 1),
            "face_detected": True,
            "left_ear": round(left_ear, 4),
            "right_ear": round(right_ear, 4),
            "landmarks": face_landmarks,
        }

    def start_session(self):
        """Start a new driving session."""
        self.session_start = time.time()
        self.alert_count = 0
        self.drowsy_episodes = 0
        self.low_ear_start = None
        self.very_low_ear_start = None

    def get_session_info(self) -> dict:
        """Get current session info."""
        if not self.session_start:
            return {"active": False}
        elapsed = time.time() - self.session_start
        return {
            "active": True,
            "duration_seconds": round(elapsed, 1),
            "alert_count": self.alert_count,
            "drowsy_episodes": self.drowsy_episodes,
        }

    def end_session(self) -> dict:
        """End current session and return summary."""
        info = self.get_session_info()
        duration = info.get("duration_seconds", 0)

        # Safety score: start at 100, deduct for alerts
        score = max(0, 100 - (self.alert_count * 10) - (self.drowsy_episodes * 5))

        summary = {
            "duration_seconds": duration,
            "alert_count": self.alert_count,
            "drowsy_episodes": self.drowsy_episodes,
            "safety_score": score,
        }

        self.session_start = None
        self.alert_count = 0
        self.drowsy_episodes = 0

        return summary


# Singleton
_detector: Optional[DrowsinessDetector] = None


def get_drowsiness_detector() -> DrowsinessDetector:
    global _detector
    if _detector is None:
        _detector = DrowsinessDetector()
    return _detector
