import { GoogleGenAI } from '@google/genai';
import type { Assignment, ChatMessage, Subject, UserProfile } from '../src/types';
import { getDeadlineLabel, isAssignmentOverdue } from '../src/utils/academicLogic';

export type SupportedGeminiModel = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.length > 10);
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'GEMINI_API_KEY is not configured on the server. Add your Gemini API key in the Settings > Secrets panel (or your local .env file) to enable real AI responses.'
    ) as Error & { code?: string; status?: number };
    err.code = 'API_KEY_MISSING';
    err.status = 503;
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemInstruction(params: {
  student: UserProfile;
  includeContext: boolean;
  assignments: Assignment[];
  subjects: Subject[];
  focusedAssignment: Assignment | null;
}): string {
  const { student, includeContext, assignments, subjects, focusedAssignment } = params;
  const subjectsMap = new Map(subjects.map((s) => [s.id, s]));
  const now = new Date();

  const lines: string[] = [
    `You are AssignAI, a practical, knowledgeable university academic mentor and study planner assisting ${student.name}.`,
    `Current date and time: ${now.toDateString()}.`,
    'Your core capabilities:',
    '1. Assignment Explanation: Clarify complicated assignment prompts in plain, structured language.',
    '2. Task Breakdown: Divide complex assignments into concrete, time-estimated actionable subtasks.',
    '3. Academic Assistance: Explain CS, math, engineering, and university concepts clearly with worked examples and clean fenced code blocks.',
    '4. Study Plan Generation: Build realistic day-by-day study schedules prioritized by overdue status, deadline urgency, and priority level.',
    '5. Academic Integrity: Guide students to understand concepts and structure their work rather than encouraging plagiarism.',
    'Formatting: Use concise, well-organized Markdown with clear headings, bullet lists, tables when planning schedules, and fenced code blocks with language tags for code.',
  ];

  if (student.major || student.semester) {
    lines.push(
      `Student profile: ${[student.major, student.semester, student.university].filter(Boolean).join(' · ')}.`
    );
  }

  if (focusedAssignment) {
    const subj = focusedAssignment.subjectId ? subjectsMap.get(focusedAssignment.subjectId) : null;
    const deadlineLabel = getDeadlineLabel(focusedAssignment.dueDate, focusedAssignment.status, now).text;
    lines.push(
      '\n--- FOCUSED ASSIGNMENT SELECTED BY STUDENT ---',
      `Title: ${focusedAssignment.title}`,
      `Subject: ${subj ? `${subj.subjectName} (${subj.subjectCode})` : 'Unassigned'}`,
      `Status: ${focusedAssignment.status} | Priority: ${focusedAssignment.priority} | Deadline: ${focusedAssignment.dueDate} (${deadlineLabel})`,
      `Description: ${focusedAssignment.description || 'No description provided.'}`,
      focusedAssignment.subtasks.length > 0
        ? `Subtasks:\n${focusedAssignment.subtasks
            .map((st) => `- [${st.completed ? 'x' : ' '}] ${st.title}`)
            .join('\n')}`
        : 'Subtasks: None yet.'
    );
  }

  if (includeContext) {
    lines.push('\n--- STUDENT ASSIGNMENT OVERVIEW (SHARED WITH PERMISSION) ---');
    if (assignments.length === 0) {
      lines.push('The student currently has no saved assignments.');
    } else {
      const sorted = [...assignments].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      for (const a of sorted.slice(0, 25)) {
        const subj = a.subjectId ? subjectsMap.get(a.subjectId) : null;
        const overdue = isAssignmentOverdue(a, now);
        const label = getDeadlineLabel(a.dueDate, a.status, now).text;
        const completedSubtasks = a.subtasks.filter((st) => st.completed).length;
        const subtaskSummary =
          a.subtasks.length > 0 ? ` | Subtasks ${completedSubtasks}/${a.subtasks.length}` : '';
        lines.push(
          `- "${a.title}" [${subj ? subj.subjectName : 'General'}] | Priority: ${a.priority} | Status: ${a.status}${overdue ? ' (OVERDUE)' : ''} | ${label} (${a.dueDate.slice(0, 10)})${subtaskSummary}${a.description ? ` — ${a.description.slice(0, 180)}` : ''}`
        );
      }
    }
  } else {
    lines.push(
      '\nNote: The student chose not to share their full assignment list for this message. Do not invent or assume assignments they have not mentioned.'
    );
  }

  return lines.join('\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateAcademicReply(params: {
  student: UserProfile;
  history: ChatMessage[];
  includeContext: boolean;
  assignments: Assignment[];
  subjects: Subject[];
  focusedAssignment: Assignment | null;
  model?: SupportedGeminiModel;
}): Promise<{ text: string; model: SupportedGeminiModel }> {
  const ai = getGeminiClient();
  const chosenModel: SupportedGeminiModel =
    params.model === 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

  const systemInstruction = buildSystemInstruction({
    student: params.student,
    includeContext: params.includeContext,
    assignments: params.assignments,
    subjects: params.subjects,
    focusedAssignment: params.focusedAssignment,
  });

  // Build multi-turn Gemini conversation contents
  const recentHistory = params.history.slice(-24);
  const contents = recentHistory.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.message }],
  }));

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: chosenModel,
        contents,
        config: {
          systemInstruction,
        },
      });
      const text = response.text?.trim();
      if (!text) {
        throw new Error('The AI model returned an empty response. Please try rephrasing your question.');
      }
      return { text, model: chosenModel };
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('DEADLINE_EXCEEDED') ||
        msg.includes('fetch failed');
      if (isRetryable && attempt < 2) {
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }
      break;
    }
  }

  const rawMsg = lastError instanceof Error ? lastError.message : 'Unexpected Gemini API error.';
  const mappedError = new Error(mapGeminiErrorMessage(rawMsg)) as Error & { status?: number; code?: string };
  if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('PERMISSION_DENIED') || rawMsg.includes('403')) {
    mappedError.status = 403;
    mappedError.code = 'API_KEY_INVALID';
  } else if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429')) {
    mappedError.status = 429;
    mappedError.code = 'RATE_LIMITED';
  } else {
    mappedError.status = 502;
    mappedError.code = 'GEMINI_UPSTREAM_ERROR';
  }
  throw mappedError;
}

function mapGeminiErrorMessage(rawMsg: string): string {
  if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('PERMISSION_DENIED') || rawMsg.includes('403')) {
    return 'Your Gemini API key appears invalid or lacks permission. Please verify GEMINI_API_KEY in Settings > Secrets.';
  }
  if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429')) {
    return 'Gemini API rate limit reached. Wait a few seconds and try again, or switch to Fast mode.';
  }
  return `Unable to reach the Gemini AI service right now (${rawMsg.slice(0, 140)}). Please try again shortly.`;
}
