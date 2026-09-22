// api/admin/messages.js
//
// 관리자가 특정 회원에게 "쪽지"를 보내고, 그 회원에게 보낸 쪽지 내역을 보는 API입니다.
//   GET    /api/admin/messages?userId=<uuid>          -> 해당 회원에게 보낸 쪽지 목록
//   POST   /api/admin/messages   body: { userId, body } -> 새 쪽지 보내기
//   DELETE /api/admin/messages?id=<uuid>               -> 보낸 쪽지 삭제
//
// 쪽지는 받는 회원 계정(user_id)에게만 전달되며, 그 회원은 로그인 후
// "더보기 > 쪽지함"에서 직접 확인할 수 있습니다(Supabase RLS로 본인 것만 조회 가능).

const { checkAdminSecret, getSupabaseAdmin } = require("./_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-secret");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (!checkAdminSecret(req, res)) return;

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
    return;
  }

  if (req.method === "GET") {
    try {
      const userId = req.query.userId;
      if (!userId) {
        res.status(400).json({ error: "userId가 필요합니다." });
        return;
      }
      const { data, error } = await supabaseAdmin
        .from("member_messages")
        .select("*")
        .eq("user_id", String(userId))
        .order("created_at", { ascending: true });
      if (error) throw error;
      res.status(200).json({ messages: data || [] });
    } catch (err) {
      res.status(502).json({ error: "쪽지 내역을 가져오지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};
      const userId = body.userId;
      const text = typeof body.body === "string" ? body.body.trim() : "";
      if (!userId || !text) {
        res.status(400).json({ error: "받는 회원(userId)과 쪽지 내용이 필요합니다." });
        return;
      }
      const { error } = await supabaseAdmin.from("member_messages").insert({
        user_id: String(userId),
        body: text,
      });
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: "쪽지를 보내지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const id = req.query.id || (req.body && req.body.id);
      if (!id) {
        res.status(400).json({ error: "삭제할 쪽지의 id가 필요합니다." });
        return;
      }
      const { error } = await supabaseAdmin.from("member_messages").delete().eq("id", String(id));
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: "쪽지를 삭제하지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  res.status(405).json({ error: "지원하지 않는 메서드입니다." });
};
