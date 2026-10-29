-- Marketing: anúncios do Meta (Facebook/Instagram) e, depois, do TikTok — aplicado em 29/10/2026
-- (migrações midia_paga_tabelas e midia_sync_chaves)
--
-- midia_contas: conta de anúncios de cada empresa por plataforma. O token NÃO fica no banco:
--   token_env é o nome do segredo da Edge Function (ex.: META_TOKEN_LAESC), cadastrado no painel do Supabase.
-- midia_diario: números por dia, anúncio e posicionamento (instagram, facebook...), gravados pela função
--   supabase/functions/midia-sync, que reenvia sempre os últimos 28 dias (o Meta ajusta conversas retroativamente).
-- midia_sync_chaves: hash (sha256) da chave usada pelo agendamento diário para chamar a função.
-- Google Ads continua em ads_diario (script dentro da conta do Google Ads).

create table if not exists public.midia_contas (
  company_id uuid not null references public.companies(id) on delete cascade,
  plataforma text not null check (plataforma in ('meta', 'tiktok')),
  conta_id text not null, conta_nome text, token_env text not null,
  ativo boolean not null default true, inicio date not null default '2026-08-01',
  ultimo_envio timestamptz, ultimo_erro text, atualizado_em timestamptz not null default now(),
  primary key (company_id, plataforma)
);
alter table public.midia_contas enable row level security;
create policy midia_contas_ler on public.midia_contas for select to authenticated
  using (my_role() in ('admin','system') or (company_id = my_company_id() and my_role() = 'client'));

create table if not exists public.midia_diario (
  company_id uuid not null references public.companies(id) on delete cascade,
  plataforma text not null, data date not null,
  campanha_id text not null, campanha text not null, objetivo text,
  conjunto_id text, conjunto text, anuncio_id text not null, anuncio text,
  posicionamento text not null default 'todos',
  impressoes integer not null default 0, alcance integer not null default 0,
  cliques integer not null default 0, cliques_link integer not null default 0,
  custo numeric(12,2) not null default 0,
  conversas numeric(10,2) not null default 0, leads numeric(10,2) not null default 0,
  visitas_pagina numeric(10,2) not null default 0, engajamento numeric(10,2) not null default 0,
  video_views numeric(10,2) not null default 0, seguidores numeric(10,2) not null default 0,
  acoes jsonb, atualizado_em timestamptz not null default now(),
  primary key (company_id, plataforma, data, anuncio_id, posicionamento)
);
create index if not exists midia_diario_periodo on public.midia_diario (company_id, plataforma, data);
alter table public.midia_diario enable row level security;
create policy midia_diario_ler on public.midia_diario for select to authenticated
  using (my_role() in ('admin','system') or (company_id = my_company_id() and my_role() = 'client'));

create table if not exists public.midia_sync_chaves (
  id serial primary key, chave_hash text not null unique, descricao text, criado_em timestamptz not null default now()
);
alter table public.midia_sync_chaves enable row level security; -- sem políticas: só a função (service_role) lê

-- PENDENTE (ao conectar a conta da LAESC):
-- insert into midia_contas (company_id, plataforma, conta_id, token_env) values ('<id LAESC>', 'meta', '<nº da conta>', 'META_TOKEN_LAESC');
-- agendamento diário com pg_cron + pg_net chamando /functions/v1/midia-sync com o cabeçalho x-sync-key.
