export type CurriculumDetail = {
  lesson: string;
  content?: string;
  description: string;
};

export type CurriculumVariant = {
  title: string;
  audience: string;
  details: CurriculumDetail[];
  referenceFiles?: string[];
};

export type CurriculumItem = {
  id: string;
  number: number | null;
  title: string;
  hours: string;
  audience?: string;
  group?: "기초 학습 모듈" | "주제 학습 모듈" | "별도 참고 모듈";
  description?: string;
  proposalSummary?: string;
  details: CurriculumDetail[];
  referenceFiles?: string[];
  variants?: CurriculumVariant[];
  note?: string;
  status?: string;
};

export const BASIC_2026: CurriculumItem[] = [
  {
    id: "basic-1",
    number: 1,
    title: "구글 AIEP",
    hours: "1차시",
    audience: "5~6학년",
    proposalSummary: "AIEP 로그인 및 기본 사용법 알기",
    details: [
      {
        lesson: "기본 1",
        content: "구글 AIEP",
        description:
          "AIEP 플랫폼 실습(로그인 및 인터페이스), 클래스룸 입급 및 콘텐츠 살펴보기, 간단한 미션 해결 및 과제 제출 방법 알기",
      },
    ],
    status: "연결할 상세 자료는 아직 확인되지 않음",
  },
  {
    id: "basic-2",
    number: 2,
    title: "AIEP를 활용한 자기주도적 학습 방법",
    hours: "1차시",
    audience: "5~6학년",
    proposalSummary: "AIEP의 EDU+ 기능과 헬로메이플을 활용한 자기주도 학습",
    details: [
      {
        lesson: "기본 2",
        content: "AIEP 자기주도 학습",
        description:
          "AIEP의 EDU+ 기능을 활용한 공부 방법, 리드얼롱을 활용한 영어 공부, AIEP에서 헬로메이플에 접속해 자기주도적 게임코딩 공부 방법 알아보기",
      },
    ],
    status: "연결할 상세 자료는 아직 확인되지 않음",
  },
  {
    id: "basic-3",
    number: 3,
    title: "헬로메이플 계정 생성 · 아바타 꾸미기",
    hours: "1차시",
    audience: "5~6학년",
    proposalSummary: "헬로메이플 블록코딩 입문",
    details: [
      {
        lesson: "기본 3",
        content: "회원가입 / 아바타 꾸미기",
        description:
          "헬로메이플 계정 확인 및 로그인, 아바타 꾸미는 방법 익히기, 나만의 캐릭터 완성, 아바타를 통해 나를 소개하고 공유하기",
      },
    ],
    referenceFiles: [
      "(2차시 지도안) 누구나 쉽게 헬로메이플 체험하기_교사용.pdf",
      "(2차시 교재) 누구나 쉽게 헬로메이플 체험하기_학생용 교재.pdf",
      "누구나 쉽게 헬로메이플 체험하기_게임리터러시 기초_2차시.pptx",
    ],
  },
  {
    id: "basic-4",
    number: 4,
    title: "기초게임 체험 · 타자 연습",
    hours: "1차시",
    audience: "5~6학년",
    proposalSummary: "기초게임 체험과 타자 연습",
    details: [
      {
        lesson: "2-1",
        content: "버그버스터즈",
        description: "기본적인 키보드 및 마우스 조작을 통한 기초게임 체험하기",
      },
      {
        lesson: "2-2",
        content: "OX 메이플운동회",
        description:
          "디지털 관련 기초 지식 학습, 메이플 운동회 O/X 퀴즈 참여, 배운 내용 정리",
      },
      {
        lesson: "2-3",
        content: "도전! 타자히어로",
        description:
          "한컴타자를 활용한 기초 타자 연습, 도전! 타자히어로 연습 및 친구들과 함께 게임하기",
      },
    ],
    note: "상세자료의 원본 2번 묶음을 학교 제안서의 기본 4에 연결",
  },
  {
    id: "basic-5",
    number: 5,
    title: "튜토리얼 1",
    hours: "1차시",
    audience: "5~6학년",
    proposalSummary: "아바타 움직이기 · NPC 상호작용 · 명령어 블록",
    details: [
      {
        lesson: "기본 5",
        content: "시작의 마을",
        description:
          "튜토리얼 1번: 아바타 움직이기, NPC와 상호작용하기, 아바타와 NPC에 사용된 명령어 블록 살펴보기",
      },
    ],
    referenceFiles: [
      "(4차시 지도안) 코딩체험하기_게임리터러시 기초_교사용.pdf",
      "(4차시 교재) 코딩체험하기_게임리터러시 기초_학생용 교재.pdf",
      "누구나 쉽게 헬로메이플 체험하기_게임리터러시 기초_2차시.pptx",
    ],
    note: "상세자료의 원본 3-4차시 '시작의 마을'을 학교 제안서의 기본 5에 연결",
  },
  {
    id: "basic-6",
    number: 6,
    title: "튜토리얼 2",
    hours: "1차시",
    audience: "5~6학년",
    proposalSummary: "배경 · 오브젝트 · 사다리 · 밧줄 추가",
    details: [
      {
        lesson: "기본 6",
        content: "꾸미기 마을",
        description:
          "튜토리얼 2번: 배경 고르기, 오브젝트 추가하기, 사다리와 밧줄 추가하기",
      },
    ],
    referenceFiles: [
      "(4차시 지도안) 코딩체험하기_게임리터러시 기초_교사용.pdf",
      "(4차시 교재) 코딩체험하기_게임리터러시 기초_학생용 교재.pdf",
      "누구나 쉽게 헬로메이플 체험하기_게임리터러시 기초_2차시.pptx",
    ],
    note: "상세자료의 원본 5-6차시 '꾸미기 마을'을 학교 제안서의 기본 6에 연결",
  },
  {
    id: "basic-7",
    number: 7,
    title: "기초 알고리즘 학습",
    hours: "1차시",
    audience: "5~6학년",
    proposalSummary: "순차 구조와 차곡차곡 블록요리사 연습 모드",
    details: [
      {
        lesson: "기본 7",
        content: "차곡차곡 블록요리사",
        description:
          "순차 구조 이해하기. 코딩 블록의 움직임을 요리 과정에 비유하여 알고리즘 흐름을 직관적으로 이해하는 연습 모드",
      },
    ],
    note: "같은 차곡차곡 블록요리사 콘텐츠가 심화 5의 상세자료에도 제시됨",
  },
  {
    id: "basic-8",
    number: 8,
    title: "기본 맵 구현",
    hours: "1차시",
    audience: "5~6학년",
    proposalSummary: "발판/사다리 기능 · 포탈 기능",
    details: [
      {
        lesson: "기본 8",
        content: "기본 맵 구현",
        description: "발판/사다리 기능과 포탈 기능을 활용한 기본 맵 구현",
      },
    ],
    status: "연결할 상세 자료는 아직 확인되지 않음",
  },
];

