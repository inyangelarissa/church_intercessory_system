import { useEffect, useMemo, useState } from "react";
import { api, errorMessage, isSenior, type AuthUser, type ReportData } from "../lib/api";
import { matchesQuery } from "../lib/search";
import {
  countBy, countInOrder, downloadCsv, formatDate, inRange, parseDate, rangeFor, todayStamp,
  RANGE_LABELS, type RangePreset,
} from "../lib/reports";
import SearchInput from "./SearchInput";

type ReportType = "requests" | "testimonies" | "intercessors" | "schedule" | "activity" | "users";
type Cell = string | number;

interface Filters {
  preset: RangePreset; from: string; to: string;
  status: string; category: string; priority: string; assigned: string;
  day: string; outcome: string; role: string; q: string;
}

interface Stat { label: string; value: string | number; hint?: string; tone?: "red" | "navy" | "green" }
interface Breakdown { title: string; items: { label: string; count: number }[] }
interface Built {
  title: string;
  description: string;
  stats: Stat[];
  breakdowns: Breakdown[];
  headers: string[];
  rows: Cell[][];
  wide: number[];                 // columns that hold long text and should wrap
  csvHeaders: string[];
  csvRows: Cell[][];
  filename: string;
  emptyText: string;
  applied: string[];              // human-readable list of active filters, printed on the report
}

