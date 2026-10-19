"""Gera o SQL de importação da planilha Laesc_Roteiro_Visitas_Vendedor para o módulo Vendedor externo do Jota Analytics.

Uso: python3 -I scripts/importar_planilha_externo.py <roteiro.xlsx> <email_do_vendedor> <slug_da_empresa> > importacao.sql

- Cada linha com nome nas abas de rota vira uma empresa (sem duplicar o mesmo nome).
- Cada linha com Data da Visita vira uma visita do vendedor indicado (origem = 'planilha').
- Reuniões internas, panfletagem e dias de chuva ficam de fora; retornos sem hora nem anotação também.
- Linhas com anotação mas sem data são listadas no stderr (não dá para criar visita sem data).
"""
import sys, re, unicodedata, datetime as dt
import openpyxl

src, email, slug = sys.argv[1], sys.argv[2], sys.argv[3]
wb = openpyxl.load_workbook(src, data_only=True)

def norm(s):
    s = unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', s).strip().lower()

COLS = {
    'descricao': 'nome', 'endereco': 'endereco', 'bairro': 'bairro', 'telefone': 'telefone', 'contato': 'contato',
    'obs': 'obs', 'agendamento': 'agendamento', 'data da visita': 'data', 'hora chegada': 'chegada', 'hora saida': 'saida',
    'no funcionarios': 'funcionarios', 'ja compra uniforme?': 'compra', 'ja comprou da laesc?': 'laesc',
    'expectativa de venda (pecas)': 'expectativa', 'possibilidade de venda': 'possibilidade',
    'pecas vendidas (real)': 'pecas', 'faturamento vendido (r$)': 'faturamento',
}
INTERNAS = re.compile(r'^(jota|panfleto|a tarde chovendo|chuva)|reuniao')

def q(v):
    if v is None or v == '': return 'null'
    return "'" + str(v).replace("'", "''") + "'"

def limpa(v):
    if v is None: return None
    s = re.sub(r'\s+', ' ', str(v)).strip().rstrip(']').strip()
    if s in ('', '-55', '(  )    -', '( ) -'): return None
    return s

def to_date(v):
    if isinstance(v, dt.datetime): return v.date()
    if isinstance(v, dt.date): return v
    if isinstance(v, str):
        for f in ('%d/%m/%Y', '%d/%m/%y'):
            try: return dt.datetime.strptime(v.strip(), f).date()
            except ValueError: pass
    return None

def to_time(v):
    if isinstance(v, dt.time): return v.strftime('%H:%M')
    if isinstance(v, dt.datetime): return v.strftime('%H:%M')
    if isinstance(v, str) and re.match(r'^\d{1,2}:\d{2}', v.strip()): return v.strip()[:5]
    return None

def to_int(v):
    try: return int(round(float(str(v).replace(',', '.')))) if v not in (None, '') else None
    except ValueError: return None

def to_money(v):
    if v in (None, ''): return None
    if isinstance(v, (int, float)): return round(float(v), 2)
    s = str(v).replace('R$', '').strip().replace('.', '').replace(',', '.')
    try: return round(float(s), 2)
    except ValueError: return None

def simnao(v):
    n = norm(v)
    return 'Sim' if n == 'sim' else 'Não' if n == 'nao' else None

def possib(v):
    n = norm(v)
    return {'alta': 'Alta', 'media': 'Média', 'baixa': 'Baixa'}.get(n)

