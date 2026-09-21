// api/support.js
//
// 회원/방문자가 고객센터에 문의를 남기는 공개 API입니다.
//   POST /api/support   body: { type, email, body }
//
// 관리자 인증 없이 누구나 호출할 수 있어야 하는 엔드포인트입니다(문의 접수이므로).
// 다만 service_role 키는 서버 코드 안에서만 사용되고 브라우저로는 절대 내려가지 않습니다.
// 접수된 문의는 /api/admin/support (관리자 전용)에서만 확인/처리/삭제할 수 있습니다.

const { getSupabaseAdmin } = require("./admin/_auth");

const VALID_TYPES = ["일반 문의", "신고", "제휴·광고 문의", "기타"];

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

  const body = req.body || {};
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const type = VALID_TYPES.includes(body.type) ? body.type : "일반 문의";

  if (!email || !text) {
    res.status(400).json({ error: "이메일과 문의 내용을 입력해주세요." });
    return;
  }
  if (email.length > 200 || text.length > 500) {
    res.status(400).json({ error: "입력한 내용이 너무 깁니다." });
    return;
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("support_tickets")
      .insert({ type, email, body: text });
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: "문의를 접수하지 못했습니다.", detail: String(err.message || err) });
  }
};
