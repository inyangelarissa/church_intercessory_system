// Single Vercel serverless function. vercel.json rewrites every /api/* request here and Express
// does the routing, so new endpoints never need their own file in this folder.
import app from "../server/index.js";

export default app;
