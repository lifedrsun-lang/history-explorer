"use client";

import { useState } from "react";
import type { HeritagePilotNote } from "@/lib/historyTimelineGanghwaHeritagePilot";

const isPreciseAddress = (value: string) =>
  /(?:로|길)\s*\d|(?:로|길)\d|\d+번길\s*\d/.test(value) && !/일대|인근|부근/.test(value);

const museumName = (title: string) => title.match(/^(.+?(?:박물관|역사교육관)) - /)?.[1];

const groupName = (note: HeritagePilotNote) => museumName(note.title) ?? note.title;
const topicName = (note: HeritagePilotNote) => {
  const museum = museumName(note.title);
  return museum ? note.title.slice(museum.length + 3) : note.title;
};

function HeritageGroup({ name, notes }: { name: string; notes: HeritagePilotNote[] }) {
  const [selected, setSelected] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const note = notes[selected] ?? notes[0];
  const isMuseum = /박물관|역사교육관/.test(name);

  return (
    <details style={{ border: "1px solid #cbd5d1", borderRadius: 12, background: "#f7faf8", overflow: "hidden" }}>
      <summary style={{ cursor: "pointer", padding: "13px 14px", fontWeight: 700, lineHeight: 1.5, overflowWrap: "anywhere" }}>
        🏛️ {isMuseum ? "박물관" : "문화유산"} 해설 - {name}
        {notes.length > 1 ? <span style={{ marginLeft: 6, color: "#52665b", fontSize: 12 }}>({notes.length}개 주제)</span> : null}
      </summary>
      <div style={{ borderTop: "1px solid #d9e2dc", background: "#fff", padding: 14, lineHeight: 1.7, overflowWrap: "anywhere" }}>
        {notes.length > 1 && (
          <div style={{ marginBottom: 14 }}>
            <strong style={{ display: "block", marginBottom: 8 }}>주제 선택</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 8 }}>
              {notes.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected === index}
                  onClick={() => {
                    setSelected(index);
                    setShowDetails(false);
                  }}
                  style={{
                    border: selected === index ? "2px solid #3b7761" : "1px solid #cbd5d1",
                    borderRadius: 10,
                    background: selected === index ? "#eaf5ef" : "#fff",
                    color: "#243e34",
                    padding: "11px 9px",
                    fontWeight: selected === index ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "center",
                    overflowWrap: "anywhere",
                  }}
                >
                  {topicName(item)}
                </button>
              ))}
            </div>
          </div>
        )}
        <section aria-label={topicName(note)} style={{ border: "1px solid #d9e2dc", borderRadius: 10, background: "#f1f7f3", padding: 12 }}>
          <strong>{topicName(note)}</strong>
          <div style={{ fontSize: 12, color: "#52665b", marginTop: 8 }}>어린이 해설</div>
          <p style={{ margin: "5px 0 0", whiteSpace: "pre-wrap" }}>{note.easyExplanation ?? note.explanation}</p>
          {note.publicImageUrls.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>관련 사진</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 8 }}>
                {note.publicImageUrls.map((url, index) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={topicName(note) + " 사진 " + (index + 1) + " 확대 보기"}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={topicName(note) + " 관련 사진 " + (index + 1)} loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "contain", borderRadius: 8, border: "1px solid #d9e2dc" }} />
                  </a>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            aria-expanded={showDetails}
            onClick={() => setShowDetails((value) => !value)}
            style={{ marginTop: 12, width: "100%", background: "#fff", border: "1px solid #a9bfb2", borderRadius: 8, padding: 10, fontWeight: 700, cursor: "pointer", color: "#243e34" }}
          >
            {showDetails ? "상세 해설 접기 ▲" : "상세 해설 보기 ▼"}
          </button>
          {showDetails && (
            <div style={{ background: "#fff", border: "1px solid #d9e2dc", borderRadius: 8, padding: 12, marginTop: 8 }}>
              {note.easyExplanation ? (
                <>
                  <strong>현장 해설 정리본</strong>
                  <p style={{ margin: "6px 0 12px", whiteSpace: "pre-wrap" }}>{note.explanation}</p>
                </>
              ) : (
                <p style={{ margin: "0 0 12px", color: "#52665b" }}>현장 안내문을 자세히 대조한 해설은 아직 준비 중입니다. 현재 어린이 해설은 요약본입니다.</p>
              )}
              <div><strong>장소명</strong><div>{name}</div></div>
              {isPreciseAddress(note.location) && (
                <div style={{ marginTop: 8 }}><strong>장소주소</strong><div>{note.location}</div></div>
              )}
              <div style={{ marginTop: 8 }}><strong>자료 출처</strong><div>{note.source}</div></div>
              <small style={{ display: "block", color: "#52665b", marginTop: 8 }}>
                현장 안내문에 근거한 정리본으로, 안내판 원문을 그대로 옮긴 내용은 아닙니다.
              </small>
            </div>
          )}
        </section>
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
