// api/admin/comments.js
//
// 관리자가 부적절한 경기 토론 댓글/답글을 수정/삭제하는 API입니다.
//   PATCH  /api/admin/comments   body: { id, text }
//   DELETE /api/admin/comments?id=<uuid>
//
// 댓글(최상위)을 삭제하면 그 아래 달린 답글도 함께 삭제됩니다
// (DB에서 parent_id가 on delete cascade로 설정되어 있습니다).
//
// 일반 회원은 Supabase 정책상 본인 댓글만 직접 고치거나 지울 수 있고,
// 다른 사람 댓글의 수정/삭제는 이 관리자 API(서버의 service_role 키)로만 가능합니다.

const { checkAdminSecret, getSupabaseAdmin } = require("./_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PATCH, DELETE, OPTIONS");
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

  if (req.method === "PATCH") {
    try {
      const body = req.body || {};
      const id = body.id;
      const text = body.text;
      if (!id || typeof text !== "string" || !text.trim()) {
        res.status(400).json({ error: "수정할 댓글의 id와 내용이 필요합니다." });
        return;
      }
      const { error } = await supabaseAdmin.from("comments").update({ text: text.trim() }).eq("id", String(id));
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: "댓글을 수정하지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const id = req.query.id || (req.body && req.body.id);
      if (!id) {
        res.status(400).json({ error: "삭제할 댓글의 id가 필요합니다." });
        return;
      }
      const { error } = await supabaseAdmin.from("comments").delete().eq("id", String(id));
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: "댓글을 삭제하지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  res.status(405).json({ error: "지원하지 않는 메서드입니다." });
};
