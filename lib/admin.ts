import "server-only";
import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { database } from "./data";
import type { Shop, Story } from "./types";
export const ADMIN_COOKIE = "rr_admin_session";
export const SESSION_SECONDS = 8 * 60 * 60;
export type AdminResult = { ok: boolean; reason?: string; id?: string; shops?: Shop[]; stories?: Story[] };
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
export function adminConfigured() { return !!process.env.ADMIN_PASSWORD && !!process.env.ADMIN_GATEWAY_SECRET && !!process.env.SUPABASE_URL; }
export async function sessionHash() { const token = (await cookies()).get(ADMIN_COOKIE)?.value; return token && /^[a-f0-9]{64}$/.test(token) ? sha(token) : null; }
export async function adminCall(action: string, data: Record<string, unknown> = {}, session?: string | null): Promise<AdminResult> {
  if (!adminConfigured()) throw new Error("Admin is not configured");
  const version = createHmac("sha256", process.env.ADMIN_GATEWAY_SECRET!).update(process.env.ADMIN_PASSWORD!).digest("hex");
  return database("rpc/admin_dispatch", { method: "POST", body: JSON.stringify({ p_token: process.env.ADMIN_GATEWAY_SECRET, p_action: action, p_session: session === undefined ? await sessionHash() : session, p_version: version, p_data: data }) });
}
export async function passwordMatches(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(Buffer.from(sha(password), "hex"), Buffer.from(sha(expected), "hex"));
}
export function newSession() { const token = randomBytes(32).toString("hex"); return { token, hash: sha(token) }; }
export function loginRateKey(request: Request) {
  const header = process.env.VERCEL ? "x-vercel-forwarded-for" : process.env.TRUSTED_IP_HEADER;
  const ip = header ? request.headers.get(header)?.split(",")[0].trim() : process.env.NODE_ENV === "development" || process.env.ALLOW_LOCAL_TESTING === "true" ? "127.0.0.1" : undefined;
  return ip && isIP(ip) ? createHmac("sha256", process.env.ADMIN_GATEWAY_SECRET!).update(`login:${ip}`).digest("hex") : null;
}
export function validOrigin(request: Request) { return request.headers.get("origin") === new URL(process.env.SITE_URL || request.url).origin; }
export function cookieOptions() { return { httpOnly: true, secure: new URL(process.env.SITE_URL || "http://localhost:3000").protocol === "https:", sameSite: "strict" as const, path: "/", maxAge: SESSION_SECONDS }; }
export function adminReply(message: string, status: number, extra: object = {}) { return Response.json({ message, ...extra }, { status, headers: { "Cache-Control": "no-store" } }); }
export async function readAdminBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("Invalid content type");
  const reader = request.body?.getReader(); if (!reader) throw new Error("Empty request");
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 90000) { await reader.cancel(); throw new Error("Request too large"); } chunks.push(value); }
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid request");
  return body as Record<string, unknown>;
}
