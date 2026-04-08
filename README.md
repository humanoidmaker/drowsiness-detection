# AlertDrive — Drowsiness Detection for Drivers

AI-powered drowsiness detection system using MediaPipe Face Mesh with real-time eye tracking, yawn detection, and head pose estimation. Designed to keep drivers safe during long trips.

## Features

- **Real-time drowsiness detection** using MediaPipe Face Mesh (468 landmarks)
- **Eye Aspect Ratio (EAR)** monitoring for eye closure detection
- **Mouth Aspect Ratio (MAR)** for yawn detection
- **Head pose estimation** (pitch angle) for nodding detection
- **Alert levels**: ALERT (green), DROWSY (amber), SLEEPING (red), YAWNING (amber)
- **Audio alerts** with escalating tones for drowsy and sleeping states
- **Driving sessions** with duration tracking, alert counting, and safety scoring
- **Session history** with safety score trends
- **Configurable thresholds** for EAR, MAR, alert delays

## Tech Stack

- **Backend**: Python FastAPI + MediaPipe Face Mesh + OpenCV
- **Frontend**: React + TypeScript
- **Database**: MongoDB (via Motor async driver)
- **Auth**: JWT-based with email verification and password reset

## ML Pipeline

### Eye Aspect Ratio (EAR)

```
EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
```

Where p1-p6 are specific eye landmarks from the Face Mesh:
- p1, p4: horizontal corners
- p2, p3: upper eyelid points
- p5, p6: lower eyelid points

**Thresholds:**
- EAR >= 0.25: Eyes open (ALERT)
- EAR < 0.25 for 2+ seconds: DROWSY
- EAR < 0.20 for 5+ seconds: SLEEPING

### Mouth Aspect Ratio (MAR)

```
MAR = ||upper_lip - lower_lip|| / ||left_corner - right_corner||
```

MAR > 0.6 indicates yawning.

### Head Pose

Pitch angle computed from nose-to-chin vector. Negative pitch (< -15 degrees) indicates forward head tilt (nodding off).

## GPU Requirements

- **Minimum**: CPU-only mode (~80ms per frame)
- **Recommended**: NVIDIA GPU with CUDA 11.8+ for smooth 30fps
- **PyTorch**: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118`

## Quick Start

### Docker (recommended)

```bash
cp backend/.env.example backend/.env
docker-compose up --build
```

### Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in
- `POST /api/auth/verify-email` — Verify email
- `POST /api/auth/forgot-password` — Request reset
- `POST /api/auth/reset-password` — Reset password

### Detection
- `POST /api/detect/frame` — Analyze single frame
- `GET /api/detect/session` — Current session stats
- `POST /api/detect/session/start` — Start driving session
- `POST /api/detect/session/end` — End session with summary
- `GET /api/detect/history` — Past sessions
- `GET /api/detect/stats` — Overall driving stats

### Settings
- `GET /api/settings/` — Get settings
- `PUT /api/settings/` — Update settings

## License

MIT License — Humanoid Maker (www.humanoidmaker.com)
