import type {
  AnalyticsData,
  AppNotification,
  Assignment,
  AssignmentStatus,
  DashboardStats,
  Priority,
  PriorityDistributionPoint,
  Subject,
  SubjectProgress,
  WeeklyActivityPoint,
} from '../types';

const MS_PER_DAY = 86_400_000;

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDueDate(dueDate: string): Date {
  return new Date(dueDate);
}

/**
 * Completed assignments are NEVER classified as overdue.
 * Unfinished assignments whose submission deadline has passed are overdue.
 */
export function isAssignmentOverdue(
  assignment: Pick<Assignment, 'dueDate' | 'status'>,
  now: Date = new Date()
): boolean {
  if (assignment.status === 'Completed') return false;
  const due = parseDueDate(assignment.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}

export function isAssignmentDueToday(
  assignment: Pick<Assignment, 'dueDate' | 'status'>,
  now: Date = new Date()
): boolean {
  if (assignment.status === 'Completed') return false;
  const due = parseDueDate(assignment.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return toDateKey(due) === toDateKey(now);
}

/**
 * Returns calendar-day difference between dueDate and now.
 * 0 = today, 1 = tomorrow, -2 = 2 days ago.
 */
export function getCalendarDayDiff(dueDate: string, now: Date = new Date()): number {
  const due = parseDueDate(dueDate);
  const dueDay = startOfLocalDay(due).getTime();
  const today = startOfLocalDay(now).getTime();
  return Math.round((dueDay - today) / MS_PER_DAY);
}

export interface DeadlineLabelInfo {
  text: string;
  tone: 'completed' | 'overdue' | 'warning' | 'neutral';
  daysDiff: number;
}

export function getDeadlineLabel(
  dueDate: string,
  status: AssignmentStatus,
  now: Date = new Date()
): DeadlineLabelInfo {
  const daysDiff = getCalendarDayDiff(dueDate, now);

  if (status === 'Completed') {
    return { text: 'Completed', tone: 'completed', daysDiff };
  }

  const overdue = isAssignmentOverdue({ dueDate, status }, now);
  if (overdue) {
    if (daysDiff === 0) {
      return { text: 'Overdue today', tone: 'overdue', daysDiff: 0 };
    }
    const overdueDays = Math.max(1, Math.abs(daysDiff));
    return {
      text: `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'}`,
      tone: 'overdue',
      daysDiff,
    };
  }

  if (daysDiff === 0) {
    return { text: 'Due today', tone: 'warning', daysDiff: 0 };
  }
  if (daysDiff === 1) {
    return { text: 'Due tomorrow', tone: 'warning', daysDiff: 1 };
  }
  if (daysDiff <= 3) {
    return { text: `Due in ${daysDiff} days`, tone: 'warning', daysDiff };
  }
  return { text: `Due in ${daysDiff} days`, tone: 'neutral', daysDiff };
}

export function computeDashboardStats(
  assignments: Assignment[],
  now: Date = new Date()
): DashboardStats {
  const total = assignments.length;
  let completed = 0;
  let pending = 0;
  let inProgress = 0;
  let overdue = 0;
  let dueToday = 0;

  for (const item of assignments) {
    if (item.status === 'Completed') {
      completed += 1;
      continue;
    }
    if (item.status === 'In Progress') {
      inProgress += 1;
    }
    pending += 1;
    if (isAssignmentOverdue(item, now)) {
      overdue += 1;
    }
    if (isAssignmentDueToday(item, now)) {
      dueToday += 1;
    }
  }

  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    pending,
    inProgress,
    overdue,
    dueToday,
    completionRate,
  };
}

export function computeSubjectProgress(
  subjects: Subject[],
  assignments: Assignment[]
): SubjectProgress[] {
  return subjects.map((subject) => {
    const items = assignments.filter((a) => a.subjectId === subject.id);
    const total = items.length;
    const completed = items.filter((a) => a.status === 'Completed').length;
    const pending = total - completed;
    const completionPercentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      subjectId: subject.id,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      color: subject.color,
      total,
      completed,
      pending,
      completionPercentage,
    };
  });
}

export function computeAnalyticsData(
  assignments: Assignment[],
  subjects: Subject[],
  now: Date = new Date()
): AnalyticsData {
  const stats = computeDashboardStats(assignments, now);
  const subjectProgress = computeSubjectProgress(subjects, assignments);

  // Build 7-day activity series ending today
  const weeklyActivity: WeeklyActivityPoint[] = [];
  const todayStart = startOfLocalDay(now);
  const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(todayStart.getTime() - offset * MS_PER_DAY);
    const key = toDateKey(day);
    const created = assignments.filter((a) => toDateKey(new Date(a.createdAt)) === key).length;
    const completed = assignments.filter(
      (a) => a.status === 'Completed' && a.completedAt && toDateKey(new Date(a.completedAt)) === key
    ).length;

    weeklyActivity.push({
      label: dayFormatter.format(day),
      dateKey: key,
      created,
      completed,
    });
  }

  const priorityMeta: Array<{ priority: Priority; color: string }> = [
    { priority: 'High', color: '#EF4444' },
    { priority: 'Medium', color: '#F59E0B' },
    { priority: 'Low', color: '#10B981' },
  ];

  const priorityDistribution: PriorityDistributionPoint[] = priorityMeta.map(({ priority, color }) => {
    const matching = assignments.filter((a) => a.priority === priority);
    return {
      priority,
      count: matching.length,
      completed: matching.filter((a) => a.status === 'Completed').length,
      color,
    };
  });

  let completedOnTime = 0;
  let completedLate = 0;
  for (const item of assignments) {
    if (item.status !== 'Completed') continue;
    const completedTs = item.completedAt ? new Date(item.completedAt).getTime() : new Date(item.updatedAt).getTime();
    const dueTs = new Date(item.dueDate).getTime();
    if (completedTs <= dueTs) {
      completedOnTime += 1;
    } else {
      completedLate += 1;
    }
  }

  const totalCompleted = completedOnTime + completedLate;
  const onTimeRate = totalCompleted === 0 ? 0 : Math.round((completedOnTime / totalCompleted) * 100);

  return {
    stats,
    subjectProgress,
    weeklyActivity,
    priorityDistribution,
    completedOnTime,
    completedLate,
    onTimeRate,
  };
}

