"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import type { SemesterPlan } from "@/lib/semesterPlans";
import styles from "./atcPlans.module.css";

type Status = { gmail: { connected: boolean; configured: boolean; email: string }; to: string; contactName: string; history: {status: string; revision: number; to: string; sentAt: string} | null };
export default function AtcPlanMail({ user, plan, dirty, busy, setBusy }: {user: User; plan: SemesterPlan; dirty: boolean; busy: boolean; setBusy: (value: boolean) => void}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(plan.title);
  const [body, setBody] = useState(`안녕하세요.\n\n${plan.school_name} ${plan.program} 수업계획서를 첨부합니다.\n확인 부탁드립니다.\n\n감사합니다.\n${plan.instructor}`);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const alive = useRef(true);
  const url = `/api/teacher/atc-plans/mail?id=${encodeURIComponent(plan.id)}&revision=${plan.revision}`;
  useEffect(() => {
    let cancelled = false;
    alive.current = true;
    void (async () => {
      try {
        const response = await fetch(url, { cache: "no-store", headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!cancelled) { setStatus(data); setTo(data.to || ""); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "메일 정보를 불러오지 못했습니다."); }
    })();
    return () => { cancelled = true; alive.current = false; };
  }, [url, user]);
  const blocked = status?.history?.status === "sending" || status?.history?.status === "unknown" ||
    (status?.history?.status === "sent" && status.history.revision === plan.revision);
  const canSend = !dirty && !busy && !!status?.gmail.connected && status.gmail.configured && !blocked;
  const previewPdf = async () => {
    if (busy || dirty || pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(url + "&pdf=1", { cache: "no-store", headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      if (!response.ok) throw new Error((await response.json()).error);
      const file = URL.createObjectURL(await response.blob());
      if (!alive.current) { URL.revokeObjectURL(file); return; }
      const anchor = document.createElement("a"); anchor.href = file;
      anchor.download = `${plan.title.replace(/[\\/<>:"|?*]/g, "_")}.pdf`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(file), 1000);
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : "PDF를 만들지 못했습니다."); }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  };
  const send = async () => {
    if (!canSend || pending.current) return;
    if (!window.confirm(`받는 사람: ${to}\n제목: ${subject}\n첨부: ${plan.title}.pdf\n\n이 내용으로 메일을 발송할까요?`)) return;
    pending.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/teacher/atc-plans/mail", { method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: plan.id, revision: plan.revision, to, subject, body }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (alive.current) {
        setMessage(`${data.to}로 발송했습니다.`);
        setStatus(current => current && ({...current, history:{status:"sent",revision:plan.revision,to:data.to,sentAt:data.sentAt}}));
      }
    } catch (e) {
      if (alive.current) {
        setError(e instanceof Error ? e.message : "발송 결과를 확인할 수 없습니다. 보낸편지함을 확인해 주세요.");
        // Never automatically retry a send. Refresh durable status, or conservatively block.
        setStatus(current => current && ({...current,history:{status:"unknown",revision:plan.revision,to,sentAt:""}}));
        try {
          const response = await fetch(url, {cache:"no-store",headers:{Authorization:`Bearer ${await user.getIdToken()}`}});
          if (response.ok) { const data = await response.json(); if (alive.current) setStatus(data); }
        } catch { /* Keep unknown status until the user reloads and checks history. */ }
      }
    } finally { pending.current = false; if (alive.current) setBusy(false); }
  };
  return <section className={styles.panel}>
    <h2>담당자에게 메일 발송</h2>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {message && <p role="status" className={styles.success}>{message}</p>}
    {!status && !error && <p role="status">담당자 정보와 Gmail 연결을 확인하고 있습니다.</p>}
    {status && <>
      <p className={styles.hint}>보내는 계정: {status.gmail.email} · 저장된 계획서가 PDF로 첨부됩니다.</p>
      {(!status.gmail.connected || !status.gmail.configured) && <p className={styles.notice}><Link href="/teacher/atc-confirmations">ATC 참여확인서에서 Gmail 연결하기</Link></p>}
      {status.history && <p className={styles.hint}>최근 발송: {status.history.to} · {status.history.status === "sent" ? `발송 완료 (${new Date(status.history.sentAt).toLocaleString("ko-KR", {timeZone:"Asia/Seoul"})})` : status.history.status === "failed" ? "발송 실패" : "진행 중 또는 결과 확인 필요 — Gmail 보낸편지함 확인"}</p>}
      <form onSubmit={e => { e.preventDefault(); void send(); }}>
        <fieldset disabled={busy}>
          <label>담당자 이메일{status.contactName && ` (${status.contactName})`}<input type="email" required maxLength={254} value={to} onChange={e => setTo(e.target.value)} placeholder="담당자 이메일 주소" /></label>
          <label>메일 제목<input required maxLength={200} value={subject} onChange={e => setSubject(e.target.value)} /></label>
          <label>메일 내용<textarea required rows={7} maxLength={10000} value={body} onChange={e => setBody(e.target.value)} /></label>
          <p className={styles.hint}>첨부: {plan.title}.pdf{dirty && " · 변경한 계획서를 먼저 학교별 저장해 주세요."}</p>
          <div className={styles.toolbar}><button type="button" disabled={busy || dirty} onClick={() => void previewPdf()}>첨부 PDF 확인</button><button type="submit" className={styles.primary} disabled={!canSend}>{busy ? "처리 중…" : "담당자에게 메일 발송"}</button></div>
        </fieldset>
      </form>
    </>}
  </section>;
}
