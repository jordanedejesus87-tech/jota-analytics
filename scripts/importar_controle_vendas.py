"""Gera o SQL de importação da planilha CONTROLE_VENDAS_LAESC para o painel Comercial do Jota Analytics.

Uso: python3 -I scripts/importar_controle_vendas.py <controle.xlsx> <company_id> > vendas.sql

- Abas "<VENDEDOR> <MÊS>": vendas por dia (quantidade e valor) e a meta do mês do vendedor.
- Abas "VENDAS <MÊS>": meta do mês do time.
- Dias ainda sem lançamento (quantidade e valor em branco) ficam de fora.
- Upsert: reimportar atualiza os valores dos dias já existentes.
"""
import sys, re, unicodedata, datetime as dt
import openpyxl

src, company = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(src, data_only=True)
MESES = {'JANEIRO': 1, 'FEVEREIRO': 2, 'MARCO': 3, 'ABRIL': 4, 'MAIO': 5, 'JUNHO': 6, 'JULHO': 7,
         'AGOSTO': 8, 'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12}
NOMES = {'GERONIMO': 'Gerônimo', 'BRUNA': 'Bruna', 'JESSICA': 'Jéssica', 'EVANDRO': 'Evandro'}

def sem_acento(s):
    return unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().upper().strip()

def num(v):
    if v in (None, ''): return None
    if isinstance(v, (int, float)): return float(v)
    s = str(v).replace('R$', '').strip().replace('.', '').replace(',', '.')
    try: return float(s)
    except ValueError: return None

def q(v): return 'null' if v is None else "'" + str(v).replace("'", "''") + "'"

vendas, metas_vend, metas_time, conferencia = [], [], [], []
ano = 2026
for ws in wb.worksheets:
    partes = sem_acento(ws.title).split()
    if len(partes) != 2 or partes[1] not in MESES: continue
    mes = MESES[partes[1]]
    rows = list(ws.iter_rows(values_only=True))
    meta = next((num(r[4]) for r in rows if r and len(r) > 4 and sem_acento(r[3] or '') == 'META MES'), None)
    if partes[0] == 'VENDAS':
        if meta: metas_time.append((mes, meta))
        continue
    nome = NOMES.get(partes[0], partes[0].title())
    if meta: metas_vend.append((nome, mes, meta))
    ini = next(i for i, r in enumerate(rows) if r and len(r) > 1 and sem_acento(r[1] or '') == 'DATA')
    fat_planilha = next((num(r[5]) for r in rows if r and len(r) > 5 and sem_acento(r[4] or '') == 'FATURAMENTO ATUAL'), None)
    soma = 0.0
    for r in rows[ini + 1:]:
        d = r[1]
        if not isinstance(d, (dt.date, dt.datetime)): break
        d = d.date() if isinstance(d, dt.datetime) else d
        qtd, total = num(r[4]), num(r[5])
        if qtd is None and total is None: continue
        if d.month != mes: print(f'aviso: {ws.title} tem a data {d} fora do mês', file=sys.stderr)
        vendas.append((nome, d.isoformat(), round(total or 0, 2), int(qtd or 0)))
        soma += total or 0
    conferencia.append(f'{ws.title}: soma dos dias {soma:,.2f} · faturamento na planilha {fat_planilha or 0:,.2f}' + ('' if abs(soma - (fat_planilha or 0)) < 0.01 else '  <-- DIFERENTE'))

print('-- Importação CONTROLE_VENDAS_LAESC')
print('begin;')
print('insert into public.daily_sales (company_id, salesperson_name, sale_date, total_amount, ticket_count) values')
print(',\n'.join(f"({q(company)}, {q(n)}, {q(d)}, {t:.2f}, {c})" for n, d, t, c in vendas))
print('on conflict (company_id, salesperson_name, sale_date) do update set total_amount = excluded.total_amount, ticket_count = excluded.ticket_count;')
print('insert into public.salesperson_targets (company_id, salesperson_name, year, month, target_amount) values')
print(',\n'.join(f"({q(company)}, {q(n)}, {ano}, {m}, {v:.2f})" for n, m, v in metas_vend))
print('on conflict (company_id, salesperson_name, year, month) do update set target_amount = excluded.target_amount;')
print('insert into public.team_targets (company_id, year, month, target_amount) values')
print(',\n'.join(f"({q(company)}, {ano}, {m}, {v:.2f})" for m, v in metas_time))
print('on conflict (company_id, year, month) do update set target_amount = excluded.target_amount;')
print('commit;')
print(f'{len(vendas)} dias de venda · {len(metas_vend)} metas de vendedor · {len(metas_time)} metas do time', file=sys.stderr)
for c in conferencia: print('  ' + c, file=sys.stderr)
