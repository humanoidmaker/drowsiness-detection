import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiHome, FiNavigation, FiClock, FiSettings, FiLogOut } from 'react-icons/fi';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const links = [
    { to: '/', icon: <FiHome />, label: 'Dashboard' },
    { to: '/drive', icon: <FiNavigation />, label: 'Drive' },
    { to: '/sessions', icon: <FiClock />, label: 'Sessions' },
    { to: '/settings', icon: <FiSettings />, label: 'Settings' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">AlertDrive</div>
        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              {l.icon} {l.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '0 12px', marginBottom: 12 }}>{user?.name}</div>
          <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%', background: 'none', textAlign: 'left' }}>
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>
      <main className="main-content"><Outlet /></main>
    </div>
  );
}
