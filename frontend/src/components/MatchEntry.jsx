import { useEffect, useState, useMemo } from 'react';
import api from '../lib/api';
import { Check, Columns2, Printer } from 'lucide-react';

/**
 * Distribute matches across boards so that in each time-slot no player
 * appears on more than one board. Matches are consumed in play_order,
 * and we greedily fill each slot across the available boards.
 */
function distributeToBoards(matches, numBoards) {
  if (numBoards <= 1) return [matches];

  const boards = Array.from({ length: numBoards }, () => []);
  const remaining = [...matches];

  while (remaining.length > 0) {
    const playersInSlot = new Set();

    for (let board = 0; board < numBoards; board++) {
      // Find first remaining match whose players are free in this slot
      const idx = remaining.findIndex(
        (m) => !playersInSlot.has(m.player1_id) && !playersInSlot.has(m.player2_id)
      );
      if (idx === -1) break;

      const match = remaining.splice(idx, 1)[0];
      playersInSlot.add(match.player1_id);
      playersInSlot.add(match.player2_id);
      boards[board].push(match);
    }
  }

  return boards;
}

export default function MatchEntry({ tournamentId, tournament }) {
  const [poolMatches, setPoolMatches] = useState([]);
  const [bracketMatches, setBracketMatches] = useState([]);
  const [scores, setScores] = useState({});
  const [activeTab, setActiveTab] = useState(
    tournament?.status === 'knockout_stage' ? 'bracket' : 'pool'
  );
  const [numBoards, setNumBoards] = useState(1);

  const printBoard = (boardMatches, boardIdx) => {
    const tournamentName = tournament?.name || 'Tournament';
    const boardTitle = numBoards > 1 ? `Board ${boardIdx + 1}` : 'Match Playlist';
    const rows = boardMatches
      .map(
        (m, i) =>
          `<tr>
            <td style="padding:6px 12px;text-align:center;border-bottom:1px solid #e5e7eb;">${m.play_order ?? i + 1}</td>
            <td style="padding:6px 12px;text-align:right;border-bottom:1px solid #e5e7eb;">${m.player1_name || 'TBD'}</td>
            <td style="padding:6px 12px;text-align:center;border-bottom:1px solid #e5e7eb;">vs</td>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${m.player2_name || 'TBD'}</td>
            <td style="padding:6px 12px;text-align:center;border-bottom:1px solid #e5e7eb;color:#6b7280;">${m.pool_name || ''}</td>
            <td style="padding:6px 40px;border-bottom:1px solid #e5e7eb;"></td>
          </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html><html><head><title>${boardTitle} - ${tournamentName}</title>
      <style>body{font-family:Arial,sans-serif;margin:24px;}table{border-collapse:collapse;width:100%;}th{text-align:left;padding:8px 12px;border-bottom:2px solid #111;font-size:13px;}h1{font-size:18px;margin-bottom:4px;}h2{font-size:14px;color:#6b7280;margin-top:0;margin-bottom:16px;}@media print{body{margin:12px;}}</style>
    </head><body>
      <h1>${tournamentName}</h1>
      <h2>${boardTitle} &mdash; ${boardMatches.length} matches</h2>
      <table>
        <thead><tr>
          <th style="text-align:center;width:40px">#</th>
          <th style="text-align:right">Player 1</th>
          <th style="text-align:center;width:30px"></th>
          <th>Player 2</th>
          <th style="text-align:center">Pool</th>
          <th style="width:80px">Score</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const load = () => {
    api.get(`/tournaments/${tournamentId}/pools`).then((r) => {
      const all = r.data.flatMap((p) => p.matches);
      // Sort by play_order for fair scheduling across pools
      all.sort((a, b) => (a.play_order ?? Infinity) - (b.play_order ?? Infinity));
      setPoolMatches(all);
    });
    api.get(`/tournaments/${tournamentId}/bracket`).then((r) => {
      setBracketMatches(r.data);
    });
  };

  useEffect(load, [tournamentId]);

  const handleScore = (matchId, field, value) => {
    setScores((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: parseInt(value) || 0 },
    }));
  };

  const submitPoolScore = async (matchId) => {
    const s = scores[matchId];
    if (!s || s.player1_legs === undefined || s.player2_legs === undefined) {
      alert('Enter both scores');
      return;
    }
    try {
      await api.put(`/tournaments/${tournamentId}/pool-matches/${matchId}/score`, {
        player1_legs: s.player1_legs,
        player2_legs: s.player2_legs,
      });
      setScores((prev) => ({ ...prev, [matchId]: undefined }));
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error updating score');
    }
  };

  const submitBracketScore = async (matchId) => {
    const s = scores[matchId];
    if (!s || s.player1_legs === undefined || s.player2_legs === undefined) {
      alert('Enter both scores');
      return;
    }
    try {
      await api.put(`/tournaments/${tournamentId}/bracket-matches/${matchId}/score`, {
        player1_legs: s.player1_legs,
        player2_legs: s.player2_legs,
      });
      setScores((prev) => ({ ...prev, [matchId]: undefined }));
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error updating score');
    }
  };

  const unplayedPool = poolMatches.filter((m) => m.played === 0);
  const unplayedBracket = bracketMatches.filter(
    (m) => m.played === 0 && m.player1_id && m.player2_id
  );

  // Distribute unplayed pool matches across boards
  const poolBoards = useMemo(
    () => distributeToBoards(unplayedPool, numBoards),
    [unplayedPool, numBoards]
  );

  const MatchScoreRow = ({ match, onSubmit, index }) => (
    <div className="flex flex-col sm:flex-row items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="shrink-0 w-auto min-w-[4rem] text-xs font-semibold text-gray-400 dark:text-gray-500 tabular-nums">
        #{match.play_order ?? index + 1}
        {match.pool_name && (
          <span className="ml-1 text-blue-500 dark:text-blue-400">{match.pool_name}</span>
        )}
        {match.bracket_type && (
          <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
            match.bracket_type === 'winner'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
          }`}>
            {match.bracket_type === 'winner' ? 'W' : 'L'}
          </span>
        )}
      </span>
      <span className="flex-1 text-right font-medium text-gray-900 dark:text-gray-100 text-sm">
        {match.player1_name || 'TBD'}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          className="w-16 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          value={scores[match.id]?.player1_legs ?? ''}
          onChange={(e) => handleScore(match.id, 'player1_legs', e.target.value)}
        />
        <span className="text-gray-400">-</span>
        <input
          type="number"
          min="0"
          className="w-16 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          value={scores[match.id]?.player2_legs ?? ''}
          onChange={(e) => handleScore(match.id, 'player2_legs', e.target.value)}
        />
      </div>
      <span className="flex-1 font-medium text-gray-900 dark:text-gray-100 text-sm">
        {match.player2_name || 'TBD'}
      </span>
      <button
        onClick={() => onSubmit(match.id)}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 font-medium"
      >
        <Check className="w-3.5 h-3.5" />
        Save
      </button>
    </div>
  );

  return (
    <div>
      {/* Tabs + board selector row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => setActiveTab('pool')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'pool' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
          }`}
        >
          Pool Matches ({unplayedPool.length} remaining)
        </button>
        <button
          onClick={() => setActiveTab('bracket')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'bracket' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
          }`}
        >
          Bracket Matches ({unplayedBracket.length} ready)
        </button>

        {/* Board count selector */}
        {activeTab === 'pool' && (
          <div className="ml-auto flex items-center gap-2">
            <Columns2 className="w-4 h-4 text-gray-400" />
            <label className="text-sm text-gray-600 dark:text-gray-400">Boards:</label>
            <input
              type="number"
              min="1"
              max="20"
              value={numBoards}
              onChange={(e) => setNumBoards(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* Pool matches — per-board layout */}
      {activeTab === 'pool' && (
        <>
          {unplayedPool.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center text-gray-500 dark:text-gray-400">
              All pool matches have been played!
            </div>
          ) : (
            <div className={`grid gap-4 ${numBoards === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
              {poolBoards.map((boardMatches, boardIdx) => (
                <div key={boardIdx} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {numBoards > 1 ? `Board ${boardIdx + 1}` : 'Pool Match Scores'}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {boardMatches.length} match{boardMatches.length !== 1 ? 'es' : ''}
                      </span>
                      <button
                        onClick={() => printBoard(boardMatches, boardIdx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Print playlist"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </button>
                    </div>
                  </div>
                  {numBoards === 1 && (
                    <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Enter the number of legs won by each player</p>
                    </div>
                  )}
                  {boardMatches.map((m, i) => (
                    <MatchScoreRow key={m.id} match={m} onSubmit={submitPoolScore} index={i} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bracket matches */}
      {activeTab === 'bracket' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Bracket Match Scores</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Score matches where both players are assigned</p>
          </div>
          {unplayedBracket.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">No bracket matches ready to score</div>
          ) : (
            unplayedBracket.map((m, i) => (
              <MatchScoreRow key={m.id} match={m} onSubmit={submitBracketScore} index={i} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
