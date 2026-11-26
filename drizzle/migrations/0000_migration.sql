
create type public.app_role as enum ('admin','gestor','supervisor','operador','analista');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text unique not null, is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, city text, total_tables int not null default 0,
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, email text, organization_id uuid references public.organizations(id),
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null, unique(user_id, role)
);
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, category text not null, cost_per_kg numeric(10,2) not null default 0,
  active boolean not null default true, created_at timestamptz not null default now()
);
create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  code text not null, seats int not null default 4, area text not null default 'Salão principal',
  status text not null default 'disponivel' check (status in ('disponivel','ocupada','aguardando_limpeza','em_limpeza','reservada','bloqueada')),
  status_since timestamptz not null default now()
);
create table public.service_visits (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  arrived_at timestamptz not null, wait_seconds int not null, sector text not null,
  party_size int not null default 1
);
create table public.plate_analyses (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  analyzed_at timestamptz not null, weight_g int not null, estimated_cost numeric(10,2) not null,
  price_charged numeric(10,2) not null, composition jsonb not null default '{}'::jsonb
);
create table public.waste_records (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  recorded_at timestamptz not null, waste_g int not null, estimated_cost numeric(10,2) not null
);
create table public.cleaning_events (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  table_id uuid references public.dining_tables(id) on delete cascade,
  started_at timestamptz not null, duration_seconds int not null
);
create table public.satisfaction_responses (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  responded_at timestamptz not null, score int not null check (score between 0 and 10), comment text
);
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  created_at timestamptz not null default now(), type text not null,
  severity text not null check (severity in ('baixa','media','alta','critica')),
  title text not null, description text, status text not null default 'aberto' check (status in ('aberto','reconhecido','resolvido')),
  resolved_at timestamptz, resolved_by uuid
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid, action text not null, entity text not null, entity_id uuid, details jsonb,
  created_at timestamptz not null default now()
);

grant select on public.organizations, public.units, public.user_roles to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.foods to authenticated;
grant select, update on public.dining_tables, public.alerts to authenticated;
grant select on public.service_visits, public.plate_analyses, public.waste_records, public.cleaning_events, public.satisfaction_responses to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant all on public.organizations, public.units, public.profiles, public.user_roles, public.foods, public.dining_tables, public.service_visits, public.plate_analyses, public.waste_records, public.cleaning_events, public.satisfaction_responses, public.alerts, public.audit_logs to service_role;

alter table public.organizations enable row level security;
alter table public.units enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.foods enable row level security;
alter table public.dining_tables enable row level security;
alter table public.service_visits enable row level security;
alter table public.plate_analyses enable row level security;
alter table public.waste_records enable row level security;
alter table public.cleaning_events enable row level security;
alter table public.satisfaction_responses enable row level security;
alter table public.alerts enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.current_org()
returns uuid language sql stable security definer set search_path = public
as $$ select organization_id from public.profiles where id = auth.uid() $$;

create or replace function public.can_access_unit(_unit uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.units u where u.id=_unit and u.organization_id = public.current_org()) $$;

create or replace function public.can_manage()
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'gestor') $$;

create policy "org read" on public.organizations for select to authenticated using (id = public.current_org());
create policy "units read" on public.units for select to authenticated using (organization_id = public.current_org());
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or (organization_id = public.current_org() and public.can_manage()));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and organization_id is not distinct from public.current_org());
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "foods read" on public.foods for select to authenticated using (organization_id = public.current_org());
create policy "foods insert" on public.foods for insert to authenticated with check (organization_id = public.current_org() and public.can_manage());
create policy "foods update" on public.foods for update to authenticated using (organization_id = public.current_org() and public.can_manage());
create policy "foods delete" on public.foods for delete to authenticated using (organization_id = public.current_org() and public.can_manage());

create policy "tables read" on public.dining_tables for select to authenticated using (public.can_access_unit(unit_id));
create policy "tables update" on public.dining_tables for update to authenticated using (public.can_access_unit(unit_id));
create policy "visits read" on public.service_visits for select to authenticated using (public.can_access_unit(unit_id));
create policy "plates read" on public.plate_analyses for select to authenticated using (public.can_access_unit(unit_id));
create policy "waste read" on public.waste_records for select to authenticated using (public.can_access_unit(unit_id));
create policy "cleaning read" on public.cleaning_events for select to authenticated using (public.can_access_unit(unit_id));
create policy "satisfaction read" on public.satisfaction_responses for select to authenticated using (public.can_access_unit(unit_id));
create policy "alerts read" on public.alerts for select to authenticated using (public.can_access_unit(unit_id));
create policy "alerts update" on public.alerts for update to authenticated using (public.can_access_unit(unit_id));
create policy "audit read" on public.audit_logs for select to authenticated using (organization_id = public.current_org() and public.can_manage());
create policy "audit insert" on public.audit_logs for insert to authenticated with check (organization_id = public.current_org() and user_id = auth.uid());

insert into public.organizations (id, name, slug, is_demo) values
 ('00000000-0000-0000-0000-000000000001','Bovinu''S Grill & Beer','bovinus',true);
