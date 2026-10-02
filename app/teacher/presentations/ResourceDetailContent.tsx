"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { normalizeCardDisplayName, normalizeCardKey, resolveStoredPresentationCategory, type PresentationCategory } from "@/lib/presentations/catalog";
import { getPresentationCardMetadataId, isBoardgameCategory, PRESENTATION_CARD_METADATA_DOCUMENT_TYPE } from "@/lib/presentations/cardMetadata";

const EditPresentationForm = dynamic(() => import("./EditPresentationForm"));
const NewPresentationForm = dynamic(() => import("./NewPresentationForm"));

/** Existing add/edit links open the same forms inside the common detail surface. */
export default function ResourceDetailContent({ children, onReload, onEditingChange, onBusyChange, renameContext }: {
  children: ReactNode;
  onReload: () => void;
  onEditingChange: (editing: boolean) => void;
  onBusyChange: (busy: boolean) => void;
  renameContext?: { category: PresentationCategory; cardKey: string; cardName: string };
}) {
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
    const cardName = normalizeCardDisplayName(name);
    if (!renameContext || !cardName || saving || !auth.currentUser) return;
    setSaving(true);
    setError("");
    try {
      // Re-read the group so resources added after the list loaded are renamed too.
      const snapshot = await getDocs(collection(db, "presentations"));
      const matches = snapshot.docs.filter((resource) => {
        const data = resource.data();
        const effectiveName = normalizeCardDisplayName(data.cardName || data.resourceTitle || data.title || data.bookNumber);
        const effectiveKey = String(data.cardKey || "").trim() || normalizeCardKey(effectiveName);
        return data.documentType !== PRESENTATION_CARD_METADATA_DOCUMENT_TYPE &&
          resolveStoredPresentationCategory(data) === renameContext.category && effectiveKey === renameContext.cardKey;
      });
      if (!matches.length) throw new Error("수정할 카드를 찾을 수 없습니다. 목록을 다시 불러와 주세요.");
      if (matches.length > 450) throw new Error("자료가 너무 많아 한 번에 이름을 변경할 수 없습니다.");
      const batch = writeBatch(db);
      for (const resource of matches) {
        batch.update(resource.ref, {
          cardName,
          // Legacy cards need their existing derived identity retained across a rename.
          ...(!String(resource.data().cardKey || "").trim() ? { cardKey: renameContext.cardKey } : {}),
        });
      }
      if (isBoardgameCategory(renameContext.category)) {
        const metadataId = getPresentationCardMetadataId(renameContext.category, renameContext.cardKey);
        if (snapshot.docs.some((resource) => resource.id === metadataId)) {
          batch.update(doc(db, "presentations", metadataId), { cardName });
        }
      }
      await batch.commit();
      saved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "이름 변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (renaming) return <section className="grid gap-4 rounded-2xl border border-slate-200 p-4">
    <label className="text-sm font-bold">카드 이름 수정<input autoFocus value={name} maxLength={80} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-base" /></label>
    {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    <button type="button" disabled={!normalizeCardDisplayName(name) || saving} onClick={() => void rename()} className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black disabled:opacity-40">{saving ? "저장 중..." : "이름 저장"}</button>
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
