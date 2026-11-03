import type { TimelineStudyNote } from "@/lib/historyTimelineStudyTypes";
import styles from "./timeline.module.css";

/** 긴 교재 요점은 펼칠 때만 읽도록 해 통합 연표의 한눈에 보는 기능을 지킨다. */
export default function TimelineStudyDetails({ notes }: { notes: TimelineStudyNote[] }) {
  if (!notes?.length) return null;
  const total = notes.reduce((sum, note) => sum + note.points.length, 0);
  return (
    <details className={styles.lessonDisclosure}>
      <summary>📖 교재 핵심 더 보기 <span>{notes.length}개 주제 · {total}개 핵심</span></summary>
      <div className={styles.lessonList}>
        {notes.map((note, index) => (
          <section key={`${note.issue}-${index}`} className={styles.lessonSection}>
            <div className={styles.lessonSource}>
              {note.kind === "supplement" ? "역사 흐름 보충" : `교재 ${note.issue}호`}
            </div>
            <h5>{note.heading}</h5>
            <ul>
              {note.points.map((point, pointIndex) => <li key={pointIndex}>{point}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
