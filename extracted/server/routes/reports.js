import { Router } from "express";
import { all } from "../db.js";
import { requireAuth, isSenior, intercessorIdForUser } from "../auth.js";

const router = Router();

// Everything the Reports page needs, in one round trip. The page builds each report
// (summaries, filters, CSV, print) from this data in the browser.
//
//   Senior Intercessor -> the whole congregation: every request, intercessor and user account.
//   Intercessor        -> only the requests assigned to them, and their own roster entry.
//                         (The prayer schedule is visible to every signed-in user already.)
router.get("/", requireAuth, async (req, res) => {
  const senior = isSenior(req.user);
  const myId = senior ? null : await intercessorIdForUser(req.user.id);

  const requestScope = senior ? "" : "WHERE pr.assigned_intercessor_id = ?";
  const requestArgs = senior ? [] : [myId ?? -1];
  const intercessorScope = senior ? "" : "WHERE i.id = ?";
  const intercessorArgs = senior ? [] : [myId ?? -1];

  const [users, prayerRequests, intercessors, sessions, activityRecords] = await Promise.all([
    senior
      ? all("SELECT id, name, email, phone, role, created_at FROM users ORDER BY name")
      : Promise.resolve([]),
    all(`SELECT pr.id, pr.name, pr.contact, pr.request, pr.category, pr.priority, pr.status,
                pr.date, COALESCE(i.name, 'Unassigned') AS assigned, pr.notes, pr.testimony
         FROM prayer_requests pr
         LEFT JOIN intercessors i ON i.id = pr.assigned_intercessor_id
         ${requestScope}
         ORDER BY pr.id DESC`, requestArgs),
    all(`SELECT i.id, i.name, i.role, i.phone, i.email, i.status, i.joined_date AS joinedDate,
                (SELECT COUNT(*) FROM prayer_requests pr WHERE pr.assigned_intercessor_id = i.id AND pr.status != 'Completed') AS assignedRequests,
                (SELECT COUNT(*) FROM prayer_requests pr WHERE pr.assigned_intercessor_id = i.id AND pr.status = 'Completed') AS completedPrayers,
                (SELECT COUNT(*) FROM prayer_requests pr WHERE pr.assigned_intercessor_id = i.id AND pr.testimony IS NOT NULL AND TRIM(pr.testimony) != '') AS testimonies,
                (SELECT GROUP_CONCAT(s.specialization, ', ') FROM intercessor_specializations s WHERE s.intercessor_id = i.id) AS specializations,
                (SELECT GROUP_CONCAT(a.day, ', ') FROM intercessor_availability a WHERE a.intercessor_id = i.id) AS availability
         FROM intercessors i
         ${intercessorScope}
         ORDER BY i.name`, intercessorArgs),
    all(`SELECT s.id, s.title, s.day, s.time, s.duration, s.venue, s.focus, s.recurrence,
                COALESCE(l.name, 'Unassigned') AS lead,
                (SELECT GROUP_CONCAT(m.name, ', ') FROM schedule_session_intercessors ssi
                   JOIN intercessors m ON m.id = ssi.intercessor_id WHERE ssi.session_id = s.id) AS team
         FROM schedule_sessions s
         LEFT JOIN intercessors l ON l.id = s.lead_intercessor_id
         ORDER BY s.id`),
    all(`SELECT id, session_title AS sessionTitle, record_date AS recordDate, lead_name AS lead, attendees,
                requests_covered AS requestsCovered, duration, outcome, notes, testimonies
         FROM activity_records ORDER BY id DESC`),
  ]);

  res.json({
    scope: senior ? "all" : "mine",
    generatedAt: new Date().toISOString(),
    users, prayerRequests, intercessors, sessions, activityRecords,
  });
});

export default router;
