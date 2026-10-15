"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { SCHOOL_QR_CODES } from "@/lib/schoolQrCodes";

type Props = {
  school: { slug: string; displayName: string };
  mode?: "teacher" | "student";
};

export default function SchoolQrPanel({ school, mode = "teacher" }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState("");
  const qr = SCHOOL_QR_CODES[school.slug];
  if (!qr) return null;
  const isStudentView = mode === "student";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(qr.encodedUrl);
      setNotice("학교 접속 링크를 복사했어요.");
    } catch {
      setNotice("복사하지 못했어요. 아래 접속 링크를 길게 누르거나 선택해 복사해 주세요.");
    }
  }

  const qrImage = (large = false) => (
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
  );

  return (
    <section aria-label={`${school.displayName} 학교 접속 QR`} className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-lg sm:p-7">
      {!isStudentView && (
        <>
          <h3 className="text-xl font-black text-slate-900">{school.displayName} 접속 QR</h3>
          <p className="mt-2 text-sm font-bold text-slate-500">QR을 찍고 우리 반을 선택해 주세요.</p>
        </>
      )}
      <div className={isStudentView
        ? "flex flex-col items-center gap-3"
        : "mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start"}>
        <button type="button" onClick={() => dialogRef.current?.showModal()} aria-label={`${school.displayName} QR 크게 보기`} className="shrink-0 rounded-xl border border-slate-200 bg-white p-3 focus-visible:outline-2 focus-visible:outline-sky-600">
          {qrImage()}
        </button>
        {isStudentView ? (
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="rounded-xl bg-sky-600 px-6 py-3 text-sm font-black text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            크게 보기
          </button>
        ) : (
          <div className="min-w-0 w-full sm:flex-1">
            <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => dialogRef.current?.showModal()} className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-black text-white">크게 보기</button>
            <a href={qr.imageSrc} download={`QR_${school.displayName}.jpg`} className="rounded-xl bg-sky-50 px-4 py-3 text-sm font-black text-sky-800">QR 저장</a>
            <button type="button" onClick={() => void copyLink()} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">링크 복사</button>
          </div>
          <a href={qr.encodedUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block break-all text-sm font-bold text-sky-700 underline">{qr.encodedUrl}</a>
          <p className="mt-2 text-xs font-bold text-slate-500">학교의 반 선택 화면으로 연결됩니다.</p>
          <p role="status" className="mt-2 text-sm font-bold text-sky-800">{notice}</p>
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
