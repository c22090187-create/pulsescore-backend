// api/admin/members.js
//
// 관리자 화면에서 회원(Supabase Auth 사용자) 목록을 보고 삭제하는 API입니다.
//   GET    /api/admin/members            -> 회원 목록
//   DELETE /api/admin/members?id=<uuid>  -> 해당 회원 삭제
//
// 반드시 헤더에 x-admin-secret(Vercel 환경변수 ADMIN_SECRET과 동일한 값)을
// 담아 보내야 동작합니다. service_role 키는 여기 서버 코드 안에서만 쓰이고
// 브라우저로는 절대 내려가지 않습니다.

const { checkAdminSecret, getSupabaseAdmin } = require("./_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
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
      const page = Number(req.query.page || 1);
      const perPage = Number(req.query.perPage || 200);
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      const members = (data.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        nickname: (u.user_metadata && u.user_metadata.nickname) || null,
        phone: (u.user_metadata && u.user_metadata.phone_number) || null,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        emailConfirmed: !!u.email_confirmed_at,
      }));
      members.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.status(200).json({ members, total: members.length });
    } catch (err) {
      res.status(502).json({ error: "회원 목록을 가져오지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const id = req.query.id || (req.body && req.body.id);
      if (!id) {
        res.status(400).json({ error: "삭제할 회원의 id가 필요합니다." });
        return;
      }
      const { error } = await supabaseAdmin.auth.admin.deleteUser(String(id));
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: "회원을 삭제하지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  res.status(405).json({ error: "지원하지 않는 메서드입니다." });
};
