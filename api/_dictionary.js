// api/_dictionary.js
//
// 외부 번역 API 없이, 자주 나오는 유명 리그·구단 이름을 한글로 직접
// 매핑해둔 사전입니다. 여기 없는 이름은 원문(영어) 그대로 표시됩니다.
//
// 나중에 더 추가하고 싶은 팀이 있으면, 아래 객체에 "영문 이름": "한글 이름"
// 형태로 한 줄만 추가하시면 됩니다. (API-Sports가 주는 이름과 정확히
// 철자가 같아야 매칭됩니다.)

const KO_NAMES = {
  // ---- 리그 ----
  "Premier League": "프리미어리그",
  "La Liga": "라리가",
  "Serie A": "세리에 A",
  "Bundesliga": "분데스리가",
  "Ligue 1": "리그앙",
  "UEFA Champions League": "UEFA 챔피언스리그",
  "UEFA Europa League": "UEFA 유로파리그",
  "Major League Soccer": "메이저리그 사커",
  "K League 1": "K리그1",
  "K League 2": "K리그2",
  "J1 League": "J리그1",
  "Eredivisie": "에레디비시",
  "Primeira Liga": "프리메이라 리가",
  "Super Lig": "쉬페르리그",
  "MLB": "MLB",
  "NPB": "일본프로야구",
  "KBO League": "KBO 리그",
  "CPBL": "대만프로야구",
  "NBA": "NBA",
  "KBL": "KBL",
  "V-League": "V리그",
  "ATP": "ATP 투어",

  // ---- 유럽 축구 구단 ----
  "Real Madrid": "레알 마드리드",
  "Barcelona": "바르셀로나",
  "Atletico Madrid": "아틀레티코 마드리드",
  "Manchester United": "맨체스터 유나이티드",
  "Manchester City": "맨체스터 시티",
  "Liverpool": "리버풀",
  "Chelsea": "첼시",
  "Arsenal": "아스널",
  "Tottenham": "토트넘",
  "Newcastle": "뉴캐슬",
  "Bayern Munich": "바이에른 뮌헨",
  "Borussia Dortmund": "보루시아 도르트문트",
  "RB Leipzig": "라이프치히",
  "Paris Saint Germain": "파리 생제르맹",
  "Juventus": "유벤투스",
  "AC Milan": "AC 밀란",
  "Inter": "인터 밀란",
  "Napoli": "나폴리",
  "AS Roma": "AS 로마",
  "Ajax": "아약스",
  "Porto": "포르투",
  "Benfica": "벤피카",

  // ---- K리그 ----
  "FC Seoul": "FC 서울",
  "Ulsan Hyundai": "울산 HD",
  "Jeonbuk Motors": "전북 현대",
  "Pohang Steelers": "포항 스틸러스",
  "Daegu FC": "대구 FC",
  "Gangwon FC": "강원 FC",
  "Suwon Samsung Bluewings": "수원 삼성",
  "Gimcheon Sangmu": "김천 상무",
  "Jeju United": "제주 SK",

  // ---- KBO ----
  "LG Twins": "LG 트윈스",
  "Doosan Bears": "두산 베어스",
  "SSG Landers": "SSG 랜더스",
  "Lotte Giants": "롯데 자이언츠",
  "KIA Tigers": "KIA 타이거즈",
  "Samsung Lions": "삼성 라이온즈",
  "NC Dinos": "NC 다이노스",
  "Hanwha Eagles": "한화 이글스",
  "Kiwoom Heroes": "키움 히어로즈",
  "KT Wiz": "KT 위즈",

  // ---- MLB (자주 나오는 팀 위주) ----
  "New York Yankees": "뉴욕 양키스",
  "Los Angeles Dodgers": "LA 다저스",
  "Boston Red Sox": "보스턴 레드삭스",
  "San Francisco Giants": "샌프란시스코 자이언츠",
  "Chicago Cubs": "시카고 컵스",

  // ---- KBL ----
  "Wonju DB Promy": "원주 DB",
  "Seoul SK Knights": "서울 SK",
  "Goyang Sono": "고양 소노",
  "Anyang KGC": "안양 KGC",
  "Ulsan Hyundai Mobis Phoebus": "울산 현대모비스",
};

function toKorean(name) {
  return KO_NAMES[name] || name;
}

module.exports = { toKorean, KO_NAMES };
