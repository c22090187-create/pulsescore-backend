// api/admin/stats.js
//
// 관리자 통계 대시보드 API입니다.
//   GET /api/admin/stats -> 가입자 수, 방문자 수, 문의/쪽지 처리 현황 등을
//                           한 번에 모아서 돌려줍니다.
//
// 반드시 헤더에 x-admin-secret(Vercel 환경변수 ADMIN_SECRET과 동일한 값)을
// 담아 보내야 동작합니다. service_role 키는 여기 서버 코드 안에서만 쓰입니다.

const { checkAdminSecret, getSupabaseAdmin } = require("./_auth");

// 한국 시간(KST) 기준 오늘 날짜를 "YYYY-MM-DD" 형태로 돌려줍니다.
function todayKST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

// KST 자정 시각을 UTC ISO 문자열로 변환합니다. (site_visits/member_messages 등의
// timestamptz 컬럼과 비교할 때 사용)
function kstMidnightIso(dateStr) {
  return new Date(`${dateStr}T00:00:00+09:00`).toISOString();
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-secret");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "지원하지 않는 메서드입니다." });
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

  try {
    const todayStr = todayKST();
    const todayStartIso = kstMidnightIso(todayStr);
    const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // ---- 회원 가입 통계 ----
    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersErr) throw usersErr;
    const users = usersData.users || [];
    const totalMembers = users.length;
    const newMembersToday = users.filter((u) => u.created_at >= todayStartIso).length;
    const newMembersThisWeek = users.filter((u) => u.created_at >= weekAgoIso).length;

    // ---- 방문자 통계 ----
    const [{ count: visitsTotal }, { count: visitsToday }, { count: visitsThisWeek }] = await Promise.all([
      supabaseAdmin.from("site_visits").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("site_visits").select("*", { count: "exact", head: true }).gte("visited_at", todayStartIso),
      supabaseAdmin.from("site_visits").select("*", { count: "exact", head: true }).gte("visited_at", weekAgoIso),
    ]);

    // ---- 고객센터 문의 통계 ----
    const [{ count: ticketsTotal }, { count: ticketsOpen }] = await Promise.all([
      supabaseAdmin.from("support_tickets").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("support_tickets").select("*", { count: "exact", head: true }).neq("status", "처리완료"),
    ]);

    // ---- 쪽지 발송 통계 ----
    const [{ count: messagesTotal }, { count: messagesToday }] = await Promise.all([
      supabaseAdmin.from("member_messages").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("member_messages").select("*", { count: "exact", head: true }).gte("created_at", todayStartIso),
    ]);

    res.status(200).json({
      members: {
        total: totalMembers,
        newToday: newMembersToday,
        newThisWeek: newMembersThisWeek,
      },
      visits: {
        total: visitsTotal || 0,
        today: visitsToday || 0,
        thisWeek: visitsThisWeek || 0,
      },
      support: {
        total: ticketsTotal || 0,
        open: ticketsOpen || 0,
      },
      messages: {
        total: messagesTotal || 0,
        today: messagesToday || 0,
      },
    });
  } catch (err) {
    res.status(502).json({ error: "통계를 가져오지 못했습니다.", detail: String(err.message || err) });
  }
};
