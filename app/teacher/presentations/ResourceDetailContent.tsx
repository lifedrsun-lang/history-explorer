"use client";

import dynamic from "next/dynamic";
import { useContext, useEffect, useState, type ReactNode } from "react";
import { CardTitlesContext } from "./CardActions";

const EditPresentationForm = dynamic(() => import("./EditPresentationForm"));
const NewPresentationForm = dynamic(() => import("./NewPresentationForm"));

/** Existing add/edit links open the same forms inside the common detail surface. */
export default function ResourceDetailContent({ children, onReload, onEditingChange, onBusyChange, renameContext }: {
  children: ReactNode;
  onReload: () => void;
  onEditingChange: (editing: boolean) => void;
  onBusyChange: (busy: boolean) => void;
  renameContext?: { cardId: string; cardName: string };
}) {
  const titleContext = useContext(CardTitlesContext);
  const [editor, setEditor] = useState<{ kind: "new"; href: string } | { kind: "edit"; id: string } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(renameContext?.cardName || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(editor || renaming);
  useEffect(() => {
    onEditingChange(isEditing);
    return () => onEditingChange(false);
  }, [isEditing, onEditingChange]);
  useEffect(() => {
    onBusyChange(saving);
    return () => onBusyChange(false);
  }, [saving, onBusyChange]);

  const saved = () => {
    setEditor(null);
    setRenaming(false);
    onReload();
  };

  const rename = async () => {
    const cardName = name.trim();
    if (!renameContext || !cardName || saving || !titleContext) return;
    setSaving(true);
    setError("");
    try {
      await titleContext.saveTitle(renameContext.cardId, cardName);
      setRenaming(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "이름 변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (renaming) return <section className="grid gap-4 rounded-2xl border border-slate-200 p-4">
    <label className="text-sm font-bold">카드 이름 수정<input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-base" /></label>
    {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    <button type="button" disabled={!name.trim() || saving} onClick={() => void rename()} className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black disabled:opacity-40">{saving ? "저장 중..." : "이름 저장"}</button>
    <button type="button" disabled={saving} onClick={() => setRenaming(false)} className="rounded-xl border px-4 py-3 text-sm font-bold">취소</button>
  </section>;

  if (editor?.kind === "edit") return <EditPresentationForm key={editor.id} presentationId={editor.id} embedded onSaved={saved} onCancel={() => setEditor(null)} onBusyChange={onBusyChange} />;
  if (editor?.kind === "new") return <NewPresentationForm key={editor.href} contextHref={editor.href} embedded onSaved={saved} onCancel={() => setEditor(null)} onBusyChange={onBusyChange} />;

  return <div onClickCapture={(event) => {
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor || anchor.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const href = anchor.getAttribute("href") || "";
    const edit = href.match(/^\/teacher\/presentations\/([^/]+)\/edit(?:\?|$)/);
    if (edit) {
      event.preventDefault();
      event.stopPropagation();
      setEditor({ kind: "edit", id: decodeURIComponent(edit[1]) });
    } else if (/^\/teacher\/presentations\/new(?:\?|$)/.test(href)) {
      event.preventDefault();
      event.stopPropagation();
      setEditor({ kind: "new", href });
    }
  }}>
    {renameContext ? <button type="button" onClick={() => { setName(renameContext.cardName); setError(""); setRenaming(true); }} className="mb-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">이름 수정</button> : null}
    {children}
  </div>;
}
