"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";

type SourceCategory =
  | "방문·캠프"
  | "범교과"
  | "인공지능"
  | "실과 연계"
  | "에너지교육"
  | "게임리터러시"
  | "기초 학습"
  | "강사·교원 연수";

type CodingSourceItem = {
  id: string;
  category: SourceCategory;
  title: string;
  hours: string;
  audience: string;
  level?: string;
  version?: string;
  latest?: boolean;
  topics: string[];
  materials: string[];
  pptFiles?: string[];
};

const SOURCE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1QzR5kTBrNAYS5pxipum_qbjDA__6R9WBa4NHyiOohG0/edit?gid=0#gid=0";

const CATEGORIES: Array<{ value: "all" | SourceCategory; label: string }> = [
  { value: "all", label: "전체" },
  { value: "방문·캠프", label: "방문·캠프" },
  { value: "범교과", label: "범교과" },
  { value: "인공지능", label: "인공지능" },
  { value: "실과 연계", label: "실과 연계" },
  { value: "에너지교육", label: "에너지교육" },
  { value: "게임리터러시", label: "게임리터러시" },
  { value: "기초 학습", label: "기초 학습" },
  { value: "강사·교원 연수", label: "강사·교원 연수" },
];

const SOURCES: CodingSourceItem[] = [
  {
    id: "visit-2",
    category: "방문·캠프",
    title: "흥미와 관심으로 시작하는 헬로메이플",
    hours: "2차시",
    audience: "초등",
    level: "초급자용",
    version: "2025 차시별/수준별 학습",
    latest: true,
    topics: ["방문형 콘텐츠", "헬로메이플 입문"],
    materials: ["학생용 교재 PDF", "교사용 지도안 PDF"],
  },
  {
    id: "oneday-4",
    category: "방문·캠프",
    title: "짧지만 굵게 알아보는 헬로메이플",
    hours: "4차시",
    audience: "초등",
    level: "중급자용",
    version: "2025 차시별/수준별 학습",
    latest: true,
    topics: ["1일형 학습", "기초 코딩"],
    materials: ["학생용 교재 PDF", "교사용 지도안 PDF"],
  },
  {
    id: "camp-8",
    category: "방문·캠프",
    title: "누구나 쉽게 시작하는 헬로메이플",
    hours: "8차시",
    audience: "초등",
    level: "중·고급자용",
    version: "2025 차시별/수준별 학습",
    latest: true,
    topics: ["캠프 활용", "헬로메이플 기초·코딩"],
    materials: ["학생용 교재 PDF", "교사용 지도안 PDF"],
  },

  ...[
    ["career", "진로교육", "3~4학년", "학교 가는 길 게임 플레이하기", "NPC와의 대화를 통해 직업 탐구하기", "1_진로교육_2025 리뉴얼.pptx"],
    ["food", "영양 식생활 교육", "3~4학년", "올바른 식습관 학습하기", "코드를 복사하여 나만의 프로그램으로 바꾸기", "2_영양식생활_2025 리뉴얼.pptx"],
    ["dokdo", "독도교육", "3~4학년", "독도에 대해 학습하기", "오브젝트를 배치하여 맵 꾸미기", "3_독도교육_2025 리뉴얼.pptx"],
    ["gaecheon", "개천절교육", "3~4학년", "마늘 먹기 게임하기", "문제 만들고 코딩하기", "4_개천절_2025 리뉴얼.pptx"],
    ["hangul", "한글날교육", "3~4학년", "속담 소나기 놀이하기", "속담 소나기 프로그램 바꾸기", "5_한글사랑_2025 리뉴얼.pptx"],
    ["environment", "환경교육", "5~6학년", "쓰레기 줍기 프로그램 개발하기", "환경 주제 코딩", "6_환경교육_2025 리뉴얼.pptx"],
    ["safety", "안전교육", "5~6학년", "위기의 숲 안전하게 탈출하기", "안전 퀴즈 맵 만들기", "7_안전교육_2025 리뉴얼.pptx"],
    ["war625", "6.25전쟁", "5~6학년", "코딩으로 인천 상륙작전 성공시키기", "블록코딩으로 피난민 지키기", "8_6.25전쟁_2025 리뉴얼.pptx"],
    ["friend", "친구사랑", "5~6학년", "친구사랑 게임 체험하기", "친구사랑 프로그램 코딩하기", "9_친구사랑_2025 리뉴얼.pptx"],
    ["citizen", "민주시민교육", "5~6학년", "공약 발표 스테이지 실행하기", "공약 발표 스테이지 꾸미기", "10_민주시민_2025 리뉴얼.pptx"],
  ].map(([id, title, audience, topic1, topic2, ppt]) => ({
    id: `cross-${id}`,
    category: "범교과" as const,
    title,
    hours: "4차시",
    audience,
    version: "2025 리뉴얼",
    latest: true,
    topics: [topic1, topic2],
    materials: ["학생용 교재 PDF", "수업용 PPT", "헬로메이플 MOD"],
    pptFiles: [ppt],
  })),

  {
    id: "ai-first-step",
    category: "인공지능",
    title: "헬로메이플로 시작하는 인공지능 첫걸음",
    hours: "16차시",
    audience: "초등 5~6학년",
    version: "2025 인공지능 학습",
    latest: true,
    topics: [
      "1~2차시 인공지능의 역사",
      "3~4차시 인공지능 데이터",
      "5~6차시 인공지능 머신러닝",
      "7~8차시 인공지능 딥러닝",
      "9~10차시 생성형 인공지능",
      "11~12차시 인공지능의 윤리적인 활용",
      "13~14차시 인공지능과 로봇",
      "15~16차시 미래의 인공지능",
    ],
    materials: ["학생용 교재 PDF", "교사용 지도안 PDF", "PPT 교안 8종"],
    pptFiles: [
      "1~2차시_인공지능의 역사",
      "3~4차시_인공지능 데이터",
      "5~6차시_인공지능 머신러닝",
      "7~8차시_인공지능 딥러닝",
      "9~10차시_생성형 인공지능",
      "11~12차시_인공지능의 윤리적인 활용",
      "13~14차시_인공지능과 로봇",
      "15~16차시_미래의 인공지능",
    ],
  },
  {
    id: "ai-ethics",
    category: "인공지능",
    title: "헬로메이플과 함께 떠나는 인공지능 윤리",
    hours: "16차시",
    audience: "초등 전학년",
    version: "2025 인공지능 학습",
    latest: true,
    topics: [
      "1~2차시 사람을 돕는 인공지능",
      "3~4차시 인공지능 윤리의 필요성",
      "5~6차시 인공지능과 개인정보 침해",
      "7~8차시 인공지능이 만드는 가짜 정보·허위 정보",
      "9~10차시 인공지능의 편향성",
      "11~12차시 인공지능의 저작권과 책임성",
      "13~14차시 인공지능과 직업 세계",
      "15~16차시 인공지능 윤리 실천",
    ],
    materials: ["학생용 교재 PDF", "교사용 지도안 PDF", "PPT 교안 8종"],
  },

  ...[
    ["kyohak", "교학사", "계산기 프로그램 등"],
    ["dong-a", "동아", "기초 프로그래밍하기 등"],
    ["kumsung", "금성", "두 수를 더하는 프로그램 등"],
    ["mirae-n", "미래엔", "애니메이션 만들기 등"],
    ["visang", "비상", "자기소개 프로그램 등"],
    ["chunjae", "천재", "아바타·용돈 기입장·도형 퀴즈 등"],
  ].map(([id, publisher, topic]) => ({
    id: `practical-${id}`,
    category: "실과 연계" as const,
    title: `헬로메이플로 실과 교과서 실습하기 · ${publisher}`,
    hours: "4차시",
    audience: "초등",
    level: "중·고급자용",
    version: "2025 초등 실과 교과서 연계",
    latest: true,
    topics: [topic],
    materials: ["학생용 교재 PDF", "교사용 지도안 PDF", "헬로메이플 MOD", "1~4차시 자료"],
  })),

  ...[
    ["future-career", "3~4학년 미래세대 에너지교육 · 미래 설계 및 진로", "3~4학년", "꿈의 에너지 마을", "에너지 직업 탐험대", "무엇이 부족할까", "퀘스트를 깨라!"],
    ["saving", "3~4학년 미래세대 에너지교육 · 에너지 절약과 실천", "3~4학년", "에너지 히어로의 탄생", "에너지 아이템 모으기 대작전", "에너지 낭비를 막아라", "에너지 절약 함께해요 캠페인"],
    ["renewable", "5~6학년 미래세대 에너지교육 · 신재생 에너지와 기술", "5~6학년", "태양이 전기를 만드는 방법", "전기를 따라", "나의 발전소 만들기", "발전소의 공급량을 높여라"],
    ["climate", "5~6학년 미래세대 에너지교육 · 에너지와 기후변화", "5~6학년", "기후변화 왜 생길까", "탄소발자국 줄이기", "기후변화에 대응하라", "도시를 구하라"],
  ].map(([id, title, audience, t1, t2, t3, t4]) => ({
    id: `energy-${id}`,
    category: "에너지교육" as const,
    title,
    hours: "8차시",
    audience,
    level: "초급자용",
    version: "2025 미래세대 에너지교육",
    latest: true,
    topics: [`1~2차시 ${t1}`, `3~4차시 ${t2}`, `5~6차시 ${t3}`, `7~8차시 ${t4}`],
    materials: ["수업계획안 PDF", "수업용 PPT", "헬로메이플 MOD"],
  })),

  {
    id: "game-exp-2",
    category: "게임리터러시",
    title: "누구나 쉽게 헬로메이플 체험하기",
    hours: "2차시",
    audience: "초등 전학년",
    version: "2025 헬로메이플 게임리터러시",
    latest: true,
    topics: ["1차시 게임리터러시·아바타 꾸미기·튜토리얼 1~2", "2차시 오브젝트 추가 및 맵 꾸미기"],
    materials: ["교사용 지도안", "학생용 교재", "수업용 PPT"],
    pptFiles: ["누구나 쉽게 헬로메이플 체험하기_게임리터러시 기초_2차시.pptx"],
  },
  {
    id: "game-basic-4",
    category: "게임리터러시",
    title: "코딩 체험하기 - 게임리터러시 기초",
    hours: "4차시",
    audience: "초등 전학년",
    version: "2025 헬로메이플 게임리터러시",
    latest: true,
    topics: ["게임리터러시·맵 꾸미기", "오브젝트 코딩", "맵 전환", "변수 활용"],
    materials: ["교사용 지도안", "학생용 교재", "수업용 PPT"],
    pptFiles: ["코딩체험하기_게임리터러시 기초_4차시.pptx"],
  },
  {
    id: "game-stairs-8",
    category: "게임리터러시",
    title: "나는 게임 개발자 - 유한의 계단편",
    hours: "8차시",
    audience: "초등 전학년",
    version: "2025 헬로메이플 게임리터러시",
    latest: true,
    topics: ["기본 4차시", "유한의 계단 게임 기획·설계·구현 4차시"],
    materials: ["교사용 지도안", "학생용 교재", "수업용 PPT"],
    pptFiles: ["나는 게임 개발자_유한의계단_8차시.pptx"],
  },
  {
    id: "game-jellyfish-8",
    category: "게임리터러시",
    title: "나는 게임 개발자 - 해파리 게임편",
    hours: "8차시",
    audience: "초등 전학년",
    version: "2025 헬로메이플 게임리터러시",
    latest: true,
    topics: ["기본 4차시", "해파리 게임 기획·설계·구현 4차시"],
    materials: ["교사용 지도안", "학생용 교재", "수업용 PPT"],
    pptFiles: ["나는 게임 개발자_해파리게임_8차시.pptx"],
  },
  {
    id: "complete-16",
    category: "기초 학습",
    title: "헬로메이플 완전정복 - 기초부터 개발까지",
    hours: "16차시",
    audience: "초등 전학년",
    version: "헬로메이플 기초 학습 콘텐츠",
    topics: [
      "게임 이해·윤리·게임리터러시",
      "저학년 자기 이해·맵 꾸미기·말하기 블록",
      "고학년 순차·반복·포털·맵 이동",
      "변수와 무작위 수",
      "피하기 게임 맵 제작·코딩",
    ],
    materials: ["교사용 지도안", "학생용 교재"],
  },
  {
    id: "teacher-training-11",
    category: "강사·교원 연수",
    title: "헬로메이플 선도교원 연수용",
    hours: "11차시",
    audience: "헬로메이플 활용 교원",
    version: "2024",
    topics: ["SW 교육과 교육과정", "헬로메이플 소개·LMS", "꾸미기·기초 프로그래밍", "수학몬스터", "범교과 활용", "수업 및 연수 기획"],
    materials: ["연수용 교재 PDF", "연수용 PPT"],
  },
  {
    id: "educator-training-4",
    category: "강사·교원 연수",
    title: "헬로메이플 에듀케이터 연수용",
    hours: "4차시",
    audience: "에듀케이터·방과후 강사·캠프 강사",
    version: "2024",
    topics: ["설치·회원가입·소개", "LMS·아바타·맵 꾸미기", "튜토리얼·기초 코딩", "학교 현장 교육활동의 이해"],
    materials: ["연수용 교재 PDF", "연수용 PPT"],
  },
  {
    id: "school-visit-1",
    category: "강사·교원 연수",
    title: "학교로 찾아가는 헬로메이플",
    hours: "1차시",
    audience: "강사",
    version: "2024",
    topics: ["헬로메이플 기초", "아바타 꾸미기", "맵 꾸미기"],
    materials: ["강사용 수업 자료 PDF", "수업용 PPT"],
    pptFiles: ["2024 학교로 찾아가는 헬로메이플_다운로드용.pptx"],
  },
];

