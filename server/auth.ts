import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

// Single-advisor authentication: the password lives in the AGENT_PASSWORD environment variable,
// the session is a signed, HttpOnly cookie. Nothing secret ever reaches the browser bundle.

const COOKIE = "estimeo_agent";
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.SESSION_SECRET) {
  console.warn("[auth] SESSION_SECRET is not set: advisor sessions will be invalidated on every restart.");
}

const sha = (v: string) => crypto.createHash("sha256").update(v).digest();

export function isAuthConfigured(): boolean {
  return Boolean(process.env.AGENT_PASSWORD && process.env.AGENT_PASSWORD.length >= 8);
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

export function createSessionToken(ttlMs: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + ttlMs })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now();
  } catch {
    return false;
  }
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.AGENT_PASSWORD || "";
  if (!isAuthConfigured()) return false;
  return crypto.timingSafeEqual(sha(candidate), sha(expected));
}

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function setSessionCookie(req: Request, res: Response, remember: boolean) {
  const ttl = remember ? 30 * 24 * 3600 * 1000 : 12 * 3600 * 1000;
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${encodeURIComponent(createSessionToken(ttl))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(ttl / 1000)}${secure ? "; Secure" : ""}`,
  );
}

export function clearSessionCookie(res: Response) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function isAgentRequest(req: Request): boolean {
  return verifySessionToken(readCookie(req, COOKIE));
}

export function requireAgent(req: Request, res: Response, next: NextFunction) {
  if (isAgentRequest(req)) return next();
  res.status(401).json({ error: "Authentification requise", code: "AGENT_AUTH_REQUIRED" });
}

// ---- Minimal in-memory rate limiter (per IP and bucket). Enough for one instance. ----
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(name: string, max: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || b.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (++b.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((b.resetAt - now) / 1000)));
      return res.status(429).json({ error: "Trop de requêtes. Merci de réessayer dans quelques instants." });
    }
    next();
  };
}

/** Failed-login limiter: only failures count. */
const failures = new Map<string, { count: number; resetAt: number }>();
export function loginBlocked(ip: string): number {
  const f = failures.get(ip);
  return f && f.resetAt > Date.now() && f.count >= 5 ? Math.ceil((f.resetAt - Date.now()) / 1000) : 0;
}
export function recordLoginFailure(ip: string) {
  const now = Date.now();
  const f = failures.get(ip);
  if (!f || f.resetAt < now) failures.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
  else f.count++;
}
export function clearLoginFailures(ip: string) {
  failures.delete(ip);
}

// Keep the maps from growing forever
setInterval(() => {
  const now = Date.now();
  for (const m of [buckets, failures]) for (const [k, v] of m) if (v.resetAt < now) m.delete(k);
}, 10 * 60 * 1000).unref();

/** Signed opaque tokens for links sent by e-mail (e.g. unsubscribe). No expiry: a link must keep working. */
export function signValue(value: string): string {
  return `${value}.${sign(`v:${value}`)}`;
}
export function readSignedValue(token: string): string | null {
  const i = token.lastIndexOf(".");
  if (i < 1) return null;
  const value = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = sign(`v:${value}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return value;
}
