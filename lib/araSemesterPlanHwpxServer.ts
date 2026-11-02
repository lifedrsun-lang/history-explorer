import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { araDocumentTitle, araLearningGoal, araPeriod, araWeekRows, type AraPlanKind } from "@/lib/araSemesterPlans";
import type { SemesterPlan } from "@/lib/semesterPlans";
import { makeReportZip } from "@/lib/reportZip";

type HwpxBase = {
  sectionOpen: string;
  firstParagraph: string;
  files: { name: string; base64: string }[];
};

const xml = (value: string) => value
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const lines = (value: string) => value.replaceAll("\r\n", "\n").split("\n").map(xml).join("<hp:lineBreak/>");

function cell(value: string, col: number, row: number, width: number, height: number, heading = false) {
  const fill = heading ? 4 : 11;
  const format = heading ? 7 : 14;
  return `<hp:tc name="" header="${heading ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${fill}">
    <hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">
      <hp:p id="2147483648" paraPrIDRef="13" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
        <hp:run charPrIDRef="${format}"><hp:t>${lines(value)}</hp:t></hp:run>
      </hp:p>
    </hp:subList>
    <hp:cellAddr colAddr="${col}" rowAddr="${row}"/><hp:cellSpan colSpan="1" rowSpan="1"/>
    <hp:cellSz width="${width}" height="${height}"/><hp:cellMargin left="141" right="141" top="141" bottom="141"/>
  </hp:tc>`;
}

function table(id: number, widths: number[], rows: { values: string[]; heading?: boolean; height?: number }[]) {
  const width = widths.reduce((sum, value) => sum + value, 0);
  const height = rows.reduce((sum, row) => sum + (row.height || 3000), 0);
  const body = rows.map((row, rowIndex) =>
    `<hp:tr>${row.values.map((value, colIndex) =>
      cell(value, colIndex, rowIndex, widths[colIndex], row.height || 3000, row.heading)
    ).join("")}</hp:tr>`).join("");
  return `<hp:tbl id="${id}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM"
    textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1"
    rowCnt="${rows.length}" colCnt="${widths.length}" cellSpacing="0" borderFillIDRef="3" noAdjust="1">
    <hp:sz width="${width}" widthRelTo="ABSOLUTE" height="${height}" heightRelTo="ABSOLUTE" protect="0"/>
    <hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0"
      vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>
    <hp:outMargin left="141" right="141" top="141" bottom="141"/>
    <hp:inMargin left="138" right="138" top="138" bottom="138"/>
    ${body}
  </hp:tbl>`;
}

function paragraph(id: number, content: string, asTable = false) {
  return `<hp:p id="${id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="1">${asTable ? content + "<hp:t/>" : `<hp:t>${lines(content)}</hp:t>`}</hp:run>
  </hp:p>`;
}

export async function renderAraSemesterHwpx(
  plan: Omit<SemesterPlan, "id" | "revision" | "updated_at">,
  kind: AraPlanKind,
): Promise<Buffer> {
  const weeks = araWeekRows(plan); // Reject overflow instead of silently discarding weeks.
  const base: HwpxBase = JSON.parse(await readFile(
    path.join(process.cwd(), "templates/haneulbit/result-report.hwpx.json"), "utf8",
  ));
  // Reuse the existing valid HWPX package's page setup and styles; replace the report body.
  const tableStart = base.firstParagraph.indexOf("<hp:tbl");
  if (tableStart === -1) throw new Error("ara_template_unavailable");
  const first = base.firstParagraph.slice(0, tableStart) + `<hp:t>${lines(araDocumentTitle(plan, kind))}</hp:t></hp:run></hp:p>`;

  const approvals = table(1900100001, [11000, 13000, 13000, 13168], [
    { values: ["결재", "늘봄실무사", "교감", "교장"], heading: true, height: 3500 },
  ]);
  const details = table(1900100002, [10000, 40168], [
    { values: ["프로그램명", plan.program] },
    { values: ["지도교사", plan.instructor] },
    { values: ["대상학년", plan.target] },
    { values: ["지도시수", plan.instruction_hours?.trim() || "미입력"] },
    { values: ["지도기간", araPeriod(plan)] },
    { values: ["학습목표", araLearningGoal(plan)], height: 6500 },
  ]);
  const weekly = table(1900100003, [4000, 37168, 9000], [
    { values: ["주", "주 제  및  학 습  내 용", "비  고"], heading: true, height: 3300 },
    ...weeks.map(row => ({
      values: [String(row.week), row.content, row.notes],
      height: 4000,
    })),
  ]);
  const section = [
    first,
    paragraph(1, approvals, true),
    paragraph(2, details, true),
    paragraph(3, "주별 지도계획"),
    paragraph(4, weekly, true),
  ].join("");
  const files = base.files.map(file => ({ name: file.name, data: Buffer.from(file.base64, "base64") }));
  files.sort((a, b) => Number(b.name === "mimetype") - Number(a.name === "mimetype"));
  files.push({
    name: "Contents/section0.xml",
    data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${base.sectionOpen}${section}</hs:sec>`),
  });
  files.push({
    name: "Preview/PrvText.txt",
    data: Buffer.from([araDocumentTitle(plan, kind), plan.program, plan.instructor, araPeriod(plan),
      araLearningGoal(plan), ...weeks.map(row => `${row.week}주 ${row.content} ${row.notes}`)].join("\n")),
  });
  return makeReportZip(files);
}
