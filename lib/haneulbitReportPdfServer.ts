import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { EVALUATION_FIELDS, EVALUATION_LEVELS, REPORT_PROGRAM, type ReportCommon, type SavedEvaluation } from "@/lib/haneulbitReports";

// Keep historical quarters on their supplied form when a newer form is added.
export function reportTemplateFilename(common: Pick<ReportCommon, "year" | "quarter">) {
  return common.year > 2026 || (common.year === 2026 && common.quarter >= 3)
    ? "result-report-2026-q3.html" : "result-report.html";
}
async function readTemplate(common: Pick<ReportCommon, "year" | "quarter">) {
  let template: string;
  try { template = await readFile(path.join(process.cwd(), "templates", "haneulbit", reportTemplateFilename(common)), "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("report_template_missing");
    throw error;
  }
  // The template is a developer-maintained reproduction of the supplied original,
  // never a layout created from assumptions. All original wording stays in it.
  const tokens = ["program", "period", "grade", "schoolClass", "name", "quarter", "comment", "instructor", "fontRegular", "fontBold", ...EVALUATION_FIELDS.flatMap(({ key }) => EVALUATION_LEVELS.map((_, i) => `${key}.${i}`))];
  if (tokens.some((token) => !template.includes(`{{${token}}}`))) throw new Error("report_template_missing");
  if (!template.includes('data-activity-cell="11"') || !template.includes('data-report-fit="comment"')) throw new Error("report_template_missing");
  return template;
}
export async function reportTemplateReady(common: Pick<ReportCommon, "year" | "quarter">) {
  try { await readTemplate(common); return true; }
  catch (error) { if ((error as Error).message === "report_template_missing") return false; throw error; }
}
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
export function reportPeriodText(start: string, end: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  return `${sy}년 ${sm}월 ${sd}일 ~ ${sy === ey ? "" : `${ey}년 `}${em}월 ${ed}일`;
}
export async function renderReportPdfs(common: ReportCommon, entries: SavedEvaluation[]): Promise<Buffer[]> {
  const [template, regular, bold] = await Promise.all([
    readTemplate(common),
    readFile(path.join(process.cwd(), "public/fonts/noto-sans-kr-400.woff2")),
    readFile(path.join(process.cwd(), "public/fonts/noto-sans-kr-700.woff2")),
  ]);
  const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
  try {
    const page = await browser.newPage();
    // All assets are embedded; never let input or a template trigger network requests.
    await page.setRequestInterception(true);
    page.on("request", (request) => /^(data:|about:)/.test(request.url()) ? void request.continue() : void request.abort());
    await page.setJavaScriptEnabled(false);
    const files: Buffer[] = [];
    for (const entry of entries) {
      const replacements: Record<string, string> = {
        program: REPORT_PROGRAM, period: reportPeriodText(common.startDate, common.endDate), quarter: String(common.quarter),
        grade: entry.student.grade.replace(/학년\s*$/, "").trim(), schoolClass: entry.student.schoolClass.replace(/반\s*$/, "").trim(), name: entry.student.name,
        comment: entry.comment, instructor: common.instructor,
        fontRegular: `data:font/woff2;base64,${regular.toString("base64")}`,
        fontBold: `data:font/woff2;base64,${bold.toString("base64")}`,
      };
      for (const { key } of EVALUATION_FIELDS) EVALUATION_LEVELS.forEach((level, i) => { replacements[`${key}.${i}`] = entry[key] === level ? "✓" : ""; });
      const html = template.replace(/\{\{([\w.]+)\}\}/g, (_, key: string) => escape(replacements[key] || ""));
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(async () => { await document.fonts.ready; });
      // Preserve all teacher-entered text while flowing it through the original
      // twelve bounded activity cells. Explicit newlines start a new cell.
      const activitiesFit = await page.evaluate((text) => {
        const cells = Array.from(document.querySelectorAll<HTMLElement>("[data-activity-cell]"));
        const lines = text.replaceAll("\r\n", "\n").split("\n");
        // Twelve weekly entries must stay in twelve corresponding cells.
        // Fit each title within its own cell instead of moving later weeks.
        if (lines.length === cells.length) {
          cells.forEach((cell, index) => {
            cell.textContent = lines[index];
            cell.style.padding = "0.6mm";
            cell.style.lineHeight = "1.2";
          });
          for (const size of [13.33, 12.5, 12, 11.5, 11]) {
            cells.forEach((cell) => { cell.style.fontSize = `${size}px`; });
            if (cells.every((cell) => cell.scrollHeight <= cell.clientHeight + 1 && cell.scrollWidth <= cell.clientWidth + 1)) return true;
          }
          return false;
        }
        for (const size of [13.33, 12.5, 12, 11.5, 11]) {
          cells.forEach((cell) => { cell.textContent = ""; cell.style.fontSize = `${size}px`; });
          let index = 0;
          for (const char of Array.from(text.replaceAll("\r\n", "\n"))) {
            if (char === "\n") { index++; continue; }
            if (!cells[index]) return false;
            const cell = cells[index]; const previous = cell.textContent || "";
            cell.textContent = previous + char;
            if (cell.scrollHeight > cell.clientHeight + 1 || cell.scrollWidth > cell.clientWidth + 1) {
              cell.textContent = previous; index++;
              if (!cells[index]) break;
              cells[index].textContent = char;
            }
          }
          if (index < cells.length) return true;
        }
        return false;
      }, common.activities);
      if (!activitiesFit) throw new Error("report_text_overflow");
      const fits = await page.evaluate(() => {
        for (const element of Array.from(document.querySelectorAll<HTMLElement>("[data-report-fit]"))) {
          let size = parseFloat(getComputedStyle(element).fontSize);
          while ((element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1) && size > 11) {
            size -= 0.5; element.style.fontSize = `${size}px`;
          }
          if (element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1) return false;
        }
        return true;
      });
      if (!fits) throw new Error("report_text_overflow");
      files.push(Buffer.from(await page.pdf({ format: "A4", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } })));
    }
    return files;
  } finally { await browser.close(); }
}
