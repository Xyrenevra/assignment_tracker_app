import { useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, BookOpen, Edit3, Plus, Trash2 } from 'lucide-react';
import type { Assignment, Subject } from '../types';
import { computeSubjectProgress, validateSubjectInput } from '../utils/academicLogic';
import { ConfirmDialog, Modal } from './ui/Modal';

interface SubjectsPageProps {
  subjects: Subject[];
  assignments: Assignment[];
  onCreate: (input: { subjectName: string; subjectCode: string; color: string }) => Promise<void>;
  onUpdate: (
    id: string,
    input: { subjectName: string; subjectCode: string; color: string }
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const COLOR_SWATCHES = [
  '#6366F1',
  '#8B5CF6',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#EF4444',
  '#14B8A6',
];

export function SubjectsPage({
  subjects,
  assignments,
  onCreate,
  onUpdate,
  onDelete,
}: SubjectsPageProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);

  const progressList = useMemo(
    () => computeSubjectProgress(subjects, assignments),
    [subjects, assignments]
  );

  const unassignedCount = useMemo(
    () => assignments.filter((a) => a.subjectId === null).length,
    [assignments]
  );

  const openCreate = () => {
    setEditing(null);
    setSubjectName('');
    setSubjectCode('');
    setColor(COLOR_SWATCHES[subjects.length % COLOR_SWATCHES.length]);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (subj: Subject) => {
    setEditing(subj);
    setSubjectName(subj.subjectName);
    setSubjectCode(subj.subjectCode);
    setColor(subj.color);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const validationErr = validateSubjectInput({ subjectName, color });
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        subjectName: subjectName.trim(),
        subjectCode: subjectCode.trim().toUpperCase(),
        color,
      };
      if (editing) {
        await onUpdate(editing.id, payload);
      } else {
        await onCreate(payload);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save subject.');
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Subjects
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            {subjects.length} {subjects.length === 1 ? 'course' : 'courses'} configured
            {unassignedCount > 0 ? ` · ${unassignedCount} unassigned assignments` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Add Subject</span>
        </button>
      </div>

      {subjects.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            No subjects added yet
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Add your academic subjects with custom colors to track course-level progress and color-code your calendar.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Subject</span>
          </button>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {progressList.map((sp) => {
            const subjObj = subjects.find((s) => s.id === sp.subjectId)!;
            return (
              <article
                key={sp.subjectId}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-sm shrink-0"
                        style={{ backgroundColor: sp.color }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                          {sp.subjectName}
                        </h2>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {sp.subjectCode || 'No course code'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(subjObj)}
                        aria-label={`Edit subject ${sp.subjectName}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(subjObj)}
                        aria-label={`Delete subject ${sp.subjectName}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div>
                      <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                        {sp.total}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {sp.completed}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Completed</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                        {sp.pending}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Pending</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Progress</span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                      {sp.completionPercentage}%
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
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Create / Edit Subject Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Subject' : 'Add Subject'}
        description="Assign a course name, optional code, and color tag."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="subject-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Subject name
            </label>
            <input
              id="subject-name"
              type="text"
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Machine Learning"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          <div>
            <label
              htmlFor="subject-code"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Subject code (optional)
            </label>
            <input
              id="subject-code"
              type="text"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              placeholder="e.g. CS402"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 font-mono"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Color accent
            </span>
            <div className="flex items-center gap-2.5 flex-wrap">
              {COLOR_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  aria-label={`Select color ${hex}`}
                  aria-pressed={color.toLowerCase() === hex.toLowerCase()}
                  className={`w-7 h-7 rounded-lg transition-transform ${
                    color.toLowerCase() === hex.toLowerCase()
                      ? 'ring-2 ring-offset-2 ring-indigo-600 dark:ring-offset-slate-900 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
              <label className="sr-only" htmlFor="subject-custom-color">
                Custom hex color
              </label>
              <input
                id="subject-custom-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
            >
              {saving ? 'Saving...' : editing ? 'Save Subject' : 'Create Subject'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Subject Safely"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.subjectName}"? Any assignments linked to this subject will be kept safely and marked as Unassigned—no coursework will be lost.`
            : ''
        }
        confirmLabel="Delete Subject"
        loading={deleting}
      />
    </div>
  );
}
