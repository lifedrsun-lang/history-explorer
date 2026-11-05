"use client";
import type { YongNote } from "@/lib/historyTimelineYongNotes";
import styles from "./timelineYong.module.css";

export default function TimelineYongDetails({notes=[],enabled}: {notes?:YongNote[];enabled:boolean}) {
  if(!enabled || notes.length === 0) return null;
  return <details className={styles.details}>
    <summary>📗 용선생 교과서 보충 설명 <small>{notes.length}개 주제</small></summary>
    <div className={styles.body}>
      {notes.map((note,i)=><section key={i} className={styles.topic}>
        <h5>{note.heading}</h5>
        <ul>{note.points.map((p,j)=><li key={j}>{p}</li>)}</ul>
        <small className={styles.source}>출처: 『용선생 교과서 한국사』 {note.source.volume}권 {note.source.printedPage}쪽(해당 단원)</small>
      </section>)}
    </div>
  </details>;
}