import type { ByeolbyeolNote } from "./historyTimelineByeolbyeolTypes";
/**
 * 기존 교재 핵심 더 보기 및 별별한국사 1차 보충에 없는 주제 위주의 2차 학습 정리.
 * 출처 단원명은 교사용 검증 자료이며 학생용 API에서는 반환하지 않는다.
 */
type PrivateNote = ByeolbyeolNote & { reference: { book: string; section: string } };
export const HISTORY_TIMELINE_BYEOLBYEOL_MORE_NOTES: Readonly<Record<string, PrivateNote[]>> = {
  "silla-nine-provinces": [
    {
      "level": "basic",
      "heading": "통일 신라의 군사 조직",
      "points": [
        "통일 신라는 중앙군인 9서당과 지방군인 10정을 두었어요.",
        "9주 5소경과 함께 보면 넓어진 영토를 다스리기 위해 행정 조직과 군사 조직을 정비한 흐름을 알 수 있어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "04-1 통일 신라 전기"
      }
    }
  ],
  "balhae-deungju-attack": [
    {
      "level": "basic",
      "heading": "발해와 당나라의 갈등",
      "points": [
        "무왕 때 장문휴가 이끄는 발해 수군이 당나라의 등주를 공격했어요.",
        "무왕의 강경한 대외 정책과 문왕 때의 제도 정비를 구분하면 발해 역사를 이해하기 쉬워요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "04-3 발해"
      }
    }
  ],
  "goryeo-simu-982": [
    {
      "level": "basic",
      "heading": "최승로가 건의한 지방 제도",
      "points": [
        "최승로는 유교 정치 이념을 바탕으로 나라를 다스릴 것을 건의했어요.",
        "성종은 지방에 12목을 설치하고 지방관을 파견하는 등 통치 제도를 정비했어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "08-1 초기 정치"
      }
    }
  ],
  "goryeo-military-coup-1170": [
    {
      "level": "basic",
      "heading": "무신들이 정권을 잡은 배경",
      "points": [
        "고려에서는 문신 중심의 정치 운영과 무신에 대한 차별에 불만이 쌓였어요.",
        "1170년 무신 정변 이후 무신 집권이 이어졌고, 농민·천민의 저항도 여러 차례 나타났어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "08-2 문벌 사회의 동요"
      }
    }
  ],
  "goryeo-samguk-yusa-1285": [
    {
      "level": "basic",
      "heading": "『삼국유사』와 고조선 건국 이야기",
      "points": [
        "일연의 『삼국유사』에는 단군의 고조선 건국 이야기 등 여러 전승이 담겨 있어요.",
        "김부식의 『삼국사기』와 함께 고려 사람들이 옛 역사를 기록한 방식을 비교할 수 있어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "11-1 유학의 발달과 역사서의 편찬"
      }
    }
  ],
  "goryeo-wihwado-1388": [
    {
      "level": "basic",
      "heading": "위화도 회군 뒤의 정치 변화",
      "points": [
        "이성계가 위화도에서 회군한 뒤 고려의 권력 관계가 크게 달라졌어요.",
        "이후 신진 사대부 사이에서도 개혁 방향을 둘러싼 의견 차이가 나타났고, 1392년 조선 건국으로 이어졌어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "09-2 몽골의 침입과 고려의 멸망"
      }
    }
  ],
  "joseon-sejong-1418": [
    {
      "level": "basic",
      "heading": "세종 시대의 과학 기구",
      "points": [
        "해시계인 앙부일구와 물시계인 자격루 등 시간을 측정하는 기구가 제작되었어요.",
        "과학 기구의 발전은 농사와 국가 운영에 필요한 시간을 정확히 알아보려는 노력과 연결돼요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "13-1 조선의 건국과 체제 정비"
      }
    }
  ],
  "joseon-jo-gwangjo-1515": [
    {
      "level": "basic",
      "heading": "조광조가 추진한 개혁",
      "points": [
        "조광조는 능력 있는 인재를 추천으로 뽑는 현량과를 실시했어요.",
        "소격서를 폐지하는 등 유교 정치 이념을 강화하려 했으나 기묘사화로 개혁이 중단되었어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "14-1 붕당 정치와 전란 이후의 정치 변화"
      }
    }
  ],
  "joseon-gwanghae-1608": [
    {
      "level": "basic",
      "heading": "광해군의 외교와 세금 개혁",
      "points": [
        "광해군은 명나라와 후금 사이에서 조선의 피해를 줄이려는 외교 정책을 펼쳤어요.",
        "경기도에 대동법을 시행한 것도 광해군 때의 중요한 정책이에요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "14-1 붕당 정치와 전란 이후의 정치 변화"
      }
    }
  ],
  "joseon-sukjong-1674": [
    {
      "level": "basic",
      "heading": "붕당 사이의 정권 교체",
      "points": [
        "숙종 때는 국왕이 정치 세력을 급격히 바꾸는 환국이 여러 차례 일어났어요.",
        "예송 논쟁은 왕실 예법 문제를 둘러싼 서인과 남인의 대립을 보여 줘요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "14-1 붕당 정치와 전란 이후의 정치 변화"
      }
    }
  ],
  "joseon-jeongjo-1776": [
    {
      "level": "basic",
      "heading": "정조의 개혁과 규장각",
      "points": [
        "정조는 규장각을 개혁 정치와 학문 연구의 중심 기구로 활용했어요.",
        "장용영을 설치하여 국왕을 지키는 군사력을 강화했어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "14-4 탕평 정략과 갈등·독도"
      }
    }
  ],
  "joseon-honggyeongrae-1811": [
    {
      "level": "basic",
      "heading": "홍경래의 난이 일어난 배경",
      "points": [
        "홍경래의 난은 평안도 지역에 대한 차별과 사회·경제적 불만 등이 쌓인 가운데 일어났어요.",
        "세도 정치 시기의 혼란과 지방 사회의 갈등을 함께 살펴볼 수 있어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "15-2 농업·상업·수공업·광업"
      }
    }
  ],
  "joseon-farmer-uprising-1862": [
    {
      "level": "basic",
      "heading": "삼정의 문란과 농민 봉기",
      "points": [
        "전정·군정·환곡의 운영이 문란해지면서 농민의 부담이 커졌어요.",
        "진주에서 시작된 농민 봉기가 여러 지역으로 퍼지자 정부는 삼정이정청을 설치했어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "16-1 신분 제도의 변동"
      }
    }
  ],
  "empire-proclaimed-1897": [
    {
      "level": "basic",
      "heading": "대한제국의 광무개혁",
      "points": [
        "대한제국은 '옛 제도를 근본으로 하고 새로운 제도를 참고한다'는 구본신참의 방향 아래 개혁을 추진했어요.",
        "토지 측량과 지계 발급 등 근대적 국가 운영을 위한 사업이 진행되었어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "21-3 독립 협회와 대한 제국"
      }
    }
  ],
  "colonial-provisionalgov-1919": [
    {
      "level": "basic",
      "heading": "임시정부의 활동 조직",
      "points": [
        "대한민국 임시정부는 독립운동을 연결하기 위해 연통제와 교통국 등의 조직을 운영했어요.",
        "국민을 대표하는 정부를 세우고 나라를 되찾으려 했다는 점에서 의미가 있어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "25-2 대한민국 임시 정부"
      }
    }
  ],
  "colonial-singanhae-1927": [
    {
      "level": "basic",
      "heading": "신간회와 근우회",
      "points": [
        "신간회는 비타협적 민족주의 계열과 사회주의 계열 등이 힘을 합쳐 조직했어요.",
        "1927년에 만들어진 근우회는 여성의 권익과 민족 운동을 위해 활동했어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "26-2 대중 운동, 의열단, 민족 문화 수호 운동"
      }
    }
  ],
  "republic-april19-1960": [
    {
      "level": "basic",
      "heading": "3·15 부정선거와 4·19 혁명",
      "points": [
        "1960년 3·15 부정선거에 항의하는 시위가 일어났고 학생과 시민의 참여가 전국으로 퍼졌어요.",
        "4·19 혁명 이후 이승만 대통령이 물러났어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "29-1 이승만 정부·박정희 정부"
      }
    }
  ],
  "republic-june1987-1987": [
    {
      "level": "basic",
      "heading": "6월 민주 항쟁 이후의 변화",
      "points": [
        "시민들의 민주화 요구가 커지면서 6·29 민주화 선언이 발표되었어요.",
        "이후 대통령 직선제를 도입하는 헌법 개정이 이루어졌어요."
      ],
      "reference": {
        "book": "별별 한국사 능력검정시험 기본",
        "section": "29-2 전두환 정부·김대중 정부"
      }
    }
  ]
};
