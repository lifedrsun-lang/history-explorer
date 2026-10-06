import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";

export const runtime = "nodejs";
export const maxDuration = 60;

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
type Row = { schoolName: string; title: string; counts: number[] };

export async function POST(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const input = await request.json();
    if (!Number.isInteger(input.academicYear) || input.academicYear < 2000 || input.academicYear > 2100 ||
        !/^Q[1-4]$/.test(input.quarter) || !Array.isArray(input.rows) || !input.rows.length || input.rows.length > 100 ||
        input.rows.some((row: Row) => typeof row.schoolName !== "string" || !row.schoolName.trim() || row.schoolName.length > 100 ||
          typeof row.title !== "string" || row.title.length > 200 || !Array.isArray(row.counts) || row.counts.length !== 3 ||
          row.counts.some((count) => !Number.isInteger(count) || count < 0 || count > 100000))) {
      return jsonError("학교와 텀별 수령 인원을 확인해 주세요.", 400, "invalid_textbook_report");
    }
    const rows: Row[] = input.rows;
    const totals = rows.reduce((sums, row) => sums.map((sum, i) => sum + row.counts[i]), [0, 0, 0]);
    const quarter = `${input.quarter.slice(1)}분기`;
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
    const font = (await readFile(path.join(process.cwd(), "public/fonts/noto-sans-kr-400.woff2"))).toString("base64");
    const totalCells = (counts: number[]) => `${counts.map((count) => `<td>${count.toLocaleString("ko-KR")}명</td>`).join("")}<td class="total">${counts.reduce((sum, count) => sum + count, 0).toLocaleString("ko-KR")}권</td>`;
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
      @font-face{font-family:Report;src:url(data:font/woff2;base64,${font})}body{font-family:Report,sans-serif;color:#172033;font-size:12px;margin:0}h1{font-size:24px;margin:8px 0 20px}.brand{color:#4f46e5;font-size:11px;letter-spacing:2px}.meta{display:flex;justify-content:space-between;margin-bottom:28px;color:#64748b}table{border-collapse:collapse;width:100%;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}th{background:#172033;color:white;padding:14px 7px}td{border-bottom:1px solid #e2e8f0;padding:18px 7px;text-align:center;overflow-wrap:anywhere}th:first-child{width:27%}th:nth-child(2){width:20%}.total{font-weight:bold;color:#4338ca}tfoot td{background:#eef2ff;font-weight:bold}.notes{margin-top:24px;padding:16px;background:#f8fafc;line-height:1.8;color:#475569}.footer{margin-top:24px;text-align:right;color:#64748b}
      </style></head><body><div class="brand">SUN LAB</div><h1>학교별 교재 수령 보고서</h1><div class="meta"><span>${input.academicYear}년 ${quarter} · 1~3텀</span><span>작성일 ${date}</span></div>
      <table><thead><tr><th>학교</th><th>수업</th><th>1텀</th><th>2텀</th><th>3텀</th><th>총 교재 권수</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escape(row.schoolName)}</td><td>${escape(row.title)}</td>${totalCells(row.counts)}</tr>`).join("")}</tbody><tfoot><tr><td colspan="2">전체 합계</td>${totalCells(totals)}</tr></tfoot></table>
      <div class="notes">산정 기준: 텀별 교재 수령 체크 인원, 1인 1권.<br>학교 총 교재 권수 = 1텀 수령 인원 + 2텀 수령 인원 + 3텀 수령 인원.<br>동일 학생이 세 텀 모두 수령한 경우 교재 3권으로 계산합니다.</div><div class="footer">SUN LAB · 교재 수령 집계</div></body></html>`;
    const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(async () => { await document.fonts.ready; });
      const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "18mm", right: "12mm", bottom: "18mm", left: "12mm" } });
      const filename = `교재수령보고서_${input.academicYear}년_${quarter}.pdf`;
      return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`, "Cache-Control": "no-store" } });
    } finally {
      await browser.close();
    }
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401, error.message);
    return handleRouteError(error);
  }
}
