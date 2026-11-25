import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import type { Assignment, AssignmentStatus, Priority, Subject, Subtask } from '../types';
import { validateAssignmentInput } from '../utils/academicLogic';

interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  editingAssignment: Assignment | null;
  initialDueDate?: string | null; // YYYY-MM-DD
  onSave: (payload: {
    id?: string;
    title: string;
    description: string;
    subjectId: string | null;
    dueDate: string;
    priority: Priority;
    status: AssignmentStatus;
    subtasks: Subtask[];
  }) => Promise<void>;
}

function toLocalDateTimeInput(isoOrDate?: string | null): string {
  const date = isoOrDate ? new Date(isoOrDate) : new Date(Date.now() + 86_400_000 * 2);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(Date.now() + 86_400_000 * 2);
    return toLocalDateTimeInput(fallback.toISOString());
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function AssignmentModal({
  open,
  onClose,
  subjects,
  editingAssignment,
  initialDueDate,
  onSave,
}: AssignmentModalProps) {
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<AssignmentStatus>('Pending');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNewSubtaskTitle('');
    if (editingAssignment) {
      setTitle(editingAssignment.title);
      setSubjectId(editingAssignment.subjectId ?? '');
      setDescription(editingAssignment.description);
      setDueDate(toLocalDateTimeInput(editingAssignment.dueDate));
      setPriority(editingAssignment.priority);
      setStatus(editingAssignment.status);
      setSubtasks(editingAssignment.subtasks);
    } else {
      setTitle('');
      setSubjectId(subjects[0]?.id ?? '');
      setDescription('');
      setDueDate(
        initialDueDate
          ? `${initialDueDate}T18:00`
          : toLocalDateTimeInput(new Date(Date.now() + 86_400_000 * 2).toISOString())
      );
      setPriority('Medium');
      setStatus('Pending');
      setSubtasks([]);
    }
  }, [open, editingAssignment, initialDueDate, subjects]);

  const handleAddSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [
      ...prev,
      { id: `local_${Date.now()}_${prev.length}`, title: trimmed, completed: false },
    ]);
    setNewSubtaskTitle('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const validationError = validateAssignmentInput({
      title,
      dueDate,
      priority,
      status,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: editingAssignment?.id,
        title: title.trim(),
        description: description.trim(),
        subjectId: subjectId || null,
        dueDate: new Date(dueDate).toISOString(),
        priority,
        status,
        subtasks,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save assignment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingAssignment ? 'Edit Assignment' : 'New Assignment'}
      description={
        editingAssignment
          ? 'Update assignment details, submission deadline, or subtasks.'
          : 'Add a new academic task with deadline, priority, and optional checklist.'
      }
      maxWidthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label
            htmlFor="asg-title"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Assignment title
          </label>
          <input
            id="asg-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement Dijkstra Shortest Path Algorithm"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="asg-subject"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Subject
            </label>
            <select
              id="asg-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="">Unassigned / General</option>
              {subjects.map((subj) => (
                <option key={subj.id} value={subj.id}>
                  {subj.subjectName}
                  {subj.subjectCode ? ` (${subj.subjectCode})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="asg-due"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Submission deadline
            </label>
            <input
              id="asg-due"
              type="datetime-local"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="asg-priority"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Priority
            </label>
            <select
              id="asg-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="asg-status"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Status
            </label>
            <select
              id="asg-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as AssignmentStatus)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="asg-description"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Detailed instructions / notes
          </label>
          <textarea
            id="asg-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Requirements, deliverables, rubric notes, or references..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 resize-y"
          />
        </div>

        {/* Subtasks Checklist */}
        <div>
          <label
            htmlFor="asg-new-subtask"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Subtasks / checklist (optional)
          </label>
          <div className="flex gap-2">
            <input
              id="asg-new-subtask"
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
              placeholder="Add a step and press Enter..."
              className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={handleAddSubtask}
              aria-label="Add subtask"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {subtasks.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {subtasks.map((st, idx) => (
                <li
                  key={st.id}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={st.completed}
                    onChange={() =>
                      setSubtasks((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, completed: !item.completed } : item
                        )
                      )
                    }
                    aria-label={`Mark subtask "${st.title}" completed`}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span
                    className={`flex-1 text-xs ${
                      st.completed
                        ? 'line-through text-slate-400'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {st.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSubtasks((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label={`Remove subtask "${st.title}"`}
                    className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {saving
              ? 'Saving...'
              : editingAssignment
                ? 'Save Changes'
                : 'Create Assignment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
