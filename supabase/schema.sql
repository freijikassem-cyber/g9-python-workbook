-- G9 Assignment Helper: teacher accounts, classrooms and student reports.
-- Run once in the Supabase SQL editor.

create extension if not exists pgcrypto with schema extensions;

-- One private classroom per teacher. Students join with the classroom code in their link.
create table if not exists public.classrooms (
  teacher_id uuid primary key references auth.users on delete cascade default auth.uid(),
  teacher_name text not null default '' check (char_length(teacher_name) <= 80),
  code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  created_at timestamptz not null default now()
);

-- One row per student attempt. Written only through save_student_session().
create table if not exists public.student_sessions (
  id uuid primary key,
  token_hash text not null,
  teacher_id uuid not null references public.classrooms on delete cascade,
  name text not null default '',
  class_name text not null default '',
  phase text not null default 'starter',
  ended_early boolean not null default false,
  starter numeric not null default 0,
  followup numeric not null default 0,
  hints int not null default 0,
  checked int not null default 0,
  question_count int not null default 3,
  reflection jsonb not null default '{}'::jsonb,
  results jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index if not exists student_sessions_teacher on public.student_sessions (teacher_id, started_at desc);

alter table public.classrooms enable row level security;
alter table public.student_sessions enable row level security;

-- Teachers see and manage only their own classroom and their own students' reports.
drop policy if exists "own classroom read" on public.classrooms;
drop policy if exists "own classroom create" on public.classrooms;
drop policy if exists "own classroom rename" on public.classrooms;
drop policy if exists "own students read" on public.student_sessions;
drop policy if exists "own students delete" on public.student_sessions;
create policy "own classroom read" on public.classrooms for select to authenticated using (teacher_id = auth.uid());
create policy "own classroom create" on public.classrooms for insert to authenticated with check (teacher_id = auth.uid());
create policy "own classroom rename" on public.classrooms for update to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "own students read" on public.student_sessions for select to authenticated using (teacher_id = auth.uid());
create policy "own students delete" on public.student_sessions for delete to authenticated using (teacher_id = auth.uid());

revoke all on public.classrooms, public.student_sessions from anon;
revoke insert, update on public.student_sessions from authenticated;
grant select, insert, update on public.classrooms to authenticated;
grant select, delete on public.student_sessions to authenticated;

-- Students (no account) check that their classroom link is valid.
create or replace function public.classroom_exists(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from classrooms where code = p_code);
$$;

-- Students save their progress. Each attempt has a secret token, so nobody else can overwrite it.
create or replace function public.save_student_session(p_id uuid, p_token text, p_code text, p_data jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_teacher uuid;
  v_hash text := encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  v_existing text;
begin
  if char_length(coalesce(p_token, '')) < 32 then raise exception 'invalid token'; end if;
  if pg_column_size(p_data) > 100000 then raise exception 'report too large'; end if;
  select teacher_id into v_teacher from classrooms where code = p_code;
  if v_teacher is null then raise exception 'classroom not found'; end if;
  select token_hash into v_existing from student_sessions where id = p_id;
  if v_existing is not null and v_existing <> v_hash then raise exception 'not allowed'; end if;

  insert into student_sessions as s (id, token_hash, teacher_id, name, class_name, phase, ended_early,
    starter, followup, hints, checked, question_count, reflection, results, last_seen)
  values (p_id, v_hash, v_teacher,
    left(coalesce(p_data->>'name', ''), 70), left(coalesce(p_data->>'className', ''), 25),
    left(coalesce(p_data->>'phase', 'starter'), 20), coalesce((p_data->>'endedEarly')::boolean, false),
    coalesce((p_data->>'starter')::numeric, 0), coalesce((p_data->>'followup')::numeric, 0),
    coalesce((p_data->>'hints')::int, 0), coalesce((p_data->>'checked')::int, 0),
    coalesce((p_data->>'questionCount')::int, 3),
    coalesce(p_data->'reflection', '{}'::jsonb), coalesce(p_data->'results', '[]'::jsonb), now())
  on conflict (id) do update set
    name = excluded.name, class_name = excluded.class_name, phase = excluded.phase,
    ended_early = excluded.ended_early, starter = excluded.starter, followup = excluded.followup,
    hints = excluded.hints, checked = excluded.checked, question_count = excluded.question_count,
    reflection = excluded.reflection, results = excluded.results, last_seen = now();
end;
$$;

revoke all on function public.classroom_exists(text) from public;
revoke all on function public.save_student_session(uuid, text, text, jsonb) from public;
grant execute on function public.classroom_exists(text) to anon, authenticated;
grant execute on function public.save_student_session(uuid, text, text, jsonb) to anon, authenticated;
