import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { RESUME_SECTIONS, type ResumeData } from "@/lib/resumes";

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const cell = (value: string) => escapeHtml(value).replace(/\n/g, "<br>");

export async function renderResumePdf(resume: ResumeData, target: string, date: string): Promise<Buffer> {
  const fontFiles = await Promise.all([
    readFile(path.join(process.cwd(), "public/fonts/noto-sans-kr-400.woff2")),
    readFile(path.join(process.cwd(), "public/fonts/noto-sans-kr-700.woff2")),
  ]);
  const faces = fontFiles.map((font, index) =>
    `@font-face{font-family:Korean;src:url(data:font/woff2;base64,${font.toString("base64")}) format("woff2");font-weight:${index ? 700 : 400};}`
  ).join("");
  const details = [
    ["성명", resume.name, "생년월일", resume.birthDate],
    ["연락처", resume.phone, "E-mail", resume.email],
  ];
  const info = details.map(row => `<tr><th>${row[0]}</th><td>${cell(row[1])}</td><th>${row[2]}</th><td>${cell(row[3])}</td></tr>`).join("");
  const groups = RESUME_SECTIONS.map(section => {
    const rows = resume[section.key];
    if (!rows.length) return "";
    return `<table class="group"><thead><tr><th class="sectionhead" colspan="3">${escapeHtml(section.label)}</th></tr>
      <tr><th class="period">기간·취득일</th><th>${escapeHtml(section.first)}</th><th class="issuer">${escapeHtml(section.second)}</th></tr></thead>
      <tbody>${rows.map(row => `<tr><td>${cell(row.period)}</td><td>${cell(row.title)}</td><td>${cell(row.detail)}</td></tr>`).join("")}</tbody></table>`;
  }).join("");
  const photo = resume.photoDataUrl
    ? `<img class="photo" alt="증명사진" src="${escapeHtml(resume.photoDataUrl)}" />`
    : `<div class="photo-placeholder">사진</div>`;
  const css = `
    ${faces}
    @page{size:A4;margin:13mm 13mm 15mm}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;color:#111;font-family:Korean,sans-serif;font-size:9pt}
    h1{text-align:center;font-size:18pt;margin:5mm 0 7mm;font-weight:700;letter-spacing:.04em}
    .sub{text-align:right;color:#666;font-size:8pt;margin:-5mm 0 4mm}
    table{border-collapse:collapse;width:100%;table-layout:fixed}
    th,td{border:1px solid #333;padding:3px 6px;vertical-align:middle;white-space:pre-wrap;overflow-wrap:anywhere}
    th{font-weight:700;text-align:center}
    .identity{width:100%;margin-bottom:5mm}
    .identity th{width:13%}
    .identity td{width:37%}
    .identity .address td{text-align:left}
    .identity-wrap{display:grid;grid-template-columns:1fr 28mm;gap:4mm;align-items:stretch}
    .photo,.photo-placeholder{width:28mm;height:37mm;object-fit:cover;border:1px solid #555}
    .photo-placeholder{display:flex;align-items:center;justify-content:center;color:#aaa}
    .group{margin:0 0 5.5mm}
    .group th.sectionhead{background:#f4f4f4;border-bottom:1px solid #333;padding:4px 8px;font-size:10pt}
    .group th.period{width:18%}.group th.issuer{width:25%}
    .group th{background:#fafafa}
    .group tr{break-inside:avoid;page-break-inside:avoid}
    .group thead{display:table-header-group}
    .intro{margin:4mm 0 6mm;padding:3mm;border:1px solid #444;white-space:pre-wrap;line-height:1.6}
    .intro strong{display:block;margin-bottom:1mm}
    .signoff{margin:6mm 0 1mm;text-align:right;break-inside:avoid}
    .signoff p{margin:2mm 0}
  `;
  const address = `<table class="identity"><tbody>${info}
    <tr class="address"><th>주소</th><td colspan="3">${cell(resume.address)}</td></tr></tbody></table>`;
  const introduction = resume.introduction
    ? `<section class="intro"><strong>주요 활동 및 자기소개</strong>${cell(resume.introduction)}</section>`
    : "";
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${css}</style></head><body>
    <h1>${escapeHtml(resume.headline)}</h1>
    ${target ? `<p class="sub">제출처: ${escapeHtml(target)}</p>` : ""}
    <div class="identity-wrap"><div>${address}</div>${photo}</div>
    ${groups}${introduction}
    <div class="signoff"><p>위 기재 내용에 허위사실이 없음을 확인합니다.</p>
    <p>${escapeHtml(date)} &nbsp; ${escapeHtml(resume.name)} (인)</p></div>
    </body></html>`;
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode()));
    });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
