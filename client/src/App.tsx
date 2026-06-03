import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { ProtectedRoute, PublicRoute } from '@/components/ProtectedRoute';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage, SignupPage } from '@/pages/AuthPages';
import { DashboardPage } from '@/pages/DashboardPage';
import { MeetingsPage } from '@/pages/MeetingsPage';
import { MeetingRoomPage } from '@/pages/MeetingRoomPage';
import { MeetingDetailPage } from '@/pages/MeetingDetailPage';
import { TeamsPage } from '@/pages/TeamsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AdminPage } from '@/pages/AdminPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/meetings" element={<MeetingsPage />} />
              <Route path="/meetings/:id" element={<MeetingDetailPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            <Route path="/meetings/room/:roomCode" element={<MeetingRoomPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
