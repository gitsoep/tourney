import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Pencil, Check, X, Printer } from 'lucide-react';

export default function PoolsView({ tournamentId }) {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState(null);
  const [editScores, setEditScores] = useState({ player1_legs: 0, player2_legs: 0 });

  const loadPools = () => {
    api.get(`/tournaments/${tournamentId}/pools`).then((r) => {
      setPools(r.data);
      setLoading(false);
    });
  };

  useEffect(loadPools, [tournamentId]);

  const startEdit = (match) => {
    setEditingMatch(match.id);
    setEditScores({
      player1_legs: match.played ? match.player1_legs : 0,
      player2_legs: match.played ? match.player2_legs : 0,
    });
  };

  const cancelEdit = () => {
    setEditingMatch(null);
    setEditScores({ player1_legs: 0, player2_legs: 0 });
  };

  const saveScore = async (matchId) => {
    try {
      await api.put(`/tournaments/${tournamentId}/pool-matches/${matchId}/score`, editScores);
      setEditingMatch(null);
      loadPools();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error updating score');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">No pools generated yet. Generate pools from the Overview tab.</p>
      </div>
    );
  }

  const printPool = (pool) => {
    const w = window.open('', '_blank');
    const sorted = [...pool.matches].sort((a, b) => (a.play_order ?? Infinity) - (b.play_order ?? Infinity));
    const rows = sorted.map((m) => {
      const score = m.played ? `${m.player1_legs} - ${m.player2_legs}` : 'vs';
      const p1Style = m.winner_id === m.player1_id ? 'font-weight:bold' : '';
      const p2Style = m.winner_id === m.player2_id ? 'font-weight:bold' : '';
      return `<tr><td style="text-align:center;color:#888">${m.play_order ?? ''}</td><td style="text-align:right;${p1Style}">${m.player1_name}</td><td style="text-align:center;background:#f3f4f6;border-radius:4px;font-family:monospace">${score}</td><td style="${p2Style}">${m.player2_name}</td></tr>`;
    }).join('');
    const players = pool.players.map(p => p.player_name).join(', ');
    const html = `<h2 style="margin:0 0 4px">${pool.name}</h2><p style="color:#888;margin:0 0 8px;font-size:13px">${players}</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>${rows}</tbody></table>`;
    w.document.write(`<html><head><title>${pool.name}</title><style>body{font-family:system-ui,sans-serif;padding:20px;max-width:800px;margin:auto}td{padding:6px 10px}tr:nth-child(even){background:#f9fafb}@media print{button{display:none}}</style></head><body>${html}<br><button onclick="window.print()" style="padding:8px 20px;cursor:pointer">Print</button></body></html>`);
    w.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {pools.map((pool) => (
        <div key={pool.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{pool.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{pool.players.length} players</p>
            </div>
            <button
              onClick={() => printPool(pool)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title={`Print ${pool.name}`}
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>

          {/* Players */}
          <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {pool.players.map((p) => (
                <span
                  key={p.player_id}
                  className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
                >
                  {p.player_name}
                </span>
              ))}
            </div>
          </div>

          {/* Matches */}
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {[...pool.matches].sort((a, b) => (a.play_order ?? Infinity) - (b.play_order ?? Infinity)).map((m) => (
              <div
                key={m.id}
                className={`px-6 py-3 flex items-center justify-between text-sm ${
                  m.played ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/30'
                }`}
              >
                {editingMatch === m.id ? (
                  /* Inline edit mode */
                  <>
                    <span className="shrink-0 w-8 text-xs font-semibold text-gray-400 dark:text-gray-500 tabular-nums">
                      #{m.play_order ?? ''}
                    </span>
                    <span className="flex-1 text-right text-gray-700 dark:text-gray-300 font-medium">
                      {m.player1_name}
                    </span>
                    <div className="mx-3 flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        className="w-12 px-1 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={editScores.player1_legs}
                        onChange={(e) => setEditScores((s) => ({ ...s, player1_legs: parseInt(e.target.value) || 0 }))}
                        autoFocus
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="number"
                        min="0"
                        className="w-12 px-1 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={editScores.player2_legs}
                        onChange={(e) => setEditScores((s) => ({ ...s, player2_legs: parseInt(e.target.value) || 0 }))}
                      />
                      <button
                        onClick={() => saveScore(m.id)}
                        className="ml-1 p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="flex-1 text-gray-700 dark:text-gray-300 font-medium">
                      {m.player2_name}
                    </span>
                  </>
                ) : (
                  /* Display mode */
                  <>
                    <span className="shrink-0 w-8 text-xs font-semibold text-gray-400 dark:text-gray-500 tabular-nums">
                      #{m.play_order ?? ''}
                    </span>
                    <span
                      className={`flex-1 text-right ${
                        m.winner_id === m.player1_id ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {m.player1_name}
                    </span>
                    <span className="mx-4 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm min-w-[60px] text-center text-gray-900 dark:text-gray-100">
                      {m.played ? `${m.player1_legs} - ${m.player2_legs}` : 'vs'}
                    </span>
                    <span
                      className={`flex-1 ${
                        m.winner_id === m.player2_id ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {m.player2_name}
                    </span>
                    <button
                      onClick={() => startEdit(m)}
                      className="ml-2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Edit score"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
