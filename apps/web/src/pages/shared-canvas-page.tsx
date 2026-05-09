import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuthStore } from '../stores/auth-store';
import type { Canvas, CanvasEdge, CanvasNode } from '../types';

export function SharedCanvasPage() {
  const { token: shareToken } = useParams();
  const authToken = useAuthStore((state) => state.token);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [webUrl, setWebUrl] = useState<string | null>(null);

  async function loadSharedCanvas() {
    if (!shareToken) {
      return;
    }
    const data = await apiRequest<{
      canvas: Canvas;
      nodes: CanvasNode[];
      edges: CanvasEdge[];
    }>(`/shared/${shareToken}`);
    setCanvas(data.canvas);
    setNodes(data.nodes);
    setEdges(data.edges);
    setWebUrl(window.location.href);
  }

  async function cloneCanvas() {
    if (!shareToken || !authToken) {
      return;
    }
    await apiRequest(`/shared/${shareToken}/clone`, {
      method: 'POST',
      token: authToken
    });
    alert('Canvas cloned to your workspace.');
  }

  useEffect(() => {
    void loadSharedCanvas();
  }, [shareToken]);

  return (
    <div style={{ display: 'grid', gap: 20, padding: 24 }}>
      <section style={panelStyle}>
        <h1>{canvas?.title || 'Shared Canvas'}</h1>
        <p>This page is read-only. You can inspect nodes and clone it to your workspace.</p>
        <div style={{ display: 'flex', gap: 12 }}>
          {authToken ? (
            <button onClick={() => void cloneCanvas()} style={buttonStyle}>
              Clone Canvas
            </button>
          ) : (
            <Link to="/login">Login to Clone</Link>
          )}
          {webUrl ? (
            <button
              onClick={() => navigator.clipboard.writeText(webUrl)}
              style={secondaryButtonStyle}
            >
              Copy Link
            </button>
          ) : null}
        </div>
      </section>
      <section style={panelStyle}>
        <h2>Nodes</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {nodes.map((node) => (
            <div key={node.id} style={cardStyle}>
              <strong>{node.data.label || node.type}</strong>
              <div>Type: {node.type}</div>
              <div>Status: {node.status}</div>
            </div>
          ))}
        </div>
      </section>
      <section style={panelStyle}>
        <h2>Edges</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {edges.map((edge) => (
            <div key={edge.id} style={cardStyle}>
              <span>{edge.sourceNodeId}</span>
              <span>{' -> '}</span>
              <span>{edge.targetNodeId}</span>
              <span>{` (${edge.referenceType})`}</span>
            </div>
          ))}
        </div>
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

const cardStyle: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: '#f8fafc'
};

const buttonStyle: CSSProperties = {
  padding: '10px 16px',
  borderRadius: 12,
  border: 0,
  background: '#0f172a',
  color: '#fff'
};

const secondaryButtonStyle: CSSProperties = {
  padding: '10px 16px',
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  background: '#fff'
};
