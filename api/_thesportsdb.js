// api/_thesportsdb.js
//
// API-Sports 계정이 정지되어 있는 동안, 화면/기능이 잘 작동하는지 테스트할 수
// 있도록 임시로 사용하는 무료 대체 데이터 소스입니다 (TheSportsDB, 가입 없이
// 쓸 수 있는 공용 테스트 키 "123" 사용).
//
// 주의: 이 무료 키는 "실시간(라이브)" 스코어는 제공하지 않고, 그날의 경기
// 일정/결과 정도만 내려줍니다. API-Sports 계정이 다시 살아나면 scores.js가
// 자동으로 API-Sports를 우선 사용하도록 되어 있어서, 이 파일은 그대로 둬도
// 상관없습니다 (API-Sports 호출이 성공하면 이 파일은 아예 호출되지 않습니다).

const SPORT_NAMES = {
  soccer: "Soccer",
  baseball: "Baseball",
  basketball: "Basketball",
  volleyball: "Volleyball",
  hockey: "Ice Hockey",
};

async function fetchThesportsdb(sport, date) {
  const sportName = SPORT_NAMES[sport];
  if (!sportName) {
    throw new Error(`TheSportsDB에서 지원하지 않는 종목입니다: ${sport}`);
  }

  const url = `https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=${encodeURIComponent(
    date
  )}&s=${encodeURIComponent(sportName)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TheSportsDB 요청 실패 (${res.status}): ${text}`);
  }
  return res.json();
}

// TheSportsDB 응답을 scores.js가 쓰는 공통 모양으로 변환합니다.
function normalizeThesportsdb(raw) {
  const events = raw && raw.events;
  if (!Array.isArray(events)) return [];

  return events.map((ev) => {
    const home = Number(ev.intHomeScore);
    const away = Number(ev.intAwayScore);
    return {
      id: String(ev.idEvent),
      league: ev.strLeague || "",
      leagueLogo: ev.strLeagueBadge || null,
      home: ev.strHomeTeam || "",
      homeLogo: ev.strHomeTeamBadge || null,
      away: ev.strAwayTeam || "",
      awayLogo: ev.strAwayTeamBadge || null,
      homeScore: Number.isFinite(home) ? home : null,
      awayScore: Number.isFinite(away) ? away : null,
      // TheSportsDB 무료 API는 진행 중 여부를 세밀하게 안 주는 경우가 많아서,
      // 값이 없으면 "NS"(경기 전)로 처리합니다.
      status: ev.strStatus || "NS",
      elapsed: null,
      kickoff: ev.strTimestamp || (ev.dateEvent ? `${ev.dateEvent}T${ev.strTime || "00:00:00"}` : null),
    };
  });
}

module.exports = { fetchThesportsdb, normalizeThesportsdb };
