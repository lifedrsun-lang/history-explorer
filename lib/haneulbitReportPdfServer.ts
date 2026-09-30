import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { EVALUATION_FIELDS, EVALUATION_LEVELS, REPORT_PROGRAM, type ReportCommon, type SavedEvaluation } from "@/lib/haneulbitReports";

const templatePath = () => path.join(process.cwd(), "templates", "haneulbit", "result-report.html");
async function readTemplate() {
  let template: string;
  try { template = await readFile(templatePath(), "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("report_template_missing");
    throw error;
  }
  // The template is a developer-maintained reproduction of the supplied original,
  // never a layout created from assumptions. All original wording stays in it.
  const tokens = ["program", "period", "grade", "schoolClass", "name", "activities", "comment", "instructor", "fontRegular", "fontBold", ...EVALUATION_FIELDS.flatMap(({ key }) => EVALUATION_LEVELS.map((_, i) => `${key}.${i}`))];
  if (tokens.some((token) => !template.includes(`{{${token}}}`))) throw new Error("report_template_missing");
  if (!template.includes('data-report-fit="activities"') || !template.includes('data-report-fit="comment"')) throw new Error("report_template_missing");
  return template;
}
export async function reportTemplateReady() {
  try { await readTemplate(); return true; }
  catch (error) { if ((error as Error).message === "report_template_missing") return false; throw error; }
}
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
export async function renderReportPdfs(common: ReportCommon, entries: SavedEvaluation[]): Promise<Buffer[]> {
  const [template, regular, bold] = await Promise.all([
    readTemplate(),
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
        program: REPORT_PROGRAM, period: `${common.startDate} ~ ${common.endDate}`,
        grade: entry.student.grade, schoolClass: entry.student.schoolClass, name: entry.student.name,
        activities: common.activities, comment: entry.comment, instructor: common.instructor,
        fontRegular: `data:font/woff2;base64,${regular.toString("base64")}`,
        fontBold: `data:font/woff2;base64,${bold.toString("base64")}`,
      };
      for (const { key } of EVALUATION_FIELDS) EVALUATION_LEVELS.forEach((level, i) => { replacements[`${key}.${i}`] = entry[key] === level ? "✓" : ""; });
      const html = template.replace(/\{\{([\w.]+)\}\}/g, (_, key: string) => escape(replacements[key] || ""));
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(async () => { await document.fonts.ready; });
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
