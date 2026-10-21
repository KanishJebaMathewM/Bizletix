import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import { AppLayout } from './components/layout/AppLayout.js';

import { LoginPage } from './pages/LoginPage.js';
import { LandingPage } from './pages/LandingPage.js';
import { PublicPrivacyPage } from './pages/PublicPrivacyPage.js';
import { TermsPage } from './pages/TermsPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ContactsPage } from './pages/ContactsPage.js';
import { TemplatesPage } from './pages/TemplatesPage.js';
import { CampaignsListPage } from './pages/CampaignsListPage.js';
import { NewCampaignPage } from './pages/NewCampaignPage.js';
import { CampaignDetailsPage } from './pages/CampaignDetailsPage.js';
import { CampaignAnalyticsPage } from './pages/CampaignAnalyticsPage.js';
import { IntegrationsSettingsPage } from './pages/IntegrationsSettingsPage.js';
import { PrivacySettingsPage } from './pages/PrivacySettingsPage.js';
import { AccountSettingsPage } from './pages/AccountSettingsPage.js';
import { UnsubscribePage } from './pages/UnsubscribePage.js';

export function App() {
  return (
    <Routes>
      {/* Public pages & Google verification routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<PublicPrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unsubscribe/:token" element={<UnsubscribePage />} />

      {/* Authenticated Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/campaigns" element={<CampaignsListPage />} />
          <Route path="/campaigns/new" element={<NewCampaignPage />} />
          <Route path="/campaigns/:campaignId" element={<CampaignDetailsPage />} />
          <Route path="/campaigns/:campaignId/analytics" element={<CampaignAnalyticsPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/settings/integrations" element={<IntegrationsSettingsPage />} />
          <Route path="/settings/privacy" element={<PrivacySettingsPage />} />
          <Route path="/settings/account" element={<AccountSettingsPage />} />
        </Route>
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
