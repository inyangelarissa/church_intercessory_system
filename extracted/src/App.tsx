import { useState, useEffect, useMemo, useRef } from "react";
import Home from "./components/Home";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import PrayerRequests from "./components/PrayerRequests";
import Intercessors from "./components/Intercessors";
import Schedule from "./components/Schedule";
import Everything from "./components/Everything";
import Sidebar from "./components/Sidebar";
import ercLogo from "./assets/erc-logo.png";
import { api, getStoredUser, setSession, getToken, clearSession, type AuthUser } from "./lib/api";

export type View = "home" | "auth" | "dashboard" | "requests" | "intercessors" | "schedule" | "everything";

const PROTECTED_VIEWS: View[] = ["dashboard", "requests", "intercessors", "schedule", "everything"];

export default function App() {
  const [activeView, setActiveView] = useState<View>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchData, setSearchData] = useState<{ requests: any[]; intercessors: any[]; schedule: any[] }>({ requests: [], intercessors: [], schedule: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!user) {
      setSearchData({ requests: [], intercessors: [], schedule: [] });
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    setSearchError("");
    Promise.allSettled([api.prayerRequests.list(), api.intercessors.list(), api.schedule.list()]).then(results => {
      if (cancelled) return;
      const [requests, intercessors, schedule] = results;
      setSearchData({
        requests: requests.status === "fulfilled" ? requests.value : [],
        intercessors: intercessors.status === "fulfilled" ? intercessors.value : [],
        schedule: schedule.status === "fulfilled" ? schedule.value : [],
      });
      if (results.some(result => result.status === "rejected")) {
        setSearchError("Some search data could not be loaded.");
      }
    }).finally(() => {
      if (!cancelled) setSearchLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    function closeSearch(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setGlobalSearch("");
    }
    document.addEventListener("mousedown", closeSearch);
    return () => document.removeEventListener("mousedown", closeSearch);
  }, []);

  // Confirm the stored session with the server (also picks up role changes).
  useEffect(() => {
    if (!getToken()) return;
    api.auth.me()
      .then(({ user: fresh }) => {
        setSession(getToken() as string, fresh);
        setUser(fresh);
      })
      .catch(() => { /* a 401 is handled by the "erc:unauthorized" listener below */ });
  }, []);

  // The API client fires this when the server rejects our token (expired, or the account is gone).
  useEffect(() => {
    const onUnauthorized = () => {
      clearSession();
      setUser(null);
      setActiveView("auth");
    };
    window.addEventListener("erc:unauthorized", onUnauthorized);
    return () => window.removeEventListener("erc:unauthorized", onUnauthorized);
  }, []);

  // Close sidebar on mobile when navigating
  function navigate(view: View) {
    if (PROTECTED_VIEWS.includes(view) && !user) {
      setActiveView("auth");
    } else if (view === "everything" && !isSenior(user)) {
      setActiveView("dashboard");
    } else {
      setActiveView(view);
    }
    if (isMobile) setSidebarOpen(false);
  }

  function handleAuthenticated(authedUser: AuthUser) {
    setUser(authedUser);
    navigate("dashboard");
  }

  function handleLogout() {
    clearSession();
    setUser(null);
    navigate("home");
  }

  const isHome = activeView === "home";
  const isAuth = activeView === "auth";
  const searchTerm = globalSearch.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return [
      ...searchData.requests.filter(item => [item.name, item.request, item.category, item.status, item.assigned].some(value => String(value ?? "").toLowerCase().includes(searchTerm))).slice(0, 5).map(item => ({ title: item.name, detail: item.request, view: "requests" as View })),
      ...searchData.intercessors.filter(item => [item.name, item.email, item.role, item.status].some(value => String(value ?? "").toLowerCase().includes(searchTerm))).slice(0, 5).map(item => ({ title: item.name, detail: `Intercessor · ${item.status}`, view: "intercessors" as View })),
      ...searchData.schedule.filter(item => [item.title, item.day, item.focus, item.venue].some(value => String(value ?? "").toLowerCase().includes(searchTerm))).slice(0, 5).map(item => ({ title: item.title, detail: `Schedule · ${item.day} ${item.time}`, view: "schedule" as View })),
    ].slice(0, 8);
  }, [searchData, searchTerm]);

  const views: Record<View, React.ReactNode> = {
    home: <Home onEnter={() => navigate("auth")} />,
    auth: <Auth onAuthenticated={handleAuthenticated} onBack={() => navigate("home")} />,
    dashboard: <Dashboard user={user} />,
    requests: <PrayerRequests user={user} />,
    intercessors: <Intercessors user={user} />,
    schedule: <Schedule />,
    everything: <Everything user={user} />,
  };

  if (isAuth) {
    return views["auth"];
  }

  if (isHome) {
    return (
      <div style={{ background: "#f8faff", minHeight: "100vh" }}>
        <header
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-4"
          style={{ background: "rgba(248,250,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(10,22,40,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <img src={ercLogo} alt="ERC Masoro" className="h-9 w-auto shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628", letterSpacing: "0.1em" }}>
                Intercession
              </p>
              <p className="text-xs hidden sm:block" style={{ color: "#64748b" }}>Evangelical Restoration Church · Masoro</p>
            </div>
          </div>
          <button
            onClick={() => navigate("auth")}
            className="px-4 sm:px-5 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105"
            style={{ background: "#8b0000", color: "#fff" }}
          >
            <span className="hidden sm:inline">Enter System →</span>
            <span className="sm:hidden">Enter →</span>
          </button>
        </header>
        {views["home"]}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#f8faff" }}>
      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          style={{ backdropFilter: "blur(2px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeView={activeView}
        setActiveView={navigate}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        isMobile={isMobile}
        user={user}
        onLogout={handleLogout}
      />

      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : sidebarOpen ? 260 : 72 }}
      >
        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b"
          style={{ background: "rgba(248,250,255,0.95)", backdropFilter: "blur(12px)", borderColor: "rgba(10,22,40,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg transition-colors hover:bg-black/5"
              style={{ color: "#0a1628" }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <rect y="3" width="20" height="2" rx="1" />
                <rect y="9" width="14" height="2" rx="1" />
                <rect y="15" width="20" height="2" rx="1" />
              </svg>
            </button>
            <div className="h-5 w-px hidden sm:block" style={{ background: "rgba(10,22,40,0.1)" }} />
            <button
              onClick={() => navigate("home")}
              className="text-xs font-medium hover:underline transition-all hidden sm:block"
              style={{ color: "#8b0000" }}
            >
              ← Home
            </button>
          </div>
          <div className="flex items-center gap-3 flex-1 justify-end">
            <div ref={searchRef} className="relative w-full max-w-sm">
              <svg className="absolute left-3 top-2.5" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input
                value={globalSearch}
                onChange={event => setGlobalSearch(event.target.value)}
                placeholder="Search requests, people, schedule..."
                aria-label="Search across the app"
                className="w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none"
                style={{ background: "#fff", border: "1px solid rgba(10,22,40,0.12)", color: "#0a1628" }}
              />
              {searchTerm && (
                <div className="absolute top-11 left-0 right-0 z-50 rounded-xl border bg-white overflow-hidden shadow-xl" style={{ borderColor: "rgba(10,22,40,0.1)" }}>
                  {searchLoading ? <p className="px-4 py-3 text-sm" style={{ color: "#64748b" }}>Loading search data...</p> : searchError ? <p className="px-4 py-3 text-sm" style={{ color: "#8b0000" }}>{searchError}</p> : searchResults.length > 0 ? searchResults.map((result, index) => (
                    <button key={`${result.view}-${index}`} onClick={() => { navigate(result.view); setGlobalSearch(""); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-b-0" style={{ borderColor: "rgba(10,22,40,0.06)" }}>
                      <p className="text-sm font-semibold truncate" style={{ color: "#0a1628" }}>{result.title}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "#64748b" }}>{result.detail}</p>
                    </button>
                  )) : <p className="px-4 py-3 text-sm" style={{ color: "#64748b" }}>No matching records.</p>}
                </div>
              )}
            </div>
            <div className="text-right hidden md:block">
              <p className="text-xs font-medium" style={{ color: "#0a1628" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>ERC Masoro</p>
            </div>
            <div className="relative">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "#0a1628", color: "#fff", fontFamily: "'Cinzel', serif" }}
              >
                {(user?.name || "PA").split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: "#22c55e" }} />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
          {views[activeView]}
        </main>
      </div>
    </div>
  );
}
