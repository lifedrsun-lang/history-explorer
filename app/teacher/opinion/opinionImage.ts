"use client";
import type { Opinion } from "@/lib/opinions";
const palette = ["#ecfdf5","#eff6ff","#fef3c7","#f3e8ff","#ffe4e6"];
function wrap(ctx:CanvasRenderingContext2D,text:string,maxWidth:number) {
  const result:string[]=[];
  for (const section of text.split("\n")) {
    let line="";
    for (const ch of section) {
      if (line && ctx.measureText(line+ch).width>maxWidth) { result.push(line);line=ch; }
      else line+=ch;
    }
    result.push(line||" ");
  }
  return result;
}
export async function makeOpinionPng(topic:string, opinions:Opinion[]):Promise<Blob> {
  await document.fonts.ready;
  const width=1920,margin=64,gap=18,cols=5,font=25;
  const cardW=(width-2*margin-gap*(cols-1))/cols;
  const c=document.createElement("canvas"),ctx=c.getContext("2d");
  if(!ctx) throw new Error("이 브라우저는 이미지 저장을 지원하지 않습니다.");
  ctx.font="700 "+font+"px sans-serif";
  const wrapped=opinions.map(o=>wrap(ctx,o.text,cardW-36));
  const rows=Math.ceil(opinions.length/cols);
  const rowHeight=Array.from({length:rows},(_,r)=>Math.max(160,...wrapped.slice(r*cols,(r+1)*cols).map(lines=>65+lines.length*35)));
  const height=Math.max(1080,230+rowHeight.reduce((a,b)=>a+b,0)+Math.max(0,rows-1)*gap+75);
  c.width=width;c.height=height;
  ctx.fillStyle="#f8faff";ctx.fillRect(0,0,width,height);
  ctx.fillStyle="#64748b";ctx.font="700 27px sans-serif";ctx.fillText("SUN LAB  ·  실시간 의견 모으기",margin,66);
  ctx.fillStyle="#4f46e5";ctx.beginPath();ctx.roundRect(margin,102,width-2*margin,104,24);ctx.fill();
  ctx.font="900 46px sans-serif";ctx.fillStyle="#ffffff";
  const heading=wrap(ctx,topic,width-2*margin-80);
  const headingFont=heading.length>1?35:46;
  ctx.font="900 "+headingFont+"px sans-serif";
  const start=162-(heading.length-1)*(headingFont+4)/2;
  heading.forEach((line,i)=>ctx.fillText(line,margin+38,start+i*(headingFont+4)));
  let y=230;
  opinions.forEach((o,i)=>{
    const col=i%cols,row=Math.floor(i/cols);
    if(col===0 && row>0) y+=rowHeight[row-1]+gap;
    const x=margin+col*(cardW+gap);
    ctx.fillStyle=palette[i%palette.length];ctx.beginPath();ctx.roundRect(x,y,cardW,rowHeight[row],18);ctx.fill();
    ctx.fillStyle="#4338ca";ctx.font="900 23px sans-serif";ctx.fillText(String(i+1).padStart(2,"0"),x+18,y+38);
    ctx.fillStyle="#1e293b";ctx.font="700 "+font+"px sans-serif";
    wrapped[i].forEach((line,j)=>ctx.fillText(line,x+18,y+80+j*35));
  });
  ctx.fillStyle="#64748b";ctx.font="700 24px sans-serif";
  ctx.fillText("총 "+opinions.length+"개의 의견 · 저장 시점의 활동 결과",margin,height-34);
  return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error("PNG 생성에 실패했습니다.")),"image/png"));
}
function filename(topic:string) {
  return (topic.replace(/[\\/:*?"<>|]/g,"_").trim().slice(0,45)||"우리의_의견")+"_"+new Date().toLocaleDateString("sv-SE")+".png";
}
export async function saveOpinionPng(topic:string,opinions:Opinion[]) {
  const url=URL.createObjectURL(await makeOpinionPng(topic,opinions));
  const a=document.createElement("a");a.href=url;a.download=filename(topic);
  document.body.append(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
export async function shareOpinionPng(topic:string,opinions:Opinion[]) {
  const image=await makeOpinionPng(topic,opinions);
  const file=new File([image],filename(topic),{type:"image/png"});
  if(!navigator.share || !navigator.canShare?.({files:[file]}))
    throw new Error("이 브라우저는 사진 공유를 지원하지 않습니다. PNG를 저장한 뒤 직접 공유해 주세요.");
  await navigator.share({files:[file],title:topic});
}
