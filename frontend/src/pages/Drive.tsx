import React, { useRef, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { detectFrame, startSession, endSession, getSession } from '../services/api';
import { FiCamera, FiCameraOff, FiPlay, FiSquare } from 'react-icons/fi';

const STATUS_COLORS: Record<string, string> = {
  ALERT: 'var(--success)',
  DROWSY: 'var(--warning)',
  SLEEPING: 'var(--danger)',
  YAWNING: 'var(--warning)',
};

const STATUS_CLASS: Record<string, string> = {
  ALERT: 'status-alert',
  DROWSY: 'status-drowsy',
  SLEEPING: 'status-sleeping',
  YAWNING: 'status-yawning',
};

export default function Drive() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [active, setActive] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [detection, setDetection] = useState<any>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef<NodeJS.Timer | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true);

      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        canvasRef.current.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
          try {
            const res = await detectFrame(file);
            setDetection(res.data);
            if (res.data.alert_level === 'warning' || res.data.alert_level === 'critical') {
              playAlert(res.data.alert_level);
            }
          } catch {}
        }, 'image/jpeg', 0.8);
      }, 300);
    } catch { toast.error('Could not access camera'); }
  }, []);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current as any); intervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setActive(false);
    setDetection(null);
  }, []);

  const playAlert = (level: string) => {
    try {
      // Use Web Audio API for alert sound
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = level === 'critical' ? 880 : 660;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + (level === 'critical' ? 1.0 : 0.5));
      setAlertCount((c) => c + 1);
    } catch {}
  };

  const handleStartSession = async () => {
    try {
      await startSession();
      setSessionActive(true);
      setAlertCount(0);
      setElapsed(0);
      elapsedRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      toast.success('Driving session started');
      if (!active) startCamera();
    } catch { toast.error('Failed to start session'); }
  };

  const handleEndSession = async () => {
    try {
      const res = await endSession();
      setSessionActive(false);
      setSessionInfo(res.data.summary);
      if (elapsedRef.current) { clearInterval(elapsedRef.current as any); elapsedRef.current = null; }
      toast.success(`Session ended. Safety score: ${res.data.summary.safety_score}`);
    } catch { toast.error('Failed to end session'); }
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (elapsedRef.current) clearInterval(elapsedRef.current as any);
    };
  }, [stopCamera]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const status = detection?.status || 'ALERT';
  const earPercent = Math.min(100, (detection?.ear || 0.3) / 0.4 * 100);
  const earColor = (detection?.ear || 0.3) < 0.2 ? 'var(--danger)' : (detection?.ear || 0.3) < 0.25 ? 'var(--warning)' : 'var(--success)';

  return (
    <div>
      <div className="page-header">
        <h1>Drive Mode</h1>
        <p>Real-time drowsiness monitoring for safe driving</p>
      </div>

      <div className="grid-2">
        <div>
          <div className="camera-feed">
            <video ref={videoRef} autoPlay playsInline muted style={{ display: active ? 'block' : 'none' }} />
            {!active && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <div style={{ textAlign: 'center' }}><FiCamera size={48} /><p style={{ marginTop: 12 }}>Start a session to begin</p></div>
              </div>
            )}
            {active && (
              <div className="camera-overlay">
                <div className="badge" style={{ background: STATUS_COLORS[status], color: '#fff', fontSize: 14, padding: '6px 14px' }}>
                  {status}
                </div>
                {detection?.face_detected === false && (
                  <div className="badge badge-warning">No face detected</div>
                )}
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            {!sessionActive ? (
              <button className="btn-accent" onClick={handleStartSession}>
                <FiPlay style={{ marginRight: 6 }} /> Start Session
              </button>
            ) : (
              <button className="btn-danger" onClick={handleEndSession}>
                <FiSquare style={{ marginRight: 6 }} /> End Session
              </button>
            )}
            {active && !sessionActive && (
              <button className="btn-outline" onClick={stopCamera}>
                <FiCameraOff style={{ marginRight: 6 }} /> Stop Camera
              </button>
            )}
          </div>
        </div>

        <div>
          {/* Status indicator */}
          <div className="card" style={{ marginBottom: 20, textAlign: 'center' }}>
            <div className={`status-large ${STATUS_CLASS[status] || 'status-alert'}`} style={{ margin: '0 auto 16px' }}>
              {status}
            </div>
            {sessionActive && (
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'monospace' }}>
                {formatTime(elapsed)}
              </div>
            )}
            {detection?.duration_seconds > 0 && (
              <div style={{ color: 'var(--warning)', fontSize: 14, marginTop: 8 }}>
                Eyes closed for {detection.duration_seconds}s
              </div>
            )}
          </div>

          {/* EAR Gauge */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12 }}>Eye Aspect Ratio (EAR)</h3>
            <div className="ear-gauge">
              <div className="ear-gauge-fill" style={{ width: `${earPercent}%`, background: earColor }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              <span>Closed (0.0)</span>
              <span style={{ fontWeight: 600, color: earColor }}>{detection?.ear?.toFixed(3) || '—'}</span>
              <span>Open (0.4)</span>
            </div>
          </div>

          {/* Detection details */}
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Detection Details</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Left EAR</span>
                <span>{detection?.left_ear?.toFixed(4) || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Right EAR</span>
                <span>{detection?.right_ear?.toFixed(4) || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mouth Ratio (MAR)</span>
                <span>{detection?.mar?.toFixed(4) || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Head Pitch</span>
                <span>{detection?.head_pitch ? `${detection.head_pitch} deg` : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Session Alerts</span>
                <span style={{ color: alertCount > 0 ? 'var(--danger)' : 'var(--text)' }}>{alertCount}</span>
              </div>
            </div>
          </div>

          {/* Session summary (after ending) */}
          {sessionInfo && !sessionActive && (
            <div className="card" style={{ marginTop: 20, borderColor: 'var(--accent)' }}>
              <h3 style={{ marginBottom: 12 }}>Session Summary</h3>
              <div className="grid-2">
                <div style={{ textAlign: 'center' }}>
                  <div className="stat-value">{Math.round(sessionInfo.duration_seconds / 60)}m</div>
                  <div className="stat-label">Duration</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="stat-value" style={{ color: sessionInfo.safety_score >= 80 ? 'var(--success)' : 'var(--danger)' }}>
                    {sessionInfo.safety_score}
                  </div>
                  <div className="stat-label">Safety Score</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
