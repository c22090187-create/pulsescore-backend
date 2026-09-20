// api/admin/verify.js
//
// 프론트엔드의 "관리자 로그인"이 입력한 비밀번호가 맞는지만 확인하는
// 가벼운 엔드포인트입니다. (회원 목록 조회 전에 먼저 비밀번호 검증용)
//   GET /api/admin/verify   (헤더: x-admin-secret)

const { checkAdminSecret } = require("./_auth");

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-secret");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (!checkAdminSecret(req, res)) return;
  res.status(200).json({ ok: true });
};
