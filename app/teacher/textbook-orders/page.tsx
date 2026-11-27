"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { newOrderLine, newTextbookOrder, ORDER_BOOKS, ORDER_MONARTE_BOOKS, ORDER_MONARTE_OPTIONS, ORDER_SUBJECTS, orderColumns, orderFormatLabel, ORDER_OPTIONS, orderBookNumber, orderAmount, orderRows, parseTextbookOrderTitle, textbookOrderMailSubject, textbookOrderTitle, validateOrder, type OrderDelivery, type OrderLine, type TextbookOrder } from "@/lib/textbookOrders";
import styles from "./orders.module.css";

const DELIVERY_FIELDS: [keyof OrderDelivery, string][] = [["recipient", "수령자"], ["phone", "전화"], ["mobile", "핸드폰"], ["postalCode", "우편번호"], ["address", "주소"], ["message", "배송메세지"], ["shipping", "배송비"], ["invoiceCount", "송장출력갯수"], ["parcelSize", "택배크기"]];
const money = (value: number | null) => value === null ? "미입력" : `${value.toLocaleString("ko-KR")}원`;
type EnrollmentGroup = { id: string; school: string; teachingClass: string; status: string; counts: Record<string, number> };

const COMBINED_CLASS = "A+B반";
function withCombinedGroups(groups: EnrollmentGroup[]): EnrollmentGroup[] {
  return groups.flatMap(group => {
    if (group.teachingClass !== "B반") return [group];
    const a = groups.find(item => item.school === group.school && item.teachingClass === "A반");
    if (!a) return [group];
    const counts = Object.fromEntries(["Q1", "Q2", "Q3", "Q4"].map(q => [q, (a.counts[q] || 0) + (group.counts[q] || 0)]));
    return [group, { ...group, id: `${group.id}::combined-ab`, teachingClass: COMBINED_CLASS, counts }];
  });
}
function overlapsClass(a?: string, b?: string): boolean {
  if (a === b) return true;
  return (a === COMBINED_CLASS && (b === "A반" || b === "B반")) ||
    (b === COMBINED_CLASS && (a === "A반" || a === "B반"));
}

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
  const [quarter, setQuarter] = useState("");
  const [orderRound, setOrderRound] = useState("");
  const [subject, setSubject] = useState("별꼼역사");
  const [selectedBooks, setSelectedBooks] = useState<number[]>([]);
  const [selectedMonarteBooks, setSelectedMonarteBooks] = useState<string[]>([]);
  const [groups, setGroups] = useState<EnrollmentGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customProduct, setCustomProduct] = useState("");
  const [customOption, setCustomOption] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState(2026);
  const [defaultDelivery, setDefaultDelivery] = useState<OrderDelivery | null>(null);
  const [setupError, setSetupError] = useState("");
  const [mailPreview, setMailPreview] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [classStartDate, setClassStartDate] = useState("");
  const [existingStudents, setExistingStudents] = useState<number | null>(null);
  const [newStudents, setNewStudents] = useState<number | null>(null);
  const group = groups.find(g => g.id === selectedGroup);
  const enrolledCount = group?.counts[`Q${quarter}`] || 0;
  const locked = !!editor && ["sent", "sending", "unknown"].includes(editor.mailStatus || "");
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
    setDefaultDelivery(null); setGroups([]); setSelectedGroup(""); setSetupError("");
    if (u) void load(); else setLoading(false);
  }), [load]);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    void user.getIdToken().then(token => fetch(`/api/teacher/textbook-orders/setup?year=${year}`, { signal: controller.signal, cache: "no-store", headers: { Authorization: `Bearer ${token}` } })).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "신청 인원을 불러오지 못했습니다.");
      if (!controller.signal.aborted) { setDefaultDelivery(data.delivery); setGroups(withCombinedGroups(data.groups)); }
    }).catch(e => { if (!controller.signal.aborted) setSetupError(e instanceof Error ? e.message : "신청 인원을 불러오지 못했습니다."); });
    return () => controller.abort();
  }, [user, year]);
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
    const period = parseTextbookOrderTitle(order.title);
    setQuarter(period.quarter); setOrderRound(period.round);
    setSubject("별꼼역사"); setSelectedBooks([]); setSelectedMonarteBooks([]); setSelectedOptions([]); setCustomProduct(""); setCustomOption(""); setCourse(""); setSelectedGroup(""); setMailPreview(false); setQuantity(1);
    setEditor(order); setBaseline(JSON.stringify(order)); setPreview(false); setError(""); setMessage("");
  };
  const changeOrderPeriod = (nextQuarter: string, nextRound: string) => {
    if (nextQuarter !== quarter) { setSelectedGroup(""); setQuantity(1); setCourse(""); }
    setQuarter(nextQuarter); setOrderRound(nextRound);
    setEditor(e => e ? { ...e, title: textbookOrderTitle(nextQuarter, nextRound) } : e);
    setMessage("");
  };
  const patch = <K extends keyof TextbookOrder>(key: K, value: TextbookOrder[K]) => { setEditor(e => e ? { ...e, [key]: value } : e); setMessage(""); };
  const patchLine = <K extends keyof OrderLine>(id: string, key: K, value: OrderLine[K]) => {
    setEditor(e => e ? { ...e, lines: e.lines.map(l => l.id === id ? { ...l, [key]: value } : l) } : e); setMessage("");
  };
  const newOrder = () => {
    const order = newTextbookOrder();
    if (defaultDelivery) order.delivery = { ...defaultDelivery, parcelSize: "" };
    order.lines = [];
    open(order);
  };
  const chooseGroup = (id: string) => {
    const next = groups.find(g => g.id === id);
    setSelectedGroup(id);
    setClassStartDate(""); setExistingStudents(null); setNewStudents(null);
    setQuantity(next?.counts[`Q${quarter}`] || 1);
    setCourse("");
    setError("");
  };
  const addItems = () => {
    if (!editor || !group) { setError("방과후 학교와 반을 먼저 선택해주세요."); return; }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) { setError("수량을 1~100000으로 입력해주세요."); return; }
    const products = subject === "별꼼역사"
      ? ORDER_BOOKS.filter(book => selectedBooks.includes(book.number)).flatMap(book => selectedOptions.map(option => ({ productName: book.productName, option })))
      : subject === "모나르떼"
        ? ORDER_MONARTE_BOOKS.filter(book => selectedMonarteBooks.includes(book.id)).flatMap(book => ORDER_MONARTE_OPTIONS.map(option => ({ productName: book.productName, option })))
        : customProduct.trim() ? [{ productName: customProduct.trim(), option: customOption.trim() }] : [];
    if (!products.length) { setError("교재와 구성품 또는 실제 상품명을 입력해주세요."); return; }
    if (editor.lines.length + products.length > 200) { setError("주문 항목은 200개까지 저장할 수 있습니다."); return; }
    const lines = products.map(product => ({
      ...newOrderLine(), ...product, quantity, school: group.school, teachingClass: group.teachingClass, subject, course: course.trim(), ...(editor.format === "202610" ? { classStartDate, existingStudents, newStudents } : {}),
    }));
    if (lines.some(line => editor.lines.some(existing => existing.school === line.school && overlapsClass(existing.teachingClass, line.teachingClass) && (existing.course || "") === line.course && existing.productName === line.productName && existing.option === line.option)) &&
      !window.confirm("같은 학교·교재에 동일하거나 겹치는 반의 주문이 있습니다. 중복 주문이 아닌 추가 수량이 맞다면 별도 행을 더할까요?")) return;
    patch("lines", [...editor.lines, ...lines]);
    setSelectedBooks([]); setSelectedMonarteBooks([]); setSelectedOptions([]); setCustomProduct(""); setCustomOption(""); setError("");
    setMessage(`${group.school} ${group.teachingClass} 교재 ${lines.length}개 항목을 추가했습니다. 다른 학교·교재를 계속 추가할 수 있습니다.`);
  };
  const saveDelivery = async () => {
    if (!editor || !user || busy) return;
    setBusy(true); setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/teacher/textbook-orders/setup", { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ delivery: editor.delivery }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (auth.currentUser?.uid !== user.uid) return;
      setDefaultDelivery(data.delivery); setMessage("기본배송지를 저장했습니다. 다음 새 주문부터 반영됩니다.");
    } catch (e) { setError(e instanceof Error ? e.message : "기본배송지를 저장하지 못했습니다."); }
    finally { setBusy(false); }
  };
  const sendMail = async () => {
    if (!editor?.id || !user || busy || dirty || locked) return;
    setBusy(true); setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/teacher/textbook-orders/mail-send", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ id: editor.id, revision: editor.revision }) });
      const data = await response.json();
      if (auth.currentUser?.uid !== user.uid) return;
      if (!response.ok) throw new Error(data.error);
      const sent: TextbookOrder = { ...editor, mailStatus: "sent", mailSentAt: data.sentAt };
      setEditor(sent); setBaseline(JSON.stringify(sent)); setOrders(previous => previous.map(o => o.id === sent.id ? sent : o)); setMailPreview(false); setMessage("드림잇에 주문 메일을 발송했습니다. 숨은 참조도 함께 반영했습니다.");
    } catch (e) {
      if (auth.currentUser?.uid !== user.uid) return;
      setError(e instanceof Error ? e.message : "메일을 발송하지 못했습니다.");
      try {
        const data = await (await api("GET")).json();
        if (auth.currentUser?.uid !== user.uid) return;
        setOrders(data.orders);
        const current = data.orders.find((o: TextbookOrder) => o.id === editor.id);
        if (current?.revision === editor.revision) { setEditor(current); setBaseline(JSON.stringify(current)); }
      } catch { /* Keep the saved order and original send error visible. */ }
    }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!editor || busy) return;
    if (!textbookOrderTitle(quarter, orderRound) || !["1", "2", "3"].includes(orderRound)) { setError("분기와 텀을 선택해주세요."); return; }
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
    if (!textbookOrderTitle(quarter, orderRound) || !["1", "2", "3"].includes(orderRound)) { setError("분기와 텀을 선택해주세요."); return; }
    try { validateOrder(editor, true); } catch (e) { setError((e as Error).message); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await api("POST", { ...editor, action: "export" });
      const blob = await response.blob();
      const filename = decodeURIComponent(response.headers.get("Content-Disposition")?.split("filename*=UTF-8''")[1] || "드림잇_교재_주문서.xlsx");
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
    <header className={styles.header}><div><Link href="/teacher/manage/after-school">방과후 관리</Link><h1>📦 교재주문</h1><p>드림잇 · 교재 선택 후 주문서 작성</p></div><div className={styles.actions}><a href="/templates/dreamit-textbook-order.xls" download="드림잇 물류(교재) 주문서.xls">원본 양식 (.xls)</a><button disabled={busy || (!defaultDelivery && !setupError)} onClick={newOrder}>{!defaultDelivery && !setupError ? "배송지 확인 중" : "새 주문"}</button></div></header>
    {setupError && <p role="alert" className={styles.error}>{setupError}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.message}>{message}</p>}
    <div className={styles.layout}>
      <aside className={styles.panel}><div className={styles.sectionHeader}><h2>저장한 주문</h2><button disabled={loading || busy} onClick={() => void load()}>{loading ? "불러오는 중" : "목록 새로고침"}</button></div>
        {!orders.length && <p className={styles.muted}>새 주문을 작성하고 저장해주세요.</p>}
        <div className={styles.history}>{orders.map(order => <article key={order.id}><button disabled={busy} className={styles.orderTitle} onClick={() => open(order)}>{order.title}</button><p>{order.date} · {order.lines.length}개 항목</p><p>{order.delivery.recipient || "수령자 미입력"}{order.mailStatus === "sent" ? " · 메일 발송 완료" : order.mailStatus === "unknown" ? " · 발송 결과 확인 필요" : order.mailStatus === "sending" ? " · 발송 처리 중" : ""}</p><div className={styles.actions}><button disabled={busy} onClick={() => open({ ...order, id: "", revision: 0, date: newTextbookOrder().date, createdAt: "", updatedAt: "", mailStatus: undefined, mailSentAt: undefined })}>복사하여 작성</button>{deleting === order.id ? <><button disabled={busy} className={styles.danger} onClick={() => void remove(order)}>삭제 확인</button><button disabled={busy} onClick={() => setDeleting(null)}>취소</button></> : <button disabled={busy} onClick={() => setDeleting(order.id)}>삭제</button>}</div></article>)}</div>
      </aside>
      {editor ? <section className={styles.panel}>
        <div className={styles.sectionHeader}><h2>{editor.id ? "주문 수정" : "새 주문 작성"}</h2><span className={styles.muted}>{dirty ? "저장 전 변경사항" : editor.id ? "저장됨" : "작성 중"}</span></div>
        <fieldset disabled={busy || locked} className={styles.fields}>
          <div className={`${styles.periodField} ${styles.wide}`}><span id="order-quarter-label">분기</span><div className={styles.periodButtons} role="group" aria-labelledby="order-quarter-label">{[1, 2, 3, 4].map(q => <button type="button" key={q} aria-pressed={quarter === String(q)} className={quarter === String(q) ? styles.periodSelected : undefined} onClick={() => changeOrderPeriod(String(q), orderRound)}>{q}분기</button>)}</div></div>
          <div className={`${styles.periodField} ${styles.wide}`}><span id="order-term-label">텀</span><div className={`${styles.periodButtons} ${styles.termButtons}`} role="group" aria-labelledby="order-term-label">{[1, 2, 3].map(term => <button type="button" key={term} aria-pressed={orderRound === String(term)} className={orderRound === String(term) ? styles.periodSelected : undefined} onClick={() => changeOrderPeriod(quarter, String(term))}>{term}텀</button>)}</div></div>
          <label className={styles.wide}>주문 제목 (자동)<input value={editor.title} readOnly placeholder="분기와 텀을 선택해주세요." /></label>
          <label className={styles.wide}>주문서 양식<select value={editor.format || "legacy"} onChange={e => patch("format", e.target.value === "202610" ? "202610" : "legacy")}><option value="legacy">기존 양식</option><option value="202610">신규 양식 (2026년 10월~)</option></select></label>
          <label>주문일<input type="date" value={editor.date} onChange={e => patch("date", e.target.value)} /></label>
        </fieldset>
        <h3>학교 · 반별 교재 추가</h3>
        <fieldset disabled={busy || locked} className={styles.selector}>
          <div className={styles.fields}>
            <label>신청 연도<input type="number" min={2000} max={2100} value={year} onChange={e => { setYear(Number(e.target.value)); setGroups([]); setSelectedGroup(""); setQuantity(1); setCourse(""); setSetupError(""); }} /></label>
            <label>방과후 학교 · 반<select value={selectedGroup} onChange={e => chooseGroup(e.target.value)}><option value="">학교와 반 선택</option>{groups.map(item => <option key={item.id} value={item.id}>{item.school} {item.teachingClass} · {item.counts[`Q${quarter}`] || 0}명{item.status === "paused" ? " (휴강)" : item.status === "completed" ? " (종강)" : ""}</option>)}</select></label>
            <label className={styles.wide}>수업명 (선택)<input maxLength={100} value={course} onChange={e => setCourse(e.target.value)} placeholder="예: 한국사, 세계문화" /></label>
          </div>
          <p className={styles.muted}>방과후 관리에 등록된 학교만 표시합니다. 같은 과목·진도의 A반과 B반은 A+B반을 선택하여 교재별로 한 줄에 주문할 수 있습니다. A+B반 신청 인원은 두 반의 합계이며, 과목별 실제 신청 인원에 맞게 수량을 수정해주세요. 과목이나 진도가 다르면 각각 선택해주세요. 신청 인원이 없어도 직접 주문할 수 있습니다.</p>
          <div className={styles.subjectButtons} role="group" aria-label="교재 종류">{ORDER_SUBJECTS.map(value => <button type="button" key={value} aria-pressed={subject === value} className={subject === value ? styles.periodSelected : undefined} onClick={() => { setSubject(value); setSelectedBooks([]); setSelectedMonarteBooks([]); setSelectedOptions([]); setCustomProduct(""); setCustomOption(""); }}>{value}</button>)}</div>
          {subject === "별꼼역사" ? <>
            <div className={styles.bookGrid}>{ORDER_BOOKS.map(book => <label key={book.number} className={selectedBooks.includes(book.number) ? styles.bookSelected : styles.bookChoice}><input type="checkbox" checked={selectedBooks.includes(book.number)} onChange={e => setSelectedBooks(old => e.target.checked ? [...old, book.number] : old.filter(n => n !== book.number))} />{book.productName}</label>)}</div>
            <div className={styles.bulkOptions}>{ORDER_OPTIONS.map(option => <label key={option}><input type="checkbox" checked={selectedOptions.includes(option)} onChange={e => setSelectedOptions(old => e.target.checked ? [...old, option] : old.filter(v => v !== option))} />{option}</label>)}</div>
            <p className={styles.muted}>선택한 호수마다 선택한 구성품이 추가됩니다. 다른 구성으로 주문하려면 나누어 추가하세요.</p>
          </> : subject === "모나르떼" ? <>
            <div className={styles.bookGrid}>{ORDER_MONARTE_BOOKS.map(book => <label key={book.id} className={selectedMonarteBooks.includes(book.id) ? styles.bookSelected : styles.bookChoice}><input type="checkbox" checked={selectedMonarteBooks.includes(book.id)} onChange={e => setSelectedMonarteBooks(old => e.target.checked ? [...old, book.id] : old.filter(id => id !== book.id))} />{book.productName}</label>)}</div>
            <div className={styles.bulkOptions}>{ORDER_MONARTE_OPTIONS.map(option => <label key={option}><input type="checkbox" checked readOnly />{option}</label>)}</div>
            <p className={styles.muted}>세계문화 모나르떼 4개 시리즈의 1~3호, 총 12권을 선택할 수 있습니다. 선택한 각 호는 교재 1권 + 체험물 구성으로 함께 추가됩니다.</p>
          </> : <div className={styles.fields}>
            <label className={styles.wide}>실제 상품명<input maxLength={300} value={customProduct} onChange={e => setCustomProduct(e.target.value)} placeholder={subject === "기타" ? "업체 상품명 직접 입력" : `${subject} 교재의 정확한 상품명`} /></label>
            <label>옵션명 (선택)<input maxLength={40} value={customOption} onChange={e => setCustomOption(e.target.value)} placeholder="업체 옵션명" /></label>
            <p className={styles.muted}>공식 상품명이 등록되지 않은 교재는 업체 주문서의 정확한 명칭과 옵션을 직접 입력해주세요.</p>
          </div>}
          {editor.format === "202610" && <div className={styles.fields}><label>수업시작일<input type="date" value={classStartDate} onChange={e => setClassStartDate(e.target.value)} /></label><label>기존학생수<input type="number" min={0} max={100000} step={1} value={existingStudents ?? ""} onChange={e => setExistingStudents(e.target.value === "" ? null : Number(e.target.value))} /></label><label>신규학생수<input type="number" min={0} max={100000} step={1} value={newStudents ?? ""} onChange={e => setNewStudents(e.target.value === "" ? null : Number(e.target.value))} /></label><p className={styles.muted}>분기 또는 학기별 새롭게 모집하여 시작할 때만 두 학생수를 작성하세요. 일반 주문은 공란으로 두세요. 입력한 값은 이번에 추가하는 구성품에 반영됩니다.</p></div>}
          <div className={styles.quantityActions}><label>이번에 추가할 구성품별 수량<input type="number" min={1} max={100000} step={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} /></label><button type="button" disabled={!group} onClick={() => setQuantity(enrolledCount || 1)}>신청 인원 적용</button><button type="button" disabled={!group} className={styles.primary} onClick={addItems}>주문서에 교재 추가</button></div>
          <p className={styles.muted}>이미 추가한 다른 학교·교재의 수량은 변경되지 않습니다. 추가한 항목은 아래에서 개별 수정할 수 있습니다.</p>
        </fieldset>
        <h3>집 배송 · 기본배송지</h3>
        <p className={styles.muted}>모든 교재를 한 주소로 받습니다. 택배크기는 공란으로 두세요. 우편번호는 처음 한 번 입력하고 기본배송지로 저장해주세요.</p>
        <fieldset disabled={busy || locked} className={styles.fields}>{DELIVERY_FIELDS.map(([key, label]) => <label key={key} className={key === "address" || key === "message" ? styles.wide : ""}>{label}<input type={key === "invoiceCount" ? "number" : key === "phone" || key === "mobile" ? "tel" : "text"} min={key === "invoiceCount" ? 1 : undefined} max={key === "invoiceCount" ? 100 : undefined} maxLength={key === "address" || key === "message" ? 500 : key === "phone" || key === "mobile" ? 40 : key === "postalCode" ? 20 : key === "shipping" || key === "parcelSize" ? 100 : 300} value={editor.delivery[key]} onChange={e => patch("delivery", { ...editor.delivery, [key]: key === "invoiceCount" ? Number(e.target.value) : e.target.value })} /></label>)}</fieldset>
        <button disabled={busy || locked} onClick={() => void saveDelivery()}>이 주소를 기본배송지로 저장</button>
        <div className={styles.sectionHeader}><h3>통합 주문서 · 학교별 수량 확인</h3><span>{editor.lines.length}개 항목</span></div>
        <p className={styles.muted}>판매금액 = 수량 × 판매단가. 단가를 비우면 금액도 비워집니다.</p>
        <details className={styles.itemDetails} open><summary>개별 항목·수량·단가 수정 ({editor.lines.length}개 항목)</summary><div className={styles.lines}>{editor.lines.map((line, index) => <fieldset disabled={busy || locked} className={styles.line} key={line.id}><legend>항목 {index + 1} · {[line.school, line.teachingClass, line.course, line.subject].filter(Boolean).join(" / ") || "기존 주문 (학교 미지정)"}</legend><div className={styles.fields}>
          <label className={styles.wide}>상품명<input value={line.productName} maxLength={300} onChange={e => patchLine(line.id, "productName", e.target.value)} /></label>
          <label>옵션명{orderBookNumber(line.productName) !== null ? <select value={line.option} onChange={e => patchLine(line.id, "option", e.target.value)}>{ORDER_OPTIONS.map(option => <option key={option}>{option}</option>)}</select> : <input maxLength={40} value={line.option} onChange={e => patchLine(line.id, "option", e.target.value)} />}</label>
          <label>수량<input type="number" min={1} max={100000} step={1} value={line.quantity} onChange={e => patchLine(line.id, "quantity", Number(e.target.value))} /></label>
          {editor.format === "202610" && <><label>학교명<input maxLength={100} value={line.school || ""} onChange={e => patchLine(line.id, "school", e.target.value)} /></label><label>수업시작일<input type="date" value={line.classStartDate || ""} onChange={e => patchLine(line.id, "classStartDate", e.target.value)} /></label><label>기존학생수<input type="number" min={0} max={100000} step={1} value={line.existingStudents ?? ""} onChange={e => patchLine(line.id, "existingStudents", e.target.value === "" ? null : Number(e.target.value))} /></label><label>신규학생수<input type="number" min={0} max={100000} step={1} value={line.newStudents ?? ""} onChange={e => patchLine(line.id, "newStudents", e.target.value === "" ? null : Number(e.target.value))} /></label></>}
          <label>판매단가 (선택)<input type="number" min={0} max={100000000} step="0.01" placeholder="미입력" value={line.unitPrice ?? ""} onChange={e => patchLine(line.id, "unitPrice", e.target.value === "" ? null : Number(e.target.value))} /></label>
          <label>판매금액<output>{money(orderAmount(line))}</output></label>
          <label>주문번호 (선택)<input value={line.orderNumber} maxLength={100} onChange={e => patchLine(line.id, "orderNumber", e.target.value)} /></label>
          <label>상품번호 (선택)<input value={line.productNumber} maxLength={100} onChange={e => patchLine(line.id, "productNumber", e.target.value)} /></label>
        </div><div className={styles.actions}><button disabled={editor.lines.length >= 200} onClick={() => patch("lines", [...editor.lines, { ...line, id: crypto.randomUUID() }])}>항목 복사</button><button onClick={() => patch("lines", editor.lines.filter(l => l.id !== line.id))}>항목 삭제</button></div></fieldset>)}</div></details>
        <div className={styles.summary}><span>전체 항목 수량 <strong>{totals?.quantity.toLocaleString("ko-KR")}개</strong></span><span>{totals?.missing ? "단가 입력 항목 소계" : "판매금액 합계"} <strong>{money(totals?.priced ?? null)}</strong></span>{!!totals?.missing && <span>단가 미입력 {totals.missing}개 항목</span>}</div>
        <div className={styles.actions}><button disabled={busy || locked} className={styles.primary} onClick={() => void save()}>{busy ? "처리 중" : "주문 저장"}</button><button disabled={busy} onClick={() => setPreview(p => !p)}>{preview ? "미리보기 닫기" : "주문서 미리보기"}</button><button disabled={busy} onClick={() => void download()}>엑셀 다운로드 (.xlsx)</button><button disabled={busy || locked || dirty || !editor.id} onClick={() => setMailPreview(p => !p)}>주문 메일 확인</button></div>
        <p className={styles.muted}>다운로드에는 현재 화면의 내용이 반영됩니다. 주문 내역을 보관하려면 저장해주세요. 선택한 양식({orderFormatLabel(editor)})의 열 순서로 내보냅니다.</p>
        {locked && <p role="status" className={styles.muted}>{editor.mailStatus === "sent" ? "메일 발송 완료. 다음 텀 주문은 복사하여 작성해주세요." : "발송 중이거나 결과를 확인할 수 없는 주문입니다. 보낸편지함을 확인해주세요."}</p>}
        {!editor.id || dirty ? <p className={styles.muted}>메일 발송 전 주문 내용을 저장해주세요.</p> : null}
        {mailPreview && <section className={styles.mailPreview}><h3>주문 메일 미리보기</h3><p>받는 사람: dreameat64@naver.com</p><p>숨은 참조: loveghkql@naver.com</p><p>제목: {textbookOrderMailSubject(editor)}</p><p>첨부: {orderFormatLabel(editor)} 주문서 엑셀 (.xlsx) · {editor.lines.length}개 항목</p><p>안녕하세요.<br /><br />{editor.title} 주문서를 첨부합니다.<br />확인 부탁드립니다.<br /><br />감사합니다.<br />이화선</p><p className={styles.muted}>참여확인서에 연결한 Gmail 계정으로 발송합니다.</p><div className={styles.actions}><button disabled={busy || locked || dirty || !editor.id} className={styles.primary} onClick={() => void sendMail()}>드림잇에 주문 메일 발송</button><Link href="/teacher/atc-confirmations">Gmail 연결 관리</Link></div></section>}
        {preview && <div className={styles.tableScroll}><table><caption>드림잇주문 · {orderFormatLabel(editor)} · 엑셀 내용 확인</caption><thead><tr>{orderColumns(editor).map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{orderRows(editor).map((row, i) => <tr key={editor.lines[i].id}>{row.map((v, j) => <td key={j}>{v ?? ""}</td>)}</tr>)}</tbody></table></div>}
      </section> : <section className={styles.panel}><h2>통합 교재 주문서</h2><p>새 주문을 만들거나 저장한 주문을 선택해주세요.</p><button disabled={!defaultDelivery && !setupError} className={styles.primary} onClick={newOrder}>새 주문 작성</button></section>}
    </div>
  </main>;
}
