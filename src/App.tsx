import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoginPage } from '@/pages/auth/LoginPage';
import { BiometricPage } from '@/pages/auth/BiometricPage';
import { RecoverPage } from '@/pages/auth/RecoverPage';
import { HomePage } from '@/pages/app/HomePage';
import { ClassroomsPage } from '@/pages/app/ClassroomsPage';
import { ClassroomDetailPage } from '@/pages/app/ClassroomDetailPage';
import { ProfilePage } from '@/pages/app/ProfilePage';
import { ProfileEditPage } from '@/pages/app/ProfileEditPage';
import { HelpCenterPage } from '@/pages/app/HelpCenterPage';
import { FaqPage } from '@/pages/app/FaqPage';
import { ChannelsPage } from '@/pages/app/ChannelsPage';
import { TicketsPage } from '@/pages/app/TicketsPage';
import { NewTicketPage } from '@/pages/app/NewTicketPage';
import { TicketDetailPage } from '@/pages/app/TicketDetailPage';
import { AccessibilityPage } from '@/pages/app/AccessibilityPage';
import { StaffPage } from '@/pages/staff/StaffPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ROUTES } from '@/lib/constants';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={ROUTES.login} replace />} />

          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.biometric} element={<BiometricPage />} />
          <Route path={ROUTES.recover} element={<RecoverPage />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to={ROUTES.home} replace />} />
            <Route path="inicio" element={<HomePage />} />
            <Route path="aulas" element={<ClassroomsPage />} />
            <Route path="aulas/:classroomId" element={<ClassroomDetailPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="perfil/editar" element={<ProfileEditPage />} />
            <Route path="ayuda" element={<HelpCenterPage />} />
            <Route path="ayuda/faq" element={<FaqPage />} />
            <Route path="ayuda/canales" element={<ChannelsPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="tickets/nuevo" element={<NewTicketPage />} />
            <Route path="tickets/:code" element={<TicketDetailPage />} />
            <Route path="accesibilidad" element={<AccessibilityPage />} />
            <Route path="staff" element={<StaffPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
