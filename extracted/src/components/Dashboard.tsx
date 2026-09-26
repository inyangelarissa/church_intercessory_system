import { useState, useEffect } from "react";
import { api } from "../lib/api";

const defaultStatValues = { totalIntercessors: 0, openRequests: 0, requestsCovered: 0, sessionsThisWeek: 0, totalTestimonies: 0 };

const statMeta = [
  {
    key: "totalIntercessors" as const,
    label: "Active Intercessors",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    color: "#8b0000",
    bg: "rgba(139,0,0,0.07)",
  },
  {
    key: "openRequests" as const,
    label: "Open Prayer Requests",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    color: "#0a1628",
    bg: "rgba(10,22,40,0.06)",
  },
  {
    key: "sessionsThisWeek" as const,
    label: "Scheduled Sessions",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    color: "#8b0000",
    bg: "rgba(139,0,0,0.07)",
  },
  {
    key: "requestsCovered" as const,
    label: "Requests Covered",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 11.5A8.38 8.38 0 0 1 12 20a8.38 8.38 0 0 1-8-8.5A8.38 8.38 0 0 1 12 3a8.38 8.38 0 0 1 8 8.5Z" />
        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
    ),
    color: "#8b0000",
    bg: "rgba(139,0,0,0.07)",
  },
  {
    key: "totalTestimonies" as const,
    label: "Testimonies Recorded",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    color: "#0a1628",
    bg: "rgba(10,22,40,0.06)",
  },
];

const priorityConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Urgent: { bg: "rgba(139,0,0,0.1)", text: "#8b0000", dot: "#8b0000" },
  High: { bg: "rgba(180,83,9,0.1)", text: "#b45309", dot: "#d97706" },
  Normal: { bg: "rgba(10,22,40,0.06)", text: "#334155", dot: "#64748b" },
};

