import { useEffect, useMemo, useRef, useState } from "react";
import type { View } from "../App";
import { api, type AuthUser } from "../lib/api";
import { matchesQuery, tokenize } from "../lib/search";
import { Highlight } from "./SearchInput";

export interface SearchTarget { view: View; id?: number }

interface Result {
  key: string;
  group: string;
  title: string;
  detail: string;
  target: SearchTarget;
}

const PAGES: { view: View; label: string; detail: string; keywords: string }[] = [
  { view: "dashboard", label: "Dashboard", detail: "Overview and live statistics", keywords: "home overview stats summary" },
  { view: "requests", label: "Prayer Requests", detail: "All requests and their progress", keywords: "prayer requests petitions assign" },
  { view: "intercessors", label: "Intercessors", detail: "Roster, availability and specializations", keywords: "people team members roster" },
  { view: "schedule", label: "Prayer Schedule", detail: "Weekly prayer sessions", keywords: "sessions calendar timetable week" },
  { view: "reports", label: "Reports", detail: "Generate, print and download reports", keywords: "report export csv pdf print download statistics" },
];

const GROUP_ORDER = ["Pages", "Prayer Requests", "Intercessors", "Prayer Schedule"];
const PER_GROUP = 5;
const REFRESH_AFTER_MS = 15000;

interface Props {
  user: AuthUser | null;
  onSelect: (target: SearchTarget) => void;
}

