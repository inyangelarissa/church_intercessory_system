import { useState, useEffect } from "react";
import { api, errorMessage, isSenior, type AuthUser } from "../lib/api";

type Priority = "Urgent" | "High" | "Normal";
type Status = "Open" | "Assigned" | "In Prayer" | "Completed";

interface Request {
  id: number; name: string; contact: string; request: string;
  category: string; priority: Priority; status: Status;
  date: string; assigned: string; assignedIntercessorId?: number | null; notes: string; testimony?: string | null; initials: string;
}

interface IntercessorOption {
  id: number;
  name: string;
  status: "Active" | "Inactive";
}

const priorityConfig: Record<Priority, { bg: string; text: string; border: string; dot: string }> = {
  Urgent: { bg: "rgba(139,0,0,0.09)", text: "#8b0000", border: "rgba(139,0,0,0.25)", dot: "#8b0000" },
  High:   { bg: "rgba(180,83,9,0.09)",  text: "#b45309", border: "rgba(180,83,9,0.25)",  dot: "#d97706" },
  Normal: { bg: "rgba(10,22,40,0.05)",  text: "#334155", border: "rgba(10,22,40,0.12)",  dot: "#94a3b8" },
};

const statusConfig: Record<Status, { bg: string; text: string }> = {
  Open:        { bg: "rgba(100,116,139,0.1)", text: "#475569" },
  Assigned:    { bg: "rgba(10,22,40,0.08)",   text: "#0a1628" },
  "In Prayer": { bg: "rgba(139,0,0,0.09)",    text: "#8b0000" },
  Completed:   { bg: "rgba(21,128,61,0.09)",  text: "#15803d" },
};

const categories = ["All", "Healing", "Guidance", "Family", "Finances", "Mental Health", "Pregnancy", "Salvation", "Other"];
const statuses: Status[] = ["Open", "Assigned", "In Prayer", "Completed"];

