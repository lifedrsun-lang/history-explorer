import type { TimelineExamLink } from "./historyTimelineExam";

// 검증 자료: 제63·64회, 제75회 기본(2026-10-22 검증), 제79회 기본(2026-10-23 검증).
// 두 회차는 운영 문제은행에 등록됐다는 재조회 기록이 있음.
// "answer"는 해당 연표 사건이 정답을 판정하는 핵심 역사 사실일 때만 사용.
// "context"는 동일 역사 사건/유적이 자료나 지문에 나오지만 직접 정답은 아닐 때 사용.
// 숫자 ID는 시험 회차·급수·문항 번호이며, Firestore 원본 문서 ID를 추정하지 않음.
// 모든 연결은 현행 연표에 존재하는 특정 사건 ID로만 연결하며, 없는 사건은 대기로 둠.
const VERIFIED: Record<string, TimelineExamLink[]> = {
  "basic:75:1": [{ eventId: "prehistoric-paleolithic-begins", relation: "context" }],
  "basic:75:2": [{ eventId: "goguryeo-pyeongyang-move", relation: "answer" }],
  "basic:75:5": [{ eventId: "baekje-ungjin-capital", relation: "context" }],
  "basic:75:7": [
    { eventId: "silla-natang-campaign", relation: "answer" },
    { eventId: "baekje-falls", relation: "context" },
  ],
  "basic:75:8": [{ eventId: "silla-jangbogo-cheonghaejin", relation: "answer" }],
  "basic:79:1": [{ eventId: "prehistoric-bronze-culture-spreads", relation: "context" }],
  "basic:79:2": [{ eventId: "gojoseon-falls", relation: "answer" }],
  "basic:79:3": [{ eventId: "baekje-onjo-founded", relation: "context" }],
  "basic:79:8": [{ eventId: "silla-kimchunchu-tang", relation: "answer" }],
  // 제63·64회 기본: 운영 등록 검증서 'production-release-report.md'의
  // 문항별 정답 주제와 기존 연표 사건명을 대조한 추가 연결.
  "basic:63:1": [{ eventId: "prehistoric-neolithic-begins", relation: "context" }],
  "basic:63:3": [{ eventId: "goguryeo-cheolli", relation: "context" }],
  "basic:63:5": [{ eventId: "baekje-chiljido", relation: "answer" }],
  "basic:63:11": [
    { eventId: "goryeo-ija-gyeom-revolt-1126", relation: "context" },
    { eventId: "goryeo-myo-cheong-revolt-1135", relation: "context" },
    { eventId: "goryeo-military-coup-1170", relation: "context" },
  ],
  "basic:63:21": [{ eventId: "goryeo-gwiju-1019", relation: "answer" }],
  "basic:64:1": [{ eventId: "prehistoric-bronze-culture-spreads", relation: "context" }],
  "basic:64:2": [{ eventId: "dongye-mucheon", relation: "answer" }],
  "basic:64:4": [{ eventId: "goguryeo-yeongaesomun-coup", relation: "answer" }],
  "basic:64:7": [{ eventId: "silla-late-disorder", relation: "context" }],
  "basic:64:10": [{ eventId: "goryeo-gwageo-958", relation: "answer" }],
  "basic:64:11": [{ eventId: "goryeo-yun-gwan-1107", relation: "answer" }],
  "basic:64:14": [{ eventId: "goryeo-military-coup-1170", relation: "answer" }],
  "basic:64:16": [{ eventId: "silla-hwangnyongsa", relation: "answer" }],
  // 제75·79회 기본: 저장·정답 검증서의 문항별 핵심 주제 참조.
  // 시대별 사건의 '순서'를 묻는 문제는 단일 사건의 직접 정답 횟수로 세지 않음.
  "basic:75:11": [
    { eventId: "goryeo-myo-cheong-revolt-1135", relation: "context" },
    { eventId: "goryeo-military-coup-1170", relation: "context" },
    { eventId: "goryeo-manjeok-1198", relation: "context" },
  ],
  "basic:75:17": [{ eventId: "goryeo-yun-gwan-1107", relation: "answer" }],
  "basic:79:12": [{ eventId: "goryeo-gwiju-1019", relation: "answer" }],
  "basic:79:13": [{ eventId: "goryeo-military-coup-1170", relation: "answer" }],
  // 2026-11-05 재대조: 1~23호 전체 연표 확장에 따라 연결 가능해진 문항.
  // 출처: 제63·64·75·79회 기본 운영 등록 검증표의 문항별 정답 핵심 주제.
  // 사건의 직접 정답이 아닌 배경·자료 및 역사 순서 문항은 context로 구분한다.
  "basic:63:17": [{ eventId: "goryeo-gwajeon-1391", relation: "answer" }],
  "basic:63:28": [{ eventId: "joseon-hwaseong-1796", relation: "answer" }],
  "basic:64:17": [{ eventId: "goryeo-hwangsan-1380", relation: "answer" }],
  "basic:64:22": [{ eventId: "joseon-byeongja-1636", relation: "context" }],
  "basic:64:27": [{ eventId: "joseon-honggyeongrae-1811", relation: "answer" }],
  "basic:64:28": [{ eventId: "joseon-unyo-1875", relation: "answer" }],
  "basic:64:29": [{ eventId: "joseon-imogunran-1882", relation: "answer" }],
  "basic:64:35": [{ eventId: "colonial-cheongsanri-1920", relation: "answer" }],
  "basic:64:36": [{ eventId: "colonial-korean-liberation-army-1940", relation: "answer" }],
  "basic:64:41": [{ eventId: "republic-june1987-1987", relation: "context" }],
  "basic:75:21": [{ eventId: "joseon-byeongja-1636", relation: "context" }],
  "basic:75:23": [{ eventId: "joseon-gimyo-1519", relation: "answer" }],
  "basic:75:25": [{ eventId: "joseon-tangpyeong-1725", relation: "context" }],
  "basic:75:26": [{ eventId: "joseon-bakjiwon-1780", relation: "answer" }],
  "basic:75:37": [{ eventId: "colonial-singanhae-1927", relation: "context" }, { eventId: "colonial-gwangju-students-1929", relation: "context" }],
  "basic:75:46": [{ eventId: "republic-april19-1960", relation: "answer" }],
  "basic:75:47": [{ eventId: "republic-koreanwar-1950", relation: "context" }],
  "basic:75:50": [{ eventId: "empire-eulsa-1905", relation: "answer" }],
  "basic:79:19": [{ eventId: "goryeo-gwajeon-1391", relation: "answer" }],
  "basic:79:21": [{ eventId: "joseon-hunminjeongeum-1443", relation: "answer" }],
  "basic:79:26": [{ eventId: "joseon-honggyeongrae-1811", relation: "answer" }],
  "basic:79:27": [{ eventId: "joseon-mokminsimseo-1818", relation: "answer" }],
  "basic:79:29": [{ eventId: "joseon-byeonginyangyo-1866", relation: "context" }],
  "basic:79:31": [{ eventId: "joseon-tangpyeong-1725", relation: "context" }],
  "basic:79:32": [{ eventId: "joseon-independence-club-1896", relation: "context" }],
  "basic:79:35": [{ eventId: "empire-eulsa-1905", relation: "context" }],
  "basic:79:37": [{ eventId: "colonial-june10-1926", relation: "answer" }, { eventId: "colonial-singanhae-1927", relation: "context" }],
  "basic:79:43": [{ eventId: "colonial-yunbonggil-1932", relation: "answer" }],
  "basic:79:47": [{ eventId: "republic-april19-1960", relation: "answer" }],
  "basic:79:50": [{ eventId: "goryeo-mangi-mangsoi-1176", relation: "context" }],
};

