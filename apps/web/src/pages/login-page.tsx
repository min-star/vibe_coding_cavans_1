import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuthStore } from '../stores/auth-store';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ token: string; user: { id: string; email: string; name: string } }>(
        mode === 'login' ? '/auth/login' : '/auth/register',
        {
          method: 'POST',
          body:
            mode === 'login'
              ? { email, password }
              : { email, password, name }
        }
      );
      setAuth({ token: data.token, user: data.user });
      navigate('/canvases');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1>TapNow MVP</h1>
        <p>Login or register to enter your creative canvas workspace.</p>
        {mode === 'register' ? (
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
        ) : null}
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />
        {error ? <div style={{ color: '#dc2626' }}>{error}</div> : null}
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Submitting...' : mode === 'login' ? 'Login' : 'Register'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          style={styles.linkButton}
        >
          Switch to {mode === 'login' ? 'register' : 'login'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: 'radial-gradient(circle at top, #38bdf8, #0f172a)'
  },
  card: {
    width: 420,
    maxWidth: '90vw',
    background: '#ffffff',
    padding: 28,
    borderRadius: 24,
    display: 'grid',
    gap: 12
  },
  input: {
    padding: 12,
    borderRadius: 12,
    border: '1px solid #cbd5e1'
  },
  button: {
    padding: 12,
    borderRadius: 12,
    border: 0,
    background: '#0f172a',
    color: '#ffffff'
  },
  linkButton: {
    padding: 12,
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    background: '#f8fafc'
  }
};
