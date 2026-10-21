import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminCall, adminConfigured, adminReply, cookieOptions, loginRateKey, newSession, passwordMatches, readAdminBody, validOrigin } from "@/lib/admin";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!validOrigin(request)) return adminReply("허용되지 않은 요청입니다.", 403);
  if (!adminConfigured()) return adminReply("관리자 접속 설정이 필요합니다.", 503);
  let body; try { body = await readAdminBody(request); } catch { return adminReply("요청 형식을 확인해주세요.", 400); }
  if (typeof body.password !== "string" || body.password.length > 256 || !body.password) return adminReply("비밀번호를 입력해주세요.", 400);
  try {
    const key = loginRateKey(request); if (!key) return adminReply("접속 환경 설정을 확인해주세요.", 503);
    const attempt = await adminCall("login_attempt", { key }, null);
    if (!attempt.ok) return adminReply("로그인 시도가 많습니다. 15분 후 다시 시도해주세요.", 429);
    if (!await passwordMatches(body.password)) return adminReply("비밀번호가 일치하지 않습니다.", 401);
    const session = newSession();
    const created = await adminCall("create_session", {}, session.hash);
    if (!created.ok) throw new Error("Session creation failed");
    (await cookies()).set(ADMIN_COOKIE, session.token, cookieOptions());
    return adminReply("로그인되었습니다.", 200);
  } catch { return adminReply("지금은 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.", 503); }
}
