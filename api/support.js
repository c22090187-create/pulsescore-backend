// api/support.js
//
// 로그인한 회원이 고객센터에 문의를 남기는 API입니다.
//   POST /api/support   헤더: Authorization: Bearer <회원 로그인 세션 access_token>
//                       body: { type, body }
//
// 문의를 남긴 회원 계정(user_id)과 닉네임을 서버에서 직접 확인해서 저장하므로
// 이메일/닉네임을 클라이언트가 마음대로 지어낼 수 없습니다.
// 관리자는 /api/admin/support 에서 "누가" 문의했는지 확인할 수 있고,
// /api/admin/support-replies 로 그 회원에게 답변(쪽지)을 보낼 수 있습니다.

const { getSupabaseAdmin } = require("./admin/_auth");

const VALID_TYPES = ["일반 문의", "신고", "제휴·광고 문의", "기타"];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "지원하지 않는 메서드입니다." });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: "로그인 후 문의를 남길 수 있습니다." });
    return;
  }

  const body = req.body || {};
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const type = VALID_TYPES.includes(body.type) ? body.type : "일반 문의";

  if (!text) {
    res.status(400).json({ error: "문의 내용을 입력해주세요." });
    return;
  }
  if (text.length > 500) {
    res.status(400).json({ error: "입력한 내용이 너무 깁니다." });
    return;
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData || !userData.user) {
      res.status(401).json({ error: "로그인이 만료되었습니다. 다시 로그인해주세요." });
      return;
    }
    const user = userData.user;
    const nickname = (user.user_metadata && user.user_metadata.nickname) || null;

    const { error } = await supabaseAdmin.from("support_tickets").insert({
      type,
      email: user.email || "",
      nickname,
      user_id: user.id,
      body: text,
    });
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: "문의를 접수하지 못했습니다.", detail: String(err.message || err) });
  }
};
