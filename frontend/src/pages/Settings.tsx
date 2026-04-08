import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getSettings, updateSettings } from '../services/api';

export default function Settings() {
  const [form, setForm] = useState({
    ear_threshold: 0.25,
    ear_sleeping_threshold: 0.20,
    alert_delay_seconds: 2.0,
    sleeping_delay_seconds: 5.0,
    mar_yawn_threshold: 0.6,
    audio_alert: true,
    camera_resolution: '640x480',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSettings().then((r) => {
      const d = r.data;
      setForm({
        ear_threshold: d.ear_threshold ?? 0.25,
        ear_sleeping_threshold: d.ear_sleeping_threshold ?? 0.20,
        alert_delay_seconds: d.alert_delay_seconds ?? 2.0,
        sleeping_delay_seconds: d.sleeping_delay_seconds ?? 5.0,
        mar_yawn_threshold: d.mar_yawn_threshold ?? 0.6,
        audio_alert: d.audio_alert ?? true,
        camera_resolution: d.camera_resolution ?? '640x480',
      });
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try { await updateSettings(form); toast.success('Settings saved'); }
    catch { toast.error('Failed to save'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure drowsiness detection parameters</p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div className="form-group">
          <label>EAR Drowsy Threshold ({form.ear_threshold})</label>
          <input type="range" min="0.15" max="0.35" step="0.01" value={form.ear_threshold}
            onChange={(e) => setForm({ ...form, ear_threshold: parseFloat(e.target.value) })} style={{ padding: 0 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
            <span>More sensitive (0.15)</span><span>Less sensitive (0.35)</span>
          </div>
        </div>

        <div className="form-group">
          <label>EAR Sleeping Threshold ({form.ear_sleeping_threshold})</label>
          <input type="range" min="0.10" max="0.25" step="0.01" value={form.ear_sleeping_threshold}
            onChange={(e) => setForm({ ...form, ear_sleeping_threshold: parseFloat(e.target.value) })} style={{ padding: 0 }} />
        </div>

        <div className="form-group">
          <label>Alert Delay (seconds)</label>
          <input type="number" min="0.5" max="10" step="0.5" value={form.alert_delay_seconds}
            onChange={(e) => setForm({ ...form, alert_delay_seconds: parseFloat(e.target.value) })} />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            How long EAR must be below threshold before alerting (drowsy)
          </div>
        </div>

        <div className="form-group">
          <label>Sleeping Delay (seconds)</label>
          <input type="number" min="2" max="30" step="1" value={form.sleeping_delay_seconds}
            onChange={(e) => setForm({ ...form, sleeping_delay_seconds: parseFloat(e.target.value) })} />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Duration before escalating to SLEEPING alert
          </div>
        </div>

        <div className="form-group">
          <label>Yawn Threshold (MAR: {form.mar_yawn_threshold})</label>
          <input type="range" min="0.3" max="1.0" step="0.05" value={form.mar_yawn_threshold}
            onChange={(e) => setForm({ ...form, mar_yawn_threshold: parseFloat(e.target.value) })} style={{ padding: 0 }} />
        </div>

        <div className="form-group">
          <label>Camera Resolution</label>
          <select value={form.camera_resolution} onChange={(e) => setForm({ ...form, camera_resolution: e.target.value })}>
            <option value="320x240">320x240 (Low)</option>
            <option value="640x480">640x480 (Medium)</option>
            <option value="1280x720">1280x720 (HD)</option>
          </select>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="checkbox" checked={form.audio_alert}
            onChange={(e) => setForm({ ...form, audio_alert: e.target.checked })} style={{ width: 'auto' }} />
          <label style={{ margin: 0 }}>Play audio alert when drowsy or sleeping</label>
        </div>

        <button className="btn-accent" onClick={handleSave} disabled={loading} style={{ marginTop: 8 }}>
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
