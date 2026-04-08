import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resetPassword } from '../services/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try { await resetPassword({ token, password }); toast.success('Password reset!'); navigate('/login'); }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Reset failed'); }
    finally { setLoading(false); }
  };

  if (!token) return (
    <div className="auth-container"><div className="auth-card" style={{ textAlign: 'center' }}><h1>AlertDrive</h1><p style={{ color: 'var(--danger)' }}>Invalid reset link</p><Link to="/login"><button className="btn-outline" style={{ marginTop: 16 }}>Back to Login</button></Link></div></div>
  );

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>AlertDrive</h1><p>Enter your new password</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>New Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
          <div className="form-group"><label>Confirm Password</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
          <button type="submit" className="btn-accent" style={{ width: '100%' }} disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
        </form>
      </div>
    </div>
  );
}
