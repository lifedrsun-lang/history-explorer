import type { ReactNode } from "react";

export type AtcDailyRow = { date: string; sessions: number; remarks: string };

export type AtcPrintProps = {
  schoolName: string;
  yearMonth: string;
  educatorName: string;
  educatorPhone: string;
  educatorSignatureDataUrl: string | null;
  schoolVerifierName: string;
  schoolSignatureDataUrl: string | null;
  schoolSignedAt: string;
  operationPeriodStart: string;
  operationPeriodEnd: string;
  rows: AtcDailyRow[];
  logoSrc?: string;
  onEditEducatorSignature?: () => void;
  forPdf?: boolean;
};

const formatMonthDay = (date: string) => {
  const [, month, day] = date.split("-").map(Number);
  return month && day ? `${month}월 ${day}일` : date;
};
const formatPeriod = (start?: string, end?: string) =>
  start && end ? `${start.replaceAll("-", ".")} ~ ${end.replaceAll("-", ".")}` : "";
export const formatAtcSignedDate = (value: string) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(date);
};
const getOfficialSchoolName = (value: string) =>
  value.endsWith("초") && !value.endsWith("초등학교") ? `${value.slice(0, -1)}초등학교` : value;

export default function AtcPrintSheet(props: AtcPrintProps): ReactNode {
  const {
    schoolName, yearMonth, educatorName, educatorPhone, educatorSignatureDataUrl,
    schoolVerifierName, schoolSignatureDataUrl, schoolSignedAt,
    operationPeriodStart, operationPeriodEnd, rows: printRows,
    logoSrc = "/images/atc-logo.png", onEditEducatorSignature, forPdf = false,
  } = props;
  const officialSelectedSchool = getOfficialSchoolName(schoolName);
  const year = Number(yearMonth.slice(0, 4));
  const month = Number(yearMonth.slice(5));
  const paddedPrintRows: Array<AtcDailyRow | null> = [...printRows];
  while (paddedPrintRows.length < 22) paddedPrintRows.push(null);
  const totalSessions = printRows.reduce((sum, row) => sum + row.sessions, 0);
  const confirmationDate = schoolSignatureDataUrl
    ? formatAtcSignedDate(schoolSignedAt)
    : formatAtcSignedDate(new Date().toISOString());
  return (
        <section className="atc-print-sheet mx-auto max-w-[850px] bg-white p-8 shadow-lg">
          <div className="atc-logo-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}<img src={logoSrc} alt="ATC" width={292} height={74} className="atc-print-logo" />
          </div>
          <h2 className="atc-title">2026 ATC스쿨 전담 에듀케이터 참여 확인서</h2>

          <table className="atc-form-table atc-summary-table mt-5">
            <tbody>
              <tr><th className="w-[16%] bg-slate-50">프로그램명</th><td className="w-[34%] font-bold">ATC스쿨</td><th className="w-[16%] bg-slate-50">학교명</th><td className="w-[34%] font-bold">{officialSelectedSchool}</td></tr>
              <tr><th className="bg-slate-50">운영기간</th><td className="font-bold">{formatPeriod(operationPeriodStart, operationPeriodEnd) || ""}</td><th className="bg-slate-50">해당월</th><td className="font-bold">{year}년 {month}월</td></tr>
              <tr><th className="bg-slate-50">강사명</th><td className="font-bold">{educatorName}</td><th className="bg-slate-50">연락처</th><td className="font-bold">{educatorPhone}</td></tr>
              <tr>
                <th className="bg-slate-50">확 인 자</th>
                <td colSpan={3}>
                  <div className="atc-verifier-row flex min-h-14 items-center gap-3">
                    <span className="atc-verifier-affiliation">(소속) <b>{officialSelectedSchool}</b></span>
                    <span>(성명) <b>{schoolVerifierName}</b></span>
                    <span className="atc-signature-slot">
                      <span aria-hidden="true">(서명)</span>
                      {schoolSignatureDataUrl && <img src={schoolSignatureDataUrl} alt="학교 담당교사 서명" className="atc-signature-img" />}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="atc-form-table atc-lesson-table mt-4">
            <thead><tr className="bg-slate-50"><th className="w-[12%]">수업횟수</th><th className="w-[23%]">수업일자</th><th className="w-[16%]">수업차시</th><th>비고</th></tr></thead>
            <tbody>
              <tr className="atc-example-row h-7">
                <td>예시</td>
                <td>4월 1일</td>
                <td>4</td>
                <td className="atc-remarks-cell" />
              </tr>
              {paddedPrintRows.map((row, index) => (
                <tr key={`${row?.date || "blank"}-${index}`} className="h-7">
                  <td>{index + 1}</td>
                  <td>{row ? formatMonthDay(row.date) : ""}</td>
                  <td>{row ? row.sessions : ""}</td>
                  <td className="atc-remarks-cell">{row?.remarks || ""}</td>
                </tr>
              ))}
              <tr className="atc-total-row"><td>합계</td><td className="font-bold">{printRows.length}일</td><td className="font-bold">{totalSessions}차시</td><td className="atc-remarks-cell" /></tr>
            </tbody>
          </table>

          <div className="atc-attendance-note mt-3">※ 출석부 월별 해당차수에 해당하는 날짜를 기입.</div>
          <div className="atc-footer-block">
            <div className="atc-footer-statement mt-7 text-center">본인은 위 사항을 확인하며 참여하였음을 서명으로 증명합니다.</div>
            <div className="atc-footer-date mt-5">{confirmationDate}</div>
            <div className="atc-footer-signature mt-6 flex items-center gap-3">
              <span>에듀케이터 성명</span>
              <span className="atc-educator-name min-w-20 border-b border-slate-500 pb-1 text-center">{educatorName}</span>
              <span className="atc-signature-slot atc-signature-button" onClick={onEditEducatorSignature} title="에듀케이터 기본 서명 수정">
                <span aria-hidden="true">(인)</span>
                {educatorSignatureDataUrl && <img src={educatorSignatureDataUrl} alt="에듀케이터 서명" className="atc-signature-img" />}
              </span>
            </div>
          </div>

          {!forPdf && <div className="no-print mt-5 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500">미리보기입니다. 인쇄 / PDF 저장 시 이 안내는 출력되지 않습니다.</div>}
        </section>
  );
}
