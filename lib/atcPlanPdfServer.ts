import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { atcPlanHtml } from "@/lib/atcPlans";
import type { SemesterPlan } from "@/lib/semesterPlans";

export async function renderAtcPlanPdf(plan: SemesterPlan): Promise<Buffer> {
  const [regular, bold] = await Promise.all([400, 700].map(weight =>
    readFile(path.join(process.cwd(), "public", "fonts", `noto-sans-kr-${weight}.woff2`))));
  const fontCss = `<style>@font-face{font-family:AtcNoto;src:url(data:font/woff2;base64,${regular.toString("base64")});font-weight:400}@font-face{font-family:AtcNoto;src:url(data:font/woff2;base64,${bold.toString("base64")});font-weight:700}body{font-family:AtcNoto,sans-serif}</style>`;
  const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setContent(atcPlanHtml(plan).replace("</head>", fontCss + "</head>"), { waitUntil: "load" });
    await page.evaluate(async () => { await document.fonts.ready; });
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
  } finally { await browser.close(); }
}
