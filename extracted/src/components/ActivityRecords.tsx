import { useState, useEffect } from "react";
import { api, errorMessage } from "../lib/api";

interface ActivityRecord {
  id: number; session: string; date: string; lead: string;
  attendees: number; requestsCovered: number; duration: string;
  outcome: "Fruitful" | "Regular" | "Incomplete"; notes: string; testimonies: number;
  dayNum: string; month: string;
}

const outcomeConfig: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  Fruitful:   { bg: "rgba(21,128,61,0.09)",  text: "#15803d", dot: "#22c55e", bar: "#15803d" },
  Regular:    { bg: "rgba(10,22,40,0.06)",   text: "#334155", dot: "#64748b", bar: "#0a1628" },
  Incomplete: { bg: "rgba(139,0,0,0.09)",    text: "#8b0000", dot: "#8b0000", bar: "#8b0000" },
};

export default function ActivityRecords() {
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ActivityRecord | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<string>("All");

  useEffect(() => {
    api.activityRecords.list()
      .then((rows) => setRecords(rows as ActivityRecord[]))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = outcomeFilter === "All" ? records : records.filter(r => r.outcome === outcomeFilter);

  const totalTestimonies = records.reduce((s, r) => s + r.testimonies, 0);
  const totalRequests = records.reduce((s, r) => s + r.requestsCovered, 0);
  const totalHours = records.reduce((sum, r) => sum + (parseFloat(r.duration) || 0), 0);
  const fruitful = records.filter(r => r.outcome === "Fruitful").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#8b0000", fontFamily: "'JetBrains Mono', monospace" }}>Module 04</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>Activity Records</h1>
        <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>{loading ? "Loading…" : "Complete log of all intercession sessions and their outcomes"}</p>
        {error && <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(139,0,0,0.08)", color: "#8b0000" }}>{error}</p>}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        {[
          { label: "Total Prayer Hours", value: `${Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)} hrs`, sub: `${records.length} sessions logged`, icon: "⏱" },
          { label: "Requests Covered", value: totalRequests.toString(), sub: "Across all sessions", icon: "🙏" },
          { label: "Recorded Testimonies", value: totalTestimonies.toString(), sub: `${fruitful} fruitful sessions`, icon: "✨" },
        ].map((s, i) => (
          <div key={i} className="card-hover animate-fade-up rounded-2xl border bg-white p-6" style={{ borderColor: "rgba(10,22,40,0.07)", boxShadow: "0 2px 12px rgba(10,22,40,0.05)", animationDelay: `${i * 80}ms` }}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              {i === 2 && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "rgba(139,0,0,0.09)", color: "#8b0000" }}>Answered</span>
              )}
            </div>
            <p className="text-3xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: i === 2 ? "#8b0000" : "#0a1628" }}>{s.value}</p>
            <p className="text-sm font-medium mb-0.5" style={{ color: "#334155" }}>{s.label}</p>
            <p className="text-xs" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="animate-fade-up delay-100 flex gap-2">
        {["All", "Fruitful", "Regular", "Incomplete"].map(o => (
          <button key={o} onClick={() => setOutcomeFilter(o)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            style={{
              background: outcomeFilter === o ? (o === "All" ? "#0a1628" : outcomeConfig[o]?.bg || "#0a1628") : "#fff",
              color: outcomeFilter === o ? (o === "All" ? "#fff" : outcomeConfig[o]?.text || "#fff") : "#64748b",
              border: `1px solid ${outcomeFilter === o ? (o === "All" ? "#0a1628" : outcomeConfig[o]?.dot || "#0a1628") : "rgba(10,22,40,0.1)"}`,
              fontWeight: outcomeFilter === o ? 600 : 400,
            }}
          >
            {o !== "All" && <span className="w-2 h-2 rounded-full" style={{ background: outcomeConfig[o]?.dot }} />}
            {o}
          </button>
        ))}
      </div>

      {!loading && records.length === 0 && !error && (
        <p className="text-sm" style={{ color: "#64748b" }}>No activity has been recorded yet.</p>
      )}

      {/* Records */}
      <div className="space-y-3">
        {filtered.map((r, i) => (
          <div
            key={r.id}
            onClick={() => setSelected(selected?.id === r.id ? null : r)}
            className="animate-fade-up card-hover rounded-2xl border bg-white cursor-pointer overflow-hidden transition-all"
            style={{
              borderColor: selected?.id === r.id ? "rgba(139,0,0,0.25)" : "rgba(10,22,40,0.07)",
              boxShadow: selected?.id === r.id ? "0 8px 32px rgba(10,22,40,0.08)" : "0 2px 8px rgba(10,22,40,0.04)",
              animationDelay: `${i * 50}ms`,
            }}
          >
            {/* Fruitfulness bar at top */}
            <div className="h-1 w-full" style={{ background: outcomeConfig[r.outcome].bar, opacity: 0.6 }} />

            <div className="flex flex-wrap items-start gap-3 sm:gap-5 p-4 sm:p-5">
              {/* Date block */}
              <div
                className="shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border"
                style={{ background: "#f8faff", borderColor: "rgba(10,22,40,0.07)" }}
              >
                <p className="text-xs font-semibold" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{r.month}</p>
                <p className="text-xl font-bold leading-tight" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>{r.dayNum}</p>
              </div>

              <div className="flex-1 min-w-35">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="font-bold text-base" style={{ fontFamily: "'Cinzel', serif", color: "#0a1628" }}>{r.session}</h3>
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-medium"
                    style={{ background: outcomeConfig[r.outcome].bg, color: outcomeConfig[r.outcome].text }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: outcomeConfig[r.outcome].dot }} />
                    {r.outcome}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "#64748b" }}>Led by <span className="font-medium" style={{ color: "#334155" }}>{r.lead}</span></p>

                {selected?.id === r.id && (
                  <div className="mt-4 space-y-4 animate-fade-up">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: "Attendees", value: r.attendees },
                        { label: "Requests", value: r.requestsCovered },
                        { label: "Duration", value: r.duration },
                        { label: "Testimonies", value: r.testimonies },
                      ].map(item => (
                        <div key={item.label} className="p-3 rounded-xl text-center" style={{ background: "#f8faff" }}>
                          <p className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: item.label === "Testimonies" && +item.value > 0 ? "#8b0000" : "#0a1628" }}>{item.value}</p>
                          <p className="text-xs" style={{ color: "#94a3b8" }}>{item.label}</p>
                        </div>
                      ))}
                    </div>
                    {r.notes && (
                      <div className="px-4 py-3.5 rounded-xl border-l-2 text-sm leading-relaxed" style={{ background: "rgba(10,22,40,0.03)", borderLeftColor: "#0a1628", color: "#475569" }}>
                        {r.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="shrink-0 text-left sm:text-right w-full sm:w-auto order-3 sm:order-0 pl-17 sm:pl-0 -mt-2 sm:mt-0">
                <p className="text-sm font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#0a1628" }}>{r.duration}</p>
                <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{r.attendees} present</p>
                {r.testimonies > 0 && (
                  <p className="text-xs mt-1.5 font-bold" style={{ color: "#8b0000" }}>
                    {r.testimonies} {r.testimonies === 1 ? "testimony" : "testimonies"}
                  </p>
                )}
                <div className="mt-2 text-xs" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                  {selected?.id === r.id ? "▲ collapse" : "▼ expand"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
