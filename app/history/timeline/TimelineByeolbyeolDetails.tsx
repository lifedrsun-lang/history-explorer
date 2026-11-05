"use client";

import type { ByeolbyeolLevel, ByeolbyeolNote } from "@/lib/historyTimelineByeolbyeolTypes";
import styles from "./timelineByeolbyeol.module.css";

type Props = {
  notes?: ByeolbyeolNote[];
  enabledLevels: readonly ByeolbyeolLevel[];
};

/** 기존 '교재 핵심 더 보기'와 별도의 접이식 학습 영역. */
export default function TimelineByeolbyeolDetails({ notes = [], enabledLevels }: Props) {
  const enabled = new Set(enabledLevels);
  const visible = notes.filter(note => enabled.has(note.level));
  if (visible.length === 0) return null;

  return (
    <details className={styles.disclosure}>
      <summary>⭐ 별별한국사 보충 설명 <span>{visible.length}개 주제</span></summary>
      <div className={styles.content}>
        {visible.map((note, i) => (
          <section className={styles.section} key={`${note.level}-${i}`}>
            <span className={styles.badge}>{note.level === "basic" ? "기본" : "심화"}</span>
            <h5>{note.heading}</h5>
            <ul>{note.points.map((point, index) => <li key={index}>{point}</li>)}</ul>
          </section>
        ))}
      </div>
    </details>
  );
}
