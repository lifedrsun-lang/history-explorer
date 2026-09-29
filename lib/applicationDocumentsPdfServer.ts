import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

import {
  SCHOOL_DOCUMENT_DEFINITIONS,
  isApplicationDocumentKind,
  type SchoolDocumentKind,
} from "@/lib/schoolDocuments";

export type ApplicationDocumentIdentityType =
  | "resident"
  | "passport"
  | "foreign"
  | "driver";

export type ApplicationDocumentPdfInput = {
  schoolSlug: string;
  schoolName: string;
  documentDate: string;
  documentKinds: SchoolDocumentKind[];
  name: string;
  phone: string;
  birthDate: string;
  signatureDataUrl: string;
  policeStationName: string;
  residentNumber: string;
  identityType: ApplicationDocumentIdentityType;
  identityNumber: string;
};

const text = (value: unknown, max = 240) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const date = (value: unknown) => {
  const normalized = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
};

const signature = (value: unknown) => {
  const normalized = text(value, 350_000);
  if (!normalized.startsWith("data:image/png;base64,")) return "";
  return normalized;
};

export function validateApplicationDocumentPdfInput(
  value: unknown
): ApplicationDocumentPdfInput {
  const source = (value || {}) as Record<string, unknown>;
  const documentKinds = Array.isArray(source.documentKinds)
    ? Array.from(new Set(source.documentKinds.filter(isApplicationDocumentKind)))
    : [];
  const identityType = ["resident", "passport", "foreign", "driver"].includes(
    String(source.identityType || "")
  )
    ? (source.identityType as ApplicationDocumentIdentityType)
    : "resident";
  const result: ApplicationDocumentPdfInput = {
    schoolSlug: text(source.schoolSlug, 40),
    schoolName: text(source.schoolName, 160),
    documentDate: date(source.documentDate),
    documentKinds,
    name: text(source.name, 120),
    phone: text(source.phone, 40),
    birthDate: date(source.birthDate),
    signatureDataUrl: signature(source.signatureDataUrl),
    policeStationName: text(source.policeStationName, 120).replace(/경찰서장?$/, ""),
    residentNumber: text(source.residentNumber, 40),
    identityType,
    identityNumber: text(source.identityNumber, 80),
  };
  if (
    !result.schoolSlug ||
    !result.schoolName ||
    !result.documentDate ||
    result.documentKinds.length === 0 ||
    !result.name ||
    !result.phone ||
    !result.signatureDataUrl ||
    (result.documentKinds.includes("crime-consent") && !result.residentNumber) ||
    (result.documentKinds.includes("administrative-consent") &&
      !result.birthDate)
  ) {
    throw new Error("invalid_application_document_pdf");
  }
  return result;
}

const escape = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const checked = (value: boolean) => (value ? "☑" : "□");

const signatureHtml = (src: string) =>
  `<span class="signature"><span>(서명 또는 인)</span><img src="${escape(src)}" alt="서명"></span>`;

const crimeConsentHtml = (data: ApplicationDocumentPdfInput) => {
  const [year, month, day] = data.documentDate.split("-");
  return `<section class="page crime">
    <div class="legal">■ 아동ㆍ청소년의 성보호에 관한 법률 시행규칙 [별지 제10호의2서식] &lt;개정 2022. 3. 14.&gt;<span>(앞쪽)</span></div>
    <h1>성범죄 경력 및 아동학대관련범죄 전력 조회 동의서</h1>
    <table class="person"><tbody>
      <tr><th rowspan="3">대상자</th><td>성&nbsp;&nbsp;명(외국인의 경우 영문명)</td><td>${escape(data.name)}</td></tr>
      <tr><td>주민등록번호(외국인의 경우 외국인등록번호/국적)</td><td>${escape(data.residentNumber)}</td></tr>
      <tr><td>연락처(휴대전화 등)</td><td>${escape(data.phone)}</td></tr>
    </tbody></table>
    <p class="consent">본인은 <b>${escape(data.schoolName)}</b>의 취업(예정)자 또는 노무 제공(예정)자로서 「아동ㆍ청소년의 성보호에 관한 법률」 제56조 및 같은 법 시행령 제25조에 따른 성범죄 경력 조회와 「아동복지법」 제29조의3 및 같은 법 시행령 제26조의5에 따른 아동학대관련범죄 전력 조회에 동의합니다.</p>
    <div class="date">${escape(year)}년&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${Number(month)}월&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${Number(day)}일</div>
    <div class="signer"><span>동의자</span><b>${escape(data.name)}</b>${signatureHtml(data.signatureDataUrl)}</div>
    <div class="police">${data.policeStationName ? `<b>${escape(data.policeStationName)}</b>` : `<span class="blank"></span>`}<strong>경찰서장</strong><span>귀하</span></div>
    <div class="notice"><h2>유의사항</h2><ol>
      <li>개인정보 수집항목: 성명, 주민등록번호(외국인의 경우 외국인등록번호 및 국적, 외국인등록번호가 없는 경우 생년월일 및 여권번호)</li>
      <li>개인정보 제공 거부에 따른 제한사항: 개인정보 제공 동의를 거부하는 경우에는 취업에 제한을 받을 수 있습니다.</li>
      <li>개인정보의 수집ㆍ이용 목적: 수집된 개인정보는 성범죄 경력 조회 요청, 아동학대관련범죄 전력 조회 요청 등을 위하여 사용됩니다.</li>
      <li>동의자가 2명 이상일 경우에는 뒤쪽에 일괄하여 작성할 수 있습니다.</li>
    </ol></div>
    <div class="paper">210㎜×297㎜[백상지(80g/㎡) 또는 중질지(80g/㎡)]</div>
  </section>`;
};

