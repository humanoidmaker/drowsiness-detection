import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDetectStats, getHistory } from '../services/api';
import { FiClock, FiAlertTriangle, FiShield, FiNavigation } from 'react-icons/fi';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    getDetectStats().then((r) => setStats(r.data)).catch(() => {});
    getHistory(0, 5).then((r) => setRecent(r.data.sessions)).catch(() => {});
  }, []);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Your driving safety overview</p>
      </div>

      <div className="grid-4" style={{ marginBottom: 32 }}>
        <div className="card">
          <div style={{ color: 'var(--accent)', marginBottom: 8 }}><FiClock size={24} /></div>
          <div className="stat-value">{stats?.total_driving_hours ?? '—'}h</div>
          <div className="stat-label">Total Driving Hours</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--warning)', marginBottom: 8 }}><FiAlertTriangle size={24} /></div>
          <div className="stat-value">{stats?.total_alerts ?? '—'}</div>
          <div className="stat-label">Total Alerts</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--success)', marginBottom: 8 }}><FiShield size={24} /></div>
          <div className="stat-value">{stats?.avg_safety_score ?? '—'}</div>
          <div className="stat-label">Avg Safety Score</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}><FiNavigation size={24} /></div>
          <div className="stat-value">{stats?.total_sessions ?? '—'}</div>
          <div className="stat-label">Total Sessions</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>Quick Start</h3>
            <Link to="/drive"><button className="btn-accent">Start Driving</button></Link>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Start a driving session to monitor your alertness in real-time.
            The system uses your camera to track eye aspect ratio, yawning,
            and head position to detect drowsiness.
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>Safety Score</h3>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%', margin: '0 auto',
              background: `conic-gradient(var(--success) ${(stats?.avg_safety_score || 0) * 3.6}deg, var(--bg-input) 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700,
              }}>
                {stats?.avg_safety_score ?? '—'}
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>out of 100</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3>Recent Sessions</h3>
          <Link to="/sessions"><button className="btn-outline">View All</button></Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state"><h3>No sessions yet</h3><p>Start a driving session to track your alertness</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Date</th><th>Duration</th><th>Alerts</th><th>Safety Score</th></tr></thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s._id}>
                    <td>{new Date(s.started_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td>{formatDuration(s.duration_seconds || 0)}</td>
                    <td>{s.alert_count || 0}</td>
                    <td>
                      <span className={`badge ${(s.safety_score || 0) >= 80 ? 'badge-success' : (s.safety_score || 0) >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                        {s.safety_score ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