export interface AssignmentFilterOptions {
  search: string;
  subjectId: string; // 'all' | 'unassigned' | subject.id
  priority: 'all' | Priority;
  status: 'all' | AssignmentStatus | 'Overdue';
  sortBy: 'dueDateAsc' | 'dueDateDesc' | 'priority' | 'recent';
}

const PRIORITY_WEIGHT: Record<Priority, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export function filterAndSortAssignments(
  assignments: Assignment[],
  filters: AssignmentFilterOptions,
  subjectsById: Map<string, Subject>,
  now: Date = new Date()
): Assignment[] {
  const query = filters.search.trim().toLowerCase();

  const filtered = assignments.filter((item) => {
    if (filters.subjectId === 'unassigned') {
      if (item.subjectId !== null) return false;
    } else if (filters.subjectId !== 'all' && item.subjectId !== filters.subjectId) {
      return false;
    }

    if (filters.priority !== 'all' && item.priority !== filters.priority) {
      return false;
    }

    if (filters.status === 'Overdue') {
      if (!isAssignmentOverdue(item, now)) return false;
    } else if (filters.status !== 'all' && item.status !== filters.status) {
      return false;
    }

    if (query) {
      const subjectName = item.subjectId ? (subjectsById.get(item.subjectId)?.subjectName ?? '') : '';
      const subjectCode = item.subjectId ? (subjectsById.get(item.subjectId)?.subjectCode ?? '') : '';
      const haystack = `${item.title} ${item.description} ${subjectName} ${subjectCode}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'dueDateDesc':
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      case 'priority': {
        const diff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        if (diff !== 0) return diff;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'dueDateAsc':
      default:
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
  });
}

export function generateDeadlineNotifications(
  userId: string,
  assignments: Assignment[],
  reminderDays: 1 | 3 | 7,
  overdueAlerts: boolean,
  existingNotifications: AppNotification[],
  now: Date = new Date()
): Array<Omit<AppNotification, 'id' | 'createdAt'>> {
  const existingKeys = new Set(
    existingNotifications.map((n) => `${n.assignmentId ?? 'none'}::${n.type}`)
  );
  const toCreate: Array<Omit<AppNotification, 'id' | 'createdAt'>> = [];

  for (const item of assignments) {
    if (item.status === 'Completed') continue;
    const overdue = isAssignmentOverdue(item, now);
    const daysDiff = getCalendarDayDiff(item.dueDate, now);

    if (overdue && overdueAlerts) {
      const key = `${item.id}::overdue`;
      if (!existingKeys.has(key)) {
        const label = getDeadlineLabel(item.dueDate, item.status, now).text;
        toCreate.push({
          userId,
          assignmentId: item.id,
          type: 'overdue',
          message: `"${item.title}" is ${label.toLowerCase()}. Prioritize submitting it soon.`,
          readStatus: false,
        });
        existingKeys.add(key);
      }
    } else if (!overdue && daysDiff >= 0 && daysDiff <= reminderDays) {
      const key = `${item.id}::upcoming`;
      if (!existingKeys.has(key)) {
        const label = getDeadlineLabel(item.dueDate, item.status, now).text;
        toCreate.push({
          userId,
          assignmentId: item.id,
          type: 'upcoming',
          message: `Upcoming deadline: "${item.title}" is ${label.toLowerCase()}.`,
          readStatus: false,
        });
        existingKeys.add(key);
      }
    }
  }

  return toCreate;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email address is required.';
  if (trimmed.length > 254) return 'Email address is too long.';
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(trimmed)) return 'Please enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (password.length > 128) return 'Password must be 128 characters or fewer.';
  return null;
}

export function validateAssignmentInput(input: {
  title?: unknown;
  dueDate?: unknown;
  priority?: unknown;
  status?: unknown;
}): string | null {
  if (typeof input.title !== 'string' || !input.title.trim()) {
    return 'Assignment title is required.';
  }
  if (input.title.trim().length > 180) {
    return 'Assignment title must be 180 characters or fewer.';
  }
  if (typeof input.dueDate !== 'string' || !input.dueDate.trim()) {
    return 'Submission deadline is required.';
  }
  const parsed = new Date(input.dueDate);
  if (Number.isNaN(parsed.getTime())) {
    return 'Submission deadline must be a valid date.';
  }
  const validPriorities: Priority[] = ['High', 'Medium', 'Low'];
  if (!validPriorities.includes(input.priority as Priority)) {
    return 'Priority must be High, Medium, or Low.';
  }
  const validStatuses: AssignmentStatus[] = ['Pending', 'In Progress', 'Completed'];
  if (!validStatuses.includes(input.status as AssignmentStatus)) {
    return 'Status must be Pending, In Progress, or Completed.';
  }
  return null;
}

export function validateSubjectInput(input: {
  subjectName?: unknown;
  color?: unknown;
}): string | null {
  if (typeof input.subjectName !== 'string' || !input.subjectName.trim()) {
    return 'Subject name is required.';
  }
  if (input.subjectName.trim().length > 80) {
    return 'Subject name must be 80 characters or fewer.';
  }
  if (typeof input.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(input.color)) {
    return 'Subject color must be a valid hex color (e.g. #6366F1).';
  }
  return null;
}
