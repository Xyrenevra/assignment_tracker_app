import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react';
import type { Assignment, NavSection, Subject, ThemeMode, UserProfile } from '../types';
import { getDeadlineLabel } from '../utils/academicLogic';

interface LayoutProps {
  user: UserProfile;
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  unreadNotifications: number;
  assignments: Assignment[];
  subjects: Subject[];
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  onQuickAddAssignment: () => void;
  onSelectSearchResult: (assignment: Assignment) => void;
  onLogout: () => void;
  children: ReactNode;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const PRIMARY_NAV: Array<{ id: NavSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'assignments', label: 'My Assignments', icon: CheckSquare },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
  { id: 'analytics', label: 'Progress Analytics', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const ACCOUNT_NAV: Array<{ id: NavSection; label: string; icon: typeof Settings }> = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'profile', label: 'User Profile', icon: User },
];

export function Layout({
  user,
  activeSection,
  onSelectSection,
  theme,
  onToggleTheme,
  unreadNotifications,
  assignments,
  subjects,
  globalSearch,
  onGlobalSearchChange,
  onQuickAddAssignment,
  onSelectSearchResult,
  onLogout,
  children,
}: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const greeting = `${getTimeGreeting()}, ${firstName}`;
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date()),
    []
  );

  const subjectsById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const searchMatches = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];
    return assignments
      .filter((a) => {
        const subj = a.subjectId ? subjectsById.get(a.subjectId)?.subjectName ?? '' : '';
        return `${a.title} ${a.description} ${subj}`.toLowerCase().includes(q);
      })
      .slice(0, 6);
  }, [assignments, globalSearch, subjectsById]);

  const handleNavClick = (section: NavSection) => {
    onSelectSection(section);
    setMobileMenuOpen(false);
  };

  const renderNavLinks = (isCollapsed: boolean) => (
    <div className="flex flex-col flex-1 justify-between overflow-y-auto py-4">
      <nav aria-label="Main navigation" className="px-3 space-y-1">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              title={isCollapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
              {item.id === 'notifications' && unreadNotifications > 0 && (
                <span
                  className={`tabular-nums text-[11px] font-semibold ${
                    isCollapsed
                      ? 'sr-only'
                      : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {unreadNotifications}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
        {ACCOUNT_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              title={isCollapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/30 transition-colors whitespace-nowrap ${
            isCollapsed ? 'justify-center px-2' : ''
          }`}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
          {!isCollapsed && <span className="truncate">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8F9FC] dark:bg-[#0B0F19] text-[#111827] dark:text-[#F9FAFB]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen transition-[width] duration-200 ${
          collapsed ? 'w-[74px]' : 'w-[248px]'
        }`}
      >
        <div
          className={`h-16 px-4 flex items-center border-b border-slate-200 dark:border-slate-800 ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <button
            type="button"
            onClick={() => handleNavClick('overview')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
            </div>
            {!collapsed && (
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                AssignAI
              </span>
            )}
          </button>

          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="px-3 pt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {renderNavLinks(collapsed)}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full z-10">
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" aria-hidden="true" />
                </div>
                <span className="text-base font-bold tracking-tight">AssignAI</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavLinks(false)}
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                <span className="hidden sm:inline">{greeting}</span>
                <span className="sm:hidden">Hi, {firstName}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums hidden sm:block">
                {formattedDate}
                {user.isDemo ? ' · Demo Workspace' : ''}
              </p>
            </div>
          </div>

          {/* Global Assignment Search */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <label htmlFor="global-assignment-search" className="sr-only">
              Search assignments
            </label>
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              id="global-assignment-search"
              type="search"
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 180)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && globalSearch.trim()) {
                  onSelectSection('assignments');
                  setSearchFocused(false);
                }
              }}
              placeholder="Search assignments or subjects..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />

            {searchFocused && globalSearch.trim().length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden z-40">
                {searchMatches.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    No matching assignments found.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {searchMatches.map((item) => {
                      const subj = item.subjectId ? subjectsById.get(item.subjectId) : null;
                      const dl = getDeadlineLabel(item.dueDate, item.status);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              onSelectSearchResult(item);
                              setSearchFocused(false);
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                          >
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {subj ? subj.subjectName : 'General'} · {dl.text} · {item.priority}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onQuickAddAssignment}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Add Assignment</span>
              <span className="sm:hidden">Add</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('notifications')}
              aria-label={
                unreadNotifications > 0
                  ? `Notifications (${unreadNotifications} unread)`
                  : 'Notifications'
              }
              className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('profile')}
              aria-label={`Open profile for ${user.name}`}
              className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30 font-semibold text-xs flex items-center justify-center hover:bg-indigo-600/20 transition-colors shrink-0"
            >
              {getInitials(user.name)}
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
