"use client";

import type { HeritagePilotNote } from "@/lib/historyTimelineGanghwaHeritagePilot";

const isPreciseAddress = (value: string) =>
  /(?:로|길)\s*\d|(?:로|길)\d|\d+번길\s*\d/.test(value) && !/일대|인근|부근/.test(value);

const displayTitle = (note: HeritagePilotNote) => {
  const museum = note.title.match(/(.+?(?:박물관|역사교육관))/)?.[1];
  return museum ? `박물관 해설 - ${museum}` : `문화유산 해설 - ${note.title}`;
};

export default function TimelineHeritageDetails({ notes }: { notes: HeritagePilotNote[] }) {
  if (!notes?.length) return null;

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
      {notes.map((note) => (
        <details key={note.id} style={{ border: "1px solid #cbd5d1", borderRadius: 12, background: "#f7faf8", overflow: "hidden" }}>
          <summary style={{ cursor: "pointer", padding: "13px 14px", fontWeight: 700, lineHeight: 1.5, overflowWrap: "anywhere" }}>
            🏛️ {displayTitle(note)}
          </summary>
          <div style={{ borderTop: "1px solid #d9e2dc", background: "#fff", padding: "14px", lineHeight: 1.7, overflowWrap: "anywhere" }}>
            <div style={{ marginBottom: 10 }}>
              <strong>장소명</strong>
              <div>{note.title}</div>
            </div>
            {isPreciseAddress(note.location) && (
              <div style={{ marginBottom: 10 }}>
                <strong>장소주소</strong>
                <div>{note.location}</div>
              </div>
            )}
            {note.publicImageUrls.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <strong>현장 사진</strong>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 8 }}>
                  {note.publicImageUrls.map((url, index) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${note.title} 현장 사진 ${index + 1} 확대 보기`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`${note.title} 현장 사진 ${index + 1}`} loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "contain", borderRadius: 8, border: "1px solid #d9e2dc" }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <strong>해설</strong>
              <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{note.explanation}</p>
            </div>
            <small style={{ color: "#52665b" }}>직접 방문하여 촬영함_{note.visitedOn}</small>
          </div>
        </details>
      ))}
    </div>
  );
}
