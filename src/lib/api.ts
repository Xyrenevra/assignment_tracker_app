import type {
  AppNotification,
  Assignment,
  AssignmentStatus,
  ChatConversation,
  ChatMessage,
  Priority,
  Subject,
  Subtask,
  UserPreferences,
  UserProfile,
} from '../types';

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

// Held strictly in JS memory (never written to localStorage or sessionStorage)
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { error: text };
    }
  }

  if (!res.ok) {
    throw new ApiError(
      typeof parsed.error === 'string' ? parsed.error : `Request failed (${res.status})`,
      res.status,
      typeof parsed.code === 'string' ? parsed.code : undefined,
      parsed
    );
  }

  return parsed as T;
}

export const api = {
  // Auth
  async register(input: {
    name: string;
    email: string;
    password: string;
    university?: string;
    major?: string;
  }) {
    const res = await request<{ user: UserProfile; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setAuthToken(res.token);
    return res;
  },

  async login(input: { email: string; password: string }) {
    const res = await request<{ user: UserProfile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setAuthToken(res.token);
    return res;
  },

  async loginDemo() {
    const res = await request<{ user: UserProfile; token: string }>('/api/auth/demo', {
      method: 'POST',
    });
    setAuthToken(res.token);
    return res;
  },

  async logout() {
    try {
      await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  },

  async getSession() {
    const res = await request<{ authenticated: boolean; user: UserProfile | null; token: string | null }>(
      '/api/auth/session'
    );
    setAuthToken(res.token);
    return res;
  },

  async me() {
    const res = await request<{ user: UserProfile; token: string }>('/api/auth/me');
    setAuthToken(res.token);
    return res;
  },

  async updateProfile(input: {
    name?: string;
    email?: string;
    university?: string;
    major?: string;
    semester?: string;
    bio?: string;
    preferences?: Partial<UserPreferences>;
  }) {
    return request<{ user: UserProfile }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async updatePassword(input: { currentPassword: string; newPassword: string }) {
    return request<{ ok: boolean }>('/api/auth/password', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  // Subjects
  async listSubjects() {
    return request<{ subjects: Subject[] }>('/api/subjects');
  },

  async createSubject(input: { subjectName: string; subjectCode: string; color: string }) {
    return request<{ subject: Subject }>('/api/subjects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateSubject(
    id: string,
    input: Partial<{ subjectName: string; subjectCode: string; color: string }>
  ) {
    return request<{ subject: Subject }>(`/api/subjects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async deleteSubject(id: string) {
    return request<{ ok: boolean; unlinkedCount: number }>(
      `/api/subjects/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
  },

  // Assignments
  async listAssignments() {
    return request<{ assignments: Assignment[] }>('/api/assignments');
  },

  async createAssignment(input: {
    title: string;
    description: string;
    subjectId: string | null;
    dueDate: string;
    priority: Priority;
    status: AssignmentStatus;
    subtasks: Subtask[];
  }) {
    return request<{ assignment: Assignment }>('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateAssignment(
    id: string,
    input: Partial<{
      title: string;
      description: string;
      subjectId: string | null;
      dueDate: string;
      priority: Priority;
      status: AssignmentStatus;
      subtasks: Subtask[];
    }>
  ) {
    return request<{ assignment: Assignment }>(`/api/assignments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async deleteAssignment(id: string) {
    return request<{ ok: boolean }>(`/api/assignments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Notifications
  async listNotifications() {
    return request<{ notifications: AppNotification[] }>('/api/notifications');
  },

  async markNotificationRead(id: string) {
    return request<{ notification: AppNotification }>(
      `/api/notifications/${encodeURIComponent(id)}/read`,
      { method: 'PATCH' }
    );
  },

  async markAllNotificationsRead() {
    return request<{ ok: boolean; updatedCount: number }>('/api/notifications/read-all', {
      method: 'POST',
    });
  },

  // AI Assistant
  async getAiStatus() {
    return request<{ configured: boolean }>('/api/ai/status');
  },

  async listConversations() {
    return request<{ conversations: ChatConversation[] }>('/api/ai/conversations');
  },

  async createConversation(input: { title?: string; assignmentId?: string | null }) {
    return request<{ conversation: ChatConversation }>('/api/ai/conversations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async deleteConversation(id: string) {
    return request<{ ok: boolean }>(`/api/ai/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async getConversationMessages(id: string) {
    return request<{ conversation: ChatConversation; messages: ChatMessage[] }>(
      `/api/ai/conversations/${encodeURIComponent(id)}/messages`
    );
  },

  async sendAiMessage(input: {
    conversationId?: string | null;
    message?: string;
    includeContext: boolean;
    assignmentId?: string | null;
    regenerate?: boolean;
    model?: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
  }) {
    return request<{
      conversation: ChatConversation;
      userMessage: ChatMessage | null;
      assistantMessage: ChatMessage;
      messages: ChatMessage[];
    }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
