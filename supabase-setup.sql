create table if not exists public.payroll_data (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.payroll_data enable row level security;

create policy if not exists "Allow read access to payroll data"
  on public.payroll_data for select
  using (true);

create policy if not exists "Allow write access to payroll data"
  on public.payroll_data for insert
  with check (true);

create policy if not exists "Allow update access to payroll data"
  on public.payroll_data for update
  using (true)
  with check (true);
