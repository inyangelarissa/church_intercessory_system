import { useState, useEffect } from "react";
import { api, isOfflineMode } from "../lib/api";

interface Intercessor {
  id: number; name: string; role: string; phone: string; email: string;
  status: "Active" | "Inactive"; specialization: string[];
  assignedRequests: number; completedPrayers: number;
  joinedDate: string; availability: string[]; initials: string;
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const roleColors = ["#8b0000", "#0a1628", "#163058", "#5a0000", "#102447", "#64748b"];

export default function Intercessors() {
  const [data, setData] = useState<Intercessor[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [selected, setSelected] = useState<Intercessor | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: "", phone: "", email: "", role: "Intercessor", availability: [] as string[] });

  useEffect(() => {
    api.intercessors.list()
      .then((rows) => setData(rows as Intercessor[]))
      .catch(() => setOffline(isOfflineMode()))
      .finally(() => setLoading(false));
  }, []);

  const filtered = statusFilter === "All" ? data : data.filter(i => i.status === statusFilter);

  const inputStyle: React.CSSProperties = { background: "#f8faff", border: "1px solid rgba(10,22,40,0.12)", color: "#0a1628", borderRadius: 10, padding: "10px 14px", fontSize: 14, width: "100%", outline: "none" };

  async function submitIntercessor() {
    if (!newPerson.name.trim()) return;
    setSubmitting(true);
    try {
      const created = await api.intercessors.create({
        ...newPerson,
        specialization: [],
        availability: newPerson.availability,
      });
      setData((prev) => [created as Intercessor, ...prev]);
    } catch {
      setOffline(true);
    } finally {
      setSubmitting(false);
      setNewPerson({ name: "", phone: "", email: "", role: "Intercessor", availability: [] });
      setShowAdd(false);
    }
  }

