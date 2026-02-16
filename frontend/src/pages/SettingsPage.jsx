import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Light background with dark text' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Dark background with light text' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Account settings & preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Appearance</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose your preferred theme</p>
          <div className="grid grid-cols-2 gap-3">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  theme === opt.value
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700/50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    theme === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                  }`}
                >
                  <opt.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    theme === opt.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Profile */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Profile Information</h3>
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <dt className="text-gray-500 dark:text-gray-400">Username</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{user?.username}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <dt className="text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{user?.email}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <dt className="text-gray-500 dark:text-gray-400">Role</dt>
              <dd>
                <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium capitalize">
                  {user?.role}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Security</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Manage your account security</p>
          <Link
            to="/settings/change-password"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            Change Password
          </Link>
        </div>

        {/* App Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Application Info</h3>
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <dt className="text-gray-500 dark:text-gray-400">Version</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">1.0.0</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <dt className="text-gray-500 dark:text-gray-400">Backend</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">FastAPI</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-gray-500 dark:text-gray-400">Frontend</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">React + Vite + TailwindCSS</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
