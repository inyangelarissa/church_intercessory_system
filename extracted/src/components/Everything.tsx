import { useEffect, useMemo, useState } from "react";
import { api, errorMessage, isSenior, type AuthUser } from "../lib/api";

interface PrayerRequest {
  id: number;
  name: string;
  contact?: string | null;
  request: string;
  category: string;
  priority: string;
  status: string;
  date: string;
  assigned: string;
  notes?: string | null;
  testimony?: string | null;
}

function csvValue(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map(row => row.map(csvValue).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Everything({ user }: { user: AuthUser | null }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadReportData() {
    if (!isSenior(user)) return;
    setLoading(true);
    setError("");
    api.reports.all()
      .then(data => {
        setUsers(data.users);
        setRequests(data.prayerRequests as PrayerRequest[]);
      })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isSenior(user)) {
      setLoading(false);
      return;
    }
    loadReportData();
  }, [user]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredUsers = useMemo(() => users.filter(item =>
    !normalizedQuery || [item.name, item.email, item.phone, item.role].some(value => String(value ?? "").toLowerCase().includes(normalizedQuery))
  ), [users, normalizedQuery]);
  const filteredRequests = useMemo(() => requests.filter(item =>
    !normalizedQuery || [item.name, item.contact, item.request, item.category, item.priority, item.status, item.assigned].some(value => String(value ?? "").toLowerCase().includes(normalizedQuery))
  ), [requests, normalizedQuery]);

  function downloadUsers() {
    downloadCsv("erc-masoro-users.csv", ["ID", "Name", "Email", "Phone", "Role", "Joined"],
      users.map(item => [item.id, item.name, item.email, item.phone, item.role, item.created_at]));
  }

  function downloadRequests() {
    downloadCsv("erc-masoro-prayer-requests.csv", ["ID", "Name", "Contact", "Request", "Category", "Priority", "Status", "Date", "Assigned To", "Notes", "Testimony"],
      requests.map(item => [item.id, item.name, item.contact, item.request, item.category, item.priority, item.status, item.date, item.assigned, item.notes, item.testimony]));
  }

  if (!isSenior(user)) {
    return <div className="max-w-3xl mx-auto rounded-2xl border bg-white p-8 text-center" style={{ borderColor: "rgba(10,22,40,0.08)" }}>
      <h1 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Everything</h1>
      <p className="mt-2 text-sm" style={{ color: "#64748b" }}>This page is available to the Senior Intercessor.</p>
    </div>;
  }

  const inputStyle: React.CSSProperties = { background: "#fff", border: "1px solid rgba(10,22,40,0.12)", color: "#0a1628", borderRadius: 10, padding: "11px 14px 11px 40px", fontSize: 14, width: "100%", outline: "none" };
  const buttonStyle: React.CSSProperties = { background: "#0a1628", color: "#fff", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600 };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>Senior tools</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Reports</h1>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>Generate downloadable reports for all users and prayer requests.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadReportData} disabled={loading} style={{ ...buttonStyle, background: "#fff", color: "#0a1628", border: "1px solid rgba(10,22,40,0.12)" }} className="disabled:opacity-50">Refresh Data</button>
          <button onClick={downloadUsers} disabled={loading} style={buttonStyle} className="disabled:opacity-50">Download Users CSV</button>
          <button onClick={downloadRequests} disabled={loading} style={{ ...buttonStyle, background: "#8b0000" }} className="disabled:opacity-50">Download Requests CSV</button>
        </div>
      </div>

      {error && <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(139,0,0,0.08)", color: "#8b0000" }}>{error}</p>}

      <div className="relative animate-fade-up delay-100">
        <svg className="absolute left-3 top-3.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
        <input value={query} onChange={event => setQuery(event.target.value)} style={inputStyle} placeholder="Search users, emails, roles, requests, categories, statuses..." aria-label="Search everything" />
      </div>

      <section className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "rgba(10,22,40,0.07)" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(10,22,40,0.07)" }}>
          <div><h2 className="font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Users</h2><p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{loading ? "Loading..." : `${filteredUsers.length} of ${users.length} users`}</p></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 650 }}>
            <thead><tr style={{ background: "#f8faff" }}>{["Name", "Email", "Phone", "Role", "Joined"].map(header => <th key={header} className="text-left px-5 py-3 text-xs uppercase tracking-wider" style={{ color: "#64748b" }}>{header}</th>)}</tr></thead>
            <tbody>{filteredUsers.map(item => <tr key={item.id} className="border-t" style={{ borderColor: "rgba(10,22,40,0.05)" }}><td className="px-5 py-3 font-medium">{item.name}</td><td className="px-5 py-3">{item.email}</td><td className="px-5 py-3">{item.phone || "—"}</td><td className="px-5 py-3">{item.role}</td><td className="px-5 py-3">{item.created_at || "—"}</td></tr>)}</tbody>
          </table>
          {!loading && filteredUsers.length === 0 && <p className="p-6 text-sm text-center" style={{ color: "#64748b" }}>No users match your search.</p>}
        </div>
      </section>

      <section className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "rgba(10,22,40,0.07)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(10,22,40,0.07)" }}><h2 className="font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Prayer Requests</h2><p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{loading ? "Loading..." : `${filteredRequests.length} of ${requests.length} requests`}</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 900 }}>
            <thead><tr style={{ background: "#f8faff" }}>{["Name", "Request", "Category", "Priority", "Status", "Assigned To", "Date"].map(header => <th key={header} className="text-left px-5 py-3 text-xs uppercase tracking-wider" style={{ color: "#64748b" }}>{header}</th>)}</tr></thead>
            <tbody>{filteredRequests.map(item => <tr key={item.id} className="border-t" style={{ borderColor: "rgba(10,22,40,0.05)" }}><td className="px-5 py-3 font-medium">{item.name}</td><td className="px-5 py-3 max-w-xs truncate">{item.request}</td><td className="px-5 py-3">{item.category}</td><td className="px-5 py-3">{item.priority}</td><td className="px-5 py-3">{item.status}</td><td className="px-5 py-3">{item.assigned}</td><td className="px-5 py-3">{item.date}</td></tr>)}</tbody>
          </table>
          {!loading && filteredRequests.length === 0 && <p className="p-6 text-sm text-center" style={{ color: "#64748b" }}>No prayer requests match your search.</p>}
        </div>
      </section>
    </div>
  );
}
