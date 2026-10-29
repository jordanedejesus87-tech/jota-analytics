-- Comercial: registro venda a venda, com origem (aplicado em 29/10/2026)
--
-- Cada venda é uma linha em public.vendas. O gatilho mantém public.daily_sales
-- (total e quantidade por vendedor/dia) sempre igual à soma das vendas individuais,
-- então todos os indicadores que já existem (meta, projeção, semanas, resultados)
-- continuam funcionando sem mudança.
-- Dias lançados antes (pelo total do dia) continuam em daily_sales, sem origem.

create table if not exists public.vendas (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  salesperson_name text not null,
  sale_date        date not null,
  valor            numeric(12,2) not null check (valor > 0),
  origem           text not null check (origem in (
                     'reativacao', 'recompra', 'site_google', 'instagram', 'facebook',
                     'indicacao', 'presencial', 'outro')),
  cliente          text,
  pedido           text,
  observacao       text,
  site_lead_id     uuid references public.site_leads(id) on delete set null,
  canal_site       text,           -- canal do orçamento do site (google_ads, busca_organica, ...)
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists vendas_empresa_data on public.vendas (company_id, sale_date);
create index if not exists vendas_dia on public.vendas (company_id, salesperson_name, sale_date);

alter table public.vendas enable row level security;

-- Nome do usuário logado (é o mesmo nome usado em salesperson_name)
create or replace function public.my_name() returns text
language sql stable security definer set search_path = public as $$
  select name from profiles where id = auth.uid()
$$;
revoke all on function public.my_name() from public;
grant execute on function public.my_name() to authenticated;

-- Todos da empresa veem as vendas (igual a daily_sales)
create policy vendas_ler on public.vendas for select to authenticated
  using (company_id = my_company_id() and my_role() in ('admin','system','commercial','client','externo'));
-- Gestor lança para qualquer vendedor; vendedor(a) só em seu próprio nome
create policy vendas_criar on public.vendas for insert to authenticated
  with check (company_id = my_company_id() and (my_role() in ('admin','system')
    or (my_role() in ('commercial','externo') and salesperson_name = my_name())));
create policy vendas_editar on public.vendas for update to authenticated
  using (company_id = my_company_id() and (my_role() in ('admin','system')
    or (my_role() in ('commercial','externo') and salesperson_name = my_name())))
  with check (company_id = my_company_id() and (my_role() in ('admin','system')
    or (my_role() in ('commercial','externo') and salesperson_name = my_name())));
create policy vendas_apagar on public.vendas for delete to authenticated
  using (company_id = my_company_id() and (my_role() in ('admin','system')
    or (my_role() in ('commercial','externo') and salesperson_name = my_name())));

-- Recalcula o total do dia a partir das vendas individuais
create or replace function public.vendas_recalcular_dia(p_company uuid, p_nome text, p_data date)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into daily_sales (company_id, salesperson_name, sale_date, total_amount, ticket_count)
  select p_company, p_nome, p_data, coalesce(sum(valor), 0), count(*)
  from vendas where company_id = p_company and salesperson_name = p_nome and sale_date = p_data
  on conflict (company_id, salesperson_name, sale_date)
    do update set total_amount = excluded.total_amount, ticket_count = excluded.ticket_count;
end $$;
revoke all on function public.vendas_recalcular_dia(uuid, text, date) from public, anon, authenticated;

create or replace function public.vendas_sincronizar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end $$;

create or replace function public.vendas_apos_mudanca() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform vendas_recalcular_dia(old.company_id, old.salesperson_name, old.sale_date);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform vendas_recalcular_dia(new.company_id, new.salesperson_name, new.sale_date);
  end if;
  return null;
end $$;

drop trigger if exists vendas_updated_at on public.vendas;
create trigger vendas_updated_at before update on public.vendas
  for each row execute function public.vendas_sincronizar();
drop trigger if exists vendas_total_dia on public.vendas;
create trigger vendas_total_dia after insert or update or delete on public.vendas
  for each row execute function public.vendas_apos_mudanca();
