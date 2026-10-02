"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const CardTitlesContext = createContext<{
  titles: Map<string, string>;
  saveTitle: (cardId: string, title: string) => Promise<void>;
} | null>(null);

export function useCardTitle(cardId: string, fallback: string) {
  return useContext(CardTitlesContext)?.titles.get(cardId) || fallback;
}

export default function CardActions({ cardId, title, onHide }: {
  cardId: string;
  title: string;
  onHide?: () => void;
}) {
  const context = useContext(CardTitlesContext);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const headingId = useId();
  const inputId = useId();
  const errorId = useId();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!position) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = () => setPosition(null);
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target) &&
          !buttonRef.current?.contains(event.target)) close();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Tab") {
        close();
        if (event.key === "Escape") buttonRef.current?.focus();
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") || [])];
        const index = buttons.findIndex((button) => button === document.activeElement);
        buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keydown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keydown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [position]);

  const closeDialog = () => {
    if (savingRef.current) return;
    dialogRef.current?.close();
    buttonRef.current?.focus();
  };

  return <>
    <button
      ref={buttonRef}
      type="button"
      aria-label={`${title} 카드 메뉴`}
      aria-haspopup="menu"
      aria-expanded={!!position}
      onClick={() => {
        if (position) { setPosition(null); return; }
        const rect = buttonRef.current!.getBoundingClientRect();
        setPosition({
          left: Math.max(8, Math.min(rect.right - 176, window.innerWidth - 184)),
          top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - (onHide ? 112 : 64))),
        });
      }}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl font-black text-slate-600 shadow-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500"
    >⋮</button>
    {position ? createPortal(
      <div ref={menuRef} role="menu" aria-label={`${title} 카드 메뉴`}
        style={position}
        className="fixed z-50 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
        <button type="button" role="menuitem" onClick={() => {
          setDraft(title);
          setError("");
          setPosition(null);
          dialogRef.current?.showModal();
          inputRef.current?.focus();
          inputRef.current?.select();
        }} className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-100 focus:bg-slate-100">이름 수정</button>
        {onHide ? <div className="mt-1 border-t border-slate-200 pt-1">
          <button type="button" role="menuitem" onClick={() => {
            setPosition(null);
            onHide();
            buttonRef.current?.focus();
          }} className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 focus:bg-red-50">카드 숨기기</button>
        </div> : null}
      </div>, document.body
    ) : null}
    <dialog ref={dialogRef} aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      className="fixed m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-xl backdrop:bg-slate-900/40">
      <form onSubmit={async (event) => {
        event.preventDefault();
        if (savingRef.current) return;
        const nextTitle = draft.trim();
        if (!nextTitle) { setError("카드 이름을 입력해 주세요."); return; }
        if (!context) { setError("저장 기능을 사용할 수 없습니다."); return; }
        savingRef.current = true;
        setSaving(true);
        setError("");
        try {
          if (nextTitle !== title) await context.saveTitle(cardId, nextTitle);
          savingRef.current = false;
          closeDialog();
        } catch (error) {
          console.error("Presentation card title save failed:", error);
          setError("이름을 저장하지 못했습니다. 다시 시도해 주세요.");
        } finally {
          savingRef.current = false;
          setSaving(false);
        }
      }}>
        <h2 id={headingId} className="text-lg font-black">카드 이름 수정</h2>
        <label htmlFor={inputId} className="mt-5 block text-sm font-bold">카드 이름</label>
        <input ref={inputRef} id={inputId} value={draft} disabled={saving} required
          aria-invalid={!!error || !draft.trim()}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => { setDraft(event.target.value); setError(""); }}
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base outline-blue-500 disabled:opacity-60" />
        {error ? <p id={errorId} role="alert" className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={closeDialog}
            className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold disabled:opacity-50">취소</button>
          <button type="submit" disabled={saving || !draft.trim()}
            className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? "저장 중…" : "저장"}</button>
        </div>
      </form>
    </dialog>
  </>;
}
