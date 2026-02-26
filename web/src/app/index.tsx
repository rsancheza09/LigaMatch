import 'core-js/stable';

import '@shared/i18n';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthInit } from '@components/AuthInit';
import { DashboardPage } from '@components/DashboardPage';
import { ForgotPasswordPage } from '@components/ForgotPasswordPage';
import { HomePage } from '@components/HomePage';
import { LoginPage } from '@components/LoginPage';
import { RegisterPage } from '@components/RegisterPage';
import { ResetPasswordPage } from '@components/ResetPasswordPage';
import { PlayerProfilePage } from '@components/PlayerProfilePage';
import { TeamDetailPage } from '@components/TeamDetailPage';
import { TournamentDetailPage } from '@components/TournamentDetailPage';
import { store } from '@shared/store';

const appRoot = document.getElementById('app');

if (!appRoot) {
  throw new Error('Root element not found');
}

createRoot(appRoot).render(
  <Provider store={store}>
    <BrowserRouter>
      <AuthInit>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/teams/:teamId/players/:playerId" element={<PlayerProfilePage />} />
          <Route path="/teams/:id" element={<TeamDetailPage />} />
          <Route path="/tournaments/:slugOrId" element={<TournamentDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </AuthInit>
    </BrowserRouter>
  </Provider>,
);
