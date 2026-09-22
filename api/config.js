// api/config.js
//
// 프론트엔드(public/index.html)가 Supabase에 연결할 때 필요한 "공개" 설정값을
// 내려주는 엔드포인트입니다.
//   GET  /api/config        -> 공개 설정값
//   POST /api/config        -> 방문자 통계 기록 (site_visits 테이블에 1건 추가)
//
// Supabase URL과 anon/publishable 키는 원래 브라우저에 노출되어도 안전한
// 값입니다(그래서 이름이 "public"). 다만 코드에 직접 박아두는 대신 Vercel
// 환경변수(SUPABASE_URL, SUPABASE_ANON_KEY)에서 읽어오면, 나중에 Supabase
// 프로젝트를 바꾸더라도 코드 수정 없이 Vercel 설정만 바꾸면 됩니다.
//
// 방문 기록(POST)을 별도 파일로 만들지 않고 여기에 합쳐둔 이유: Vercel Hobby
// 플랜은 프로젝트당 서버리스 함수를 12개까지만 만들 수 있어서, 이미 함수 개수가
// 꽉 찬 상태에서는 새 파일을 추가하면 배포가 실패합니다. 그래서 자주 호출되는
// 이 파일에 방문 기록 기능을 함께 넣었습니다.

const { getSupabaseAdmin } = require("./admin/_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "POST") {
    // 방문자 통계 기록: 로그인 여부와 상관없이 누구나 호출할 수 있고,
    // 서버의 service_role 키로만 기록하므로 브라우저가 테이블에 직접 쓰지
    // 않습니다. 통계용일 뿐이라 실패해도 조용히 넘어갑니다.
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin.from("site_visits").insert({});
      if (error) throw error;
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(200).json({ ok: false, detail: String(err.message || err) });
    }
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(200).json({
      supabaseUrl: "",
      supabaseAnonKey: "",
      configured: false,
      note: "SUPABASE_URL / SUPABASE_ANON_KEY 환경변수가 Vercel에 아직 등록되지 않았습니다.",
    });
    return;
  }

  // 캐시해도 무방한 값들입니다 (자주 바뀌지 않음).
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({
    supabaseUrl,
    supabaseAnonKey,
    configured: true,
  });
};
