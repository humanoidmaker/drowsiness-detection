import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { register } from '../services/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register({ name, email, password });
      toast.success('Account created! Check your email to verify.');
      navigate('/login');
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>AlertDrive</h1>
        <p>Create your account for safer driving</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Full Name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="form-group"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="form-group"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
          <button type="submit" className="btn-accent" style={{ width: '100%', marginTop: 8 }} disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        </form>
        <div style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>Already have an account? <Link to="/login">Sign in</Link></div>
      </div>
    </div>
  );
}
