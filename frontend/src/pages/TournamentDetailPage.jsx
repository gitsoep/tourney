import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Users, Edit, Play, Trophy, X, RefreshCw, AlertTriangle, Globe, Link2, Check as CheckIcon } from 'lucide-react';
import PoolsView from '../components/PoolsView';
import StandingsView from '../components/StandingsView';
import BracketView from '../components/BracketView';
import MatchEntry from '../components/MatchEntry';
import TournamentPlayers from '../components/TournamentPlayers';

const TABS = ['Overview', 'Players', 'Pools', 'Standings', 'Bracket', 'Match Entry'];

export default function TournamentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [showBracketModal, setShowBracketModal] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [standings, setStandings] = useState([]);
  const [winnersPerPool, setWinnersPerPool] = useState(2);
  const [advanceMode, setAdvanceMode] = useState('per_pool'); // 'per_pool' | 'total'
  const [totalWinnersInput, setTotalWinnersInput] = useState(4);
  const [linkCopied, setLinkCopied] = useState(false);

  const load = () => {
    api.get(`/tournaments/${id}`).then((r) => {
      setTournament(r.data);
      setLoading(false);
    });
  };

  useEffect(load, [id]);

  if (loading || !tournament) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    pool_stage: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    knockout_stage: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    finished: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  };

  const handleGeneratePools = async () => {
    try {
      await api.post(`/tournaments/${id}/generate-pools`);
      load();
      setTab('Pools');
    } catch (err) {
      alert(err.response?.data?.detail || 'Error generating pools');
    }
  };

  const handleGenerateBracket = async () => {
    // Load standings to show in the modal
    try {
      const r = await api.get(`/tournaments/${id}/standings`);
      setStandings(r.data);
      setWinnersPerPool(2);
      setAdvanceMode('per_pool');
      // Default total winners = 2 * number of pools
      const poolNames = new Set(r.data.map((s) => s.pool_name));
      setTotalWinnersInput(poolNames.size * 2);
      setShowBracketModal(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error loading standings');
    }
  };

  const handleConfirmBracket = async () => {
    try {
      const param = advanceMode === 'total'
        ? `total_winners=${totalWinnersInput}`
        : `winners_per_pool=${winnersPerPool}`;
      await api.post(`/tournaments/${id}/generate-bracket?${param}`);
      setShowBracketModal(false);
      load();
      setTab('Bracket');
    } catch (err) {
      alert(err.response?.data?.detail || 'Error generating bracket');
    }
  };

  // Group standings by pool for the modal
  const poolsForModal = {};
  standings.forEach((s) => {
    if (!poolsForModal[s.pool_name]) poolsForModal[s.pool_name] = [];
    poolsForModal[s.pool_name].push(s);
  });
  // Sort each pool by points desc, leg diff desc
  Object.values(poolsForModal).forEach((arr) =>
    arr.sort((a, b) => b.points - a.points || b.leg_difference - a.leg_difference)
  );

  const numPools = Object.keys(poolsForModal).length;
  const maxPerPool = Math.min(
    ...Object.values(poolsForModal).map((arr) => arr.length),
    standings.length > 0 ? Infinity : 1
  );

  // Calculate who advances based on mode
  let advancingPlayerIds;
  if (advanceMode === 'total') {
    const basePerPool = Math.floor(totalWinnersInput / numPools) || 0;
    const extraSpots = numPools > 0 ? totalWinnersInput % numPools : 0;
    // Each pool guarantees base, then best bubble player per pool gets 1 extra (max diff = 1)
    const guaranteed = new Set();
    const bubble = [];
    const poolNames = Object.keys(poolsForModal);
    const poolSizes = {};
    poolNames.forEach((pn) => { poolSizes[pn] = poolsForModal[pn].length; });
    poolNames.forEach((poolName) => {
      const players = poolsForModal[poolName];
      players.forEach((s, idx) => {
        if (idx < basePerPool) guaranteed.add(s.player_id);
        else bubble.push({ ...s, _poolName: poolName });
      });
    });
    bubble.sort((a, b) => b.points - a.points || b.leg_difference - a.leg_difference || (poolSizes[b._poolName] ?? 0) - (poolSizes[a._poolName] ?? 0));
    const poolsWithExtra = new Set();
    const extraIds = new Set();
    for (const s of bubble) {
      if (extraIds.size >= extraSpots) break;
      if (!poolsWithExtra.has(s._poolName)) {
        extraIds.add(s.player_id);
        poolsWithExtra.add(s._poolName);
      }
    }
    advancingPlayerIds = new Set([...guaranteed, ...extraIds]);
  } else {
    advancingPlayerIds = new Set();
    Object.values(poolsForModal).forEach((players) => {
      players.forEach((s, idx) => {
        if (idx < winnersPerPool) advancingPlayerIds.add(s.player_id);
      });
    });
  }

  const totalWinners = advancingPlayerIds.size;
  const totalLosers = standings.length - totalWinners;

  const handleTogglePublish = async () => {
    try {
      const r = await api.put(`/tournaments/${id}/publish`);
      setTournament((prev) => ({ ...prev, is_published: r.data.is_published }));
    } catch (err) {
      alert(err.response?.data?.detail || 'Error toggling publish');
    }
  };

  const handleCopyPublicLink = () => {
    const url = `${window.location.origin}/public/tournaments/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/tournaments" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Tournaments
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tournament.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[tournament.status]}`}>
                {tournament.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {tournament.location || 'No location'} &middot; {tournament.game_format} &middot; {tournament.player_count || 0} players
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleTogglePublish}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg ${
                tournament.is_published
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Globe className="w-4 h-4" />
              {tournament.is_published ? 'Published' : 'Publish'}
            </button>
            {tournament.is_published && (
              <button
                onClick={handleCopyPublicLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {linkCopied ? <CheckIcon className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />}
                {linkCopied ? 'Copied!' : 'Copy Link'}
              </button>
            )}
            <Link
              to={`/tournaments/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            {tournament.status === 'not_started' && (
              <button
                onClick={handleGeneratePools}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Play className="w-4 h-4" />
                Generate Pools
              </button>
            )}
            {tournament.status === 'pool_stage' && (
              <button
                onClick={handleGenerateBracket}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                <Trophy className="w-4 h-4" />
                Generate Bracket
              </button>
            )}
            {(tournament.status === 'knockout_stage' || tournament.status === 'finished') && (
              <button
                onClick={() => setShowResetWarning(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Bracket
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex gap-0 overflow-x-auto">
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

      {/* Tab content */}
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
                <dd className="font-medium capitalize text-gray-900 dark:text-gray-100">{tournament.status.replace('_', ' ')}</dd>
              </div>
              {user?.role === 'admin' && tournament.created_by_username && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Created by</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{tournament.created_by_username}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Ranking</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {tournament.ranking_name ? (
                    <Link to={`/rankings/${tournament.ranking_id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {tournament.ranking_name}
                    </Link>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">None</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setTab('Players')}
                className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Manage Players</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add or remove players from this tournament</p>
              </button>
              {tournament.status === 'not_started' && (
                <button
                  onClick={handleGeneratePools}
                  className="w-full text-left px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Start Pool Stage</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Generate pools and start round-robin matches</p>
                </button>
              )}
              {tournament.status === 'pool_stage' && (
                <button
                  onClick={handleGenerateBracket}
                  className="w-full text-left px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Start Knockout Stage</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Generate elimination bracket</p>
                </button>
              )}
              {(tournament.status === 'knockout_stage' || tournament.status === 'finished') && (
                <button
                  onClick={() => setShowResetWarning(true)}
                  className="w-full text-left px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Reset & Regenerate Bracket</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Delete all bracket matches and create a new bracket</p>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'Players' && <TournamentPlayers tournamentId={id} onUpdate={load} />}
      {tab === 'Pools' && <PoolsView tournamentId={id} />}
      {tab === 'Standings' && <StandingsView tournamentId={id} />}
      {tab === 'Bracket' && <BracketView tournamentId={id} onUpdate={load} />}
      {tab === 'Match Entry' && <MatchEntry tournamentId={id} tournament={tournament} onUpdate={load} />}

      {/* Reset Bracket Warning Modal */}
      {showResetWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="mx-auto w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Reset Bracket?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This will <span className="font-semibold text-red-600 dark:text-red-400">delete all bracket matches and results</span>. You will need to regenerate the bracket from the pool standings. This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowResetWarning(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResetWarning(false);
                  handleGenerateBracket();
                }}
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Reset & Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bracket Generation Modal */}
      {showBracketModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Generate Knockout Bracket</h2>
              <button onClick={() => setShowBracketModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  onClick={() => setAdvanceMode('per_pool')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    advanceMode === 'per_pool'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Per Pool
                </button>
                <button
                  onClick={() => setAdvanceMode('total')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    advanceMode === 'total'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Total Players
                </button>
              </div>

              {/* Input for selected mode */}
              {advanceMode === 'per_pool' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Players per pool advancing to Winners Bracket
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={maxPerPool}
                    value={winnersPerPool}
                    onChange={(e) => setWinnersPerPool(Math.max(1, Math.min(maxPerPool, parseInt(e.target.value) || 1)))}
                    className="w-24 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total number of players advancing to Winners Bracket
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Distributed equally across {numPools} pool{numPools !== 1 ? 's' : ''}, remaining spots go to the best-ranked players
                  </p>
                  <input
                    type="number"
                    min={2}
                    max={standings.length}
                    value={totalWinnersInput}
                    onChange={(e) => setTotalWinnersInput(Math.max(2, Math.min(standings.length, parseInt(e.target.value) || 2)))}
                    className="w-24 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              )}

              {/* Summary badges */}
              <div className="flex gap-4">
                <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{totalWinners}</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">Winners Bracket</p>
                </div>
                <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{Math.max(0, totalLosers)}</p>
                  <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">Losers Bracket</p>
                </div>
              </div>

              {/* Pool preview */}
              <div className="space-y-4">
                {Object.entries(poolsForModal).map(([poolName, players]) => (
                  <div key={poolName} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{poolName}</h4>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {players.map((s, idx) => {
                        const isWinner = advancingPlayerIds.has(s.player_id);
                        return (
                          <div
                            key={s.player_id}
                            className={`flex items-center justify-between px-4 py-2 text-sm ${
                              isWinner
                                ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
                                : 'bg-amber-50/50 dark:bg-amber-900/10'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 text-center font-medium text-gray-500 dark:text-gray-400">{idx + 1}</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{s.player_name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 dark:text-gray-400">{s.points} pts</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                isWinner
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
                              }`}>
                                {isWinner ? 'Winners' : 'Losers'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowBracketModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBracket}
                disabled={totalWinners < 2}
                className="px-4 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Bracket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
