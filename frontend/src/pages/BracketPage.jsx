import { useEffect, useState } from 'react';
import api from '../lib/api';
import BracketView from '../components/BracketView';

export default function BracketPage() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    api.get('/tournaments').then((r) => {
      setTournaments(r.data);
      if (r.data.length > 0) {
        const active = r.data.find((t) => t.status === 'knockout_stage');
        setSelectedId((active || r.data[0]).id);
      }
    });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bracket</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Double elimination bracket view</p>
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

      {selectedId ? (
        <BracketView tournamentId={selectedId} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">Select a tournament to view the bracket.</p>
        </div>
      )}
    </div>
  );
}
