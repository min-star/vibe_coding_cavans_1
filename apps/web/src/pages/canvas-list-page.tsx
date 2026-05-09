import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuthGuard } from '../hooks/use-auth-guard';
import type { Canvas } from '../types';

export function CanvasListPage() {
  const token = useAuthGuard();
  const navigate = useNavigate();
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [title, setTitle] = useState('My First Canvas');
  const [loading, setLoading] = useState(true);

  async function loadCanvases() {
    if (!token) {
      return;
    }
    setLoading(true);
    const data = await apiRequest<{ canvases: Canvas[] }>('/canvases', { token });
    setCanvases(data.canvases);
    setLoading(false);
  }

  async function createNewCanvas() {
    if (!token) {
      return;
    }
    const data = await apiRequest<{ canvas: Canvas }>('/canvases', {
      method: 'POST',
      token,
      body: { title }
    });
    navigate(`/canvas/${data.canvas.id}`);
  }

  useEffect(() => {
    void loadCanvases();
  }, [token]);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={panelStyle}>
        <h2>New Canvas</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
          />
          <button onClick={() => void createNewCanvas()} style={buttonStyle}>
            Create
          </button>
        </div>
      </section>

      <section style={panelStyle}>
        <h2>My Canvases</h2>
        {loading ? (
          <div>Loading...</div>
        ) : canvases.length === 0 ? (
          <div>No canvases yet.</div>
        ) : (
          <div style={gridStyle}>
            {canvases.map((canvas) => (
              <Link key={canvas.id} to={`/canvas/${canvas.id}`} style={cardStyle}>
                <strong>{canvas.title}</strong>
                <span>Updated: {new Date(canvas.updatedAt).toLocaleString()}</span>
                <span>Visibility: {canvas.visibility}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const panelStyle: CSSProperties = {
  background: '#ffffff',
  borderRadius: 20,
  padding: 20,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
};

const inputStyle: CSSProperties = {
  flex: 1,
  padding: 12,
  borderRadius: 12,
  border: '1px solid #cbd5e1'
};

const buttonStyle: CSSProperties = {
  padding: '12px 18px',
  borderRadius: 12,
  border: 0,
  background: '#0f172a',
  color: '#fff'
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 16
};

const cardStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: 18,
  borderRadius: 16,
  textDecoration: 'none',
  color: '#0f172a',
  background: 'linear-gradient(135deg, #f8fafc 0%, #dbeafe 100%)'
};
