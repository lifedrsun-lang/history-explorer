"use client";

import { useState } from "react";
import type { HeritagePilotNote } from "@/lib/historyTimelineGanghwaHeritagePilot";

const isPreciseAddress = (value: string) =>
  /(?:로|길)\s*\d|(?:로|길)\d|\d+번길\s*\d/.test(value) && !/일대|인근|부근/.test(value);

const groupName = (note: HeritagePilotNote) => {
  if (note.title.startsWith("처인성역사교육관 - ")) return "처인성역사교육관";
  return note.title;
};
const topicName = (note: HeritagePilotNote) =>
  note.title.startsWith("처인성역사교육관 - ")
    ? note.title.slice("처인성역사교육관 - ".length)
    : note.title;

function HeritageGroup({ name, notes }: { name: string; notes: HeritagePilotNote[] }) {
  const [selected, setSelected] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const note = notes[selected] ?? notes[0];
  const museum = name.includes("교육관") || name.includes("박물관");
  return (
    <details style={{ border: "1px solid #cbd5d1", borderRadius: 12, background: "#f7faf8", overflow: "hidden" }}>
      <summary style={{ cursor: "pointer", padding: "13px 14px", fontWeight: 700, lineHeight: 1.5, overflowWrap: "anywhere" }}>
        🏛️ {museum ? "박물관" : "문화유산"} 해설 - {name}
        {notes.length > 1 ? ` · ${notes.length}개 주제` : ""}
      </summary>
      <div style={{ borderTop: "1px solid #d9e2dc", background: "#fff", padding: 14, lineHeight: 1.7, overflowWrap: "anywhere" }}>
        {notes.length > 1 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 8, marginBottom: 14 }}>
            {notes.map((item, index) => (
              <button key={item.id} type="button" aria-pressed={selected === index}
                onClick={() => { setSelected(index); setShowDetails(false); }}
                style={{ border: selected === index ? "2px solid #3b7761" : "1px solid #cbd5d1", borderRadius: 10, background: selected === index ? "#eaf5ef" : "#fff", padding: "11px 9px", color: "#243e34", fontWeight: selected === index ? 700 : 500, cursor: "pointer", textAlign: "center" }}>
                {topicName(item)}
              </button>
            ))}
          </div>
        )}
        <div style={{ borderRadius: 10, background: "#f1f7f3", padding: 12 }}>
          <strong>{topicName(note)}</strong>
          <div style={{ fontSize: 12, color: "#52665b", marginTop: 8 }}>어린이 해설</div>
          <p style={{ margin: "5px 0 0", whiteSpace: "pre-wrap" }}>{note.explanation}</p>
          <button type="button" aria-expanded={showDetails} onClick={() => setShowDetails(!showDetails)}
            style={{ marginTop: 12, width: "100%", background: "#fff", border: "1px solid #a9bfb2", borderRadius: 8, padding: 10, fontWeight: 700, cursor: "pointer" }}>
            {showDetails ? "상세 정보 접기 ▲" : "상세 정보 펼치기 ▼"}
          </button>
          {showDetails && (
            <div style={{ background: "#fff", border: "1px solid #d9e2dc", borderRadius: 8, padding: 12, marginTop: 8 }}>
              <div><strong>장소명</strong><div>{name}</div></div>
              {isPreciseAddress(note.location) && <div style={{ marginTop: 8 }}><strong>장소주소</strong><div>{note.location}</div></div>}
              <div style={{ marginTop: 8 }}><strong>자료 출처</strong><div>{note.source}</div></div>
              <p style={{ fontSize: 12, color: "#52665b", margin: "10px 0 0" }}>
                현재 등록된 해설은 현장 안내문을 요약한 내용입니다. 안내문 전체를 대조한 상세 해설은 아직 제공되지 않습니다.
              </p>
            </div>
          )}
        </div>
        <small style={{ display: "block", color: "#52665b", marginTop: 12 }}>직접 방문하여 촬영함_{note.visitedOn}</small>
      </div>
    </details>
  );
}

export default function TimelineHeritageDetails({ notes }: { notes: HeritagePilotNote[] }) {
  if (!notes?.length) return null;
  const grouped = new Map<string, HeritagePilotNote[]>();
  for (const note of notes) {
    const name = groupName(note);
    grouped.set(name, [...(grouped.get(name) ?? []), note]);
  }
  return (
    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
      {Array.from(grouped.entries()).map(([name, items]) => (
        <HeritageGroup key={name} name={name} notes={items} />
      ))}
    </div>
  );
}
