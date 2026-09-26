import { useState, useEffect } from "react";
import Home from "./components/Home";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import PrayerRequests from "./components/PrayerRequests";
import Intercessors from "./components/Intercessors";
import Schedule from "./components/Schedule";
import Sidebar from "./components/Sidebar";
import ercLogo from "./assets/erc-logo.png";
import { getStoredUser, clearSession, type AuthUser } from "./lib/api";

export type View = "home" | "auth" | "dashboard" | "requests" | "intercessors" | "schedule";

const PROTECTED_VIEWS: View[] = ["dashboard", "requests", "intercessors", "schedule"];

export default function App() {
  const [activeView, setActiveView] = useState<View>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

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

  // Close sidebar on mobile when navigating
  function navigate(view: View) {
    if (PROTECTED_VIEWS.includes(view) && !user) {
      setActiveView("auth");
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

  const views: Record<View, React.ReactNode> = {
    home: <Home onEnter={() => navigate("auth")} />,
    auth: <Auth onAuthenticated={handleAuthenticated} onBack={() => navigate("home")} />,
    dashboard: <Dashboard />,
    requests: <PrayerRequests />,
    intercessors: <Intercessors />,
    schedule: <Schedule />,
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
          <div className="flex items-center gap-3">
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

