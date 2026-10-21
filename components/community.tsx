"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";

type Kind = "review" | "letter";
type CommunityProps = {
  shopId: string;
  shopName: string;
  reviews: Message[];
  letters: Message[];
  enabled: boolean;
  sample: boolean;
  initialKind?: Kind;
};

export function Community({ shopId, shopName, reviews, letters, enabled, sample, initialKind = "review" }: CommunityProps) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const messages = kind === "review" ? reviews : letters;
  const writeLabel = kind === "review" ? "후기 작성하기" : "편지 작성하기";

  useEffect(() => {
    if (initialKind === "letter" && !dialog.current?.open) dialog.current?.showModal();
  }, [initialKind]);

  function close() {
    if (busy) return;
    dialog.current?.close();
    trigger.current?.focus();
  }

  return (
    <section className="community" id="community">
      <div className="section-heading">
        <div><p className="eyebrow">FROM ONE NEIGHBOR TO ANOTHER</p><h2>다녀간 기억, 전하고 싶은 마음.</h2></div>
        <button ref={trigger} className="button primary" type="button" onClick={() => dialog.current?.showModal()}>{writeLabel} ↗</button>
      </div>
      <div className="community-tabs" aria-label="글 종류">
        {(["review", "letter"] as const).map(k => (
          <button key={k} type="button" className={kind === k ? "active" : ""} aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k === "review" ? `방문 후기 (${reviews.length})` : `사장님께 편지 (${letters.length})`}
          </button>
        ))}
      </div>
      <div className="messages community-feed">
        {messages.length === 0 ? (
          <div className="empty-message">
            <h3>{kind === "review" ? "첫 방문 이야기를 들려주세요." : "첫 번째 편지의 주인공이 되어주세요."}</h3>
            <p>{kind === "review" ? "어떤 메뉴를 만났나요? 공간은 어땠나요?" : "이야기를 읽으며 떠오른 마음도 좋아요."}<br/>작성 버튼을 눌러 이야기를 남겨주세요.</p>
          </div>
        ) : messages.map(message => (
          <article className="message" key={message.id}>
            <div><strong>{message.nickname}</strong><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</time></div>
            <p>{message.body}</p>
          </article>
        ))}
      </div>
      <dialog ref={dialog} className="compose-dialog" aria-labelledby="compose-title" onCancel={e => { if (busy) e.preventDefault(); }} onClose={() => trigger.current?.focus()} onClick={e => {
        if (e.target !== e.currentTarget) return;
        const bounds = e.currentTarget.getBoundingClientRect();
        if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) close();
      }}>
        <button className="dialog-close" type="button" aria-label="작성 창 닫기" disabled={busy} onClick={close}>×</button>
        <MessageForm key={kind} kind={kind} shopId={shopId} shopName={shopName} enabled={enabled} sample={sample} onBusy={setBusy} onDone={close}/>
      </dialog>
    </section>
  );
}

function MessageForm({ kind, shopId, shopName, enabled, sample, onBusy, onDone }: {
  kind: Kind; shopId: string; shopName: string; enabled: boolean; sample: boolean;
  onBusy: (busy: boolean) => void; onDone: () => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [notice, setNotice] = useState("");
  const [length, setLength] = useState(0);
  const form = useRef<HTMLFormElement>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "loading") return;
    const data = new FormData(event.currentTarget);
    setState("loading"); setNotice(""); onBusy(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, shopId, nickname: data.get("nickname"), body: data.get("body"), consent: data.get("consent") === "on", website: data.get("website") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "글을 접수하지 못했어요. 잠시 후 다시 시도해주세요.");
      setState("success"); setNotice("글이 접수되었습니다. 운영팀이 확인한 뒤 이 페이지에 공개됩니다.");
      form.current?.reset(); setLength(0);
    } catch (error) {
      setState("error"); setNotice(error instanceof Error ? error.message : "연결을 확인하고 다시 시도해주세요.");
    } finally { onBusy(false); }
  }

  return (
    <form ref={form} className="message-form" onSubmit={submit}>
      <p className="eyebrow">{kind === "letter" ? `TO. ${shopName}` : shopName}</p>
      <h3 id="compose-title">{kind === "review" ? "방문 후기 남기기" : "사장님께 편지 쓰기"}</h3>
      <p className="form-description">로그인 없이 작성할 수 있습니다.<br/>글은 운영팀 확인 후 공개됩니다.</p>
      {sample && <p className="sample-label">예시 가게입니다. 작성한 글은 테스트용으로 접수됩니다.</p>}
      {state !== "success" && <fieldset disabled={state === "loading" || !enabled}>
        <label htmlFor={`${kind}-nickname`}>보내는 이름 <span>닉네임 가능</span></label>
        <input id={`${kind}-nickname`} name="nickname" required minLength={2} maxLength={20} placeholder="어떤 이름으로 전할까요?" autoComplete="nickname"/>
        <label htmlFor={`${kind}-body`}>{kind === "review" ? "방문 이야기" : "전하고 싶은 말"}</label>
        <textarea id={`${kind}-body`} name="body" required minLength={10} maxLength={2000} rows={6} placeholder={kind === "review" ? "기억에 남는 음식, 공간, 순간을 들려주세요." : "사장님의 이야기를 읽고 어떤 마음이 들었나요?"} onChange={e => setLength(e.target.value.length)}/>
        <div className="character-count">{length} / 2,000</div>
        <div className="honeypot" aria-hidden="true"><label htmlFor={`${kind}-website`}>웹사이트</label><input id={`${kind}-website`} name="website" tabIndex={-1} autoComplete="off"/></div>
        <label className="consent"><input name="consent" type="checkbox" required/><span>닉네임과 글이 공개되는 것에 동의합니다.</span></label>
        <p className="form-help">연락처 등 개인정보는 적지 마세요. 수정·삭제는 단체 인스타그램으로 문의해주세요.</p>
        <button className="button primary" type="submit">{state === "loading" ? "접수 중…" : kind === "review" ? "후기 보내기 ↗" : "편지 보내기 ↗"}</button>
      </fieldset>}
      {!enabled && <p className="form-feedback">지금은 화면 미리보기입니다. 글 접수는 연결 준비가 끝나면 열립니다.</p>}
      <p className={`form-feedback ${state}`} role={state === "error" ? "alert" : "status"} aria-live="polite">{notice}</p>
      {state === "success" && <button className="button outline" type="button" onClick={() => { setState("idle"); setNotice(""); onDone(); }}>닫기</button>}
    </form>
  );
}
