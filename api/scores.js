// api/scores.js
//
// 프론트엔드가 실제로 호출하게 될 엔드포인트입니다.
//   GET /api/scores?sport=soccer&date=2026-09-20
//
// 이 함수가 하는 일:
//   1. sport, date 파라미터를 검사하고
//   2. 캐시에 최근 값이 있으면 그걸 바로 돌려주고 (API 호출 절약)
//   3. 없으면 API-Sports를 호출해서
//   4. 팀명·리그명을 한국어로 번역하고 (파파고, 캐시 적용)
//   5. 우리 프론트엔드가 쓰기 좋은 형태(구단 로고 포함)로 정리해서 돌려줍니다.
//
// 사용자가 10,000명이어도 이 함수 하나가 API-Sports를 대표로 호출하고,
// 그 결과를 모두에게 재사용시켜주는 구조입니다.

const { callApiSports } = require("./_apisports");
const { getCache, setCache } = require("./_cache");
const { translateBatch } = require("./_translate");

const SUPPORTED_SPORTS = ["soccer", "baseball", "basketball", "volleyball"];
const CACHE_TTL_SECONDS = 30; // 라이브 경기는 30초 정도면 충분히 자주 갱신됩니다.

// 종목마다 API-Sports 응답 구조가 조금씩 달라서, 우리 프론트엔드가 쓰기 편한
// 공통 모양으로 변환해줍니다. (경기 상태, 팀명, 스코어, 로고 등)
function normalizeSoccer(raw) {
  return (raw.response || []).map((item) => ({
    id: String(item.fixture.id),
    league: item.league.name,
    leagueLogo: item.league.logo || null,
    home: item.teams.home.name,
    homeLogo: item.teams.home.logo || null,
    away: item.teams.away.name,
    awayLogo: item.teams.away.logo || null,
    homeScore: item.goals.home,
    awayScore: item.goals.away,
    status: item.fixture.status.short, // 예: "1H", "FT", "NS"
    elapsed: item.fixture.status.elapsed,
    kickoff: item.fixture.date,
  }));
}

function normalizeGeneric(raw) {
  // 야구/농구/배구는 API-Sports에서 games 엔드포인트 구조가 비슷합니다.
  return (raw.response || []).map((item) => ({
    id: String(item.id),
    league: item.league?.name || "",
    leagueLogo: item.league?.logo || null,
    home: item.teams?.home?.name || "",
    homeLogo: item.teams?.home?.logo || null,
    away: item.teams?.away?.name || "",
    awayLogo: item.teams?.away?.logo || null,
    homeScore: item.scores?.home?.total ?? null,
    awayScore: item.scores?.away?.total ?? null,
    status: item.status?.short || item.status?.long || "",
    kickoff: item.date,
  }));
}

// 경기 배열에 등장하는 리그명·팀명을 모아 한 번에 번역하고,
// 각 경기에 leagueKo/homeKo/awayKo 필드를 붙여서 돌려줍니다.
// 번역이 실패하거나 키가 없으면 원문(영어)이 그대로 Ko 필드에 들어갑니다.
async function attachKoreanNames(matches) {
  const uniqueNames = new Set();
  matches.forEach((m) => {
    uniqueNames.add(m.league);
    uniqueNames.add(m.home);
    uniqueNames.add(m.away);
  });

  const translations = await translateBatch(Array.from(uniqueNames));

  return matches.map((m) => ({
    ...m,
    leagueKo: translations[m.league] || m.league,
    homeKo: translations[m.home] || m.home,
    awayKo: translations[m.away] || m.away,
  }));
}

module.exports = async function handler(req, res) {
  // 어떤 프론트엔드 도메인에서든 호출할 수 있도록 허용합니다.
  // (실제 서비스에서는 우리 프론트엔드 도메인만 허용하도록 좁히는 걸 추천합니다.)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const sport = String(req.query.sport || "soccer");
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));

  if (!SUPPORTED_SPORTS.includes(sport)) {
    res.status(400).json({
      error: `지원하지 않는 종목입니다: ${sport}`,
      supported: SUPPORTED_SPORTS,
    });
    return;
  }

  const cacheKey = `scores:${sport}:${date}:ko`;
  const cached = getCache(cacheKey);
  if (cached) {
    res.status(200).json({ source: "cache", matches: cached });
    return;
  }

  try {
    let raw;
    let matches;

    if (sport === "soccer") {
      raw = await callApiSports("soccer", "fixtures", { date });
      matches = normalizeSoccer(raw);
    } else {
      // 야구/농구/배구는 API-Sports에서 엔드포인트 이름이 "games" 입니다.
      raw = await callApiSports(sport, "games", { date });
      matches = normalizeGeneric(raw);
    }

    matches = await attachKoreanNames(matches);

    setCache(cacheKey, matches, CACHE_TTL_SECONDS);
    res.status(200).json({ source: "live", matches });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      error: "스포츠 데이터를 가져오는 중 문제가 발생했습니다.",
      detail: String(err.message || err),
    });
  }
};
