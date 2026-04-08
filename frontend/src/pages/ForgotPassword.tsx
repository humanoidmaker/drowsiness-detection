import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { forgotPassword } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await forgotPassword(email); setSent(true); }
    catch { toast.error('Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>AlertDrive</h1>
        {sent ? (
          <><p>If an account exists for {email}, a reset link has been sent.</p><Link to="/login"><button className="btn-outline" style={{ marginTop: 16 }}>Back to Login</button></Link></>
        ) : (
          <><p>Enter your email to receive a password reset link.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <button type="submit" className="btn-accent" style={{ width: '100%' }} disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
            </form>
            <div style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}><Link to="/login">Back to login</Link></div>
          </>
        )}
      </div>
    </div>
  );
}
