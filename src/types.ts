export type Priority = 'High' | 'Medium' | 'Low';
export type AssignmentStatus = 'Pending' | 'In Progress' | 'Completed';
export type ThemeMode = 'light' | 'dark';

export interface UserPreferences {
  theme: ThemeMode;
  reminderDays: 1 | 3 | 7;
  overdueAlerts: boolean;
  shareAiContextByDefault: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  university: string;
  major: string;
  semester: string;
  bio: string;
  isDemo?: boolean;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  userId: string;
  subjectName: string;
  subjectCode: string;
  color: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Assignment {
  id: string;
  userId: string;
  subjectId: string | null;
  title: string;
  description: string;
  dueDate: string; // ISO string
  priority: Priority;
  status: AssignmentStatus;
  subtasks: Subtask[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  assignmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  message: string;
  model?: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  assignmentId: string | null;
  type: 'overdue' | 'upcoming' | 'system';
  message: string;
  readStatus: boolean;
  createdAt: string;
}

export interface DashboardStats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
  dueToday: number;
  completionRate: number;
}

export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  color: string;
  total: number;
  completed: number;
  pending: number;
  completionPercentage: number;
}

export interface WeeklyActivityPoint {
  label: string;
  dateKey: string;
  created: number;
  completed: number;
}

export interface PriorityDistributionPoint {
  priority: Priority;
  count: number;
  completed: number;
  color: string;
}

export interface AnalyticsData {
  stats: DashboardStats;
  subjectProgress: SubjectProgress[];
  weeklyActivity: WeeklyActivityPoint[];
  priorityDistribution: PriorityDistributionPoint[];
  completedOnTime: number;
  completedLate: number;
  onTimeRate: number;
}

export type NavSection =
  | 'overview'
  | 'assignments'
  | 'subjects'
  | 'calendar'
  | 'ai-assistant'
  | 'analytics'
  | 'notifications'
  | 'settings'
  | 'profile';
