"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    const password = new FormData(e.currentTarget).get("password");
    try {
      const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await r.json(); if (!r.ok) throw new Error(result.message);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "연결을 확인해주세요."); }
    finally { setBusy(false); }
  }
  return <section className="admin-login"><p className="eyebrow">ROOTS & ROUTES · ADMIN</p><h1>관리자 로그인</h1><p>가게와 이야기를 관리하는 공간입니다.<br/>관리자 비밀번호를 입력해주세요.</p><form onSubmit={login}><label htmlFor="admin-password">비밀번호</label><input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={256} disabled={busy || !configured}/><button className="button primary" disabled={busy || !configured}>{busy ? "확인 중…" : "관리자 페이지 들어가기"}</button><p className="admin-error" role="alert">{message || (!configured ? "관리자 비밀번호 설정이 필요합니다." : "")}</p></form></section>;
}
