import { useState } from "react";
import ercLogo from "../assets/erc-logo.png";
import ercHeroBg from "../assets/erc-hero-bg.png";
import { api, setSession, ApiError, OfflineError, type AuthUser } from "../lib/api";

interface AuthProps {
  onAuthenticated: (user: AuthUser) => void;
  onBack: () => void;
}

type Mode = "login" | "signup";
type FormState = "idle" | "submitting";

export default function Auth({ onAuthenticated, onBack }: AuthProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [login, setLogin] = useState({ email: "", password: "", remember: true });
  const [signup, setSignup] = useState({
    name: "", email: "", phone: "", role: "Intercessor", password: "", confirm: "",
  });

  const inputCls: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 12, fontSize: 14,
    border: "1.5px solid rgba(10,22,40,0.13)", background: "#fff",
    color: "#0a1628", outline: "none", fontFamily: "'Outfit', sans-serif",
  };
  const labelCls: React.CSSProperties = { color: "#0a1628" };
  const errCls: React.CSSProperties = { color: "#8b0000", fontSize: 12, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" };

  function validateLogin() {
    const e: Record<string, string> = {};
    if (!login.email.trim()) e.email = "Please enter your email address.";
    if (!login.password) e.password = "Please enter your password.";
    return e;
  }

  function validateSignup() {
    const e: Record<string, string> = {};
    if (!signup.name.trim()) e.name = "Please enter your full name.";
    if (!signup.email.trim()) e.email = "Please enter your email address.";
    if (!signup.password) e.password = "Please choose a password.";
    else if (signup.password.length < 6) e.password = "Password must be at least 6 characters.";
    if (signup.confirm !== signup.password) e.confirm = "Passwords do not match.";
    return e;
  }

  function handleLogin(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validateLogin();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setFormState("submitting");

    api.auth.login({ email: login.email.trim(), password: login.password })
      .then(({ token, user }) => {
        setSession(token, user);
        onAuthenticated(user);
      })
      .catch((err) => {
        if (err instanceof OfflineError) {
          // No API server reachable (e.g. this is the static published preview) — fall back to a local demo session.
          const demoUser: AuthUser = { id: 0, name: login.email.split("@")[0] || "Demo User", email: login.email, role: "Admin" };
          setSession("demo-mode", demoUser);
          onAuthenticated(demoUser);
          return;
        }
        setErrors({ password: err instanceof ApiError ? err.message : "Something went wrong. Please try again." });
      })
      .finally(() => setFormState("idle"));
  }

  function handleSignup(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validateSignup();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setFormState("submitting");

    api.auth.signup({
      name: signup.name.trim(), email: signup.email.trim(), phone: signup.phone.trim(),
      role: "Intercessor", password: signup.password,
    })
      .then(({ token, user }) => {
        setSession(token, user);
        onAuthenticated(user);
      })
      .catch((err) => {
        if (err instanceof OfflineError) {
          const demoUser: AuthUser = { id: 0, name: signup.name || "Demo User", email: signup.email, role: "Intercessor" };
          setSession("demo-mode", demoUser);
          onAuthenticated(demoUser);
          return;
        }
        setErrors({ email: err instanceof ApiError ? err.message : "Something went wrong. Please try again." });
      })
      .finally(() => setFormState("idle"));
  }

  function switchMode(m: Mode) {
    setMode(m);
    setErrors({});
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "#f8faff" }}>
      {/* Branding panel */}
      <div className="relative overflow-hidden flex flex-col justify-between lg:w-[42%] min-h-55 lg:min-h-screen px-6 sm:px-10 py-8 lg:py-12">
        <img src={ercHeroBg} alt="ERC Masoro" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(10,22,40,0.92) 0%, rgba(10,22,40,0.75) 55%, rgba(139,0,0,0.35) 100%)" }} />

        <div className="relative z-10 flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-3">
            <img src={ercLogo} alt="ERC Masoro" className="h-9 sm:h-10" style={{ filter: "brightness(0) invert(1)" }} />
          </button>
        </div>

        <div className="relative z-10 hidden lg:block max-w-sm">
          <p className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: "#fca5a5", fontFamily: "'JetBrains Mono', monospace" }}>
            ERC Masoro · Intercession
          </p>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4" style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.01em" }}>
            Coordinated prayer, covering the whole congregation.
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            Sign in to manage prayer requests, intercessors, schedules, and activity records for ERC Masoro.
          </p>
        </div>

        <button onClick={onBack} className="relative z-10 text-xs font-medium text-left w-fit hover:underline" style={{ color: "rgba(255,255,255,0.7)" }}>
          ← Back to home
        </button>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 sm:py-14">
        <div className="w-full max-w-sm">
          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-8" style={{ background: "rgba(10,22,40,0.06)" }}>
            {(["login", "signup"] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: mode === m ? "#0a1628" : "transparent",
                  color: mode === m ? "#fff" : "#64748b",
                }}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <>
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Welcome back</h1>
              <p className="text-sm mb-7" style={{ color: "#94a3b8" }}>Log in to continue to the Intercession system.</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={labelCls}>Email</label>
                  <input
                    type="email" value={login.email}
                    onChange={e => setLogin({ ...login, email: e.target.value })}
                    style={{ ...inputCls, borderColor: errors.email ? "#8b0000" : "rgba(10,22,40,0.13)" }}
                    placeholder="you@ercmasoro.org"
                  />
                  {errors.email && <p style={errCls}>{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={labelCls}>Password</label>
                  <input
                    type="password" value={login.password}
                    onChange={e => setLogin({ ...login, password: e.target.value })}
                    style={{ ...inputCls, borderColor: errors.password ? "#8b0000" : "rgba(10,22,40,0.13)" }}
                    placeholder="••••••••"
                  />
                  {errors.password && <p style={errCls}>{errors.password}</p>}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer" style={{ color: "#64748b" }}>
                    <input type="checkbox" checked={login.remember} onChange={e => setLogin({ ...login, remember: e.target.checked })} />
                    Remember me
                  </label>
                  <button type="button" className="font-medium hover:underline" style={{ color: "#8b0000" }}>Forgot password?</button>
                </div>
                <button
                  type="submit"
                  disabled={formState === "submitting"}
                  className="w-full py-3.5 rounded-xl font-bold text-base transition-all hover:scale-[1.02] disabled:opacity-70"
                  style={{ background: "#8b0000", color: "#fff", boxShadow: "0 6px 28px rgba(139,0,0,0.3)", fontFamily: "'Cinzel', serif", letterSpacing: "0.03em" }}
                >
                  {formState === "submitting" ? "Logging In..." : "Log In"}
                </button>
              </form>

              <p className="text-sm text-center mt-6" style={{ color: "#94a3b8" }}>
                New here?{" "}
                <button onClick={() => switchMode("signup")} className="font-semibold hover:underline" style={{ color: "#8b0000" }}>
                  Create an account
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Create your account</h1>
              <p className="text-sm mb-7" style={{ color: "#94a3b8" }}>Join the ERC Masoro intercession team.</p>

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={labelCls}>Full Name</label>
                  <input
                    value={signup.name}
                    onChange={e => setSignup({ ...signup, name: e.target.value })}
                    style={{ ...inputCls, borderColor: errors.name ? "#8b0000" : "rgba(10,22,40,0.13)" }}
                    placeholder="Your full name"
                  />
                  {errors.name && <p style={errCls}>{errors.name}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={labelCls}>Email</label>
                    <input
                      type="email" value={signup.email}
                      onChange={e => setSignup({ ...signup, email: e.target.value })}
                      style={{ ...inputCls, borderColor: errors.email ? "#8b0000" : "rgba(10,22,40,0.13)" }}
                      placeholder="you@ercmasoro.org"
                    />
                    {errors.email && <p style={errCls}>{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={labelCls}>Phone</label>
                    <input
                      type="tel" value={signup.phone}
                      onChange={e => setSignup({ ...signup, phone: e.target.value })}
                      style={inputCls}
                      placeholder="+250 7XX XXX XXX"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={labelCls}>Password</label>
                    <input
                      type="password" value={signup.password}
                      onChange={e => setSignup({ ...signup, password: e.target.value })}
                      style={{ ...inputCls, borderColor: errors.password ? "#8b0000" : "rgba(10,22,40,0.13)" }}
                      placeholder="At least 6 characters"
                    />
                    {errors.password && <p style={errCls}>{errors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={labelCls}>Confirm Password</label>
                    <input
                      type="password" value={signup.confirm}
                      onChange={e => setSignup({ ...signup, confirm: e.target.value })}
                      style={{ ...inputCls, borderColor: errors.confirm ? "#8b0000" : "rgba(10,22,40,0.13)" }}
                      placeholder="Repeat password"
                    />
                    {errors.confirm && <p style={errCls}>{errors.confirm}</p>}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={formState === "submitting"}
                  className="w-full py-3.5 rounded-xl font-bold text-base transition-all hover:scale-[1.02] disabled:opacity-70"
                  style={{ background: "#8b0000", color: "#fff", boxShadow: "0 6px 28px rgba(139,0,0,0.3)", fontFamily: "'Cinzel', serif", letterSpacing: "0.03em" }}
                >
                  {formState === "submitting" ? "Creating Account..." : "Create Account"}
                </button>
              </form>

              <p className="text-sm text-center mt-6" style={{ color: "#94a3b8" }}>
                Already have an account?{" "}
                <button onClick={() => switchMode("login")} className="font-semibold hover:underline" style={{ color: "#8b0000" }}>
                  Log in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
