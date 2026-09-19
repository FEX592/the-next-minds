import crypto from "node:crypto";
import { SignJWT } from "jose";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS, safeAdminReturnTo } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies.js";
import * as db from "./db.js";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(200);
const emailSchema = z.string().trim().email().max(320).transform(value => value.toLowerCase());
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "development-only-change-me");

export function hashPassword(password: string) { const salt = crypto.randomBytes(16).toString("hex"); const hash = crypto.scryptSync(password, salt, 64).toString("hex"); return `scrypt:${salt}:${hash}`; }
export function verifyPassword(password: string, encoded: string) { const [algorithm, salt, expected] = encoded.split(":"); if (algorithm !== "scrypt" || !salt || !expected) return false; const actual = crypto.scryptSync(password, salt, 64).toString("hex"); return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex")); }
export async function createLocalSessionToken(openId: string, name: string) { return new SignJWT({ openId, appId: "local", name }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1y").sign(secret); }
function setSession(res: Response, req: Request, token: string) { res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS }); }
function fail(res: Response, status: number, message: string) { res.status(status).json({ error: message }); }

export function registerLocalAuthRoutes(app: Express) {
  app.get("/api/auth/local/bootstrap-status", async (_req, res) => { res.json({ available: await db.countUsers() === 0 }); });
  app.post("/api/auth/local/bootstrap", async (req, res) => {
    const parsed = z.object({ name: z.string().trim().min(1).max(160), email: emailSchema, password: passwordSchema, setupToken: z.string().min(16).optional() }).safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message ?? "Invalid administrator details");
    if (process.env.BOOTSTRAP_ADMIN_TOKEN && parsed.data.setupToken !== process.env.BOOTSTRAP_ADMIN_TOKEN) return fail(res, 403, "Invalid bootstrap setup token");
    if (await db.countUsers() !== 0) return fail(res, 409, "Initial administrator setup has already been completed");
    try { const user = await db.createLocalUser({ openId: `local:${crypto.randomUUID()}`, name: parsed.data.name, email: parsed.data.email, passwordHash: hashPassword(parsed.data.password), role: "admin" }); setSession(res, req, await createLocalSessionToken(user.openId, user.name ?? user.email ?? "Administrator")); res.json({ success: true, returnTo: safeAdminReturnTo("/admin") }); } catch (e) { console.error("[Local auth] bootstrap failed", e); fail(res, 500, "Unable to create initial administrator"); }
  });
  app.post("/api/auth/local/signup", async (req, res) => {
    const parsed = z.object({ name: z.string().trim().min(1).max(160), email: emailSchema, password: passwordSchema, inviteToken: z.string().min(32).max(128) }).safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message ?? "Invalid signup details");
    const { name, email, password, inviteToken } = parsed.data;
    try { const existing = await db.getUserByEmail(email); if (existing) return fail(res, 409, "An account with this email already exists"); const user = await db.createLocalUser({ openId: `local:${crypto.randomUUID()}`, name, email, passwordHash: hashPassword(password), role: "user" }); if (!await db.consumeAdminInvite(inviteToken, user.id)) { await db.deleteUser(user.id); return fail(res, 400, "This invitation is invalid, expired, revoked, or already used"); } setSession(res, req, await createLocalSessionToken(user.openId, user.name ?? email)); res.json({ success: true, returnTo: safeAdminReturnTo("/admin") }); } catch (e) { console.error("[Local auth] signup failed", e); fail(res, 500, "Unable to create account"); }
  });
  app.post("/api/auth/local/signin", async (req, res) => { const parsed = z.object({ email: emailSchema, password: passwordSchema }).safeParse(req.body); if (!parsed.success) return fail(res, 400, "Enter a valid email and password"); const user = await db.getUserByEmail(parsed.data.email); if (!user?.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) return fail(res, 401, "Invalid email or password"); await db.touchUser(user.id); setSession(res, req, await createLocalSessionToken(user.openId, user.name ?? user.email ?? "User")); res.json({ success: true }); });
  app.post("/api/auth/local/signout", (req, res) => { res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 }); res.json({ success: true }); });
}
