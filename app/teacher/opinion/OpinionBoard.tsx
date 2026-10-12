"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { Opinion } from "@/lib/opinions";
import { placeOpinions, PlacedOpinion, Rect } from "@/lib/opinionLayout";
import styles from "@/app/opinion/opinion.module.css";

export default function OpinionBoard({topic,opinions,onSelect,listMode,onFallback}: {
  topic:string; opinions:Opinion[]; onSelect:(opinion:Opinion)=>void; listMode:boolean; onFallback:(fallback:boolean)=>void;
}) {
  const boardRef=useRef<HTMLDivElement>(null);
  const centreRef=useRef<HTMLDivElement>(null);
  const measureRef=useRef<HTMLDivElement>(null);
  const previous=useRef<PlacedOpinion[]>([]);
  const [layout,setLayout]=useState<{positions:PlacedOpinion[];font:number;width:number;fallback:boolean}>({positions:[],font:22,width:240,fallback:false});
  useLayoutEffect(()=>{
    const board=boardRef.current, centre=centreRef.current, measure=measureRef.current;
    if(!board || !centre || !measure) return;
    function compute() {
      if(!board || !centre || !measure) return;
      const w=board.clientWidth,h=board.clientHeight;
      if(!w || !h) return;
      const box=board.getBoundingClientRect(),c=centre.getBoundingClientRect();
      const obstacle:Rect={x:c.left-box.left,y:c.top-box.top,width:c.width,height:c.height};
      let result:PlacedOpinion[]|null=null;
      let chosenFont=22,chosenWidth=240;
      const sizes=w>=1200?[26,24,22,20,18,16]:[22,20,18,16,14];
      for(const font of sizes) {
        const cardWidth=Math.floor(Math.max(120,Math.min(310,w/(opinions.length<=8?4.2:5.5))));
        measure.style.setProperty("--opinion-font",`${font}px`);
        measure.style.setProperty("--opinion-width",`${cardWidth}px`);
        const measured=Array.from(measure.children).map(node=>{
          const element=node as HTMLElement;
          return {id:element.dataset.id!,width:Math.ceil(element.getBoundingClientRect().width),height:Math.ceil(element.getBoundingClientRect().height)};
        });
        result=placeOpinions(w,h,obstacle,measured,previous.current,opinions.length>16?8:14);
        if(result) {chosenFont=font;chosenWidth=cardWidth;break;}
      }
      previous.current=result || [];
      const fallback=result===null;
      setLayout({positions:result || [],font:chosenFont,width:chosenWidth,fallback});
      onFallback(fallback);
    }
    compute();
    const observer=new ResizeObserver(compute);
    observer.observe(board);observer.observe(centre);
    let mounted=true;
    void document.fonts.ready.then(()=>{if(mounted) compute();});
    return ()=>{mounted=false;observer.disconnect();};
  },[topic,opinions,onFallback,listMode]);
  const byId=new Map(opinions.map(o=>[o.id,o]));
  return <>
    <div className={styles.board} ref={boardRef} data-testid="opinion-board" style={listMode?{display:"none"}:undefined}>
      <div ref={centreRef} className={styles.centre} data-testid="opinion-topic"><span>우리의 생각</span><h2>{topic}</h2><div aria-hidden>✦</div></div>
      <div ref={measureRef} className={styles.measure} aria-hidden>{opinions.map(o=><div key={o.id} data-id={o.id} className={styles.opinionCard}>{o.text}</div>)}</div>
      {layout.positions.map(position=>{
        const opinion=byId.get(position.id);
        if(!opinion) return null;
        const index=opinions.findIndex(o=>o.id===position.id);
        return <button key={opinion.id} type="button" data-testid="opinion-card" data-id={opinion.id} className={`${styles.opinionCard} ${styles.placed}`} onClick={()=>onSelect(opinion)}
          style={{width:layout.width,fontSize:layout.font,transform:`translate(${position.x}px,${position.y}px)`,background:["#ecfdf5","#eff6ff","#fef3c7","#f3e8ff","#ffe4e6"][index%5]}}>{opinion.text}</button>;
      })}
      {opinions.length===0 && <p className={styles.empty}>학생들의 의견이 여기에 모여요.</p>}
      {layout.fallback && <p className={styles.fallback}>모든 의견을 읽기 쉽게 표시하려면 <strong>전체 목록 보기</strong>를 눌러 주세요.</p>}
    </div>
    {listMode && <div className={styles.projectorList}><h2>{topic}</h2><div className={styles.listGrid}>{opinions.map(o=><button key={o.id} className={styles.listItem} onClick={()=>onSelect(o)}>{o.text}</button>)}</div>{!opinions.length && <p>아직 등록된 의견이 없습니다.</p>}</div>}
  </>;
}
