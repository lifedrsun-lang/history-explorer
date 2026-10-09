"use client";
import type { CSSProperties, ReactNode } from "react";
import type { MindMapBoardData, MindMapPost } from "@/lib/mindMap";
import styles from "./MindMap.module.css";
const colors = ["#e0f2fe", "#fef3c7", "#ede9fe", "#dcfce7", "#ffe4e6", "#cffafe"];
export default function MindMapBoard({ data, postActions, teacher = false }: { data: MindMapBoardData; postActions?: (post: MindMapPost) => ReactNode; teacher?: boolean }) {
  const { activity, posts, total, hiddenTotal } = data;
  return <section className={styles.board} aria-label="마인드맵 결과">
    <div className={styles.topic}><span>우리의 생각</span><h2>{activity.topic}</h2><p>전체 의견 {total}개{teacher && hiddenTotal > 0 && ` · 숨김 ${hiddenTotal}개 포함`}</p></div>
    <div className={styles.branches}>{activity.branches.map((branch, index) => <section key={branch.id} className={styles.branch} style={{ "--note-color": colors[index % colors.length] } as CSSProperties}>
      <h3>{branch.name}<span>{data.counts[branch.id] || 0}개</span></h3>
      <div className={styles.notes}>{posts.filter(p => p.branchId === branch.id).map(post => <article key={post.id} className={`${styles.note} ${post.hidden ? styles.hidden : ""}`}>
        <div className={styles.author}>{post.studentName}{post.hidden && <span>숨김</span>}</div>
        {post.title && <h4>{post.title}</h4>}<p>{post.content}</p>
        <time dateTime={new Date(post.createdAt).toISOString()}>{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(post.createdAt)}</time>
        {postActions && <div className={`${styles.actions} ${styles.noPrint}`}>{postActions(post)}</div>}
      </article>)}</div>
      {!posts.some(p => p.branchId === branch.id) && <p className={styles.empty}>아직 의견이 없어요.</p>}
    </section>)}</div>
  </section>;
}
