import React, { useEffect, useState } from 'react';
import { getHistory } from '../services/api';

export default function Sessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    getHistory(page * limit, limit).then((r) => {
      setSessions(r.data.sessions);
      setTotal(r.data.total);
    }).catch(() => {});
  }, [page]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Driving Sessions</h1>
        <p>{total} sessions recorded</p>
      </div>

      <div className="card">
        {sessions.length === 0 ? (
          <div className="empty-state">
            <h3>No sessions yet</h3>
            <p>Complete a driving session to see it here</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Duration</th>
                    <th>Alerts</th>
                    <th>Drowsy Episodes</th>
                    <th>Safety Score</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s._id}>
                      <td>{new Date(s.started_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                      <td>{formatDuration(s.duration_seconds || 0)}</td>
                      <td>{s.alert_count || 0}</td>
                      <td>{s.drowsy_episodes || 0}</td>
                      <td>
                        <span className={`badge ${
                          (s.safety_score || 0) >= 80 ? 'badge-success' :
                          (s.safety_score || 0) >= 50 ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {s.safety_score ?? '—'}/100
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button className="btn-outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Page {page + 1} of {Math.ceil(total / limit)}</span>
              <button className="btn-outline" disabled={(page + 1) * limit >= total} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
