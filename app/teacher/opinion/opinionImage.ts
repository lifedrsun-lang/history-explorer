"use client";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Opinion } from "@/lib/opinions";
import OpinionBoard from "./OpinionBoard";
import styles from "@/app/opinion/opinion.module.css";

// Draw measured text runs, not a separate list layout. Positions, wrapping,
// colour and font are taken from the actual opinion board.
function drawText(ctx:CanvasRenderingContext2D,element:HTMLElement,origin:DOMRect) {
  const style=getComputedStyle(element);
  ctx.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.fillStyle=style.color;ctx.textAlign="left";ctx.textBaseline="alphabetic";
  const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
  let node:Node|null;
  while((node=walker.nextNode())) {
    let offset=0;
    for(const char of Array.from(node.textContent || "")) {
      const range=document.createRange();range.setStart(node,offset);offset+=char.length;range.setEnd(node,offset);
      if(char==="\n") continue;
      const r=range.getBoundingClientRect();
      if(!r.width || !r.height) continue;
      const metrics=ctx.measureText(char);
      const ascent=metrics.fontBoundingBoxAscent || Number.parseFloat(style.fontSize)*.82;
      const descent=metrics.fontBoundingBoxDescent || Number.parseFloat(style.fontSize)*.18;
      const baseline=r.top+(r.height-ascent-descent)/2+ascent;
      ctx.fillText(char,r.left-origin.left,baseline-origin.top);
    }
  }
}
function drawBox(ctx:CanvasRenderingContext2D,element:HTMLElement,origin:DOMRect) {
  const r=element.getBoundingClientRect(),s=getComputedStyle(element);
  const x=r.left-origin.left,y=r.top-origin.top;
  ctx.save();ctx.beginPath();ctx.roundRect(x,y,r.width,r.height,Number.parseFloat(s.borderTopLeftRadius)||0);
  ctx.fillStyle=s.backgroundColor;ctx.fill();
  const border=Number.parseFloat(s.borderTopWidth);
  if(border) {ctx.lineWidth=border;ctx.strokeStyle=s.borderTopColor;ctx.stroke();}
  ctx.restore();
}
async function drawBoard(board:HTMLDivElement,opinions:Opinion[]):Promise<Blob> {
  const cards=Array.from(board.querySelectorAll<HTMLElement>('[data-testid="opinion-card"]'));
  if(cards.length!==opinions.length || cards.some(card=>!opinions.some(opinion=>opinion.id===card.dataset.id))) throw new Error("모든 의견의 배치를 확인하지 못했습니다. 잠시 후 다시 저장해 주세요.");
  const topic=board.querySelector<HTMLElement>('[data-testid="opinion-topic"]');
  const box=board.getBoundingClientRect();
  if(!topic || !box.width || !box.height) throw new Error("의견 화면을 확인하지 못했습니다.");
  const canvas=document.createElement("canvas");canvas.width=1920;canvas.height=Math.round(1920*box.height/box.width);
  const ctx=canvas.getContext("2d");if(!ctx) throw new Error("이 브라우저는 이미지 저장을 지원하지 않습니다.");
  ctx.scale(1920/box.width,1920/box.width);
  const gradient=ctx.createRadialGradient(box.width/2,box.height/2,40,box.width/2,box.height/2,box.width*.65);
  gradient.addColorStop(0,"#ffffff");gradient.addColorStop(1,"#eef2ff");
  ctx.fillStyle=gradient;ctx.fillRect(0,0,box.width,box.height);
  drawBox(ctx,topic,box);
  for(const child of Array.from(topic.children)) {
    const element=child as HTMLElement;
    if(getComputedStyle(element).display!=="none") drawText(ctx,element,box);
  }
  for(const card of cards) {drawBox(ctx,card,box);drawText(ctx,card,box);}
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("PNG 생성에 실패했습니다.")),"image/png"));
}
export async function makeOpinionPng(topic:string,opinions:Opinion[],visibleBoard?:HTMLDivElement|null):Promise<Blob> {
  await document.fonts.ready;
  const matchesSnapshot=(board:HTMLDivElement)=>{
    const cards=Array.from(board.querySelectorAll<HTMLElement>('[data-testid="opinion-card"]'));
    return board.querySelector('[data-testid="opinion-topic"] h2')?.textContent===topic && cards.length===opinions.length && cards.every(card=>opinions.some(o=>o.id===card.dataset.id && o.text===card.textContent));
  };
  // A full board on screen is saved with those exact measured positions.
  if(visibleBoard && visibleBoard.clientWidth && matchesSnapshot(visibleBoard)) {
    await Promise.all(visibleBoard.getAnimations({subtree:true}).filter(a=>a.playState==="running").map(a=>a.finished.catch(()=>undefined)));
    if(matchesSnapshot(visibleBoard)) return drawBoard(visibleBoard,opinions);
  }
  // On small screens or in list mode, measure the same board component at
  // monitor size so an empty or clipped board is never exported.
  const host=document.createElement("div");host.className=styles.teacherPage;
  Object.assign(host.style,{position:"fixed",left:"-10000px",top:"0",width:"1920px",maxWidth:"none",padding:"0",pointerEvents:"none"});
  host.setAttribute("aria-hidden","true");document.body.append(host);
  const root=createRoot(host);
  try {
    const board=await new Promise<HTMLDivElement>((resolve,reject)=>{
      const timeout=window.setTimeout(()=>reject(new Error("이미지 배치를 준비하지 못했습니다. 다시 시도해 주세요.")),10000);
      root.render(createElement(OpinionBoard,{topic,opinions,onSelect:()=>{},listMode:false,onFallback:()=>{},onLayoutReady:(element,fits)=>{
        window.clearTimeout(timeout);
        if(fits) resolve(element);else reject(new Error("의견이 많아 보드에 모두 담기지 않습니다. 의견 수를 확인해 주세요."));
      }}));
    });
    return await drawBoard(board,opinions);
  } finally {root.unmount();host.remove();}
}
export function opinionImageFilename(topic:string) {
  return (topic.replace(/[\\/:*?"<>|]/g,"_").trim().slice(0,45)||"우리의_의견")+"_"+new Date().toLocaleDateString("sv-SE")+".png";
}
export function saveOpinionBlob(blob:Blob,topic:string) {
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=opinionImageFilename(topic);
  document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
export async function saveOpinionPng(topic:string,opinions:Opinion[],board?:HTMLDivElement|null) {
  saveOpinionBlob(await makeOpinionPng(topic,opinions,board),topic);
}
export async function shareOpinionPng(topic:string,opinions:Opinion[],board?:HTMLDivElement|null) {
  const file=new File([await makeOpinionPng(topic,opinions,board)],opinionImageFilename(topic),{type:"image/png"});
  if(!navigator.share || !navigator.canShare?.({files:[file]})) throw new Error("이 브라우저는 사진 공유를 지원하지 않습니다. 파일로 저장한 뒤 직접 공유해 주세요.");
  await navigator.share({files:[file],title:topic});
}
