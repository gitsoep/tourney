import { useEffect, useState } from 'react';
import api from '../lib/api';
import { UserPlus, X, Search } from 'lucide-react';

export default function TournamentPlayers({ tournamentId, onUpdate }) {
  const [tournamentPlayers, setTournamentPlayers] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    api.get(`/tournaments/${tournamentId}/players`).then((r) => setTournamentPlayers(r.data));
    api.get('/players').then((r) => setAllPlayers(r.data));
  };

  useEffect(load, [tournamentId]);

  const assignedIds = new Set(tournamentPlayers.map((tp) => tp.player_id));

  const availablePlayers = allPlayers.filter(
    (p) => !assignedIds.has(p.id) && p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (playerId) => {
    await api.post(`/tournaments/${tournamentId}/players`, { player_ids: [playerId] });
    load();
    onUpdate?.();
  };

  const handleAddAll = async () => {
    const ids = availablePlayers.map((p) => p.id);
    if (ids.length === 0) return;
    await api.post(`/tournaments/${tournamentId}/players`, { player_ids: ids });
    load();
    onUpdate?.();
  };

  const handleRemove = async (playerId) => {
    await api.delete(`/tournaments/${tournamentId}/players/${playerId}`);
    load();
    onUpdate?.();
  };

  return (
    <div className="space-y-6">
      {/* Current players */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Tournament Players ({tournamentPlayers.length})
          </h3>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4" />
            Add Players
          </button>
        </div>
        {tournamentPlayers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No players assigned yet</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {tournamentPlayers.map((tp) => (
              <div key={tp.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{tp.player_name}</span>
                  {tp.player_nickname && (
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">"{tp.player_nickname}"</span>
                  )}
                  {tp.pool_id && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                      Pool assigned
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(tp.player_id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add players panel */}
      {showAdd && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Available Players</h3>
              <button
                onClick={handleAddAll}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Add All ({availablePlayers.length})
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search players..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {availablePlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-gray-900 dark:text-gray-100">{p.name}</span>
                <button
                  onClick={() => handleAdd(p.id)}
                  className="px-3 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium"
                >
                  Add
                </button>
              </div>
            ))}
            {availablePlayers.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">No available players</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
