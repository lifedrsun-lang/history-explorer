"use client";

import { useState } from "react";
import type { TimelinePersonCard } from "@/lib/historyTimelinePeople";
import styles from "./timelinePeople.module.css";

export default function TimelinePersonCards({ cards }: { cards: TimelinePersonCard[] }) {
  const [opened, setOpened] = useState<string | null>(null);
  if (!cards.length) return null;

  return (
    <section className={styles.people} aria-label="관련 역사 인물">
      <strong className={styles.heading}>👤 이 사건의 인물</strong>
      <div className={styles.chips}>
        {cards.map((person) => {
          const active = opened === person.id;
          return (
            <button
              key={person.id}
              type="button"
              className={styles.chip}
              aria-expanded={active}
              onClick={() => setOpened(active ? null : person.id)}
            >
              {person.name} {active ? "▲" : "＋"}
            </button>
          );
        })}
      </div>
      {cards.filter((person) => person.id === opened).map((person) => (
        <article className={styles.card} key={person.id}>
          <div className={styles.top}>
            <div>
              <span className={styles.caption}>한국사 인물카드</span>
              <h5>{person.name}</h5>
              <span className={styles.period}>{person.era}</span>
            </div>
            <button type="button" className={styles.close} onClick={() => setOpened(null)} aria-label={`${person.name} 인물카드 닫기`}>×</button>
          </div>
          <p className={styles.intro}>{person.introduction}</p>
          {person.related.length > 0 && (
            <>
              <h6>연표에 기록된 주요 활동</h6>
              <ul className={styles.events}>
                {person.related.map((related) => (
                  <li key={related.eventId}>
                    <a href={`#timeline-event-${related.eventId}`} title="현재 표시된 연표 사건으로 이동">
                      <b>{related.dateLabel}</b> · {related.title} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          {person.topics.length > 0 && (
            <>
              <h6>교재에서 더 알아보기</h6>
              <ul className={styles.events}>
                {person.topics.map((topic) => (
                  <li key={topic.id}>
                    <a href={`#timeline-topic-${topic.id}`}>
                      <b>{topic.issue}호</b> · {topic.title} ↗
                    </a>
                    <span className={styles.sources}> ({topic.pages})</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {person.issues.length > 0 && (
            <p className={styles.sources}>📚 관련 별꼼역사 교재: {person.issues.map((issue) => `${issue}호`).join(" · ")}</p>
          )}
          {person.pages.length > 0 && (
            <p className={styles.sources}>연표 및 교재에 등록된 출처 위치: {person.pages.join(" · ")}</p>
          )}
          <p className={styles.note}>현재 열람 가능한 연표 사건과 교재 학습 주제에 연결된 내용입니다. 교재 원문 전체 인물 대조는 별도 검수 중입니다.</p>
        </article>
      ))}
    </section>
  );
}
