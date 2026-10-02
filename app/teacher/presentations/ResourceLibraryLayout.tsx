"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type ResourceSummary = {
  key: string;
  title: string;
  category: string;
  image?: string;
  icon?: string;
  meta?: string;
};

function ResourceCover({ src, icon }: { src?: string; icon?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return icon || "📁";
  return (
    // Covers include existing data URLs and remote textbook images.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-contain" />
  );
}

/** One selection surface for books, named cards, board games and study subjects. */
export default function ResourceLibraryLayout<T>({
  items, getSummary, renderDetail, renderActions, busy = false, editing = false,
}: {
  items: T[];
  getSummary: (item: T) => ResourceSummary;
  renderDetail: (item: T) => ReactNode;
  renderActions?: (item: T) => ReactNode;
  busy?: boolean;
  editing?: boolean;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedIndex = items.findIndex((item) => getSummary(item).key === selectedKey);
  const selected = items[selectedIndex];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const hasSelection = selectedIndex >= 0;

  const select = (key: string | null) => {
    if (key === selectedKey || busy) return;
    if (editing && !window.confirm("작성 중인 내용을 저장하지 않고 이동할까요?")) return;
    setSelectedKey(key);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const media = window.matchMedia("(min-width: 1024px)");
    const originalOverflow = document.body.style.overflow;
    const sync = () => {
      // A native modal supplies focus trapping and Escape on mobile; desktop is non-modal.
      if (dialog.open) dialog.close();
      document.body.style.overflow = originalOverflow;
      if (!hasSelection) return;
      if (media.matches) dialog.show();
      else {
        dialog.showModal();
        document.body.style.overflow = "hidden";
      }
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      if (dialog.open) dialog.close();
      document.body.style.overflow = originalOverflow;
    };
  }, [hasSelection]);

  useEffect(() => {
    detailScrollRef.current?.scrollTo({ top: 0 });
  }, [selectedKey]);

  return (
    <div className="mt-5 grid min-w-0 gap-4 lg:h-[clamp(24rem,calc(100dvh-16rem),54rem)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" data-resource-library>
      <div className="min-h-0 min-w-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-2" data-resource-list>
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const summary = getSummary(item);
            const isSelected = summary.key === selectedKey;
            return (
              <article key={summary.key} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${isSelected ? "border-orange-400 bg-orange-50 ring-2 ring-orange-200" : "border-slate-200"}`}>
                <button type="button" aria-pressed={isSelected} aria-controls={panelId}
                  onClick={() => select(summary.key)} disabled={busy}
                  className="flex w-full min-w-0 items-center gap-3 p-4 text-left outline-none transition hover:bg-orange-50 focus-visible:ring-4 focus-visible:ring-orange-200 disabled:opacity-60">
                  <span className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 text-3xl">
                    <ResourceCover key={summary.image} src={summary.image} icon={summary.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-500">{summary.category}</span>
                    <span className="mt-1 line-clamp-2 break-words text-base font-black leading-6 text-slate-800">{summary.title}</span>
                    {summary.meta ? <span className="mt-1 block truncate text-sm text-slate-500">{summary.meta}</span> : null}
                  </span>
                </button>
                {renderActions ? <div className="flex justify-end gap-2 border-t border-slate-100 px-3 py-2">{renderActions(item)}</div> : null}
              </article>
            );
          })}
        </div>
        {items.length === 0 ? <p className="p-5 text-sm text-slate-500">표시할 자료가 없습니다.</p> : null}
      </div>

      {!hasSelection ? (
        <div className="hidden items-center justify-center rounded-3xl border-2 border-dashed border-orange-200 bg-orange-50/50 p-6 text-center text-base font-bold text-slate-600 lg:flex">카드를 선택해 주세요</div>
      ) : null}
      <dialog ref={dialogRef} id={panelId} aria-label={selected ? `${getSummary(selected).title} 상세보기` : "자료 상세보기"}
        onCancel={(event) => { event.preventDefault(); select(null); }}
        className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-hidden border-0 bg-white p-0 text-slate-800 backdrop:bg-slate-900/40 lg:static lg:h-full lg:min-h-0 lg:min-w-0 lg:rounded-3xl lg:border lg:border-orange-200 lg:shadow-sm">
        {selected ? <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-orange-100 bg-orange-50 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex gap-2">
              <button type="button" disabled={selectedIndex <= 0 || busy} onClick={() => select(getSummary(items[selectedIndex - 1]).key)} className="rounded-xl bg-white px-3 py-2 text-sm font-bold disabled:opacity-40">← 이전</button>
              <button type="button" disabled={selectedIndex >= items.length - 1 || busy} onClick={() => select(getSummary(items[selectedIndex + 1]).key)} className="rounded-xl bg-white px-3 py-2 text-sm font-bold disabled:opacity-40">다음 →</button>
            </div>
            <button type="button" disabled={busy} onClick={() => select(null)} className="rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-40">닫기</button>
          </div>
          <div ref={detailScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" data-resource-detail>
            <div key={getSummary(selected).key}>{renderDetail(selected)}</div>
          </div>
        </div> : null}
      </dialog>
    </div>
  );
}
