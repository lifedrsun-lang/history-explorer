"use client";

import type { HeritagePilotNote } from "@/lib/historyTimelineGanghwaHeritagePilot";

export default function TimelineHeritageDetails({ notes }: { notes: HeritagePilotNote[] }) {
  if (!notes?.length) return null;
  return (
    <details style={{ marginTop: 12, border: "1px solid #d5d9df", borderRadius: 8, padding: "10px 12px" }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>🏛️ 박물관·문화유산 해설 ({notes.length})</summary>
      {notes.map((note) => (
        <section key={note.id} style={{ marginTop: 12, lineHeight: 1.7 }}>
          <strong>{note.title}</strong>
          <p style={{ margin: "6px 0" }}>{note.explanation}</p>
          <small>탐방일: {note.visitedOn} · 장소: {note.location}</small>
          <br />
          <small>출처: {note.source}</small>
        </section>
      ))}
    </details>
  );
}
