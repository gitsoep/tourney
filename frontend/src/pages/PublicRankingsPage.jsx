import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { BarChart3, Trophy } from 'lucide-react';
import DartboardIcon from '../components/DartboardIcon';

const publicApi = axios.create({ baseURL: '/api/public' });

export default function PublicRankingsPage() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.get('/rankings').then((r) => {
      setRankings(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

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
          <p className="text-gray-500 dark:text-gray-400">Player Rankings</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : rankings.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No rankings available.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {rankings.map((r) => (
              <Link
                key={r.id}
                to={`/public/rankings/${r.id}`}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow block"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{r.name}</h2>
                    {r.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{r.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                      <span>{r.tournament_count || 0} tournaments</span>
                    </div>
                  </div>
                  <BarChart3 className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center gap-4">
          <Link to="/public/tournaments" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">
            &larr; Tournaments
          </Link>
          <Link to="/login" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">
            Admin login &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
