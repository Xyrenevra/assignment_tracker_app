import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Plus,
} from 'lucide-react';
import type { Assignment, Subject } from '../types';
import { getDeadlineLabel, isAssignmentOverdue, toDateKey } from '../utils/academicLogic';

interface CalendarPageProps {
  assignments: Assignment[];
  subjects: Subject[];
  onAddForDate: (dateKey: string) => void;
  onEditAssignment: (assignment: Assignment) => void;
  onToggleComplete: (assignment: Assignment) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage({
  assignments,
  subjects,
  onAddForDate,
  onEditAssignment,
  onToggleComplete,
}: CalendarPageProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const subjectsById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const key = toDateKey(new Date(a.dueDate));
      const existing = map.get(key) ?? [];
      existing.push(a);
      map.set(key, existing);
    }
    return map;
  }, [assignments]);

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDayOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: Array<{ date: Date; dateKey: string; inCurrentMonth: boolean }> = [];
    // Leading days from previous month
    for (let i = startWeekday - 1; i >= 0; i -= 1) {
      const d = new Date(viewYear, viewMonth, -i);
      cells.push({ date: d, dateKey: toDateKey(d), inCurrentMonth: false });
    }
    // Current month days
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(viewYear, viewMonth, day);
      cells.push({ date: d, dateKey: toDateKey(d), inCurrentMonth: true });
    }
    // Trailing days to complete 6 rows (42 cells) or 5 rows (35 cells)
    const targetCells = cells.length > 35 ? 42 : 35;
    let trailing = 1;
    while (cells.length < targetCells) {
      const d = new Date(viewYear, viewMonth + 1, trailing);
      cells.push({ date: d, dateKey: toDateKey(d), inCurrentMonth: false });
      trailing += 1;
    }
    return cells;
  }, [viewYear, viewMonth]);

  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
        new Date(viewYear, viewMonth, 1)
      ),
    [viewYear, viewMonth]
  );

  const selectedDayAssignments = assignmentsByDate.get(selectedDateKey) ?? [];

  const upcomingAndOverdue = useMemo(
    () =>
      assignments
        .filter((a) => a.status !== 'Completed')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 8),
    [assignments]
  );

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDateKey(toDateKey(now));
  };

  const selectedDateReadable = useMemo(() => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(new Date(y, (m || 1) - 1, d || 1));
  }, [selectedDateKey]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Academic Calendar
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Click any date to inspect deadlines or schedule a new assignment directly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            Today
          </button>
          <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <button
              type="button"
              onClick={goPrevMonth}
              aria-label="Previous month"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-semibold text-slate-900 dark:text-white min-w-[140px] text-center whitespace-nowrap">
              {monthTitle}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Next month"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Monthly Grid */}
        <section className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
            {calendarCells.map((cell) => {
              const items = assignmentsByDate.get(cell.dateKey) ?? [];
              const isToday = cell.dateKey === todayKey;
              const isSelected = cell.dateKey === selectedDateKey;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(cell.dateKey)}
                  aria-label={`${cell.dateKey}, ${items.length} assignments`}
                  aria-pressed={isSelected}
                  className={`min-h-[88px] sm:min-h-[104px] p-2 text-left flex flex-col justify-between transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/35 ring-1 ring-inset ring-indigo-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  } ${
                    cell.inCurrentMonth
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-400 dark:text-slate-600 bg-slate-50/40 dark:bg-slate-950/30'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-medium tabular-nums inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday
                          ? 'bg-indigo-600 text-white font-semibold'
                          : ''
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                    {items.length > 0 && (
                      <span className="text-[10px] font-mono tabular-nums text-slate-400">
                        {items.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 space-y-1 w-full">
                    {items.slice(0, 2).map((a) => {
                      const subj = a.subjectId ? subjectsById.get(a.subjectId) : null;
                      const overdue = isAssignmentOverdue(a);
                      const color =
                        a.status === 'Completed'
                          ? '#10B981'
                          : overdue
                            ? '#EF4444'
                            : (subj?.color ?? '#6366F1');
                      return (
                        <div
                          key={a.id}
                          className="flex items-center gap-1.5 text-[11px] truncate"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                          />
                          <span
                            className={`truncate ${
                              a.status === 'Completed'
                                ? 'line-through text-slate-400'
                                : overdue
                                  ? 'text-red-600 dark:text-red-400 font-medium'
                                  : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {a.title}
                          </span>
                        </div>
                      );
                    })}
                    {items.length > 2 && (
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                        +{items.length - 2} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right Panel: Selected Date + Upcoming Deadlines */}
        <div className="lg:col-span-4 space-y-5">
          {/* Selected Date Details */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedDateReadable}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  {selectedDayAssignments.length}{' '}
                  {selectedDayAssignments.length === 1 ? 'assignment' : 'assignments'} due
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAddForDate(selectedDateKey)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add Here</span>
              </button>
            </div>

            {selectedDayAssignments.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                No deadlines scheduled on this date.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                {selectedDayAssignments.map((item) => {
                  const subj = item.subjectId ? subjectsById.get(item.subjectId) : null;
                  const dl = getDeadlineLabel(item.dueDate, item.status);
                  return (
                    <li key={item.id} className="py-3 flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => onToggleComplete(item)}
                        aria-label={`Toggle completion for "${item.title}"`}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600"
                      >
                        {item.status === 'Completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onEditAssignment(item)}
                          className={`text-sm font-medium text-left hover:text-indigo-600 dark:hover:text-indigo-400 block truncate w-full ${
                            item.status === 'Completed'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.title}
                        </button>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {subj ? subj.subjectName : 'General'} · {dl.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Upcoming & Overdue Deadlines List */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Upcoming & Overdue Deadlines
            </h2>
            {upcomingAndOverdue.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                No upcoming or overdue assignments.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingAndOverdue.map((item) => {
                  const dl = getDeadlineLabel(item.dueDate, item.status);
                  const subj = item.subjectId ? subjectsById.get(item.subjectId) : null;
                  return (
                    <li key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(item.dueDate);
                          setViewYear(d.getFullYear());
                          setViewMonth(d.getMonth());
                          setSelectedDateKey(toDateKey(d));
                        }}
                        className="min-w-0 text-left flex-1"
                      >
                        <p className="text-xs font-medium text-slate-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {subj ? subj.subjectName : 'General'}
                        </p>
                      </button>
                      <span
                        className={`text-xs whitespace-nowrap shrink-0 tabular-nums ${
                          dl.tone === 'overdue'
                            ? 'text-red-600 dark:text-red-400 font-semibold'
                            : dl.tone === 'warning'
                              ? 'text-amber-600 dark:text-amber-400 font-medium'
                              : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {dl.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
