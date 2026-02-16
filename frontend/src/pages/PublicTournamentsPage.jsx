import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy, MapPin, Calendar } from 'lucide-react';
import DartboardIcon from '../components/DartboardIcon';

const publicApi = axios.create({ baseURL: '/api/public' });

export default function PublicTournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.get('/tournaments').then((r) => {
      setTournaments(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    pool_stage: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    knockout_stage: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    finished: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  };

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
          <p className="text-gray-500 dark:text-gray-400">Live tournament results</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Trophy className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No published tournaments at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                to={`/public/tournaments/${t.id}`}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow block"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{t.name}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColors[t.status]}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {t.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {t.location}
                        </span>
                      )}
                      {t.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(t.start_date).toLocaleDateString()}
                        </span>
                      )}
                      <span>{t.game_format}</span>
                      <span>{t.player_count || 0} players</span>
                    </div>
                  </div>
                  <Trophy className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">
            Admin login &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