export default function CodingSourceCatalogPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [category, setCategory] = useState<"all" | SourceCategory>("all");
  const [queryText, setQueryText] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/teacher");
        return;
      }
      setAuthorized(true);
      setAuthChecking(false);
    });
  }, [router]);

  const filtered = useMemo(() => {
    const keyword = queryText.trim().toLocaleLowerCase("ko");
    return SOURCES.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!keyword) return true;
      return [
        item.title,
        item.category,
        item.hours,
        item.audience,
        item.level,
        item.version,
        ...item.topics,
        ...item.materials,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ko")
        .includes(keyword);
    });
  }, [category, queryText]);

  const pptCount = SOURCES.filter((item) => item.materials.some((material) => material.includes("PPT"))).length;

  if (authChecking) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fb] p-4">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-black text-slate-600 shadow-md">
          교사 로그인을 확인하는 중입니다...
        </div>
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800 md:p-5">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-white p-5 shadow-md md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-600">💻 코딩 · 원본 콘텐츠</p>
              <h1 className="mt-1 text-2xl font-black md:text-3xl">헬로메이플 원본 콘텐츠 자료실</h1>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-500">
                헬로메이플 교육과정 콘텐츠 가이드의 교원·강사용 및 2025 리뉴얼 내용을 기준으로 정리했습니다.
                학교별 계약 커리큘럼을 만들기 전, 여기에서 사용할 원본 콘텐츠를 고르는 구조입니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={SOURCE_SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100"
              >
                원본 시트 열기 ↗
              </a>
              <Link
                href="/teacher/presentations?category=coding"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-100"
              >
                ← 코딩 PPT로
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Summary label="정리한 원본 콘텐츠" value={`${SOURCES.length}개`} />
            <Summary label="PPT 포함 콘텐츠" value={`${pptCount}개`} />
            <Summary label="현재 단계" value="원본 분류" />
          </div>
        </header>

        <section className="mt-4 rounded-3xl bg-white p-4 shadow-md md:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setCategory(item.value)}
                  className={`rounded-full px-3 py-2 text-xs font-black transition ${
                    category === item.value
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <input
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="콘텐츠명·주제·대상 검색"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-300 xl:max-w-sm"
            />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-slate-400">
            <span>{filtered.length}개 표시</span>
            <span>※ 시트에 PPT가 명시되지 않은 콘텐츠도 원본 후보로 함께 보관</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{item.category}</Badge>
                    {item.latest ? <Badge accent>최신</Badge> : null}
                    {item.version ? <Badge>{item.version}</Badge> : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-emerald-700 shadow-sm">
                    {item.hours}
                  </span>
                </div>

                <h2 className="mt-3 text-base font-black leading-6 text-slate-800">{item.title}</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  대상 {item.audience}{item.level ? ` · ${item.level}` : ""}
                </p>

                <div className="mt-3 rounded-xl bg-white p-3">
                  <p className="text-[11px] font-black text-slate-400">주요 내용</p>
                  <div className="mt-1.5 space-y-1">
                    {item.topics.slice(0, 4).map((topic) => (
                      <p key={topic} className="text-xs font-bold leading-5 text-slate-700">• {topic}</p>
                    ))}
                    {item.topics.length > 4 ? (
                      <p className="text-xs font-black text-emerald-600">+ {item.topics.length - 4}개 주제 더 있음</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.materials.map((material) => (
                    <span key={material} className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                      {material}
                    </span>
                  ))}
                </div>

                {item.pptFiles?.length ? (
                  <details className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <summary className="cursor-pointer text-xs font-black text-slate-600">PPT 이름 확인</summary>
                    <div className="mt-2 space-y-1.5">
                      {item.pptFiles.map((file) => (
                        <p key={file} className="break-words text-[11px] font-bold leading-5 text-slate-500">{file}</p>
                      ))}
                    </div>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
      <p className="text-xs font-black text-emerald-600">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-800">{value}</p>
    </div>
  );
}

function Badge({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-black ${
        accent ? "bg-emerald-600 text-white" : "bg-white text-slate-500"
      }`}
    >
      {children}
    </span>
  );
}
