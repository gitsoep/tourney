import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Target, BarChart3, GitBranch, Users, Star } from 'lucide-react';

const publicApi = axios.create({ baseURL: '/api/public' });

const TABS = ['Overview', 'Pools', 'Standings', 'Bracket'];

export default function PublicTournamentPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [pools, setPools] = useState([]);
  const [standings, setStandings] = useState([]);
  const [bracket, setBracket] = useState([]);
  const [rankingPoints, setRankingPoints] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    publicApi
      .get(`/tournaments/${id}`)
      .then((r) => {
        setTournament(r.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Tournament not found or not published.');
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!tournament) return;
    publicApi.get(`/tournaments/${id}/pools`).then((r) => setPools(r.data));
    publicApi.get(`/tournaments/${id}/standings`).then((r) => setStandings(r.data));
    publicApi.get(`/tournaments/${id}/bracket`).then((r) => setBracket(r.data));
    publicApi.get(`/tournaments/${id}/ranking-points`).then((r) => {
      const pointsMap = {};
      (r.data || []).forEach((e) => { pointsMap[e.player_id] = e.points; });
      setRankingPoints(pointsMap);
    }).catch(() => setRankingPoints({}));
  }, [tournament, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Not Available</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700">Go to login &rarr;</Link>
        </div>
      </div>
    );
  }

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    pool_stage: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    knockout_stage: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    finished: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  };

  // Group standings by pool
  const standingsByPool = {};
  standings.forEach((s) => {
    if (!standingsByPool[s.pool_name]) standingsByPool[s.pool_name] = [];
    standingsByPool[s.pool_name].push(s);
  });

  // Group bracket by type and round
  const winnerMatches = bracket.filter((m) => m.bracket_type === 'winner');
  const loserMatches = bracket.filter((m) => m.bracket_type === 'loser');
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm text-gray-400 dark:text-gray-500">Tourney</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tournament.name}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[tournament.status]}`}>
                  {tournament.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {tournament.location || 'No location'} &middot; {tournament.game_format} &middot; {tournament.player_count || 0} players
                {tournament.start_date && ` \u00b7 ${new Date(tournament.start_date).toLocaleDateString()}`}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-0 overflow-x-auto -mb-px">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  tab === t
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Overview */}
        {tab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Tournament Info</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Format</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{tournament.game_format}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Group Size</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{tournament.group_size}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Best of (Pool)</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{tournament.best_of_legs_pool} legs</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Best of (Knockout)</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{tournament.best_of_legs_knockout} legs</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Start Date</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : 'Not set'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                  <dd className="font-medium capitalize text-gray-900 dark:text-gray-100">
                    {tournament.status.replace('_', ' ')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Players</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{tournament.player_count || 0}</dd>
                </div>
              </dl>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{pools.length}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">Pools</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {pools.reduce((sum, p) => sum + p.matches.filter((m) => m.played).length, 0)}
                  </p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">Matches Played</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{bracket.length}</p>
                  <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">Bracket Matches</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{tournament.player_count || 0}</p>
                  <p className="text-sm text-purple-600 dark:text-purple-500 mt-1">Players</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pools */}
        {tab === 'Pools' && (
          pools.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No pools generated yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pools.map((pool) => (
                <div key={pool.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{pool.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{pool.players.length} players</p>
                  </div>
                  <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex flex-wrap gap-2">
                      {pool.players.map((p) => (
                        <span key={p.player_id} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                          {p.player_name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {[...pool.matches].sort((a, b) => (a.play_order ?? Infinity) - (b.play_order ?? Infinity)).map((m) => (
                      <div key={m.id} className={`px-6 py-3 flex items-center justify-between text-sm ${m.played ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/30'}`}>
                        <span className="shrink-0 w-8 text-xs font-semibold text-gray-400 dark:text-gray-500 tabular-nums">
                          #{m.play_order ?? ''}
                        </span>
                        <span className={`flex-1 text-right ${m.winner_id === m.player1_id ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {m.player1_name}
                        </span>
                        <span className="mx-4 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm min-w-[60px] text-center text-gray-900 dark:text-gray-100">
                          {m.played ? `${m.player1_legs} - ${m.player2_legs}` : 'vs'}
                        </span>
                        <span className={`flex-1 ${m.winner_id === m.player2_id ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {m.player2_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Standings */}
        {tab === 'Standings' && (
          standings.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No standings available.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(standingsByPool).map(([poolName, players]) => (
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
                </div>
              ))}
            </div>
          )
        )}

        {/* Bracket */}
        {tab === 'Bracket' && (
          bracket.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No bracket generated yet.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Winner Bracket */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-blue-600" />
                  Winner Bracket
                </h3>
                <div className="overflow-x-auto">
                  <div className="flex gap-8 pb-4 min-w-max">
                    {Object.entries(wbRounds)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([rnd, ms]) => (
                        <div key={rnd} className="flex flex-col gap-4 min-w-[220px]">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                            Round {rnd}
                          </div>
                          <div className="flex flex-col gap-4 justify-around flex-1">
                            {ms.map((match) => (
                              <PublicMatchBox key={match.id} match={match} rankingPoints={rankingPoints} />
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Loser Bracket */}
              {Object.keys(lbRounds).length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-red-500" />
                    Loser Bracket
                  </h3>
                  <div className="overflow-x-auto">
                    <div className="flex gap-8 pb-4 min-w-max">
                      {Object.entries(lbRounds)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([rnd, ms]) => (
                          <div key={rnd} className="flex flex-col gap-4 min-w-[220px]">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                              LB Round {rnd}
                            </div>
                            <div className="flex flex-col gap-4 justify-around flex-1">
                              {ms.map((match) => (
                                <PublicMatchBox key={match.id} match={match} rankingPoints={rankingPoints} />
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function PublicMatchBox({ match, rankingPoints = {} }) {
  const isPlayed = match.played === 1;
  const hasPoints = Object.keys(rankingPoints).length > 0;
  const p1Points = match.player1_id ? rankingPoints[match.player1_id] : undefined;
  const p2Points = match.player2_id ? rankingPoints[match.player2_id] : undefined;
  return (
    <div
      className={`border rounded-lg p-3 min-w-[200px] text-sm ${
        isPlayed
          ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
          : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50'
      }`}
    >
      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">
        Match {match.match_number}
      </div>
      <div
        className={`flex items-center justify-between py-1 px-2 rounded ${
          isPlayed && match.winner_id === match.player1_id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
        }`}
      >
        <span className={`truncate ${isPlayed && match.winner_id === match.player1_id ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
          {match.player1_name || (match.player1_id ? `Player ${match.player1_id}` : 'TBD')}
        </span>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {hasPoints && p1Points !== undefined && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 rounded-full">
              <Star className="w-2.5 h-2.5" />
              {p1Points}
            </span>
          )}
          <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{isPlayed ? match.player1_legs : ''}</span>
        </div>
      </div>
      <div
        className={`flex items-center justify-between py-1 px-2 rounded ${
          isPlayed && match.winner_id === match.player2_id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
        }`}
      >
        <span className={`truncate ${isPlayed && match.winner_id === match.player2_id ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
          {match.player2_name || (match.player2_id ? `Player ${match.player2_id}` : 'TBD')}
        </span>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {hasPoints && p2Points !== undefined && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 rounded-full">
              <Star className="w-2.5 h-2.5" />
              {p2Points}
            </span>
          )}
          <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{isPlayed ? match.player2_legs : ''}</span>
        </div>
      </div>
    </div>
  );
}
