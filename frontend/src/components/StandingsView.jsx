import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function StandingsView({ tournamentId }) {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/tournaments/${tournamentId}/standings`).then((r) => {
      setStandings(r.data);
      setLoading(false);
    });
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (standings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">No standings available. Generate pools and play matches first.</p>
      </div>
    );
  }

  // Group by pool
  const pools = {};
  standings.forEach((s) => {
    if (!pools[s.pool_name]) pools[s.pool_name] = [];
    pools[s.pool_name].push(s);
  });

  return (
    <div className="space-y-6">
      {Object.entries(pools).map(([poolName, players]) => (
        <div key={poolName} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{poolName} Standings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">#</th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Player</th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">P</th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">W</th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">L</th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">LW</th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">LL</th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">LD</th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {players.map((s, idx) => (
                  <tr key={s.player_id} className={idx < 2 ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : ''}>
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-100">{idx + 1}</td>
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-100">{s.player_name}</td>
                    <td className="px-6 py-3 text-center text-gray-600 dark:text-gray-400">{s.matches_played}</td>
                    <td className="px-6 py-3 text-center font-medium text-emerald-700 dark:text-emerald-400">{s.wins}</td>
                    <td className="px-6 py-3 text-center text-red-600 dark:text-red-400">{s.losses}</td>
                    <td className="px-6 py-3 text-center text-gray-600 dark:text-gray-400">{s.legs_won}</td>
                    <td className="px-6 py-3 text-center text-gray-600 dark:text-gray-400">{s.legs_lost}</td>
                    <td className="px-6 py-3 text-center font-medium">
                      <span className={s.leg_difference >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                        {s.leg_difference >= 0 ? '+' : ''}{s.leg_difference}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center font-bold text-gray-900 dark:text-gray-100">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400">
              Green rows indicate qualifying positions &middot; P = Played, W = Wins, L = Losses, LW = Legs Won, LL = Legs Lost, LD = Leg Difference, Pts = Points
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