insert into public.units (id, organization_id, name, city, total_tables) values
 ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','Unidade Augusta','São Paulo',32);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, organization_id)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email,
          '00000000-0000-0000-0000-000000000001');
  insert into public.user_roles (user_id, role)
  values (new.id, case when (select count(*) from public.user_roles where role='admin') = 0 then 'admin'::public.app_role else 'analista'::public.app_role end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.foods (organization_id, name, category, cost_per_kg) values
 ('00000000-0000-0000-0000-000000000001','Picanha','Carnes',89.90),
 ('00000000-0000-0000-0000-000000000001','Fraldinha','Carnes',62.50),
 ('00000000-0000-0000-0000-000000000001','Frango grelhado','Carnes',24.80),
 ('00000000-0000-0000-0000-000000000001','Arroz branco','Acompanhamentos',6.20),
 ('00000000-0000-0000-0000-000000000001','Feijão','Acompanhamentos',7.90),
 ('00000000-0000-0000-0000-000000000001','Farofa','Acompanhamentos',11.40),
 ('00000000-0000-0000-0000-000000000001','Batata frita','Acompanhamentos',14.30),
 ('00000000-0000-0000-0000-000000000001','Salada verde','Saladas',9.60),
 ('00000000-0000-0000-0000-000000000001','Vinagrete','Saladas',8.20),
 ('00000000-0000-0000-0000-000000000001','Mandioca cozida','Acompanhamentos',7.10),
 ('00000000-0000-0000-0000-000000000001','Pudim','Sobremesas',22.00);

insert into public.dining_tables (unit_id, code, seats, area, status, status_since)
select '00000000-0000-0000-0000-000000000011', 'M' || lpad(g::text,2,'0'), case when g % 5 = 0 then 6 when g % 3 = 0 then 2 else 4 end,
  case when g <= 20 then 'Salão principal' else 'Varanda' end,
  (array['disponivel','ocupada','ocupada','aguardando_limpeza','ocupada','disponivel','em_limpeza','ocupada'])[1 + (g % 8)],
  now() - ((g * 3) % 40) * interval '1 minute'
from generate_series(1,32) g;

insert into public.service_visits (unit_id, arrived_at, wait_seconds, sector, party_size)
select '00000000-0000-0000-0000-000000000011',
  date_trunc('day', now()) - d * interval '1 day' + interval '14 hours' + (random()*240) * interval '1 minute',
  (60 + random()*420)::int,
  (array['Entrada','Buffet','Grelha','Balança','Caixa'])[1 + floor(random()*5)::int],
  1 + floor(random()*4)::int
from generate_series(0,29) d, generate_series(1, 140) n;

insert into public.plate_analyses (unit_id, analyzed_at, weight_g, estimated_cost, price_charged, composition)
select '00000000-0000-0000-0000-000000000011', t, w, round(((w/1000.0) * (18 + random()*14))::numeric, 2), round((w/1000.0) * 89.90, 2),
  jsonb_build_object('Carnes', c, 'Acompanhamentos', a, 'Saladas', 100 - c - a)
from (
  select date_trunc('day', now()) - d * interval '1 day' + interval '14 hours' + (random()*240) * interval '1 minute' t,
    (280 + random()*420)::int w, (30 + floor(random()*20))::int c, (30 + floor(random()*20))::int a
  from generate_series(0,29) d, generate_series(1,110) n
) s;

insert into public.waste_records (unit_id, food_id, recorded_at, waste_g, estimated_cost)
select '00000000-0000-0000-0000-000000000011', f.id,
  date_trunc('day', now()) - d * interval '1 day' + interval '18 hours' + (random()*30) * interval '1 minute',
  x.w, round((x.w/1000.0 * f.cost_per_kg)::numeric, 2)
from generate_series(0,29) d cross join public.foods f
cross join lateral (select (200 + random()*1800 * case when f.category='Acompanhamentos' then 1.6 else 1 end + d*0)::int w) x;

insert into public.cleaning_events (unit_id, table_id, started_at, duration_seconds)
select '00000000-0000-0000-0000-000000000011', t.id,
  date_trunc('day', now()) - d * interval '1 day' + interval '14 hours' + (random()*240) * interval '1 minute',
  (90 + random()*360)::int
from generate_series(0,29) d cross join (select id from public.dining_tables order by random() limit 18) t;

insert into public.satisfaction_responses (unit_id, responded_at, score)
select '00000000-0000-0000-0000-000000000011',
  date_trunc('day', now()) - d * interval '1 day' + interval '15 hours' + (random()*200) * interval '1 minute',
  least(10, greatest(3, round(8 + (random()-0.4)*4)))::int
from generate_series(0,29) d, generate_series(1,22) n;

insert into public.alerts (unit_id, created_at, type, severity, title, description, status) values
 ('00000000-0000-0000-0000-000000000011', now() - interval '6 minutes','fila','alta','Fila acima do limite na grelha','Tempo de espera estimado superior a 7 minutos no setor Grelha.','aberto'),
 ('00000000-0000-0000-0000-000000000011', now() - interval '14 minutes','limpeza','media','Mesa M04 aguardando limpeza','Mesa liberada há mais de 10 minutos sem higienização.','aberto'),
 ('00000000-0000-0000-0000-000000000011', now() - interval '32 minutes','buffet','media','Reposição de farofa','Cuba com nível estimado abaixo de 20%.','reconhecido'),
 ('00000000-0000-0000-0000-000000000011', now() - interval '2 hours','camera','baixa','Câmera Salão 02 com latência','Latência média acima de 800 ms nos últimos 5 minutos.','resolvido'),
 ('00000000-0000-0000-0000-000000000011', now() - interval '3 hours','desperdicio','critica','Desperdício acima da meta','Descarte de acompanhamentos 38% acima da média semanal.','aberto');
