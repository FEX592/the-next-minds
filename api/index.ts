import { createApp } from "../server/app.js";

// Vercel's Node.js runtime accepts a plain (req, res) handler as the
// default export, and an Express app IS one — so this is the entire
// serverless entrypoint. vercel.json rewrites every /api/* and
// /manus-storage/* request here; the app's own routing (tRPC under
// /api/trpc, local-auth under /api/auth/local/*, the storage proxy
// under /manus-storage/*) takes it from there.
export default createApp();
