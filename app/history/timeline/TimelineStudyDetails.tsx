import type { TimelineStudyNote } from "@/lib/historyTimelineStudyTypes";
import styles from "./timeline.module.css";

/** 긴 교재 요점은 펼칠 때만 읽도록 해 통합 연표의 한눈에 보는 기능을 지킨다. */
type TimelineStudyDetailsProps = {
  notes: TimelineStudyNote[];
  /**
   * 해당 호수의 심화 요점이 없을 때에는 이미 공개된 사건 설명만 펼친다.
   * 다른 호수에 연결된 교재 본문을 이 경로로 우회 공개하지 않는다.
   */
  fallback?: { heading: string; text: string };
};

export default function TimelineStudyDetails({ notes, fallback }: TimelineStudyDetailsProps) {
  if (!notes?.length) {
    if (!fallback?.text.trim()) return null;
    return (
      <details className={styles.lessonDisclosure}>
        <summary>📖 사건 핵심 더 보기</summary>
        <div className={styles.lessonList}>
          <section className={styles.lessonSection}>
            <h5>{fallback.heading}</h5>
            <p className={styles.lessonFallback}>{fallback.text}</p>
          </section>
        </div>
      </details>
    );
  }
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
