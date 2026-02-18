import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import DartboardIcon from '../components/DartboardIcon';

const publicApi = axios.create({ baseURL: '/api/public' });

export default function PublicRankingPage() {
  const { id } = useParams();
  const [ranking, setRanking] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      publicApi.get(`/rankings/${id}`),
      publicApi.get(`/rankings/${id}/standings`),
    ]).then(([rankingRes, standingsRes]) => {
      setRanking(rankingRes.data);
      setStandings(standingsRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const placementLabel = (p) => {
    if (!p) return '-';
    if (p === 1) return '1st';
    if (p === 2) return '2nd';
    if (p === 3) return '3rd';
    return `${p}th`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <DartboardIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tourney</h1>
          </div>
          <Link
            to="/public/rankings"
            className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Rankings
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : !ranking ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Ranking not found.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ranking.name}</h2>
              {ranking.description && (
                <p className="text-gray-500 dark:text-gray-400 mt-1">{ranking.description}</p>
              )}
            </div>

            {/* Point Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {ranking.points_mode === 'flexible' ? 'Flexible Points' : 'Fixed Points'}
              </h3>
              {ranking.points_mode === 'flexible' ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm">
                      <span className="text-gray-500 dark:text-gray-400">WB Win:</span>{' '}
                      <span className="font-semibold text-gray-900 dark:text-gray-100">+{ranking.winner_bracket_multiplier}pts</span>
                    </div>
                    <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-sm">
                      <span className="text-gray-500 dark:text-gray-400">LB Win:</span>{' '}
                      <span className="font-semibold text-gray-900 dark:text-gray-100">+{ranking.loser_bracket_multiplier}pts</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <div className="px-3 py-1 bg-green-50 dark:bg-green-900/30 rounded-lg text-sm">
                      <span className="text-gray-500 dark:text-gray-400">WB Base:</span>{' '}
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{ranking.flexible_base_winner}pts</span>
                    </div>
                    <div className="px-3 py-1 bg-green-50 dark:bg-green-900/30 rounded-lg text-sm">
                      <span className="text-gray-500 dark:text-gray-400">LB Base:</span>{' '}
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{ranking.flexible_base_loser}pts</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[
                    ['1st', ranking.points_first],
                    ['2nd', ranking.points_second],
                    ['3rd', ranking.points_third],
                    ['4th', ranking.points_fourth],
                    ['5th', ranking.points_fifth],
                    ['6th', ranking.points_sixth],
                    ['7th', ranking.points_seventh],
                    ['8th', ranking.points_eighth],
                    ['Participation', ranking.points_participation],
                  ].map(([label, pts]) => (
                    <div key={label} className="px-3 py-1 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{label}:</span>{' '}
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{pts}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Standings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Standings</h3>
              </div>
              {standings.length === 0 ? (
                <div className="p-8 text-center">
                  <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">No ranking data available yet.</p>
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
                        <tr key={s.player_id} className={`${idx < 3 ? 'bg-yellow-50/30 dark:bg-yellow-900/10' : ''}`}>
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
          </>
        )}
      </div>
    </div>
  );
}
