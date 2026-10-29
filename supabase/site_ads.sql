-- Site e Google Ads (LAESC) — aplicado em 26/10/2026
-- 1) site_leads: orçamentos enviados pelo formulário do laesc.com.br (função pública submit_site_lead)
-- 2) ads_diario: números do Google Ads por dia e campanha, enviados por um script agendado dentro da conta do Google Ads

-- site_leads e submit_site_lead já foram criados pela migração site_leads_laesc (ver histórico do Supabase).

create table if not exists public.ads_diario (
  company_id uuid not null references public.companies(id) on delete cascade,
  data date not null,
  campanha_id text not null,
  campanha text not null,
  status text,
  impressoes integer not null default 0,
  cliques integer not null default 0,
  custo numeric(12,2) not null default 0,
  conversoes numeric(10,2) not null default 0,
  conv_whatsapp numeric(10,2) not null default 0,
  conv_orcamento numeric(10,2) not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (company_id, data, campanha_id)
);
alter table public.ads_diario enable row level security;
create policy ads_diario_ler on public.ads_diario for select to authenticated
  using (my_role() in ('admin','system') or (company_id = my_company_id() and my_role() = 'client'));

-- Termos de pesquisa (o que as pessoas digitaram no Google), acumulado por dia
create table if not exists public.ads_termos (
  company_id uuid not null references public.companies(id) on delete cascade,
  data date not null,
  campanha text not null,
  termo text not null,
  impressoes integer not null default 0,
  cliques integer not null default 0,
  custo numeric(12,2) not null default 0,
  conversoes numeric(10,2) not null default 0,
  primary key (company_id, data, campanha, termo)
);
alter table public.ads_termos enable row level security;
create policy ads_termos_ler on public.ads_termos for select to authenticated
  using (my_role() in ('admin','system') or (company_id = my_company_id() and my_role() = 'client'));

-- Chave de envio do script do Google Ads (guardada só como hash)
create table if not exists public.ads_chaves (
  company_id uuid primary key references public.companies(id) on delete cascade,
  chave_hash text not null,
  ultimo_envio timestamptz
);
alter table public.ads_chaves enable row level security; -- sem políticas: ninguém lê pela API

create or replace function public.ads_receber(p_chave text, p_diario jsonb, p_termos jsonb default '[]'::jsonb)
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare v_company uuid; n integer := 0;
begin
  select company_id into v_company from ads_chaves where chave_hash = encode(digest(p_chave, 'sha256'), 'hex');
  if v_company is null then raise exception 'chave invalida'; end if;
  if jsonb_typeof(p_diario) <> 'array' or jsonb_array_length(p_diario) > 5000 then raise exception 'formato invalido'; end if;

  insert into ads_diario (company_id, data, campanha_id, campanha, status, impressoes, cliques, custo, conversoes, conv_whatsapp, conv_orcamento, atualizado_em)
  select v_company, (r->>'data')::date, left(r->>'campanha_id', 40), left(r->>'campanha', 200), left(r->>'status', 30),
         coalesce((r->>'impressoes')::int, 0), coalesce((r->>'cliques')::int, 0), coalesce((r->>'custo')::numeric, 0),
         coalesce((r->>'conversoes')::numeric, 0), coalesce((r->>'conv_whatsapp')::numeric, 0), coalesce((r->>'conv_orcamento')::numeric, 0), now()
  from jsonb_array_elements(p_diario) r
  on conflict (company_id, data, campanha_id) do update set
    campanha = excluded.campanha, status = excluded.status, impressoes = excluded.impressoes, cliques = excluded.cliques,
    custo = excluded.custo, conversoes = excluded.conversoes, conv_whatsapp = excluded.conv_whatsapp,
    conv_orcamento = excluded.conv_orcamento, atualizado_em = now();
  get diagnostics n = row_count;

  if jsonb_typeof(p_termos) = 'array' and jsonb_array_length(p_termos) <= 5000 then
    insert into ads_termos (company_id, data, campanha, termo, impressoes, cliques, custo, conversoes)
    select v_company, (t->>'data')::date, left(t->>'campanha', 200), left(t->>'termo', 300),
           coalesce((t->>'impressoes')::int, 0), coalesce((t->>'cliques')::int, 0), coalesce((t->>'custo')::numeric, 0), coalesce((t->>'conversoes')::numeric, 0)
    from jsonb_array_elements(p_termos) t
    on conflict (company_id, data, campanha, termo) do update set
      impressoes = excluded.impressoes, cliques = excluded.cliques, custo = excluded.custo, conversoes = excluded.conversoes;
  end if;

  update ads_chaves set ultimo_envio = now() where company_id = v_company;
  return n;
end $$;
revoke all on function public.ads_receber(text, jsonb, jsonb) from public;
grant execute on function public.ads_receber(text, jsonb, jsonb) to anon, authenticated;

-- Data do último envio (para o painel mostrar se a sincronização está em dia)
create or replace function public.ads_ultimo_envio(p_company uuid)
returns timestamptz language sql stable security definer set search_path = public as $$
  select ultimo_envio from ads_chaves
  where company_id = p_company and (my_role() in ('admin','system') or (p_company = my_company_id() and my_role() = 'client'));
$$;
revoke all on function public.ads_ultimo_envio(uuid) from public;
grant execute on function public.ads_ultimo_envio(uuid) to authenticated;

-- A chave da LAESC é cadastrada à parte (hash sha256), fora do repositório.

-- 29/10/2026 — origem dos contatos (anúncio x orgânico), migração site_origem_canal:
-- site_leads ganhou canal, utm_source, utm_medium, utm_campaign, referrer, sessao;
-- nova tabela site_eventos (cliques no WhatsApp, um por visita) e funções públicas site_lead / site_evento (p_slug, p_dados jsonb).
-- Canais: google_ads, meta_ads, outros_anuncios (pagos) · busca_organica, redes_sociais, whatsapp, outros_sites, direto, nao_identificado (orgânicos).

-- 29/10/2026 — módulo Leads (migração leads_crm): site_leads ganhou telefone, responsavel_id, respondido_em/por,
-- orcado_em, valor_orcamento, fechado_em, motivo_perda, retorno_em, observacoes. Trigger site_leads_atualizar grava
-- respondido_em na 1ª mudança de "novo" e registra cada troca de etapa em lead_historico.
-- lead_responsaveis = quem recebe a janela de alerta (inicialmente a Bruna).
