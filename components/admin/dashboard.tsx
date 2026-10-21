"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Shop, Story } from "@/lib/types";

const labels: Record<string, string> = { draft: "초안", published: "공개", archived: "보관" };
const blankShop: Shop = { id: "", slug: "", name: "", category: "", region: "", summary: "", image_url: "", image_alt: "", address: "", hours: "", phone: "", menu: "", checked_at: null, status: "draft", is_sample: false };
type Editor = { kind: "shop"; value: Shop } | { kind: "story"; value: Story; shop: Shop };

export function AdminDashboard({ shops, stories }: { shops: Shop[]; stories: Story[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState("shops"), [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const filtered = shops.filter(s => `${s.name} ${s.region} ${s.category}`.toLowerCase().includes(search.toLowerCase()));
  function edit(next: Editor) { setEditor(next); setEditorKey(k => k + 1); setError(""); dialog.current?.showModal(); }
  function editStory(shop: Shop) {
    edit({ kind: "story", shop, value: stories.find(s => s.shop_id === shop.id) || { id: "", shop_id: shop.id, title: "", introduction: "", body: "", status: "draft" } });
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!editor) return;
    setBusy(true); setError("");
    const data: Record<string, unknown> = Object.fromEntries(new FormData(e.currentTarget));
    if (editor.kind === "shop") { data.id = editor.value.id || null; data.is_sample = data.is_sample === "on"; }
    else data.shop_id = editor.shop.id;
    try {
      const response = await fetch("/api/admin/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: `save_${editor.kind}`, data }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message);
      dialog.current?.close(); setNotice(editor.kind === "shop" ? "가게 정보를 저장했습니다." : "이야기를 저장했습니다."); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다. 연결을 확인해주세요."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { const r = await fetch("/api/admin/logout", { method: "POST" }); if (!r.ok) throw new Error(); router.refresh(); }
    catch { setNotice("로그아웃하지 못했습니다. 다시 시도해주세요."); }
    finally { setBusy(false); }
  }
  return <>
    <div className="admin-heading"><div><p className="eyebrow">ROOTS & ROUTES · ADMIN</p><h1>가게와 이야기 관리</h1><p>이웃의 가게를 소개하고, 그곳에 담긴 이야기를 기록해요.</p></div><button className="button" onClick={logout} disabled={busy}>로그아웃</button></div>
    <div className="admin-stats"><div><span>등록된 가게</span><strong>{shops.length}</strong></div><div><span>공개 중인 가게</span><strong>{shops.filter(s => s.status === "published").length}</strong></div><div><span>작성한 이야기</span><strong>{stories.length}</strong></div></div>
    <div className="admin-toolbar"><div className="admin-tabs" aria-label="관리 항목"><button aria-pressed={tab === "shops"} onClick={() => setTab("shops")}>가게 관리</button><button aria-pressed={tab === "stories"} onClick={() => setTab("stories")}>이야기 관리</button></div><button className="button primary" onClick={() => edit({ kind: "shop", value: { ...blankShop } })}>+ 가게 등록</button></div>
    <label className="admin-search">가게 검색<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="가게명, 지역, 업종으로 찾기"/></label>
    <p className="admin-notice" role="status">{notice}</p>
    <div className="admin-list">{filtered.map(shop => {
      const story = stories.find(s => s.shop_id === shop.id);
      const status = tab === "shops" ? shop.status : story?.status;
      return <article key={shop.id} className="admin-row"><div className="admin-row-main"><div className="admin-row-meta"><span className={`admin-badge ${status || "empty"}`}>{status ? labels[status] : "미작성"}</span>{shop.is_sample && <span>예시 가게</span>}<span>{shop.region} · {shop.category}</span></div><h2>{tab === "stories" ? story?.title || "아직 이야기가 없습니다" : shop.name}</h2><p>{tab === "stories" ? shop.name : shop.summary || "소개를 작성해주세요."}</p>{tab === "stories" && story?.status === "published" && shop.status !== "published" && <small>가게가 공개되면 이야기도 사이트에 표시됩니다.</small>}</div><div className="admin-row-actions">{shop.status === "published" && <Link href={`/shops/${shop.slug}`} target="_blank" rel="noreferrer">사이트 보기 ↗</Link>}<button className="button" onClick={() => tab === "shops" ? edit({ kind: "shop", value: shop }) : editStory(shop)}>{tab === "shops" ? "가게 수정" : story ? "이야기 수정" : "이야기 작성"}</button>{tab === "shops" && <button className="admin-text-button" onClick={() => editStory(shop)}>{story ? "이야기 수정" : "이야기 작성"}</button>}</div></article>;
    })}{!filtered.length && <div className="admin-empty">{search ? "검색 결과가 없습니다." : "아직 등록된 가게가 없습니다. 첫 가게를 등록해주세요."}</div>}</div>
    <p className="admin-help">이야기는 가게마다 한 편씩 연결됩니다. 초안은 방문자에게 보이지 않으며, 가게를 보관하면 가게와 이야기가 함께 숨겨집니다.</p>
    <dialog ref={dialog} className="admin-dialog" aria-label="가게와 이야기 편집" onCancel={e => { if (busy) e.preventDefault(); }}>
      {editor && <form key={editorKey} onSubmit={save}>
        <div className="admin-dialog-heading"><div><p className="eyebrow">{editor.kind === "shop" ? "SHOP" : editor.shop.name}</p><h2>{editor.kind === "shop" ? editor.value.id ? "가게 수정" : "새 가게 등록" : "이야기 작성·수정"}</h2></div><button type="button" className="admin-close" aria-label="닫기" onClick={() => dialog.current?.close()} disabled={busy}>×</button></div>
        <fieldset disabled={busy} className="admin-fields">
          {editor.kind === "shop" ? <>
            <div className="admin-form-grid"><Field label="가게명" name="name" value={editor.value.name} max={100} required/><Field label="주소 이름 (영문)" name="slug" value={editor.value.slug} max={100} required hint="예: hometown-table · 사이트 주소에 사용됩니다." pattern="[a-z0-9]+(-[a-z0-9]+)*"/><Field label="업종" name="category" value={editor.value.category} max={50} required hint="예: 음식점, 카페, 공방"/><Field label="지역" name="region" value={editor.value.region} max={100} required hint="예: 경기 안산"/></div>
            <Field label="가게 소개" name="summary" value={editor.value.summary} max={500} multiline/>
            <Field label="주소" name="address" value={editor.value.address} max={300}/>
            <div className="admin-form-grid"><Field label="영업시간" name="hours" value={editor.value.hours} max={1000} multiline/><Field label="연락처" name="phone" value={editor.value.phone} max={50}/></div>
            <Field label="메뉴·판매 품목" name="menu" value={editor.value.menu} max={2000} multiline/>
            <Field label="대표 사진 주소" name="image_url" value={editor.value.image_url} max={2000} type="url" hint="Supabase Storage에 사진을 올린 뒤 https 공개 URL을 붙여넣으세요."/>
            <Field label="사진 설명" name="image_alt" value={editor.value.image_alt} max={300} hint="사진을 볼 수 없는 방문자를 위한 설명입니다. 사진 등록 시 필수입니다."/>
            <Field label="마지막 정보 확인일" name="checked_at" value={editor.value.checked_at || ""} type="date"/>
            <label className="admin-checkbox"><input type="checkbox" name="is_sample" defaultChecked={editor.value.is_sample}/>예시 가게로 표시 (실제 가게가 아닌 경우)</label>
          </> : <><Field label="이야기 제목" name="title" value={editor.value.title} max={200} required/><Field label="짧은 소개" name="introduction" value={editor.value.introduction} max={1000} multiline/><Field label="이야기 본문" name="body" value={editor.value.body} max={20000} multiline rows={14} hint="문단 사이에 빈 줄을 넣어주세요. 글자 그대로 표시되며 HTML은 사용하지 않습니다."/></>}
          <label className="admin-field">공개 상태<select name="status" defaultValue={editor.value.status}><option value="draft">초안 · 관리자만 보기</option><option value="published">공개 · 사이트에 표시</option>{editor.kind === "shop" && <option value="archived">보관 · 사이트에서 숨기기</option>}</select></label>
        </fieldset>
        <p className="admin-error" role="alert">{error}</p><div className="admin-dialog-footer"><button type="button" className="button" disabled={busy} onClick={() => dialog.current?.close()}>취소</button><button className="button primary" disabled={busy}>{busy ? "저장 중…" : "저장하기"}</button></div>
      </form>}
    </dialog>
  </>;
}

function Field({ label, name, value, max, required, hint, multiline, rows = 3, type = "text", pattern }: { label: string; name: string; value: string; max?: number; required?: boolean; hint?: string; multiline?: boolean; rows?: number; type?: string; pattern?: string }) {
  return <label className="admin-field">{label}{required ? " *" : ""}{multiline ? <textarea name={name} defaultValue={value} maxLength={max} required={required} rows={rows}/> : <input name={name} defaultValue={value} maxLength={max} required={required} type={type} pattern={pattern}/>} {hint && <small>{hint}</small>}</label>;
}
