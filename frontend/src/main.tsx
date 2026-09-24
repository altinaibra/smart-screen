import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { auth } from './api';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ScreensPage from './pages/ScreensPage';
import MediaPage from './pages/MediaPage';
import PlaylistsPage from './pages/PlaylistsPage';
import PlaylistEditorPage from './pages/PlaylistEditorPage';
import MenuPage from './pages/MenuPage';
import SettingsPage from './pages/SettingsPage';
import CurrenciesPage from './pages/CurrenciesPage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import { queryClient } from './services/queryClient';
import './i18n';
import './styles.css';

function RequireAuth({ children }: { children: React.ReactNode }) {
  return auth.token ? <>{children}</> : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<DashboardPage />} />
            <Route path="screens" element={<ScreensPage />} />
            <Route path="media" element={<MediaPage />} />
            <Route path="playlists" element={<PlaylistsPage />} />
            <Route path="playlists/:id" element={<PlaylistEditorPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="currencies" element={<CurrenciesPage />} />
            <Route path="payment-methods" element={<PaymentMethodsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