export const ADVANCED_2026: CurriculumItem[] = [
  {
    id: "advanced-1",
    number: 1,
    title: "헬로메이플 기초 가이드",
    hours: "6차시",
    group: "기초 학습 모듈",
    details: [],
    status: "학교 제안서 제목·차시는 확인됨. 세부자료는 아직 미제공",
  },
  {
    id: "advanced-2",
    number: 2,
    title: "헬로메이플 튜토리얼 정복",
    hours: "6차시",
    group: "기초 학습 모듈",
    description:
      "기초 가이드에서 학습한 배경 바꾸기, 오브젝트 추가 등의 기본 개념을 바탕으로 순차 구조, 선택 구조, 변수 활용 등 보다 심화된 코딩 내용을 단계적으로 학습하는 모듈",
    details: [
      {
        lesson: "1-2",
        content: "몬스터 마을",
        description: "튜토리얼 3번: 몬스터 추가하기, 몬스터 방향과 위치 설정하기, 아이템 만들기",
      },
      {
        lesson: "3-4",
        content: "포털 마을",
        description: "튜토리얼 4번: 포털 추가하기, 포털을 타고 아바타 이동하기",
      },
      {
        lesson: "5-6",
        content: "아이템 마을",
        description: "튜토리얼 5번: 아이템 변수 추가하기, 아바타 코딩하기, 아이템 코딩하기",
      },
    ],
    referenceFiles: [
      "(8차시 지도안) 나는 게임 개발자_유한의 계단편_교사용.pdf",
      "(8차시 교재) 나는 게임 개발자_유한의 계단편_학생용 교재.pdf",
      "나는 게임 개발자_유한의계단_8차시.pptx",
    ],
    note: "파일명은 사용자가 제공한 상세 원본표의 기재 내용을 그대로 보존",
  },
  {
    id: "advanced-3",
    number: 3,
    title: "나는 게임 개발자 – 유한의 계단편",
    hours: "4차시",
    group: "기초 학습 모듈",
    description:
      "게임과 놀이의 차이를 이해하고 게임 관련 직업을 탐색하며, 게임 기획자와 개발자의 역할을 체험하고 자신만의 게임을 제작하는 모듈",
    details: [
      { lesson: "1", content: "유한의 계단", description: "게임 기획자와 개발자" },
      { lesson: "2", content: "유한의 계단", description: "유한의 계단 게임 설계하기" },
      {
        lesson: "3-4",
        content: "유한의 계단",
        description:
          "유한의 계단 게임 구현하기: 계단을 다양하게, 맵을 여러 모습으로 구성, 프로그래밍, 목적지 도착 시 게임 종료 또는 시간 측정 등",
      },
    ],
    referenceFiles: [
      "(8차시)(1)나는게임개발자_유한의계단편_학생용.pdf",
      "(8차시)(1)나는게임개발자_유한의계단편_지도자용.pdf",
      "나는 게임 개발자_유한의계단_8차시.pptx",
    ],
  },
  {
    id: "advanced-4",
    number: 4,
    title: "나는 게임 개발자 – 해파리 게임편",
    hours: "4차시",
    group: "기초 학습 모듈",
    description:
      "게임의 의미와 종류별 특성을 이해하고 기존 게임 구성을 분석한 뒤 나만의 피하기 게임을 기획·제작하는 모듈",
    details: [
      { lesson: "1", content: "파리파리 해파리 게임", description: "다양한 미니게임과 게임 종류" },
      { lesson: "2", content: "파리파리 해파리 게임", description: "피하기 게임 설계하기" },
      {
        lesson: "3-4",
        content: "파리파리 해파리 게임",
        description: "피하기 게임 구현하기: 맵 꾸미기, 오브젝트 추가 및 프로그래밍, 게임 종료 조건",
      },
    ],
    referenceFiles: [
      "(8차시 지도안) 나는 게임 개발자_해파리게임편_교사용.pdf",
      "(8차시 교재) 나는 게임 개발자_해파리게임편_학생용 교재.pdf",
      "나는 게임 개발자_해파리게임_8차시.pptx",
    ],
  },
  {
    id: "advanced-5",
    number: 5,
    title: "헬로메이플 활용 블록코딩 기초 알고리즘 학습",
    hours: "2차시",
    group: "기초 학습 모듈",
    description:
      "헬로메이플의 요리 게임을 활용해 블록 코딩의 기초 알고리즘을 쉽고 반복적으로 연습하는 모듈",
    details: [
      {
        lesson: "1",
        content: "차곡차곡 블록 요리사",
        description:
          "순차 구조 이해하기, 연습 모드를 통해 코딩 블록의 움직임을 요리 과정에 비유하여 알고리즘 흐름 이해",
      },
      {
        lesson: "2",
        content: "차곡차곡 블록 요리사 2인 모드",
        description: "효율적인 블록 조합을 탐색하며 반복과 디버깅 과정 학습",
      },
    ],
    note: "상세자료 원본에서는 6번으로 기재되어 있으나 학교 제안서 공식 번호인 심화 5로 매핑",
  },
  {
    id: "advanced-6",
    number: 6,
    title: "안전교육",
    hours: "4차시",
    audience: "5~6학년",
    group: "주제 학습 모듈",
    description:
      "재난 상황의 안전 수칙과 대처 방법을 게임 활동으로 익히는 범교과 안전교육 모듈. 초등학교 7대 안전교육 표준안과 연계",
    details: [
      { lesson: "1", content: "안전교육", description: "안전 수칙 익히기, 안전 문제 만들기, <위기의 숲 안전하게 탈출하기> 플레이" },
      { lesson: "2", content: "안전교육", description: "map 1,2 구조와 블록 명령어 분석, 조건/반복/순차구조 이해, map 3 구상" },
      { lesson: "3", content: "안전교육", description: "오브젝트 배치·코딩, 아바타 코딩" },
      { lesson: "4", content: "안전교육", description: "게임 박람회, 친구 게임 체험, 활동 정리 및 소감" },
    ],
    referenceFiles: ["헬로메이플계기교육_07 안전교육.pdf", "7_안전교육_2025 리뉴얼.pptx"],
    note: "상세자료 원본 7번을 학교 제안서 공식 심화 6에 매핑",
  },
  {
    id: "advanced-7",
    number: 7,
    title: "진로교육",
    hours: "4차시",
    audience: "3~4학년",
    group: "주제 학습 모듈",
    description:
      "일상 속 다양한 직업을 탐구하고 자신에게 어울리는 직업을 찾아보는 범교과 진로교육 모듈",
    details: [
      { lesson: "1", content: "진로교육", description: "나의 꿈 나누기, <학교 가는 길> 플레이" },
      { lesson: "2-3", content: "진로교육", description: "게임에 등장하는 직업 탐구, 나만의 직업 캐릭터 만들기" },
      { lesson: "4", content: "진로교육", description: "우리반 직업 발표회, 스스로 평가하기" },
    ],
    referenceFiles: ["헬로메이플계기교육_01 진로교육.pdf", "1_진로교육_2025 리뉴얼.pptx"],
    note: "상세자료 원본 8번을 학교 제안서 공식 심화 7에 매핑",
  },
  {
    id: "advanced-8",
    number: 8,
    title: "에너지교육",
    hours: "8차시",
    group: "주제 학습 모듈",
    description: "학교 제안서의 에너지교육 8차시를 학년별 상세 모듈로 연결",
    details: [],
    variants: [
      {
        title: "에너지 절약과 실천",
        audience: "3~4학년",
        details: [
          { lesson: "1-2", content: "아바타 꾸미기", description: "에너지 히어로 아바타 꾸미기" },
          { lesson: "3-4", content: "에너지 아이템 모으기 대작전", description: "조건/변수 기능 활용, 에너지 종류 학습, 월드 제작" },
          { lesson: "5-6", content: "에너지 낭비를 막아라", description: "반복/조건 기능 활용, 에너지 절약 방법 학습, 월드 제작" },
          { lesson: "7-8", content: "에너지 절약 함께해요", description: "입/출력 기능 활용, 에너지 절약 슬로건 제작, 캠페인 월드 제작" },
        ],
        referenceFiles: [
          "(3-4학년) 에너지 절약과 실천 수업계획안_1-2차시.pdf",
          "(3-4학년) 에너지 절약과 실천 수업계획안_3-4차시.pdf",
          "(3-4학년) 에너지 절약과 실천 수업계획안_5-6차시.pdf",
          "(3-4학년) 에너지 절약과 실천 수업계획안_7-8차시.pdf",
          "(3-4학년)교사용_학급 및 학생계정 만들기, 과제 제출하기.pptx",
          "(3-4학년)에너지 절약과 실천 1-2차시_에너지 히어로의 탄생.pptx",
          "(3-4학년)에너지 절약과 실천 3-4차시_에너지 아이템 모으기 대작전.pptx",
          "(3-4학년)에너지 절약과 실천 5-6차시_에너지 낭비를 막아라.pptx",
          "(3-4학년)에너지 절약과 실천 7-8차시_에너지 절약 함께해요 캠페인.pptx",
          "3-4차시 에너지 아이템 모으기 대작전 코드.pdf",
          "5-6차시 에너지 낭비를 막아라 코드.pdf",
          "7-8차시 에너지 절약 함께해요 캠페인 코드.pdf",
        ],
      },
      {
        title: "에너지와 기후변화",
        audience: "5~6학년",
        details: [
          { lesson: "1-2", content: "기후변화, 왜 생길까?", description: "기후변화, 지구온난화, 온실가스 개념 알기" },
          { lesson: "3-4", content: "탄소발자국 줄이기", description: "탄소발자국 개념 및 퀴즈게임 체험, 나만의 퀴즈게임 만들기" },
          { lesson: "5-6", content: "기후변화에 대응하라!", description: "기후변화 개념 및 시뮬레이션 맵 체험, 나만의 시뮬레이션 맵 제작" },
          { lesson: "7-8", content: "도시를 구하라", description: "탄소중립도시 기획, 미로탈출 맵 제작, 게임 공유·피드백·수정" },
        ],
        referenceFiles: [
          "(5-6학년) 에너지와 기후변화_수업계획안_1-2차시.pdf",
          "(5-6학년) 에너지와 기후변화_수업계획안_3-4차시.pdf",
          "(5-6학년) 에너지와 기후변화_수업계획안_5-6차시.pdf",
          "(5-6학년) 에너지와 기후변화_수업계획안_7-8차시.pdf",
          "(5-6학년) 에너지와 기후변화_1,2차시_기후변화 왜 생길까.pptx",
          "(5-6학년) 에너지와 기후변화_3,4차시_탄소발자국 줄이기.pptx",
          "(5-6학년) 에너지와 기후변화_5,6차시_기후변화에 대응하라.pptx",
          "(5-6학년) 에너지와 기후변화_7,8차시_도시를 구하라.pptx",
        ],
      },
    ],
    note: "상세자료 원본 9-1, 9-2를 학교 제안서 공식 심화 8에 학년별로 연결",
  },
  {
    id: "advanced-9",
    number: 9,
    title: "관계개선교육",
    hours: "5차시",
    audience: "5~6학년",
    group: "주제 학습 모듈",
    description: "창의적체험활동 친구사랑과 연계하여 경청과 공감을 배우고 '친친 맵'을 제작·체험하는 모듈",
    details: [
      { lesson: "1", content: "피해야 산다", description: "친구와 협력하여 게임하고 협력 조건을 지키며 서로에 대한 마음 점검" },
      { lesson: "2", content: "관계 개선 교육", description: "친구 사랑 게임 체험, 오브젝트 설치 순서 및 사용된 블록 코딩 이해" },
      { lesson: "3-4", content: "관계 개선 교육", description: "맵 제작, 게임 제작 및 디버깅" },
      { lesson: "5", content: "관계 개선 교육", description: "맵 소개서 작성 및 친구들의 맵 체험" },
    ],
    referenceFiles: ["헬로메이플계기교육_09 관계개선교육.pdf", "9_친구사랑_2025 리뉴얼.pptx"],
    note: "상세자료 원본 10번을 학교 제안서 공식 심화 9에 매핑",
  },
  {
    id: "advanced-10",
    number: 10,
    title: "인공지능 첫걸음",
    hours: "8차시",
    group: "주제 학습 모듈",
    description: "인공지능의 발전 과정과 핵심 개념을 이해하고 데이터·머신러닝·딥러닝 원리를 체험하는 모듈",
    details: [
      { lesson: "1-2", content: "업로드 예정", description: "인공지능의 역사: 발전 과정과 인간의 삶에 미친 영향 탐구" },
      { lesson: "3-4", content: "업로드 예정", description: "인공지능 데이터: 데이터 개념과 학습 데이터의 중요성" },
      { lesson: "5-6", content: "업로드 예정", description: "인공지능 머신러닝: 퀵드로우·티처블머신 체험 및 간단한 학습 모델 제작" },
      { lesson: "7-8", content: "업로드 예정", description: "인공지능 딥러닝: 개념과 작동 원리, 헬로메이플을 통한 학습 방식 체험" },
    ],
    status: "원본표: 26년도 상반기 업로드 예정",
    note: "상세자료 원본 11번을 학교 제안서 공식 심화 10에 매핑",
  },
  {
    id: "advanced-11",
    number: 11,
    title: "인공지능 윤리 탐험대",
    hours: "6차시",
    group: "주제 학습 모듈",
    description: "인공지능의 유용성과 윤리 필요성, 개인정보 침해 및 보호를 학습하는 모듈",
    details: [
      { lesson: "1-2", content: "인공지능 윤리 탐험대", description: "사람을 돕는 인공지능: 다양한 활용 분야와 유용성 이해" },
      { lesson: "3-4", content: "인공지능 윤리 탐험대", description: "인공지능 윤리의 필요성: 발생 가능한 문제와 윤리의 필요성 이해" },
      { lesson: "5-6", content: "인공지능 윤리 탐험대", description: "인공지능으로 인한 개인정보 침해 사례와 예방 방법" },
      { lesson: "7-8", content: "인공지능 윤리 탐험대", description: "개인정보를 보호하는 인공지능 만들기, 인공지능과 개인정보의 관계 이해" },
    ],
    status: "원본표: 26년도 상반기 업로드 예정",
    note: "학교 제안서는 6차시이나 상세자료에는 7-8차시 항목까지 기재되어 있어 둘 다 원문 기준으로 표시",
  },
  {
    id: "advanced-12",
    number: 12,
    title: "수학·과학 융합_사라진 예티를 찾아서",
    hours: "4차시",
    audience: "4~5학년",
    group: "주제 학습 모듈",
    description: "중력에 의한 낙하, 발판·사다리 이동 등의 게임 규칙을 분석하고 이동과 발판 구성을 코딩하는 모듈",
    details: [
      { lesson: "1", content: "사라진 예티를 찾아서", description: "원본 게임 규칙 분석 및 아이디어 구상" },
      { lesson: "2", content: "사라진 예티를 찾아서", description: "기본 맵 구현: 중력, 발판/사다리, 포탈 기능" },
      { lesson: "3", content: "사라진 예티를 찾아서", description: "실습" },
      { lesson: "4", content: "사라진 예티를 찾아서", description: "리메이크 확장 및 발표" },
    ],
    referenceFiles: ["헬로메이플 교안-중력 낙하 어드벤처(교사용)", "헬로메이플 교안-중력 낙하 어드벤처(학생용)"],
    note: "상세자료 원본 14번 '중력 낙하 어드벤처 : 사라진 예티를 찾아서'를 학교 제안서 공식 심화 12에 매핑",
  },
  {
    id: "advanced-13",
    number: 13,
    title: "음악·예술 융합_요정계 아이돌 데뷔 프로젝트",
    hours: "4차시",
    audience: "5~6학년",
    group: "주제 학습 모듈",
    description: "상자 미션, 아이템 수집, 공연 완성 규칙을 분석하고 키 입력·아이템 획득·무대 표시 기능을 코딩하는 모듈",
    details: [
      { lesson: "1", content: "요정계 아이돌 데뷔 프로젝트", description: "인트로 및 원본 게임 규칙 분석" },
      { lesson: "2", content: "요정계 아이돌 데뷔 프로젝트", description: "키보드 미션 구현: 방향키 입력 미션" },
      { lesson: "3", content: "요정계 아이돌 데뷔 프로젝트", description: "무대 장비 수집 및 리메이크 확장: 도구 아이템 획득 및 무대 화면 표시 기능 코딩" },
      { lesson: "4", content: "요정계 아이돌 데뷔 프로젝트", description: "공연 완성 및 발표: 공연 맵 시연 및 피드백" },
    ],
    referenceFiles: ["헬로메이플 교안-요정계 아이돌 데뷔 프로젝트(교사용)", "헬로메이플 교안-요정계 아이돌 데뷔 프로젝트(학생용)"],
    note: "상세자료 원본 13번을 학교 제안서 공식 심화 13에 매핑",
  },
];

