"""Gera SQL incremental (idempotente) da planilha para o módulo Vendedor externo.

Uso: python3 -I scripts/sincronizar_planilha_externo.py <roteiro.xlsx> <email_do_vendedor> <slug_da_empresa> [desde AAAA-MM-DD] > sync.sql

Com 'desde', só entram as visitas a partir dessa data (e as empresas delas) — SQL bem menor.

- Empresas: insere só as que ainda não existem (mesmo nome, mesma empresa).
- Visitas: insere só as que não existem (mesma empresa, data e hora de chegada).
  Visitas já importadas da planilha (origem = 'planilha') têm os campos atualizados;
  fichas feitas no app não são tocadas.
"""
import sys, io, contextlib, runpy
buf_out, buf_err = io.StringIO(), io.StringIO()
with contextlib.redirect_stdout(buf_out), contextlib.redirect_stderr(buf_err):
    g = runpy.run_path(__file__.replace('sincronizar_', 'importar_'), run_name='imp')
empresas, ordem, visitas, q = g['empresas'], g['ordem'], g['visitas'], g['q']
slug, email = sys.argv[3], sys.argv[2].lower()
por_id = {empresas[k]['id']: empresas[k] for k in ordem}
if len(sys.argv) > 4:
    visitas = [v for v in visitas if v['data_visita'] >= sys.argv[4]]
    usadas = {v['empresa_id'] for v in visitas}
    ordem = [k for k in ordem if empresas[k]['id'] in usadas]
C = f"(select id from public.companies where slug = {q(slug)})"
print('begin;')
print('insert into public.ext_empresas (company_id, rota, nome, endereco, bairro, telefone, contato)')
print(f'select {C}, v.rota, v.nome, v.endereco, v.bairro, v.telefone, v.contato from (values')
print(',\n'.join(f"({q(e['rota'])}, {q(e['nome'])}, {q(e.get('endereco'))}, {q(e.get('bairro'))}, {q(e.get('telefone'))}, {q(e.get('contato'))})" for e in (empresas[k] for k in ordem)))
print(') as v (rota, nome, endereco, bairro, telefone, contato)')
print(f'where not exists (select 1 from public.ext_empresas x where x.company_id = {C} and x.nome = v.nome);')
cols = ['data_visita', 'hora_chegada', 'hora_saida', 'obs', 'agendamento', 'n_funcionarios', 'ja_compra_uniforme', 'ja_comprou_laesc', 'expectativa_pecas', 'possibilidade', 'pecas_vendidas', 'faturamento']
cast = {'data_visita': 'date', 'hora_chegada': 'time', 'hora_saida': 'time', 'n_funcionarios': 'int', 'expectativa_pecas': 'int', 'pecas_vendidas': 'int', 'faturamento': 'numeric'}
vals = ',\n'.join('(' + ', '.join([q(por_id[v['empresa_id']]['nome'])] + [q(v[c]) for c in cols]) + ')' for v in visitas)
src = f"""(select e.id as empresa_id, {', '.join('v.' + c + ('::' + cast[c] if c in cast else '') + ' as ' + c for c in cols)}
  from (values
{vals}
  ) as v (nome, {', '.join(cols)})
  join public.ext_empresas e on e.nome = v.nome and e.company_id = {C})"""
print(f'update public.ext_visitas t set {", ".join(f"{c} = s.{c}" for c in cols if c not in ("data_visita", "hora_chegada"))}')
print(f'from {src} s')
print("where t.origem = 'planilha' and t.empresa_id = s.empresa_id and t.data_visita = s.data_visita and t.hora_chegada is not distinct from s.hora_chegada;")
print(f"insert into public.ext_visitas (empresa_id, {', '.join(cols)}, vendedor_id, company_id, origem)")
print(f"select s.empresa_id, {', '.join('s.' + c for c in cols)}, u.id, {C}, 'planilha'")
print(f'from {src} s')
print(f"cross join (select id from auth.users where email = {q(email)}) u")
print('where not exists (select 1 from public.ext_visitas t where t.empresa_id = s.empresa_id and t.data_visita = s.data_visita and t.hora_chegada is not distinct from s.hora_chegada);')
print('commit;')
print(f'Planilha: {len(ordem)} empresas, {len(visitas)} visitas', file=sys.stderr)
