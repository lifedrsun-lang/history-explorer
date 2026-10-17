"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { SchoolQrCode } from "@/lib/schoolQrCodes";

type Props = {
  school: { slug: string; displayName: string };
  mode?: "teacher" | "student";
  qrCode?: SchoolQrCode | null;
  sharedAccountAvailable?: boolean;
  sharedAccountValues?: { id: string; password: string } | null;
  onCopySharedAccount?: (field: "id" | "password") => Promise<void>;
};

export default function SchoolQrPanel({
  school,
  mode = "teacher",
  qrCode,
  sharedAccountAvailable = false,
  sharedAccountValues = null,
  onCopySharedAccount,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState("");
  const [remoteQr, setRemoteQr] = useState<{ slug: string; qr: SchoolQrCode | null } | null>(null);
  const isStudentView = mode === "student";
  useEffect(() => {
    if (qrCode !== undefined) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/classroom/schools/${encodeURIComponent(school.slug)}/qr`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const payload = await response.json() as { qr: SchoolQrCode | null };
        if (!controller.signal.aborted) setRemoteQr({ slug: school.slug, qr: payload.qr });
      } catch { /* Keep the student screen quiet on a failed QR-only request. */ }
    })();
    return () => controller.abort();
  }, [school.slug, qrCode]);
  const qr = qrCode !== undefined ? qrCode : remoteQr?.slug === school.slug ? remoteQr.qr : null;
  if (!qr && (isStudentView || !sharedAccountAvailable)) return null;

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(successMessage);
    } catch {
      setNotice("복사하지 못했어요. 브라우저의 클립보드 권한을 확인해 주세요.");
    }
  }

  async function copySharedAccount(field: "id" | "password") {
    if (!onCopySharedAccount) return;
    try {
      await onCopySharedAccount(field);
      setNotice(field === "id" ? "아이디를 복사했어요." : "비밀번호를 복사했어요.");
    } catch {
      setNotice("복사하지 못했어요. 다시 로그인한 뒤 시도해 주세요.");
    }
  }

  const qrImage = (large = false) => qr ? (
    <Image
      src={qr.imageSrc}
      alt={`${school.displayName} 반 선택 화면 접속 QR코드`}
      width={357}
      height={357}
      unoptimized
      className={large
        ? "mx-auto h-auto max-h-[65dvh] w-full max-w-[640px] object-contain [image-rendering:pixelated]"
        : "h-auto w-44 max-w-full object-contain"}
    />
  ) : null;

  return (
    <section aria-label={`${school.displayName} 학교 접속 QR`} className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-lg sm:p-7">
      {!isStudentView && (
        <>
          <h3 className="text-xl font-black text-slate-900">{school.displayName} {qr ? "접속 QR" : "공유 계정"}</h3>
          {qr && <p className="mt-2 text-sm font-bold text-slate-500">QR을 찍고 우리 반을 선택해 주세요.</p>}
        </>
      )}
      <div className={isStudentView
        ? "flex flex-col items-center gap-3"
        : "mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start"}>
        {qr && <button type="button" onClick={() => dialogRef.current?.showModal()} aria-label={`${school.displayName} QR 크게 보기`} className="shrink-0 rounded-xl border border-slate-200 bg-white p-3 focus-visible:outline-2 focus-visible:outline-sky-600">
          {qrImage()}
        </button>}
        {!isStudentView && (
          <div className="min-w-0 w-full sm:flex-1">
            {qr && <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => dialogRef.current?.showModal()} className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-black text-white">크게 보기</button>
              <a href={qr.imageSrc} download={`QR_${school.displayName}.${qr.filename?.endsWith(".png") ? "png" : "jpg"}`} className="rounded-xl bg-sky-50 px-4 py-3 text-sm font-black text-sky-800">QR 저장</a>
              <button type="button" onClick={() => void copyText(qr.encodedUrl, "학교 접속 링크를 복사했어요.")} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">링크 복사</button>
            </div>}

            {sharedAccountAvailable && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/60">
                <div className="border-b border-sky-100 px-4 py-3">
                  <div className="text-xs font-black text-sky-700">헬로메이플 공유 계정</div>
                  <div className="mt-0.5 text-[11px] font-bold text-slate-500">계정 정보를 확인하고 필요한 항목을 눌러 복사하세요.</div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-sky-100">
                  <button
                    type="button"
                    onClick={() => void copySharedAccount("id")}
                    disabled={!sharedAccountValues || !onCopySharedAccount}
                    className="min-w-0 bg-white px-3 py-4 text-center transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-sky-600 disabled:cursor-wait disabled:hover:bg-white"
                  >
                    <span className="block text-[11px] font-black text-slate-400">아이디</span>
                    <span className="mt-1 block break-all text-lg font-black text-slate-900">
                      {sharedAccountValues?.id ?? "불러오는 중…"}
                    </span>
                    <span className="mt-2 block text-xs font-black text-sky-700">아이디 복사</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void copySharedAccount("password")}
                    aria-label="공유 계정 비밀번호 복사"
                    disabled={!sharedAccountValues || !onCopySharedAccount}
                    className="min-w-0 bg-white px-3 py-4 text-center transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-sky-600 disabled:cursor-wait disabled:hover:bg-white"
                  >
                    <span className="block text-[11px] font-black text-slate-400">비밀번호</span>
                    <span className="mt-1 block break-all text-lg font-black text-slate-900">
                      {sharedAccountValues?.password ?? "불러오는 중…"}
                    </span>
                    <span className="mt-2 block text-xs font-black text-sky-700">비밀번호 복사</span>
                  </button>
                </div>
              </div>
            )}

            {qr && <><a href={qr.encodedUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block break-all text-sm font-bold text-sky-700 underline">{qr.encodedUrl}</a>
            <p className="mt-2 text-xs font-bold text-slate-500">학교의 반 선택 화면으로 연결됩니다.</p></>}
            <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm font-bold text-sky-800">{notice}</p>
          </div>
        )}
      </div>
      <dialog ref={dialogRef} aria-label={`${school.displayName} QR 크게 보기`} className="fixed inset-0 m-auto max-h-[95dvh] w-[calc(100%-24px)] max-w-3xl overflow-auto rounded-3xl border-0 bg-white p-5 shadow-2xl backdrop:bg-slate-950/70 sm:p-7" onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
      }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-xl font-black text-slate-900">{school.displayName}</h3>
          <button type="button" autoFocus onClick={() => dialogRef.current?.close()} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">닫기</button>
        </div>
        {qrImage(true)}
        {!isStudentView && <p className="mt-4 text-center text-base font-black text-slate-700">QR을 찍고 우리 반을 선택해 주세요.</p>}
      </dialog>
    </section>
  );
}

