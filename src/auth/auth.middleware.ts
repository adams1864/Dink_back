import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { auth as betterAuthInstance } from "./betterAuth.js";

export interface AuthRequest extends Request {
  user?: any;
}

function parseCookieHeader(header: unknown): Record<string, string> {
  if (typeof header !== "string" || header.length === 0) {
    return {};
  }

  const entries = header.split(";").map((part) => part.trim()).filter(Boolean);
  const cookies: Record<string, string> = {};

  for (const entry of entries) {
    const eqIndex = entry.indexOf("=");
    if (eqIndex === -1) continue;
    const keyRaw = entry.slice(0, eqIndex).trim();
    const valueRaw = entry.slice(eqIndex + 1).trim();
    if (!keyRaw) continue;
    try {
      const key = decodeURIComponent(keyRaw);
      const value = decodeURIComponent(valueRaw);
      cookies[key] = value;
    } catch (_err) {
      cookies[keyRaw] = valueRaw;
    }
  }

  return cookies;
}

async function resolveSessionFromToken(token: string): Promise<any | null> {
  const a = betterAuthInstance as any;
  if (a && a.api && typeof a.api.getSession === "function") {
    const session = await a.api.getSession({ token });
    if (session) {
      return session?.user ?? session;
    }
  }
  return null;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!process.env.REQUIRE_AUTH || process.env.REQUIRE_AUTH === "false") {
    // Auth temporarily disabled; continue without verifying tokens.
    return next();
  }

  const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  let token: string | null = null;

  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1] ?? null;
  }

  if (!token) {
    const cookies = parseCookieHeader(req.headers.cookie);
    token = cookies["better-auth.session_token"] ?? cookies["session_token"] ?? null;
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const secret: string = process.env.JWT_SECRET ?? "dev-secret";

  try {
    const sessionUser = await resolveSessionFromToken(token);
    if (sessionUser) {
      req.user = sessionUser;
      return next();
    }

    const payload = jwt.verify(token, secret);
    req.user = payload as any;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
