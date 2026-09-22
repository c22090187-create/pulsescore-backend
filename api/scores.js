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
const { fetchThesportsdb, normalizeThesportsdb } = require("./_thesportsdb");
const { getCache, setCache } = require("./_cache");
const { toKorean, KO_NAMES } = require("./_dictionary");
const { translateBatch } = require("./_translate");

const SUPPORTED_SPORTS = ["soccer", "baseball", "basketball", "volleyball", "hockey"];
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

// 경기 배열에 등장하는 리그명·팀명에 한글 이름을 붙여줍니다.
//   1순위: 사전(_dictionary.js)에 있는 유명 리그·구단 → 즉시, 무제한, 무료
//   2순위: 사전에 없는 이름 → MyMemory 번역 API로 보충 (가입/카드 불필요, 30일 캐시)
// 두 방법 다 실패해도 원문(영어)이 그대로 표시되어 화면이 깨지지 않습니다.
async function attachKoreanNames(matches) {
  const needsTranslation = new Set();
  matches.forEach((m) => {
    [m.league, m.home, m.away].forEach((name) => {
      if (name && !KO_NAMES[name]) needsTranslation.add(name);
    });
  });

  const translations = await translateBatch(Array.from(needsTranslation));

  return matches.map((m) => ({
    ...m,
    leagueKo: KO_NAMES[m.league] || translations[m.league] || m.league,
    homeKo: KO_NAMES[m.home] || translations[m.home] || m.home,
    awayKo: KO_NAMES[m.away] || translations[m.away] || m.away,
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

  let raw;
  let matches;
  let usedFallback = false;
  let apiSportsErr = null;

  try {
    if (sport === "soccer") {
      raw = await callApiSports("soccer", "fixtures", { date });
    } else {
      // 야구/농구/배구는 API-Sports에서 엔드포인트 이름이 "games" 입니다.
      raw = await callApiSports(sport, "games", { date });
    }

    // API-Sports는 계정 정지 등 문제가 있어도 HTTP 상태코드는 200(정상)으로
    // 응답하고, 대신 응답 본문의 errors 필드에 문제를 담아 보낼 때가 있습니다.
    // (예: 계정 정지 시 { errors: { access: "Your account is suspended..." } })
    // 이 경우 callApiSports는 예외를 던지지 않으므로, 여기서 직접 확인해서
    // 아래 catch로 넘겨 대체 데이터(TheSportsDB)로 전환되게 합니다.
    if (raw && raw.errors && Object.keys(raw.errors).length > 0) {
      throw new Error(Object.values(raw.errors).join(" / "));
    }

    if (sport === "soccer") {
      matches = normalizeSoccer(raw);
    } else {
      matches = normalizeGeneric(raw);
    }
  } catch (err) {
    // API-Sports 호출이 실패하면(계정 정지 등), 화면 테스트가 계속 가능하도록
    // 무료 대체 데이터(TheSportsDB)로 자동 전환합니다. API-Sports가 복구되면
    // 다음 호출부터는 이 catch에 들어오지 않고 다시 실제 데이터를 씁니다.
    apiSportsErr = err;
    try {
      raw = await fetchThesportsdb(sport, date);
      matches = normalizeThesportsdb(raw);
      usedFallback = true;
    } catch (fallbackErr) {
      console.error("[scores] API-Sports 실패:", apiSportsErr);
      console.error("[scores] 대체 데이터(TheSportsDB)도 실패:", fallbackErr);
      res.status(502).json({
        error: "스포츠 데이터를 가져오는 중 문제가 발생했습니다.",
        detail: String(apiSportsErr.message || apiSportsErr),
      });
      return;
    }
  }

  try {
    matches = await attachKoreanNames(matches);
    setCache(cacheKey, matches, CACHE_TTL_SECONDS);
    const payload = { source: usedFallback ? "test-thesportsdb" : "live", matches };
    if (usedFallback) {
      // 관리자가 지금 보이는 게 실제 데이터가 아니라 임시 테스트 데이터라는 걸
      // 알 수 있도록 원래 API-Sports 에러도 같이 내려줍니다.
      payload.note = "API-Sports 연결 실패로 임시 테스트 데이터(TheSportsDB)를 보여주고 있습니다.";
      payload.apiSportsError = String(apiSportsErr.message || apiSportsErr);
    }
    if (matches.length === 0 && !usedFallback) {
      // 임시 진단용: 왜 0건인지 원인을 바로 확인하기 위해 API-Sports의 원본 응답 일부를 함께 내려줍니다.
      payload.debug = {
        results: raw.results,
        errors: raw.errors,
        paging: raw.paging,
      };
    }
    res.status(200).json(payload);
  } catch (err) {
    console.error(err);
    res.status(502).json({
      error: "스포츠 데이터를 가져오는 중 문제가 발생했습니다.",
      detail: String(err.message || err),
    });
  }
};
