-- Vendedor externo — primeira visita x follow-up, objetivo, próximo passo e data de retorno (já aplicado em 20/10/2026)
alter table public.ext_visitas
  add column if not exists tipo text not null default 'primeira' check (tipo in ('primeira','followup')),
  add column if not exists objetivo text,
  add column if not exists proximo_passo text,
  add column if not exists retorno_data date;
update public.ext_visitas v set tipo = 'followup'
where exists (select 1 from public.ext_visitas o where o.empresa_id = v.empresa_id
  and (o.data_visita, coalesce(o.hora_chegada, '00:00'::time), o.id) < (v.data_visita, coalesce(v.hora_chegada, '00:00'::time), v.id));
update public.ext_visitas set retorno_data = to_date(agendamento, 'DD/MM/YYYY')
where retorno_data is null and agendamento ~ '^\d{2}/\d{2}/\d{4}$';
create index if not exists ext_visitas_retorno_idx on public.ext_visitas (company_id, retorno_data);
create or replace view public.vw_ext_visitas with (security_invoker = true) as
select v.id, v.company_id, v.data_visita, v.hora_chegada, v.hora_saida, v.duracao_min,
       e.rota, e.nome as cliente, e.bairro, v.obs, v.agendamento, v.n_funcionarios,
       v.ja_compra_uniforme, v.ja_comprou_laesc, v.expectativa_pecas, v.possibilidade,
       v.pecas_vendidas, v.faturamento, p.name as vendedor, v.vendedor_id, v.empresa_id, v.origem,
       v.tipo, v.objetivo, v.proximo_passo, v.retorno_data, e.telefone, e.endereco, e.contato
from public.ext_visitas v
join public.ext_empresas e on e.id = v.empresa_id
join public.profiles p on p.id = v.vendedor_id;
