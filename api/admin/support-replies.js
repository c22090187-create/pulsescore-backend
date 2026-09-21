// api/admin/support-replies.js
//
// 관리자가 고객센터 문의에 답변(쪽지)을 보내고 확인하는 API입니다.
//   GET  /api/admin/support-replies?ticketId=<uuid>          -> 해당 문의의 답변 목록
//   POST /api/admin/support-replies   body: { ticketId, body } -> 답변 작성
//
// 답변은 문의를 남긴 회원 계정(user_id)에게만 전달되며, 그 회원은 로그인 후
// "고객센터 문의 > 내 문의 내역"에서 직접 확인할 수 있습니다(Supabase RLS로
// 본인 것만 조회 가능).

const { checkAdminSecret, getSupabaseAdmin } = require("./_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
      const ticketId = req.query.ticketId;
      if (!ticketId) {
        res.status(400).json({ error: "ticketId가 필요합니다." });
        return;
      }
      const { data, error } = await supabaseAdmin
        .from("support_replies")
        .select("*")
        .eq("ticket_id", String(ticketId))
        .order("created_at", { ascending: true });
      if (error) throw error;
      res.status(200).json({ replies: data || [] });
    } catch (err) {
      res.status(502).json({ error: "답변 목록을 가져오지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};
      const ticketId = body.ticketId;
      const text = typeof body.body === "string" ? body.body.trim() : "";
      if (!ticketId || !text) {
        res.status(400).json({ error: "ticketId와 답변 내용이 필요합니다." });
        return;
      }
      const { data: ticket, error: ticketErr } = await supabaseAdmin
        .from("support_tickets")
        .select("user_id")
        .eq("id", String(ticketId))
        .single();
      if (ticketErr) throw ticketErr;
      if (!ticket || !ticket.user_id) {
        res.status(400).json({ error: "이 문의는 회원 계정과 연결되어 있지 않아 답변을 보낼 수 없습니다." });
        return;
      }
      const { error } = await supabaseAdmin.from("support_replies").insert({
        ticket_id: String(ticketId),
        user_id: ticket.user_id,
        body: text,
      });
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: "답변을 등록하지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  res.status(405).json({ error: "지원하지 않는 메서드입니다." });
};
