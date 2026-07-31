'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';

type Comment = {
  user: { _id: string; name: string; email: string } | string;
  text: string;
  createdAt: string;
};

type Priority = 'low' | 'medium' | 'high';

type Task = {
  _id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: Priority;
  dueDate?: string | null;
  comments: Comment[];
};

type Project = {
  _id: string;
  name: string;
  description: string;
};

const COLUMNS: { key: Task['status']; label: string; accent: string; dot: string }[] = [
  { key: 'todo', label: 'To Do', accent: 'var(--aurora-violet)', dot: 'bg-[var(--aurora-violet)]' },
  { key: 'in-progress', label: 'In Progress', accent: 'var(--aurora-amber)', dot: 'bg-[var(--aurora-amber)]' },
  { key: 'done', label: 'Done', accent: 'var(--aurora-teal)', dot: 'bg-[var(--aurora-teal)]' },
];

const PRIORITIES: { key: Priority; label: string; color: string }[] = [
  { key: 'low', label: 'Low', color: 'var(--aurora-teal)' },
  { key: 'medium', label: 'Medium', color: 'var(--aurora-amber)' },
  { key: 'high', label: 'High', color: 'var(--aurora-rose)' },
];

// -- Generic small popover dropdown -----------------------------------
// Shared shell behind both StatusDropdown and PriorityDropdown so the two
// stay visually consistent without duplicating the open/close/outside-click
// wiring twice.

function useOutsideClick(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOutside]);
  return ref;
}

