import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAnalyticsData,
  computeDashboardStats,
  computeSubjectProgress,
  filterAndSortAssignments,
  generateDeadlineNotifications,
  getDeadlineLabel,
  isAssignmentOverdue,
  validateAssignmentInput,
  validateEmail,
  validatePassword,
  validateSubjectInput,
} from './academicLogic';
import type { Assignment, Subject } from '../types';

const NOW = new Date('2026-11-24T12:00:00.000Z');

function makeAssignment(overrides: Partial<Assignment>): Assignment {
  return {
    id: 'a-1',
    userId: 'u-1',
    subjectId: 's-1',
    title: 'Sample Assignment',
    description: 'Detailed instructions',
    dueDate: '2026-11-26T23:59:00.000Z',
    priority: 'Medium',
    status: 'Pending',
    subtasks: [],
    completedAt: null,
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    ...overrides,
  };
}

const SUBJECTS: Subject[] = [
  {
    id: 's-1',
    userId: 'u-1',
    subjectName: 'Advanced Python',
    subjectCode: 'CS301',
    color: '#6366F1',
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 's-2',
    userId: 'u-1',
    subjectName: 'Operating Systems',
    subjectCode: 'CS304',
    color: '#10B981',
    createdAt: '2026-11-01T00:00:00.000Z',
  },
];

test('completed assignments are never classified as overdue', () => {
  const pastCompleted = makeAssignment({
    dueDate: '2026-11-10T12:00:00.000Z',
    status: 'Completed',
  });
  assert.equal(isAssignmentOverdue(pastCompleted, NOW), false);

  const pastPending = makeAssignment({
    dueDate: '2026-11-22T12:00:00.000Z',
    status: 'Pending',
  });
  assert.equal(isAssignmentOverdue(pastPending, NOW), true);

  const futurePending = makeAssignment({
    dueDate: '2026-11-27T12:00:00.000Z',
    status: 'In Progress',
  });
  assert.equal(isAssignmentOverdue(futurePending, NOW), false);
});

test('dynamic deadline labels accurately describe today, tomorrow, future, and overdue', () => {
  const todayDue = getDeadlineLabel('2026-11-24T22:00:00.000Z', 'Pending', NOW);
  assert.equal(todayDue.text, 'Due today');
  assert.equal(todayDue.tone, 'warning');

  const tomorrowDue = getDeadlineLabel('2026-11-25T18:00:00.000Z', 'Pending', NOW);
  assert.equal(tomorrowDue.text, 'Due tomorrow');

  const threeDays = getDeadlineLabel('2026-11-27T18:00:00.000Z', 'In Progress', NOW);
  assert.equal(threeDays.text, 'Due in 3 days');

  const overdueTwo = getDeadlineLabel('2026-11-22T18:00:00.000Z', 'Pending', NOW);
  assert.equal(overdueTwo.text, 'Overdue by 2 days');
  assert.equal(overdueTwo.tone, 'overdue');

  const completedPast = getDeadlineLabel('2026-11-20T18:00:00.000Z', 'Completed', NOW);
  assert.equal(completedPast.text, 'Completed');
  assert.equal(completedPast.tone, 'completed');
});

test('dashboard statistics update accurately and never count completed items as overdue', () => {
  const list: Assignment[] = [
    makeAssignment({ id: '1', status: 'Completed', dueDate: '2026-11-20T12:00:00.000Z', completedAt: '2026-11-19T12:00:00.000Z' }),
    makeAssignment({ id: '2', status: 'Pending', dueDate: '2026-11-22T12:00:00.000Z' }),
    makeAssignment({ id: '3', status: 'In Progress', dueDate: '2026-11-24T20:00:00.000Z' }),
    makeAssignment({ id: '4', status: 'Pending', dueDate: '2026-11-28T12:00:00.000Z' }),
  ];

  const stats = computeDashboardStats(list, NOW);
  assert.equal(stats.total, 4);
  assert.equal(stats.completed, 1);
  assert.equal(stats.pending, 3);
  assert.equal(stats.inProgress, 1);
  assert.equal(stats.overdue, 1);
  assert.equal(stats.dueToday, 1);
  assert.equal(stats.completionRate, 25);
});

