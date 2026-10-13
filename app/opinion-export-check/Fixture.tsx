"use client";
import {useCallback,useRef,useState} from "react";
import type {User} from "firebase/auth";
import OpinionBoard from "@/app/teacher/opinion/OpinionBoard";
import OpinionSaveDialog,{type OpinionImageCapture} from "@/app/teacher/opinion/OpinionSaveDialog";
import {makeOpinionPng} from "@/app/teacher/opinion/opinionImage";
import styles from "@/app/opinion/opinion.module.css";
const topic="나의 개인정보 보호 수칙";
const sentences=["AI에게 내 주소를 함부로 알려주지 않기","비밀번호를 다른 사람과 공유하지 않기","모르는 링크를 클릭하지 않기","사진을 업로드하기 전에 개인정보가 있는지 확인하기","의심스러운 요청은 어른에게 물어보기","내 이름과 전화번호를 AI에게 알려주지 않기","나와 친구의 사진을 올리기 전에 허락받기","생년월일과 학교 이름은 입력하지 않기","친구의 개인정보도 소중하게 지키기","AI의 답변을 무조건 믿지 않고 확인하기","개인정보를 요청하는 메시지는 다시 살펴보기","사용한 기기에서 반드시 로그아웃하기","인터넷에서 주소와 연락처를 공개하지 않기","복잡하고 안전한 비밀번호 만들기","내가 사는 곳을 자세히 알려주지 않기","어려운 상황은 선생님께 도움을 요청하기","나의 개인정보는 나만 알고 있기","다른 사람이 보낸 파일을 함부로 열지 않기","인공지능에 정보를 넣기 전에 한 번 더 생각하기","중요한 개인정보를 메모해서 공유하지 않기","개인정보가 담긴 화면을 캡처해서 보내지 않기","AI를 사용할 때는 개인정보를 입력하지 않고 필요한 질문만 하며 친구의 정보도 함부로 올리지 않기","모르는 사람에게 비밀번호를 알려주지 않기","이름 대신 별명을 사용하기","자리를 비울 때 화면을 잠그기"];
const opinions=sentences.map((text,i)=>({id:`fixture-${i}`,text,createdAt:new Date(0).toISOString()}));
const fixtureUser={getIdToken:async()=>"fixture-invalid-auth"} as User;
export default function Fixture() {
  const board=useRef<HTMLDivElement>(null);const [capture,setCapture]=useState<OpinionImageCapture|null>(null),[message,setMessage]=useState(""),[list,setList]=useState(false),[small,setSmall]=useState(false);
  const fallback=useCallback((value:boolean)=>setMessage(value?"화면 공간 부족":"25개 의견 배치 완료"),[]);
  async function save() {try {const blob=await makeOpinionPng(topic,opinions,board.current?.querySelector('[data-testid="opinion-board"]'));setCapture({id:crypto.randomUUID(),topic,opinionCount:25,blob});}catch(error){setMessage(String(error));}}
  return <main className={styles.teacherPage}><h1>샘플 의견 25개 · 이미지 저장 검증</h1><p>실제 학교와 학생 자료를 사용하지 않는 Preview 전용 화면입니다.</p><button onClick={()=>void save()}>저장</button><button onClick={()=>setList(!list)}>목록 전환</button><button onClick={()=>setSmall(!small)}>좁은 화면 전환</button><p role="status">{message}</p><div ref={board} style={{width:small?375:"100%"}}><OpinionBoard topic={topic} opinions={opinions} onSelect={()=>{}} listMode={list} onFallback={fallback}/></div>{capture && <OpinionSaveDialog capture={capture} user={fixtureUser} onClose={()=>setCapture(null)} onSaved={message=>{setMessage(message);setCapture(null);}}/>}</main>;
}
