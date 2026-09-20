// api/admin/banners.js
//
// 관리자가 상단 배너(SUPER BANNER) 이미지를 등록/교체/삭제하는 API입니다.
//   PUT /api/admin/banners   body: { slot: 0~9, image: "data:image/..." 또는 null }
// (배너 10칸 = 위/아래 2줄 × 5칸)
//
// 일반 회원 계정은 배너를 쓸 수 없습니다(Supabase 쪽에 배너용 insert/update
// 정책을 아예 만들지 않았습니다). 이 서버(API)의 service_role 키를 통해서만
// 배너를 등록/교체/삭제할 수 있습니다. 배너 조회(홈 화면 표시)는 공개라
// 프론트엔드에서 Supabase anon 키로 직접 읽습니다.

const { checkAdminSecret, getSupabaseAdmin } = require("./_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PUT, OPTIONS");
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

  if (req.method === "PUT") {
    try {
      const body = req.body || {};
      const slot = Number(body.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot > 9) {
        res.status(400).json({ error: "slot은 0~9 사이의 정수여야 합니다." });
        return;
      }
      const image = typeof body.image === "string" && body.image ? body.image : null;
      const { error } = await supabaseAdmin
        .from("banners")
        .upsert({ slot, image, updated_at: new Date().toISOString() }, { onConflict: "slot" });
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: "배너를 저장하지 못했습니다.", detail: String(err.message || err) });
    }
    return;
  }

  res.status(405).json({ error: "지원하지 않는 메서드입니다." });
};