  async function toggleStatus(person: Intercessor) {
    const status = person.status === "Active" ? "Inactive" : "Active";
    try {
      const updated = await api.intercessors.updateStatus(person.id, status) as Intercessor;
      setData((prev) => prev.map(item => item.id === updated.id ? updated : item));
      setSelected((current) => current?.id === updated.id ? updated : current);
    } catch {
      setOffline(true);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>Module 02</p>
            {offline && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(180,83,9,0.1)", color: "#b45309" }}>Demo data — API not connected</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Intercessors</h1>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
            {loading ? "Loading…" : `${data.filter(i => i.status === "Active").length} active · ${data.length} total registered`}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 hover:shadow-lg w-full sm:w-auto"
          style={{ background: "#8b0000", color: "#fff", boxShadow: "0 4px 18px rgba(139,0,0,0.3)" }}
        >
          + Register Intercessor
        </button>
      </div>

      {showAdd && (
        <div className="animate-scale-in rounded-2xl border bg-white p-6 space-y-4" style={{ borderColor: "rgba(139,0,0,0.2)", boxShadow: "0 8px 32px rgba(10,22,40,0.08)" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-5 rounded-full" style={{ background: "#8b0000" }} />
            <h3 className="font-bold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Register New Intercessor</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Full Name *</label><input value={newPerson.name} onChange={e => setNewPerson({ ...newPerson, name: e.target.value })} style={inputStyle} placeholder="Full name" /></div>
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Phone</label><input value={newPerson.phone} onChange={e => setNewPerson({ ...newPerson, phone: e.target.value })} style={inputStyle} placeholder="+250 7XX XXX XXX" /></div>
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Email</label><input value={newPerson.email} onChange={e => setNewPerson({ ...newPerson, email: e.target.value })} style={inputStyle} placeholder="email@ercmasoro.org" /></div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Role</label>
              <select value={newPerson.role} onChange={e => setNewPerson({ ...newPerson, role: e.target.value })} style={inputStyle}>
                {["Intercessor", "Senior Intercessor", "Prayer Leader", "Junior Intercessor", "Deacon / Intercessor"].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "#64748b" }}>Available days</label>
            <div className="flex flex-wrap gap-2">
              {days.map(day => {
                const selected = newPerson.availability.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setNewPerson({
                      ...newPerson,
                      availability: selected
                        ? newPerson.availability.filter(item => item !== day)
                        : [...newPerson.availability, day],
                    })}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                    style={{
                      background: selected ? "#0a1628" : "#fff",
                      color: selected ? "#fff" : "#64748b",
                      borderColor: selected ? "#0a1628" : "rgba(10,22,40,0.12)",
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={submitIntercessor} disabled={submitting} className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60" style={{ background: "#8b0000", color: "#fff" }}>
              {submitting ? "Registering..." : "Register"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors" style={{ color: "#64748b", border: "1px solid rgba(10,22,40,0.1)" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="animate-fade-up delay-100 flex gap-2">
        {["All", "Active", "Inactive"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: statusFilter === s ? "#0a1628" : "#fff", color: statusFilter === s ? "#fff" : "#64748b", border: `1px solid ${statusFilter === s ? "#0a1628" : "rgba(10,22,40,0.1)"}` }}
          >{s}</button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((person, i) => (
          <div
            key={person.id}
            onClick={() => setSelected(selected?.id === person.id ? null : person)}
            className="card-hover animate-fade-up rounded-2xl border bg-white p-6 cursor-pointer"
            style={{
              borderColor: selected?.id === person.id ? "#8b0000" : "rgba(10,22,40,0.07)",
              boxShadow: selected?.id === person.id ? "0 8px 32px rgba(139,0,0,0.12)" : "0 2px 12px rgba(10,22,40,0.05)",
              animationDelay: `${i * 70}ms`,
            }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: person.status === "Active" ? "#0a1628" : "rgba(10,22,40,0.08)", color: person.status === "Active" ? "#fff" : "#94a3b8", fontFamily: "'Cinzel', serif" }}
              >
                {person.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>{person.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{person.role}</p>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
                style={person.status === "Active" ? { background: "rgba(21,128,61,0.1)", color: "#15803d" } : { background: "rgba(100,116,139,0.1)", color: "#64748b" }}
              >
                {person.status}
              </span>
            </div>

            {/* Stats */}
            <div className="flex rounded-xl overflow-hidden mb-4 border" style={{ borderColor: "rgba(10,22,40,0.07)" }}>
              <div className="flex-1 py-3 text-center border-r" style={{ borderColor: "rgba(10,22,40,0.07)" }}>
                <p className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>{person.assignedRequests}</p>
                <p className="text-xs" style={{ color: "#94a3b8" }}>Assigned</p>
              </div>
              <div className="flex-1 py-3 text-center">
                <p className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#8b0000" }}>{person.completedPrayers}</p>
                <p className="text-xs" style={{ color: "#94a3b8" }}>Completed</p>
              </div>
            </div>

            {/* Specializations */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {person.specialization.map((s, j) => (
                <span key={s} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: j % 2 === 0 ? "rgba(139,0,0,0.08)" : "rgba(10,22,40,0.06)", color: j % 2 === 0 ? "#8b0000" : "#334155" }}>
                  {s}
                </span>
              ))}
            </div>

            {/* Availability */}
            <div>
              <p className="text-xs mb-1.5" style={{ color: "#94a3b8" }}>Availability</p>
              <div className="flex gap-1">
                {days.map(d => (
                  <div key={d} className="flex-1 py-1.5 rounded-lg text-center" style={{ background: person.availability.includes(d) ? "#0a1628" : "rgba(10,22,40,0.04)", fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: person.availability.includes(d) ? "#fff" : "#c8d5e8", fontWeight: person.availability.includes(d) ? 600 : 400 }}>
                    {d[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail */}
      {selected && (
        <div className="animate-scale-in rounded-2xl border p-4 sm:p-6" style={{ background: "#fff", borderColor: "rgba(139,0,0,0.25)", boxShadow: "0 8px 32px rgba(10,22,40,0.08)" }}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-base font-bold shrink-0" style={{ background: "#0a1628", color: "#fff", fontFamily: "'Cinzel', serif" }}>{selected.initials}</div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold truncate" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>{selected.name}</h3>
                <p className="text-sm" style={{ color: "#8b0000" }}>{selected.role}</p>
                <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>Joined {selected.joinedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start">
              <button
                onClick={() => toggleStatus(selected)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  color: selected.status === "Active" ? "#b45309" : "#15803d",
                  border: `1px solid ${selected.status === "Active" ? "rgba(180,83,9,0.25)" : "rgba(21,128,61,0.25)"}`,
                  background: selected.status === "Active" ? "rgba(180,83,9,0.06)" : "rgba(21,128,61,0.06)",
                }}
              >
                {selected.status === "Active" ? "Mark inactive" : "Mark active"}
              </button>
              <button onClick={() => setSelected(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 transition-colors shrink-0" style={{ color: "#64748b", border: "1px solid rgba(10,22,40,0.1)" }}>✕ Close</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[{ label: "Phone", value: selected.phone }, { label: "Email", value: selected.email }, { label: "Status", value: selected.status }, { label: "Prayers Done", value: selected.completedPrayers.toString() }].map(item => (
              <div key={item.label} className="p-3 rounded-xl" style={{ background: "#f8faff" }}>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</p>
                <p className="font-semibold text-sm" style={{ color: "#0a1628" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