empresas = {}   # chave -> dict
ordem = []
visitas = []
sem_data = []
for ws in wb.worksheets:
    if norm(ws.title) == 'indicadores': continue
    rows = list(ws.iter_rows(values_only=True))
    if not rows: continue
    idx = {COLS[norm(h)]: i for i, h in enumerate(rows[0]) if norm(h) in COLS}
    if 'nome' not in idx: continue
    rota = ws.title.strip().title().replace(' Do ', ' do ')
    for row in rows[1:]:
        r = {k: (row[i] if i < len(row) else None) for k, i in idx.items()}
        nome = limpa(r.get('nome'))
        if not nome or INTERNAS.search(norm(nome)): continue
        chave = norm(nome)
        e = empresas.get(chave)
        if not e:
            e = {'id': len(ordem) + 1, 'rota': rota, 'nome': nome}
            empresas[chave] = e; ordem.append(chave)
        for k in ('endereco', 'bairro', 'telefone', 'contato'):
            val = limpa(r.get(k))
            if val and not e.get(k): e[k] = val
        d = to_date(r.get('data'))
        obs = limpa(r.get('obs'))
        chegada = to_time(r.get('chegada'))
        if not d:
            if obs or r.get('expectativa') or r.get('possibilidade'):
                sem_data.append(f'{rota}: {nome} — {obs or ""} {r.get("expectativa") or ""} {r.get("possibilidade") or ""}'.strip())
            continue
        if not chegada and norm(obs) in ('', 'retorno'): continue
        ag = r.get('agendamento')
        ag = ag.strftime('%d/%m/%Y') if isinstance(ag, (dt.date, dt.datetime)) else limpa(ag)
        saida = to_time(r.get('saida'))
        if chegada and saida and saida <= chegada: saida = None
        visitas.append({
            'empresa_id': e['id'], 'data_visita': d.isoformat(), 'hora_chegada': chegada, 'hora_saida': saida,
            'obs': obs, 'agendamento': ag, 'n_funcionarios': to_int(r.get('funcionarios')),
            'ja_compra_uniforme': simnao(r.get('compra')), 'ja_comprou_laesc': simnao(r.get('laesc')),
            'expectativa_pecas': to_int(r.get('expectativa')), 'possibilidade': possib(r.get('possibilidade')),
            'pecas_vendidas': to_int(r.get('pecas')), 'faturamento': to_money(r.get('faturamento')),
        })

print('-- Importação da planilha Laesc_Roteiro_Visitas_Vendedor')
print(f'-- {len(ordem)} empresas, {len(visitas)} visitas')
print('begin;')
print('insert into public.ext_empresas (id, company_id, rota, nome, endereco, bairro, telefone, contato) overriding system value values')
print(',\n'.join(
    f"({e['id']}, (select id from public.companies where slug = {q(slug)}), {q(e['rota'])}, {q(e['nome'])}, {q(e.get('endereco'))}, {q(e.get('bairro'))}, {q(e.get('telefone'))}, {q(e.get('contato'))})"
    for e in (empresas[k] for k in ordem)) + ';')
print("select setval(pg_get_serial_sequence('public.ext_empresas', 'id'), (select max(id) from public.ext_empresas));")
cols = ['empresa_id', 'data_visita', 'hora_chegada', 'hora_saida', 'obs', 'agendamento', 'n_funcionarios', 'ja_compra_uniforme',
        'ja_comprou_laesc', 'expectativa_pecas', 'possibilidade', 'pecas_vendidas', 'faturamento']
print(f"insert into public.ext_visitas ({', '.join(cols)}, vendedor_id, company_id, origem)")
print(f"select {', '.join('v.' + c if c not in ('data_visita', 'hora_chegada', 'hora_saida', 'empresa_id', 'n_funcionarios', 'expectativa_pecas', 'pecas_vendidas', 'faturamento') else 'v.' + c + '::' + {'data_visita': 'date', 'hora_chegada': 'time', 'hora_saida': 'time', 'empresa_id': 'bigint', 'n_funcionarios': 'int', 'expectativa_pecas': 'int', 'pecas_vendidas': 'int', 'faturamento': 'numeric'}[c] for c in cols)}, u.id, (select id from public.companies where slug = {q(slug)}), 'planilha'")
print('from (values')
print(',\n'.join('(' + ', '.join(q(v[c]) for c in cols) + ')' for v in visitas))
print(f") as v ({', '.join(cols)})")
print(f"cross join (select id from auth.users where email = {q(email.lower())}) u;")
print('commit;')
print(f'Empresas: {len(ordem)} · visitas: {len(visitas)} · anotações sem data: {len(sem_data)}', file=sys.stderr)
for s in sem_data: print('  sem data —', s, file=sys.stderr)
