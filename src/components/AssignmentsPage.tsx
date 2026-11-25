import { useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Circle,
  Columns3,
  Edit3,
  LayoutGrid,
  Plus,
  Search,
  Table2,
  Trash2,
} from 'lucide-react';
import type { Assignment, AssignmentStatus, Priority, Subject } from '../types';
import {
  filterAndSortAssignments,
  getDeadlineLabel,
  isAssignmentOverdue,
  type AssignmentFilterOptions,
} from '../utils/academicLogic';
import { ConfirmDialog } from './ui/Modal';

interface AssignmentsPageProps {
  assignments: Assignment[];
  subjects: Subject[];
  initialSearch?: string;
  onCreateNew: () => void;
  onEdit: (assignment: Assignment) => void;
  onDelete: (assignmentId: string) => Promise<void>;
  onUpdateStatus: (assignment: Assignment, nextStatus: AssignmentStatus) => Promise<void>;
  onToggleSubtask: (assignment: Assignment, subtaskId: string) => Promise<void>;
  onAskAi: (assignment: Assignment) => void;
}

type ViewMode = 'table' | 'card' | 'kanban';

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function AssignmentsPage({
  assignments,
  subjects,
  initialSearch = '',
  onCreateNew,
  onEdit,
  onDelete,
  onUpdateStatus,
  onToggleSubtask,
  onAskAi,
}: AssignmentsPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState(initialSearch);
  const [subjectId, setSubjectId] = useState<string>('all');
  const [priority, setPriority] = useState<'all' | Priority>('all');
  const [status, setStatus] = useState<'all' | AssignmentStatus | 'Overdue'>('all');
  const [sortBy, setSortBy] = useState<AssignmentFilterOptions['sortBy']>('dueDateAsc');
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const subjectsById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const filtered = useMemo(
    () =>
      filterAndSortAssignments(
        assignments,
        { search, subjectId, priority, status, sortBy },
        subjectsById
      ),
    [assignments, search, subjectId, priority, status, sortBy, subjectsById]
  );

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSubjectId('all');
    setPriority('all');
    setStatus('all');
    setSortBy('dueDateAsc');
  };

  const hasActiveFilters =
    Boolean(search.trim()) || subjectId !== 'all' || priority !== 'all' || status !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Assignments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            Showing {filtered.length} of {assignments.length} assignments
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Segmented Switch */}
          <div
            role="group"
            aria-label="Assignment view mode"
            className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70"
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              aria-pressed={viewMode === 'card'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                viewMode === 'card'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              aria-pressed={viewMode === 'kanban'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>New Assignment</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <section
        aria-label="Filter and sort assignments"
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3"
      >
        <div className="relative lg:col-span-4">
          <label htmlFor="assignments-search" className="sr-only">
            Search assignments
          </label>
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="assignments-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title, topic, or subject..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="filter-subject" className="sr-only">
            Filter by subject
          </label>
          <select
            id="filter-subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            <option value="all">All Subjects</option>
            <option value="unassigned">Unassigned</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.subjectName}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="filter-priority" className="sr-only">
            Filter by priority
          </label>
          <select
            id="filter-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'all' | Priority)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            <option value="all">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="filter-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="filter-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | AssignmentStatus | 'Overdue')}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue Only</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="sort-assignments" className="sr-only">
            Sort assignments
          </label>
          <select
            id="sort-assignments"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as AssignmentFilterOptions['sortBy'])}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            <option value="dueDateAsc">Deadline: Soonest</option>
            <option value="dueDateDesc">Deadline: Latest</option>
            <option value="priority">Priority: High first</option>
            <option value="recent">Recently Added</option>
          </select>
        </div>
      </section>

      {/* Empty States */}
      {filtered.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {assignments.length === 0 ? 'No assignments yet' : 'No matching assignments'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {assignments.length === 0
              ? 'Create your first assignment to start tracking deadlines, subtasks, and academic progress.'
              : 'Try adjusting your search query or clearing one of the active filters.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assignment</span>
            </button>
          </div>
        </section>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 pl-4 pr-2 w-10">
                    <span className="sr-only">Complete</span>
                  </th>
                  <th className="py-3 px-3">Assignment</th>
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Deadline</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filtered.map((item) => {
                  const subj = item.subjectId ? subjectsById.get(item.subjectId) : null;
                  const dl = getDeadlineLabel(item.dueDate, item.status);
                  const overdue = isAssignmentOverdue(item);
                  const completedSubtasks = item.subtasks.filter((s) => s.completed).length;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 pl-4 pr-2 align-top">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStatus(
                              item,
                              item.status === 'Completed' ? 'Pending' : 'Completed'
                            )
                          }
                          aria-label={
                            item.status === 'Completed'
                              ? `Mark "${item.title}" as pending`
                              : `Mark "${item.title}" as completed`
                          }
                          className="mt-0.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        >
                          {item.status === 'Completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-3 align-top max-w-sm">
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className={`font-medium text-left hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                            item.status === 'Completed'
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.title}
                        </button>
                        {item.subtasks.length > 0 && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                            Checklist {completedSubtasks}/{item.subtasks.length} done
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-top whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                        {subj ? (
                          <span>
                            {subj.subjectName}
                            {subj.subjectCode ? (
                              <span className="text-slate-400 font-mono ml-1">
                                {subj.subjectCode}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        <p className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {formatShortDate(item.dueDate)}
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${
                            dl.tone === 'overdue'
                              ? 'text-red-600 dark:text-red-400 font-semibold'
                              : dl.tone === 'warning'
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : dl.tone === 'completed'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {dl.text}
                        </p>
                      </td>

                      <td className="py-3.5 px-3 align-top whitespace-nowrap text-xs font-medium">
                        <span
                          className={
                            item.priority === 'High'
                              ? 'text-red-600 dark:text-red-400'
                              : item.priority === 'Medium'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                          }
                        >
                          {item.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 align-top whitespace-nowrap text-xs">
                        <span
                          className={
                            item.status === 'Completed'
                              ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                              : overdue
                                ? 'text-red-600 dark:text-red-400 font-semibold'
                                : item.status === 'In Progress'
                                  ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                                  : 'text-slate-600 dark:text-slate-300'
                          }
                        >
                          {overdue ? `${item.status} · Overdue` : item.status}
                        </span>
                      </td>

                      <td className="py-3.5 pl-3 pr-4 align-top whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onAskAi(item)}
                            aria-label={`Ask AI about "${item.title}"`}
                            title="Ask AI Assistant"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                          >
                            <Bot className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            aria-label={`Edit "${item.title}"`}
                            title="Edit assignment"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            aria-label={`Delete "${item.title}"`}
                            title="Delete assignment"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : viewMode === 'card' ? (
        /* CARD VIEW */
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const subj = item.subjectId ? subjectsById.get(item.subjectId) : null;
            const dl = getDeadlineLabel(item.dueDate, item.status);
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-sm font-semibold leading-snug ${
                        item.status === 'Completed'
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateStatus(
                          item,
                          item.status === 'Completed' ? 'Pending' : 'Completed'
                        )
                      }
                      aria-label={
                        item.status === 'Completed'
                          ? `Mark "${item.title}" pending`
                          : `Mark "${item.title}" completed`
                      }
                      className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 shrink-0"
                    >
                      {item.status === 'Completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>{subj ? subj.subjectName : 'Unassigned'}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        item.priority === 'High'
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : item.priority === 'Medium'
                            ? 'text-amber-600 dark:text-amber-400 font-medium'
                            : 'text-emerald-600 dark:text-emerald-400 font-medium'
                      }
                    >
                      {item.priority}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        dl.tone === 'overdue'
                          ? 'text-red-600 dark:text-red-400 font-semibold'
                          : dl.tone === 'warning'
                            ? 'text-amber-600 dark:text-amber-400 font-medium'
                            : ''
                      }
                    >
                      {dl.text}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {item.subtasks.length > 0 && (
                    <ul className="pt-1 space-y-1.5">
                      {item.subtasks.map((st) => (
                        <li key={st.id} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={st.completed}
                            onChange={() => onToggleSubtask(item, st.id)}
                            aria-label={`Toggle subtask "${st.title}"`}
                            className="rounded border-slate-300 text-indigo-600"
                          />
                          <span
                            className={
                              st.completed
                                ? 'line-through text-slate-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }
                          >
                            {st.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {formatShortDate(item.dueDate)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onAskAi(item)}
                      className="px-2 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-medium"
                    >
                      Ask AI
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      aria-label={`Edit "${item.title}"`}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      aria-label={`Delete "${item.title}"`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        /* KANBAN BOARD VIEW */
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {(['Pending', 'In Progress', 'Completed'] as AssignmentStatus[]).map((colStatus) => {
            const colItems = filtered.filter((a) => a.status === colStatus);
            return (
              <div
                key={colStatus}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between pb-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {colStatus}
                  </h2>
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {colItems.length}
                  </span>
                </div>

                {colItems.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 py-8 text-center">
                    No assignments in {colStatus}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {colItems.map((item) => {
                      const subj = item.subjectId ? subjectsById.get(item.subjectId) : null;
                      const dl = getDeadlineLabel(item.dueDate, item.status);
                      return (
                        <article
                          key={item.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onEdit(item)}
                              className="text-sm font-medium text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left leading-snug"
                            >
                              {item.title}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              aria-label={`Delete "${item.title}"`}
                              className="text-slate-400 hover:text-red-600 p-0.5 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {subj ? subj.subjectName : 'Unassigned'} · {item.priority} ·{' '}
                            <span
                              className={
                                dl.tone === 'overdue'
                                  ? 'text-red-600 dark:text-red-400 font-semibold'
                                  : dl.tone === 'warning'
                                    ? 'text-amber-600 dark:text-amber-400 font-medium'
                                    : ''
                              }
                            >
                              {dl.text}
                            </span>
                          </p>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(['Pending', 'In Progress', 'Completed'] as AssignmentStatus[])
                                .filter((s) => s !== colStatus)
                                .map((targetStatus) => (
                                  <button
                                    key={targetStatus}
                                    type="button"
                                    onClick={() => onUpdateStatus(item, targetStatus)}
                                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                                  >
                                    Move to {targetStatus}
                                  </button>
                                ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => onAskAi(item)}
                              aria-label={`Ask AI about "${item.title}"`}
                              className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                            >
                              <Bot className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Assignment"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete "${deleteTarget.title}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Assignment"
        loading={deleting}
      />
    </div>
  );
}
