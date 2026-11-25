import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Trash2,
  User,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Assignment, ChatConversation, ChatMessage, Subject, UserProfile } from '../types';
import { MarkdownRenderer } from './ui/MarkdownRenderer';

interface AIAssistantPageProps {
  user: UserProfile;
  assignments: Assignment[];
  subjects: Subject[];
  preselectedAssignmentId: string | null;
  onClearPreselectedAssignment: () => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

const SUGGESTED_PROMPTS = [
  'What assignments should I complete first?',
  'Create a study plan for this week.',
  'Explain my Python assignment.',
  'Break this assignment into smaller steps.',
  'Help me complete my pending assignments.',
  'Explain NumPy broadcasting with examples.',
];

export function AIAssistantPage({
  user,
  assignments,
  subjects,
  preselectedAssignmentId,
  onClearPreselectedAssignment,
  onNotify,
}: AIAssistantPageProps) {
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [includeContext, setIncludeContext] = useState(user.preferences.shareAiContextByDefault);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    preselectedAssignmentId ?? ''
  );
  const [modelMode, setModelMode] = useState<'gemini-4-hydrogen' | 'gemini-3.1-flash-lite'>(
    'gemini-4-hydrogen'
  );
  const [chatError, setChatError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const subjectsById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      setLoadingConv(true);
      try {
        const [statusRes, convRes] = await Promise.all([
          api.getAiStatus(),
          api.listConversations(),
        ]);
        if (!mounted) return;
        setAiConfigured(statusRes.configured);
        setConversations(convRes.conversations);
        if (convRes.conversations.length > 0 && !preselectedAssignmentId) {
          const first = convRes.conversations[0];
          setActiveConvId(first.id);
          const msgRes = await api.getConversationMessages(first.id);
          if (mounted) {
            setMessages(msgRes.messages);
            if (first.assignmentId) setSelectedAssignmentId(first.assignmentId);
          }
        }
      } catch (err) {
        if (mounted) {
          setChatError(err instanceof ApiError ? err.message : 'Unable to load chat history.');
        }
      } finally {
        if (mounted) setLoadingConv(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [preselectedAssignmentId]);

  useEffect(() => {
    if (preselectedAssignmentId) {
      setSelectedAssignmentId(preselectedAssignmentId);
      setActiveConvId(null);
      setMessages([]);
      setChatError(null);
      const target = assignments.find((a) => a.id === preselectedAssignmentId);
      if (target) {
        setInput(`Help me understand and break down "${target.title}" into actionable steps.`);
      }
      onClearPreselectedAssignment();
    }
  }, [preselectedAssignmentId, assignments, onClearPreselectedAssignment]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSelectConversation = async (conv: ChatConversation) => {
    setActiveConvId(conv.id);
    setChatError(null);
    setSelectedAssignmentId(conv.assignmentId ?? '');
    try {
      const res = await api.getConversationMessages(conv.id);
      setMessages(res.messages);
    } catch (err) {
      setChatError(err instanceof ApiError ? err.message : 'Unable to load conversation.');
    }
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setChatError(null);
    setInput('');
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
      onNotify('info', 'Conversation deleted.');
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Unable to delete conversation.');
    }
  };

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    setChatError(null);
    setSending(true);
    setInput('');

    // Optimistically display the user's message immediately
    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      userId: user.id,
      conversationId: activeConvId ?? 'pending',
      role: 'user',
      message: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.sendAiMessage({
        conversationId: activeConvId,
        message: trimmed,
        includeContext,
        assignmentId: selectedAssignmentId || null,
        model: modelMode,
      });

      setActiveConvId(res.conversation.id);
      setMessages(res.messages);
      setConversations((prev) => {
        const without = prev.filter((c) => c.id !== res.conversation.id);
        return [res.conversation, ...without];
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setChatError(err.message);
        const payload = err.data as { conversation?: ChatConversation; messages?: ChatMessage[] } | undefined;
        if (payload?.conversation && Array.isArray(payload.messages)) {
          setActiveConvId(payload.conversation.id);
          setMessages(payload.messages);
          setConversations((prev) => {
            const without = prev.filter((c) => c.id !== payload.conversation!.id);
            return [payload.conversation!, ...without];
          });
        }
      } else {
        setChatError('Unable to reach the AI assistant. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleRegenerate = async () => {
    if (!activeConvId || sending || messages.length === 0) return;
    setChatError(null);
    setSending(true);
    try {
      const res = await api.sendAiMessage({
        conversationId: activeConvId,
        includeContext,
        assignmentId: selectedAssignmentId || null,
        regenerate: true,
        model: modelMode,
      });
      setMessages(res.messages);
    } catch (err) {
      setChatError(
        err instanceof ApiError ? err.message : 'Unable to regenerate response right now.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.message);
      setCopiedId(msg.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      onNotify('error', 'Clipboard copy was blocked by browser permissions.');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const focusedAssignment = useMemo(
    () => assignments.find((a) => a.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            AI Assignment Assistant
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Powered by Gemini for assignment explanations, task breakdowns, concept tutoring, and study plans.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Gemini response speed"
            className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-xs"
          >
            <button
              type="button"
              onClick={() => setModelMode('gemini-4-hydrogen')}
              aria-pressed={modelMode === 'gemini-4-hydrogen'}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                modelMode === 'gemini-4-hydrogen'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Balanced
            </button>
            <button
              type="button"
              onClick={() => setModelMode('gemini-3.1-flash-lite')}
              aria-pressed={modelMode === 'gemini-3.1-flash-lite'}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                modelMode === 'gemini-3.1-flash-lite'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Fast
            </button>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
          >
            <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {aiConfigured === false && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3 text-sm text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold">Gemini API key is not configured on the server</p>
            <p className="text-xs mt-0.5 text-amber-800 dark:text-amber-300/90 leading-relaxed">
              Configure <code className="font-mono">GEMINI_API_KEY</code> in the AI Studio Secrets panel or your server <code className="font-mono">.env</code> file and restart the server to receive real Gemini AI responses. AssignAI never generates fake or hardcoded replies.
            </p>
          </div>
        </div>
      )}

      {/* Main Split Chat Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
        {/* Conversation History Sidebar */}
        <aside className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden max-h-[680px]">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Conversation History
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {conversations.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingConv ? (
              <p className="text-xs text-slate-400 px-3 py-4">Loading history...</p>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 px-3 py-6 text-center leading-relaxed">
                Your saved study conversations will appear here.
              </p>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                return (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-1 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conv)}
                      className="flex-1 min-w-0 px-3 py-2.5 text-left"
                    >
                      <p className="text-xs font-medium truncate">{conv.title}</p>
                      <p className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                        {new Date(conv.updatedAt).toLocaleDateString()}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteConversation(conv.id)}
                      aria-label={`Delete conversation "${conv.title}"`}
                      className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 opacity-70 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Active Chat Thread */}
        <section className="lg:col-span-9 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden h-[680px]">
          {/* Context Controls Bar */}
          <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeContext}
                  onChange={(e) => setIncludeContext(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Share assignment deadlines & priorities</span>
              </label>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <label
                htmlFor="ai-focus-assignment"
                className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap"
              >
                Focus assignment:
              </label>
              <select
                id="ai-focus-assignment"
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="max-w-[240px] px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white truncate"
              >
                <option value="">All assignments (General)</option>
                {assignments.map((a) => {
                  const subj = a.subjectId ? subjectsById.get(a.subjectId) : null;
                  return (
                    <option key={a.id} value={a.id}>
                      {a.title}
                      {subj ? ` (${subj.subjectCode || subj.subjectName})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Scrollable Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center max-w-2xl mx-auto py-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4">
                  <Bot className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  How can I help with your coursework today?
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {focusedAssignment
                    ? `Focused on "${focusedAssignment.title}". Ask me to explain requirements, break it into steps, or draft a study schedule.`
                    : 'Ask a concept question, pick a specific assignment above, or choose one of the suggested prompts below.'}
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      disabled={sending}
                      className="text-left px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const isLastAssistant = !isUser && idx === messages.length - 1;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" aria-hidden="true" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          isUser
                            ? 'bg-indigo-600 text-white text-sm leading-relaxed'
                            : 'border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex-1'
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        ) : (
                          <>
                            <MarkdownRenderer content={msg.message} />
                            <div className="mt-3 pt-2 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                              <span className="font-mono">
                                {msg.model || 'gemini-4-hydrogen'} ·{' '}
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(msg)}
                                  className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                  {copiedId === msg.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                  <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                                </button>

                                {isLastAssistant && (
                                  <button
                                    type="button"
                                    onClick={handleRegenerate}
                                    disabled={sending}
                                    className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Regenerate</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {sending && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      Thinking with Gemini...
                    </div>
                  </div>
                )}
              </>
            )}

            {chatError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{chatError}</span>
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <div className="flex items-end gap-2.5">
              <label htmlFor="ai-chat-input" className="sr-only">
                Message AssignAI assistant
              </label>
              <textarea
                id="ai-chat-input"
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask about an assignment, request a study schedule, or paste a tricky problem..."
                className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send message"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
