import "server-only";
import { demoShops, demoStories } from "./demo";
import type { Shop, Story, Message } from "./types";
export function isDemo() { return process.env.DEMO_MODE === "true" || !process.env.SUPABASE_URL; }
export function submissionsEnabled() { return !!process.env.SUPABASE_URL && !!process.env.SUBMISSION_GATEWAY_SECRET; }
export async function database<T>(path: string, init?: RequestInit): Promise<T> {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase configuration is incomplete");
  const headers = new Headers(init?.headers); headers.set("apikey", key);
  if (key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${key}`);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Database request failed (${response.status})`);
  return response.status === 204 ? undefined as T : response.json();
}
export async function getShops(): Promise<Shop[]> { return isDemo() ? demoShops : database("shops?select=*&status=eq.published&order=name.asc"); }
export async function getShop(slug: string): Promise<Shop | undefined> { return isDemo() ? demoShops.find(s => s.slug === slug) : (await database<Shop[]>(`shops?select=*&status=eq.published&slug=eq.${encodeURIComponent(slug)}&limit=1`))[0]; }
export async function getStories(): Promise<Story[]> { return isDemo() ? demoStories : database("stories?select=*&status=eq.published&order=created_at.desc"); }
export async function getStory(shopId: string): Promise<Story | undefined> { return isDemo() ? demoStories.find(s => s.shop_id === shopId) : (await database<Story[]>(`stories?select=*&status=eq.published&shop_id=eq.${encodeURIComponent(shopId)}&limit=1`))[0]; }
export async function getMessages(shopId: string, kind: "reviews" | "letters"): Promise<Message[]> { return isDemo() ? [] : database(`${kind}?select=id,nickname,body,created_at&status=eq.approved&shop_id=eq.${encodeURIComponent(shopId)}&order=created_at.desc&limit=50`); }
