// api/admin/support.js
//
// 관리자가 고객센터 문의를 확인/처리완료/삭제하는 API입니다.
//   GET    /api/admin/support            -> 문의 목록 (최신순)
//   PATCH  /api/admin/support             -> body: { id, status } 상태 변경 (예: "처리완료")
//   DELETE /api/admin/support?id=<uuid>  -> 문의 삭제
//
// 반드시 헤더에 x-admin-secret(Vercel 환경변수 ADMIN_SECRET과 동일한 값)을
// 담아 보내야 동작합니다.

const { checkAdminSecret, getSupabaseAdmin } = require("./_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, DELETE, OPTIONS");
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
      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      res.status(200).json({ tickets: data || [], total: (data || []).length });
    } catch (err) {
      res.status(502).json({ error: "문의 목록을 가져오지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  if (req.method === "PATCH") {
    try {
      const body = req.body || {};
      const id = body.id;
      const status = body.status;
      if (!id || typeof status !== "string" || !status.trim()) {
        res.status(400).json({ error: "수정할 문의의 id와 상태가 필요합니다." });
        return;
      }
      const { error } = await supabaseAdmin
        .from("support_tickets")
        .update({ status: status.trim() })
        .eq("id", String(id));
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: "문의 상태를 변경하지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const id = req.query.id || (req.body && req.body.id);
      if (!id) {
        res.status(400).json({ error: "삭제할 문의의 id가 필요합니다." });
        return;
      }
      const { error } = await supabaseAdmin.from("support_tickets").delete().eq("id", String(id));
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: "문의를 삭제하지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  res.status(405).json({ error: "지원하지 않는 메서드입니다." });
};
