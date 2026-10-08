"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { newOrderLine, newTextbookOrder, ORDER_COLUMNS, ORDER_OPTIONS, orderAmount, orderRows, validateOrder, type OrderDelivery, type OrderLine, type TextbookOrder } from "@/lib/textbookOrders";
import styles from "./orders.module.css";

const DELIVERY_FIELDS: [keyof OrderDelivery, string][] = [["recipient", "수령자"], ["phone", "전화"], ["mobile", "핸드폰"], ["postalCode", "우편번호"], ["address", "주소"], ["message", "배송메세지"], ["shipping", "배송비"], ["invoiceCount", "송장출력갯수"], ["parcelSize", "택배크기"]];
const money = (value: number | null) => value === null ? "미입력" : `${value.toLocaleString("ko-KR")}원`;

export default function TextbookOrdersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<TextbookOrder[]>([]);
  const [editor, setEditor] = useState<TextbookOrder | null>(null);
  const [baseline, setBaseline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const dirty = !!editor && JSON.stringify(editor) !== baseline;
  const api = useCallback(async (method: string, data?: unknown) => {
    if (!auth.currentUser) throw new Error("교사용 로그인이 필요합니다.");
    const token = await auth.currentUser.getIdToken();
    const response = await fetch("/api/teacher/textbook-orders", { method, cache: "no-store", headers: { Authorization: `Bearer ${token}`, ...(data ? { "Content-Type": "application/json" } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
    if (!response.ok) { const payload = await response.json(); throw new Error(payload.error || "처리하지 못했습니다."); }
    return response;
  }, []);
  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    setLoading(true); setError("");
    try {
      const response = await api("GET");
      const data = await response.json();
      if (auth.currentUser?.uid !== uid) return;
      setOrders(data.orders); setAllowed(true);
    } catch (e) { if (auth.currentUser?.uid === uid) setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다."); }
    finally { if (auth.currentUser?.uid === uid) setLoading(false); }
  }, [api]);
  useEffect(() => onAuthStateChanged(auth, u => {
    setUser(u); setChecked(true); setAllowed(false); setOrders([]); setEditor(null); setDeleting(null); setMessage("");
    if (u) void load(); else setLoading(false);
  }), [load]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const navigate = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const link = e.target.closest("a");
      if (link?.href && !link.hasAttribute("download") && link.target !== "_blank" && !window.confirm("저장하지 않은 주문 내용이 있습니다. 이동할까요?")) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", navigate, true); };
  }, [dirty]);
  const open = (order: TextbookOrder) => {
    if (dirty && !window.confirm("저장하지 않은 주문 내용이 있습니다. 다른 주문을 열까요?")) return;
    setEditor(order); setBaseline(JSON.stringify(order)); setPreview(false); setError(""); setMessage("");
  };
  const patch = <K extends keyof TextbookOrder>(key: K, value: TextbookOrder[K]) => { setEditor(e => e ? { ...e, [key]: value } : e); setMessage(""); };
  const patchLine = <K extends keyof OrderLine>(id: string, key: K, value: OrderLine[K]) => {
    setEditor(e => e ? { ...e, lines: e.lines.map(l => l.id === id ? { ...l, [key]: value } : l) } : e); setMessage("");
  };
  const save = async () => {
    if (!editor || busy) return;
    try { validateOrder(editor); } catch (e) { setError((e as Error).message); return; }
    const uid = user?.uid;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await api(editor.id ? "PUT" : "POST", editor);
      const data = await response.json();
      if (auth.currentUser?.uid !== uid) return;
      setEditor(data.order); setBaseline(JSON.stringify(data.order)); setOrders(previous => [data.order, ...previous.filter(o => o.id !== data.order.id)]); setMessage("주문 내역을 저장했습니다.");
    } catch (e) { if (auth.currentUser?.uid === uid) setError(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setBusy(false); }
  };
  const download = async () => {
    if (!editor || busy) return;
    try { validateOrder(editor, true); } catch (e) { setError((e as Error).message); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await api("POST", { ...editor, action: "export" });
      const blob = await response.blob();
      const filename = decodeURIComponent(response.headers.get("Content-Disposition")?.split("filename*=UTF-8''")[1] || "드림잇_별꼼역사_주문서.xlsx");
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage("엑셀 다운로드를 시작했습니다. 업체에 제출할 파일을 확인해주세요.");
    } catch (e) { setError(e instanceof Error ? e.message : "다운로드하지 못했습니다."); }
    finally { setBusy(false); }
  };
  const remove = async (order: TextbookOrder) => {
    if (busy || deleting !== order.id) return;
    if (editor?.id === order.id && dirty && !window.confirm("수정 중인 내용도 닫힙니다. 주문을 삭제할까요?")) return;
    setBusy(true); setError("");
    try {
      await api("DELETE", { id: order.id, revision: order.revision });
      setOrders(p => p.filter(o => o.id !== order.id)); if (editor?.id === order.id) setEditor(null); setDeleting(null); setMessage("주문 내역을 삭제했습니다.");
    } catch (e) { setError(e instanceof Error ? e.message : "삭제하지 못했습니다."); }
    finally { setBusy(false); }
  };
  if (!checked) return <main className={styles.shell}><p role="status">로그인 상태를 확인하고 있습니다.</p></main>;
  if (!user) return <main className={styles.shell}><section className={styles.panel}><h1>교재주문</h1><p>교사용 로그인 후 이용할 수 있습니다.</p><Link href="/teacher">교사용 로그인</Link></section></main>;
  if (!allowed) return <main className={styles.shell}><section className={styles.panel}><h1>교재주문</h1><p role="status">{loading ? "주문 내역을 불러오고 있습니다." : error}</p>{!loading && <button onClick={() => void load()}>다시 불러오기</button>}<Link href="/teacher/manage/after-school">방과후 관리</Link></section></main>;
  const totals = editor?.lines.reduce((sum, l) => ({ quantity: sum.quantity + (Number.isFinite(l.quantity) ? l.quantity : 0), priced: sum.priced + (orderAmount(l) || 0), missing: sum.missing + (l.unitPrice === null ? 1 : 0) }), { quantity: 0, priced: 0, missing: 0 });
  return <main className={styles.shell}>
    <header className={styles.header}><div><Link href="/teacher/manage/after-school">방과후 관리</Link><h1>📦 교재주문</h1><p>별꼼역사 · 드림잇 물류 주문서</p></div><div className={styles.actions}><a href="/templates/dreamit-textbook-order.xls" download="드림잇 물류(교재) 주문서.xls">원본 양식 (.xls)</a><button disabled={busy} onClick={() => open(newTextbookOrder())}>새 주문</button></div></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.message}>{message}</p>}
    <div className={styles.layout}>
      <aside className={styles.panel}><div className={styles.sectionHeader}><h2>저장한 주문</h2><button disabled={loading || busy} onClick={() => void load()}>{loading ? "불러오는 중" : "목록 새로고침"}</button></div>
        {!orders.length && <p className={styles.muted}>새 주문을 작성하고 저장해주세요.</p>}
        <div className={styles.history}>{orders.map(order => <article key={order.id}><button disabled={busy} className={styles.orderTitle} onClick={() => open(order)}>{order.title}</button><p>{order.date} · {order.lines.length}개 항목</p><p>{order.delivery.recipient || "수령자 미입력"}</p><div className={styles.actions}><button disabled={busy} onClick={() => open({ ...order, id: "", revision: 0, title: `${order.title.slice(0, 144)} (복사)`, date: newTextbookOrder().date, createdAt: "", updatedAt: "" })}>복사하여 작성</button>{deleting === order.id ? <><button disabled={busy} className={styles.danger} onClick={() => void remove(order)}>삭제 확인</button><button disabled={busy} onClick={() => setDeleting(null)}>취소</button></> : <button disabled={busy} onClick={() => setDeleting(order.id)}>삭제</button>}</div></article>)}</div>
      </aside>
      {editor ? <section className={styles.panel}>
        <div className={styles.sectionHeader}><h2>{editor.id ? "주문 수정" : "새 주문 작성"}</h2><span className={styles.muted}>{dirty ? "저장 전 변경사항" : editor.id ? "저장됨" : "작성 중"}</span></div>
        <fieldset disabled={busy} className={styles.fields}>
          <label className={styles.wide}>주문 제목 / 학교명<input value={editor.title} maxLength={150} placeholder="예: 하늘빛초 4분기 교재" onChange={e => patch("title", e.target.value)} /></label>
          <label>주문일<input type="date" value={editor.date} onChange={e => patch("date", e.target.value)} /></label>
        </fieldset>
        <h3>배송 정보</h3><p className={styles.muted}>아래 배송 정보가 모든 주문 항목에 반영됩니다. 배송지가 다르면 주문을 따로 작성해주세요.</p>
        <fieldset disabled={busy} className={styles.fields}>{DELIVERY_FIELDS.map(([key, label]) => <label key={key} className={key === "address" || key === "message" ? styles.wide : ""}>{label}<input type={key === "invoiceCount" ? "number" : key === "phone" || key === "mobile" ? "tel" : "text"} min={key === "invoiceCount" ? 1 : undefined} max={key === "invoiceCount" ? 100 : undefined} maxLength={key === "address" || key === "message" ? 500 : key === "phone" || key === "mobile" ? 40 : key === "postalCode" ? 20 : key === "shipping" || key === "parcelSize" ? 100 : 300} value={editor.delivery[key]} onChange={e => patch("delivery", { ...editor.delivery, [key]: key === "invoiceCount" ? Number(e.target.value) : e.target.value })} /></label>)}</fieldset>
        <div className={styles.sectionHeader}><h3>주문 항목</h3><button disabled={busy || editor.lines.length >= 200} onClick={() => patch("lines", [...editor.lines, newOrderLine()])}>항목 추가</button></div>
        <p className={styles.muted}>상품명을 주문할 호수에 맞게 수정해주세요. 판매금액 = 수량 × 판매단가. 단가를 비우면 금액도 비워집니다.</p>
        <div className={styles.lines}>{editor.lines.map((line, index) => <fieldset disabled={busy} className={styles.line} key={line.id}><legend>항목 {index + 1}</legend><div className={styles.fields}>
          <label className={styles.wide}>상품명<input value={line.productName} maxLength={300} onChange={e => patchLine(line.id, "productName", e.target.value)} /></label>
          <label>옵션명<select value={line.option} onChange={e => patchLine(line.id, "option", e.target.value)}>{ORDER_OPTIONS.map(option => <option key={option}>{option}</option>)}</select></label>
          <label>수량<input type="number" min={1} max={100000} step={1} value={line.quantity} onChange={e => patchLine(line.id, "quantity", Number(e.target.value))} /></label>
          <label>판매단가 (선택)<input type="number" min={0} max={100000000} step="0.01" placeholder="미입력" value={line.unitPrice ?? ""} onChange={e => patchLine(line.id, "unitPrice", e.target.value === "" ? null : Number(e.target.value))} /></label>
          <label>판매금액<output>{money(orderAmount(line))}</output></label>
          <label>주문번호 (선택)<input value={line.orderNumber} maxLength={100} onChange={e => patchLine(line.id, "orderNumber", e.target.value)} /></label>
          <label>상품번호 (선택)<input value={line.productNumber} maxLength={100} onChange={e => patchLine(line.id, "productNumber", e.target.value)} /></label>
        </div><div className={styles.actions}><button disabled={editor.lines.length >= 200} onClick={() => patch("lines", [...editor.lines, { ...line, id: crypto.randomUUID() }])}>항목 복사</button><button disabled={editor.lines.length === 1} onClick={() => patch("lines", editor.lines.filter(l => l.id !== line.id))}>항목 삭제</button></div></fieldset>)}</div>
        <div className={styles.summary}><span>전체 항목 수량 <strong>{totals?.quantity.toLocaleString("ko-KR")}개</strong></span><span>{totals?.missing ? "단가 입력 항목 소계" : "판매금액 합계"} <strong>{money(totals?.priced ?? null)}</strong></span>{!!totals?.missing && <span>단가 미입력 {totals.missing}개 항목</span>}</div>
        <div className={styles.actions}><button disabled={busy} className={styles.primary} onClick={() => void save()}>{busy ? "처리 중" : "주문 저장"}</button><button disabled={busy} onClick={() => setPreview(p => !p)}>{preview ? "미리보기 닫기" : "주문서 미리보기"}</button><button disabled={busy} onClick={() => void download()}>엑셀 다운로드 (.xlsx)</button></div>
        <p className={styles.muted}>다운로드에는 현재 화면의 내용이 반영됩니다. 주문 내역을 보관하려면 저장해주세요. 원본 양식의 열 순서로 내보냅니다.</p>
        {preview && <div className={styles.tableScroll}><table><caption>드림잇주문 · 엑셀 내용 확인</caption><thead><tr>{ORDER_COLUMNS.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{orderRows(editor).map((row, i) => <tr key={editor.lines[i].id}>{row.map((v, j) => <td key={j}>{v ?? ""}</td>)}</tr>)}</tbody></table></div>}
      </section> : <section className={styles.panel}><h2>별꼼역사 교재 주문서</h2><p>새 주문을 만들거나 저장한 주문을 선택해주세요.</p><button className={styles.primary} onClick={() => open(newTextbookOrder())}>새 주문 작성</button></section>}
    </div>
  </main>;
}
