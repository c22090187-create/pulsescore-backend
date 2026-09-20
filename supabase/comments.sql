-- 경기 토론(댓글/답글) 테이블
-- Supabase 대시보드 > SQL Editor 에서 이 스크립트를 한 번 실행해주세요.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  thread_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  text text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists comments_thread_key_idx on public.comments (thread_key, created_at);

alter table public.comments enable row level security;

-- 댓글은 로그인 여부와 상관없이 누구나 조회 가능
drop policy if exists "comments_select_all" on public.comments;
create policy "comments_select_all"
  on public.comments for select
  using (true);

-- 로그인한 회원만 자신의 계정으로 댓글/답글 작성 가능
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
  on public.comments for insert
  with check (auth.uid() = user_id);

-- 본인 댓글만 직접 삭제 가능 (관리자의 삭제는 서버(API)에서 처리하므로 이 정책과 무관합니다)
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
  on public.comments for delete
  using (auth.uid() = user_id);
