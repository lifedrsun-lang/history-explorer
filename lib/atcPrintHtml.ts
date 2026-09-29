import { formatAtcSignedDate, type AtcDailyRow } from "@/app/teacher/atc-confirmations/AtcPrintSheet";
import type { AtcPrintProps } from "@/app/teacher/atc-confirmations/AtcPrintSheet";

const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);

// The PDF uses the same fields, row order and class names as AtcPrintSheet.
export function renderAtcPrintHtml(props: AtcPrintProps): string {
  const school = props.schoolName.endsWith("초") ? `${props.schoolName.slice(0, -1)}초등학교` : props.schoolName;
  const year = Number(props.yearMonth.slice(0, 4));
  const month = Number(props.yearMonth.slice(5));
  const period = props.operationPeriodStart && props.operationPeriodEnd
    ? `${props.operationPeriodStart.replaceAll("-", ".")} ~ ${props.operationPeriodEnd.replaceAll("-", ".")}` : "";
  const rows: Array<AtcDailyRow | null> = [...props.rows];
  while (rows.length < 22) rows.push(null);
  const total = props.rows.reduce((sum, row) => sum + row.sessions, 0);
  const signature = (src: string | null, alt: string) => src
    ? `<img src="${escape(src)}" alt="${escape(alt)}" class="atc-signature-img">` : "";
  return `<section class="atc-print-sheet">
    <div class="atc-logo-row"><img src="${escape(props.logoSrc)}" alt="ATC" width="292" height="74" class="atc-print-logo"></div>
    <h2 class="atc-title">2026 ATC스쿨 전담 에듀케이터 참여 확인서</h2>
    <table class="atc-form-table atc-summary-table"><tbody>
      <tr><th style="width:16%">프로그램명</th><td style="width:34%"><b>ATC스쿨</b></td><th style="width:16%">학교명</th><td style="width:34%"><b>${escape(school)}</b></td></tr>
      <tr><th>운영기간</th><td><b>${escape(period)}</b></td><th>해당월</th><td><b>${year}년 ${month}월</b></td></tr>
      <tr><th>강사명</th><td><b>${escape(props.educatorName)}</b></td><th>연락처</th><td><b>${escape(props.educatorPhone)}</b></td></tr>
      <tr><th>확 인 자</th><td colspan="3"><div class="atc-verifier-row">
        <span class="atc-verifier-affiliation">(소속) <b>${escape(school)}</b></span>
        <span>(성명) <b>${escape(props.schoolVerifierName)}</b></span>
        <span class="atc-signature-slot"><span>(서명)</span>${signature(props.schoolSignatureDataUrl, "학교 담당교사 서명")}</span>
      </div></td></tr>
    </tbody></table>
    <table class="atc-form-table atc-lesson-table"><thead><tr>
      <th style="width:12%">수업횟수</th><th style="width:23%">수업일자</th><th style="width:16%">수업차시</th><th>비고</th>
    </tr></thead><tbody>
      <tr class="atc-example-row"><td>예시</td><td>4월 1일</td><td>4</td><td class="atc-remarks-cell"></td></tr>
      ${rows.map((row, index) => {
        const [, m, d] = (row?.date || "").split("-").map(Number);
        return `<tr><td>${index + 1}</td><td>${row ? `${m}월 ${d}일` : ""}</td><td>${row?.sessions ?? ""}</td><td class="atc-remarks-cell">${escape(row?.remarks)}</td></tr>`;
      }).join("")}
      <tr class="atc-total-row"><td>합계</td><td class="font-bold">${props.rows.length}일</td><td class="font-bold">${total}차시</td><td class="atc-remarks-cell"></td></tr>
    </tbody></table>
    <div class="atc-attendance-note">※ 출석부 월별 해당차수에 해당하는 날짜를 기입.</div>
    <div class="atc-footer-block">
      <div class="atc-footer-statement">본인은 위 사항을 확인하며 참여하였음을 서명으로 증명합니다.</div>
      <div class="atc-footer-date">${escape(formatAtcSignedDate(props.schoolSignedAt))}</div>
      <div class="atc-footer-signature"><span>에듀케이터 성명</span>
        <span class="atc-educator-name">${escape(props.educatorName)}</span>
        <span class="atc-signature-slot atc-signature-button"><span>(인)</span>${signature(props.educatorSignatureDataUrl, "에듀케이터 서명")}</span>
      </div>
    </div>
  </section>`;
}
