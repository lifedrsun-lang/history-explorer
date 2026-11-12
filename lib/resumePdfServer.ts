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
  const groupTable = (section: typeof RESUME_SECTIONS[number]) => {
    const rows = resume[section.key];
    if (!rows.length) return "";
    return `<table class="group"><thead><tr><th class="sectionhead" colspan="3">${escapeHtml(section.label)}</th></tr>
      <tr><th class="period">기간·취득일</th><th>${escapeHtml(section.first)}</th><th class="issuer">${escapeHtml(section.second)}</th></tr></thead>
      <tbody>${rows.map(row => `<tr><td>${cell(row.period)}</td><td>${cell(row.title)}</td><td>${cell(row.detail)}</td></tr>`).join("")}</tbody></table>`;
  };

  // 원본 이력서의 논리적 구성을 따라 인적사항·경력과
  // 교육·연수·자격사항을 서로 다른 인쇄 페이지에서 시작합니다.
  // 항목이 늘어나면 Chromium이 추가 페이지로 자연스럽게 분할합니다.
  const firstGroups = RESUME_SECTIONS.filter(section =>
    section.key === "education" || section.key === "experience"
  ).map(groupTable).join("");
  const secondGroups = RESUME_SECTIONS.filter(section =>
    section.key === "training" || section.key === "certificates"
  ).map(groupTable).join("");
  const secondPage = firstGroups && secondGroups
    ? `<section class="second-page"><div class="continued">
        <span>${escapeHtml(resume.headline)}</span>
        <span>${escapeHtml(resume.name)}</span>
      </div>${secondGroups}</section>`
    : secondGroups;
  const groups = firstGroups + secondPage;
  const photo = resume.photoDataUrl
    ? `<img class="photo" alt="증명사진" src="${escapeHtml(resume.photoDataUrl)}" />`
    : `<div class="photo-placeholder">사진</div>`;
  const css = `
    ${faces}
    @page{size:A4;margin:12mm 13mm 13mm}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;color:#111;font-family:Korean,sans-serif;font-size:8.5pt;line-height:1.3}
    h1{text-align:center;font-size:17pt;margin:3mm 0 6mm;font-weight:700;letter-spacing:.025em}
    .sub{text-align:right;color:#555;font-size:8pt;margin:-4mm 0 4mm}
    table{border-collapse:collapse;width:100%;table-layout:fixed}
    th,td{border:1px solid #444;padding:2mm 2.4mm;vertical-align:middle;white-space:pre-wrap;overflow-wrap:anywhere}
    th{font-weight:700;text-align:center}
    .identity-wrap{display:grid;grid-template-columns:minmax(0,1fr) 29mm;gap:3mm;margin-bottom:6mm;align-items:start}
    .identity{height:35mm;margin:0}
    .identity tr{height:11.66mm}
    .identity th{width:14%;white-space:nowrap;padding:1mm}
    .identity td{width:36%;font-size:8.4pt;padding:1mm 2.2mm}
    .identity .address td{text-align:left}
    .photo,.photo-placeholder{display:block;width:29mm;height:35mm;object-fit:cover;border:1px solid #444}
    .photo-placeholder{display:flex;align-items:center;justify-content:center;color:#999}
    .group{margin:0 0 5mm;break-inside:avoid;page-break-inside:avoid}
    .group th.sectionhead{background:#f1f3f5;border-bottom:1px solid #444;padding:2.5mm 2mm;font-size:9.5pt}
    .group th.period{width:18%}.group th.issuer{width:26%}
    .group th{background:#fafafa;padding:2mm;font-size:8.4pt}
    .group td{line-height:1.34}
    .group tr{break-inside:avoid;page-break-inside:avoid}
    .group thead{display:table-header-group}
    .second-page{break-before:page;page-break-before:always}
    .continued{display:flex;justify-content:space-between;gap:6mm;color:#555;font-size:8.1pt;margin:0 0 5mm;padding:0 0 2mm;border-bottom:1px solid #ddd}
    .intro{margin:4mm 0 5mm;padding:3mm;border:1px solid #444;white-space:pre-wrap;line-height:1.5;break-inside:avoid}
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
