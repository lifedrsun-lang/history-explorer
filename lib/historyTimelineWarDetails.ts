/**
 * 연표에 이미 실린 전쟁·전투·군사 충돌·항쟁 사건의 사건별 요약 정보.
 * 명확하게 확인된 결과만 기재하고, 승패가 불확실한 사건은 임의 판정하지 않는다.
 * 사건의 개요와 진행 흐름은 원본 연표의 summary/life를 그대로 표시한다.
 * UI는 이 목록의 사건 ID가 존재할 때만 "전쟁 요약 보기"를 제공한다.
 */
export type HistoryTimelineWarDetail = {
  kind: string;
  opponent?: string;
  place?: string;
  result?: string;
};

export const HISTORY_TIMELINE_WAR_DETAILS: Readonly<Record<string, HistoryTimelineWarDetail>> = {
  "gojoseon-falls": { kind: "전쟁", opponent: "한나라", place: "고조선", result: "고조선이 한나라의 공격을 받아 멸망함" },
  "baekje-mokjiguk": { kind: "군사 충돌", opponent: "목지국", place: "마한의 목지국", result: "교재 연표에 따르면 백제가 목지국을 차지함" },
  "baekje-gwamisong-lost": { kind: "전투", opponent: "고구려", place: "관미성", result: "고구려가 관미성을 차지하고 백제가 이를 잃음" },
  "silla-goguryeo-support": { kind: "전투", opponent: "가야·왜", place: "신라", result: "고구려가 신라에 군대를 보내 지원함" },
  "goguryeo-hanseong": { kind: "전투", opponent: "백제", place: "한성(백제의 수도)", result: "고구려가 한성을 차지하고 백제가 웅진으로 천도함" },
  "baekje-gwansanseong": { kind: "전투", opponent: "신라", place: "관산성", result: "백제의 성왕이 전투 중 사망함" },
  "gaya-daegaya-falls": { kind: "전쟁", opponent: "신라", place: "대가야", result: "대가야가 신라에 정복됨" },
  "goguryeo-sui-war-begins": { kind: "전쟁", opponent: "수나라", place: "고구려와 수나라의 접경 지역", result: "고구려와 수나라의 충돌이 전쟁으로 이어짐" },
  "goguryeo-salsu": { kind: "전투", opponent: "수나라", place: "살수 일대", result: "을지문덕이 이끈 고구려군이 수나라 군대를 크게 물리침" },
  "baekje-daeyaseong": { kind: "전투", opponent: "신라", place: "대야성", result: "백제가 신라의 대야성을 차지함" },
  "goguryeo-ansiseong": { kind: "전투", opponent: "당나라", place: "안시성(고구려 요동 지역)", result: "고구려가 당나라의 공격을 막고 안시성을 지켜 냄" },
  "baekje-hwangsanbeol": { kind: "전투", opponent: "신라", place: "황산벌", result: "백제군이 신라군에 맞섰으나 나당 연합군의 공격을 막지 못함" },
  "silla-natang-campaign": { kind: "전쟁", opponent: "백제", place: "백제", result: "신라·당 연합군의 공격 이후 백제가 멸망함" },
  "baekje-falls": { kind: "전쟁", opponent: "신라·당 연합군", place: "사비 등 백제 지역", result: "660년 백제가 멸망함" },
  "baekje-revival-movement": { kind: "항쟁", opponent: "신라·당 연합 세력", place: "주류성·임존성 등", result: "백제 유민들이 나라를 다시 세우려는 운동을 이어 감" },
  "goguryeo-falls": { kind: "전쟁", opponent: "신라·당 연합군", place: "평양성 등", result: "668년 고구려가 멸망함" },
  "goguryeo-revival-fails": { kind: "항쟁", opponent: "신라·당 연합 세력", place: "옛 고구려 지역", result: "고구려 부흥 운동이 결국 실패함" },
  "silla-unification": { kind: "전쟁", opponent: "당나라", place: "한반도", result: "신라가 당나라 세력을 물리치고 삼국 통일을 완성함" },
  "balhae-deungju-attack": { kind: "전투", opponent: "당나라", place: "등주(현재 중국 산둥반도)", result: "발해 장문휴가 이끄는 수군이 당나라 등주를 공격함" },
  "balhae-falls": { kind: "전쟁", opponent: "거란", place: "발해", result: "발해가 거란의 공격으로 멸망함" },
  "goryeo-khitan-first-993": { kind: "전쟁", opponent: "거란", place: "고려 북쪽 국경", result: "서희의 외교 담판 이후 고려가 강동 6주를 확보함" },
  "goryeo-khitan-second-1010": { kind: "전쟁", opponent: "거란", place: "고려 북부·개경 일대", result: "현종이 남쪽으로 피란함" },
  "goryeo-khitan-third-1018": { kind: "전쟁", opponent: "거란", place: "고려 북부", result: "이듬해 귀주 대첩으로 이어짐" },
  "goryeo-gwiju-1019": { kind: "전투", opponent: "거란", place: "귀주", result: "강감찬이 이끈 고려군이 거란군을 크게 물리침" },
  "goryeo-yun-gwan-1107": { kind: "전쟁", opponent: "여진", place: "고려 북동쪽 변경", result: "고려가 동북 9성을 쌓았으나 뒤에 여진에 돌려줌" },
  "goryeo-ija-gyeom-revolt-1126": { kind: "내란", opponent: "고려 조정 내 대립 세력", place: "개경", result: "이자겸이 결국 몰락함" },
  "goryeo-myo-cheong-revolt-1135": { kind: "내란", opponent: "김부식이 이끈 관군", place: "서경", result: "묘청 세력의 반란이 진압됨" },
  "goryeo-mangi-mangsoi-1176": { kind: "항쟁", opponent: "차별·수탈을 가한 지배 체제", place: "공주 명학소", result: "명학소 주민이 차별과 수탈에 저항해 봉기함" },
  "goryeo-kim-sami-hyosim-1193": { kind: "항쟁", opponent: "수탈에 저항한 농민 세력과 지배 세력의 대립", place: "경상도 등", result: "김사미와 효심이 농민 세력을 이끌고 봉기함" },
  "goryeo-ganghwa-capital-1232": { kind: "전쟁", opponent: "몽골", place: "개경에서 강화도로 도읍 이전", result: "고려가 몽골의 침입에 대응하기 위해 수도를 옮김" },
  "goryeo-cheoin-battle-1232": { kind: "전투", opponent: "몽골", place: "처인성", result: "고려의 지역민들이 승리했고 몽골 지휘관 살리타가 전사함" },
  "goryeo-chungju-defense-1253": { kind: "전투", opponent: "몽골", place: "충주성", result: "김윤후와 지역민들이 몽골군의 공격을 막아냄" },
  "goryeo-wakou-1323": { kind: "군사 충돌", opponent: "왜구", place: "고려 남해안과 서해안", result: "왜구의 약탈이 고려 해안 주민들의 삶을 위협함" },
  "goryeo-honggeonjeok-1359": { kind: "전쟁", opponent: "홍건적", place: "고려 북쪽 국경", result: "고려의 군사들이 침입에 맞서 싸움" },
  "goryeo-hwangsan-1380": { kind: "전투", opponent: "왜구", place: "황산(현재 전북 남원 일대)", result: "이성계가 이끄는 고려군이 왜구를 물리침" },
  "joseon-im-kkeokjeong-1559": { kind: "항쟁", opponent: "관청과 권세가", place: "황해도 등을 중심으로 활동", result: "임꺽정과 그 무리가 관청·권세가에 맞서 활동함" },
  "joseon-imjinwar-1592": { kind: "전쟁", opponent: "일본군", place: "조선 각지", result: "일본의 침략으로 임진왜란이 시작됨" },
  "joseon-hansando-1592": { kind: "해전", opponent: "일본 수군", place: "한산도 앞바다", result: "이순신이 지휘한 조선 수군이 승리함" },
  "joseon-jinju-1592": { kind: "전투", opponent: "일본군", place: "진주성", result: "김시민과 진주성의 군사·백성이 공격을 막아냄" },
  "joseon-ming-aid-1592": { kind: "전쟁", opponent: "일본군", place: "조선", result: "명나라가 조선을 지원하기 위해 원군을 보냄" },
  "joseon-haengju-1593": { kind: "전투", opponent: "일본군", place: "행주산성", result: "권율이 이끈 조선군과 백성들이 승리함" },
  "joseon-peace-talks-1596": { kind: "전쟁·외교", opponent: "일본과 명나라", place: "교섭의 무대", result: "명나라·일본 간 강화 교섭이 결렬됨" },
  "joseon-jeongyu-1597": { kind: "전쟁", opponent: "일본군", place: "조선 각지", result: "일본군이 조선을 다시 침략함" },
  "joseon-noryang-1598": { kind: "해전", opponent: "일본 수군", place: "노량 바다", result: "전투 과정에서 이순신이 전사함" },
  "joseon-jeongmyo-1627": { kind: "전쟁", opponent: "후금", place: "조선", result: "후금의 침입으로 정묘호란이 일어남" },
  "joseon-byeongja-1636": { kind: "전쟁", opponent: "청나라", place: "남한산성 등", result: "인조가 남한산성에서 버티다가 결국 항복함" },
  "joseon-honggyeongrae-1811": { kind: "내란", opponent: "조선 관군", place: "평안도", result: "홍경래가 이끄는 반란이 일어남" },
  "joseon-farmer-uprising-1862": { kind: "항쟁", opponent: "지방 관리의 수탈과 부정", place: "진주 등 여러 지역", result: "전국에서 농민 봉기가 일어남" },
  "joseon-byeonginyangyo-1866": { kind: "전쟁", opponent: "프랑스 군대", place: "강화도", result: "조선군이 프랑스군의 침략에 맞서 싸움" },
  "joseon-sinmiyangyo-1871": { kind: "전쟁", opponent: "미국 군대", place: "강화도 광성보 등", result: "어재연과 조선군이 미군의 공격에 저항함" },
  "joseon-unyo-1875": { kind: "군사 충돌", opponent: "일본 군함 운요호", place: "강화도 부근", result: "일본이 사건 이후 불평등한 조약 체결을 압박함" },
  "joseon-imogunran-1882": { kind: "군사 봉기", opponent: "차별 대우를 한 정부와 대립", place: "한성", result: "구식 군인들이 밀린 급료·차별 대우 등에 항의해 봉기함" },
  "joseon-gapsinjeongbyeon-1884": { kind: "정변", opponent: "급진 개화파와 반대 세력", place: "한성", result: "갑신정변이 짧은 기간 안에 실패함" },
  "joseon-donghak-1894": { kind: "항쟁", opponent: "부패한 관리와 외세", place: "고부 등 호남 지역", result: "전봉준 등이 동학 농민 운동을 이끔" },
  "colonial-cheongsanri-1920": { kind: "전투", opponent: "일본군", place: "청산리 일대", result: "김좌진 등이 이끄는 독립군이 여러 전투에서 승리함" },
  "republic-koreanwar-1950": { kind: "전쟁", opponent: "북한군의 남침", place: "한반도", result: "전쟁이 시작되어 많은 사람들이 어려움을 겪고 분단의 상처가 깊어짐" },
};
