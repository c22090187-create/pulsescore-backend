-- 나의 경기 예측 저장 테이블
-- Supabase 대시보드 > SQL Editor 에서 이 스크립트를 한 번 실행해주세요.

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id text not null,
  picks jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default now(),
  unique (user_id, match_id)
);

alter table public.predictions enable row level security;

-- 본인 예측 기록만 조회/추가/수정/삭제 가능 (다른 회원 것은 볼 수 없음)
drop policy if exists "predictions_select_own" on public.predictions;
create policy "predictions_select_own"
  on public.predictions for select
  using (auth.uid() = user_id);

drop policy if exists "predictions_insert_own" on public.predictions;
create policy "predictions_insert_own"
  on public.predictions for insert
  with check (auth.uid() = user_id);

drop policy if exists "predictions_update_own" on public.predictions;
create policy "predictions_update_own"
  on public.predictions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "predictions_delete_own" on public.predictions;
create policy "predictions_delete_own"
  on public.predictions for delete
  using (auth.uid() = user_id);
