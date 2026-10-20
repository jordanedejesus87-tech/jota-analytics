-- Vendedor externo — cadastro de rotas (já aplicado em 20/10/2026)
create table if not exists public.ext_rotas (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  created_at timestamptz not null default now(),
  unique (company_id, nome)
);
alter table public.ext_rotas enable row level security;
create policy ext_rotas_ler on public.ext_rotas for select to authenticated using (my_role() in ('admin','system') or (company_id = my_company_id() and my_role() in ('client','externo')));
create policy ext_rotas_criar on public.ext_rotas for insert to authenticated with check (my_role() in ('admin','system') or (company_id = my_company_id() and my_role() = 'externo'));
create policy ext_rotas_editar on public.ext_rotas for update to authenticated using (my_role() in ('admin','system') or (company_id = my_company_id() and my_role() = 'externo'));
create policy ext_rotas_apagar on public.ext_rotas for delete to authenticated using (my_role() in ('admin','system') or (company_id = my_company_id() and my_role() = 'externo'));
insert into public.ext_rotas (company_id, nome)
select distinct company_id, rota from public.ext_empresas where rota is not null and rota <> 'Sem rota' on conflict do nothing;
