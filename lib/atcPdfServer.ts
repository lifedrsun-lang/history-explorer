import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveAtcEducatorName, resolveAtcEducatorSignature } from "@/lib/atcEducator";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import type { AtcDailyRow } from "@/app/teacher/atc-confirmations/AtcPrintSheet";
import { renderAtcPrintHtml } from "@/lib/atcPrintHtml";
import { atcPrintCss } from "@/lib/atcPrintCss";
import type { AtcMailDocument } from "@/lib/atcMailData";
import { normalizeConfirmationOutputVersion, type ConfirmationOutputVersion } from "@/lib/confirmationOutput";
const clean = (value: unknown, max = 200) => typeof value === "string" ? value.trim().slice(0, max) : "";
function aggregateRows(snapshot: FirebaseFirestore.DocumentData[]): AtcDailyRow[] {
  const dates = new Map<string, FirebaseFirestore.DocumentData[]>();
  for (const item of snapshot) {
    const date = clean(item.date, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    dates.set(date, [...(dates.get(date) || []), item]);
  }
  return [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([date, entries]) => ({
    date, sessions: entries.length,
    remarks: [...new Set(entries.map((item) => {
      const label = [clean(item.gradeClass), clean(item.lessonLabel)].filter(Boolean).join(" ");
      return label || clean(item.summary, 500).split("/").slice(1).join(" / ").trim() || clean(item.summary, 500);
    }))].join(" · "),
  }));
}

async function dataUri(file: string, mime: string) {
  const content = await readFile(path.join(process.cwd(), "public", file));
  return `data:${mime};base64,${content.toString("base64")}`;
}

export async function renderAtcPdf(doc: AtcMailDocument, outputVersionValue: ConfirmationOutputVersion = "atc"): Promise<Buffer> {
  const outputVersion = normalizeConfirmationOutputVersion(outputVersionValue);
  const { confirmation: c, profile } = doc;
  const [logo, fontRegular, fontBold] = await Promise.all([
    dataUri(outputVersion === "class4edu" ? "images/class4edu-logo.png" : "images/atc-logo.png", "image/png"),
    dataUri("fonts/noto-sans-kr-400.woff2", "font/woff2"),
    dataUri("fonts/noto-sans-kr-700.woff2", "font/woff2"),
  ]);
  const css = atcPrintCss.replace("/fonts/noto-sans-kr-400.woff2", fontRegular)
    .replace("/fonts/noto-sans-kr-700.woff2", fontBold);
  const content = renderAtcPrintHtml({
    outputVersion,
    schoolName: String(c.schoolName), yearMonth: String(c.yearMonth),
    educatorName: resolveAtcEducatorName(c, String(profile.name || "")), educatorPhone: String(profile.phone || ""),
    educatorSignatureDataUrl: resolveAtcEducatorSignature(c, String(profile.name || ""), null),
    schoolVerifierName: String(c.schoolVerifierName), schoolSignatureDataUrl: String(c.schoolSignatureDataUrl),
    schoolSignedAt: String(c.schoolSignedAt), operationPeriodStart: String(c.operationPeriodStart),
    operationPeriodEnd: String(c.operationPeriodEnd), rows: aggregateRows(c.scheduleSnapshot),
    logoSrc: logo, forPdf: true,
  });
  const browser = await puppeteer.launch({
    args: chromium.args, executablePath: await chromium.executablePath(), headless: true,
  });
  try {
    const page = await browser.newPage();
    // The browser print view receives Tailwind's border-box reset. Apply the same
    // reset here so table-cell padding cannot push the signature onto page two.
    await page.setContent(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${css}\n*, *::before, *::after { box-sizing: border-box; } body { margin: 0; }</style></head><body>${content}</body></html>`, { waitUntil: "load" });
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((img) => img.decode())); });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
