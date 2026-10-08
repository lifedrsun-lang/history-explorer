// Column names and defaults follow the supplied 드림잇 물류(교재) 주문서.xls.
export const ORDER_COLUMNS = ["주문번호", "상품번호", "상품명", "옵션명", "수량", "판매단가", "판매금액", "수령자", "전화", "핸드폰", "우편번호", "주소", "배송메세지", "배송비", "송장출력갯수", "택배크기"];
export const ORDER_OPTIONS = ["스토리북", "워크북", "체험물"] as const;
export type OrderLine = { id: string; orderNumber: string; productNumber: string; productName: string; option: string; quantity: number; unitPrice: number | null };
export type OrderDelivery = { recipient: string; phone: string; mobile: string; postalCode: string; address: string; message: string; shipping: string; invoiceCount: number; parcelSize: string };
export type TextbookOrder = { id: string; revision: number; title: string; date: string; delivery: OrderDelivery; lines: OrderLine[]; createdAt: string; updatedAt: string };
export type OrderInput = Pick<TextbookOrder, "title" | "date" | "delivery" | "lines">;
export class OrderInputError extends Error {}
export function newOrderLine(): OrderLine {
  return { id: crypto.randomUUID(), orderNumber: "", productNumber: "", productName: "별꼼역사 1호-고조선1", option: "스토리북", quantity: 1, unitPrice: null };
}
export function newTextbookOrder(): TextbookOrder {
  return { id: "", revision: 0, title: "", date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
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
    if (!productName.startsWith("별꼼역사 ") || !ORDER_OPTIONS.some(value => value === option) || quantity < 1) throw new OrderInputError("별꼼역사 상품명·옵션·수량을 확인해주세요.");
    return { id, orderNumber: text(l.orderNumber, "주문번호", 100), productNumber: text(l.productNumber, "상품번호", 100), productName, option, quantity, unitPrice: l.unitPrice === null ? null : number(l.unitPrice, "판매단가", 100000000, false) };
  });
  if (new Set(lines.map(l => l.id)).size !== lines.length) throw new OrderInputError("주문 항목이 중복되었습니다.");
  if (forExport && (!delivery.recipient || (!delivery.phone && !delivery.mobile) || !delivery.postalCode || !delivery.address)) throw new OrderInputError("엑셀 다운로드 전에 수령자·연락처·우편번호·주소를 입력해주세요.");
  return { title, date, delivery, lines };
}
export function orderRows(order: OrderInput): (string | number | null)[][] {
  const d = order.delivery;
  return order.lines.map(l => [l.orderNumber, l.productNumber, l.productName, l.option, l.quantity, l.unitPrice, orderAmount(l), d.recipient, d.phone, d.mobile, d.postalCode, d.address, d.message, d.shipping, d.invoiceCount, d.parcelSize]);
}
