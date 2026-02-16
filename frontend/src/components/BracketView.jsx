import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Trophy, Pencil, Check, X, Printer } from 'lucide-react';

export default function BracketView({ tournamentId }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState(null);
  const [editScores, setEditScores] = useState({ player1_legs: 0, player2_legs: 0 });

  const load = () => {
    api.get(`/tournaments/${tournamentId}/bracket`).then((r) => {
      setMatches(r.data);
      setLoading(false);
    });
  };

  useEffect(load, [tournamentId]);

  const startEdit = (match) => {
    setEditingMatch(match.id);
    setEditScores({
      player1_legs: match.played === 1 ? match.player1_legs : 0,
      player2_legs: match.played === 1 ? match.player2_legs : 0,
    });
  };

  const cancelEdit = () => {
    setEditingMatch(null);
    setEditScores({ player1_legs: 0, player2_legs: 0 });
  };

  const saveScore = async (matchId) => {
    try {
      await api.put(`/tournaments/${tournamentId}/bracket-matches/${matchId}/score`, editScores);
      setEditingMatch(null);
      load();
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

  if (matches.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">No bracket generated yet.</p>
      </div>
    );
  }

  const winnerMatches = matches.filter((m) => m.bracket_type === 'winner');
  const loserMatches = matches.filter((m) => m.bracket_type === 'loser');

  const groupByRound = (arr) => {
    const rounds = {};
    arr.forEach((m) => {
      if (!rounds[m.round_number]) rounds[m.round_number] = [];
      rounds[m.round_number].push(m);
    });
    return rounds;
  };

  const wbRounds = groupByRound(winnerMatches);
  const lbRounds = groupByRound(loserMatches);

  const MatchBox = ({ match }) => {
    const isPlayed = match.played === 1;
    const isEditing = editingMatch === match.id;
    const hasBothPlayers = match.player1_id && match.player2_id;

    return (
      <div
        className={`border rounded-lg p-3 min-w-[200px] text-sm ${
          isPlayed ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800' : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">
            Match {match.match_number}
          </div>
          {hasBothPlayers && !isEditing && (
            <button
              onClick={() => startEdit(match)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
              title="Edit score"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {isEditing && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => saveScore(match.id)}
                className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"
                title="Save"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={cancelEdit}
                className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <div
          className={`flex items-center justify-between py-1 px-2 rounded ${
            isPlayed && match.winner_id === match.player1_id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
          }`}
        >
          <span className={`truncate ${
            isPlayed && match.winner_id === match.player1_id ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
          }`}>
            {match.player1_name || (match.player1_id ? `Player ${match.player1_id}` : 'TBD')}
          </span>
          {isEditing ? (
            <input
              type="number"
              min="0"
              className="w-12 px-1 py-0.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-center text-xs focus:ring-2 focus:ring-blue-500 outline-none ml-2"
              value={editScores.player1_legs}
              onChange={(e) => setEditScores((s) => ({ ...s, player1_legs: parseInt(e.target.value) || 0 }))}
              autoFocus
            />
          ) : (
            <span className="font-mono text-xs ml-2 text-gray-700 dark:text-gray-300">{isPlayed ? match.player1_legs : ''}</span>
          )}
        </div>
        <div
          className={`flex items-center justify-between py-1 px-2 rounded ${
            isPlayed && match.winner_id === match.player2_id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
          }`}
        >
          <span className={`truncate ${
            isPlayed && match.winner_id === match.player2_id ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
          }`}>
            {match.player2_name || (match.player2_id ? `Player ${match.player2_id}` : 'TBD')}
          </span>
          {isEditing ? (
            <input
              type="number"
              min="0"
              className="w-12 px-1 py-0.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-center text-xs focus:ring-2 focus:ring-blue-500 outline-none ml-2"
              value={editScores.player2_legs}
              onChange={(e) => setEditScores((s) => ({ ...s, player2_legs: parseInt(e.target.value) || 0 }))}
            />
          ) : (
            <span className="font-mono text-xs ml-2 text-gray-700 dark:text-gray-300">{isPlayed ? match.player2_legs : ''}</span>
          )}
        </div>
      </div>
    );
  };

  const RoundColumn = ({ roundNum, roundMatches, label }) => (
    <div className="flex flex-col gap-4 min-w-[220px]">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
        {label || `Round ${roundNum}`}
      </div>
      <div className="flex flex-col gap-4 justify-around flex-1">
        {roundMatches.map((m) => (
          <MatchBox key={m.id} match={m} />
        ))}
      </div>
    </div>
  );

  const printBracketSection = (title, rounds) => {
    const w = window.open('', '_blank');
    const roundEntries = Object.entries(rounds).sort(([a], [b]) => Number(a) - Number(b));
    const cols = roundEntries.map(([rnd, ms]) => {
      const matchBoxes = ms.map((m) => {
        const isPlayed = m.played === 1;
        const p1 = m.player1_name || (m.player1_id ? `Player ${m.player1_id}` : 'TBD');
        const p2 = m.player2_name || (m.player2_id ? `Player ${m.player2_id}` : 'TBD');
        const p1Bold = isPlayed && m.winner_id === m.player1_id ? 'font-weight:bold' : '';
        const p2Bold = isPlayed && m.winner_id === m.player2_id ? 'font-weight:bold' : '';
        const score1 = isPlayed ? m.player1_legs : '';
        const score2 = isPlayed ? m.player2_legs : '';
        const border = isPlayed ? 'border:1px solid #d1d5db' : 'border:1px dashed #d1d5db';
        return `<div style="${border};border-radius:6px;padding:8px;min-width:180px;font-size:13px;margin-bottom:8px"><div style="color:#999;font-size:10px;text-transform:uppercase;margin-bottom:4px">Match ${m.match_number}</div><div style="display:flex;justify-content:space-between;${p1Bold}">${p1}<span style="font-family:monospace;margin-left:8px">${score1}</span></div><div style="display:flex;justify-content:space-between;${p2Bold}">${p2}<span style="font-family:monospace;margin-left:8px">${score2}</span></div></div>`;
      }).join('');
      return `<div style="min-width:200px"><div style="text-align:center;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Round ${rnd}</div>${matchBoxes}</div>`;
    }).join('');
    const html = `<h2 style="margin:0 0 12px">${title}</h2><div style="display:flex;gap:24px;overflow-x:auto;padding-bottom:8px">${cols}</div>`;
    w.document.write(`<html><head><title>${title}</title><style>body{font-family:system-ui,sans-serif;padding:20px}@media print{button{display:none}}</style></head><body>${html}<br><button onclick="window.print()" style="padding:8px 20px;cursor:pointer">Print</button></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-blue-600" />
            Winner Bracket
          </h3>
          <button
            onClick={() => printBracketSection('Winner Bracket', wbRounds)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            title="Print Winner Bracket"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-8 pb-4 min-w-max">
            {Object.entries(wbRounds)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([rnd, ms]) => (
                <RoundColumn key={rnd} roundNum={rnd} roundMatches={ms} />
              ))}
          </div>
        </div>
      </div>

      {Object.keys(lbRounds).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-red-500" />
              Loser Bracket
            </h3>
            <button
              onClick={() => printBracketSection('Loser Bracket', lbRounds)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Print Loser Bracket"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-8 pb-4 min-w-max">
              {Object.entries(lbRounds)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([rnd, ms]) => (
                  <RoundColumn key={rnd} roundNum={rnd} roundMatches={ms} label={`LB Round ${rnd}`} />
                ))}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