/** The search box in the top bar: searches requests, people, sessions and pages as you type. */
export default function GlobalSearch({ user, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [data, setData] = useState<{ requests: any[]; intercessors: any[]; schedule: any[] }>({ requests: [], intercessors: [], schedule: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedAt = useRef(0);
  const requestId = useRef(0);

  // (Re)load the searchable data. Called on sign-in and whenever the box gets focus after a while,
  // so new requests and people show up without reloading the page.
  function load() {
    if (!user) return;
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    Promise.allSettled([api.prayerRequests.list(), api.intercessors.list(), api.schedule.list()]).then(([requests, intercessors, schedule]) => {
      if (id !== requestId.current) return;
      setData(previous => ({
        requests: requests.status === "fulfilled" ? requests.value : previous.requests,
        intercessors: intercessors.status === "fulfilled" ? intercessors.value : previous.intercessors,
        schedule: schedule.status === "fulfilled" ? schedule.value : previous.schedule,
      }));
      if ([requests, intercessors, schedule].some(r => r.status === "rejected")) setError("Some records could not be loaded, so results may be incomplete.");
      loadedAt.current = Date.now();
    }).finally(() => { if (id === requestId.current) setLoading(false); });
  }

  useEffect(() => {
    if (!user) {
      requestId.current++;
      setData({ requests: [], intercessors: [], schedule: [] });
      setQuery("");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Close when clicking elsewhere.
  useEffect(() => {
    function onClickAway(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  // Press "/" anywhere to jump to the search box.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tokens = useMemo(() => tokenize(query), [query]);

  const { results, hidden } = useMemo(() => {
    if (tokens.length === 0) return { results: [] as Result[], hidden: 0 };
    const groups: Record<string, Result[]> = { "Pages": [], "Prayer Requests": [], "Intercessors": [], "Prayer Schedule": [] };

    for (const page of PAGES) {
      if (matchesQuery(tokens, [page.label, page.keywords])) {
        groups["Pages"].push({ key: `page-${page.view}`, group: "Pages", title: page.label, detail: page.detail, target: { view: page.view } });
      }
    }
    for (const item of data.requests) {
      if (matchesQuery(tokens, [item.name, item.contact, item.request, item.category, item.priority, item.status, item.assigned, item.notes, item.testimony])) {
        groups["Prayer Requests"].push({
          key: `request-${item.id}`, group: "Prayer Requests", title: item.name,
          detail: `${item.category} · ${item.status} · ${item.request}`, target: { view: "requests", id: item.id },
        });
      }
    }
    for (const item of data.intercessors) {
      if (matchesQuery(tokens, [item.name, item.email, item.phone, item.role, item.status, item.specialization, item.availability])) {
        groups["Intercessors"].push({
          key: `intercessor-${item.id}`, group: "Intercessors", title: item.name,
          detail: [item.role, item.status, item.email || item.phone].filter(Boolean).join(" · "), target: { view: "intercessors", id: item.id },
        });
      }
    }
    for (const item of data.schedule) {
      if (matchesQuery(tokens, [item.title, item.day, item.time, item.focus, item.venue, item.lead, item.intercessors])) {
        groups["Prayer Schedule"].push({
          key: `session-${item.id}`, group: "Prayer Schedule", title: item.title,
          detail: `${item.day} · ${item.time} · ${item.venue}`, target: { view: "schedule", id: item.id },
        });
      }
    }

    const shown: Result[] = [];
    let extra = 0;
    for (const name of GROUP_ORDER) {
      shown.push(...groups[name].slice(0, PER_GROUP));
      extra += Math.max(0, groups[name].length - PER_GROUP);
    }
    return { results: shown, hidden: extra };
  }, [data, tokens]);

  useEffect(() => { setActive(0); }, [query]);

  function choose(result: Result) {
    onSelect(result.target);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (query) setQuery(""); else { setOpen(false); inputRef.current?.blur(); }
    } else if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setOpen(true);
      setActive(index => (index + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setActive(index => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      choose(results[active]);
    }
  }

  const showPanel = open && tokens.length > 0;
  let lastGroup = "";

  return (
    <div ref={boxRef} className="relative w-full max-w-sm no-print">
      <svg className="absolute left-3 top-2.5 pointer-events-none" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
      <input
        ref={inputRef}
        value={query}
        onChange={event => { setQuery(event.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); if (Date.now() - loadedAt.current > REFRESH_AFTER_MS) load(); }}
        onKeyDown={onKeyDown}
        placeholder="Search requests, people, schedule…  ( / )"
        aria-label="Search across the app"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        autoComplete="off"
        className="w-full rounded-xl py-2 pl-9 pr-8 text-sm outline-none"
        style={{ background: "#fff", border: "1px solid rgba(10,22,40,0.12)", color: "#0a1628" }}
      />
      {query && (
        <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Clear search" className="absolute right-2 top-2 w-5 h-5 rounded-full flex items-center justify-center text-xs hover:bg-slate-100" style={{ color: "#64748b" }}>✕</button>
      )}

      {showPanel && (
        <div id="global-search-results" role="listbox" className="absolute top-11 left-0 right-0 z-50 rounded-xl border bg-white overflow-hidden shadow-xl max-h-[70vh] overflow-y-auto" style={{ borderColor: "rgba(10,22,40,0.1)", minWidth: 300 }}>
          {results.map((result, index) => {
            const header = result.group !== lastGroup ? result.group : "";
            lastGroup = result.group;
            return (
              <div key={result.key}>
                {header && <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{header}</p>}
                <button
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(result)}
                  className="w-full text-left px-4 py-2.5"
                  style={{ background: index === active ? "rgba(139,0,0,0.05)" : "transparent" }}
                >
                  <p className="text-sm font-semibold truncate" style={{ color: "#0a1628" }}><Highlight text={result.title} tokens={tokens} /></p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "#64748b" }}><Highlight text={result.detail} tokens={tokens} /></p>
                </button>
              </div>
            );
          })}

          {results.length === 0 && (
            <p className="px-4 py-3 text-sm" style={{ color: "#64748b" }}>
              {loading ? "Searching…" : `No matches for “${query.trim()}”.`}
            </p>
          )}
          {results.length > 0 && hidden > 0 && (
            <p className="px-4 py-2 text-xs border-t" style={{ color: "#94a3b8", borderColor: "rgba(10,22,40,0.06)" }}>{hidden} more match{hidden === 1 ? "" : "es"} — type more to narrow down.</p>
          )}
          {error && <p className="px-4 py-2 text-xs border-t" style={{ color: "#8b0000", borderColor: "rgba(10,22,40,0.06)" }}>{error}</p>}
          <p className="px-4 py-2 text-[11px] border-t hidden sm:block" style={{ color: "#94a3b8", borderColor: "rgba(10,22,40,0.06)" }}>↑ ↓ to move · Enter to open · Esc to close</p>
        </div>
      )}
    </div>
  );
}
