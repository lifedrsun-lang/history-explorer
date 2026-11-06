import type { HistoryReferenceGroup } from "./historyTimelineReferenceGroups";
/** 2차 참고문헌 지면 직접 대조: 로빈의 한국사 PDF121쪽 / 한국사 읽기책 PDF117,45쪽.
 * 업로드 교재의 역사 사실을 초등 교재 수준으로 재서술; 책 원문은 복제하지 않음. */
export type HistoryReferenceNote = { referenceGroup: Extract<HistoryReferenceGroup,"robin"|"reading">; heading:string; points:string[]; source:{book:string;pdfPage:number} };
const VERIFIED_REFERENCE_NOTES: Readonly<Record<string,readonly HistoryReferenceNote[]>> = {
  "goryeo-founded-918": [
    {
      "referenceGroup": "robin",
      "heading": "고려 태조의 사심관·기인 제도",
      "points": [
        "왕건은 지방 호족 세력을 중앙 정부와 연결하기 위해 사심관 제도와 기인 제도를 활용했어요.",
        "사심관 제도는 중앙의 관료에게 연고 지역을 관리하도록 책임을 지우고, 기인 제도는 지방 호족의 자제를 수도에 머무르게 해 지방 세력과의 관계를 관리하려는 제도였어요."
      ],
      "source": {
        "book": "한 권으로 끝내는 로빈의 한국사",
        "pdfPage": 121
      }
    }
  ],
  "goryeo-gongmin-1351": [
    {
      "referenceGroup": "reading",
      "heading": "고려 후기 권문세족과 신진 사대부",
      "points": [
        "원 간섭기에는 권문세족이 성장하며 고려 정치와 사회에 큰 영향력을 끼쳤어요.",
        "고려 말에는 성리학을 바탕으로 개혁을 주장하는 신진 사대부가 성장해 기존 지배 세력과 대립했어요."
      ],
      "source": {
        "book": "한국사 읽기책",
        "pdfPage": 117
      }
    }
  ],
  "baekje-geunchogo-king": [
    {
      "referenceGroup": "reading",
      "heading": "근초고왕 때 백제의 성장과 한강 유역",
      "points": [
        "근초고왕 무렵 백제는 한강 유역을 중심으로 성장하면서 마한 지역에 대한 영향력을 넓혔어요.",
        "백제는 바닷길을 통해 중국 및 왜와 교류하며 고대 동아시아 여러 나라와 관계를 맺었어요."
      ],
      "source": {
        "book": "한국사 읽기책",
        "pdfPage": 45
      }
    }
  ]
};
export function getHistoryReferenceNotes(eventIds: Iterable<string>): Record<string,HistoryReferenceNote[]> {
  const result: Record<string,HistoryReferenceNote[]> = {};
  for(const id of eventIds){
    const notes=VERIFIED_REFERENCE_NOTES[id];
    if(notes?.length) result[id]=notes.map(n=>({referenceGroup:n.referenceGroup,heading:n.heading,points:[...n.points],source:{...n.source}}));
  }
  return result;
}
