import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { useAuthGuard } from '../hooks/use-auth-guard';
import type { Asset } from '../types';

export function AssetsPage() {
  const token = useAuthGuard();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [file, setFile] = useState<File | null>(null);

  async function loadAssets() {
    if (!token) {
      return;
    }
    const data = await apiRequest<{ assets: Asset[] }>('/assets', { token });
    setAssets(data.assets);
  }

  async function uploadAsset() {
    if (!token || !file) {
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    await apiRequest('/assets/upload', {
      method: 'POST',
      token,
      formData
    });
    setFile(null);
    await loadAssets();
  }

  useEffect(() => {
    void loadAssets();
  }, [token]);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={panelStyle}>
        <h2>Upload Asset</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button onClick={() => void uploadAsset()} style={buttonStyle}>
            Upload
          </button>
        </div>
      </section>
      <section style={panelStyle}>
        <h2>Asset Library</h2>
        <div style={gridStyle}>
          {assets.map((asset) => (
            <div key={asset.id} style={cardStyle}>
              <strong>{asset.title}</strong>
              <span>{asset.type}</span>
              {asset.thumbnailUrl ? (
                <img src={asset.thumbnailUrl} alt={asset.title} style={{ width: '100%', borderRadius: 12 }} />
              ) : null}
              <a href={asset.fileUrl} target="_blank" rel="noreferrer">
                Open asset
              </a>
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

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 16
};

const cardStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  padding: 16,
  borderRadius: 16,
  background: '#f8fafc'
};

const buttonStyle: CSSProperties = {
  padding: '10px 16px',
  borderRadius: 12,
  border: 0,
  background: '#0f172a',
  color: '#fff'
};
