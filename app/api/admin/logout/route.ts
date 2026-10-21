import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminCall, adminReply, cookieOptions, validOrigin } from "@/lib/admin";
export async function POST(request: Request) {
  if (!validOrigin(request)) return adminReply("허용되지 않은 요청입니다.", 403);
  try {
    await adminCall("logout");
    (await cookies()).set(ADMIN_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
    return adminReply("로그아웃되었습니다.", 200);
  } catch { return adminReply("로그아웃하지 못했습니다. 다시 시도해주세요.", 503); }
}
