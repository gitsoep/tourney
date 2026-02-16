import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Check, X, Shield, ShieldOff, Trash2, Users } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'approved'

  const load = () => {
    api.get('/users').then((r) => {
      setUsers(r.data);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const handleApprove = async (id) => {
    await api.post(`/users/${id}/approve`);
    load();
  };

  const handleReject = async (id) => {
    if (!confirm('Reject and delete this user?')) return;
    await api.post(`/users/${id}/reject`);
    load();
  };

  const handleToggleAdmin = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change ${user.username}'s role to ${newRole}?`)) return;
    await api.put(`/users/${user.id}`, { role: newRole });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user permanently?')) return;
    await api.delete(`/users/${id}`);
    load();
  };

  const filtered = users.filter((u) => {
    if (filter === 'pending') return !u.is_approved;
    if (filter === 'approved') return u.is_approved;
    return true;
  });

  const pendingCount = users.filter((u) => !u.is_approved).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {users.length} total users
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6">
        {[
          { key: 'all', label: 'All Users' },
          { key: 'pending', label: `Pending (${pendingCount})` },
          { key: 'approved', label: 'Approved' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Pending approval cards */}
      {filter !== 'approved' && pendingCount > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Pending Approval
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users
              .filter((u) => !u.is_approved)
              .map((u) => (
                <div
                  key={u.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border-2 border-amber-200 dark:border-amber-800 p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center text-sm font-bold text-amber-700 dark:text-amber-300">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{u.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                    Registered {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'recently'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(u.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(u.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">User</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Joined</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{u.username}</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                <td className="px-6 py-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.is_approved
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {u.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    {!u.is_approved && (
                      <button
                        onClick={() => handleApprove(u.id)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleAdmin(u)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30"
                      title={u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                    >
                      {u.role === 'admin' ? (
                        <ShieldOff className="w-4 h-4" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}