const administrativeConsentHtml = (data: ApplicationDocumentPdfInput) => {
  const [year, month, day] = data.documentDate.split("-");
  const identityNumber =
    data.identityType === "resident" ? data.residentNumber : data.identityNumber;
  return `<section class="page admin">
    <div class="admin-legal">「행정정보 공동이용 지침」 [별지 제8호 서식]</div>
    <div class="admin-border"></div>
    <h1>행정정보 공동이용 사전동의서</h1>
    <div class="admin-content">
      <p><b>1. 이용기관 명칭 :</b> ${escape(data.schoolName)}</p>
      <p><b>2. 이용사무(이용목적) :</b> <strong>결격사유 유무 조회, 범죄경력 유무 조회</strong></p>
      <p><b>3. 공동이용 행정정보(구비서류)</b></p>
      <table><tbody><tr><th>연번</th><th>행정정보명</th><th>연번</th><th>행정정보명</th></tr><tr><td>1</td><td>결격사유 유무 조회</td><td>2</td><td>범죄경력 유무 조회</td></tr><tr><td>&nbsp;</td><td></td><td></td><td></td></tr><tr><td>&nbsp;</td><td></td><td></td><td></td></tr><tr><td>&nbsp;</td><td></td><td></td><td></td></tr></tbody></table>
      <p class="small">※ 이용기관은 본인이 동의한 위 공동이용 행정정보를 확인하기 위해「개인정보 보호법」시행령 제19조에 따라 주민등록번호, 여권번호, 운전면허의 면허번호 또는 외국인등록번호가 포함된 행정정보를 처리할 수 있습니다. 이용기관이 요청하는 경우 기재하여 주십시오.(필요시 기재사항)</p>
      <p class="identity">( ${checked(data.identityType === "resident")} 주민등록&nbsp;&nbsp;${checked(data.identityType === "passport")} 여권&nbsp;&nbsp;${checked(data.identityType === "foreign")} 외국인등록&nbsp;&nbsp;${checked(data.identityType === "driver")} 운전면허 ) 번호 : ${escape(identityNumber)}</p>
      <p><b>4. 정보주체(본인) 동의사항</b></p>
      <p>○ 본인은 위 사무의 처리를 위하여 「전자정부법」 제36조에 따른 행정정보 공동이용을 통해 이용기관의 업무처리담당자가 전자적으로 본인의 구비서류(공동이용 행정정보)를 확인하는 것에 동의합니다.</p>
      <p class="small">※ 만일, 본인이 위 행정정보 이용에 대해 동의를 하지 아니할 경우에도 불이익은 없습니다. 다만, 동의하지 아니한 경우에는 본인이 해당 구비서류를 제출하여야 합니다.</p>
    </div>
    <div class="admin-date">${escape(year)}년&nbsp;&nbsp;&nbsp;${Number(month)}월&nbsp;&nbsp;&nbsp;${Number(day)}일</div>
    <div class="admin-signer"><span>대상자&nbsp;&nbsp;&nbsp;본인</span><span>성&nbsp;&nbsp;&nbsp;&nbsp;명 :</span><b>${escape(data.name)}</b>${signatureHtml(data.signatureDataUrl)}</div>
    <div class="admin-birth"><span>생년월일 :</span><b>${escape(data.birthDate)}</b></div>
    <div class="admin-phone"><span>전화번호 :</span><b>${escape(data.phone)}</b></div>
    <div class="admin-footnote">※ 개별 법령에서 필요로 하는 동의와 별개로 행정정보 공동이용 사전동의 필요</div>
  </section>`;
};

