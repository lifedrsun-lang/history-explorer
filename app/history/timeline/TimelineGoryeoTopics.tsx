import type { HistoryTimelineStudyTopic } from "@/lib/historyTimelineGoryeoTopics";
import styles from "./timeline.module.css";

/**
 * 확정 연도를 지정할 수 없는 고려의 생활·문화·제도는 시간축의 사건처럼
 * 임의 연도에 끼워 넣지 않고, 고려 시대 상단에 따로 접어 둔다.
 */
export default function TimelineGoryeoTopics({ topics }: { topics: HistoryTimelineStudyTopic[] }) {
  if (!topics.length) return null;
  const issueCount = new Set(topics.map(topic => topic.issue)).size;
  return (
    <details className={styles.goryeoTopics}>
      <summary>
        📚 고려의 생활·문화·제도 더 보기
        <span>{issueCount}개 교재 · {topics.length}개 학습 주제</span>
      </summary>
      <div className={styles.goryeoTopicsIntro}>
        날짜를 정확히 지정하기 어려운 생활·문화 내용은 사건 연표와 구분했어요.
        교재에서 배운 내용만 펼쳐서 확인해요.
      </div>
      <div className={styles.goryeoTopicGrid}>
        {topics.map(topic => (
          <details className={styles.goryeoTopicCard} key={topic.id}>
            <summary>
              <span className={styles.goryeoTopicIssue}>교재 {topic.issue}호</span>
              {topic.title}
            </summary>
            <ul>
              {topic.points.map((point, index) => <li key={index}>{point}</li>)}
            </ul>
            <small>교재 출처: {topic.pages}</small>
          </details>
        ))}
      </div>
    </details>
  );
}
