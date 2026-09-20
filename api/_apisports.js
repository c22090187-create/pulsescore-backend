// api/_apisports.js
// API-Sports(https://api-sports.io) 공용 호출 헬퍼.
// 종목별로 도메인이 다르지만 인증 헤더 방식은 동일합니다.

const HOSTS = {
  soccer: "v3.football.api-sports.io",
  baseball: "v1.baseball.api-sports.io",
  basketball: "v1.basketball.api-sports.io",
  volleyball: "v1.volleyball.api-sports.io",
};

/**
 * API-Sports의 특정 종목 엔드포인트를 호출합니다.
 * @param {"soccer"|"baseball"|"basketball"|"volleyball"} sport
 * @param {string} endpoint  예: "fixtures", "games"
 * @param {Record<string,string>} params  쿼리 파라미터
 */
async function callApiSports(sport, endpoint, params = {}) {
  const host = HOSTS[sport];
  if (!host) {
    throw new Error(`지원하지 않는 종목입니다: ${sport}`);
  }

  const apiKey = process.env.API_SPORTS_KEY;
  if (!apiKey) {
    throw new Error(
      "API_SPORTS_KEY 환경변수가 설정되어 있지 않습니다. Vercel 프로젝트 설정에서 등록해주세요."
    );
  }

  const url = new URL(`https://${host}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API-Sports 요청 실패 (${res.status}): ${text}`);
  }

  return res.json();
}

module.exports = { callApiSports, HOSTS };
