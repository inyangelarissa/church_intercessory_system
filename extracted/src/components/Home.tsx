import { useState } from "react";
import ercHeroBg from "../assets/erc-hero-bg.png";
import ercLogo from "../assets/erc-logo.png";

interface HomeProps { onEnter: () => void; }

const features = [
  { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, title: "Prayer Request Management", desc: "Capture, categorize, and track every prayer need with priority levels, status updates, and intercessor assignments." },
  { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>, title: "Intercessor Coordination", desc: "Register and manage your prayer team, track specializations, availability, and assignment history." },
  { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>, title: "Session Scheduling", desc: "Organize weekly prayer sessions, vigils, and prayer watches with venue, focus, and intercessor assignments." },
  { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>, title: "Activity Records", desc: "Log every session outcome, record testimonies and breakthroughs, and build a rich history of answered prayers." },
  { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>, title: "Live Dashboard", desc: "Real-time overview of open requests, active intercessors, upcoming sessions, and monthly prayer activity." },
  { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>, title: "24/7 Prayer Coverage", desc: "Ensure round-the-clock intercession with structured shifts, automatic reminders, and team accountability." },
];

const testimonies = [
  { name: "Sr. Mary Wanjiku", role: "Senior Intercessor", text: "This system transformed how we coordinate our prayer team. We no longer miss urgent requests or double-assign intercessors.", initials: "MW" },
  { name: "Pastor John Kariuki", role: "Prayer Leader", text: "The scheduling module alone saved us hours every week. The whole congregation feels the difference in our prayer coverage.", initials: "JK" },
  { name: "Br. James Mwangi", role: "Intercessor", text: "I can see exactly which requests are assigned to me and update my prayer reports from anywhere. It keeps me accountable.", initials: "JM" },
];

const categories = ["Healing", "Guidance", "Family", "Finances", "Mental Health", "Pregnancy", "Salvation", "Other"];

type FormState = "idle" | "submitting" | "success";

