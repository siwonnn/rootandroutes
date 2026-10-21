const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export function validateAdminInput(action: unknown, input: unknown): { data: Record<string, unknown> } | { error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "입력 내용을 확인해주세요." };
  const source = input as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  const fields = action === "save_shop" ? { name: 100, slug: 100, category: 50, region: 100, summary: 500, image_url: 2000, image_alt: 300, address: 300, hours: 1000, phone: 50, menu: 2000 } : action === "save_story" ? { title: 200, introduction: 1000, body: 20000 } : null;
  if (!fields) return { error: "허용되지 않은 작업입니다." };
  for (const [field, max] of Object.entries(fields)) {
    const value = source[field] ?? "";
    if (typeof value !== "string" || value.length > max) return { error: `${field} 항목의 길이나 형식을 확인해주세요.` };
    data[field] = value.trim();
  }
  if (action === "save_shop") {
    if (!data.name || !data.category || !data.region || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(data.slug))) return { error: "가게명·업종·지역을 입력하고, 주소 이름은 영문 소문자·숫자·하이픈으로 작성해주세요." };
    if (source.id && (typeof source.id !== "string" || !uuid.test(source.id))) return { error: "가게 ID가 올바르지 않습니다." };
    data.id = source.id || null;
    if (!["draft", "published", "archived"].includes(String(source.status))) return { error: "공개 상태를 확인해주세요." };
    if (data.image_url) { try { if (new URL(String(data.image_url)).protocol !== "https:") throw new Error(); } catch { return { error: "사진은 https://로 시작하는 공개 이미지 주소를 입력해주세요." }; } }
    if (data.image_url && !data.image_alt) return { error: "사진 설명을 입력해주세요." };
    const date = source.checked_at;
    if (date && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) return { error: "정보 확인일을 확인해주세요." };
    data.checked_at = date || null; data.is_sample = source.is_sample === true;
  } else {
    if (typeof source.shop_id !== "string" || !uuid.test(source.shop_id)) return { error: "연결할 가게를 선택해주세요." };
    if (!data.title) return { error: "이야기 제목을 입력해주세요." };
    if (!["draft", "published"].includes(String(source.status))) return { error: "공개 상태를 확인해주세요." };
    if (source.status === "published" && !data.body) return { error: "이야기 본문을 작성한 뒤 공개해주세요." };
    data.shop_id = source.shop_id;
  }
  data.status = source.status;
  return { data };
}
