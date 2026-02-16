import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Users, Swords, Plus, UserPlus } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [stats, setStats] = useState(null);
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    api.get('/tournaments/dashboard/stats').then(r => setStats(r.data));
    api.get('/tournaments').then(r => setTournaments(r.data.slice(0, 5)));
  }, []);

  const statCards = stats
    ? [
        { label: 'Active Tournaments', value: stats.active_tournaments, icon: Trophy, color: 'bg-blue-500' },
        { label: 'Total Players', value: stats.total_players, icon: Users, color: 'bg-emerald-500' },
        { label: 'Matches Played', value: stats.matches_played, icon: Swords, color: 'bg-purple-500' },
        { label: 'Total Tournaments', value: stats.total_tournaments, icon: Trophy, color: 'bg-amber-500' },
      ]
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome to Tournament Manager</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/tournaments/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Tournament
          </Link>
          {isAdmin && (
            <Link
              to="/players"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Players
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent tournaments */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Tournaments</h2>
        </div>
        {tournaments.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p>No tournaments yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                to={`/tournaments/${t.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{t.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t.location || 'No location'} &middot; {t.game_format} &middot; {t.player_count || 0} players
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    t.status === 'not_started'
                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      : t.status === 'pool_stage'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : t.status === 'knockout_stage'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                  }`}
                >
                  {t.status.replace('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
