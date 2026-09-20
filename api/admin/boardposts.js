// api/admin/boardposts.js
//
// 관리자가 게시판 글을 수정/삭제하는 API입니다.
//   PATCH  /api/admin/boardposts   body: { id, title?, body?, price?, photo? }
//   DELETE /api/admin/boardposts?id=<uuid>

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
      if (!id) {
        res.status(400).json({ error: "수정할 게시글의 id가 필요합니다." });
        return;
      }
      const patch = {};
      if (typeof body.title === "string") patch.title = body.title;
      if (typeof body.body === "string") patch.body = body.body;
      if (typeof body.price === "string" || body.price === null) patch.price = body.price;
      if (typeof body.photo === "string" || body.photo === null) patch.photo = body.photo;
      if (!Object.keys(patch).length) {
        res.status(400).json({ error: "수정할 내용이 없습니다." });
        return;
      }
      const { error } = await supabaseAdmin.from("board_posts").update(patch).eq("id", String(id));
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: "게시글을 수정하지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const id = req.query.id || (req.body && req.body.id);
      if (!id) {
        res.status(400).json({ error: "삭제할 게시글의 id가 필요합니다." });
        return;
      }
      const { error } = await supabaseAdmin.from("board_posts").delete().eq("id", String(id));
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: "게시글을 삭제하지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  res.status(405).json({ error: "지원하지 않는 메서드입니다." });
};
