// api/_cache.js
//
// 아주 단순한 메모리 캐시입니다.
//
// ⚠️ 중요: Vercel의 서버리스 함수는 "요청이 있을 때만 잠깐 켜지는" 구조라서,
// 이 메모리 캐시는 같은 인스턴스가 살아있는 짧은 시간 동안만 유효합니다.
// 즉, 완벽한 캐시가 아니라 "짧은 시간에 같은 요청이 몰릴 때 API 호출 횟수를
// 조금 줄여주는" 정도의 안전장치입니다.
//
// 나중에 사용자가 많아지면, Vercel KV / Upstash Redis 같은 진짜 캐시 저장소로
// 교체하는 것을 추천합니다. (이 파일의 get/set 인터페이스만 유지하면
// 다른 코드는 거의 안 바꿔도 됩니다.)

const store = new Map();

function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key, value, ttlSeconds) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

module.exports = { getCache, setCache };
