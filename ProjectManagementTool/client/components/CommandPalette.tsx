'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';

type Project = {
  id?: string;
  _id?: string;
  name: string;
};

type PaletteItem = {
  id: string;
  label: string;
  sublabel?: string;
  accent: string;
  onSelect: () => void;
};

const projectId = (p: Project) => p.id ?? p._id ?? '';

// Static destinations that are always searchable, regardless of whether
// projects have loaded yet. Kept separate from project items so the
// palette is instantly useful even before the fetch resolves.
function useStaticItems(router: ReturnType<typeof useRouter>, close: () => void): PaletteItem[] {
  return useMemo(
    () => [
      {
        id: 'nav-dashboard',
        label: 'Dashboard',
        sublabel: 'Go to page',
        accent: 'var(--aurora-violet)',
        onSelect: () => {
          router.push('/dashboard');
          close();
        },
      },
      {
        id: 'nav-projects',
        label: 'All projects',
        sublabel: 'Go to page',
        accent: 'var(--aurora-teal)',
        onSelect: () => {
          router.push('/projects');
          close();
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  };

  // Global keyboard listener — Ctrl/Cmd+/ is the reliable shortcut (not
  // reserved by any major browser). Ctrl/Cmd+K is kept as a bonus — it's
  // Edge/Chrome's address-bar search shortcut, so it won't win everywhere,
  // but capturing early + stopPropagation gives it the best chance.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && (key === '/' || key === 'k')) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((o) => !o);
        return;
      }
      if (e.key === 'Escape' && open) {
        close();
      }
    };
    // capture: true so we see the event before the browser's own handling
    window.addEventListener('keydown', handler, { capture: true });

    // Lets any button elsewhere in the app open the palette too, via
    // window.dispatchEvent(new Event('open-command-palette')) — handy for
    // a "Search" button in a nav bar on devices without a keyboard.
    const openHandler = () => setOpen(true);
    window.addEventListener('open-command-palette', openHandler);

    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('open-command-palette', openHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus the input the moment the palette opens.
  useEffect(() => {
    if (open) {
      // Slight delay so it focuses after the element actually mounts/renders.
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Lazily fetch projects only once, the first time the palette opens —
  // no point hitting the API on every page load if the user never uses Cmd+K.
  useEffect(() => {
    if (!open || projects.length > 0) return;
    fetch(`${API_URL}/api/projects`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { projects: [] }))
      .then((data) => setProjects(data.projects ?? data ?? []))
      .catch(() => setProjects([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const staticItems = useStaticItems(router, close);

  const projectItems: PaletteItem[] = useMemo(
    () =>
      projects.map((p) => ({
        id: `project-${projectId(p)}`,
        label: p.name,
        sublabel: 'Project',
        accent: 'var(--aurora-rose)',
        onSelect: () => {
          router.push(`/projects/${projectId(p)}`);
          close();
        },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects]
  );

  const allItems = [...staticItems, ...projectItems];

  const filtered = query.trim()
    ? allItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    : allItems;

  // Keep the active index in range whenever the filtered list changes size.
  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(0);
  }, [filtered.length, activeIndex]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[activeIndex]?.onSelect();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={close}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* palette */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3.5">
          <span className="text-[var(--text-tertiary)] text-sm">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Jump to a project or page…"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
          />
          <kbd className="rounded-md border border-black/10 bg-black/[0.03] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-tertiary)]">
            esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-[var(--text-secondary)]">
              No matches for "{query}"
            </p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={item.onSelect}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  i === activeIndex ? 'bg-black/[0.04]' : ''
                }`}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.accent }} />
                <span className="flex-1 truncate text-[var(--text-primary)] font-medium">{item.label}</span>
                {item.sublabel && (
                  <span className="shrink-0 text-xs text-[var(--text-tertiary)]">{item.sublabel}</span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-black/5 px-4 py-2.5 text-[10px] text-[var(--text-tertiary)] font-mono">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}