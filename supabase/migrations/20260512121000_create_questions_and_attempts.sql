create extension if not exists pgcrypto;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  question_type text not null,
  stem text not null,
  choices jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  explanation text,
  knowledge_tags jsonb not null default '[]'::jsonb,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_section_check
    check (section in ('quant', 'verbal', 'data_insights')),
  constraint questions_source_check
    check (source in ('manual', 'screenshot', 'ocr')),
  constraint questions_question_type_not_blank
    check (length(btrim(question_type)) > 0),
  constraint questions_stem_not_blank
    check (length(btrim(stem)) > 0),
  constraint questions_correct_answer_not_blank
    check (length(btrim(correct_answer)) > 0),
  constraint questions_choices_array
    check (jsonb_typeof(choices) = 'array'),
  constraint questions_knowledge_tags_array
    check (jsonb_typeof(knowledge_tags) = 'array')
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_answer text not null,
  correct_answer text not null,
  is_correct boolean not null,
  time_spent_seconds integer,
  error_tags jsonb not null default '[]'::jsonb,
  note text,
  attempted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint attempts_user_answer_not_blank
    check (length(btrim(user_answer)) > 0),
  constraint attempts_correct_answer_not_blank
    check (length(btrim(correct_answer)) > 0),
  constraint attempts_time_spent_seconds_non_negative
    check (time_spent_seconds is null or time_spent_seconds >= 0),
  constraint attempts_error_tags_array
    check (jsonb_typeof(error_tags) = 'array')
);

create index if not exists questions_created_at_idx
  on public.questions (created_at desc);

create index if not exists questions_section_question_type_idx
  on public.questions (section, question_type);

create index if not exists questions_knowledge_tags_gin_idx
  on public.questions using gin (knowledge_tags);

create index if not exists attempts_question_id_attempted_at_idx
  on public.attempts (question_id, attempted_at desc);

create index if not exists attempts_is_correct_idx
  on public.attempts (is_correct);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_questions_updated_at on public.questions;

create trigger set_questions_updated_at
before update on public.questions
for each row
execute function public.set_updated_at();
