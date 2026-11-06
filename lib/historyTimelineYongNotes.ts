import type { YongSource } from "./historyTimelineYongEvents";
import { YONG_PHASE_TWO_NOTES } from "./historyTimelinePhaseTwoYongNotes";
import { YONG_PHASE_TWO_MORE_NOTES } from "./historyTimelinePhaseTwoMoreYongNotes";
import { YONG_PHASE_TWO_BATCH_TWO_NOTES } from "./historyTimelinePhaseTwoBatchTwoYongNotes";
/** 용선생 교과서 한국사 1·2권 인쇄쪽의 학습 흐름을 교사용으로 재서술한 내용.
 * 원문을 복제하지 않으며 기출 문제은행에는 연결하지 않는다.
 */
export type YongNote = { heading: string; points: string[]; source: YongSource };
export const YONG_TIMELINE_NOTES: Readonly<Record<string,YongNote[]>> = {
  "gojoseon-dangun-founding": [
    {
      "heading": "고조선의 시작과 건국 전승",
      "points": [
        "고조선의 건국 이야기는 당시 사회의 모습과 정치 권력이 형성되는 과정을 이해하는 자료예요.",
        "기원전 2333년이라는 건국 연도는 전승상의 기록으로, 현대 역사학에서 확정한 연도로 다루지 않아요."
      ],
      "source": {
        "volume": 1,
        "printedPage": 30
      }
    }
  ],
  "goguryeo-gwanggaeto-king": [
    {
      "heading": "고구려의 성장과 삼국 관계",
      "points": [
        "광개토 대왕 때 고구려는 주변 지역으로 세력을 넓혔어요.",
        "장수왕의 평양 천도와 남진 정책을 함께 연결하면 고구려의 대외 정책 변화가 보여요."
      ],
      "source": {
        "volume": 1,
        "printedPage": 48
      }
    }
  ],
  "silla-unification": [
    {
      "heading": "삼국 통일은 한 번의 전투로 이루어지지 않았어요",
      "points": [
        "660년 백제 멸망, 668년 고구려 멸망 뒤에도 당나라와 신라 사이의 전쟁이 계속되었어요.",
        "676년 나당 전쟁이 마무리되며 신라의 삼국 통일이 완성되는 흐름을 살펴봐요."
      ],
      "source": {
        "volume": 1,
        "printedPage": 70
      }
    }
  ],
  "goryeo-founded-918": [
    {
      "heading": "후삼국 통일의 순서",
      "points": [
        "왕건은 918년에 고려를 세웠지만 후삼국 통일은 936년에 이루어졌어요.",
        "930년 고창 전투와 935년 신라의 귀부 등을 함께 보면 통일의 과정을 이해하기 쉬워요."
      ],
      "source": {
        "volume": 1,
        "printedPage": 96
      }
    }
  ],
  "goryeo-ija-gyeom-revolt-1126": [
    {
      "heading": "고려 중기의 정치적 갈등",
      "points": [
        "문벌 귀족 사회의 권력 집중과 갈등은 1126년 이자겸의 난과 1135년 묘청의 난으로 나타났어요.",
        "이후 1170년 무신 정변까지 이어지는 정치 변화를 함께 살펴봐요."
      ],
      "source": {
        "volume": 1,
        "printedPage": 136
      }
    }
  ],
  "goryeo-wihwado-1388": [
    {
      "heading": "고려 말 외침과 개혁의 관계",
      "points": [
        "몽골 침입 이후 고려는 왜구와 홍건적의 침입을 겪었고 정치·사회적 변화도 계속되었어요.",
        "공민왕의 개혁과 위화도 회군, 새 왕조 건국으로 이어지는 과정은 서로 연결돼 있어요."
      ],
      "source": {
        "volume": 1,
        "printedPage": 156
      }
    }
  ],
  "joseon-founded-1392": [
    {
      "heading": "조선의 건국과 새로운 통치 제도",
      "points": [
        "1392년 조선 건국 뒤 1394년 한양 천도, 8도 체제 정비 등 국가 운영의 기반을 마련했어요.",
        "왕권과 신하의 권한을 둘러싼 논의도 함께 진행되었어요."
      ],
      "source": {
        "volume": 1,
        "printedPage": 180
      }
    }
  ],
  "joseon-hunminjeongeum-1443": [
    {
      "heading": "훈민정음 창제와 반포를 구분해요",
      "points": [
        "세종은 1443년에 훈민정음을 창제했고, 1446년에 반포했어요.",
        "백성이 자신의 말을 글로 쉽게 나타내도록 하려는 노력이라는 점을 기억해요."
      ],
      "source": {
        "volume": 1,
        "printedPage": 200
      }
    }
  ],
  "joseon-seongjong-1469": [
    {
      "heading": "조선 전기 통치 체제 정비",
      "points": [
        "세조 때부터 편찬되던 법전 『경국대전』은 성종 때 완성되어 시행되었어요.",
        "사림의 성장과 서원의 확산은 조선 정치·사회의 변화를 이해하는 중요한 흐름이에요."
      ],
      "source": {
        "volume": 1,
        "printedPage": 218
      }
    }
  ],
  "joseon-imjinwar-1592": [
    {
      "heading": "두 차례 일본의 침략과 전후 변화",
      "points": [
        "1592년 임진왜란이 시작되었고 전쟁이 소강상태에 들어간 뒤 1597년 다시 일본군이 침입했어요.",
        "1598년 전쟁이 끝난 뒤 조선은 전쟁으로 피해를 입은 사회를 복구해야 했어요."
      ],
      "source": {
        "volume": 1,
        "printedPage": 238
      }
    }
  ],
  "joseon-gwanghae-1608": [
    {
      "heading": "대동법을 통해 본 공납 제도 개혁",
      "points": [
        "공납 운영 과정에서 백성의 부담이 커지자 대동법이 시행되어 납부 방식을 바꾸었어요.",
        "1608년 경기도에서 시작한 대동법은 전국으로 한꺼번에 확대된 것이 아니에요."
      ],
      "source": {
        "volume": 2,
        "printedPage": 12
      }
    }
  ],
  "joseon-yeongjo-1724": [
    {
      "heading": "영조와 정조의 개혁을 연결해요",
      "points": [
        "영조는 탕평 정치를 내세우고 1750년 균역법을 시행했어요.",
        "정조는 규장각을 활용하고 1796년 수원 화성을 완공하는 등 개혁을 추진했어요."
      ],
      "source": {
        "volume": 2,
        "printedPage": 30
      }
    }
  ],
  "joseon-honggyeongrae-1811": [
    {
      "heading": "세도 정치 시대의 사회적 불만",
      "points": [
        "19세기 초 세도 정치 아래에서 지역 차별과 부패에 대한 불만이 쌓였어요.",
        "1811년 홍경래의 난과 1862년 농민 봉기를 비교하면 민중 저항의 배경을 알 수 있어요."
      ],
      "source": {
        "volume": 2,
        "printedPage": 54
      }
    }
  ],
  "joseon-ganghwa-1876": [
    {
      "heading": "개항과 근대적 변화의 시작",
      "points": [
        "1875년 운요호 사건 뒤 1876년 강화도 조약이 체결되었어요.",
        "개항 뒤 변화에 대응하는 방법을 두고 조선 사회 내부에서 여러 의견이 나타났어요."
      ],
      "source": {
        "volume": 2,
        "printedPage": 72
      }
    }
  ],
  "joseon-donghak-1894": [
    {
      "heading": "동학 농민 운동과 개혁",
      "points": [
        "1894년 동학 농민 운동은 지방 관리의 횡포와 사회적 모순에 대한 저항에서 시작되었어요.",
        "같은 해 추진된 갑오개혁과 동학 농민 운동은 관련이 있지만 서로 동일한 사건은 아니에요."
      ],
      "source": {
        "volume": 2,
        "printedPage": 72
      }
    }
  ],
  "colonial-march1-1919": [
    {
      "heading": "3·1 운동에서 임시정부 수립까지",
      "points": [
        "1919년 전국에서 전개된 3·1 운동은 독립의 뜻을 널리 알렸어요.",
        "이후 대한민국 임시정부의 수립 등 독립운동의 변화와 연결돼요."
      ],
      "source": {
        "volume": 2,
        "printedPage": 114
      }
    }
  ],
  "colonial-korean-liberation-army-1940": [
    {
      "heading": "전쟁 확대와 독립군의 활동",
      "points": [
        "일본의 침략 전쟁 확대에 따라 식민지 주민에 대한 동원이 강화되었어요.",
        "그런 상황에서도 대한민국 임시정부는 1940년 한국광복군을 창설하여 독립을 준비했어요."
      ],
      "source": {
        "volume": 2,
        "printedPage": 154
      }
    }
  ],
  "liberation-1945": [
    {
      "heading": "광복과 정부 수립 사이의 3년",
      "points": [
        "광복 이후 곧바로 단일 정부가 수립된 것은 아니에요. 1945년 모스크바 3국 외상 회의와 1946년 미소공동위원회 등 여러 논의가 있었어요.",
        "1948년 남한의 대한민국 정부 수립으로 이어지는 과정에서는 분단 문제가 커졌어요."
      ],
      "source": {
        "volume": 2,
        "printedPage": 176
      }
    }
  ],
  "republic-koreanwar-1950": [
    {
      "heading": "6·25 전쟁의 주요 전환점",
      "points": [
        "1950년 6월 전쟁 발발, 9월 인천 상륙 작전, 10월 중국군 개입 등으로 전선이 크게 달라졌어요.",
        "1953년 7월 정전 협정이 체결되었지만 평화 조약으로 전쟁이 완전히 종결된 것은 아니에요."
      ],
      "source": {
        "volume": 2,
        "printedPage": 196
      }
    }
  ],
  "republic-june1987-1987": [
    {
      "heading": "민주화 이후의 시민 사회 변화",
      "points": [
        "1987년 6월 민주 항쟁 이후 대통령 직선제를 도입하는 헌법 개정이 이루어졌어요.",
        "이후 지방자치의 확대와 국제 교류 등 사회의 여러 변화가 이어졌어요."
      ],
      "source": {
        "volume": 2,
        "printedPage": 216
      }
    }
  ]
};
export function getYongNotesForEvents(eventIds: Iterable<string>): Record<string,YongNote[]> {
  const ret: Record<string,YongNote[]> = {};
  for(const eventId of eventIds) {
    const notes=[...(YONG_TIMELINE_NOTES[eventId] ?? []),...(YONG_PHASE_TWO_NOTES[eventId] ?? []),...(YONG_PHASE_TWO_MORE_NOTES[eventId] ?? []),...(YONG_PHASE_TWO_BATCH_TWO_NOTES[eventId] ?? [])];
    if (notes?.length) ret[eventId]=notes.map(n=>({heading:n.heading,points:[...n.points],source:n.source}));
  }
  return ret;
}
