import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from './lib/api';
import type {
  AppNotification,
  Assignment,
  AssignmentStatus,
  NavSection,
  Priority,
  Subject,
  Subtask,
  ThemeMode,
  UserProfile,
} from './types';
import { AuthView } from './components/AuthView';
import { Layout } from './components/Layout';
import { OverviewPage } from './components/OverviewPage';
import { AssignmentsPage } from './components/AssignmentsPage';
import { SubjectsPage } from './components/SubjectsPage';
import { CalendarPage } from './components/CalendarPage';
import { AIAssistantPage } from './components/AIAssistantPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { NotificationsPage } from './components/NotificationsPage';
import { SettingsPage } from './components/SettingsPage';
import { AssignmentModal } from './components/AssignmentModal';
import { ToastContainer, type ToastItem } from './components/ui/Toast';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [activeSection, setActiveSection] = useState<NavSection>('overview');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [globalSearch, setGlobalSearch] = useState('');
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [modalInitialDueDate, setModalInitialDueDate] = useState<string | null>(null);
  const [preselectedAiAssignmentId, setPreselectedAiAssignmentId] = useState<string | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((type: ToastItem['type'], message: string) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Apply Tailwind v4 .dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const loadWorkspaceData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [subjRes, asgRes, ntfRes] = await Promise.all([
        api.listSubjects(),
        api.listAssignments(),
        api.listNotifications(),
      ]);
      setSubjects(subjRes.subjects);
      setAssignments(asgRes.assignments);
      setNotifications(ntfRes.notifications);
    } catch (err) {
      pushToast(
        'error',
        err instanceof ApiError ? err.message : 'Unable to load workspace data.'
      );
    } finally {
      setDataLoading(false);
    }
  }, [pushToast]);

  // Restore session on mount (or auto-demo when ?autostart=1 is present)
  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const res = await api.getSession();
        if (!active) return;
        if (res.authenticated && res.user) {
          setUser(res.user);
          setTheme(res.user.preferences.theme);
          return;
        }
      } catch {
        // Fall through to optional autostart
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        try {
          const demoRes = await api.loginDemo();
          if (!active) return;
          setUser(demoRes.user);
          setTheme(demoRes.user.preferences.theme);
        } catch {
          // Stay on AuthView
        }
      }
      if (active) setAuthChecking(false);
    }
    bootstrap().finally(() => {
      if (active) setAuthChecking(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadWorkspaceData();
    } else {
      setSubjects([]);
      setAssignments([]);
      setNotifications([]);
    }
  }, [user?.id, loadWorkspaceData]);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await api.listNotifications();
      setNotifications(res.notifications);
    } catch {
      // non-fatal
    }
  }, []);

  const handleAuthenticated = (authedUser: UserProfile) => {
    setUser(authedUser);
    setTheme(authedUser.preferences.theme);
    setActiveSection('overview');
    pushToast('success', `Welcome, ${authedUser.name}!`);
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setActiveSection('overview');
    setGlobalSearch('');
    pushToast('info', 'Signed out successfully.');
  };

  const handleToggleTheme = async (explicitTheme?: ThemeMode) => {
    const next: ThemeMode = explicitTheme ?? (theme === 'dark' ? 'light' : 'dark');
    setTheme(next);
    if (user) {
      try {
        const res = await api.updateProfile({ preferences: { theme: next } });
        setUser(res.user);
      } catch {
        // Keep local toggle even if network hiccups
      }
    }
  };

  // --- Assignment Handlers ---

  const openCreateAssignment = (dateKey?: string) => {
    setEditingAssignment(null);
    setModalInitialDueDate(dateKey ?? null);
    setAssignmentModalOpen(true);
  };

  const openEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setModalInitialDueDate(null);
    setAssignmentModalOpen(true);
  };

  const handleSaveAssignment = async (payload: {
    id?: string;
    title: string;
    description: string;
    subjectId: string | null;
    dueDate: string;
    priority: Priority;
    status: AssignmentStatus;
    subtasks: Subtask[];
  }) => {
    if (payload.id) {
      const res = await api.updateAssignment(payload.id, payload);
      setAssignments((prev) =>
        prev.map((item) => (item.id === res.assignment.id ? res.assignment : item))
      );
      pushToast('success', 'Assignment updated.');
    } else {
      const res = await api.createAssignment(payload);
      setAssignments((prev) => [...prev, res.assignment]);
      pushToast('success', 'Assignment created.');
    }
    refreshNotifications();
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await api.deleteAssignment(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      setNotifications((prev) => prev.filter((n) => n.assignmentId !== id));
      pushToast('info', 'Assignment deleted.');
    } catch (err) {
      pushToast(
        'error',
        err instanceof ApiError ? err.message : 'Unable to delete assignment.'
      );
    }
  };

  const handleUpdateAssignmentStatus = async (
    assignment: Assignment,
    nextStatus: AssignmentStatus
  ) => {
    try {
      const res = await api.updateAssignment(assignment.id, { status: nextStatus });
      setAssignments((prev) =>
        prev.map((a) => (a.id === res.assignment.id ? res.assignment : a))
      );
      pushToast(
        'success',
        nextStatus === 'Completed'
          ? `Marked "${assignment.title}" as completed.`
          : `Moved "${assignment.title}" to ${nextStatus}.`
      );
      refreshNotifications();
    } catch (err) {
      pushToast(
        'error',
        err instanceof ApiError ? err.message : 'Unable to update status.'
      );
    }
  };

  const handleToggleSubtask = async (assignment: Assignment, subtaskId: string) => {
    const updatedSubtasks = assignment.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    try {
      const res = await api.updateAssignment(assignment.id, { subtasks: updatedSubtasks });
      setAssignments((prev) =>
        prev.map((a) => (a.id === res.assignment.id ? res.assignment : a))
      );
    } catch (err) {
      pushToast(
        'error',
        err instanceof ApiError ? err.message : 'Unable to update subtask.'
      );
    }
  };

  const handleAskAiAboutAssignment = (assignment: Assignment) => {
    setPreselectedAiAssignmentId(assignment.id);
    setActiveSection('ai-assistant');
  };

  // --- Subject Handlers ---

  const handleCreateSubject = async (input: {
    subjectName: string;
    subjectCode: string;
    color: string;
  }) => {
    const res = await api.createSubject(input);
    setSubjects((prev) =>
      [...prev, res.subject].sort((a, b) => a.subjectName.localeCompare(b.subjectName))
    );
    pushToast('success', `Subject "${res.subject.subjectName}" created.`);
  };

  const handleUpdateSubject = async (
    id: string,
    input: { subjectName: string; subjectCode: string; color: string }
  ) => {
    const res = await api.updateSubject(id, input);
    setSubjects((prev) =>
      prev
        .map((s) => (s.id === res.subject.id ? res.subject : s))
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
    );
    pushToast('success', `Subject "${res.subject.subjectName}" updated.`);
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      const res = await api.deleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      setAssignments((prev) =>
        prev.map((a) => (a.subjectId === id ? { ...a, subjectId: null } : a))
      );
      pushToast(
        'info',
        res.unlinkedCount > 0
          ? `Subject deleted. ${res.unlinkedCount} assignments were safely preserved as Unassigned.`
          : 'Subject deleted.'
      );
    } catch (err) {
      pushToast(
        'error',
        err instanceof ApiError ? err.message : 'Unable to delete subject.'
      );
    }
  };

  // --- Notification Handlers ---

  const handleMarkNotificationRead = async (id: string) => {
    try {
      const res = await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === res.notification.id ? res.notification : n))
      );
    } catch (err) {
      pushToast(
        'error',
        err instanceof ApiError ? err.message : 'Unable to mark notification read.'
      );
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readStatus: true })));
      pushToast('success', 'All notifications marked as read.');
    } catch (err) {
      pushToast(
        'error',
        err instanceof ApiError ? err.message : 'Unable to update notifications.'
      );
    }
  };

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.readStatus).length,
    [notifications]
  );

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] dark:bg-[#0B0F19] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading AssignAI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthView
          theme={theme}
          onToggleTheme={() => handleToggleTheme()}
          onAuthenticated={handleAuthenticated}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <>
      <Layout
        user={user}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        theme={theme}
        onToggleTheme={() => handleToggleTheme()}
        unreadNotifications={unreadNotifications}
        assignments={assignments}
        subjects={subjects}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        onQuickAddAssignment={() => openCreateAssignment()}
        onSelectSearchResult={(assignment) => {
          setGlobalSearch('');
          openEditAssignment(assignment);
        }}
        onLogout={handleLogout}
      >
        {dataLoading && assignments.length === 0 && subjects.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            Loading your academic workspace...
          </div>
        ) : (
          <>
            {activeSection === 'overview' && (
              <OverviewPage
                assignments={assignments}
                subjects={subjects}
                onNavigate={setActiveSection}
                onQuickAdd={() => openCreateAssignment()}
                onToggleComplete={(item) =>
                  handleUpdateAssignmentStatus(
                    item,
                    item.status === 'Completed' ? 'Pending' : 'Completed'
                  )
                }
                onAskAiAboutAssignment={handleAskAiAboutAssignment}
                onEditAssignment={openEditAssignment}
              />
            )}

            {activeSection === 'assignments' && (
              <AssignmentsPage
                assignments={assignments}
                subjects={subjects}
                initialSearch={globalSearch}
                onCreateNew={() => openCreateAssignment()}
                onEdit={openEditAssignment}
                onDelete={handleDeleteAssignment}
                onUpdateStatus={handleUpdateAssignmentStatus}
                onToggleSubtask={handleToggleSubtask}
                onAskAi={handleAskAiAboutAssignment}
              />
            )}

            {activeSection === 'subjects' && (
              <SubjectsPage
                subjects={subjects}
                assignments={assignments}
                onCreate={handleCreateSubject}
                onUpdate={handleUpdateSubject}
                onDelete={handleDeleteSubject}
              />
            )}

            {activeSection === 'calendar' && (
              <CalendarPage
                assignments={assignments}
                subjects={subjects}
                onAddForDate={(dateKey) => openCreateAssignment(dateKey)}
                onEditAssignment={openEditAssignment}
                onToggleComplete={(item) =>
                  handleUpdateAssignmentStatus(
                    item,
                    item.status === 'Completed' ? 'Pending' : 'Completed'
                  )
                }
              />
            )}

            {activeSection === 'ai-assistant' && (
              <AIAssistantPage
                user={user}
                assignments={assignments}
                subjects={subjects}
                preselectedAssignmentId={preselectedAiAssignmentId}
                onClearPreselectedAssignment={() => setPreselectedAiAssignmentId(null)}
                onNotify={pushToast}
              />
            )}

            {activeSection === 'analytics' && (
              <AnalyticsPage
                assignments={assignments}
                subjects={subjects}
                onQuickAdd={() => openCreateAssignment()}
              />
            )}

            {activeSection === 'notifications' && (
              <NotificationsPage
                user={user}
                notifications={notifications}
                onMarkRead={handleMarkNotificationRead}
                onMarkAllRead={handleMarkAllNotificationsRead}
                onNavigate={setActiveSection}
              />
            )}

            {(activeSection === 'settings' || activeSection === 'profile') && (
              <SettingsPage
                user={user}
                initialTab={activeSection === 'profile' ? 'profile' : 'preferences'}
                theme={theme}
                onUserUpdated={(updatedUser) => {
                  setUser(updatedUser);
                  setTheme(updatedUser.preferences.theme);
                  refreshNotifications();
                }}
                onToggleTheme={(nextTheme) => handleToggleTheme(nextTheme)}
                onNotify={pushToast}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </Layout>

      <AssignmentModal
        open={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        subjects={subjects}
        editingAssignment={editingAssignment}
        initialDueDate={modalInitialDueDate}
        onSave={handleSaveAssignment}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
