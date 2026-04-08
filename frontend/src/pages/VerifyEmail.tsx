import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../services/api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('No verification token found'); return; }
    verifyEmail(token)
      .then(() => { setStatus('success'); setMessage('Email verified successfully!'); })
      .catch((err) => { setStatus('error'); setMessage(err.response?.data?.detail || 'Verification failed'); });
  }, [params]);

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1>AlertDrive</h1>
        {status === 'loading' && <p>Verifying your email...</p>}
        {status === 'success' && (<><p style={{ color: 'var(--success)' }}>{message}</p><Link to="/login"><button className="btn-accent" style={{ marginTop: 16 }}>Sign In</button></Link></>)}
        {status === 'error' && (<><p style={{ color: 'var(--danger)' }}>{message}</p><Link to="/login"><button className="btn-outline" style={{ marginTop: 16 }}>Back to Login</button></Link></>)}
      </div>
    </div>
  );
}
