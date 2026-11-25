import { useMemo, useState } from 'react';
import { AlertCircle, Bell, CheckCheck, Clock, Settings } from 'lucide-react';
import type { AppNotification, NavSection, UserProfile } from '../types';

interface NotificationsPageProps {
  user: UserProfile;
  notifications: AppNotification[];
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onNavigate: (section: NavSection) => void;
}

export function NotificationsPage({
  user,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}: NotificationsPageProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readStatus).length,
    [notifications]
  );

  const visible = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.readStatus) : notifications),
    [notifications, filter]
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Deadline reminders set to {user.preferences.reminderDays}{' '}
            {user.preferences.reminderDays === 1 ? 'day' : 'days'} before submission
            {user.preferences.overdueAlerts ? ' · Overdue alerts enabled' : ' · Overdue alerts muted'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reminder Preferences</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium whitespace-nowrap"
            >
              <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        role="group"
        aria-label="Notification filter"
        className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70"
      >
        <button
          type="button"
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            filter === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          aria-pressed={filter === 'unread'}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            filter === 'unread'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-8 h-8 text-slate-400 mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {filter === 'unread' ? 'No unread notifications' : 'No deadline alerts right now'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Alerts appear automatically when assignments approach your reminder window or become overdue.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((item) => {
              const isOverdue = item.type === 'overdue';
              return (
                <li
                  key={item.id}
                  className={`px-5 py-4 flex items-start justify-between gap-4 transition-colors ${
                    item.readStatus
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-indigo-50/40 dark:bg-indigo-950/20'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {isOverdue ? (
                      <AlertCircle
                        className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                    ) : (
                      <Clock
                        className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          item.readStatus
                            ? 'text-slate-600 dark:text-slate-400'
                            : 'font-medium text-slate-900 dark:text-white'
                        }`}
                      >
                        {item.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 tabular-nums">
                        {isOverdue ? 'Overdue Alert' : 'Upcoming Reminder'} ·{' '}
                        {new Date(item.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigate('assignments')}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                    >
                      View
                    </button>
                    {!item.readStatus && (
                      <button
                        type="button"
                        onClick={() => onMarkRead(item.id)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