const ALL = "All";
const STATUSES = ["Open", "Assigned", "In Prayer", "Completed"];
const PRIORITIES = ["Urgent", "High", "Normal"];
const CATEGORIES = ["Healing", "Guidance", "Family", "Finances", "Mental Health", "Pregnancy", "Salvation", "Other"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const OUTCOMES = ["Fruitful", "Regular", "Incomplete"];
const BAR_COLORS = ["#8b0000", "#0a1628", "#b45309", "#15803d", "#7c3aed", "#163058"];

const EMPTY_FILTERS: Filters = {
  preset: "all", from: "", to: "", status: ALL, category: ALL, priority: ALL, assigned: ALL,
  day: ALL, outcome: ALL, role: ALL, q: "",
};

const dash = (value: string | null | undefined) => (value && value.trim() ? value : "—");

function rangeText(f: Filters): string {
  if (f.preset !== "custom") return RANGE_LABELS[f.preset];
  if (f.from && f.to) return `${formatDate(parseDate(f.from))} to ${formatDate(parseDate(f.to))}`;
  if (f.from) return `From ${formatDate(parseDate(f.from))}`;
  if (f.to) return `Up to ${formatDate(parseDate(f.to))}`;
  return "All time";
}

/** Turns the raw data and the chosen filters into everything a report shows (and exports). */
function buildReport(type: ReportType, data: ReportData, f: Filters): Built {
  const range = rangeFor(f.preset, f.from, f.to);
  const dateApplied = f.preset !== "all" ? [`Date: ${rangeText(f)}`] : [];
  const searchApplied = f.q.trim() ? [`Search: “${f.q.trim()}”`] : [];
  const pick = (label: string, value: string) => (value !== ALL ? [`${label}: ${value}`] : []);
  const stamp = todayStamp();

  if (type === "requests") {
    const rows = data.prayerRequests.filter(r =>
      inRange(parseDate(r.date), range) &&
      (f.status === ALL || r.status === f.status) &&
      (f.category === ALL || r.category === f.category) &&
      (f.priority === ALL || r.priority === f.priority) &&
      (f.assigned === ALL || r.assigned === f.assigned) &&
      matchesQuery(f.q, [r.name, r.contact, r.request, r.category, r.priority, r.status, r.assigned, r.notes, r.testimony])
    );
    const completed = rows.filter(r => r.status === "Completed").length;
    return {
      title: "Prayer Requests Report",
      description: "Every prayer request with its category, priority, status and who is praying for it.",
      stats: [
        { label: "Total requests", value: rows.length, tone: "navy" },
        { label: "Completed", value: completed, hint: rows.length ? `${Math.round((completed / rows.length) * 100)}% of requests` : undefined, tone: "green" },
        { label: "In progress", value: rows.filter(r => r.status === "Assigned" || r.status === "In Prayer").length, tone: "navy" },
        { label: "Awaiting assignment", value: rows.filter(r => r.status === "Open" && r.assigned === "Unassigned").length, tone: "red" },
        { label: "Urgent, not completed", value: rows.filter(r => r.priority === "Urgent" && r.status !== "Completed").length, tone: "red" },
        { label: "With testimony", value: rows.filter(r => r.testimony && r.testimony.trim()).length, tone: "green" },
      ],
      breakdowns: [
        { title: "By status", items: countInOrder(rows, STATUSES, r => r.status) },
        { title: "By category", items: countBy(rows, r => r.category) },
        { title: "By priority", items: countInOrder(rows, PRIORITIES, r => r.priority) },
      ],
      headers: ["Date", "Name", "Category", "Priority", "Status", "Assigned to", "Request"],
      rows: rows.map(r => [r.date, r.name, r.category, r.priority, r.status, r.assigned, r.request]),
      wide: [6],
      csvHeaders: ["ID", "Date", "Name", "Contact", "Category", "Priority", "Status", "Assigned to", "Request", "Notes", "Testimony"],
      csvRows: rows.map(r => [r.id, r.date, r.name, r.contact ?? "", r.category, r.priority, r.status, r.assigned, r.request, r.notes ?? "", r.testimony ?? ""]),
      filename: `erc-masoro-prayer-requests-${stamp}.csv`,
      emptyText: "No prayer requests match these filters.",
      applied: [...dateApplied, ...pick("Status", f.status), ...pick("Category", f.category), ...pick("Priority", f.priority), ...pick("Assigned to", f.assigned), ...searchApplied],
    };
  }

  if (type === "testimonies") {
    const rows = data.prayerRequests.filter(r =>
      !!r.testimony?.trim() &&
      inRange(parseDate(r.date), range) &&
      (f.category === ALL || r.category === f.category) &&
      (f.assigned === ALL || r.assigned === f.assigned) &&
      matchesQuery(f.q, [r.name, r.request, r.category, r.assigned, r.testimony])
    );
    return {
      title: "Testimonies Report",
      description: "Answered prayers: completed requests and the testimonies recorded for them.",
      stats: [
        { label: "Testimonies", value: rows.length, tone: "green" },
        { label: "Categories covered", value: new Set(rows.map(r => r.category)).size, tone: "navy" },
        { label: "Intercessors involved", value: new Set(rows.map(r => r.assigned).filter(a => a !== "Unassigned")).size, tone: "navy" },
      ],
      breakdowns: [
        { title: "By category", items: countBy(rows, r => r.category) },
        { title: "By intercessor", items: countBy(rows, r => r.assigned) },
      ],
      headers: ["Date", "Name", "Category", "Prayed by", "Testimony"],
      rows: rows.map(r => [r.date, r.name, r.category, r.assigned, r.testimony ?? ""]),
      wide: [4],
      csvHeaders: ["ID", "Date", "Name", "Category", "Prayed by", "Request", "Testimony"],
      csvRows: rows.map(r => [r.id, r.date, r.name, r.category, r.assigned, r.request, r.testimony ?? ""]),
      filename: `erc-masoro-testimonies-${stamp}.csv`,
      emptyText: "No testimonies have been recorded yet for these filters.",
      applied: [...dateApplied, ...pick("Category", f.category), ...pick("Prayed by", f.assigned), ...searchApplied],
    };
  }

  if (type === "intercessors") {
    const rows = data.intercessors.filter(i =>
      (f.status === ALL || i.status === f.status) &&
      matchesQuery(f.q, [i.name, i.role, i.email, i.phone, i.specializations, i.availability, i.status])
    );
    const sum = (pickValue: (i: (typeof rows)[number]) => number) => rows.reduce((total, i) => total + pickValue(i), 0);
    return {
      title: data.scope === "mine" ? "My Intercession Report" : "Intercessors Report",
      description: "The prayer team: who is active, how many requests each person carries and how many they have completed.",
      stats: [
        { label: "Intercessors", value: rows.length, tone: "navy" },
        { label: "Active", value: rows.filter(i => i.status === "Active").length, tone: "green" },
        { label: "Inactive", value: rows.filter(i => i.status !== "Active").length, tone: "red" },
        { label: "Open assignments", value: sum(i => i.assignedRequests), tone: "navy" },
        { label: "Prayers completed", value: sum(i => i.completedPrayers), tone: "green" },
        { label: "Testimonies", value: sum(i => i.testimonies), tone: "green" },
      ],
      breakdowns: [
        { title: "Prayers completed (top 8)", items: rows.filter(i => i.completedPrayers > 0).sort((a, b) => b.completedPrayers - a.completedPrayers).slice(0, 8).map(i => ({ label: i.name, count: i.completedPrayers })) },
        { title: "By role", items: countBy(rows, i => i.role) },
      ],
      headers: ["Name", "Role", "Status", "Open", "Completed", "Specializations", "Available", "Joined"],
      rows: rows.map(i => [i.name, i.role, i.status, i.assignedRequests, i.completedPrayers, dash(i.specializations), dash(i.availability), i.joinedDate]),
      wide: [5],
      csvHeaders: ["ID", "Name", "Role", "Status", "Phone", "Email", "Open assignments", "Prayers completed", "Testimonies", "Specializations", "Available days", "Joined"],
      csvRows: rows.map(i => [i.id, i.name, i.role, i.status, i.phone ?? "", i.email ?? "", i.assignedRequests, i.completedPrayers, i.testimonies, i.specializations ?? "", i.availability ?? "", i.joinedDate]),
      filename: `erc-masoro-intercessors-${stamp}.csv`,
      emptyText: "No intercessors match these filters.",
      applied: [...pick("Status", f.status), ...searchApplied],
    };
  }

  if (type === "schedule") {
    const rows = data.sessions.filter(s =>
      (f.day === ALL || s.day === f.day) &&
      matchesQuery(f.q, [s.title, s.day, s.time, s.venue, s.focus, s.lead, s.team, s.recurrence])
    );
    return {
      title: "Prayer Schedule Report",
      description: "Prayer sessions by day and time, with the lead and the team on each one.",
      stats: [
        { label: "Sessions", value: rows.length, tone: "navy" },
        { label: "Days covered", value: new Set(rows.map(s => s.day)).size, hint: "out of 7", tone: "navy" },
        { label: "Focus areas", value: new Set(rows.map(s => s.focus)).size, tone: "navy" },
        { label: "Without a lead", value: rows.filter(s => s.lead === "Unassigned").length, tone: "red" },
      ],
      breakdowns: [
        { title: "Sessions by day", items: countInOrder(rows, DAYS, s => s.day) },
        { title: "By focus", items: countBy(rows, s => s.focus) },
      ],
      headers: ["Session", "Day", "Time", "Duration", "Venue", "Focus", "Lead", "Team"],
      rows: rows.map(s => [s.title, s.day, s.time, s.duration, s.venue, s.focus, s.lead, dash(s.team)]),
      wide: [7],
      csvHeaders: ["ID", "Session", "Day", "Time", "Duration", "Venue", "Focus", "Lead", "Team", "Recurrence"],
      csvRows: rows.map(s => [s.id, s.title, s.day, s.time, s.duration, s.venue, s.focus, s.lead, s.team ?? "", s.recurrence]),
      filename: `erc-masoro-prayer-schedule-${stamp}.csv`,
      emptyText: "No sessions match these filters.",
      applied: [...pick("Day", f.day), ...searchApplied],
    };
  }

  if (type === "activity") {
    const rows = data.activityRecords.filter(a =>
      inRange(parseDate(a.recordDate), range) &&
      (f.outcome === ALL || a.outcome === f.outcome) &&
      matchesQuery(f.q, [a.sessionTitle, a.lead, a.outcome, a.notes, a.recordDate])
    );
    const sum = (pickValue: (a: (typeof rows)[number]) => number) => rows.reduce((total, a) => total + pickValue(a), 0);
    return {
      title: "Session Activity Report",
      description: "What happened in the prayer sessions that were held.",
      stats: [
        { label: "Sessions held", value: rows.length, tone: "navy" },
        { label: "Attendees", value: sum(a => a.attendees), tone: "navy" },
        { label: "Requests covered", value: sum(a => a.requestsCovered), tone: "green" },
        { label: "Testimonies", value: sum(a => a.testimonies), tone: "green" },
      ],
      breakdowns: [{ title: "By outcome", items: countInOrder(rows, OUTCOMES, a => a.outcome) }],
      headers: ["Date", "Session", "Lead", "Attendees", "Requests covered", "Duration", "Outcome", "Notes"],
      rows: rows.map(a => [a.recordDate, a.sessionTitle, a.lead, a.attendees, a.requestsCovered, a.duration, a.outcome, dash(a.notes)]),
      wide: [7],
      csvHeaders: ["ID", "Date", "Session", "Lead", "Attendees", "Requests covered", "Duration", "Outcome", "Testimonies", "Notes"],
      csvRows: rows.map(a => [a.id, a.recordDate, a.sessionTitle, a.lead, a.attendees, a.requestsCovered, a.duration, a.outcome, a.testimonies, a.notes ?? ""]),
      filename: `erc-masoro-session-activity-${stamp}.csv`,
      emptyText: "No session activity matches these filters.",
      applied: [...dateApplied, ...pick("Outcome", f.outcome), ...searchApplied],
    };
  }

  // users
  const rows = data.users.filter(u =>
    inRange(parseDate(u.created_at), range) &&
    (f.role === ALL || u.role === f.role) &&
    matchesQuery(f.q, [u.name, u.email, u.phone, u.role])
  );
  return {
    title: "User Accounts Report",
    description: "People who have a login to the system.",
    stats: [
      { label: "Accounts", value: rows.length, tone: "navy" },
      { label: "Senior Intercessors", value: rows.filter(u => u.role === "Senior Intercessor").length, tone: "red" },
      { label: "Intercessors", value: rows.filter(u => u.role === "Intercessor").length, tone: "green" },
    ],
    breakdowns: [{ title: "By role", items: countBy(rows, u => u.role) }],
    headers: ["Name", "Email", "Phone", "Role", "Joined"],
    rows: rows.map(u => [u.name, u.email, dash(u.phone), u.role, formatDate(parseDate(u.created_at))]),
    wide: [],
    csvHeaders: ["ID", "Name", "Email", "Phone", "Role", "Joined"],
    csvRows: rows.map(u => [u.id, u.name, u.email, u.phone ?? "", u.role, u.created_at ?? ""]),
    filename: `erc-masoro-users-${stamp}.csv`,
    emptyText: "No accounts match these filters.",
    applied: [...dateApplied, ...pick("Role", f.role), ...searchApplied],
  };
}

const TONES: Record<NonNullable<Stat["tone"]>, string> = { red: "#8b0000", navy: "#0a1628", green: "#15803d" };

const controlStyle: React.CSSProperties = {
  background: "#fff", border: "1px solid rgba(10,22,40,0.12)", color: "#0a1628",
  borderRadius: 10, padding: "9px 12px", fontSize: 13, width: "100%", outline: "none",
};

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={controlStyle}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function DateRangeControls({ filters, set }: { filters: Filters; set: (patch: Partial<Filters>) => void }) {
  return (
    <>
      <label className="block">
        <span className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Date range</span>
        <select value={filters.preset} onChange={e => set({ preset: e.target.value as RangePreset })} style={controlStyle}>
          {(Object.keys(RANGE_LABELS) as RangePreset[]).map(key => <option key={key} value={key}>{RANGE_LABELS[key]}</option>)}
        </select>
      </label>
      {filters.preset === "custom" && (
        <>
          <label className="block">
            <span className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>From</span>
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={e => set({ from: e.target.value })} style={controlStyle} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>To</span>
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={e => set({ to: e.target.value })} style={controlStyle} />
          </label>
        </>
      )}
    </>
  );
}

function printReport(title: string) {
  const previous = document.title;
  document.title = title; // becomes the suggested file name when saving as PDF
  const restore = () => {
    document.title = previous;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}

export default function Reports({ user }: { user: AuthUser | null }) {
  const senior = isSenior(user);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState<ReportType>("requests");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  function load() {
    setLoading(true);
    setError("");
    api.reports.all()
      .then(setData)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const tabs = useMemo(() => {
    const list: { id: ReportType; label: string }[] = [
      { id: "requests", label: senior ? "Prayer Requests" : "My Prayer Requests" },
      { id: "testimonies", label: "Testimonies" },
      { id: "intercessors", label: senior ? "Intercessors" : "My Activity" },
      { id: "schedule", label: "Prayer Schedule" },
    ];
    if (data && data.activityRecords.length > 0) list.push({ id: "activity", label: "Session Activity" });
    if (senior) list.push({ id: "users", label: "User Accounts" });
    return list;
  }, [senior, data]);

  const set = (patch: Partial<Filters>) => setFilters(current => ({ ...current, ...patch }));
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  const report = useMemo(() => (data ? buildReport(type, data, filters) : null), [data, type, filters]);

  const assignedOptions = useMemo(() => {
    const names = new Set((data?.prayerRequests ?? []).map(r => r.assigned));
    return [ALL, ...[...names].sort((a, b) => (a === "Unassigned" ? -1 : b === "Unassigned" ? 1 : a.localeCompare(b)))];
  }, [data]);

  const generated = data ? new Date(data.generatedAt) : new Date();
  const generatedText = generated.toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const maxBar = (items: { count: number }[]) => Math.max(1, ...items.map(item => item.count));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>Insights</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Reports</h1>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
            {senior
              ? "Generate reports for the whole congregation, then print them or download them for Excel."
              : "Reports on the prayer requests assigned to you and on the prayer schedule."}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="self-start px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: "#fff", color: "#0a1628", border: "1px solid rgba(10,22,40,0.12)" }}
        >
          {loading ? "Refreshing…" : "↻ Refresh data"}
        </button>
      </div>

      {error && <p className="no-print rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(139,0,0,0.08)", color: "#8b0000" }}>{error}</p>}

      {/* Report type */}
      <div className="no-print flex flex-wrap gap-2 animate-fade-up delay-100" role="tablist" aria-label="Report type">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={type === tab.id}
            onClick={() => setType(tab.id)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: type === tab.id ? "#0a1628" : "#fff",
              color: type === tab.id ? "#fff" : "#64748b",
              border: `1px solid ${type === tab.id ? "#0a1628" : "rgba(10,22,40,0.1)"}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="no-print rounded-2xl border bg-white p-4 sm:p-5 animate-fade-up delay-100" style={{ borderColor: "rgba(10,22,40,0.07)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>Filters</p>
          {filtersActive && (
            <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs font-semibold hover:underline" style={{ color: "#8b0000" }}>Clear all filters</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(type === "requests" || type === "testimonies" || type === "activity" || type === "users") && <DateRangeControls filters={filters} set={set} />}
          {type === "requests" && (
            <>
              <Select label="Status" value={filters.status} onChange={v => set({ status: v })} options={[ALL, ...STATUSES]} />
              <Select label="Priority" value={filters.priority} onChange={v => set({ priority: v })} options={[ALL, ...PRIORITIES]} />
            </>
          )}
          {(type === "requests" || type === "testimonies") && (
            <Select label="Category" value={filters.category} onChange={v => set({ category: v })} options={[ALL, ...CATEGORIES]} />
          )}
          {senior && (type === "requests" || type === "testimonies") && (
            <Select label={type === "requests" ? "Assigned to" : "Prayed by"} value={filters.assigned} onChange={v => set({ assigned: v })} options={assignedOptions} />
          )}
          {type === "intercessors" && <Select label="Status" value={filters.status} onChange={v => set({ status: v })} options={[ALL, "Active", "Inactive"]} />}
          {type === "schedule" && <Select label="Day" value={filters.day} onChange={v => set({ day: v })} options={[ALL, ...DAYS]} />}
          {type === "activity" && <Select label="Outcome" value={filters.outcome} onChange={v => set({ outcome: v })} options={[ALL, ...OUTCOMES]} />}
          {type === "users" && <Select label="Role" value={filters.role} onChange={v => set({ role: v })} options={[ALL, "Senior Intercessor", "Intercessor"]} />}
        </div>
        <div className="mt-3">
          <SearchInput value={filters.q} onChange={q => set({ q })} placeholder="Search within this report…" label="Search within this report" />
        </div>
      </div>

      {/* Actions */}
      {report && (
        <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm" style={{ color: "#64748b" }}>
            {report.rows.length} record{report.rows.length === 1 ? "" : "s"} in this report
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadCsv(report.filename, report.csvHeaders, report.csvRows)}
              disabled={report.rows.length === 0}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "#0a1628", color: "#fff" }}
            >
              ⬇ Download CSV (Excel)
            </button>
            <button
              onClick={() => printReport(`${report.title} - ${todayStamp()}`)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "#8b0000", color: "#fff" }}
            >
              🖨 Print / Save as PDF
            </button>
          </div>
        </div>
      )}

      {/* The report itself — this block is what gets printed */}
      {loading && !data && <p className="text-sm" style={{ color: "#64748b" }}>Loading report data…</p>}

      {report && data && (
        <article className="report-sheet rounded-2xl border bg-white p-5 sm:p-8 space-y-7 animate-fade-in" style={{ borderColor: "rgba(10,22,40,0.07)", boxShadow: "0 2px 12px rgba(10,22,40,0.05)" }}>
          <header className="border-b pb-5" style={{ borderColor: "rgba(10,22,40,0.1)" }}>
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>
              Evangelical Restoration Church · Masoro · Intercession
            </p>
            <h2 className="text-2xl font-bold mt-1.5" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>{report.title}</h2>
            <p className="text-sm mt-1" style={{ color: "#64748b" }}>{report.description}</p>
            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs" style={{ color: "#475569" }}>
              <div><dt className="font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Generated</dt><dd className="mt-0.5">{generatedText}</dd></div>
              <div><dt className="font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Prepared by</dt><dd className="mt-0.5">{user?.name || "—"}{user?.role ? ` (${user.role})` : ""}</dd></div>
              <div><dt className="font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Coverage</dt><dd className="mt-0.5">{data.scope === "all" ? "All congregation records" : "Records assigned to you"}</dd></div>
            </dl>
            {report.applied.length > 0 && (
              <p className="mt-3 text-xs" style={{ color: "#475569" }}>
                <span className="font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Filters: </span>{report.applied.join(" · ")}
              </p>
            )}
          </header>

          {/* Key figures */}
          <section aria-label="Key figures" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {report.stats.map(stat => (
              <div key={stat.label} className="rounded-xl border p-4" style={{ borderColor: "rgba(10,22,40,0.07)", background: "#f8faff" }}>
                <p className="text-2xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: TONES[stat.tone ?? "navy"] }}>{stat.value}</p>
                <p className="text-xs mt-1" style={{ color: "#64748b" }}>{stat.label}</p>
                {stat.hint && <p className="text-[11px] mt-0.5" style={{ color: "#94a3b8" }}>{stat.hint}</p>}
              </div>
            ))}
          </section>

          {/* Breakdowns */}
          <section aria-label="Breakdowns" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {report.breakdowns.map(breakdown => {
              const max = maxBar(breakdown.items);
              const total = breakdown.items.reduce((sum, item) => sum + item.count, 0);
              return (
                <div key={breakdown.title} className="rounded-xl border p-4" style={{ borderColor: "rgba(10,22,40,0.07)", breakInside: "avoid" }}>
                  <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>{breakdown.title}</p>
                  {total === 0 ? (
                    <p className="text-xs" style={{ color: "#94a3b8" }}>Nothing to show.</p>
                  ) : (
                    <ul className="space-y-2">
                      {breakdown.items.map((item, index) => (
                        <li key={item.label}>
                          <div className="flex justify-between text-xs mb-1" style={{ color: "#334155" }}>
                            <span className="truncate pr-2">{item.label}</span>
                            <span className="font-semibold">{item.count}</span>
                          </div>
                          <div className="h-2 rounded-full" style={{ background: "rgba(10,22,40,0.06)" }}>
                            <div className="h-2 rounded-full" style={{ width: `${(item.count / max) * 100}%`, background: BAR_COLORS[index % BAR_COLORS.length] }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>

          {/* Detail table */}
          <section aria-label="Detailed records">
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
              Detailed records ({report.rows.length})
            </p>
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "rgba(10,22,40,0.07)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f8faff" }}>
                    {report.headers.map(header => (
                      <th key={header} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#64748b" }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t" style={{ borderColor: "rgba(10,22,40,0.06)" }}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-4 py-2.5 align-top"
                          style={{ color: "#334155", minWidth: report.wide.includes(cellIndex) ? 220 : undefined, whiteSpace: report.wide.includes(cellIndex) ? "normal" : undefined }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.rows.length === 0 && <p className="p-6 text-sm text-center" style={{ color: "#64748b" }}>{report.emptyText}</p>}
            </div>
          </section>

          <footer className="hidden-screen text-[11px] pt-2" style={{ color: "#94a3b8" }}>
            ERC Masoro Intercession Management System · {report.title} · generated {generatedText}
          </footer>
        </article>
      )}
    </div>
  );
}