function StatusDropdown({
  value,
  onChange,
}: {
  value: Task['status'];
  onChange: (status: Task['status']) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick(() => setOpen(false));
  const current = COLUMNS.find((c) => c.key === value) ?? COLUMNS[0];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-[var(--popover-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--chip-hover)] transition-colors"
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: current.accent }} />
        {current.label}
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-36 overflow-hidden rounded-lg border border-[var(--popover-border)] bg-[var(--popover-bg)] shadow-lg">
          {COLUMNS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                onChange(c.key);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--popover-hover)] ${
                c.key === value ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.accent }} />
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PriorityDropdown({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (priority: Priority) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick(() => setOpen(false));
  const current = PRIORITIES.find((p) => p.key === value) ?? PRIORITIES[1];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--popover-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--chip-hover)] transition-colors"
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: current.color }} />
        {current.label}
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-32 overflow-hidden rounded-lg border border-[var(--popover-border)] bg-[var(--popover-bg)] shadow-lg">
          {PRIORITIES.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                onChange(p.key);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--popover-hover)] ${
                p.key === value ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// -- Due date pill -------------------------------------------------------
// Shows "+ Due date" until a date is set. Once set, shows the formatted
// date, in rose if it's overdue and the task isn't done yet. Click to edit.

function isOverdue(dueDate: string | null | undefined, status: Task['status']) {
  if (!dueDate || status === 'done') return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function formatDate(dueDate: string) {
  const d = new Date(dueDate);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function DueDatePicker({
  value,
  status,
  onChange,
}: {
  value: string | null | undefined;
  status: Task['status'];
  onChange: (date: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const overdue = isOverdue(value, status);

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={value ? value.slice(0, 10) : ''}
        onBlur={(e) => {
          setEditing(false);
          onChange(e.target.value || null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className="glass-input text-xs px-2 py-1.5 rounded-lg"
      />
    );
  }

  if (!value) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        + Due date
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`text-xs font-medium rounded-lg px-2 py-1 transition-colors ${
        overdue
          ? 'text-[var(--aurora-rose)] bg-[var(--aurora-rose)]/10 hover:bg-[var(--aurora-rose)]/15'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--popover-hover)]'
      }`}
    >
      {overdue ? '⚠ ' : ''}
      {formatDate(value)}
    </button>
  );
}

export default function ProjectBoardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Task['status'] | null>(null);
  const [search, setSearch] = useState('');

  const socketRef = useRef<Socket | null>(null);

  const fetchData = async () => {
    try {
      const [projectRes, tasksRes] = await Promise.all([
        fetch(`${API_URL}/api/projects/${projectId}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/tasks/project/${projectId}`, { credentials: 'include' }),
      ]);

      if (!projectRes.ok || !tasksRes.ok) {
        router.push('/projects');
        return;
      }

      const projectData = await projectRes.json();
      const tasksData = await tasksRes.json();
      setProject(projectData.project);
      setTasks(tasksData.tasks);
    } catch (err) {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    const socket = io(API_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.emit('join-project', projectId);

    socket.on('task:created', (incoming: Task) => {
      setTasks((prev) => (prev.some((t) => t._id === incoming._id) ? prev : [incoming, ...prev]));
    });

    socket.on('task:updated', (incoming: Task) => {
      setTasks((prev) => prev.map((t) => (t._id === incoming._id ? incoming : t)));
    });

    socket.on('task:comment', (incoming: Task) => {
      setTasks((prev) => prev.map((t) => (t._id === incoming._id ? incoming : t)));
    });

    return () => {
      socket.emit('leave-project', projectId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, projectId, priority: newPriority }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((prev) => [data.task, ...prev]);
        setTitle('');
        setNewPriority('medium');
      }
    } catch (err) {
      setError('Could not create task.');
    }
  };

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));
    try {
      await fetch(`${API_URL}/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      // ignore
    }
  };

  const handlePriorityChange = async (taskId: string, priority: Priority) => {
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, priority } : t)));
    try {
      await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ priority }),
      });
    } catch (err) {
      // ignore
    }
  };

  const handleDueDateChange = async (taskId: string, dueDate: string | null) => {
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, dueDate } : t)));
    try {
      await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dueDate }),
      });
    } catch (err) {
      // ignore
    }
  };

  const handleAddComment = async (taskId: string) => {
    if (!commentText.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: commentText }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t._id === taskId ? data.task : t)));
        setCommentText('');
      }
    } catch (err) {
      // ignore
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverCol(null);
  };

  const handleColumnDragOver = (e: React.DragEvent, colKey: Task['status']) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colKey) setDragOverCol(colKey);
  };

  const handleColumnDragLeave = (e: React.DragEvent, colKey: Task['status']) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverCol === colKey) setDragOverCol(null);
  };

  const handleColumnDrop = (e: React.DragEvent, colKey: Task['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDragOverCol(null);
    setDraggedTaskId(null);
    if (!taskId) return;

    const task = tasks.find((t) => t._id === taskId);
    if (!task || task.status === colKey) return;

    handleStatusChange(taskId, colKey);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[var(--text-secondary)] font-mono tracking-wide">loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12 sm:py-16">
      <div className="max-w-6xl mx-auto">
        <a
          href="/projects"
          className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← Back to projects
        </a>

        <div className="mt-6 mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] tracking-tight">
            {project?.name}
          </h1>
          {project?.description && (
            <p className="text-sm text-[var(--text-secondary)] mt-2">{project.description}</p>
          )}
        </div>

        <form onSubmit={handleCreateTask} className="glass p-3 flex flex-wrap gap-2 mb-8">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task title"
            className="glass-input flex-1 min-w-[160px] px-4 py-2.5 rounded-xl text-sm"
          />
          <PriorityDropdown value={newPriority} onChange={setNewPriority} />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-[var(--aurora-violet)] to-[var(--aurora-teal)] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            Add task
          </button>
        </form>

        {error && <p className="text-sm text-[var(--aurora-rose)] mb-4">{error}</p>}

        <div className="relative mb-6 max-w-sm">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-sm">
            ⌕
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="glass-input w-full pl-9 pr-8 py-2.5 rounded-xl text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {search && (
          <p className="text-xs text-[var(--text-secondary)] -mt-4 mb-6">
            {tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase())).length} match
            {tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase())).length === 1 ? '' : 'es'} for
            "{search}"
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLUMNS.map((col) => {
            const visibleTasks = tasks.filter(
              (t) => t.status === col.key && t.title.toLowerCase().includes(search.toLowerCase())
            );
            const columnTasks = visibleTasks;
            const isDragOver = dragOverCol === col.key;

            return (
              <div
                key={col.key}
                onDragOver={(e) => handleColumnDragOver(e, col.key)}
                onDragLeave={(e) => handleColumnDragLeave(e, col.key)}
                onDrop={(e) => handleColumnDrop(e, col.key)}
                className="glass p-4 transition-all duration-150"
                style={isDragOver ? { boxShadow: `0 0 0 2px ${col.accent}` } : undefined}
              >
                <div className="flex items-center gap-2 mb-4 px-1">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-[var(--text-secondary)]">
                    {col.label}
                  </h2>
                  <span className="ml-auto text-xs font-mono text-[var(--text-secondary)]">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[60px]">
                  {columnTasks.map((task) => {
                    const isDragging = draggedTaskId === task._id;
                    return (
                      <div
                        key={task._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task._id)}
                        onDragEnd={handleDragEnd}
                        className={`rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 transition-all cursor-grab active:cursor-grabbing hover:bg-[var(--card-bg-hover)] ${
                          isDragging ? 'opacity-40 scale-[0.97]' : 'opacity-100'
                        }`}
                        style={{ borderLeft: `2px solid ${col.accent}` }}
                      >
                        <p className="text-sm font-medium text-[var(--text-primary)]">{task.title}</p>

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <StatusDropdown
                            value={task.status}
                            onChange={(status) => handleStatusChange(task._id, status)}
                          />
                          <PriorityDropdown
                            value={task.priority ?? 'medium'}
                            onChange={(priority) => handlePriorityChange(task._id, priority)}
                          />
                          <DueDatePicker
                            value={task.dueDate}
                            status={task.status}
                            onChange={(date) => handleDueDateChange(task._id, date)}
                          />
                        </div>

                        {task.comments.length > 0 && (
                          <div className="mt-3 space-y-1.5 border-t border-[var(--card-border)] pt-3">
                            {task.comments.map((c, i) => (
                              <p key={i} className="text-xs text-[var(--text-secondary)]">
                                <span className="text-[var(--text-primary)] font-medium">
                                  {typeof c.user === 'object' ? c.user.name : 'User'}
                                </span>
                                {' — '}
                                {c.text}
                              </p>
                            ))}
                          </div>
                        )}

                        <div className="mt-3">
                          {activeTaskId === task._id ? (
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment"
                                className="glass-input flex-1 text-xs px-3 py-1.5 rounded-lg"
                              />
                              <button
                                onClick={() => handleAddComment(task._id)}
                                className="text-xs font-semibold rounded-lg px-3 py-1.5 bg-gradient-to-r from-[var(--aurora-violet)] to-[var(--aurora-teal)] text-white"
                              >
                                Post
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setActiveTaskId(task._id)}
                              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              + Comment
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <p
                      className={`text-xs px-1 py-2 rounded-lg border border-dashed transition-colors ${
                        isDragOver
                          ? 'border-black/20 text-[var(--text-primary)]'
                          : 'border-transparent text-[var(--text-secondary)]'
                      }`}
                    >
                      {isDragOver ? 'Drop here' : search ? 'No matches.' : 'Nothing here yet.'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}