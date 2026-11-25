import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import {
  appendMessage,
  createAssignment,
  createConversation,
  createSubject,
  createUser,
  deleteAssignment,
  deleteConversation,
  deleteLastAssistantMessage,
  deleteSubject,
  ensureDemoAccount,
  findAssignment,
  findConversation,
  findUserByEmail,
  findUserById,
  listAssignments,
  listConversations,
  listMessages,
  listSubjects,
  markAllNotificationsRead,
  markNotificationRead,
  sanitizeUser,
  syncUserNotifications,
  updateAssignment,
  updateConversationMeta,
  updateSubject,
  updateUserPassword,
  updateUserProfile,
  type StoredUser,
} from './server/db';
import {
  clearSessionCookie,
  createRateLimiter,
  extractAuthToken,
  setSessionCookie,
  signJwt,
  verifyCookieMutationCsrf,
  verifyJwt,
  verifyPassword,
} from './server/security';
import {
  generateAcademicReply,
  isGeminiConfigured,
  type SupportedGeminiModel,
} from './server/gemini';
import {
  validateAssignmentInput,
  validateEmail,
  validatePassword,
  validateSubjectInput,
} from './src/utils/academicLogic';
import type { AssignmentStatus, Priority, Subtask } from './src/types';

interface AuthedRequest extends Request {
  user?: StoredUser;
}

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  // Seed demo account on startup so it is always ready
  ensureDemoAccount();

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Basic security headers (do not set X-Frame-Options so AI Studio preview iframe works)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Rate limiters
  const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: 'Too many authentication attempts. Please wait a few minutes before trying again.',
  });
  const aiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 20,
    message: 'AI assistant rate limit reached. Please wait a moment before sending another prompt.',
  });
  const apiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 240,
    message: 'Too many requests. Please slow down briefly.',
  });

  app.use('/api', apiLimiter);

  // Auth middleware enforcing JWT verification + CSRF guard on cookie-based mutations
  function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
    const { token, source } = extractAuthToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }
    if (source === 'cookie' && !verifyCookieMutationCsrf(req)) {
      res.status(403).json({ error: 'Cross-site request validation failed.' });
      return;
    }
    const payload = verifyJwt(token);
    if (!payload) {
      res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
      return;
    }
    const user = findUserById(payload.sub);
    if (!user) {
      res.status(401).json({ error: 'Account not found. Please sign in again.' });
      return;
    }
    req.user = user;
    next();
  }

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', aiConfigured: isGeminiConfigured() });
  });

  // --- Auth Routes ---

  app.post('/api/auth/register', authLimiter, (req, res) => {
    const { name, email, password, university, major } = req.body ?? {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      res.status(400).json({ error: 'Full name must be between 2 and 80 characters.' });
      return;
    }
    const emailErr = validateEmail(typeof email === 'string' ? email : '');
    if (emailErr) {
      res.status(400).json({ error: emailErr });
      return;
    }
    const passErr = validatePassword(typeof password === 'string' ? password : '');
    if (passErr) {
      res.status(400).json({ error: passErr });
      return;
    }

    if (findUserByEmail(email)) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const user = createUser({
      name,
      email,
      password,
      university: typeof university === 'string' ? university : '',
      major: typeof major === 'string' ? major : '',
    });

    const token = signJwt(user.id, user.email);
    setSessionCookie(res, token);
    res.status(201).json({ user: sanitizeUser(user), token });
  });

  app.post('/api/auth/login', authLimiter, (req, res) => {
    const { email, password } = req.body ?? {};
    const emailErr = validateEmail(typeof email === 'string' ? email : '');
    if (emailErr) {
      res.status(400).json({ error: emailErr });
      return;
    }
    if (typeof password !== 'string' || !password) {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }

    const user = findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }

    syncUserNotifications(user.id);
    const token = signJwt(user.id, user.email);
    setSessionCookie(res, token);
    res.json({ user: sanitizeUser(user), token });
  });

  app.post('/api/auth/demo', authLimiter, (_req, res) => {
    const demoUser = ensureDemoAccount();
    const token = signJwt(demoUser.id, demoUser.email);
    setSessionCookie(res, token);
    res.json({ user: sanitizeUser(demoUser), token });
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/auth/session', (req, res) => {
    const { token } = extractAuthToken(req);
    if (!token) {
      res.json({ authenticated: false, user: null, token: null });
      return;
    }
    const payload = verifyJwt(token);
    if (!payload) {
      res.json({ authenticated: false, user: null, token: null });
      return;
    }
    const user = findUserById(payload.sub);
    if (!user) {
      res.json({ authenticated: false, user: null, token: null });
      return;
    }
    syncUserNotifications(user.id);
    const refreshedToken = signJwt(user.id, user.email);
    res.json({ authenticated: true, user: sanitizeUser(user), token: refreshedToken });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    syncUserNotifications(user.id);
    const token = signJwt(user.id, user.email);
    res.json({ user: sanitizeUser(user), token });
  });

  app.patch('/api/auth/profile', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const { name, email, university, major, semester, bio, preferences } = req.body ?? {};

    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80)) {
      res.status(400).json({ error: 'Full name must be between 2 and 80 characters.' });
      return;
    }
    if (email !== undefined) {
      const emailErr = validateEmail(typeof email === 'string' ? email : '');
      if (emailErr) {
        res.status(400).json({ error: emailErr });
        return;
      }
      const existing = findUserByEmail(email);
      if (existing && existing.id !== user.id) {
        res.status(409).json({ error: 'Another account already uses this email address.' });
        return;
      }
    }

    let safePrefs: Partial<StoredUser['preferences']> | undefined;
    if (preferences && typeof preferences === 'object') {
      safePrefs = {};
      if (preferences.theme === 'light' || preferences.theme === 'dark') {
        safePrefs.theme = preferences.theme;
      }
      if (preferences.reminderDays === 1 || preferences.reminderDays === 3 || preferences.reminderDays === 7) {
        safePrefs.reminderDays = preferences.reminderDays;
      }
      if (typeof preferences.overdueAlerts === 'boolean') {
        safePrefs.overdueAlerts = preferences.overdueAlerts;
      }
      if (typeof preferences.shareAiContextByDefault === 'boolean') {
        safePrefs.shareAiContextByDefault = preferences.shareAiContextByDefault;
      }
    }

    const updated = updateUserProfile(user.id, {
      name: typeof name === 'string' ? name : undefined,
      email: typeof email === 'string' ? email : undefined,
      university: typeof university === 'string' ? university.slice(0, 120) : undefined,
      major: typeof major === 'string' ? major.slice(0, 120) : undefined,
      semester: typeof semester === 'string' ? semester.slice(0, 40) : undefined,
      bio: typeof bio === 'string' ? bio.slice(0, 400) : undefined,
      preferences: safePrefs,
    });

    if (!updated) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    res.json({ user: sanitizeUser(updated) });
  });

  app.patch('/api/auth/password', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== 'string' || !currentPassword) {
      res.status(400).json({ error: 'Current password is required.' });
      return;
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }
    const passErr = validatePassword(typeof newPassword === 'string' ? newPassword : '');
    if (passErr) {
      res.status(400).json({ error: passErr });
      return;
    }
    updateUserPassword(user.id, newPassword);
    res.json({ ok: true });
  });

  // --- Subjects Routes ---

  app.get('/api/subjects', requireAuth, (req: AuthedRequest, res) => {
    res.json({ subjects: listSubjects(req.user!.id) });
  });

  app.post('/api/subjects', requireAuth, (req: AuthedRequest, res) => {
    const { subjectName, subjectCode, color } = req.body ?? {};
    const err = validateSubjectInput({ subjectName, color });
    if (err) {
      res.status(400).json({ error: err });
      return;
    }
    const subject = createSubject(req.user!.id, {
      subjectName,
      subjectCode: typeof subjectCode === 'string' ? subjectCode.slice(0, 20) : '',
      color,
    });
    res.status(201).json({ subject });
  });

  app.patch('/api/subjects/:id', requireAuth, (req: AuthedRequest, res) => {
    const { subjectName, subjectCode, color } = req.body ?? {};
    if (subjectName !== undefined || color !== undefined) {
      const existing = listSubjects(req.user!.id).find((s) => s.id === req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Subject not found.' });
        return;
      }
      const err = validateSubjectInput({
        subjectName: subjectName ?? existing.subjectName,
        color: color ?? existing.color,
      });
      if (err) {
        res.status(400).json({ error: err });
        return;
      }
    }

    const updated = updateSubject(req.user!.id, req.params.id, {
      subjectName: typeof subjectName === 'string' ? subjectName : undefined,
      subjectCode: typeof subjectCode === 'string' ? subjectCode.slice(0, 20) : undefined,
      color: typeof color === 'string' ? color : undefined,
    });
    if (!updated) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }
    res.json({ subject: updated });
  });

  app.delete('/api/subjects/:id', requireAuth, (req: AuthedRequest, res) => {
    const result = deleteSubject(req.user!.id, req.params.id);
    if (!result.deleted) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }
    res.json({ ok: true, unlinkedCount: result.unlinkedCount });
  });

  // --- Assignments Routes ---

  app.get('/api/assignments', requireAuth, (req: AuthedRequest, res) => {
    res.json({ assignments: listAssignments(req.user!.id) });
  });

  app.post('/api/assignments', requireAuth, (req: AuthedRequest, res) => {
    const { title, description, subjectId, dueDate, priority, status, subtasks } = req.body ?? {};
    const err = validateAssignmentInput({
      title,
      dueDate,
      priority: priority ?? 'Medium',
      status: status ?? 'Pending',
    });
    if (err) {
      res.status(400).json({ error: err });
      return;
    }

    const cleanSubtasks: Subtask[] = Array.isArray(subtasks)
      ? subtasks
          .filter((st) => st && typeof st.title === 'string' && st.title.trim())
          .slice(0, 30)
          .map((st) => ({
            id: typeof st.id === 'string' ? st.id : '',
            title: st.title.trim().slice(0, 160),
            completed: Boolean(st.completed),
          }))
      : [];

    const assignment = createAssignment(req.user!.id, {
      subjectId: typeof subjectId === 'string' && subjectId ? subjectId : null,
      title,
      description: typeof description === 'string' ? description.slice(0, 4000) : '',
      dueDate,
      priority: (priority ?? 'Medium') as Priority,
      status: (status ?? 'Pending') as AssignmentStatus,
      subtasks: cleanSubtasks,
    });

    res.status(201).json({ assignment });
  });

  app.patch('/api/assignments/:id', requireAuth, (req: AuthedRequest, res) => {
    const existing = findAssignment(req.user!.id, req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    const { title, description, subjectId, dueDate, priority, status, subtasks } = req.body ?? {};
    const err = validateAssignmentInput({
      title: title ?? existing.title,
      dueDate: dueDate ?? existing.dueDate,
      priority: priority ?? existing.priority,
      status: status ?? existing.status,
    });
    if (err) {
      res.status(400).json({ error: err });
      return;
    }

    let cleanSubtasks: Subtask[] | undefined;
    if (Array.isArray(subtasks)) {
      cleanSubtasks = subtasks
        .filter((st) => st && typeof st.title === 'string' && st.title.trim())
        .slice(0, 30)
        .map((st) => ({
          id: typeof st.id === 'string' ? st.id : '',
          title: st.title.trim().slice(0, 160),
          completed: Boolean(st.completed),
        }));
    }

    const updated = updateAssignment(req.user!.id, req.params.id, {
      subjectId: subjectId !== undefined ? (subjectId || null) : undefined,
      title: typeof title === 'string' ? title : undefined,
      description: typeof description === 'string' ? description.slice(0, 4000) : undefined,
      dueDate: typeof dueDate === 'string' ? dueDate : undefined,
      priority: priority as Priority | undefined,
      status: status as AssignmentStatus | undefined,
      subtasks: cleanSubtasks,
    });

    res.json({ assignment: updated });
  });

  app.delete('/api/assignments/:id', requireAuth, (req: AuthedRequest, res) => {
    const ok = deleteAssignment(req.user!.id, req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }
    res.json({ ok: true });
  });

  // --- Notifications Routes ---

  app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
    const notifications = syncUserNotifications(req.user!.id);
    res.json({ notifications });
  });

  app.patch('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
    const item = markNotificationRead(req.user!.id, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    res.json({ notification: item });
  });

  app.post('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
    const updatedCount = markAllNotificationsRead(req.user!.id);
    res.json({ ok: true, updatedCount });
  });

  // --- AI Assistant Routes ---

  app.get('/api/ai/status', requireAuth, (_req, res) => {
    res.json({ configured: isGeminiConfigured() });
  });

  app.get('/api/ai/conversations', requireAuth, (req: AuthedRequest, res) => {
    res.json({ conversations: listConversations(req.user!.id) });
  });

  app.post('/api/ai/conversations', requireAuth, (req: AuthedRequest, res) => {
    const { title, assignmentId } = req.body ?? {};
    const validAssignmentId =
      typeof assignmentId === 'string' && findAssignment(req.user!.id, assignmentId)
        ? assignmentId
        : null;
    const conv = createConversation(
      req.user!.id,
      typeof title === 'string' && title.trim() ? title.slice(0, 100) : 'New Study Chat',
      validAssignmentId
    );
    res.status(201).json({ conversation: conv });
  });

  app.delete('/api/ai/conversations/:id', requireAuth, (req: AuthedRequest, res) => {
    const ok = deleteConversation(req.user!.id, req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    res.json({ ok: true });
  });

  app.get('/api/ai/conversations/:id/messages', requireAuth, (req: AuthedRequest, res) => {
    const conv = findConversation(req.user!.id, req.params.id);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    res.json({ conversation: conv, messages: listMessages(req.user!.id, conv.id) });
  });

  app.post('/api/ai/chat', requireAuth, aiLimiter, async (req: AuthedRequest, res) => {
    const user = req.user!;
    const { conversationId, message, includeContext, assignmentId, regenerate, model } = req.body ?? {};

    if (!regenerate && (typeof message !== 'string' || !message.trim())) {
      res.status(400).json({ error: 'Please enter a message before sending.' });
      return;
    }
    if (typeof message === 'string' && message.length > 4000) {
      res.status(400).json({ error: 'Message is too long (maximum 4,000 characters).' });
      return;
    }

    const focusedAssignment =
      typeof assignmentId === 'string' && assignmentId
        ? (findAssignment(user.id, assignmentId) ?? null)
        : null;

    let conv =
      typeof conversationId === 'string' && conversationId
        ? findConversation(user.id, conversationId)
        : undefined;

    if (!conv) {
      if (regenerate) {
        res.status(404).json({ error: 'Conversation not found.' });
        return;
      }
      const initialTitle =
        focusedAssignment
          ? `Help: ${focusedAssignment.title.slice(0, 48)}`
          : (message as string).trim().slice(0, 52);
      conv = createConversation(user.id, initialTitle, focusedAssignment?.id ?? null);
    } else if (focusedAssignment && conv.assignmentId !== focusedAssignment.id) {
      updateConversationMeta(user.id, conv.id, { assignmentId: focusedAssignment.id });
    }

    let userMessageEntry = null;
    if (regenerate) {
      deleteLastAssistantMessage(user.id, conv.id);
    } else {
      const existingMsgs = listMessages(user.id, conv.id);
      if (existingMsgs.length === 0 && conv.title === 'New Study Chat') {
        updateConversationMeta(user.id, conv.id, {
          title: (message as string).trim().slice(0, 52),
        });
      }
      userMessageEntry = appendMessage(user.id, conv.id, 'user', (message as string).trim());
    }

    const history = listMessages(user.id, conv.id);
    if (history.length === 0) {
      res.status(400).json({ error: 'No prompt available to generate a response.' });
      return;
    }

    try {
      const reply = await generateAcademicReply({
        student: sanitizeUser(user),
        history,
        includeContext: Boolean(includeContext),
        assignments: listAssignments(user.id),
        subjects: listSubjects(user.id),
        focusedAssignment,
        model: model as SupportedGeminiModel | undefined,
      });

      const assistantEntry = appendMessage(user.id, conv.id, 'assistant', reply.text, reply.model);
      res.json({
        conversation: findConversation(user.id, conv.id),
        userMessage: userMessageEntry,
        assistantMessage: assistantEntry,
        messages: listMessages(user.id, conv.id),
      });
    } catch (err: unknown) {
      const errorObj = err as Error & { status?: number; code?: string };
      res.status(errorObj.status || 502).json({
        error: errorObj.message || 'Failed to get a response from Gemini.',
        code: errorObj.code || 'AI_ERROR',
        conversation: findConversation(user.id, conv.id),
        messages: listMessages(user.id, conv.id),
      });
    }
  });

  // Handle unmatched /api routes with JSON 404
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Frontend serving: Vite dev middleware or production static build
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Frontend build not found. Run npm run build first.');
      }
    });
  }

  // Global Express error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[AssignAI Server Error]', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'An unexpected server error occurred. Please try again.' });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AssignAI server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AssignAI server:', err);
  process.exit(1);
});