export default function PrayerRequests({ user }: { user: AuthUser | null }) {
  const senior = isSenior(user);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [intercessors, setIntercessors] = useState<IntercessorOption[]>([]);
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selected, setSelected] = useState<Request | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressStatus, setProgressStatus] = useState<Status>("Open");
  const [progressNotes, setProgressNotes] = useState("");
  const [testimony, setTestimony] = useState("");

  useEffect(() => {
    api.prayerRequests.list()
      .then((rows) => setRequests(rows as Request[]))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  // Only the Senior Intercessor assigns requests, so only they need the roster.
  useEffect(() => {
    if (!senior) return;
    api.intercessors.list()
      .then((rows) => setIntercessors(rows as IntercessorOption[]))
      .catch((e) => setError(errorMessage(e)));
  }, [senior]);

  const filtered = requests.filter(r =>
    (catFilter === "All" || r.category === catFilter) &&
    (statusFilter === "All" || r.status === statusFilter)
  );

  async function assignRequest(intercessorId: string) {
    if (!selected || !senior) return;
    setError("");
    const assignedIntercessorId = intercessorId ? Number(intercessorId) : null;
    try {
      const updated = await api.prayerRequests.update(selected.id, {
        assignedIntercessorId,
        status: assignedIntercessorId ? "Assigned" : "Open",
      }) as Request;
      setRequests((prev) => prev.map(item => item.id === updated.id ? updated : item));
      setSelected(updated);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function openRequest(request: Request) {
    setSelected(request);
    setProgressStatus(request.status);
    setProgressNotes(request.notes || "");
    setTestimony(request.testimony || "");
  }

  async function saveProgress() {
    if (!selected || (progressStatus === "Completed" && !testimony.trim())) return;
    setSavingProgress(true);
    setError("");
    try {
      const updated = await api.prayerRequests.update(selected.id, {
        status: progressStatus,
        notes: progressNotes,
        testimony: testimony.trim(),
      }) as Request;
      setRequests((prev) => prev.map(item => item.id === updated.id ? updated : item));
      setSelected(updated);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSavingProgress(false);
    }
  }

  const inputStyle: React.CSSProperties = { background: "#f8faff", border: "1px solid rgba(10,22,40,0.12)", color: "#0a1628", borderRadius: 10, padding: "10px 14px", fontSize: 14, width: "100%", outline: "none", fontFamily: "'Outfit', sans-serif" };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>Module 01</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>{senior ? "Prayer Requests" : "My Assigned Prayer Requests"}</h1>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>{loading ? "Loading…" : senior ? `${requests.length} total requests recorded` : `${requests.length} request${requests.length === 1 ? "" : "s"} assigned to you`}</p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(139,0,0,0.08)", color: "#8b0000" }}>{error}</p>
      )}

      {/* Filters */}
      <div className="animate-fade-up delay-100 flex flex-col sm:flex-row flex-wrap gap-y-3 gap-x-2 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: catFilter === c ? "#0a1628" : "#fff", color: catFilter === c ? "#fff" : "#64748b", border: `1px solid ${catFilter === c ? "#0a1628" : "rgba(10,22,40,0.1)"}` }}
            >{c}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {["All", ...statuses].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: statusFilter === s ? "#8b0000" : "#fff", color: statusFilter === s ? "#fff" : "#64748b", border: `1px solid ${statusFilter === s ? "#8b0000" : "rgba(10,22,40,0.1)"}` }}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="animate-fade-up delay-200 rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "rgba(10,22,40,0.07)", boxShadow: "0 2px 12px rgba(10,22,40,0.05)" }}>
        <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 720 }}>
          <thead>
            <tr style={{ background: "#f8faff", borderBottom: "1px solid rgba(10,22,40,0.07)" }}>
              {["Congregant", "Request", "Category", "Priority", "Status", "Assigned To", "Date"].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr
                key={r.id}
                onClick={() => { if (selected?.id === r.id) { setSelected(null); } else { openRequest(r); } }}
                className="cursor-pointer transition-colors hover:bg-slate-50 border-b"
                style={{ borderColor: "rgba(10,22,40,0.04)", background: selected?.id === r.id ? "rgba(139,0,0,0.03)" : "transparent", animationDelay: `${i * 40}ms` }}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#0a1628", color: "#fff", fontFamily: "'Cinzel', serif" }}>
                      {r.initials}
                    </div>
                    <span className="font-medium" style={{ color: "#0a1628" }}>{r.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 max-w-xs"><p className="truncate text-sm" style={{ color: "#64748b" }}>{r.request}</p></td>
                <td className="px-5 py-4"><span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(10,22,40,0.06)", color: "#0a1628" }}>{r.category}</span></td>
                <td className="px-5 py-4">
                  <span className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1 w-fit border font-medium" style={{ background: priorityConfig[r.priority].bg, color: priorityConfig[r.priority].text, borderColor: priorityConfig[r.priority].border }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: priorityConfig[r.priority].dot }} />
                    {r.priority}
                  </span>
                </td>
                <td className="px-5 py-4"><span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: statusConfig[r.status].bg, color: statusConfig[r.status].text }}>{r.status}</span></td>
                <td className="px-5 py-4 text-sm" style={{ color: r.assigned === "Unassigned" ? "#94a3b8" : "#334155" }}>{r.assigned}</td>
                <td className="px-5 py-4 text-xs" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="px-6 py-10 text-sm" style={{ color: "#64748b" }}>
            {requests.length === 0
              ? (senior ? "No prayer requests yet. Requests submitted from the home page will appear here." : "Nothing has been assigned to you yet. The Senior Intercessor will assign prayer requests to you.")
              : "No requests match the selected filters."}
          </p>
        )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="animate-scale-in rounded-2xl border p-4 sm:p-6" style={{ background: "#fff", borderColor: "rgba(139,0,0,0.25)", boxShadow: "0 8px 32px rgba(10,22,40,0.08)" }}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0" style={{ background: "#0a1628", color: "#fff", fontFamily: "'Cinzel', serif" }}>{selected.initials}</div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold truncate" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>{selected.name}</h3>
                <p className="text-sm" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{selected.contact}</p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="self-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-slate-100 shrink-0" style={{ color: "#64748b", border: "1px solid rgba(10,22,40,0.1)" }}>✕ Close</button>
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "#334155" }}>{selected.request}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Progress status</label>
              <select value={progressStatus} onChange={e => setProgressStatus(e.target.value as Status)} style={inputStyle}>
                {statuses.filter(status => senior || status !== "Open").map(status => <option key={status}>{status}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Progress update</label>
              <textarea value={progressNotes} onChange={e => setProgressNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="Record follow-up or progress..." />
            </div>
          </div>
          {senior ? (
            <div className="max-w-sm mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Assign to intercessor</label>
              <select
                value={selected.assignedIntercessorId ?? ""}
                onChange={e => assignRequest(e.target.value)}
                style={inputStyle}
              >
                <option value="">Unassigned</option>
                {intercessors.filter(intercessor => intercessor.status === "Active" || intercessor.id === selected.assignedIntercessorId).map(intercessor => (
                  <option key={intercessor.id} value={intercessor.id}>
                    {intercessor.name}{intercessor.status === "Inactive" ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm mb-4" style={{ color: "#64748b" }}>Assigned to you by the Senior Intercessor.</p>
          )}
          {progressStatus === "Completed" && (
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Testimony *</label>
              <textarea value={testimony} onChange={e => setTestimony(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Record the testimony received..." />
            </div>
          )}
          <button onClick={saveProgress} disabled={savingProgress || (progressStatus === "Completed" && !testimony.trim())} className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60" style={{ background: "#8b0000", color: "#fff" }}>
            {savingProgress ? "Saving..." : "Save progress"}
          </button>
          {selected.notes && (
            <div className="px-4 py-3 rounded-xl border-l-2 text-sm" style={{ background: "rgba(139,0,0,0.04)", borderLeftColor: "#8b0000", color: "#64748b" }}>
              <span className="font-semibold text-xs uppercase tracking-wide" style={{ color: "#8b0000" }}>Notes: </span>{selected.notes}
            </div>
          )}
          {selected.testimony && (
            <div className="mt-4 px-4 py-3 rounded-xl border-l-2 text-sm" style={{ background: "rgba(21,128,61,0.05)", borderLeftColor: "#15803d", color: "#334155" }}>
              <span className="font-semibold text-xs uppercase tracking-wide" style={{ color: "#15803d" }}>Testimony: </span>{selected.testimony}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
