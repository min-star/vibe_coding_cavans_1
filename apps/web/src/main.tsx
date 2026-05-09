import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout';
import { AssetsPage } from './pages/assets-page';
import { CanvasEditorPage } from './pages/canvas-editor-page';
import { CanvasListPage } from './pages/canvas-list-page';
import { LoginPage } from './pages/login-page';
import { SharedCanvasPage } from './pages/shared-canvas-page';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/shared/:token" element={<SharedCanvasPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/canvases" replace />} />
          <Route path="/canvases" element={<CanvasListPage />} />
          <Route path="/canvas/:id" element={<CanvasEditorPage />} />
          <Route path="/assets" element={<AssetsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
