import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Calendar,
  CheckSquare,
  Eye,
  EyeOff,
  GraduationCap,
  LineChart,
  Moon,
  Sun,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { validateEmail, validatePassword } from '../utils/academicLogic';
import type { ThemeMode, UserProfile } from '../types';

interface AuthViewProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onAuthenticated: (user: UserProfile) => void;
}

export function AuthView({ theme, onToggleTheme, onAuthenticated }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register' && name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    const passError = validatePassword(password);
    if (passError) {
      setError(passError);
      return;
    }

    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await api.login({ email, password })
          : await api.register({ name, email, password, university, major });
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to complete request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setDemoLoading(true);
    try {
      const res = await api.loginDemo();
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in to demo account.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] dark:bg-[#0B0F19] text-[#111827] dark:text-[#F9FAFB] flex flex-col">
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <GraduationCap className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold tracking-tight">AssignAI</span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left column: clear product value */}
        <section className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Student Assignment Manager
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
              Organize every deadline, subject, and study plan in one calm workspace.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Track coursework across table, card, and Kanban boards, catch overdue risks early, and get context-aware guidance from your integrated Gemini academic assistant.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mb-2.5" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Multi-View Assignments
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Switch effortlessly between Table, Card, and Kanban views with subtask checklists and automatic overdue detection.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400 mb-2.5" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Gemini Study Assistant
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Break large assignments into actionable steps, explain tricky concepts, and generate weekly study schedules.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-2.5" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Academic Calendar & Alerts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Visualize color-coded deadlines by subject with customizable 1-day, 3-day, or 7-day reminders.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <LineChart className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-2.5" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Live Progress Analytics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Measure subject-wise completion, priority workload, weekly activity, and on-time submission trends.
              </p>
            </div>
          </div>
        </section>

        {/* Right column: Auth Card */}
        <section className="lg:col-span-6 w-full max-w-md mx-auto lg:ml-auto lg:mr-0">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
            <div
              role="tablist"
              aria-label="Authentication mode"
              className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 mb-6"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {mode === 'login' ? 'Welcome back' : 'Create your student account'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {mode === 'login'
                  ? 'Sign in to access your private assignments, subjects, and AI chat history.'
                  : 'Every student gets an isolated workspace with persistent cloud storage.'}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === 'register' && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Full name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Patel"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter your password'}
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide visibility' : 'Reveal input'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="auth-university"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      University (optional)
                    </label>
                    <input
                      id="auth-university"
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="State University"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-major"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Major (optional)
                    </label>
                    <input
                      id="auth-major"
                      type="text"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      placeholder="Computer Science"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || demoLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <span>
                  {loading
                    ? mode === 'login'
                      ? 'Signing in...'
                      : 'Creating account...'
                    : mode === 'login'
                      ? 'Sign In'
                      : 'Create Student Account'}
                </span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs text-slate-400">or explore demo mode</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  Demo Student Workspace
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Preloaded with 6 CS subjects and 12 live assignments (completed, in-progress, due today, and overdue) for immediate exploration.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={demoLoading || loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/40 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <span>{demoLoading ? 'Loading Demo Account...' : 'Try Demo Student Account'}</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
