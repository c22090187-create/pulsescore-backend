// api/_translate.js
//
// 파파고(네이버 클라우드 플랫폼) 번역 API 도우미.
// 팀명·리그명을 영어 → 한국어로 번역하고, 같은 이름은 30일간 캐시해서
// 번역 API 호출 횟수(무료 한도)를 아낍니다.

const { getCache, setCache } = require("./_cache");

const TRANSLATE_CACHE_TTL = 60 * 60 * 24 * 30; // 30일

async function callPapago(text, clientId, clientSecret) {
  const res = await fetch(
    "https://naveropenapi.apigw.ntruss.com/nmt/v1/translation",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-NCP-APIGW-API-KEY-ID": clientId,
        "X-NCP-APIGW-API-KEY": clientSecret,
      },
      body: new URLSearchParams({ source: "en", target: "ko", text }),
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Papago 요청 실패 (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return data.message.result.translatedText;
}

/**
 * 여러 문자열을 한 번에 번역합니다. (캐시에 있으면 캐시 값을 씁니다)
 * @param {string[]} texts 중복 제거된 원문 배열
 * @returns {Promise<Record<string,string>>} { 원문: 번역문 } 형태
 */
async function translateBatch(texts) {
  const results = {};
  const toTranslate = [];

  texts.forEach((t) => {
    if (!t) return;
    const cached = getCache("translate:" + t);
    if (cached !== null) {
      results[t] = cached;
    } else {
      toTranslate.push(t);
    }
  });

  if (toTranslate.length === 0) return results;

  const clientId = process.env.NCP_CLIENT_ID;
  const clientSecret = process.env.NCP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    // 번역 키가 없으면 원문을 그대로 씁니다. (기능은 계속 정상 동작합니다)
    toTranslate.forEach((t) => (results[t] = t));
    return results;
  }

  try {
    // 여러 개를 한 번의 API 호출로 묶어서 번역 (무료 한도 절약).
    // 줄바꿈으로 구분해서 보내고, 같은 개수의 줄로 돌아오는지 확인합니다.
    const joined = toTranslate.join("\n");
    const translated = await callPapago(joined, clientId, clientSecret);
    const lines = translated.split("\n");

    if (lines.length === toTranslate.length) {
      toTranslate.forEach((t, i) => {
        const ko = (lines[i] || t).trim();
        setCache("translate:" + t, ko, TRANSLATE_CACHE_TTL);
        results[t] = ko;
      });
    } else {
      // 줄 수가 안 맞으면(드묾) 안전하게 하나씩 다시 번역합니다.
      for (const t of toTranslate) {
        try {
          const ko = await callPapago(t, clientId, clientSecret);
          setCache("translate:" + t, ko, TRANSLATE_CACHE_TTL);
          results[t] = ko;
        } catch {
          results[t] = t;
        }
      }
    }
  } catch (err) {
    console.error("번역 실패, 원문으로 표시합니다:", err.message);
    toTranslate.forEach((t) => (results[t] = t));
  }

  return results;
}

module.exports = { translateBatch };
