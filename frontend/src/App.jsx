import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentFormPage from './pages/TournamentFormPage';
import TournamentDetailPage from './pages/TournamentDetailPage';
import PlayersPage from './pages/PlayersPage';
import StandingsPage from './pages/StandingsPage';
import BracketPage from './pages/BracketPage';
import SettingsPage from './pages/SettingsPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AdminUsersPage from './pages/AdminUsersPage';
import PublicTournamentsPage from './pages/PublicTournamentsPage';
import PublicTournamentPage from './pages/PublicTournamentPage';
import RankingsPage from './pages/RankingsPage';
import RankingFormPage from './pages/RankingFormPage';
import RankingDetailPage from './pages/RankingDetailPage';
import PublicRankingsPage from './pages/PublicRankingsPage';
import PublicRankingPage from './pages/PublicRankingPage';

function App() {
  return (
    <Routes>
      {/* Public routes - no login required */}
      <Route path="/public/tournaments" element={<PublicTournamentsPage />} />
      <Route path="/public/tournaments/:id" element={<PublicTournamentPage />} />
      <Route path="/public/rankings" element={<PublicRankingsPage />} />
      <Route path="/public/rankings/:id" element={<PublicRankingPage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tournaments" element={<TournamentsPage />} />
        <Route path="/tournaments/new" element={<TournamentFormPage />} />
        <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
        <Route path="/tournaments/:id/edit" element={<TournamentFormPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/rankings/new" element={<RankingFormPage />} />
        <Route path="/rankings/:id" element={<RankingDetailPage />} />
        <Route path="/rankings/:id/edit" element={<RankingFormPage />} />
        <Route path="/standings" element={<StandingsPage />} />
        <Route path="/bracket" element={<BracketPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/change-password" element={<ChangePasswordPage />} />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
