import type { CSSProperties } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <div>
          <strong>TapNow MVP</strong>
        </div>
        <nav style={styles.nav}>
          <Link to="/canvases">Canvases</Link>
          <Link to="/assets">Assets</Link>
          <span>{user?.name}</span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Logout
          </button>
        </nav>
      </header>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
    color: '#0f172a'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #cbd5e1',
    background: 'rgba(255,255,255,0.85)',
    position: 'sticky',
    top: 0,
    backdropFilter: 'blur(12px)'
  },
  nav: {
    display: 'flex',
    gap: 16,
    alignItems: 'center'
  },
  main: {
    padding: 24
  }
};
