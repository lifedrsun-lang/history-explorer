import { HISTORY_BOOKS, WORLD_CULTURE_BOOKS } from "@/lib/presentations/catalog";
// Column names and defaults follow the supplied 드림잇 물류(교재) 주문서.xls.
export const ORDER_SUBJECTS = ["별꼼역사", "모나르떼", "헤르메스", "기타"] as const;
export const ORDER_BOOKS = Array.from({ length: 24 }, (_, i) => {
  const number = i + 1;
  const book = HISTORY_BOOKS.find(b => b.number === number);
  const topic = number === 24 ? "연대표(복습)" : book?.shortTitle.replace(/(\D)(\d+)$/, "$1 $2") || "";
  return { number, productName: `별꼼역사 ${String(number).padStart(2, "0")}호${topic ? ` ${topic}` : ""}`, confirmed: !!book || number === 24 };
});
export const ORDER_MONARTE_BOOKS = WORLD_CULTURE_BOOKS.map(book => ({
  id: `world_${book.series}_${book.number}`,
  series: book.series,
  seriesLabel: book.seriesLabel,
  number: book.number,
  productName: `모나르떼 ${book.seriesLabel} ${book.number}호`,
}));
export function orderBookNumber(productName: string): number | null {
  const match = productName.match(/^별꼼역사\s+(\d{1,2})호/);
  const number = Number(match?.[1]);
  return number >= 1 && number <= 24 ? number : null;
}
export function selectOrderBooks(lines: OrderLine[], numbers: number[], options: readonly string[], quantity: number): OrderLine[] {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) throw new OrderInputError("주문 수량은 1~100000으로 입력해주세요.");
  return numbers.flatMap(number => {
    const book = ORDER_BOOKS.find(b => b.number === number);
    if (!book) throw new OrderInputError("교재 호수를 확인해주세요.");
    return options.map(option => {
      if (!ORDER_OPTIONS.some(o => o === option)) throw new OrderInputError("구성품을 확인해주세요.");
      return lines.find(l => orderBookNumber(l.productName) === number && l.option === option) || { ...newOrderLine(), productName: book.productName, option, quantity };
    });
  });
}
export const ORDER_COLUMNS = ["주문번호", "상품번호", "상품명", "옵션명", "수량", "판매단가", "판매금액", "수령자", "전화", "핸드폰", "우편번호", "주소", "배송메세지", "배송비", "송장출력갯수", "택배크기"];
export const ORDER_COLUMNS_202610 = ["학교명", "수업시작일", "상품명", "옵션명", "수량", "기존학생수", "신규학생수", "수령자", "전화", "핸드폰", "우편번호", "주소", "배송메세지", "배송비", "송장출력갯수"];
export type OrderFormat = "legacy" | "202610";
export function orderColumns(order: { format?: OrderFormat }) { return order.format === "202610" ? ORDER_COLUMNS_202610 : ORDER_COLUMNS; }
export function orderFormatLabel(order: { format?: OrderFormat }) { return order.format === "202610" ? "신규 양식 (2026년 10월~)" : "기존 양식"; }
export const ORDER_OPTIONS = ["스토리북", "워크북", "체험물"] as const;
export const ORDER_MONARTE_OPTIONS = ["교재", "체험물"] as const;
export type OrderLine = { id: string; orderNumber: string; productNumber: string; productName: string; option: string; quantity: number; unitPrice: number | null; school?: string; teachingClass?: string; subject?: string; course?: string; classStartDate?: string; existingStudents?: number | null; newStudents?: number | null };
export type OrderDelivery = { recipient: string; phone: string; mobile: string; postalCode: string; address: string; message: string; shipping: string; invoiceCount: number; parcelSize: string };
export type TextbookOrder = { id: string; revision: number; format?: OrderFormat; title: string; date: string; delivery: OrderDelivery; lines: OrderLine[]; createdAt: string; updatedAt: string; mailStatus?: "sending" | "sent" | "failed" | "unknown"; mailSentAt?: string };
export type OrderInput = Pick<TextbookOrder, "title" | "date" | "delivery" | "lines" | "format">;
export class OrderInputError extends Error {}
export function textbookOrderTitle(quarter: string, round: string): string {
  const q = Number(quarter), r = Number(round);
  if (!Number.isInteger(q) || q < 1 || q > 4 || !Number.isInteger(r) || r < 1 || r > 999) return "";
  return `이화선 // ${q}분기 ${r}차 교재 주문`;
}
export function textbookOrderMailSubject(order: OrderInput): string {
  const schools = [...new Set(order.lines.map(line => (line.school || "").replace(/[\r\n]+/g, " ").trim()).filter(Boolean))];
  return schools.length ? `${order.title} (${schools.join(", ")})` : order.title;
}
export function parseTextbookOrderTitle(title: string) {
  const match = title.match(/^이화선 \/\/ ([1-4])분기 ([1-9]\d{0,2})차 교재 주문$/);
  return { quarter: match?.[1] || "", round: match?.[2] || "" };
}
export function newOrderLine(): OrderLine {
  return { id: crypto.randomUUID(), orderNumber: "", productNumber: "", productName: ORDER_BOOKS[0].productName, option: "스토리북", quantity: 1, unitPrice: null };
}
export function newTextbookOrder(): TextbookOrder {
  return { id: "", revision: 0, format: "legacy", title: textbookOrderTitle("1", "1"), date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
    delivery: { recipient: "", phone: "", mobile: "", postalCode: "", address: "", message: "", shipping: "선결재", invoiceCount: 1, parcelSize: "" },
    lines: [newOrderLine()], createdAt: "", updatedAt: "" };
}
export function orderAmount(line: OrderLine): number | null {
  return line.unitPrice === null ? null : Math.round(line.quantity * line.unitPrice * 100) / 100;
}
export function validateOrder(raw: unknown, forExport = false): OrderInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new OrderInputError("주문 내용을 확인해주세요.");
  const input = raw as Record<string, unknown>;
  const text = (v: unknown, label: string, max = 300) => {
    if (typeof v !== "string" || v.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v)) throw new OrderInputError(`${label} 입력을 확인해주세요.`);
    return v.trim();
  };
  const number = (v: unknown, label: string, max: number, integer = true) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max || (integer && !Number.isInteger(v))) throw new OrderInputError(`${label} 입력을 확인해주세요.`);
    return v;
  };
  if (input.format !== undefined && input.format !== "legacy" && input.format !== "202610") throw new OrderInputError("주문서 양식을 확인해주세요.");
  const format: OrderFormat = input.format === "202610" ? "202610" : "legacy";
  const title = text(input.title, "주문 제목", 150);
  if (!title) throw new OrderInputError("주문 제목을 입력해주세요.");
  const date = text(input.date, "주문일", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new OrderInputError("주문일을 확인해주세요.");
  if (!input.delivery || typeof input.delivery !== "object" || Array.isArray(input.delivery)) throw new OrderInputError("배송 정보를 확인해주세요.");
  const d = input.delivery as Record<string, unknown>;
  const delivery: OrderDelivery = { recipient: text(d.recipient, "수령자"), phone: text(d.phone, "전화", 40), mobile: text(d.mobile, "핸드폰", 40), postalCode: text(d.postalCode, "우편번호", 20), address: text(d.address, "주소", 500), message: text(d.message, "배송메세지", 500), shipping: text(d.shipping, "배송비", 100), invoiceCount: number(d.invoiceCount, "송장출력갯수", 100), parcelSize: text(d.parcelSize, "택배크기", 100) };
  if (delivery.invoiceCount < 1) throw new OrderInputError("송장출력갯수는 1 이상으로 입력해주세요.");
  if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 200) throw new OrderInputError("주문 항목은 1~200개로 입력해주세요.");
  const lines = input.lines.map((rawLine): OrderLine => {
    if (!rawLine || typeof rawLine !== "object" || Array.isArray(rawLine)) throw new OrderInputError("주문 항목을 확인해주세요.");
    const l = rawLine as Record<string, unknown>;
    const id = text(l.id, "항목 ID", 80);
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new OrderInputError("주문 항목을 확인해주세요.");
    const productName = text(l.productName, "상품명");
    const option = text(l.option, "옵션명", 40);
    const quantity = number(l.quantity, "수량", 100000);
    if (!productName || quantity < 1 || (productName.startsWith("별꼼역사 ") && !ORDER_OPTIONS.some(value => value === option))) throw new OrderInputError("상품명·옵션·수량을 확인해주세요.");
    const scope = { ...(l.school === undefined ? {} : { school: text(l.school, "학교", 100) }), ...(l.teachingClass === undefined ? {} : { teachingClass: text(l.teachingClass, "수업반", 40) }), ...(l.subject === undefined ? {} : { subject: text(l.subject, "교재 종류", 100) }), ...(l.course === undefined ? {} : { course: text(l.course, "수업명", 100) }) };
    const classStartDate = l.classStartDate === undefined ? "" : text(l.classStartDate, "수업시작일", 10);
    if (classStartDate && (!/^\d{4}-\d{2}-\d{2}$/.test(classStartDate) || !Number.isFinite(Date.parse(classStartDate)) || new Date(classStartDate).toISOString().slice(0, 10) !== classStartDate)) throw new OrderInputError("수업시작일을 확인해주세요.");
    const existingStudents = l.existingStudents == null ? null : number(l.existingStudents, "기존학생수", 100000);
    const newStudents = l.newStudents == null ? null : number(l.newStudents, "신규학생수", 100000);
    if (format === "202610" && forExport && ((existingStudents === null) !== (newStudents === null))) throw new OrderInputError("기존·신규 학생수는 모두 입력하거나 모두 비워주세요.");
    const extra = { ...(l.classStartDate === undefined ? {} : { classStartDate }), ...(l.existingStudents === undefined ? {} : { existingStudents }), ...(l.newStudents === undefined ? {} : { newStudents }) };
    return { ...scope, ...extra, id, orderNumber: text(l.orderNumber, "주문번호", 100), productNumber: text(l.productNumber, "상품번호", 100), productName, option, quantity, unitPrice: l.unitPrice === null ? null : number(l.unitPrice, "판매단가", 100000000, false) };
  });
  if (new Set(lines.map(l => l.id)).size !== lines.length) throw new OrderInputError("주문 항목이 중복되었습니다.");
  if (forExport && (!delivery.recipient || (!delivery.phone && !delivery.mobile) || !delivery.postalCode || !delivery.address)) throw new OrderInputError("엑셀 다운로드 전에 수령자·연락처·우편번호·주소를 입력해주세요.");
  return { format, title, date, delivery, lines };
}
export function orderRows(order: OrderInput): (string | number | null)[][] {
  const d = order.delivery;
  if (order.format === "202610") return order.lines.map(l => [l.school || "", l.classStartDate || "", l.productName, l.option, l.quantity, l.existingStudents ?? null, l.newStudents ?? null, d.recipient, d.phone, d.mobile, d.postalCode, d.address, d.message, d.shipping, d.invoiceCount]);
  return order.lines.map(l => [l.orderNumber, l.productNumber, l.productName, l.option, l.quantity, l.unitPrice, orderAmount(l), d.recipient, d.phone, d.mobile, d.postalCode, d.address, d.message, d.shipping, d.invoiceCount, d.parcelSize]);
}
