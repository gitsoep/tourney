import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Plus, Trophy, Trash2, Edit } from 'lucide-react';

export default function TournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/tournaments').then((r) => {
      setTournaments(r.data);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this tournament?')) return;
    await api.delete(`/tournaments/${id}`);
    load();
  };

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    pool_stage: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    knockout_stage: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    finished: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tournaments</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your tournaments</p>
        </div>
        <Link
          to="/tournaments/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Tournament
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No tournaments yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first tournament to get started</p>
          <Link
            to="/tournaments/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Tournament
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <Link to={`/tournaments/${t.id}`} className="block p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status] || ''}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                  <p>📍 {t.location || 'No location set'}</p>
                  <p>🎯 Format: {t.game_format}</p>
                  <p>👥 {t.player_count || 0} players &middot; Groups of {t.group_size}</p>
                  {t.start_date && <p>📅 {new Date(t.start_date).toLocaleDateString()}</p>}
                  {user?.role === 'admin' && t.created_by_username && (
                    <p>👤 Created by {t.created_by_username}</p>
                  )}
                </div>
              </Link>
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                <Link
                  to={`/tournaments/${t.id}/edit`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
