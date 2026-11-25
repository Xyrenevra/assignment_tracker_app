import { useMemo } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Assignment, NavSection, Subject } from '../types';
import {
  computeAnalyticsData,
  getDeadlineLabel,
  isAssignmentOverdue,
} from '../utils/academicLogic';

interface OverviewPageProps {
  assignments: Assignment[];
  subjects: Subject[];
  onNavigate: (section: NavSection) => void;
  onQuickAdd: () => void;
  onToggleComplete: (assignment: Assignment) => void;
  onAskAiAboutAssignment: (assignment: Assignment) => void;
  onEditAssignment: (assignment: Assignment) => void;
}

export function OverviewPage({
  assignments,
  subjects,
  onNavigate,
  onQuickAdd,
  onToggleComplete,
  onAskAiAboutAssignment,
  onEditAssignment,
}: OverviewPageProps) {
  const analytics = useMemo(() => computeAnalyticsData(assignments, subjects), [assignments, subjects]);
  const subjectsById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const { stats, subjectProgress, weeklyActivity } = analytics;

  const pieData = useMemo(() => {
    const activePending = Math.max(0, stats.pending - stats.overdue);
    return [
      { name: 'Completed', value: stats.completed, color: '#10B981' },
      { name: 'Active Pending', value: activePending, color: '#6366F1' },
      { name: 'Overdue', value: stats.overdue, color: '#EF4444' },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const upcomingTimeline = useMemo(
    () =>
      assignments
        .filter((a) => a.status !== 'Completed')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 6),
    [assignments]
  );

  const highPriorityItems = useMemo(
    () =>
      assignments
        .filter((a) => a.status !== 'Completed' && a.priority === 'High')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 4),
    [assignments]
  );

  const recentlyAdded = useMemo(
    () =>
      [...assignments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4),
    [assignments]
  );

  const statItems = [
    { label: 'Total Assignments', value: stats.total, tone: 'text-slate-900 dark:text-white' },
    { label: 'Completed', value: stats.completed, tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Pending', value: stats.pending, tone: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Overdue', value: stats.overdue, tone: stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white' },
    { label: 'Due Today', value: stats.dueToday, tone: stats.dueToday > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white' },
    { label: 'Completion Rate', value: `${stats.completionRate}%`, tone: 'text-violet-600 dark:text-violet-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Academic Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Live snapshot of your deadlines, subject completion, and weekly momentum.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('ai-assistant')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Ask AI Assistant</span>
          </button>
          <button
            type="button"
            onClick={onQuickAdd}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Quick Add</span>
          </button>
        </div>
      </div>

      {/* 6 KPI Summary Strip */}
      <section
        aria-label="Assignment statistics"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        {statItems.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-1.5 ${stat.tone}`}>{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Completion Breakdown Chart */}
        <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Completion Breakdown
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Overall status across all saved assignments
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
            >
              Full analytics
            </button>
          </div>

          {stats.total === 0 ? (
            <div className="flex-1 min-h-[210px] flex flex-col items-center justify-center text-center py-8">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No assignments tracked yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Add your first assignment to see real-time completion progress here.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-5 min-h-[210px]">
              <div className="w-[184px] h-[184px] shrink-0 flex items-center justify-center">
                <PieChart width={184} height={184}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </div>
              <div className="flex-1 w-full space-y-3">
                <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {stats.completionRate}%
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {stats.completed} of {stats.total} completed
                  </p>
                </div>
                <ul className="space-y-2 text-xs">
                  <li className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Completed</span>
                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {stats.completed}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Active Pending</span>
                    <span className="font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                      {Math.max(0, stats.pending - stats.overdue)}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Overdue</span>
                    <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                      {stats.overdue}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* Weekly Academic Activity */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Weekly Academic Activity
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Assignments added vs completed over the past 7 days
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Added</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Completed</span>
            </div>
          </div>

          <div className="flex-1 min-h-[210px] w-full">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={weeklyActivity} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="created" name="Added" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Upcoming Deadlines + Subject Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upcoming Deadline Timeline */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Upcoming Deadline Timeline
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Next unfinished submissions sorted by urgency
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
            >
              Open calendar
            </button>
          </div>

          {upcomingTimeline.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                All caught up
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                No pending assignments on your horizon right now.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcomingTimeline.map((item) => {
                const subj = item.subjectId ? subjectsById.get(item.subjectId) : null;
                const dl = getDeadlineLabel(item.dueDate, item.status);
                const overdue = isAssignmentOverdue(item);
                const labelTone =
                  dl.tone === 'overdue'
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : dl.tone === 'warning'
                      ? 'text-amber-600 dark:text-amber-400 font-medium'
                      : 'text-slate-500 dark:text-slate-400';

                return (
                  <li key={item.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleComplete(item)}
                        aria-label={`Mark "${item.title}" as completed`}
                        className="mt-0.5 text-slate-300 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0"
                      >
                        <CheckCircle2 className="w-[18px] h-[18px]" />
                      </button>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onEditAssignment(item)}
                          className="text-sm font-medium text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left truncate block max-w-full"
                        >
                          {item.title}
                        </button>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{subj ? subj.subjectName : 'General'}</span>
                          <span aria-hidden="true">·</span>
                          <span className={labelTone}>{dl.text}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              item.priority === 'High'
                                ? 'text-red-600 dark:text-red-400 font-medium'
                                : ''
                            }
                          >
                            {item.priority} priority
                          </span>
                          {overdue && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-red-600 dark:text-red-400">Action needed</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onAskAiAboutAssignment(item)}
                      aria-label={`Ask AI about "${item.title}"`}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Ask AI
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Subject-wise Progress Bars */}
        <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Subject-wise Progress
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Completion percentage across your courses
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('subjects')}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
            >
              Manage subjects
            </button>
          </div>

          {subjectProgress.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No subjects created
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Create your semester courses to organize coursework cleanly.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {subjectProgress.map((sp) => (
                <li key={sp.subjectId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                      {sp.subjectName}
                      {sp.subjectCode ? (
                        <span className="text-slate-400 dark:text-slate-500 font-mono ml-1.5">
                          {sp.subjectCode}
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {sp.completed}/{sp.total} · {sp.completionPercentage}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${sp.completionPercentage}%`,
                        backgroundColor: sp.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Bottom Row: High Priority, Recently Added, and AI Shortcut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* High-Priority Assignments */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              High-Priority Focus
            </h2>
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {highPriorityItems.length} open
            </span>
          </div>
          {highPriorityItems.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6">
              No open high-priority assignments right now.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {highPriorityItems.map((item) => {
                const dl = getDeadlineLabel(item.dueDate, item.status);
                return (
                  <li key={item.id} className="py-2.5">
                    <button
                      type="button"
                      onClick={() => onEditAssignment(item)}
                      className="text-sm font-medium text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left block truncate w-full"
                    >
                      {item.title}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span
                        className={
                          dl.tone === 'overdue'
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : ''
                        }
                      >
                        {dl.text}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recently Added */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recently Added
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('assignments')}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View all
            </button>
          </div>
          {recentlyAdded.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6">
              Assignments you create will show up here.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentlyAdded.map((item) => {
                const subj = item.subjectId ? subjectsById.get(item.subjectId) : null;
                return (
                  <li key={item.id} className="py-2.5">
                    <button
                      type="button"
                      onClick={() => onEditAssignment(item)}
                      className="text-sm font-medium text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left block truncate w-full"
                    >
                      {item.title}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {subj ? subj.subjectName : 'General'} · {item.status}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* AI Assistant Shortcut */}
        <section className="rounded-2xl border border-indigo-200/80 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/25 p-5 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-3">
              <Bot className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              AI Study & Assignment Planner
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              Get a personalized weekly study schedule based on your real deadlines, break complex coursework into subtasks, or ask academic concept questions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('ai-assistant')}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            <span>Open AI Assistant</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </section>
      </div>
    </div>
  );
}
