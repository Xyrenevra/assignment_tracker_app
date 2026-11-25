import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
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
} from '../src/types';
import { generateDeadlineNotifications } from '../src/utils/academicLogic';
import { hashPassword } from './security';

export interface StoredUser extends UserProfile {
  passwordHash: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  subjects: Subject[];
  assignments: Assignment[];
  chatConversations: ChatConversation[];
  chatMessages: ChatMessage[];
  notifications: AppNotification[];
}

export const DEMO_EMAIL = 'demo@assignai.edu';
const DEMO_SEED_KEY = 'DemoStudent123!';

const PROJECT_ROOT = process.cwd();
const RAW_DATA_DIR = process.env.DATA_DIR
  ? path.resolve(PROJECT_ROOT, process.env.DATA_DIR)
  : path.resolve(PROJECT_ROOT, 'data');
const DATA_DIR = RAW_DATA_DIR.startsWith(PROJECT_ROOT + path.sep)
  ? RAW_DATA_DIR
  : path.resolve(PROJECT_ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'assignai.db.json');

const EMPTY_DB: DatabaseSchema = {
  users: [],
  subjects: [],
  assignments: [],
  chatConversations: [],
  chatMessages: [],
  notifications: [],
};

let cache: DatabaseSchema | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDb(): DatabaseSchema {
  if (cache) return cache;
  ensureDataDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
      cache = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
        assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
        chatConversations: Array.isArray(parsed.chatConversations) ? parsed.chatConversations : [],
        chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      };
      return cache;
    } catch {
      cache = structuredClone(EMPTY_DB);
      return cache;
    }
  }
  cache = structuredClone(EMPTY_DB);
  saveDb(cache);
  return cache;
}