test('subject progress and analytics compute on-time metrics and handle empty sets safely', () => {
  const emptyAnalytics = computeAnalyticsData([], SUBJECTS, NOW);
  assert.equal(emptyAnalytics.stats.total, 0);
  assert.equal(emptyAnalytics.stats.completionRate, 0);
  assert.equal(emptyAnalytics.onTimeRate, 0);

  const items: Assignment[] = [
    makeAssignment({
      id: '1',
      subjectId: 's-1',
      status: 'Completed',
      dueDate: '2026-11-24T12:00:00.000Z',
      completedAt: '2026-11-23T12:00:00.000Z',
      priority: 'High',
    }),
    makeAssignment({
      id: '2',
      subjectId: 's-1',
      status: 'Completed',
      dueDate: '2026-11-20T12:00:00.000Z',
      completedAt: '2026-11-22T12:00:00.000Z',
      priority: 'Low',
    }),
  ];

  const progress = computeSubjectProgress(SUBJECTS, items);
  assert.equal(progress[0].completionPercentage, 100);
  assert.equal(progress[1].completionPercentage, 0);

  const analytics = computeAnalyticsData(items, SUBJECTS, NOW);
  assert.equal(analytics.completedOnTime, 1);
  assert.equal(analytics.completedLate, 1);
  assert.equal(analytics.onTimeRate, 50);
  assert.equal(analytics.weeklyActivity.length, 7);
});

test('filtering and sorting works across search, subject, priority, overdue status, and deadline order', () => {
  const subjectsMap = new Map(SUBJECTS.map((s) => [s.id, s]));
  const items: Assignment[] = [
    makeAssignment({ id: 'a', title: 'NumPy Broadcasting Lab', subjectId: 's-1', priority: 'High', status: 'Pending', dueDate: '2026-11-22T10:00:00.000Z' }),
    makeAssignment({ id: 'b', title: 'CPU Scheduler Report', subjectId: 's-2', priority: 'Low', status: 'In Progress', dueDate: '2026-11-27T10:00:00.000Z' }),
    makeAssignment({ id: 'c', title: 'AsyncIO Project', subjectId: 's-1', priority: 'Medium', status: 'Completed', dueDate: '2026-11-21T10:00:00.000Z' }),
  ];

  const overdueOnly = filterAndSortAssignments(
    items,
    { search: '', subjectId: 'all', priority: 'all', status: 'Overdue', sortBy: 'dueDateAsc' },
    subjectsMap,
    NOW
  );
  assert.deepEqual(overdueOnly.map((i) => i.id), ['a']);

  const searchPython = filterAndSortAssignments(
    items,
    { search: 'python', subjectId: 'all', priority: 'all', status: 'all', sortBy: 'priority' },
    subjectsMap,
    NOW
  );
  assert.deepEqual(searchPython.map((i) => i.id), ['a', 'c']);
});

test('deadline notifications respect reminder days and avoid duplicates', () => {
  const items: Assignment[] = [
    makeAssignment({ id: 'a1', title: 'Overdue Task', dueDate: '2026-11-22T12:00:00.000Z', status: 'Pending' }),
    makeAssignment({ id: 'a2', title: 'Due in 2 days', dueDate: '2026-11-26T12:00:00.000Z', status: 'Pending' }),
    makeAssignment({ id: 'a3', title: 'Due in 5 days', dueDate: '2026-11-29T12:00:00.000Z', status: 'Pending' }),
  ];

  const created = generateDeadlineNotifications('u-1', items, 3, true, [], NOW);
  assert.equal(created.length, 2);
  assert.equal(created[0].type, 'overdue');
  assert.equal(created[1].type, 'upcoming');

  const secondPass = generateDeadlineNotifications(
    'u-1',
    items,
    3,
    true,
    created.map((c, idx) => ({ ...c, id: `n-${idx}`, createdAt: NOW.toISOString() })),
    NOW
  );
  assert.equal(secondPass.length, 0);
});

test('validation helpers reject empty or malformed inputs', () => {
  assert.ok(validateEmail('invalid-email'));
  assert.equal(validateEmail('student@university.edu'), null);
  assert.ok(validatePassword('short'));
  assert.equal(validatePassword('SecurePass123'), null);
  assert.ok(validateAssignmentInput({ title: '', dueDate: '2026-11-25', priority: 'High', status: 'Pending' }));
  assert.equal(
    validateAssignmentInput({ title: 'DBMS ER Diagram', dueDate: '2026-11-25T18:00:00.000Z', priority: 'High', status: 'Pending' }),
    null
  );
  assert.ok(validateSubjectInput({ subjectName: 'Math', color: 'not-a-hex' }));
  assert.equal(validateSubjectInput({ subjectName: 'Math', color: '#6366F1' }), null);
});
