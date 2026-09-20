-- 상단 배너(SUPER BANNER) 이미지 테이블 (슬롯 0~4, 총 5개)
-- Supabase 대시보드 > SQL Editor 에서 이 스크립트를 한 번 실행해주세요.

create table if not exists public.banners (
  slot int primary key,
  image text,
  updated_at timestamptz not null default now()
);

insert into public.banners (slot, image)
values (0, null), (1, null), (2, null), (3, null), (4, null)
on conflict (slot) do nothing;

alter table public.banners enable row level security;

-- 배너는 홈 화면에서 로그인 여부와 상관없이 모두에게 보여야 하므로 조회는 공개입니다.
drop policy if exists "banners_select_all" on public.banners;
create policy "banners_select_all"
  on public.banners for select
  using (true);

-- 등록/수정/삭제는 일부러 정책을 만들지 않습니다.
-- 즉 일반 회원 계정으로는 배너를 절대 바꿀 수 없고,
-- 관리자 전용 서버 API(/api/admin/banners, service_role 키 사용)로만 가능합니다.
