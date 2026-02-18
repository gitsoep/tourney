import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Edit, RefreshCw, Trophy, ArrowLeft, BarChart3 } from 'lucide-react';

export default function RankingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ranking, setRanking] = useState(null);
  const [standings, setStandings] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const load = async () => {
    try {
      const [rankingRes, standingsRes, tournamentsRes] = await Promise.all([
        api.get(`/rankings/${id}`),
        api.get(`/rankings/${id}/standings`),
        api.get(`/rankings/${id}/tournaments`),
      ]);
      setRanking(rankingRes.data);
      setStandings(standingsRes.data);
      setTournaments(tournamentsRes.data);
    } catch {
      navigate('/rankings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.post(`/rankings/${id}/recalculate`);
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error recalculating');
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const placementLabel = (p) => {
    if (!p) return '-';
    if (p === 1) return '1st';
    if (p === 2) return '2nd';
    if (p === 3) return '3rd';
    return `${p}th`;
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/rankings')}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ranking?.name}</h1>
          {ranking?.description && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">{ranking.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            Recalculate
          </button>
          <Link
            to={`/rankings/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Point Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {ranking?.points_mode === 'flexible' ? 'Flexible Points' : 'Fixed Points'}
        </h2>
        {ranking?.points_mode === 'flexible' ? (
          <>
            <div className="flex flex-wrap gap-3">
              <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm">
                <span className="text-gray-500 dark:text-gray-400">WB Win:</span>{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">+{ranking?.winner_bracket_multiplier}pts</span>
              </div>
              <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-sm">
                <span className="text-gray-500 dark:text-gray-400">LB Win:</span>{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">+{ranking?.loser_bracket_multiplier}pts</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="px-3 py-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg text-sm">
                <span className="text-gray-500 dark:text-gray-400">WB Base:</span>{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{ranking?.flexible_base_winner}pts</span>
              </div>
              <div className="px-3 py-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg text-sm">
                <span className="text-gray-500 dark:text-gray-400">LB Base:</span>{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{ranking?.flexible_base_loser}pts</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-3">
            {[
              ['1st', ranking?.points_first],
              ['2nd', ranking?.points_second],
              ['3rd', ranking?.points_third],
              ['4th', ranking?.points_fourth],
              ['5th', ranking?.points_fifth],
              ['6th', ranking?.points_sixth],
              ['7th', ranking?.points_seventh],
              ['8th', ranking?.points_eighth],
              ['Participation', ranking?.points_participation],
            ].map(([label, pts]) => (
              <div key={label} className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                <span className="text-gray-500 dark:text-gray-400">{label}:</span>{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{pts}pts</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tournaments */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Tournaments ({tournaments.length})
        </h2>
        {tournaments.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No tournaments assigned to this ranking yet. Edit a tournament and select this ranking.
          </p>
        ) : (
          <div className="space-y-2">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                to={`/tournaments/${t.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {t.start_date && <span>{t.start_date}</span>}
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">{t.status.replace('_', ' ')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Standings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Standings</h2>
        </div>
        {standings.length === 0 ? (
          <div className="p-8 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No ranking data yet. Add tournaments and recalculate.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Player</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Points</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tournaments</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Best</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {standings.map((s, idx) => (
                  <tr key={s.player_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-3 text-sm font-bold text-gray-900 dark:text-gray-100">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {s.player_name}
                    </td>
                    <td className="px-6 py-3 text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                      {s.total_points}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-gray-500 dark:text-gray-400">
                      {s.tournaments_played}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-gray-500 dark:text-gray-400">
                      {placementLabel(s.best_placement)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
