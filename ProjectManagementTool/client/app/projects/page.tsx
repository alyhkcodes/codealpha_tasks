'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';

type Project = {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  taskCount?: number;
  totalTasks?: number;
  doneTasks?: number;
  updatedAt?: string;
};

// Backend may return either `id` or Mongo-style `_id` — normalize here
// so the rest of the component never has to think about it.
const projectId = (p: Project) => p.id ?? p._id ?? '';

const ACCENTS = [
  'var(--aurora-violet)',
  'var(--aurora-teal)',
  'var(--aurora-rose)',
  'var(--aurora-amber)',
];

function OrbitMark() {
  return (
    <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[var(--aurora-violet)]/40">
      <span className="absolute inset-1 rounded-full border border-[var(--aurora-teal)]/40" />
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--aurora-violet)]" />
    </span>
  );
}

function ProgressBar({ total, done, accent }: { total: number; done: number; accent: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-1.5">
        <span>{done}/{total} done</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const loadProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects`, { credentials: 'include' });
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setProjects(data.projects ?? data);
    } catch {
      setConnectionError(true);
    }
  };

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName('');
        setCreating(false);
        loadProjects();
      }
    } catch {
      setConnectionError(true);
    }
  };

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass px-8 py-6 text-center max-w-sm">
          <p className="text-sm font-medium text-[var(--text-primary)]">Can't reach the server</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Make sure your backend is running, then refresh this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <a href="/dashboard" className="flex items-center gap-2.5">
            <OrbitMark />
            <span className="font-display text-lg font-semibold text-[var(--text-primary)]">NEST</span>
          </a>
          <button
            onClick={() => setCreating((c) => !c)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--aurora-violet)] to-[var(--aurora-teal)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,111,240,0.3)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            {creating ? 'Cancel' : '+ New project'}
          </button>
        </header>

        <div className="mb-8">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--aurora-teal)] mb-2">
            Your work
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] tracking-tight">
            Projects
          </h1>
        </div>

        {creating && (
          <form onSubmit={handleCreate} className="glass px-6 py-5 mb-8 flex items-center gap-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name your project"
              className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-gradient-to-r from-[var(--aurora-violet)] to-[var(--aurora-teal)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Create
            </button>
          </form>
        )}

        {projects === null && (
          <p className="text-sm text-[var(--text-secondary)] font-mono">loading…</p>
        )}

        {projects !== null && projects.length === 0 && (
          <div className="glass px-8 py-14 text-center">
            <p className="text-sm font-medium text-[var(--text-primary)]">No projects yet</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Create your first project to start organizing work.
            </p>
          </div>
        )}

        {projects !== null && projects.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => {
              const accent = ACCENTS[i % ACCENTS.length];
              const total = p.totalTasks ?? 0;
              const done = p.doneTasks ?? 0;
              return (
                <a
                  key={projectId(p)}
                  href={`/projects/${projectId(p)}`}
                  className="glass group px-6 py-6 flex flex-col justify-between min-h-[170px]"
                >
                  <div>
                    <span
                      className="inline-block h-2 w-2 rounded-full mb-3"
                      style={{ backgroundColor: accent }}
                    />
                    <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--aurora-violet)] transition-colors">
                      {p.name}
                    </h2>
                    {p.description && (
                      <p className="text-sm text-[var(--text-secondary)] mt-1.5 line-clamp-2">
                        {p.description}
                      </p>
                    )}
                    {total > 0 && <ProgressBar total={total} done={done} accent={accent} />}
                  </div>
                  <div className="flex items-center justify-between mt-5 text-xs text-[var(--text-tertiary)]">
                    <span>{total} tasks</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}