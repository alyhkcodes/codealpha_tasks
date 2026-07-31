'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';

type User = {
  id: string;
  name: string;
  email: string;
};

type Project = {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  taskCount?: number;
  totalTasks?: number;
  doneTasks?: number;
};

// Backend may return either `id` or Mongo-style `_id` — normalize here.
const projectId = (p: Project) => p.id ?? p._id ?? '';

const ACCENTS = ['var(--aurora-violet)', 'var(--aurora-teal)', 'var(--aurora-rose)', 'var(--aurora-amber)'];

function OrbitMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="relative flex items-center justify-center rounded-full border border-[var(--aurora-violet)]/40 shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-1 rounded-full border border-[var(--aurora-teal)]/40" />
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--aurora-violet)]" />
    </span>
  );
}

// Decorative orbit graphic that echoes the landing page's globe/orbit motif,
// used here to fill the empty space beside the welcome message.
function OrbitDecor() {
  return (
    <div className="relative hidden sm:flex items-center justify-center w-40 h-40 shrink-0">
      <div
        className="absolute rounded-full border border-[var(--aurora-violet)]/25"
        style={{ width: 160, height: 160, animation: 'dash-orbit-spin 40s linear infinite' }}
      />
      <div
        className="absolute rounded-full border border-dashed border-[var(--aurora-teal)]/25"
        style={{ width: 118, height: 118, animation: 'dash-orbit-spin 30s linear infinite reverse' }}
      />
      <div className="absolute h-2.5 w-2.5 rounded-full bg-[var(--aurora-rose)]" style={{ top: 14, left: '50%' }} />
      <div className="absolute h-2 w-2 rounded-full bg-[var(--aurora-amber)]" style={{ bottom: 26, right: 20 }} />
      <OrbitMark size={44} />
      <style>{`
        @keyframes dash-orbit-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Slim progress bar for a project card — percent of tasks marked done.
// Falls back gracefully to "no tasks yet" styling when totalTasks is 0.
function ProjectProgress({ total, done, accent }: { total: number; done: number; accent: string }) {
  if (total === 0) {
    return <p className="text-xs text-[var(--text-tertiary)] mt-3">No tasks yet</p>;
  }

  const pct = Math.round((done / total) * 100);

  return (
    <div className="mt-3">
      <div className="h-1.5 w-full rounded-full bg-black/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: accent }}
        />
      </div>
      <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
        {done}/{total} tasks · {pct}%
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);

        try {
          const pRes = await fetch(`${API_URL}/api/projects`, { credentials: 'include' });
          if (pRes.ok) {
            const pData = await pRes.json();
            setProjects(pData.projects ?? pData);
          } else {
            setProjects([]);
          }
        } catch {
          setProjects([]);
        }
      } catch {
        setConnectionError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[var(--text-secondary)] font-mono tracking-wide">loading…</p>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass px-8 py-6 text-center max-w-sm">
          <p className="text-sm font-medium text-[var(--text-primary)]">Can't reach the server</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Make sure your backend is running, then refresh this page.</p>
        </div>
      </div>
    );
  }

  const totalTasks = (projects ?? []).reduce((sum, p) => sum + (p.totalTasks ?? p.taskCount ?? 0), 0);
  const doneTasksAll = (projects ?? []).reduce((sum, p) => sum + (p.doneTasks ?? 0), 0);
  const openTasks = totalTasks - doneTasksAll;
  const recentProjects = (projects ?? []).slice(0, 3);

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14">
      <div className="max-w-4xl mx-auto">
        {/* nav — matches the landing page */}
        <header className="flex items-center justify-between mb-8">
          <a href="/" className="flex items-center gap-2.5">
            <OrbitMark />
            <span className="font-display text-lg font-semibold text-[var(--text-primary)]">NEST</span>
          </a>
          <div className="flex items-center gap-3">
  <ThemeToggle />
  <button
    onClick={handleLogout}
    className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--glass-border)] rounded-full px-4 py-2 hover:bg-black/5"
  >
    Log out
  </button>
</div>
        </header>

        {/* welcome hero, with the orbit decor filling the empty right side */}
        <div className="glass px-8 py-8 sm:px-10 sm:py-10 flex items-center justify-between gap-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--aurora-teal)] mb-2">
              Dashboard
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] tracking-tight">
              {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Welcome back'}
            </h1>
            {user && <p className="text-sm text-[var(--text-secondary)] mt-2">{user.email}</p>}

            <a
              href="/projects"
              className="group mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--aurora-violet)] to-[var(--aurora-teal)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,111,240,0.3)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              Go to your projects
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>

          <OrbitDecor />
        </div>

        {/* quick stats — fills the empty space below with real signal */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
          <div className="glass px-6 py-5">
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-[var(--text-tertiary)]">Projects</p>
            <p className="font-display text-2xl font-semibold text-[var(--text-primary)] mt-1">
              {(projects ?? []).length}
            </p>
          </div>
          <div className="glass px-6 py-5">
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-[var(--text-tertiary)]">Open tasks</p>
            <p className="font-display text-2xl font-semibold text-[var(--text-primary)] mt-1">{openTasks}</p>
          </div>
          <div className="glass px-6 py-5 col-span-2 sm:col-span-1">
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-[var(--text-tertiary)]">Signed in as</p>
            <p className="font-display text-base font-semibold text-[var(--text-primary)] mt-1.5 truncate">
              {user?.name ?? '—'}
            </p>
          </div>
        </div>

        {/* recent projects */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Recent projects</h2>
            <a
              href="/projects"
              className="text-xs font-medium text-[var(--aurora-violet)] hover:underline"
            >
              View all →
            </a>
          </div>

          {recentProjects.length === 0 ? (
            <div className="glass px-8 py-10 text-center">
              <p className="text-sm font-medium text-[var(--text-primary)]">No projects yet</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Create your first project to see it here.
              </p>
              <a
                href="/projects"
                className="inline-block mt-4 text-xs font-semibold text-white bg-gradient-to-r from-[var(--aurora-violet)] to-[var(--aurora-teal)] rounded-full px-5 py-2.5"
              >
                + New project
              </a>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {recentProjects.map((p, i) => {
                const accent = ACCENTS[i % ACCENTS.length];
                const total = p.totalTasks ?? p.taskCount ?? 0;
                const done = p.doneTasks ?? 0;
                return (
                  <a
                    key={projectId(p)}
                    href={`/projects/${projectId(p)}`}
                    className="glass group px-5 py-5 flex flex-col justify-between min-h-[110px]"
                  >
                    <div>
                      <span
                        className="inline-block h-2 w-2 rounded-full mb-2"
                        style={{ backgroundColor: accent }}
                      />
                      <p className="font-display text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--aurora-violet)] transition-colors truncate">
                        {p.name}
                      </p>
                    </div>
                    <ProjectProgress total={total} done={done} accent={accent} />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}