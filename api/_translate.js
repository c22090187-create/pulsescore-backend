// api/_translate.js
//
// MyMemory 번역 API 도우미. https://mymemory.translated.net
// 회원가입도, API 키도, 카드 등록도 필요 없는 완전 무료 번역 API입니다.
// (익명 사용 시 하루 약 5,000단어까지 무료 — 우리는 팀명·리그명처럼
// 짧은 단어만 번역하고, 한 번 번역한 이름은 30일간 캐시해서 재사용하므로
// 이 한도 안에서 충분히 쓸 수 있습니다.)
//
// 사전(_dictionary.js)에 없는 이름만 여기로 넘어오도록 scores.js에서
// 걸러줍니다 — 유명 팀은 사전이 먼저 처리하고, 나머지만 이 API로 보충합니다.

const { getCache, setCache } = require("./_cache");

const TRANSLATE_CACHE_TTL = 60 * 60 * 24 * 30; // 30일
const MAX_PER_REQUEST = 30; // 한 번의 요청에서 새로 번역하는 이름 수를 제한 (무료 한도 보호)

async function callMyMemory(text) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", "en|ko");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`MyMemory 요청 실패 (${res.status})`);
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error("MyMemory 응답에 번역 결과가 없습니다.");
  return translated;
}

/**
 * 여러 문자열을 번역합니다. (캐시에 있으면 캐시 값을 씁니다)
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

  // 무료 한도를 지키기 위해, 한 번의 요청에서는 일부만 새로 번역하고
  // 나머지는 이번엔 원문 그대로 두었다가 다음 요청(캐시가 쌓인 뒤)에
  // 자연스럽게 채워지도록 합니다.
  const toTranslateNow = toTranslate.slice(0, MAX_PER_REQUEST);
  const rest = toTranslate.slice(MAX_PER_REQUEST);
  rest.forEach((t) => (results[t] = t));

  await Promise.all(
    toTranslateNow.map(async (t) => {
      try {
        const ko = await callMyMemory(t);
        setCache("translate:" + t, ko, TRANSLATE_CACHE_TTL);
        results[t] = ko;
      } catch (err) {
        console.error("번역 실패, 원문으로 표시합니다:", t, err.message);
        results[t] = t;
      }
    })
  );

  return results;
}

module.exports = { translateBatch };
