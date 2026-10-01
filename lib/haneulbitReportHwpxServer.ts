import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { EVALUATION_FIELDS, EVALUATION_LEVELS, REPORT_PROGRAM, type ReportCommon, type SavedEvaluation } from "@/lib/haneulbitReports";
import { makeReportZip } from "@/lib/reportZip";

type HwpxTemplate = { sectionOpen: string; firstParagraph: string; nextParagraph: string; files: { name: string; base64: string }[] };
const escapeXml = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const textXml = (value: string) => value.replaceAll("\r\n", "\n").split("\n").map(escapeXml).join("<hp:lineBreak/>");

export async function renderReportHwpx(common: ReportCommon, entries: SavedEvaluation[]): Promise<Buffer> {
  if (!entries.length || entries.length > 400) throw new Error("report_incomplete");
  const newer = common.year > 2026 || (common.year === 2026 && common.quarter >= 3);
  const filename = newer ? "result-report-2026-q3.hwpx.json" : "result-report.hwpx.json";
  let template: HwpxTemplate;
  try { template = JSON.parse(await readFile(path.join(process.cwd(), "templates/haneulbit", filename), "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("report_template_missing"); throw error; }
  const [sy, sm, sd] = common.startDate.split("-").map(Number);
  const [ey, em, ed] = common.endDate.split("-").map(Number);
  const activities = common.activities.replaceAll("\r\n", "\n").split("\n");
  // Twelve weekly lines map in row order. Additional lines are retained in the last cell.
  const activityCells = Array.from({ length: 12 }, (_, i) => i === 11 ? activities.slice(11).join("\n") : activities[i] || "");
  let objectId = 1900000000, paragraphId = 0;
  const paragraphs = entries.map((entry, index) => {
    const fields: Record<string, string> = {
      program: REPORT_PROGRAM, quarter: String(common.quarter), instructor: common.instructor,
      period: `${sy}년 ${sm}월 ${sd}일 ~ ${sy === ey ? "" : `${ey}년 `}${em}월 ${ed}일`,
      identity: `(${entry.student.grade.replace(/학년\s*$/, "").trim()}) 학년 (${entry.student.schoolClass.replace(/반\s*$/, "").trim()}) 반     이름 (${entry.student.name})`,
      comment: entry.comment,
    };
    activityCells.forEach((value, i) => { fields[`activity.${i}`] = value; });
    EVALUATION_FIELDS.forEach(({ key }) => EVALUATION_LEVELS.forEach((level, i) => { fields[`${key}.${i}`] = entry[key] === level ? "○" : ""; }));
    return (index ? template.nextParagraph : template.firstParagraph)
      .replace(/\{\{([\w.]+)\}\}/g, (_, token: string) => {
        if (!Object.hasOwn(fields, token)) throw new Error("report_template_missing");
        return textXml(fields[token]);
      })
      .replace(/(<hp:p\b[^>]*\bid=")[^"]*/g, (_, prefix: string) => `${prefix}${paragraphId++}`)
      .replace(/(<hp:(?:tbl|pic)\b[^>]*\bid=")[^"]*/g, (_, prefix: string) => `${prefix}${objectId++}`);
  });
  const files = template.files.map((file) => ({ name: file.name, data: Buffer.from(file.base64, "base64") }));
  // HWPX is an XML document package; mimetype must be its first, uncompressed entry.
  files.sort((a, b) => Number(b.name === "mimetype") - Number(a.name === "mimetype"));
  files.push({ name: "Contents/section0.xml", data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${template.sectionOpen}${paragraphs.join("")}</hs:sec>`) });
  files.push({ name: "Preview/PrvText.txt", data: Buffer.from(entries.map((entry) => `${REPORT_PROGRAM}\n${entry.student.name}\n${common.activities}\n${entry.comment}`).join("\n\n")) });
  return makeReportZip(files);
}