export const REFERENCE_2026: CurriculumItem[] = [
  {
    id: "reference-lowgrade-game-literacy",
    number: null,
    title: "헬로메이플 활용 게임 리터러시 학습(저학년)",
    hours: "6차시",
    group: "별도 참고 모듈",
    description: "게임 리터러시와 블록 코딩의 기초를 학습하고 튜토리얼을 바탕으로 자신만의 월드를 제작하는 저학년 대상 모듈",
    details: [
      { lesson: "1", content: "월드 템플릿 만들기", description: "게임 이해하기" },
      { lesson: "2", content: "월드 템플릿 만들기", description: "게임 윤리 이해하기" },
      { lesson: "3", content: "월드 템플릿 만들기", description: "게임 리터러시 이해하기" },
      { lesson: "4", content: "월드 템플릿 만들기", description: "저학년 자기 이해 활동" },
      { lesson: "5", content: "월드 템플릿 만들기", description: "저학년 맵 꾸미기" },
      { lesson: "6", content: "월드 템플릿 만들기", description: "저학년 말하기 블록 활용" },
    ],
    referenceFiles: [
      "헬로메이플완전정복_기초부터개발까지_교사용.pdf",
      "헬로메이플완전정복_기초부터개발까지_학생용.pdf",
    ],
    note: "학교 제안서 공식 심화 1~13에 같은 제목의 항목이 없어 별도 참고 모듈로 보관",
  },
];

export const ALL_2026_ITEMS = [...BASIC_2026, ...ADVANCED_2026, ...REFERENCE_2026];

export function getCurriculumItem(id: string) {
  return ALL_2026_ITEMS.find((item) => item.id === id);
}
