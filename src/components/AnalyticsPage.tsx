import { useMemo } from 'react';
import { BarChart3, Plus } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Assignment, Subject } from '../types';
import { computeAnalyticsData } from '../utils/academicLogic';

interface AnalyticsPageProps {
  assignments: Assignment[];
  subjects: Subject[];
  onQuickAdd: () => void;
}

export function AnalyticsPage({ assignments, subjects, onQuickAdd }: AnalyticsPageProps) {
  const analytics = useMemo(
    () => computeAnalyticsData(assignments, subjects),
    [assignments, subjects]
  );

  const { stats, subjectProgress, weeklyActivity, priorityDistribution, completedOnTime, completedLate, onTimeRate } =
    analytics;

  const statusBreakdown = useMemo(() => {
    const activePending = Math.max(0, stats.pending - stats.overdue);
    return [
      { name: 'Completed', value: stats.completed, color: '#10B981' },
      { name: 'Active Pending', value: activePending, color: '#6366F1' },
      { name: 'Overdue', value: stats.overdue, color: '#EF4444' },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const subjectChartData = useMemo(
    () =>
      subjectProgress.map((s) => ({
        name: s.subjectCode || s.subjectName.slice(0, 14),
        fullName: s.subjectName,
        Completed: s.completed,
        Pending: s.pending,
        completionPercentage: s.completionPercentage,
      })),
    [subjectProgress]
  );

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Progress Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track completion trends, subject workload, and on-time delivery performance.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <BarChart3 className="w-9 h-9 text-slate-400 mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            No analytics data available yet
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            All charts on this page are computed directly from your stored assignments. Add your first assignment to unlock live analytics.
          </p>
          <button
            type="button"
            onClick={onQuickAdd}
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Assignment</span>
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Progress Analytics
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Real-time performance metrics derived strictly from your saved coursework.
        </p>
      </div>

      {/* Key Performance Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Overall Completion Rate
          </p>
          <p className="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-1.5">
            {stats.completionRate}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {stats.completed} of {stats.total} submitted
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Completed On Time
          </p>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1.5">
            {completedOnTime}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {onTimeRate}% on-time rate ({completedLate} late)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Overdue Assignments
          </p>
          <p
            className={`text-2xl font-bold tabular-nums mt-1.5 ${
              stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
            }`}
          >
            {stats.overdue}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Excludes completed items
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Active In Progress
          </p>
          <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400 mt-1.5">
            {stats.inProgress}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {stats.pending} total unfinished
          </p>
        </div>
      </section>

      {/* Row 1: Completed vs Pending + Weekly Productivity Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Completed vs Pending Distribution
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
            Proportion of finished, active pending, and overdue assignments
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {statusBreakdown.map((entry) => (
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
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Weekly Productivity Trend
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
            Daily assignments added and completed across the last 7 days
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height={256}>
              <AreaChart data={weeklyActivity} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="Added"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fill="url(#createdGrad)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#completedGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Row 2: Subject-wise Completion + Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Subject-wise Completion
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
            Completed vs remaining assignments per subject
          </p>
          {subjectChartData.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-16 text-center">
              Add subjects to view per-course completion analytics.
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={subjectChartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Completed" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                  <Bar dataKey="Pending" stackId="a" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Priority Distribution
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
            Workload split across High, Medium, and Low priority tasks
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={priorityDistribution} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="priority" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Total Assignments" radius={[6, 6, 0, 0]} maxBarSize={42} isAnimationActive={false}>
                  {priorityDistribution.map((entry) => (
                    <Cell key={entry.priority} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
