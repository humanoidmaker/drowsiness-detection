import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login as apiLogin } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiLogin({ email, password });
      setAuth(res.data.token, res.data.user);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>AlertDrive</h1>
        <p>Sign in to your drowsiness detection dashboard</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="form-group"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <button type="submit" className="btn-accent" style={{ width: '100%', marginTop: 8 }} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
        <div style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
          <Link to="/forgot-password">Forgot password?</Link>
          <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>|</span>
          <Link to="/register">Create account</Link>
        </div>
      </div>
    </div>
  );
}
