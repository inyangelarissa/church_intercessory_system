import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db.js";
import authRoutes from "./routes/auth.js";
import prayerRequestRoutes from "./routes/prayerRequests.js";
import intercessorRoutes from "./routes/intercessors.js";
import scheduleRoutes from "./routes/schedule.js";
import activityRecordRoutes from "./routes/activityRecords.js";
import { requireAuth } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 5174;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../dist");

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "ERC Masoro Intercession API" }));

app.use("/api/auth", authRoutes);
app.use("/api/prayer-requests", prayerRequestRoutes);
app.use("/api/intercessors", intercessorRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/activity-records", activityRecordRoutes);

// Aggregate dashboard stats, computed live from the database.
app.get("/api/dashboard/stats", requireAuth, (req, res) => {
  const totalIntercessors = db.prepare("SELECT COUNT(*) AS c FROM intercessors WHERE status = 'Active'").get().c;
  const openRequests = db.prepare("SELECT COUNT(*) AS c FROM prayer_requests WHERE status IN ('Open','Assigned','In Prayer')").get().c;
  const completedRequests = db.prepare("SELECT COUNT(*) AS c FROM prayer_requests WHERE status = 'Completed'").get().c;
  const requestsCovered = completedRequests;
  const sessionsThisWeek = db.prepare("SELECT COUNT(*) AS c FROM schedule_sessions").get().c;
  const totalTestimonies = db.prepare("SELECT COUNT(*) AS c FROM prayer_requests WHERE testimony IS NOT NULL AND TRIM(testimony) != ''").get().c;
  const recentRecords = db.prepare(`
    SELECT session_title AS session, record_date AS date, attendees, outcome
    FROM activity_records ORDER BY id DESC LIMIT 5
  `).all();
  const urgentRequests = db.prepare(`
    SELECT name, category, date FROM prayer_requests
    WHERE priority = 'Urgent' AND status != 'Completed' ORDER BY id DESC LIMIT 5
  `).all();

  res.json({ totalIntercessors, openRequests, completedRequests, requestsCovered, sessionsThisWeek, totalTestimonies, recentRecords, urgentRequests });
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
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`ERC Masoro API listening on http://localhost:${PORT}`);
  });
}

export default app;
