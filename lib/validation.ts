export type Submission = { kind: "review" | "letter"; shopId: string; nickname: string; body: string; consent: true; website?: string };
export function validateSubmission(input: unknown): { value: Submission } | { error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "입력 내용을 확인해주세요." };
  const data = input as Record<string, unknown>;
  if (data.kind !== "review" && data.kind !== "letter") return { error: "글 종류를 확인해주세요." };
  if (typeof data.shopId !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(data.shopId)) return { error: "가게 정보를 확인해주세요." };
  if (typeof data.nickname !== "string" || data.nickname.trim().length < 2 || data.nickname.trim().length > 20) return { error: "보내는 이름은 2~20자로 적어주세요." };
  if (typeof data.body !== "string" || data.body.trim().length < 10 || data.body.trim().length > 2000) return { error: "내용은 10~2,000자로 적어주세요." };
  if (data.consent !== true) return { error: "닉네임과 글 공개에 동의해주세요." };
  if (data.website) return { error: "요청을 처리할 수 없습니다." };
  return { value: { kind: data.kind, shopId: data.shopId, nickname: data.nickname.trim(), body: data.body.trim(), consent: true } };
}
