import { adminCall, adminReply, readAdminBody, sessionHash, validOrigin } from "@/lib/admin";
import { validateAdminInput } from "@/lib/admin-validation";
export async function POST(request: Request) {
  if (!validOrigin(request)) return adminReply("허용되지 않은 요청입니다.", 403);
  const session = await sessionHash(); if (!session) return adminReply("관리자 로그인이 필요합니다.", 401);
  let body; try { body = await readAdminBody(request); } catch { return adminReply("입력 내용을 확인해주세요.", 400); }
  const parsed = validateAdminInput(body.action, body.data); if ("error" in parsed) return adminReply(parsed.error, 400);
  try {
    const result = await adminCall(String(body.action), parsed.data, session);
    if (!result.ok) {
      const reason = result.reason;
      return adminReply(reason === "unauthorized" ? "로그인이 만료되었습니다. 다시 로그인해주세요." : reason === "duplicate" ? "이미 사용 중인 가게 주소 이름입니다." : reason === "not_found" ? "가게를 찾을 수 없습니다." : "입력 내용을 확인해주세요.", reason === "unauthorized" ? 401 : 400);
    }
    return adminReply("저장되었습니다.", 200, { id: result.id });
  } catch { return adminReply("저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해주세요.", 503); }
}
