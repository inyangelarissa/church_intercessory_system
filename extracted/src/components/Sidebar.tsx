import type { View } from "../App";
import type { AuthUser } from "../lib/api";
import ercLogo from "../assets/erc-logo.png";

const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "requests",
    label: "Prayer Requests",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: "intercessors",
    label: "Intercessors",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "schedule",
    label: "Prayer Schedule",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
  },
];

interface SidebarProps {
  activeView: View;
  setActiveView: (v: View) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  isMobile: boolean;
  user: AuthUser | null;
  onLogout: () => void;
}

export default function Sidebar({ activeView, setActiveView, open, isMobile, user, onLogout }: SidebarProps) {
  const sidebarWidth = open ? 260 : 72;
  const collapsed = !open;
  const displayName = user?.name || "Guest User";
  const displayRole = (user?.role || "administrator").toLowerCase();
  const initials = displayName.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside
      className="fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300"
      style={{
        width: isMobile ? (open ? "80vw" : 0) : sidebarWidth,
        maxWidth: 280,
        background: "#0a1628",
        boxShadow: open ? "4px 0 32px rgba(10,22,40,0.22)" : "none",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)", minHeight: 70 }}
      >
        <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: "#fff" }}>
          <img src={ercLogo} alt="ERC Masoro" className="w-full h-full object-contain p-0.5" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="overflow-hidden min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest leading-tight whitespace-nowrap"
              style={{ fontFamily: "'Cinzel', serif", color: "#fff", letterSpacing: "0.12em" }}>
              ERC Masoro
            </p>
            <p className="text-xs whitespace-nowrap" style={{ color: "rgba(255,255,255,0.35)" }}>
              Intercession Management
            </p>
          </div>
        )}
      </div>

      {/* Section label */}
      {(!collapsed || isMobile) && (
        <div className="px-5 pt-6 pb-2 shrink-0">
          <p className="text-xs uppercase tracking-widest font-semibold"
            style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>
            Navigation
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left transition-all duration-200 group relative"
              style={{ background: active ? "rgba(139,0,0,0.22)" : "transparent" }}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: "#8b0000" }} />
              )}
              <span className="shrink-0 transition-colors duration-200" style={{ color: active ? "#fff" : "rgba(255,255,255,0.45)" }}>
                {item.icon}
              </span>
              {(!collapsed || isMobile) && (
                <span className="text-sm font-medium truncate" style={{ color: active ? "#fff" : "rgba(255,255,255,0.55)", fontFamily: "'Outfit', sans-serif" }}>
                  {item.label}
                </span>
              )}
              {collapsed && !isMobile && (
                <div className="absolute left-14 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg"
                  style={{ background: "#0a1628", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer user */}
      <div className="p-4 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {(!collapsed || isMobile) ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", fontFamily: "'Cinzel', serif" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "#fff" }}>{displayName}</p>
              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{displayRole}</p>
            </div>
            <button
              onClick={onLogout}
              title="Log out"
              className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button onClick={onLogout} title="Log out" className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", fontFamily: "'Cinzel', serif" }}>
              {initials}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
