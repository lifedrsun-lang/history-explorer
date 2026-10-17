"use client";

import { useEffect, useRef, useState } from "react";
import SharedSchoolQrPanel from "@/app/components/SchoolQrPanel";
import { auth } from "@/lib/firebase";
import type { SchoolQrCode } from "@/lib/schoolQrCodes";

type Props = {
  school: { slug: string; displayName: string };
};

type SharedAccountValues = {
  id: string;
  password: string;
};

export default function SchoolQrPanel({ school }: Props) {
  const [qr, setQr] = useState<SchoolQrCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [encodedUrl, setEncodedUrl] = useState("");
  const [qrError, setQrError] = useState("");
  const [qrNotice, setQrNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const endpoint = `/api/teacher/contract-schools/${encodeURIComponent(school.slug)}/qr`;
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("교사 로그인이 필요해요.");
        const token = await user.getIdToken();
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "QR을 불러오지 못했어요.");
        if (!controller.signal.aborted) { setQr(payload.qr); setEncodedUrl(payload.qr?.encodedUrl || ""); }
      } catch (error) { if (!controller.signal.aborted) setQrError(error instanceof Error ? error.message : "QR을 불러오지 못했어요."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [endpoint]);

  async function mutateQr(remove = false) {
    if (busy || loading || (!remove && !file)) return;
    if (remove && !window.confirm(`${school.displayName} QR을 삭제할까요? 학생 반 선택 화면에서도 사라집니다.`)) return;
    setBusy(true); setQrError(""); setQrNotice("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("교사 로그인이 필요해요.");
      const token = await user.getIdToken();
      const form = new FormData();
      if (!remove && file) { form.set("image", file); form.set("encodedUrl", encodedUrl); }
      const response = await fetch(endpoint, { method: remove ? "DELETE" : "POST", headers: { Authorization: `Bearer ${token}` }, ...(remove ? {} : { body: form }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "QR을 저장하지 못했어요.");
      setQr(payload.qr); setEncodedUrl(payload.qr?.encodedUrl || "");
      setFile(null); if (inputRef.current) inputRef.current.value = "";
      setQrNotice(remove ? "QR을 삭제했어요. 학생 화면에서도 숨겨집니다." : "QR을 저장했어요. 학생 반 선택 화면을 새로고침하면 표시됩니다.");
    } catch (error) { setQrError(error instanceof Error ? error.message : "QR을 저장하지 못했어요."); }
    finally { setBusy(false); }
  }

  const hasSharedAccount = school.slug === "dongguro";
  const [sharedAccountValues, setSharedAccountValues] = useState<SharedAccountValues | null>(null);

  useEffect(() => {
    if (!hasSharedAccount) return;

    let active = true;

    const loadSharedAccount = async () => {
      const user = auth.currentUser;
      if (!user) throw new Error("teacher_auth_required");

      const token = await user.getIdToken();
      const readValue = async (field: "id" | "password") => {
        const search = new URLSearchParams({ school: school.slug, field });
        const response = await fetch(`/api/teacher/shared-account?${search}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json().catch(() => ({}))) as {
          value?: string;
        };
        if (!response.ok || !payload.value) {
          throw new Error("shared_account_unavailable");
        }
        return payload.value;
      };

      const [id, password] = await Promise.all([
        readValue("id"),
        readValue("password"),
      ]);

      if (active) setSharedAccountValues({ id, password });
    };

    void loadSharedAccount().catch(() => {
      if (active) setSharedAccountValues(null);
    });

    return () => {
      active = false;
    };
  }, [hasSharedAccount, school.slug]);

  const copySharedAccount = async (field: "id" | "password") => {
    const value = sharedAccountValues?.[field];
    if (!value) {
      throw new Error("shared_account_unavailable");
    }
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="space-y-3">
      <section aria-label={`${school.displayName} QR 등록 관리`} className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
        <h3 className="text-base font-black text-sky-900">학교 QR 등록·교체</h3>
        <p className="mt-1 text-xs font-bold text-slate-600">이 학교의 학생용 반 선택 화면 아래에 표시할 QR 파일을 올려 주세요.</p>
        <label className="mt-3 block text-xs font-bold text-slate-700">QR 파일 · JPG / PNG / WEBP · 3MB 이하
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || loading} onChange={event => {
            setQrError(""); setQrNotice("");
            const selected = event.target.files?.[0] || null;
            if (selected && (!selected.size || selected.size > 3 * 1024 * 1024)) { setFile(null); event.target.value = ""; setQrError("3MB 이하의 QR 파일을 선택해 주세요."); return; }
            setFile(selected);
          }} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2 text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-sky-100 file:p-2 file:font-bold file:text-sky-800" />
        </label>
        <label className="mt-3 block text-xs font-bold text-slate-700">접속 주소 (선택)
          <input type="url" value={encodedUrl} disabled={busy || loading} maxLength={2000} onChange={event => setEncodedUrl(event.target.value)} placeholder={`https://sunlab.me.kr/student/classroom/${school.slug}`} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
        </label>
        <p className="mt-1 text-xs text-slate-500">QR에 담긴 링크를 입력해 주세요. 비워두면 이 학교의 반 선택 주소를 링크 복사에 사용합니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={!file || busy || loading} onClick={() => void mutateQr()} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40">{busy ? "처리 중…" : qr ? "QR 교체" : "QR 등록"}</button>
          {qr && <button type="button" disabled={busy || loading} onClick={() => void mutateQr(true)} className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-40">QR 삭제</button>}
        </div>
        {loading && <p role="status" className="mt-2 text-xs text-slate-500">QR을 불러오는 중…</p>}
        {!loading && !qr && !qrError && <p className="mt-2 text-xs text-slate-500">등록된 QR이 없어요. 파일을 선택해 등록해 주세요.</p>}
        {qrError && <p role="alert" className="mt-2 text-sm font-bold text-rose-700">{qrError}</p>}
        {qrNotice && <p role="status" className="mt-2 text-sm font-bold text-emerald-700">{qrNotice}</p>}
      </section>
      <SharedSchoolQrPanel
      school={school}
      qrCode={qr}
      sharedAccountAvailable={hasSharedAccount}
      sharedAccountValues={sharedAccountValues}
      onCopySharedAccount={hasSharedAccount && sharedAccountValues ? copySharedAccount : undefined}
      />
    </div>
  );
}

