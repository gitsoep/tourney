import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';

export default function TournamentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: '',
    location: '',
    start_date: '',
    game_format: '501',
    num_players: 0,
    group_size: 4,
    best_of_legs_pool: 5,
    best_of_legs_knockout: 7,
    ranking_id: '',
  });
  const [rankings, setRankings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load available rankings
    api.get('/rankings').then((r) => setRankings(r.data)).catch(() => {});

    if (isEdit) {
      api.get(`/tournaments/${id}`).then((r) => {
        setForm({
          name: r.data.name,
          location: r.data.location || '',
          start_date: r.data.start_date || '',
          game_format: r.data.game_format,
          num_players: r.data.num_players,
          group_size: r.data.group_size,
          best_of_legs_pool: r.data.best_of_legs_pool,
          best_of_legs_knockout: r.data.best_of_legs_knockout,
          ranking_id: r.data.ranking_id || '',
        });
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.start_date) delete payload.start_date;
      // Convert ranking_id to int or null
      payload.ranking_id = payload.ranking_id ? parseInt(payload.ranking_id) : null;
      if (isEdit) {
        await api.put(`/tournaments/${id}`, payload);
        navigate(`/tournaments/${id}`);
      } else {
        const res = await api.post('/tournaments', payload);
        navigate(`/tournaments/${res.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving tournament');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'name', label: 'Tournament Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'game_format', label: 'Game Format', type: 'select', options: ['501', '301', '701', '101'] },
    { name: 'group_size', label: 'Group Size (Pool Stage)', type: 'number', min: 2 },
    { name: 'best_of_legs_pool', label: 'Best of Legs (Pool)', type: 'number', min: 1 },
    { name: 'best_of_legs_knockout', label: 'Best of Legs (Knockout)', type: 'number', min: 1 },
    {
      name: 'ranking_id',
      label: 'Counts for Ranking',
      type: 'select',
      options: [{ value: '', label: '— None —' }, ...rankings.map((r) => ({ value: String(r.id), label: r.name }))],
      isObjectOptions: true,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        {isEdit ? 'Edit Tournament' : 'Create Tournament'}
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={form[f.name]}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {f.isObjectOptions
                    ? f.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))
                    : f.options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))
                  }
                </select>
              ) : (
                <input
                  type={f.type}
                  value={form[f.name]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [f.name]: f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value,
                    })
                  }
                  required={f.required}
                  min={f.min}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Tournament' : 'Create Tournament'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
