"use client";
import type { HistoryReferenceNote } from "@/lib/historyTimelinePhaseTwoReadingNotes";
import styles from "./timelineYong.module.css";

type Props={notes?: HistoryReferenceNote[]; showRobin:boolean; showReading:boolean; showElementary:boolean};
/** 출처가 로빈/읽기책/별별 초등인 보충 설명: 참고문헌별 표시 설정을 따른다. */
export default function TimelineReferenceNotes({notes=[],showRobin,showReading,showElementary}:Props){
  const visible=notes.filter(note=>note.referenceGroup==="robin" ? showRobin : note.referenceGroup==="reading" ? showReading : showElementary);
  if(!visible.length)return null;
  return <details className={styles.details}>
    <summary>📚 참고문헌 보충 설명 <small>{visible.length}개 주제</small></summary>
    <div className={styles.body}>
      {visible.map((note,i)=><section className={styles.topic} key={`${note.referenceGroup}-${i}`}>
        <h5>{note.heading}</h5>
        <ul>{note.points.map((p,j)=><li key={j}>{p}</li>)}</ul>
        <small className={styles.source}>출처: 『{note.source.book}』 PDF {note.source.pdfPage}쪽</small>
      </section>)}
    </div>
  </details>;
}
