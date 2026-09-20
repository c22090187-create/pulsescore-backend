-- 게시판(자유톡 / 자유 광고방 / 유료 광고방 / 공지 / 예측결과 인증 / 자유토론) 글 테이블
-- Supabase 대시보드 > SQL Editor 에서 이 스크립트를 한 번 실행해주세요.

create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  board_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  title text not null,
  body text not null,
  price text,
  photo text,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists board_posts_board_id_idx on public.board_posts (board_id, created_at desc);

alter table public.board_posts enable row level security;

-- 게시글은 로그인 여부와 상관없이 누구나 조회 가능
drop policy if exists "board_posts_select_all" on public.board_posts;
create policy "board_posts_select_all"
  on public.board_posts for select
  using (true);

-- 로그인한 회원만 자신의 계정으로 글 작성 가능
drop policy if exists "board_posts_insert_own" on public.board_posts;
create policy "board_posts_insert_own"
  on public.board_posts for insert
  with check (auth.uid() = user_id);

-- 본인 글만 직접 삭제 가능 (관리자의 삭제는 서버(API)에서 처리하므로 이 정책과 무관합니다)
drop policy if exists "board_posts_delete_own" on public.board_posts;
create policy "board_posts_delete_own"
  on public.board_posts for delete
  using (auth.uid() = user_id);
