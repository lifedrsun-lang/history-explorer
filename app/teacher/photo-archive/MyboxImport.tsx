"use client";
import { useRef, useState } from "react";
type Item = { key: string; name: string; size: number };
type Folder = { link: string; title: string; items: Item[]; skipped: number };
export default function MyboxImport({ albumId, busy, dirty, setBusy, request, refresh }: {
  albumId: string; busy: boolean; dirty: boolean; setBusy: (value: boolean) => void;
  request: (url: string, body: Record<string, unknown>) => Promise<Response>; refresh: () => Promise<void>;
}) {
  const [link, setLink] = useState(""), [folder, setFolder] = useState<Folder | null>(null), [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState(""), [error, setError] = useState(""), [importing, setImporting] = useState(false);
  const stop = useRef(false);
  const endpoint = "/api/teacher/photo-archive/mybox";
  const inspect = async () => {
    setBusy(true); setError(""); setStatus("MYBOX 사진 목록을 확인하고 있습니다…"); setFolder(null); setSelected([]);
    try { const data: Folder = await (await request(endpoint, { action: "list", albumId, link })).json(); setFolder(data); setSelected(data.items.map(i => i.key)); setStatus(`가져올 수 있는 사진 ${data.items.length}장${data.skipped ? ` · 지원하지 않는 파일 ${data.skipped}개 제외` : ""}`); }
    catch (e) { setStatus(""); setError(e instanceof Error ? e.message : "MYBOX 링크를 확인하지 못했습니다."); }
    finally { setBusy(false); }
  };
  const run = async () => {
    if (!folder || !selected.length) return;
    const items = folder.items.filter(i => selected.includes(i.key));
    stop.current = false; setBusy(true); setImporting(true); setError("");
    let added = 0, skipped = 0, attempted = 0; const errors: string[] = [];
    try {
      for (const item of items) {
        if (stop.current) break;
        setStatus(`사진 ${attempted + 1} / ${items.length} 가져오는 중…`);
        try {
          const result = await (await request(endpoint, { action: "import", albumId, link: folder.link, key: item.key })).json();
          if (result.skipped) skipped++; else added++;
          setSelected(keys => keys.filter(k => k !== item.key));
        } catch (e) { errors.push(`${item.name}: ${e instanceof Error ? e.message : "가져오기 실패"}`); }
        attempted++;
      }
    } finally {
      setStatus(`${added}장 추가 · ${skipped}장 기존 사진${errors.length ? ` · ${errors.length}장 실패` : ""}${stop.current ? " · 중지됨" : ""}`);
      try { await refresh(); } catch { errors.push("앨범 재조회에 실패했습니다. 앨범을 다시 열어 확인해 주세요."); }
      setError(errors.join("\n")); setImporting(false); setBusy(false);
    }
  };
  const btn = "rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-bold text-teal-900 disabled:opacity-50";
  return <div className="my-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
    <h3 className="font-bold text-teal-900">MYBOX에서 사진 가져오기</h3>
    <p className="mt-2 text-xs leading-5 text-slate-600">공유 폴더의 사진을 선랩에 비공개 사본으로 보관합니다. MYBOX에 사진을 추가한 후에는 다시 가져와 주세요. MYBOX의 링크 만료·삭제는 이미 가져온 사진에 적용되지 않으며, 학생 공개기간은 선랩 앨범 설정을 따릅니다.</p>
    <label className="mt-3 block text-sm font-bold">MYBOX 폴더 공유 링크<input type="url" disabled={busy || dirty} value={link} onChange={e => { setLink(e.target.value); setFolder(null); setSelected([]); setStatus(""); setError(""); }} placeholder="https://naver.me/…" className="mt-1 w-full rounded-xl border border-teal-300 bg-white px-3 py-2 text-sm" /></label>
    <button type="button" disabled={busy || dirty || !link.trim()} onClick={() => void inspect()} className={`${btn} mt-3`}>MYBOX 링크 확인</button>
    {status && <p role="status" className="mt-3 text-sm text-teal-900">{status}</p>}
    {error && <p role="alert" className="mt-3 whitespace-pre-wrap text-sm text-red-800">{error}</p>}
    {folder && <div className="mt-3">
      <p className="text-sm font-bold">{folder.title}</p>
      {!!folder.items.length && <>
        <label className="my-3 flex gap-2 text-sm"><input type="checkbox" disabled={busy || dirty} checked={selected.length === folder.items.length} onChange={e => setSelected(e.target.checked ? folder.items.map(i => i.key) : [])} />사진 전체 선택</label>
        <fieldset disabled={busy || dirty} className="max-h-60 overflow-y-auto rounded-xl bg-white p-3">{folder.items.map(item => <label key={item.key} className="flex gap-2 py-1 text-sm"><input type="checkbox" checked={selected.includes(item.key)} onChange={e => setSelected(keys => e.target.checked ? [...keys, item.key] : keys.filter(k => k !== item.key))} /><span className="min-w-0 break-all">{item.name}</span></label>)}</fieldset>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy || dirty || !selected.length} onClick={() => void run()} className={btn}>선택한 사진 {selected.length}장 가져오기</button>{importing && <button type="button" className={btn} onClick={() => { stop.current = true; setStatus("현재 사진 처리가 끝나면 중지합니다…"); }}>가져오기 중지</button>}</div>
      </>}
    </div>}
  </div>;
}
