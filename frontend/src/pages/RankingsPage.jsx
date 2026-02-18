import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Plus, Trophy, Trash2, Edit, BarChart3 } from 'lucide-react';

export default function RankingsPage() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/rankings').then((r) => {
      setRankings(r.data);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this ranking? Tournaments will be unlinked.')) return;
    await api.delete(`/rankings/${id}`);
    load();
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rankings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage player rankings across tournaments</p>
        </div>
        <Link
          to="/rankings/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Ranking
        </Link>
      </div>

      {rankings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No rankings yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Create a ranking to track player performance across tournaments</p>
          <Link
            to="/rankings/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Ranking
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rankings.map((r) => (
            <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <Link to={`/rankings/${r.id}`} className="block p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{r.name}</h3>
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                </div>
                {r.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{r.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{r.tournament_count || 0} tournaments</span>
                  <span>1st: {r.points_first}pts</span>
                </div>
              </Link>
              <div className="border-t border-gray-100 dark:border-gray-700 px-6 py-3 flex gap-2">
                <Link
                  to={`/rankings/${r.id}/edit`}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
