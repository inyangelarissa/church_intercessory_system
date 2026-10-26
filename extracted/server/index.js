import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db.js";
import authRoutes from "./routes/auth.js";
import prayerRequestRoutes from "./routes/prayerRequests.js";
import intercessorRoutes from "./routes/intercessors.js";
import scheduleRoutes from "./routes/schedule.js";
import { requireAuth, isSenior, intercessorIdForUser } from "./auth.js";
import { bootstrapSenior } from "./seniorAccount.js";

const app = express();
const PORT = process.env.PORT || 5174;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../dist");

bootstrapSenior();

// Behind Fly/Vercel proxies: needed so req.ip is the real visitor (used for rate limiting).
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "50kb" }));

app.get("/api/health", (req, res) => {
  try {
    db.prepare("SELECT 1").get();
    res.json({ status: "ok", service: "ERC Masoro Intercession API", database: "ok" });
  } catch {
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/prayer-requests", prayerRequestRoutes);
app.use("/api/intercessors", intercessorRoutes);
app.use("/api/schedule", scheduleRoutes);

// Aggregate dashboard stats, computed live from the database.
// Senior Intercessor sees congregation-wide numbers; an Intercessor sees numbers for their own assignments.
app.get("/api/dashboard/stats", requireAuth, (req, res) => {
  const senior = isSenior(req.user);
  const myId = senior ? null : (intercessorIdForUser(req.user.id) ?? -1);
  // Intercessors only count requests assigned to them; the Senior Intercessor counts everything.
  const scope = senior ? "" : "AND assigned_intercessor_id = ?";
  const scopedArgs = senior ? [] : [myId];
  const scopedCount = (where) =>
    db.prepare(`SELECT COUNT(*) AS c FROM prayer_requests WHERE ${where} ${scope}`).get(...scopedArgs).c;

  const totalIntercessors = db.prepare("SELECT COUNT(*) AS c FROM intercessors WHERE status = 'Active'").get().c;
  const openRequests = scopedCount("status IN ('Open','Assigned','In Prayer')");
  const completedRequests = scopedCount("status = 'Completed'");
  const awaitingAssignment = senior
    ? db.prepare("SELECT COUNT(*) AS c FROM prayer_requests WHERE assigned_intercessor_id IS NULL AND status = 'Open'").get().c
    : 0;
  const sessionsThisWeek = db.prepare("SELECT COUNT(*) AS c FROM schedule_sessions").get().c;
  const totalTestimonies = scopedCount("testimony IS NOT NULL AND TRIM(testimony) != ''");
  const recentRecords = db.prepare(`
    SELECT session_title AS session, record_date AS date, attendees, outcome
    FROM activity_records ORDER BY id DESC LIMIT 5
  `).all();
  const urgentRequests = db.prepare(`
    SELECT name, category, date FROM prayer_requests
    WHERE priority = 'Urgent' AND status != 'Completed' ${scope} ORDER BY id DESC LIMIT 5
  `).all(...scopedArgs);

  res.json({
    totalIntercessors, openRequests, completedRequests, requestsCovered: completedRequests,
    awaitingAssignment, sessionsThisWeek, totalTestimonies, recentRecords, urgentRequests,
  });
});

// Serve the production Vite build from the same origin as the API.
app.use(express.static(clientDist));
app.get("/{*splat}", (req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next(err);
  });
});

app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON in request body." });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Request is too large." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`ERC Masoro API listening on http://localhost:${PORT}`);
  });
}

export default app;
