'use client';

import { useMemo } from 'react';

// -- Globe: an orthographically-projected sphere of dots, echoing the
//    orbit-ring "N" mark used across NEST. Generated, not hand-placed,
//    so it reads as a real globe rather than a scattered pattern.

type Dot = { x: number; y: number; r: number; opacity: number };
type Node = { x: number; y: number; color: string; delay: number };

function useGlobeGeometry(radius: number) {
  return useMemo(() => {
    const dots: Dot[] = [];
    const latStep = 12;
    const lonStep = 12;

    for (let lat = -80; lat <= 80; lat += latStep) {
      for (let lon = 0; lon < 360; lon += lonStep) {
        const latRad = (lat * Math.PI) / 180;
        const lonRad = (lon * Math.PI) / 180;

        const x3 = Math.cos(latRad) * Math.sin(lonRad);
        const y3 = Math.sin(latRad);
        const z3 = Math.cos(latRad) * Math.cos(lonRad);

        if (z3 < -0.05) continue; // back of sphere, skip

        dots.push({
          x: radius * x3,
          y: -radius * y3,
          r: 0.9 + z3 * 1.1,
          opacity: 0.12 + z3 * 0.38,
        });
      }
    }

    // A handful of "active" locations, glowing in the aurora palette —
    // the visual payoff that turns a wireframe globe into something alive.
    const nodeSpecs: { lat: number; lon: number; color: string }[] = [
      { lat: 38, lon: -95, color: 'var(--aurora-violet)' },   // N. America
      { lat: 51, lon: 8, color: 'var(--aurora-teal)' },       // Europe
      { lat: 22, lon: 78, color: 'var(--aurora-rose)' },      // South Asia
      { lat: 35, lon: 139, color: 'var(--aurora-amber)' },    // East Asia
      { lat: -14, lon: -51, color: 'var(--aurora-teal)' },    // S. America
      { lat: 1, lon: 20, color: 'var(--aurora-violet)' },     // Africa
      { lat: -25, lon: 134, color: 'var(--aurora-rose)' },    // Oceania
    ];

    const nodes: Node[] = nodeSpecs
      .map((n, i) => {
        const latRad = (n.lat * Math.PI) / 180;
        const lonRad = (n.lon * Math.PI) / 180;
        const x3 = Math.cos(latRad) * Math.sin(lonRad);
        const y3 = Math.sin(latRad);
        const z3 = Math.cos(latRad) * Math.cos(lonRad);
        if (z3 < 0.1) return null;
        return {
          x: radius * x3,
          y: -radius * y3,
          color: n.color,
          delay: i * 0.35,
        };
      })
      .filter((n): n is Node => n !== null);

    return { dots, nodes };
  }, [radius]);
}

function Globe() {
  const size = 460;
  const radius = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  const { dots, nodes } = useGlobeGeometry(radius);

  return (
    <div className="relative flex items-center justify-center">
      {/* orbit rings — the recurring NEST mark, slow ambient rotation */}
      <div
        className="absolute rounded-full border border-[var(--aurora-violet)]/25"
        style={{ width: size + 90, height: size + 90, animation: 'orbit-spin 46s linear infinite' }}
      />
      <div
        className="absolute rounded-full border border-dashed border-[var(--aurora-teal)]/25"
        style={{ width: size + 150, height: size + 150, animation: 'orbit-spin 70s linear infinite reverse' }}
      />

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-10">
        <defs>
          <radialGradient id="globeSheen" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="rgba(124,111,240,0.10)" />
            <stop offset="100%" stopColor="rgba(124,111,240,0)" />
          </radialGradient>
          <filter id="nodeGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={cx} cy={cy} r={radius} fill="url(#globeSheen)" />

        <g transform={`translate(${cx}, ${cy})`}>
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--text-primary)" opacity={d.opacity} />
          ))}

          {nodes.map((n, i) => (
            <g key={i} style={{ animation: `node-pulse 2.6s ease-in-out ${n.delay}s infinite` }}>
              <circle cx={n.x} cy={n.y} r={3.4} fill={n.color} filter="url(#nodeGlow)" />
            </g>
          ))}
        </g>
      </svg>

      <style>{`
        @keyframes orbit-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes node-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.6); }
        }
      `}</style>
    </div>
  );
}

function NavBar() {
  return (
    <header className="max-w-6xl mx-auto px-4 pt-6">
      <nav className="glass flex items-center justify-between px-5 py-3 sm:px-6">
        <a href="/" className="flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[var(--aurora-violet)]/40">
            <span className="absolute inset-1 rounded-full border border-[var(--aurora-teal)]/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--aurora-violet)]" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            NEST
          </span>
        </a>

        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Log in
          </a>
          <a
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--aurora-violet)] to-[var(--aurora-teal)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,111,240,0.3)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            Get started
          </a>
        </div>
      </nav>
    </header>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-6xl mx-auto px-4">
        <section className="pt-20 sm:pt-28 text-center">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--aurora-teal)] mb-5">
            Project management, orbiting your team
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-semibold tracking-tight text-[var(--text-primary)] leading-[1.08] max-w-3xl mx-auto">
            Every project has a center.
            <br />
            Keep yours in <span className="text-[var(--aurora-violet)]">NEST</span>.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
            One home for tasks, timelines, and teams — wherever they're working from.
          </p>

          <div className="mt-9 flex items-center justify-center gap-4">
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--aurora-violet)] to-[var(--aurora-teal)] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,111,240,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              Start for free
            </a>
            <a
              href="#live-teams"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border-hover)] px-7 py-3.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-white/50 transition-colors"
            >
              See it live
            </a>
          </div>
        </section>

        <section id="live-teams" className="glass mt-16 sm:mt-20 mb-24 px-6 py-14 sm:px-12 sm:py-16 flex flex-col items-center overflow-hidden scroll-mt-24">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-8">
            Teams orbiting NEST, right now
          </p>
          <Globe />
          <p className="mt-8 text-sm text-[var(--text-secondary)] text-center max-w-sm">
            Every glowing point is a team shipping something today.
          </p>
        </section>
      </main>
    </div>
  );
}