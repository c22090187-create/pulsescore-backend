// api/track-visit.js
//
// 방문자 통계용 공개 API입니다. 로그인 여부와 상관없이 누구나 호출할 수 있고,
// 관리자 API들과 똑같이 서버의 service_role 키로만 site_visits 테이블에 기록을
// 남깁니다. (브라우저가 테이블에 직접 쓰지 않아서, RLS 설정과 상관없이
// 안정적으로 동작합니다.)
//   POST /api/track-visit

const { getSupabaseAdmin } = require("./admin/_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "지원하지 않는 메서드입니다." });
    return;
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from("site_visits").insert({});
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (err) {
    // 방문 기록은 통계용일 뿐이라, 실패해도 사이트 이용에 지장이 없도록
    // 에러를 조용히 삼킵니다.
    res.status(200).json({ ok: false, detail: String(err.message || err) });
  }
};
