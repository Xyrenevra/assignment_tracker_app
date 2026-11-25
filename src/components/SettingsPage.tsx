import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { ThemeMode, UserProfile } from '../types';
import { validateEmail, validatePassword } from '../utils/academicLogic';

interface SettingsPageProps {
  user: UserProfile;
  initialTab: 'profile' | 'preferences';
  theme: ThemeMode;
  onUserUpdated: (user: UserProfile) => void;
  onToggleTheme: (nextTheme: ThemeMode) => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  onLogout: () => void;
}

export function SettingsPage({
  user,
  initialTab,
  theme,
  onUserUpdated,
  onToggleTheme,
  onNotify,
  onLogout,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>(
    initialTab === 'profile' ? 'profile' : 'preferences'
  );

  // Profile fields
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [university, setUniversity] = useState(user.university);
  const [major, setMajor] = useState(user.major);
  const [semester, setSemester] = useState(user.semester);
  const [bio, setBio] = useState(user.bio);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Preference fields
  const [reminderDays, setReminderDays] = useState<1 | 3 | 7>(user.preferences.reminderDays);
  const [overdueAlerts, setOverdueAlerts] = useState(user.preferences.overdueAlerts);
  const [shareAiContext, setShareAiContext] = useState(user.preferences.shareAiContextByDefault);
  const [prefSaving, setPrefSaving] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passSaving, setPassSaving] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab === 'profile' ? 'profile' : 'preferences');
  }, [initialTab]);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setUniversity(user.university);
    setMajor(user.major);
    setSemester(user.semester);
    setBio(user.bio);
    setReminderDays(user.preferences.reminderDays);
    setOverdueAlerts(user.preferences.overdueAlerts);
    setShareAiContext(user.preferences.shareAiContextByDefault);
  }, [user]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    if (name.trim().length < 2) {
      setProfileError('Full name must be at least 2 characters.');
      return;
    }
    const emailErr = validateEmail(email);
    if (emailErr) {
      setProfileError(emailErr);
      return;
    }

    setProfileSaving(true);
    try {
      const res = await api.updateProfile({
        name,
        email,
        university,
        major,
        semester,
        bio,
      });
      onUserUpdated(res.user);
      onNotify('success', 'Profile information saved.');
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Unable to save profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePreferences = async (e: FormEvent) => {
    e.preventDefault();
    setPrefSaving(true);
    try {
      const res = await api.updateProfile({
        preferences: {
          theme,
          reminderDays,
          overdueAlerts,
          shareAiContextByDefault: shareAiContext,
        },
      });
      onUserUpdated(res.user);
      onNotify('success', 'Notification and appearance preferences saved.');
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Unable to save preferences.');
    } finally {
      setPrefSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPassError(null);
    if (!currentPassword) {
      setPassError('Please enter your current password.');
      return;
    }
    const passErr = validatePassword(newPassword);
    if (passErr) {
      setPassError(passErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New password and confirmation do not match.');
      return;
    }

    setPassSaving(true);
    try {
      await api.updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onNotify('success', 'Password updated successfully.');
    } catch (err) {
      setPassError(err instanceof ApiError ? err.message : 'Unable to update password.');
    } finally {
      setPassSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {activeTab === 'profile' ? 'User Profile' : 'Settings & Preferences'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your student profile, deadline reminder schedule, appearance, and account security.
        </p>
      </div>

      {/* Section Tabs */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Profile Info
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'preferences'}
          onClick={() => setActiveTab('preferences')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Preferences & Appearance
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'security'}
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Password & Account
        </button>
      </div>

      {activeTab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          noValidate
        >
          {profileError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{profileError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Full name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email address
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="profile-university"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                University / College
              </label>
              <input
                id="profile-university"
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. NIT"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="profile-major"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Major / Program
              </label>
              <input
                id="profile-major"
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="profile-semester"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Semester / Term
              </label>
              <input
                id="profile-semester"
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="e.g. Semester 5"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="profile-bio"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Academic focus / bio
            </label>
            <textarea
              id="profile-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share your study focus or goals for this semester..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white resize-y"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={profileSaving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'preferences' && (
        <form
          onSubmit={handleSavePreferences}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6"
        >
          {/* Appearance */}
          <div className="space-y-2.5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Appearance</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose how AssignAI looks across all pages. Your choice persists across sessions.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1 max-w-sm">
              <button
                type="button"
                onClick={() => onToggleTheme('light')}
                aria-pressed={theme === 'light'}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  theme === 'light'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleTheme('dark')}
                aria-pressed={theme === 'dark'}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Notification Reminders */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Deadline Reminders
            </h2>
            <div>
              <label
                htmlFor="pref-reminder-days"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Notify me before submission deadline
              </label>
              <select
                id="pref-reminder-days"
                value={reminderDays}
                onChange={(e) => setReminderDays(Number(e.target.value) as 1 | 3 | 7)}
                className="w-full max-w-xs px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value={1}>1 day before deadline</option>
                <option value={3}>3 days before deadline</option>
                <option value={7}>7 days before deadline</option>
              </select>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={overdueAlerts}
                onChange={(e) => setOverdueAlerts(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              <span>Generate in-app alerts for overdue assignments</span>
            </label>

            <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={shareAiContext}
                onChange={(e) => setShareAiContext(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              <span>Share assignment context with AI Assistant by default</span>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={prefSaving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {prefSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <div className="space-y-5">
          <form
            onSubmit={handleChangePassword}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
            noValidate
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Change Password
              </h2>
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPasswords ? 'Hide' : 'Show'} passwords</span>
              </button>
            </div>

            {passError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{passError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="current-password"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Current password
              </label>
              <input
                id="current-password"
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full max-w-md px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  New password (min 8 characters)
                </label>
                <input
                  id="new-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passSaving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {passSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Sign Out</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Signed in as {user.email}. Your data remains securely stored on the server.
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium whitespace-nowrap"
            >
              Sign Out
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
