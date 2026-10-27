import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { ready, all, get, databaseDescription } from "./db.js";
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
const onVercel = Boolean(process.env.VERCEL);

// Behind Fly/Vercel proxies: needed so req.ip is the real visitor (used for rate limiting).
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "50kb" }));

// Connect to the database and create the Senior Intercessor account once per server start
// (on Vercel: once per cold start). Retried automatically if it fails.
let startPromise = null;
function start() {
  if (!startPromise) {
    startPromise = (async () => {
      await ready();
      await bootstrapSenior();
      console.log(`[db] Connected: ${databaseDescription()}`);
    })().catch(err => {
      startPromise = null;
      throw err;
    });
  }
  return startPromise;
}

app.use("/api", async (req, res, next) => {
  try {
    await start();
    next();
  } catch (err) {
    console.error("[db] Could not connect:", err);
    res.status(503).json({ error: "The database is unavailable. Please try again shortly." });
  }
});

app.get("/api/health", async (req, res) => {
  try {
    await get("SELECT 1 AS ok");
    res.json({ status: "ok", service: "ERC Masoro Intercession API", database: "ok" });
  } catch {
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/prayer-requests", prayerRequestRoutes);
app.use("/api/intercessors", intercessorRoutes);
app.use("/api/schedule", scheduleRoutes);

app.get("/api/reports", requireAuth, async (req, res) => {
  if (!isSenior(req.user)) return res.status(403).json({ error: "Only the Senior Intercessor can generate this report." });
  const [users, prayerRequests] = await Promise.all([
    all("SELECT id, name, email, phone, role, created_at FROM users ORDER BY name"),
    all(`SELECT pr.id, pr.name, pr.contact, pr.request, pr.category, pr.priority, pr.status,
                pr.date, COALESCE(i.name, 'Unassigned') AS assigned, pr.notes, pr.testimony
         FROM prayer_requests pr
         LEFT JOIN intercessors i ON i.id = pr.assigned_intercessor_id
         ORDER BY pr.id DESC`),
  ]);
  res.json({ users, prayerRequests });
});

// Aggregate dashboard stats, computed live from the database.
// Senior Intercessor sees congregation-wide numbers; an Intercessor sees numbers for their own assignments.
app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
  const senior = isSenior(req.user);
  const myId = senior ? null : ((await intercessorIdForUser(req.user.id)) ?? -1);
  // Intercessors only count requests assigned to them; the Senior Intercessor counts everything.
  const scope = senior ? "" : "AND assigned_intercessor_id = ?";
  const scopedArgs = senior ? [] : [myId];
  const scopedCount = async (where) =>
    (await get(`SELECT COUNT(*) AS c FROM prayer_requests WHERE ${where} ${scope}`, scopedArgs)).c;

  const [
    totalIntercessors, openRequests, completedRequests, awaitingAssignment,
    sessionsThisWeek, totalTestimonies, recentRecords, urgentRequests,
  ] = await Promise.all([
    get("SELECT COUNT(*) AS c FROM intercessors WHERE status = 'Active'").then(r => r.c),
    scopedCount("status IN ('Open','Assigned','In Prayer')"),
    scopedCount("status = 'Completed'"),
    senior
      ? get("SELECT COUNT(*) AS c FROM prayer_requests WHERE assigned_intercessor_id IS NULL AND status = 'Open'").then(r => r.c)
      : Promise.resolve(0),
    get("SELECT COUNT(*) AS c FROM schedule_sessions").then(r => r.c),
    scopedCount("testimony IS NOT NULL AND TRIM(testimony) != ''"),
    all(`SELECT session_title AS session, record_date AS date, attendees, outcome
         FROM activity_records ORDER BY id DESC LIMIT 5`),
    all(`SELECT name, category, date FROM prayer_requests
         WHERE priority = 'Urgent' AND status != 'Completed' ${scope} ORDER BY id DESC LIMIT 5`, scopedArgs),
  ]);

  res.json({
    totalIntercessors, openRequests, completedRequests, requestsCovered: completedRequests,
    awaitingAssignment, sessionsThisWeek, totalTestimonies, recentRecords, urgentRequests,
  });
});

// Unknown API routes get a JSON 404 (never the HTML page).
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

// Off Vercel (Fly, Docker, local `npm start`), serve the Vite build from the same origin as the API.
// On Vercel the static files in dist/ are served by Vercel's CDN, not by Express.
if (!onVercel) {
  app.use(express.static(clientDist));
  app.get("/{*splat}", (req, res, next) => {
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON in request body." });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Request is too large." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

if (!onVercel && process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`ERC Masoro API listening on http://localhost:${PORT}`);
  });
}

export default app;
