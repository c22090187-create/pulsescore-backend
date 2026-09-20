// api/config.js
//
// 프론트엔드(public/index.html)가 Supabase에 연결할 때 필요한 "공개" 설정값을
// 내려주는 엔드포인트입니다.
//   GET /api/config
//
// Supabase URL과 anon/publishable 키는 원래 브라우저에 노출되어도 안전한
// 값입니다(그래서 이름이 "public"). 다만 코드에 직접 박아두는 대신 Vercel
// 환경변수(SUPABASE_URL, SUPABASE_ANON_KEY)에서 읽어오면, 나중에 Supabase
// 프로젝트를 바꾸더라도 코드 수정 없이 Vercel 설정만 바꾸면 됩니다.

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
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
