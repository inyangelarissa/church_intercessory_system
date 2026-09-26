import { useState, useEffect } from "react";
import { api, isOfflineMode } from "../lib/api";

interface Session {
  id: number; title: string; day: string; time: string; duration: string;
  lead: string; venue: string; focus: string; intercessors: string[]; recurrence: string;
}

const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const focusDot: Record<string, string> = {
  "National & Government": "#0a1628",
  "Healing & Deliverance": "#8b0000",
  "Congregation Requests": "#b45309",
  "Families & Marriages": "#15803d",
  "Salvation & Missions": "#7c3aed",
  "Warfare & Breakthrough": "#8b0000",
  "Corporate Intercession": "#c2410c",
  "Sunday Service Covering": "#0a1628",
};

export default function Schedule() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [view, setView] = useState<"week" | "list">("week");
  const [selected, setSelected] = useState<Session | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newSession, setNewSession] = useState({ title: "", day: "Monday", time: "", duration: "1 hr", venue: "Main Sanctuary", focus: "Congregation Requests" });

  useEffect(() => {
    api.schedule.list()
      .then((rows) => setSessions(rows as Session[]))
      .catch(() => setOffline(isOfflineMode()))
      .finally(() => setLoading(false));
  }, []);

  const byDay = dayOrder.map(day => ({ day, sessions: sessions.filter(s => s.day === day) }));
  const inputStyle: React.CSSProperties = { background: "#f8faff", border: "1px solid rgba(10,22,40,0.12)", color: "#0a1628", borderRadius: 10, padding: "10px 14px", fontSize: 14, width: "100%", outline: "none" };

  async function submitSession() {
    if (!newSession.title.trim() || !newSession.time.trim()) return;
    setSubmitting(true);
    try {
      const created = await api.schedule.create(newSession);
      setSessions((prev) => [...prev, created as Session]);
    } catch {
      setOffline(true);
    } finally {
      setSubmitting(false);
      setNewSession({ title: "", day: "Monday", time: "", duration: "1 hr", venue: "Main Sanctuary", focus: "Congregation Requests" });
      setShowAdd(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>Module 03</p>
            {offline && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(180,83,9,0.1)", color: "#b45309" }}>Demo data — API not connected</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Prayer Schedule</h1>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>{loading ? "Loading…" : `${sessions.length} sessions scheduled this week`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["week", "list"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all"
              style={{ background: view === v ? "#0a1628" : "#fff", color: view === v ? "#fff" : "#64748b", border: `1px solid ${view === v ? "#0a1628" : "rgba(10,22,40,0.1)"}` }}
            >{v} view</button>
          ))}
          <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105" style={{ background: "#8b0000", color: "#fff" }}>
            + Add Session
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="animate-scale-in rounded-2xl border bg-white p-6 space-y-4" style={{ borderColor: "rgba(139,0,0,0.2)", boxShadow: "0 8px 32px rgba(10,22,40,0.08)" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-5 rounded-full" style={{ background: "#8b0000" }} />
            <h3 className="font-bold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Schedule New Session</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Session Title *</label><input value={newSession.title} onChange={e => setNewSession({ ...newSession, title: e.target.value })} style={inputStyle} placeholder="e.g. Thursday Youth Watch" /></div>
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Time *</label><input value={newSession.time} onChange={e => setNewSession({ ...newSession, time: e.target.value })} style={inputStyle} placeholder="e.g. 6:00 PM" /></div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Day</label>
              <select value={newSession.day} onChange={e => setNewSession({ ...newSession, day: e.target.value })} style={inputStyle}>
                {dayOrder.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Duration</label><input value={newSession.duration} onChange={e => setNewSession({ ...newSession, duration: e.target.value })} style={inputStyle} placeholder="e.g. 1.5 hrs" /></div>
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Venue</label><input value={newSession.venue} onChange={e => setNewSession({ ...newSession, venue: e.target.value })} style={inputStyle} placeholder="e.g. Prayer Room A" /></div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Focus</label>
              <select value={newSession.focus} onChange={e => setNewSession({ ...newSession, focus: e.target.value })} style={inputStyle}>
                {Object.keys(focusDot).map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={submitSession} disabled={submitting} className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60" style={{ background: "#8b0000", color: "#fff" }}>
              {submitting ? "Scheduling..." : "Schedule Session"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors" style={{ color: "#64748b", border: "1px solid rgba(10,22,40,0.1)" }}>Cancel</button>
          </div>
        </div>
      )}

      {view === "week" ? (
        <div className="animate-fade-up delay-100 overflow-x-auto pb-2">
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(7, minmax(120px, 1fr))", minWidth: 700 }}>
          {byDay.map(({ day, sessions: daySessions }, di) => (
            <div key={day} className="animate-fade-up" style={{ animationDelay: `${di * 50}ms` }}>
              <div className="text-center py-2 mb-2 rounded-xl text-xs font-bold uppercase tracking-wide" style={{ background: "#0a1628", color: "#fff", fontFamily: "'Cinzel', serif" }}>
                {day.slice(0, 3)}
              </div>
              <div className="space-y-2">
                {daySessions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setSelected(selected?.id === s.id ? null : s)}
                    className="p-3 rounded-xl cursor-pointer transition-all hover:shadow-md border-l-2"
                    style={{
                      background: selected?.id === s.id ? "rgba(139,0,0,0.06)" : "#fff",
                      border: `1px solid ${selected?.id === s.id ? "rgba(139,0,0,0.25)" : "rgba(10,22,40,0.07)"}`,
                      borderLeftColor: focusDot[s.focus] || "#0a1628",
                      borderLeftWidth: "3px",
                      boxShadow: "0 1px 4px rgba(10,22,40,0.05)",
                    }}
                  >
                    <p className="text-xs font-bold leading-tight mb-1" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628", fontSize: "10px" }}>{s.title}</p>
                    <p className="font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>{s.time}</p>
                    <p style={{ color: "#94a3b8", fontSize: "10px" }}>{s.duration}</p>
                  </div>
                ))}
                {daySessions.length === 0 && (
                  <div className="py-8 text-center rounded-xl border border-dashed" style={{ borderColor: "rgba(10,22,40,0.1)" }}>
                    <span style={{ color: "#c8d5e8", fontSize: "18px" }}>—</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        </div>
      ) : (
        <div className="animate-fade-up delay-100 rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "rgba(10,22,40,0.07)", boxShadow: "0 2px 12px rgba(10,22,40,0.05)" }}>
          <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 680 }}>
            <thead>
              <tr style={{ background: "#f8faff", borderBottom: "1px solid rgba(10,22,40,0.07)" }}>
                {["Session", "Day & Time", "Duration", "Focus", "Lead", "Team", "Recurrence"].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => (
                <tr key={s.id} onClick={() => setSelected(selected?.id === s.id ? null : s)}
                  className="cursor-pointer hover:bg-slate-50 border-b transition-colors"
                  style={{ borderColor: "rgba(10,22,40,0.04)", background: selected?.id === s.id ? "rgba(139,0,0,0.025)" : "transparent", animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-5 py-4">
                    <p className="font-bold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>{s.title}</p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>{s.venue}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium" style={{ color: "#334155" }}>{s.day}</p>
                    <p className="text-xs font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>{s.time}</p>
                  </td>
                  <td className="px-5 py-4 text-xs font-medium" style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>{s.duration}</td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <span className="w-2 h-2 rounded-full" style={{ background: focusDot[s.focus] || "#64748b" }} />
                      <span style={{ color: "#334155" }}>{s.focus}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm" style={{ color: "#334155" }}>{s.lead}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(10,22,40,0.06)", color: "#0a1628", fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.intercessors[0] === "All Intercessors" ? "All" : s.intercessors.length} members
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{s.recurrence}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Detail */}
      {selected && (
        <div className="animate-scale-in rounded-2xl border p-6" style={{ background: "#fff", borderColor: "rgba(139,0,0,0.25)", boxShadow: "0 8px 32px rgba(10,22,40,0.08)" }}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: focusDot[selected.focus] || "#0a1628" }} />
                <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{selected.focus}</p>
              </div>
              <h3 className="text-lg sm:text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>{selected.title}</h3>
              <p className="text-sm mt-0.5" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>{selected.day} · {selected.time} · {selected.duration}</p>
            </div>
            <button onClick={() => setSelected(null)} className="self-start px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 transition-colors shrink-0" style={{ color: "#64748b", border: "1px solid rgba(10,22,40,0.1)" }}>✕ Close</button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            {[{ label: "Venue", value: selected.venue }, { label: "Lead", value: selected.lead }, { label: "Recurrence", value: selected.recurrence }, { label: "Team Size", value: `${selected.intercessors.length === 1 && selected.intercessors[0] === "All Intercessors" ? "All" : selected.intercessors.length} intercessors` }].map(item => (
              <div key={item.label} className="p-3 rounded-xl" style={{ background: "#f8faff" }}>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</p>
                <p className="font-semibold text-sm" style={{ color: "#0a1628" }}>{item.value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide mb-2.5" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Assigned Intercessors</p>
            <div className="flex flex-wrap gap-2">
              {selected.intercessors.map(name => (
                <span key={name} className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: "rgba(10,22,40,0.06)", color: "#0a1628" }}>{name}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