const css = `
  @page { size: A4; margin: 0; }
  @font-face { font-family: Noto; src: url('__FONT_REGULAR__'); font-weight: 400; }
  @font-face { font-family: Noto; src: url('__FONT_BOLD__'); font-weight: 700; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #000; font-family: Batang, serif; }
  .page { width: 210mm; height: 297mm; position: relative; overflow: hidden; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .crime .legal { position:absolute; left:22mm; right:20mm; top:17mm; font-size:7.5pt; white-space:nowrap; }
  .crime .legal span { float:right; font-size:7pt; }
  .crime h1 { position:absolute; top:30mm; left:0; right:0; margin:0; text-align:center; font-size:15.8pt; }
  .person { position:absolute; left:20mm; right:20mm; top:45mm; width:170mm; height:51mm; border-collapse:collapse; font-size:8.5pt; }
  .person th,.person td { border-top:1px solid #000; border-bottom:1px solid #000; padding:2mm; }
  .person th { width:16mm; text-align:center; }
  .person td:nth-child(2) { width:84mm; }
  .person td:last-child { font-family:Noto,sans-serif; font-weight:700; font-size:9pt; }
  .consent { position:absolute; left:22mm; right:20mm; top:106mm; font-size:8.3pt; line-height:1.75; text-align:justify; }
  .consent b { font-family:Noto,sans-serif; }
  .date { position:absolute; right:31mm; top:137mm; font-size:8.5pt; }
  .signer { position:absolute; left:109mm; top:154mm; height:11mm; display:flex; align-items:center; gap:8mm; font-size:8.5pt; }
  .signer b { width:29mm; font-family:Noto,sans-serif; }
  .signature { position:relative; display:inline-block; width:34mm; height:11mm; }
  .signature>span { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; white-space:nowrap; font-size:7.8pt; color:#64748b; }
  .signature img { position:absolute; z-index:2; left:50%; top:50%; max-width:32mm; max-height:11mm; transform:translate(-50%,-50%); object-fit:contain; }
  .police { position:absolute; left:64mm; top:171.5mm; display:flex; align-items:center; font-size:8.5pt; }
  .police b,.police .blank { width:30mm; margin-right:0; text-align:right; padding-right:1.5mm; font-family:Noto,sans-serif; }
  .police .blank { height:6mm; border-bottom:1px solid #000; }
  .police strong { width:29mm; font-size:11pt; }
  .notice { position:absolute; left:20mm; right:20mm; top:229mm; font-size:6.8pt; line-height:1.45; }
  .notice h2 { margin:0; border-top:1px solid #000; border-bottom:1px solid #000; background:#b5b5b5; padding:1.5mm 3mm; text-align:center; font-size:8pt; }
  .notice ol { margin:0; border-bottom:1px solid #000; padding:2mm 7mm 2mm 12mm; }
  .paper { position:absolute; bottom:8mm; right:20mm; font-size:6.8pt; }
  .admin-legal { position:absolute; left:15mm; top:19mm; font-size:8pt; font-weight:700; }
  .admin-border { position:absolute; left:15mm; right:26mm; top:27mm; height:240mm; border:1px solid #000; }
  .admin h1 { position:absolute; left:0; right:0; top:31mm; margin:0; text-align:center; font-size:17pt; letter-spacing:.16em; }
  .admin-content { position:absolute; left:19mm; right:30mm; top:45mm; font-size:9pt; line-height:1.7; }
  .admin-content p { margin:0 0 9mm; }
  .admin-content strong { color:#1d4ed8; }
  .admin-content table { width:100%; border-collapse:collapse; text-align:center; font-size:8.2pt; margin-top:-5mm; margin-bottom:9mm; }
  .admin-content th,.admin-content td { border:1px solid #000; height:8mm; }
  .admin-content .small { font-size:8pt; line-height:1.65; margin-bottom:7mm; padding-left:3mm; }
  .admin-content .identity { text-align:center; font-size:8.5pt; margin:5mm 0 8mm; }
  .admin-date { position:absolute; right:31mm; top:230mm; font-size:8.5pt; }
  .admin-signer { position:absolute; left:43mm; top:241mm; height:12mm; display:flex; align-items:center; gap:12mm; font-size:8.5pt; }
  .admin-signer b { font-family:Noto,sans-serif; }
  .admin-birth,.admin-phone { position:absolute; left:92mm; font-size:8.5pt; }
  .admin-birth { top:251mm; } .admin-phone { top:259mm; }
  .admin-birth span,.admin-phone span { display:inline-block; width:23mm; }
  .admin-birth b,.admin-phone b { font-family:Noto,sans-serif; }
  .admin-footnote { position:absolute; left:15mm; top:271mm; color:#1d4ed8; font-size:7pt; }
`;

async function dataUri(file: string, mime: string) {
  const content = await readFile(path.join(process.cwd(), "public", file));
  return `data:${mime};base64,${content.toString("base64")}`;
}

export const applicationDocumentTitles = (data: ApplicationDocumentPdfInput) =>
  data.documentKinds.map((kind) => SCHOOL_DOCUMENT_DEFINITIONS[kind].title);

export async function renderApplicationDocumentsPdf(
  data: ApplicationDocumentPdfInput
): Promise<Buffer> {
  const [fontRegular, fontBold] = await Promise.all([
    dataUri("fonts/noto-sans-kr-400.woff2", "font/woff2"),
    dataUri("fonts/noto-sans-kr-700.woff2", "font/woff2"),
  ]);
  const styles = css
    .replace("__FONT_REGULAR__", fontRegular)
    .replace("__FONT_BOLD__", fontBold);
  const pages = [
    ...(data.documentKinds.includes("crime-consent")
      ? [crimeConsentHtml(data)]
      : []),
    ...(data.documentKinds.includes("administrative-consent")
      ? [administrativeConsentHtml(data)]
      : []),
  ].join("");
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${styles}</style></head><body>${pages}</body></html>`,
      { waitUntil: "load" }
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
