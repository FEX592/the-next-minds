import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "development-only-change-me");
export type AuthenticatedUser = User;
class LocalAuthSdk { async authenticateRequest(req: Request): Promise<AuthenticatedUser> { const cookies = parseCookieHeader(req.headers.cookie ?? ""); const token = cookies[COOKIE_NAME] || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined); if (!token) throw ForbiddenError("Invalid session"); try { const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] }); if (payload.appId !== "local" || typeof payload.openId !== "string") throw new Error("Invalid local session"); const user = await db.getUserByOpenId(payload.openId); if (!user) throw new Error("User not found"); return user; } catch { throw ForbiddenError("Invalid session"); } } }
export const sdk = new LocalAuthSdk();