export default function Dashboard() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [statValues, setStatValues] = useState(defaultStatValues);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    api.dashboard.stats()
      .then((s) => {
        if (cancelled) return;
        setStatValues({
          totalIntercessors: Number(s?.totalIntercessors ?? 0),
          openRequests: Number(s?.openRequests ?? 0),
          requestsCovered: Number(s?.requestsCovered ?? 0),
          sessionsThisWeek: Number(s?.sessionsThisWeek ?? 0),
          totalTestimonies: Number(s?.totalTestimonies ?? 0),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setStatValues(defaultStatValues);
        }
      });

    api.prayerRequests.list()
      .then((rows) => {
        if (cancelled) return;
        setRecentRequests((rows ?? []).slice(0, 5).map((r: any) => ({
          name: r.name ?? "Unknown",
          request: r.request ?? "No request details provided",
          priority: r.priority ?? "Normal",
          date: r.date ?? "N/A",
          assigned: r.assigned ?? "Unassigned",
          initials: r.initials ?? (r.name ?? "?").split(" ").slice(0, 2).map((part: string) => part[0]).join("").toUpperCase(),
        })));
      })
      .catch(() => {
        if (!cancelled) setRecentRequests([]);
      });

    api.schedule.list()
      .then((rows) => {
        if (cancelled) return;
        setUpcomingSessions((rows ?? []).slice(0, 4).map((s: any, i: number) => ({
          title: s.title ?? "Prayer session",
          day: (s.day ?? "").slice(0, 3) || "TBD",
          time: s.time ?? "TBD",
          lead: s.lead ?? "Unassigned",
          count: s.intercessors?.length || 0,
          urgent: i === 0,
        })));
      })
      .catch(() => {
        if (!cancelled) setUpcomingSessions([]);
      });

    return () => { cancelled = true; };
  }, []);

  const stats = statMeta.map((m) => ({ ...m, value: statValues[m.key].toLocaleString() }));
  const hasRequestData = recentRequests.length > 0;
  const hasSessionData = upcomingSessions.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>
            Overview · Live from database
          </p>
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}
        >
          Intercession Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#94a3b8" }}>
          A unified view of all intercessory activities across the congregation.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-5">
        {stats.map((s, i) => (
          <div
            key={i}
            className="card-hover animate-fade-up rounded-2xl p-6 border bg-white"
            style={{ borderColor: "rgba(10,22,40,0.07)", animationDelay: `${i * 80}ms`, boxShadow: "0 2px 12px rgba(10,22,40,0.05)" }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ background: s.bg, color: s.color }}
            >
              {s.icon}
            </div>
            <p className="text-3xl font-bold mb-0.5" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>
              {s.value}
            </p>
            <p className="text-sm font-medium mb-1" style={{ color: "#334155" }}>{s.label}</p>
            <p className="text-xs" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Updated just now</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent Requests */}
        <div
          className="animate-fade-up delay-200 lg:col-span-2 rounded-2xl border bg-white overflow-hidden"
          style={{ borderColor: "rgba(10,22,40,0.07)", boxShadow: "0 2px 12px rgba(10,22,40,0.05)" }}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "rgba(10,22,40,0.06)" }}>
            <h2 className="text-base font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>
              Recent Prayer Requests
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(139,0,0,0.09)", color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>
              Last 7 days
            </span>
          </div>
          <div>
            {hasRequestData ? (
              recentRequests.map((r, i) => (
                <div
                  key={i}
                  className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-start gap-4 border-b"
                  style={{ borderColor: "rgba(10,22,40,0.04)", animationDelay: `${i * 60}ms` }}
                >
                  <div
                    className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ background: "#0a1628", color: "#fff", fontFamily: "'Cinzel', serif" }}
                  >
                    {r.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: "#0a1628" }}>{r.name}</p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{
                          background: (priorityConfig[r.priority] ?? { bg: "rgba(10,22,40,0.06)", text: "#334155", dot: "#64748b" }).bg,
                          color: (priorityConfig[r.priority] ?? { bg: "rgba(10,22,40,0.06)", text: "#334155", dot: "#64748b" }).text,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: (priorityConfig[r.priority] ?? { dot: "#64748b" }).dot }} />
                        {r.priority}
                      </span>
                    </div>
                    <p className="text-sm truncate" style={{ color: "#64748b" }}>{r.request}</p>
                    <p className="text-xs mt-1" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                      {r.assigned} · {r.date}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-10 text-sm" style={{ color: "#64748b" }}>
                No recent prayer requests have been added yet.
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div
          className="animate-fade-up delay-300 rounded-2xl border bg-white overflow-hidden"
          style={{ borderColor: "rgba(10,22,40,0.07)", boxShadow: "0 2px 12px rgba(10,22,40,0.05)" }}
        >
          <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(10,22,40,0.06)" }}>
            <h2 className="text-base font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>
              Upcoming Sessions
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {hasSessionData ? (
              upcomingSessions.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 border-l-2 transition-all hover:shadow-sm cursor-default"
                  style={{
                    background: s.urgent ? "rgba(139,0,0,0.04)" : "#f8faff",
                    borderLeftColor: s.urgent ? "#8b0000" : "#0a1628",
                    border: `1px solid rgba(10,22,40,0.06)`,
                    borderLeftWidth: "3px",
                  }}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-bold leading-tight" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628", maxWidth: "75%" }}>
                      {s.title}
                    </p>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium shrink-0"
                      style={{ background: "rgba(10,22,40,0.06)", color: "#0a1628", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {s.day}
                    </span>
                  </div>
                  <p className="text-xs font-semibold mb-1" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>{s.time}</p>
                  <p className="text-xs" style={{ color: "#64748b" }}>{s.lead}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <div className="flex -space-x-1">
                      {[...Array(Math.min(s.count, 4))].map((_, j) => (
                        <div key={j} className="w-5 h-5 rounded-full border-2 border-white" style={{ background: `hsl(${j * 40 + 200},40%,30%)` }} />
                      ))}
                    </div>
                    <span className="text-xs ml-1" style={{ color: "#94a3b8" }}>{s.count} intercessors</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-sm" style={{ color: "#64748b" }}>
                No scheduled prayer sessions are available yet.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