function saveDb(db: DatabaseSchema): void {
  ensureDataDir();
  const tmpFile = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function sanitizeUser(user: StoredUser): UserProfile {
  const { passwordHash: _omitted, ...publicProfile } = user;
  return publicProfile;
}

export function defaultPreferences(): UserPreferences {
  return {
    theme: 'light',
    reminderDays: 3,
    overdueAlerts: true,
    shareAiContextByDefault: true,
  };
}

function relativeDate(daysOffset: number, hours = 18, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export function ensureDemoAccount(): StoredUser {
  const db = loadDb();
  const existing = db.users.find((u) => u.email.toLowerCase() === DEMO_EMAIL);
  if (existing) {
    syncUserNotifications(existing.id);
    return existing;
  }

  const now = new Date().toISOString();
  const userId = 'usr_demo_aarav';
  const demoUser: StoredUser = {
    id: userId,
    name: 'Aarav Sharma',
    email: DEMO_EMAIL,
    passwordHash: hashPassword(DEMO_SEED_KEY),
    university: 'National Institute of Technology',
    major: 'B.Tech Computer Science & Engineering',
    semester: 'Semester 5',
    bio: 'Focusing on systems engineering, applied Python, and distributed networks.',
    isDemo: true,
    preferences: defaultPreferences(),
    createdAt: relativeDate(-21, 9, 0),
    updatedAt: now,
  };

  const subjects: Subject[] = [
    { id: 'sub_py', userId, subjectName: 'Advanced Python', subjectCode: 'CS301', color: '#6366F1', createdAt: relativeDate(-20) },
    { id: 'sub_os', userId, subjectName: 'Operating Systems', subjectCode: 'CS304', color: '#8B5CF6', createdAt: relativeDate(-20) },
    { id: 'sub_cn', userId, subjectName: 'Computer Networks', subjectCode: 'CS307', color: '#0EA5E9', createdAt: relativeDate(-20) },
    { id: 'sub_se', userId, subjectName: 'Software Engineering', subjectCode: 'CS312', color: '#10B981', createdAt: relativeDate(-20) },
    { id: 'sub_ma', userId, subjectName: 'Mathematics', subjectCode: 'MA205', color: '#F59E0B', createdAt: relativeDate(-20) },
    { id: 'sub_db', userId, subjectName: 'Database Management Systems', subjectCode: 'CS309', color: '#EC4899', createdAt: relativeDate(-20) },
  ];

  const assignments: Assignment[] = [
    {
      id: 'asg_1',
      userId,
      subjectId: 'sub_py',
      title: 'NumPy Broadcasting & Vectorized Matrix Ops Lab',
      description:
        'Implement batched cosine similarity and image convolution kernels using pure NumPy broadcasting without Python for-loops. Benchmark against iterative implementations and submit a Jupyter report.',
      dueDate: relativeDate(-2, 23, 59),
      priority: 'High',
      status: 'In Progress',
      subtasks: [
        { id: 'st_1', title: 'Write vectorized cosine similarity function', completed: true },
        { id: 'st_2', title: 'Implement 2D sliding window stride trick', completed: false },
        { id: 'st_3', title: 'Plot runtime benchmarks for 1k to 100k rows', completed: false },
      ],
      completedAt: null,
      createdAt: relativeDate(-6, 10, 15),
      updatedAt: relativeDate(-1, 14, 0),
    },
    {
      id: 'asg_2',
      userId,
      subjectId: 'sub_os',
      title: 'Multilevel Feedback Queue CPU Scheduler Simulation',
      description:
        'Build a discrete-event simulator comparing Round Robin, Shortest Remaining Time First, and 3-tier MLFQ scheduling algorithms. Report average turnaround time, waiting time, and starvation edge cases.',
      dueDate: relativeDate(0, 23, 30),
      priority: 'High',
      status: 'In Progress',
      subtasks: [
        { id: 'st_4', title: 'Parse process arrival trace CSV', completed: true },
        { id: 'st_5', title: 'Implement aging boost for Queue 3', completed: true },
        { id: 'st_6', title: 'Write Gantt chart & metrics summary', completed: false },
      ],
      completedAt: null,
      createdAt: relativeDate(-5, 11, 0),
      updatedAt: relativeDate(0, 8, 30),
    },
    {
      id: 'asg_3',
      userId,
      subjectId: 'sub_db',
      title: 'B+ Tree Indexing & Query Execution Plan Analysis',
      description:
        'Analyze PostgreSQL EXPLAIN ANALYZE outputs across unindexed, B-Tree indexed, and composite-indexed schemas on a 500k-row university enrollment dataset. Explain page I/O differences.',
      dueDate: relativeDate(1, 18, 0),
      priority: 'High',
      status: 'Pending',
      subtasks: [
        { id: 'st_7', title: 'Generate 500k synthetic enrollment records', completed: false },
        { id: 'st_8', title: 'Compare sequential scan vs index-only scan', completed: false },
      ],
      completedAt: null,
      createdAt: relativeDate(-4, 15, 20),
      updatedAt: relativeDate(-4, 15, 20),
    },
    {
      id: 'asg_4',
      userId,
      subjectId: 'sub_cn',
      title: 'TCP Congestion Control & Wireshark Packet Trace',
      description:
        'Capture and annotate TCP three-way handshake, slow start, fast retransmit, and AIMD window scaling from a simulated lossy link using Wireshark filters.',
      dueDate: relativeDate(3, 21, 0),
      priority: 'Medium',
      status: 'Pending',
      subtasks: [
        { id: 'st_9', title: 'Record 2-minute pcap trace over throttled loopback', completed: true },
        { id: 'st_10', title: 'Annotate cwnd drop and triple duplicate ACK frames', completed: false },
      ],
      completedAt: null,
      createdAt: relativeDate(-3, 9, 45),
      updatedAt: relativeDate(-2, 16, 0),
    },
    {
      id: 'asg_5',
      userId,
      subjectId: 'sub_se',
      title: 'UML Component Architecture & SRS Specification',
      description:
        'Draft IEEE-830 compliant Software Requirements Specification including functional requirements, sequence diagrams, and risk mitigation matrix for the semester capstone.',
      dueDate: relativeDate(5, 17, 0),
      priority: 'Medium',
      status: 'In Progress',
      subtasks: [
        { id: 'st_11', title: 'Complete functional & non-functional requirements', completed: true },
        { id: 'st_12', title: 'Draw authentication sequence diagram', completed: false },
      ],
      completedAt: null,
      createdAt: relativeDate(-2, 13, 10),
      updatedAt: relativeDate(-1, 11, 0),
    },
    {
      id: 'asg_6',
      userId,
      subjectId: 'sub_ma',
      title: 'Eigenvalues, SVD & Principal Component Analysis Problem Set',
      description:
        'Solve 8 analytical problems on orthogonal diagonalization, Singular Value Decomposition proofs, and low-rank matrix approximation error bounds.',
      dueDate: relativeDate(-1, 17, 0),
      priority: 'Medium',
      status: 'Pending',
      subtasks: [
        { id: 'st_13', title: 'Complete Questions 1–4 (characteristic polynomials)', completed: true },
        { id: 'st_14', title: 'Finish Questions 5–8 (Eckart-Young theorem)', completed: false },
      ],
      completedAt: null,
      createdAt: relativeDate(-6, 16, 0),
      updatedAt: relativeDate(-2, 19, 0),
    },
    {
      id: 'asg_7',
      userId,
      subjectId: 'sub_py',
      title: 'AsyncIO Concurrent Web Scraper & Rate Limiter',
      description:
        'Build an asynchronous HTTP fetcher using asyncio.Semaphore and aiohttp with graceful timeout handling and structured JSON export.',
      dueDate: relativeDate(-3, 20, 0),
      priority: 'High',
      status: 'Completed',
      subtasks: [
        { id: 'st_15', title: 'Implement token-bucket rate limiter', completed: true },
        { id: 'st_16', title: 'Add unit tests with mocked responses', completed: true },
      ],
      completedAt: relativeDate(-4, 19, 15),
      createdAt: relativeDate(-10, 10, 0),
      updatedAt: relativeDate(-4, 19, 15),
    },
    {
      id: 'asg_8',
      userId,
      subjectId: 'sub_db',
      title: 'Third Normal Form (3NF) & BCNF Schema Normalization',
      description:
        'Normalize an unnormalized hospital billing ledger through 1NF, 2NF, 3NF, and BCNF while verifying lossless join and dependency preservation.',
      dueDate: relativeDate(-2, 18, 0),
      priority: 'Medium',
      status: 'Completed',
      subtasks: [
        { id: 'st_17', title: 'Identify all candidate keys and functional dependencies', completed: true },
        { id: 'st_18', title: 'Verify lossless decomposition via chase test', completed: true },
      ],
      completedAt: relativeDate(-3, 15, 30),
      createdAt: relativeDate(-9, 14, 0),
      updatedAt: relativeDate(-3, 15, 30),
    },
    {
      id: 'asg_9',
      userId,
      subjectId: 'sub_os',
      title: 'POSIX Threads Producer-Consumer Synchronization Lab',
      description:
        'Implement a bounded ring buffer in C using pthread_mutex_t and condition variables without deadlocks or busy-waiting.',
      dueDate: relativeDate(-5, 18, 0),
      priority: 'High',
      status: 'Completed',
      subtasks: [],
      completedAt: relativeDate(-4, 10, 0), // completed 1 day late (for realistic on-time analytics!)
      createdAt: relativeDate(-12, 9, 0),
      updatedAt: relativeDate(-4, 10, 0),
    },
    {
      id: 'asg_10',
      userId,
      subjectId: 'sub_cn',
      title: 'CIDR Subnetting & VLSM Addressing Worksheet',
      description:
        'Design a campus IPv4 addressing plan for 6 departments with varying host counts while minimizing wasted address space.',
      dueDate: relativeDate(-1, 20, 0),
      priority: 'Low',
      status: 'Completed',
      subtasks: [],
      completedAt: relativeDate(-1, 16, 40),
      createdAt: relativeDate(-5, 12, 0),
      updatedAt: relativeDate(-1, 16, 40),
    },
    {
      id: 'asg_11',
      userId,
      subjectId: 'sub_se',
      title: 'Automated Unit Testing & CI Pipeline Proposal',
      description:
        'Write a short architectural brief recommending branch protection, automated linting, and integration test stages for a team repository.',
      dueDate: relativeDate(8, 18, 0),
      priority: 'Low',
      status: 'Pending',
      subtasks: [],
      completedAt: null,
      createdAt: relativeDate(-1, 9, 0),
      updatedAt: relativeDate(-1, 9, 0),
    },
    {
      id: 'asg_12',
      userId,
      subjectId: 'sub_ma',
      title: 'Bayesian Inference & Hypothesis Testing Quiz Prep',
      description:
        'Complete practice derivations for conjugate priors, posterior predictive intervals, and Type I / Type II error trade-offs.',
      dueDate: relativeDate(0, 19, 0),
      priority: 'Low',
      status: 'Completed',
      subtasks: [],
      completedAt: relativeDate(0, 9, 20),
      createdAt: relativeDate(-3, 17, 0),
      updatedAt: relativeDate(0, 9, 20),
    },
  ];

  db.users.push(demoUser);
  db.subjects.push(...subjects);
  db.assignments.push(...assignments);
  saveDb(db);

  syncUserNotifications(userId);
  return demoUser;
}

export function findUserByEmail(email: string): StoredUser | undefined {
  const db = loadDb();
  const normalized = email.trim().toLowerCase();
  return db.users.find((u) => u.email.toLowerCase() === normalized);
}

export function findUserById(userId: string): StoredUser | undefined {
  const db = loadDb();
  return db.users.find((u) => u.id === userId);
}

export function createUser(input: {
  name: string;
  email: string;
  password: string;
  university?: string;
  major?: string;
}): StoredUser {
  const db = loadDb();
  const now = new Date().toISOString();
  const user: StoredUser = {
    id: `usr_${crypto.randomUUID().slice(0, 12)}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: hashPassword(input.password),
    university: (input.university ?? '').trim(),
    major: (input.major ?? '').trim(),
    semester: '',
    bio: '',
    isDemo: false,
    preferences: defaultPreferences(),
    createdAt: now,
    updatedAt: now,
  };
  db.users.push(user);
  saveDb(db);
  return user;
}

export function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    email?: string;
    university?: string;
    major?: string;
    semester?: string;
    bio?: string;
    preferences?: Partial<UserPreferences>;
  }
): StoredUser | null {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;

  if (typeof updates.name === 'string') user.name = updates.name.trim();
  if (typeof updates.email === 'string') user.email = updates.email.trim().toLowerCase();
  if (typeof updates.university === 'string') user.university = updates.university.trim();
  if (typeof updates.major === 'string') user.major = updates.major.trim();
  if (typeof updates.semester === 'string') user.semester = updates.semester.trim();
  if (typeof updates.bio === 'string') user.bio = updates.bio.trim();

  if (updates.preferences) {
    user.preferences = {
      ...user.preferences,
      ...updates.preferences,
    };
  }

  user.updatedAt = new Date().toISOString();
  saveDb(db);
  syncUserNotifications(userId);
  return user;
}

export function updateUserPassword(userId: string, newPassword: string): boolean {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;
  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();
  saveDb(db);
  return true;
}

// --- Subjects ---

export function listSubjects(userId: string): Subject[] {
  const db = loadDb();
  return db.subjects
    .filter((s) => s.userId === userId)
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

export function createSubject(
  userId: string,
  input: { subjectName: string; subjectCode: string; color: string }
): Subject {
  const db = loadDb();
  const subject: Subject = {
    id: `sub_${crypto.randomUUID().slice(0, 12)}`,
    userId,
    subjectName: input.subjectName.trim(),
    subjectCode: input.subjectCode.trim().toUpperCase(),
    color: input.color,
    createdAt: new Date().toISOString(),
  };
  db.subjects.push(subject);
  saveDb(db);
  return subject;
}

export function updateSubject(
  userId: string,
  subjectId: string,
  input: { subjectName?: string; subjectCode?: string; color?: string }
): Subject | null {
  const db = loadDb();
  const subject = db.subjects.find((s) => s.id === subjectId && s.userId === userId);
  if (!subject) return null;
  if (typeof input.subjectName === 'string') subject.subjectName = input.subjectName.trim();
  if (typeof input.subjectCode === 'string') subject.subjectCode = input.subjectCode.trim().toUpperCase();
  if (typeof input.color === 'string') subject.color = input.color;
  saveDb(db);
  return subject;
}

/**
 * Safely deletes a subject without losing associated assignments (unlinks subjectId -> null).
 */
export function deleteSubject(userId: string, subjectId: string): { deleted: boolean; unlinkedCount: number } {
  const db = loadDb();
  const idx = db.subjects.findIndex((s) => s.id === subjectId && s.userId === userId);
  if (idx === -1) return { deleted: false, unlinkedCount: 0 };

  db.subjects.splice(idx, 1);
  let unlinkedCount = 0;
  const now = new Date().toISOString();
  for (const assignment of db.assignments) {
    if (assignment.userId === userId && assignment.subjectId === subjectId) {
      assignment.subjectId = null;
      assignment.updatedAt = now;
      unlinkedCount += 1;
    }
  }
  saveDb(db);
  return { deleted: true, unlinkedCount };
}

// --- Assignments ---

export function listAssignments(userId: string): Assignment[] {
  const db = loadDb();
  return db.assignments
    .filter((a) => a.userId === userId)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export function findAssignment(userId: string, assignmentId: string): Assignment | undefined {
  const db = loadDb();
  return db.assignments.find((a) => a.id === assignmentId && a.userId === userId);
}

export function createAssignment(
  userId: string,
  input: {
    subjectId: string | null;
    title: string;
    description: string;
    dueDate: string;
    priority: Priority;
    status: AssignmentStatus;
    subtasks: Subtask[];
  }
): Assignment {
  const db = loadDb();
  const now = new Date().toISOString();

  // Verify subject belongs to user if provided
  let validSubjectId: string | null = null;
  if (input.subjectId) {
    const ownedSubject = db.subjects.find((s) => s.id === input.subjectId && s.userId === userId);
    if (ownedSubject) validSubjectId = ownedSubject.id;
  }

  const assignment: Assignment = {
    id: `asg_${crypto.randomUUID().slice(0, 12)}`,
    userId,
    subjectId: validSubjectId,
    title: input.title.trim(),
    description: input.description.trim(),
    dueDate: new Date(input.dueDate).toISOString(),
    priority: input.priority,
    status: input.status,
    subtasks: input.subtasks.map((st) => ({
      id: st.id || `st_${crypto.randomUUID().slice(0, 8)}`,
      title: st.title.trim(),
      completed: Boolean(st.completed),
    })),
    completedAt: input.status === 'Completed' ? now : null,
    createdAt: now,
    updatedAt: now,
  };

  db.assignments.push(assignment);
  saveDb(db);
  syncUserNotifications(userId);
  return assignment;
}

export function updateAssignment(
  userId: string,
  assignmentId: string,
  updates: Partial<{
    subjectId: string | null;
    title: string;
    description: string;
    dueDate: string;
    priority: Priority;
    status: AssignmentStatus;
    subtasks: Subtask[];
  }>
): Assignment | null {
  const db = loadDb();
  const assignment = db.assignments.find((a) => a.id === assignmentId && a.userId === userId);
  if (!assignment) return null;

  const now = new Date().toISOString();
  if (updates.subjectId !== undefined) {
    if (updates.subjectId === null || updates.subjectId === '') {
      assignment.subjectId = null;
    } else {
      const owned = db.subjects.find((s) => s.id === updates.subjectId && s.userId === userId);
      assignment.subjectId = owned ? owned.id : null;
    }
  }
  if (typeof updates.title === 'string') assignment.title = updates.title.trim();
  if (typeof updates.description === 'string') assignment.description = updates.description.trim();
  if (typeof updates.dueDate === 'string') assignment.dueDate = new Date(updates.dueDate).toISOString();
  if (updates.priority) assignment.priority = updates.priority;
  if (updates.subtasks) {
    assignment.subtasks = updates.subtasks.map((st) => ({
      id: st.id || `st_${crypto.randomUUID().slice(0, 8)}`,
      title: st.title.trim(),
      completed: Boolean(st.completed),
    }));
  }
  if (updates.status) {
    const prevStatus = assignment.status;
    assignment.status = updates.status;
    if (updates.status === 'Completed' && prevStatus !== 'Completed') {
      assignment.completedAt = now;
    } else if (updates.status !== 'Completed') {
      assignment.completedAt = null;
    }
  }

  assignment.updatedAt = now;
  saveDb(db);
  syncUserNotifications(userId);
  return assignment;
}

export function deleteAssignment(userId: string, assignmentId: string): boolean {
  const db = loadDb();
  const idx = db.assignments.findIndex((a) => a.id === assignmentId && a.userId === userId);
  if (idx === -1) return false;
  db.assignments.splice(idx, 1);
  // Remove notifications tied to deleted assignment
  db.notifications = db.notifications.filter(
    (n) => !(n.userId === userId && n.assignmentId === assignmentId)
  );
  saveDb(db);
  return true;
}

// --- Notifications ---

export function syncUserNotifications(userId: string): AppNotification[] {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return [];

  const userAssignments = db.assignments.filter((a) => a.userId === userId);
  const completedIds = new Set(
    userAssignments.filter((a) => a.status === 'Completed').map((a) => a.id)
  );

  // Prune stale overdue/upcoming notifications for assignments that are now completed
  let changed = false;
  const beforeLen = db.notifications.length;
  db.notifications = db.notifications.filter(
    (n) =>
      !(
        n.userId === userId &&
        n.assignmentId &&
        completedIds.has(n.assignmentId) &&
        (n.type === 'overdue' || n.type === 'upcoming')
      )
  );
  if (db.notifications.length !== beforeLen) changed = true;

  const existing = db.notifications.filter((n) => n.userId === userId);
  const createdDrafts = generateDeadlineNotifications(
    userId,
    userAssignments,
    user.preferences.reminderDays,
    user.preferences.overdueAlerts,
    existing
  );

  if (createdDrafts.length > 0) {
    const now = new Date().toISOString();
    for (const draft of createdDrafts) {
      db.notifications.push({
        ...draft,
        id: `ntf_${crypto.randomUUID().slice(0, 12)}`,
        createdAt: now,
      });
    }
    changed = true;
  }

  if (changed) saveDb(db);

  return db.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function markNotificationRead(userId: string, notificationId: string): AppNotification | null {
  const db = loadDb();
  const item = db.notifications.find((n) => n.id === notificationId && n.userId === userId);
  if (!item) return null;
  item.readStatus = true;
  saveDb(db);
  return item;
}

export function markAllNotificationsRead(userId: string): number {
  const db = loadDb();
  let count = 0;
  for (const n of db.notifications) {
    if (n.userId === userId && !n.readStatus) {
      n.readStatus = true;
      count += 1;
    }
  }
  if (count > 0) saveDb(db);
  return count;
}

// --- Chat History ---

export function listConversations(userId: string): ChatConversation[] {
  const db = loadDb();
  return db.chatConversations
    .filter((c) => c.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function createConversation(
  userId: string,
  title: string,
  assignmentId: string | null = null
): ChatConversation {
  const db = loadDb();
  const now = new Date().toISOString();
  const conv: ChatConversation = {
    id: `conv_${crypto.randomUUID().slice(0, 12)}`,
    userId,
    title: title.trim() || 'New Study Chat',
    assignmentId,
    createdAt: now,
    updatedAt: now,
  };
  db.chatConversations.push(conv);
  saveDb(db);
  return conv;
}

export function findConversation(userId: string, conversationId: string): ChatConversation | undefined {
  const db = loadDb();
  return db.chatConversations.find((c) => c.id === conversationId && c.userId === userId);
}

export function updateConversationMeta(
  userId: string,
  conversationId: string,
  updates: { title?: string; assignmentId?: string | null }
): ChatConversation | null {
  const db = loadDb();
  const conv = db.chatConversations.find((c) => c.id === conversationId && c.userId === userId);
  if (!conv) return null;
  if (typeof updates.title === 'string') conv.title = updates.title.trim();
  if (updates.assignmentId !== undefined) conv.assignmentId = updates.assignmentId;
  conv.updatedAt = new Date().toISOString();
  saveDb(db);
  return conv;
}

export function deleteConversation(userId: string, conversationId: string): boolean {
  const db = loadDb();
  const idx = db.chatConversations.findIndex((c) => c.id === conversationId && c.userId === userId);
  if (idx === -1) return false;
  db.chatConversations.splice(idx, 1);
  db.chatMessages = db.chatMessages.filter(
    (m) => !(m.userId === userId && m.conversationId === conversationId)
  );
  saveDb(db);
  return true;
}

export function listMessages(userId: string, conversationId: string): ChatMessage[] {
  const db = loadDb();
  return db.chatMessages
    .filter((m) => m.userId === userId && m.conversationId === conversationId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function appendMessage(
  userId: string,
  conversationId: string,
  role: 'user' | 'assistant',
  message: string,
  model?: string
): ChatMessage {
  const db = loadDb();
  const now = new Date().toISOString();
  const entry: ChatMessage = {
    id: `msg_${crypto.randomUUID().slice(0, 12)}`,
    userId,
    conversationId,
    role,
    message,
    model,
    timestamp: now,
  };
  db.chatMessages.push(entry);
  const conv = db.chatConversations.find((c) => c.id === conversationId && c.userId === userId);
  if (conv) {
    conv.updatedAt = now;
  }
  saveDb(db);
  return entry;
}

export function deleteLastAssistantMessage(userId: string, conversationId: string): boolean {
  const db = loadDb();
  const messages = db.chatMessages.filter(
    (m) => m.userId === userId && m.conversationId === conversationId
  );
  if (messages.length === 0) return false;
  const last = messages[messages.length - 1];
  if (last.role !== 'assistant') return false;
  db.chatMessages = db.chatMessages.filter((m) => m.id !== last.id);
  saveDb(db);
  return true;
}
