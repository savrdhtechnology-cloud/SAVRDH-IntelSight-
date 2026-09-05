-- SAVRDH IntelSight™ — Phase 1 database foundation
-- Apply in a dedicated Supabase project after reviewing retention and access requirements.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'analyst' check (role in ('owner','admin','analyst','reviewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org_id and m.user_id = auth.uid()
  );
$$;

create table if not exists public.search_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  search_type text not null check (search_type in ('email','mobile','username','domain')),
  query text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  result_mode text not null default 'live' check (result_mode in ('live','demo')),
  visibility_score integer check (visibility_score between 0 and 100),
  confidence integer check (confidence between 0 and 100),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.source_results (
  id uuid primary key default gen_random_uuid(),
  search_job_id uuid not null references public.search_jobs(id) on delete cascade,
  source_name text not null,
  source_category text not null,
  source_url text,
  title text,
  summary text,
  confidence integer check (confidence between 0 and 100),
  observed_at timestamptz,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  case_number text not null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','review','closed','archived')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, case_number)
);

create table if not exists public.case_searches (
  case_id uuid not null references public.cases(id) on delete cascade,
  search_job_id uuid not null references public.search_jobs(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete restrict,
  added_at timestamptz not null default now(),
  primary key (case_id, search_job_id)
);

create table if not exists public.case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  from_label text not null,
  from_type text not null,
  to_label text not null,
  to_type text not null,
  relationship_type text not null,
  confidence integer not null check (confidence between 0 and 100),
  evidence_source_result_id uuid references public.source_results(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  label text not null,
  subject_type text not null check (subject_type in ('email','mobile','username','domain','organization')),
  subject_value text not null,
  authorized_basis text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  status text not null default 'draft' check (status in ('draft','final')),
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_search_jobs_org_created on public.search_jobs (organization_id, created_at desc);
create index if not exists idx_source_results_job on public.source_results (search_job_id);
create index if not exists idx_cases_org_status on public.cases (organization_id, status);
create index if not exists idx_relationships_case on public.relationships (case_id);
create index if not exists idx_audit_logs_org_created on public.audit_logs (organization_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.search_jobs enable row level security;
alter table public.source_results enable row level security;
alter table public.cases enable row level security;
alter table public.case_searches enable row level security;
alter table public.case_notes enable row level security;
alter table public.relationships enable row level security;
alter table public.watchlists enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

create policy "members can read organizations" on public.organizations for select using (public.is_org_member(id));
create policy "creator can insert organization" on public.organizations for insert with check (created_by = auth.uid());

create policy "members can read memberships" on public.organization_members for select using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy "users can create own membership" on public.organization_members for insert with check (user_id = auth.uid());

create policy "members read search jobs" on public.search_jobs for select using (public.is_org_member(organization_id));
create policy "members create search jobs" on public.search_jobs for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());

create policy "members read source results" on public.source_results for select using (
  exists (select 1 from public.search_jobs j where j.id = search_job_id and public.is_org_member(j.organization_id))
);

create policy "members read cases" on public.cases for select using (public.is_org_member(organization_id));
create policy "members create cases" on public.cases for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy "members update cases" on public.cases for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "members read case searches" on public.case_searches for select using (
  exists (select 1 from public.cases c where c.id = case_id and public.is_org_member(c.organization_id))
);
create policy "members add case searches" on public.case_searches for insert with check (
  added_by = auth.uid() and exists (select 1 from public.cases c where c.id = case_id and public.is_org_member(c.organization_id))
);

create policy "members read notes" on public.case_notes for select using (
  exists (select 1 from public.cases c where c.id = case_id and public.is_org_member(c.organization_id))
);
create policy "members add notes" on public.case_notes for insert with check (
  author_id = auth.uid() and exists (select 1 from public.cases c where c.id = case_id and public.is_org_member(c.organization_id))
);

create policy "members read relationships" on public.relationships for select using (public.is_org_member(organization_id));
create policy "members create relationships" on public.relationships for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());

create policy "members read watchlists" on public.watchlists for select using (public.is_org_member(organization_id));
create policy "members create watchlists" on public.watchlists for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());

create policy "members read reports" on public.reports for select using (public.is_org_member(organization_id));
create policy "members create reports" on public.reports for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());

create policy "members read audit logs" on public.audit_logs for select using (organization_id is not null and public.is_org_member(organization_id));