export function knownTimelineExamLinks(examLevel: unknown, examRound: unknown,
  examQuestionNumber: unknown): TimelineExamLink[] {
  const level = String(examLevel ?? "").trim();
  const round = Number(String(examRound ?? "").trim());
  const number = Number(String(examQuestionNumber ?? "").trim());
  if (!["basic", "advanced"].includes(level) ||
      !Number.isInteger(round) || round <= 0 ||
      !Number.isInteger(number) || number < 1 || number > 50) return [];
  return VERIFIED[`${level}:${round}:${number}`] || [];
}


// 기존 정답 검증표에서 주제는 확인됐지만, 현재 연표에 해당 세부 사건 카드가 없는 문항.
// 이 목록은 '정답·지문 대조 필요'와 구별하여 교사용 대기 목록에만 사용한다.
// 완전히 동일한 사건 카드를 확인하기 전까지 연표 출제 횟수에는 포함하지 않는다.
const AWAITING_EVENT = new Set([
  "basic:63:2",   // 고조선 범금 8조
  "basic:63:4",   // 신라 화백회의
  "basic:63:6",   // 발해 해동성국
  "basic:63:7",   // 신라 집사부
  "basic:63:8",   // 통일 신라 동시전
  "basic:63:9",   // 최치원
  "basic:63:10",  // 태조 왕건 기인제도
  "basic:63:12",  // 고려 지방 통치 양계·병마사
  "basic:63:13",  // 고구려 경당
  "basic:64:5",   // 신라 골품제
  "basic:64:6",   // 분황사 모전석탑
  "basic:64:8",   // 공산 전투
  "basic:64:9",   // 발해 영광탑
  "basic:64:12",  // 숙종 해동통보
  "basic:64:13",  // 팔만대장경판
  "basic:64:15",  // 왕건 흑창
  "basic:75:3",   // 고조선 범금 8조
  "basic:75:4",   // 가야 금동관
  "basic:75:6",   // 통일 신라 국학
  "basic:75:9",   // 발해 해동성국
  "basic:75:10",  // 고려 성종 12목
  "basic:75:12",  // 왕건 사심관 제도
  "basic:79:4",   // 진흥왕 화랑도 정비 (즉위 사건과 구분)
  "basic:79:5",   // 발해 정효공주 무덤 벽화
  "basic:79:6",   // 신라 골품제
  "basic:79:7",   // 관촉사 석조미륵보살입상
  "basic:79:9",   // 발해 연꽃무늬 수막새
  "basic:79:10",  // 왕건 훈요10조
  "basic:79:11",  // 고려 양계·북계·동계
]);

export function knownTimelineExamPending(examLevel: unknown, examRound: unknown,
  examQuestionNumber: unknown): boolean {
  const level = String(examLevel ?? "").trim();
  const round = Number(String(examRound ?? "").replace(/\D/g, ""));
  const number = Number(String(examQuestionNumber ?? "").replace(/\D/g, ""));
  return Number.isInteger(round) && Number.isInteger(number) &&
    AWAITING_EVENT.has(`${level}:${round}:${number}`);
}
