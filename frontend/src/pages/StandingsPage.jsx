import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function StandingsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [standings, setStandings] = useState([]);

  useEffect(() => {
    api.get('/tournaments').then((r) => {
      setTournaments(r.data);
      if (r.data.length > 0) {
        const active = r.data.find(
          (t) => t.status === 'pool_stage' || t.status === 'knockout_stage'
        );
        setSelectedId((active || r.data[0]).id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedId) {
      api.get(`/tournaments/${selectedId}/standings`).then((r) => setStandings(r.data));
    }
  }, [selectedId]);

  const pools = {};
  standings.forEach((s) => {
    if (!pools[s.pool_name]) pools[s.pool_name] = [];
    pools[s.pool_name].push(s);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Standings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Pool stage standings</p>
        </div>
        <select
          value={selectedId || ''}
          onChange={(e) => setSelectedId(parseInt(e.target.value))}
          className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {standings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No standings available for this tournament.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(pools).map(([name, players]) => (
            <div key={name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{name}</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-400">#</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Player</th>
                    <th className="px-6 py-3 text-center font-medium text-gray-500 dark:text-gray-400">P</th>
                    <th className="px-6 py-3 text-center font-medium text-gray-500 dark:text-gray-400">W</th>
                    <th className="px-6 py-3 text-center font-medium text-gray-500 dark:text-gray-400">L</th>
                    <th className="px-6 py-3 text-center font-medium text-gray-500 dark:text-gray-400">LD</th>
                    <th className="px-6 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {players.map((s, idx) => (
                    <tr key={s.player_id} className={idx < 2 ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : ''}>
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-100">{idx + 1}</td>
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-100">{s.player_name}</td>
                      <td className="px-6 py-3 text-center text-gray-600 dark:text-gray-400">{s.matches_played}</td>
                      <td className="px-6 py-3 text-center text-emerald-700 dark:text-emerald-400 font-medium">{s.wins}</td>
                      <td className="px-6 py-3 text-center text-red-600 dark:text-red-400">{s.losses}</td>
                      <td className="px-6 py-3 text-center">
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
          ))}
        </div>
      )}
    </div>
  );
}