export default function Home({ onEnter }: HomeProps) {
  const [form, setForm] = useState({ name: "", contact: "", email: "", category: "Healing", request: "", anonymous: false });
  const [formState, setFormState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name && !form.anonymous) e.name = "Please enter your name or submit anonymously.";
    if (!form.request.trim()) e.request = "Please describe your prayer need.";
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setFormState("submitting");
    setTimeout(() => setFormState("success"), 1400);
  }

  function resetForm() {
    setForm({ name: "", contact: "", email: "", category: "Healing", request: "", anonymous: false });
    setFormState("idle");
    setErrors({});
  }

  const inputCls: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 12, fontSize: 14,
    border: "1.5px solid rgba(10,22,40,0.13)", background: "#fff",
    color: "#0a1628", outline: "none", fontFamily: "'Outfit', sans-serif",
    transition: "border-color 0.2s",
  };
  const errCls: React.CSSProperties = { color: "#8b0000", fontSize: 12, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ paddingTop: 70 }}>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: "92vh" }}>
        <div className="absolute inset-0">
          <img
            src={ercHeroBg}
            alt="ERC Masoro worship service"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(10,22,40,0.88) 0%, rgba(10,22,40,0.70) 50%, rgba(139,0,0,0.35) 100%)" }} />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full px-4 sm:px-6" style={{ minHeight: "92vh" }}>
          <div className="animate-fade-up">
            <img src={ercLogo} alt="Evangelical Restoration Church - Masoro" className="h-16 sm:h-20 mx-auto mb-6" style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))" }} />
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
              style={{ background: "rgba(139,0,0,0.25)", color: "#fca5a5", border: "1px solid rgba(139,0,0,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>
              ERC Masoro · Supernatural Empowerment
            </span>
          </div>
          <h1 className="animate-fade-up delay-100 text-white font-bold leading-tight mb-6"
            style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(2rem, 6vw, 5rem)", maxWidth: 820, textShadow: "0 4px 24px rgba(0,0,0,0.4)", letterSpacing: "0.02em" }}>
            ERC Masoro Intercessors<br />
            <span style={{ color: "#fca5a5" }}>Activities Management</span>
          </h1>
          <p className="animate-fade-up delay-200 max-w-2xl mb-10 leading-relaxed px-2"
            style={{ color: "rgba(255,255,255,0.78)", fontFamily: "'Outfit', sans-serif", fontWeight: 300, fontSize: "clamp(0.95rem,2.5vw,1.125rem)" }}>
            A centralized platform for organizing prayer requests, coordinating intercessors,
            scheduling sessions, and recording the fruit of your church's intercession ministry.
          </p>
          <div className="animate-fade-up delay-300 flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
            <button onClick={onEnter}
              className="group px-8 py-4 rounded-2xl font-semibold text-base transition-all duration-300 hover:scale-105"
              style={{ background: "#8b0000", color: "#fff", boxShadow: "0 8px 32px rgba(139,0,0,0.45)" }}>
              Enter the System <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
            </button>
            <a href="#submit-request"
              className="px-8 py-4 rounded-2xl font-semibold text-base transition-all duration-300 hover:bg-white/20 text-center"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(8px)" }}>
              Submit a Prayer Request ↓
            </a>
          </div>
          <div className="animate-fade-up delay-500 absolute bottom-10 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2">
            <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>Scroll to explore</p>
            <div className="w-5 h-8 rounded-full flex items-start justify-center pt-1.5" style={{ border: "1px solid rgba(255,255,255,0.25)" }}>
              <div className="w-1 h-2 rounded-full" style={{ background: "#8b0000", animation: "fadeUp 1.5s ease infinite alternate" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Banner ─────────────────────────────── */}
      <section style={{ background: "#0a1628" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
          {[
            { value: "47", label: "Active Intercessors", suffix: "+" },
            { value: "1,204", label: "Prayers Answered", suffix: "" },
            { value: "34", label: "Sessions / Month", suffix: "" },
            { value: "8", label: "Prayer Watches / Week", suffix: "" },
          ].map((stat, i) => (
            <div key={i} className="text-center animate-count-up" style={{ animationDelay: `${i * 120}ms` }}>
              <p className="text-3xl sm:text-4xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "#fff" }}>
                {stat.value}<span style={{ color: "#8b0000" }}>{stat.suffix}</span>
              </p>
              <p className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'Outfit', sans-serif" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6" style={{ background: "#f8faff" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16 animate-fade-up">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>System Modules</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 mb-4" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Everything Your Ministry Needs</h2>
            <p className="text-sm sm:text-base max-w-xl mx-auto" style={{ color: "#64748b", lineHeight: 1.8 }}>Built specifically for church intercession ministries — from the smallest prayer cell to the largest prayer department.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div key={i} className="card-hover rounded-2xl p-6 sm:p-7 border animate-fade-up"
                style={{ background: "#fff", borderColor: "rgba(10,22,40,0.07)", animationDelay: `${i * 80}ms`, boxShadow: "0 2px 12px rgba(10,22,40,0.05)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: i % 2 === 0 ? "rgba(139,0,0,0.08)" : "rgba(10,22,40,0.06)", color: i % 2 === 0 ? "#8b0000" : "#0a1628" }}>
                  {f.icon}
                </div>
                <h3 className="text-base font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6" style={{ background: "#fff" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>How It Works</h2>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
            {[
              { step: "01", title: "Submit Request", desc: "Congregation members submit prayer needs through the coordinator or online." },
              { step: "02", title: "Assign Intercessor", desc: "Admin assigns the request to the right intercessor based on specialty." },
              { step: "03", title: "Schedule Session", desc: "Prayer sessions are organized and intercessors are notified." },
              { step: "04", title: "Record Outcome", desc: "Sessions are logged with attendance, requests covered, and testimonies." },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center animate-fade-up" style={{ animationDelay: `${i * 120}ms` }}>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold mb-4 z-10"
                  style={{ background: "#0a1628", color: "#fff", fontFamily: "'Cinzel', serif", boxShadow: "0 4px 20px rgba(10,22,40,0.2)" }}>
                  {s.step}
                </div>
                <h4 className="font-bold text-sm sm:text-base mb-2" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>{s.title}</h4>
                <p className="text-xs sm:text-sm" style={{ color: "#64748b", lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Image Quote Break ─────────────────────────── */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <img src="https://images.unsplash.com/photo-1600288480699-0b0d8a456dd8?w=1800&h=600&fit=crop&auto=format" alt="Congregation in worship" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "rgba(10,22,40,0.82)" }} />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-6 animate-fade-up" style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.02em" }}>
            "The prayer of a righteous person is powerful and effective."
          </p>
          <p className="text-sm uppercase tracking-widest animate-fade-up delay-100" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'JetBrains Mono', monospace" }}>James 5:16</p>
        </div>
      </section>

      {/* ── Submit a Prayer Request ───────────────────── */}
      <section id="submit-request" className="py-16 sm:py-24 px-4 sm:px-6" style={{ background: "#f8faff" }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10 animate-fade-up">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>Open to All</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3 mb-3" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>
              Submit a Prayer Request
            </h2>
            <p className="text-sm sm:text-base" style={{ color: "#64748b", lineHeight: 1.8 }}>
              Share your prayer need with our intercessory team. All requests are treated with confidentiality and covered in prayer.
            </p>
          </div>

          <div className="animate-scale-in rounded-2xl border bg-white overflow-hidden"
            style={{ borderColor: "rgba(10,22,40,0.09)", boxShadow: "0 8px 48px rgba(10,22,40,0.09)" }}>
            {/* Top accent bar */}
            <div className="h-1.5" style={{ background: "linear-gradient(90deg, #8b0000, #0a1628)" }} />

            {formState === "success" ? (
              <div className="p-10 sm:p-14 text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in"
                  style={{ background: "rgba(21,128,61,0.1)" }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Request Received</h3>
                <p className="text-sm mb-6" style={{ color: "#64748b", lineHeight: 1.8 }}>
                  Thank you for trusting us with your prayer need. Our intercessors will cover this request in prayer. You will be notified if you provided contact details.
                </p>
                <button onClick={resetForm} className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: "#8b0000", color: "#fff" }}>
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
                {/* Anonymous toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#f8faff", border: "1.5px solid rgba(10,22,40,0.08)" }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0a1628" }}>Submit Anonymously</p>
                    <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>Your name will not be recorded</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, anonymous: !form.anonymous, name: form.anonymous ? form.name : "" })}
                    className="relative w-12 h-6 rounded-full transition-all duration-300 shrink-0"
                    style={{ background: form.anonymous ? "#8b0000" : "rgba(10,22,40,0.15)" }}
                  >
                    <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300"
                      style={{ left: form.anonymous ? "calc(100% - 22px)" : 2 }} />
                  </button>
                </div>

                {/* Name */}
                {!form.anonymous && (
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#0a1628" }}>
                      Full Name <span style={{ color: "#8b0000" }}>*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      style={{ ...inputCls, borderColor: errors.name ? "#8b0000" : "rgba(10,22,40,0.13)" }}
                      placeholder="Your full name"
                    />
                    {errors.name && <p style={errCls}>{errors.name}</p>}
                  </div>
                )}

                {/* Contact row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#0a1628" }}>Phone</label>
                    <input
                      value={form.contact}
                      onChange={e => setForm({ ...form, contact: e.target.value })}
                      style={inputCls}
                      placeholder="+254 7XX XXX XXX"
                      type="tel"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#0a1628" }}>Email</label>
                    <input
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      style={inputCls}
                      placeholder="your@email.com"
                      type="email"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#0a1628" }}>Prayer Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, category: c })}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: form.category === c ? "#0a1628" : "#f8faff",
                          color: form.category === c ? "#fff" : "#64748b",
                          border: `1.5px solid ${form.category === c ? "#0a1628" : "rgba(10,22,40,0.1)"}`,
                        }}
                      >{c}</button>
                    ))}
                  </div>
                </div>

                {/* Request */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#0a1628" }}>
                    Prayer Request <span style={{ color: "#8b0000" }}>*</span>
                  </label>
                  <textarea
                    value={form.request}
                    onChange={e => setForm({ ...form, request: e.target.value })}
                    rows={5}
                    style={{ ...inputCls, resize: "vertical", borderColor: errors.request ? "#8b0000" : "rgba(10,22,40,0.13)" }}
                    placeholder="Please describe your prayer need in as much detail as you are comfortable sharing. Our intercessors will pray over this with care and confidentiality..."
                  />
                  {errors.request && <p style={errCls}>{errors.request}</p>}
                  <p className="text-xs mt-1.5 text-right" style={{ color: form.request.length > 800 ? "#8b0000" : "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                    {form.request.length} / 1000
                  </p>
                </div>

                {/* Privacy note */}
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(139,0,0,0.05)", border: "1px solid rgba(139,0,0,0.12)" }}>
                  <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
                    All prayer requests are kept strictly confidential. They are shared only with assigned intercessors and reviewed by the prayer coordinator.
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={formState === "submitting"}
                  className="w-full py-4 rounded-xl font-bold text-base transition-all hover:scale-[1.02] disabled:opacity-70 flex items-center justify-center gap-2"
                  style={{ background: "#8b0000", color: "#fff", boxShadow: "0 6px 28px rgba(139,0,0,0.3)", fontFamily: "'Cinzel', serif", letterSpacing: "0.04em" }}
                >
                  {formState === "submitting" ? (
                    <>
                      <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Submit Prayer Request
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6" style={{ background: "#fff" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>Testimonies</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>From Our Intercessors</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonies.map((t, i) => (
              <div key={i} className="card-hover rounded-2xl p-6 sm:p-7 border animate-fade-up"
                style={{ background: "#f8faff", borderColor: "rgba(10,22,40,0.07)", boxShadow: "0 2px 12px rgba(10,22,40,0.05)", animationDelay: `${i * 100}ms` }}>
                <div className="flex mb-4 gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} width="14" height="14" viewBox="0 0 24 24" fill="#8b0000">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: "#475569", fontStyle: "italic" }}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: "#0a1628", color: "#fff", fontFamily: "'Cinzel', serif" }}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0a1628" }}>{t.name}</p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6" style={{ background: "#0a1628" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 animate-fade-up" style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.02em" }}>
            Ready to Strengthen Your Prayer Ministry?
          </h2>
          <p className="text-sm sm:text-base mb-10 animate-fade-up delay-100" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.8 }}>
            Join hundreds of churches using structured intercession management to ensure no prayer request goes uncovered.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={onEnter}
              className="group animate-fade-up delay-200 px-8 sm:px-10 py-4 rounded-2xl font-semibold text-base transition-all duration-300 hover:scale-105"
              style={{ background: "#8b0000", color: "#fff", boxShadow: "0 8px 40px rgba(139,0,0,0.4)" }}>
              Enter the System <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
            </button>
            <a href="#submit-request"
              className="animate-fade-up delay-300 px-8 sm:px-10 py-4 rounded-2xl font-semibold text-base transition-all hover:bg-white/10 text-center"
              style={{ color: "#fff", border: "1.5px solid rgba(255,255,255,0.2)" }}>
              Submit Prayer Request
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 border-t text-center" style={{ background: "#060e1d", borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>
          © 2026 Evangelical Restoration Church - Masoro · Intercession Management System · v1.0.0
        </p>
      </footer>
    </div>
  );
}
