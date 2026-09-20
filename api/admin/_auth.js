// api/admin/_auth.js
//
// 관리자 전용 API(/api/admin/*)를 보호하는 공용 헬퍼입니다.
//
// 왜 필요한가:
//   회원 목록 조회·삭제 같은 기능은 Supabase의 "service_role" 키가 있어야
//   가능한데, 이 키는 모든 보안 규칙(RLS)을 무시하는 매우 강력한 키라서
//   절대 브라우저(프론트엔드)에 노출되면 안 됩니다. 그래서 이 서버 함수
//   안에서만 사용하고, 프론트엔드는 관리자 비밀번호(ADMIN_SECRET)를
//   요청 헤더로 보내서 인증합니다.

const { createClient } = require("@supabase/supabase-js");

function checkAdminSecret(req, res) {
  const provided = req.headers["x-admin-secret"];
  const expected = process.env.ADMIN_SECRET;

  if (!expected) {
    res.status(500).json({
      error: "ADMIN_SECRET 환경변수가 Vercel에 설정되어 있지 않습니다.",
    });
    return false;
  }
  if (!provided || provided !== expected) {
    res.status(401).json({ error: "관리자 인증에 실패했습니다." });
    return false;
  }
  return true;
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다."
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

module.exports = { checkAdminSecret, getSupabaseAdmin };
