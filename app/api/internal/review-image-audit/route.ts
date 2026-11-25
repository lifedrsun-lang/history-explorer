import sharp from "sharp";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  getAssignmentBucketName,
  getSupabaseServer,
} from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 12;

const text = (value: unknown) => String(value || "").trim();
const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const escapeHtml = (value: unknown) =>
  text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

type AuditQuestion = {
  id: string;
  examLevel: string;
  examRound: number;
  examQuestionNumber: number;
  prompt: string;
  options: string[];
  imageStoragePath: string;
  imageOriginalName: string;
};

type AuditImage = AuditQuestion & {
  imageDataUrl: string;
  originalWidth: number;
  originalHeight: number;
  trimmedWidth: number;
  trimmedHeight: number;
  whitespacePercent: number;
  error: string;
};

const questionSort = (left: AuditQuestion, right: AuditQuestion) =>
  left.examLevel.localeCompare(right.examLevel, "ko") ||
  left.examRound - right.examRound ||
  left.examQuestionNumber - right.examQuestionNumber ||
  left.id.localeCompare(right.id);

const renderOption = (option: string, index: number) =>
  `<li><strong>${index + 1}.</strong> ${escapeHtml(option) || "(비어 있음)"}</li>`;

const renderCard = (item: AuditImage) => {
  const ratio = item.originalWidth > 0
    ? (item.originalHeight / item.originalWidth).toFixed(2)
    : "-";
  const warnings = [
    item.whitespacePercent >= 20 ? `흰 여백 ${item.whitespacePercent}%` : "",
    item.originalWidth > 0 && item.originalHeight / item.originalWidth >= 2.2
      ? `세로 비율 ${ratio}`
      : "",
    item.options.some((option) => !text(option)) ? "빈 선택지 있음" : "",
  ].filter(Boolean);

  return `
    <article class="card">
      <header>
        <div><strong>${escapeHtml(item.examLevel || "미분류")}</strong> · ${item.examRound || "?"}회 ${item.examQuestionNumber || "?"}번</div>
        <code>${escapeHtml(item.id)}</code>
      </header>
      ${warnings.length ? `<div class="warning">${warnings.map(escapeHtml).join(" · ")}</div>` : ""}
      ${item.error
        ? `<div class="error">${escapeHtml(item.error)}</div>`
        : `<img src="${item.imageDataUrl}" alt="${escapeHtml(item.imageOriginalName || item.id)}" />`}
      <div class="meta">원본 ${item.originalWidth}×${item.originalHeight} · 내용 ${item.trimmedWidth}×${item.trimmedHeight} · 원본 파일 ${escapeHtml(item.imageOriginalName)}</div>
      <p class="prompt">${escapeHtml(item.prompt) || "(문제 문장 없음)"}</p>
      <ol>${item.options.map(renderOption).join("")}</ol>
    </article>
  `;
};

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const page = Math.max(0, Math.floor(number(url.searchParams.get("page"))));
  const compact = url.searchParams.get("compact") === "1";
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(number(url.searchParams.get("limit")) || DEFAULT_LIMIT))
  );

  const { db } = getFirebaseAdmin();
  const snapshot = await db
    .collection(process.env.REVIEW_QUESTIONS_COLLECTION || "reviewQuestions")
    .where("questionType", "==", "exam")
    .get();

  const questions = snapshot.docs
    .map((docItem): AuditQuestion => {
      const data = docItem.data();
      return {
        id: docItem.id,
        examLevel: text(data.examLevel),
        examRound: number(data.examRound),
        examQuestionNumber: number(data.examQuestionNumber),
        prompt: text(data.prompt),
        options: Array.isArray(data.options) ? data.options.map(text) : [],
        imageStoragePath: text(data.imageStoragePath),
        imageOriginalName: text(data.imageOriginalName),
      };
    })
    .filter((item) => item.imageStoragePath)
    .sort(questionSort);

  const start = page * limit;
  const selected = questions.slice(start, start + limit);
  const bucket = getSupabaseServer().storage.from(getAssignmentBucketName());

  const audited = await Promise.all(
    selected.map(async (item): Promise<AuditImage> => {
      try {
        const { data, error } = await bucket.download(item.imageStoragePath);
        if (error || !data) {
          throw new Error(error?.message || "image_download_failed");
        }
        const source = Buffer.from(await data.arrayBuffer());
        const original = await sharp(source).rotate().metadata();
        const trimmed = await sharp(source)
          .rotate()
          .flatten({ background: "#ffffff" })
          .trim({ background: "#ffffff", threshold: 10 })
          .toBuffer({ resolveWithObject: true });
        const preview = await sharp(source)
          .rotate()
          .flatten({ background: "#ffffff" })
          .resize({
            width: compact ? 460 : 760,
            height: compact ? 360 : 1100,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 72, mozjpeg: true })
          .toBuffer();
        const originalArea = Math.max(1, number(original.width) * number(original.height));
        const trimmedArea = Math.max(1, trimmed.info.width * trimmed.info.height);
        const whitespacePercent = Math.max(
          0,
          Math.min(100, Math.round((1 - trimmedArea / originalArea) * 100))
        );
        return {
          ...item,
          imageDataUrl: `data:image/jpeg;base64,${preview.toString("base64")}`,
          originalWidth: number(original.width),
          originalHeight: number(original.height),
          trimmedWidth: trimmed.info.width,
          trimmedHeight: trimmed.info.height,
          whitespacePercent,
          error: "",
        };
      } catch (error) {
        return {
          ...item,
          imageDataUrl: "",
          originalWidth: 0,
          originalHeight: 0,
          trimmedWidth: 0,
          trimmedHeight: 0,
          whitespacePercent: 0,
          error: error instanceof Error ? error.message : "image_audit_failed",
        };
      }
    })
  );

  const totalPages = Math.max(1, Math.ceil(questions.length / limit));
  const html = `<!doctype html>
  <html lang="ko"><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>기출문제 사진 읽기 검사</title>
  <style>
    *{box-sizing:border-box} body{margin:0;background:#f4f1ff;color:#1f2937;font-family:system-ui,sans-serif}
    main{max-width:1120px;margin:auto;padding:24px}.summary{position:sticky;top:0;z-index:2;background:#fff;border:1px solid #ddd6fe;border-radius:18px;padding:16px;margin-bottom:18px;box-shadow:0 8px 24px #4c1d9515}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.card{background:#fff;border:1px solid #ddd6fe;border-radius:20px;padding:14px;box-shadow:0 8px 24px #4c1d9512}
    header{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;font-size:14px}code{font-size:10px;color:#64748b;word-break:break-all}
    img{display:block;max-width:100%;max-height:760px;width:auto;height:auto;margin:12px auto;border:1px solid #e2e8f0;background:#fff}
    .meta{font-size:11px;color:#64748b;word-break:break-all}.prompt{font-weight:800;line-height:1.55}.warning{margin-top:10px;border-radius:10px;background:#fff7ed;color:#c2410c;padding:8px;font-size:12px;font-weight:800}.error{margin:12px 0;background:#fef2f2;color:#b91c1c;padding:12px;border-radius:10px}
    ol{padding-left:24px;line-height:1.65;font-size:13px}nav{display:flex;gap:10px;margin-top:12px}a{color:#6d28d9;font-weight:800}
    body.compact main{max-width:1320px;padding:14px}body.compact .summary{padding:10px 14px;margin-bottom:12px}body.compact .summary h1{font-size:22px;margin:0 0 6px}
    body.compact .grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}body.compact .card{border-radius:14px;padding:10px}body.compact img{max-height:300px;margin:8px auto}
    body.compact .prompt{font-size:13px;margin:8px 0}body.compact ol{font-size:11px;line-height:1.4;margin:6px 0}body.compact .meta{font-size:9px}
    @media(max-width:760px){main{padding:12px}.grid{grid-template-columns:1fr}.summary{position:static}}
  </style></head><body class="${compact ? "compact" : ""}"><main>
    <section class="summary"><h1>기출문제 사진 읽기 검사</h1>
      <div>사진이 있는 기출문제 <strong>${questions.length}</strong>건 · 페이지 ${page + 1}/${totalPages} · 현재 ${audited.length}건</div>
      <nav>${page > 0 ? `<a href="?page=${page - 1}&limit=${limit}${compact ? "&compact=1" : ""}">이전</a>` : ""}${start + limit < questions.length ? `<a href="?page=${page + 1}&limit=${limit}${compact ? "&compact=1" : ""}">다음</a>` : ""}</nav>
    </section>
    <section class="grid">${audited.map(renderCard).join("")}</section>
  </main></body></html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
