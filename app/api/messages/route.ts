import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { database, submissionsEnabled } from "@/lib/data";
import { validateSubmission } from "@/lib/validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const reply = (message: string, status: number) => Response.json({ message }, { status });
  const expectedOrigin = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : new URL(request.url).origin;
  if (request.headers.get("origin") !== expectedOrigin) return reply("허용되지 않은 요청입니다.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply("요청 형식이 올바르지 않습니다.", 415);
  let input: unknown;
  try {
    // Bound the actual stream, not just the caller-controlled Content-Length.
    const reader = request.body?.getReader(); if (!reader) return reply("입력 내용이 없습니다.", 400);
    const chunks: Uint8Array[] = []; let total = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > 16000) { await reader.cancel(); return reply("입력 내용이 너무 깁니다.", 413); } chunks.push(value); }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return reply("입력 내용을 확인해주세요.", 400); }
  const result = validateSubmission(input); if ("error" in result) return reply(result.error, 400);
  if (!submissionsEnabled()) return reply("아직 글 접수를 준비하고 있어요. 잠시 후 다시 방문해주세요.", 503);
  // Trust only a header overwritten by the hosting proxy. Never blindly accept x-forwarded-for.
  const trustedHeader = process.env.VERCEL ? "x-vercel-forwarded-for" : process.env.TRUSTED_IP_HEADER;
  const ip = trustedHeader ? request.headers.get(trustedHeader)?.split(",")[0].trim() : process.env.NODE_ENV === "development" || process.env.ALLOW_LOCAL_TESTING === "true" ? "127.0.0.1" : undefined;
  if (!ip || !isIP(ip)) return reply("글 접수 연결을 준비하고 있습니다.", 503);
  const secret = process.env.SUBMISSION_GATEWAY_SECRET!;
  const limiterKey = createHmac("sha256", secret).update(ip).digest("hex");
  const { value } = result;
  try {
    const saved = await database<{ ok: boolean; reason?: string }>("rpc/submit_message", { method: "POST", body: JSON.stringify({ p_token: secret, p_rate_key: limiterKey, p_kind: value.kind, p_shop_id: value.shopId, p_nickname: value.nickname, p_body: value.body }) });
    if (!saved.ok) return reply(saved.reason === "rate_limit" ? "잠시 쉬어갈까요? 한 시간에 5개의 글을 보낼 수 있어요." : "가게 정보를 확인한 뒤 다시 시도해주세요.", saved.reason === "rate_limit" ? 429 : 400);
    return reply("글이 접수되었습니다. 운영팀 확인 후 공개됩니다.", 201);
  } catch { return reply("지금은 글을 접수하지 못했어요. 작성 내용은 그대로 있으니 잠시 후 다시 시도해주세요.", 503); }
}
