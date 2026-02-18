import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';

export default function RankingFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: '',
    description: '',
    points_mode: 'fixed',
    winner_bracket_multiplier: 2,
    loser_bracket_multiplier: 1,
    flexible_base_winner: 0,
    flexible_base_loser: 0,
    points_first: 10,
    points_second: 8,
    points_third: 6,
    points_fourth: 5,
    points_fifth: 4,
    points_sixth: 3,
    points_seventh: 2,
    points_eighth: 1,
    points_participation: 0,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/rankings/${id}`).then((r) => {
        setForm({
          name: r.data.name,
          description: r.data.description || '',
          points_mode: r.data.points_mode || 'fixed',
          winner_bracket_multiplier: r.data.winner_bracket_multiplier ?? 2,
          loser_bracket_multiplier: r.data.loser_bracket_multiplier ?? 1,
          flexible_base_winner: r.data.flexible_base_winner ?? 0,
          flexible_base_loser: r.data.flexible_base_loser ?? 0,
          points_first: r.data.points_first,
          points_second: r.data.points_second,
          points_third: r.data.points_third,
          points_fourth: r.data.points_fourth,
          points_fifth: r.data.points_fifth,
          points_sixth: r.data.points_sixth,
          points_seventh: r.data.points_seventh,
          points_eighth: r.data.points_eighth,
          points_participation: r.data.points_participation,
        });
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/rankings/${id}`, form);
        navigate(`/rankings/${id}`);
      } else {
        const res = await api.post('/rankings', form);
        navigate(`/rankings/${res.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving ranking');
    } finally {
      setLoading(false);
    }
  };

  const pointFields = [
    { name: 'points_first', label: '1st Place Points' },
    { name: 'points_second', label: '2nd Place Points' },
    { name: 'points_third', label: '3rd Place Points' },
    { name: 'points_fourth', label: '4th Place Points' },
    { name: 'points_fifth', label: '5th Place Points' },
    { name: 'points_sixth', label: '6th Place Points' },
    { name: 'points_seventh', label: '7th Place Points' },
    { name: 'points_eighth', label: '8th Place Points' },
    { name: 'points_participation', label: 'Participation Points' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        {isEdit ? 'Edit Ranking' : 'Create Ranking'}
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ranking Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Season 2025, League A"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Optional description"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Points Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Points Mode</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, points_mode: 'fixed' })}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.points_mode === 'fixed'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Fixed per Placement
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, points_mode: 'flexible' })}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.points_mode === 'flexible'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Flexible (Bracket Depth)
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              {form.points_mode === 'fixed'
                ? 'Fixed points based on final placement (1st, 2nd, etc.)'
                : 'Base points per bracket + bonus points per bracket match won'}
            </p>
          </div>

          {form.points_mode === 'flexible' && (
            <>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Bracket Win Bonus</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Points per Winner Bracket Win</label>
                  <input
                    type="number"
                    value={form.winner_bracket_multiplier}
                    onChange={(e) => setForm({ ...form, winner_bracket_multiplier: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Points per Loser Bracket Win</label>
                  <input
                    type="number"
                    value={form.loser_bracket_multiplier}
                    onChange={(e) => setForm({ ...form, loser_bracket_multiplier: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Example: 3 winner bracket wins = +{3 * form.winner_bracket_multiplier}pts, 2 loser bracket wins = +{2 * form.loser_bracket_multiplier}pts
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Base Points</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Winner Bracket Base</label>
                  <input
                    type="number"
                    value={form.flexible_base_winner}
                    onChange={(e) => setForm({ ...form, flexible_base_winner: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Loser Bracket Base</label>
                  <input
                    type="number"
                    value={form.flexible_base_loser}
                    onChange={(e) => setForm({ ...form, flexible_base_loser: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                WB players start with {form.flexible_base_winner}pts, LB players start with {form.flexible_base_loser}pts, plus bracket win bonuses.
              </p>
            </div>
            </>
          )}

          {form.points_mode === 'fixed' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Placement Points</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pointFields.map((f) => (
                  <div key={f.name}>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                    <input
                      type="number"
                      value={form[f.name]}
                      onChange={(e) => setForm({ ...form, [f.name]: parseInt(e.target.value) || 0 })}
                      min={0}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Ranking' : 'Create Ranking'}
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
