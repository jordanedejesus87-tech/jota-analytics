-- ============================================================
-- JOTA Analytics — Migração: daily_sales + targets + seed
-- Execute no SQL Editor do painel Supabase (app.supabase.com)
-- ============================================================

-- 1. TABELA: salesperson_targets (metas individuais por mês)
CREATE TABLE IF NOT EXISTS salesperson_targets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  salesperson_name  TEXT NOT NULL,
  year              INTEGER NOT NULL,
  month             INTEGER NOT NULL,
  target_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, salesperson_name, year, month)
);

ALTER TABLE salesperson_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "commercial_read_targets" ON salesperson_targets
  FOR SELECT USING (company_id = my_company_id() AND my_role() IN ('admin','commercial','system'));

CREATE POLICY IF NOT EXISTS "admin_manage_targets" ON salesperson_targets
  FOR ALL USING (company_id = my_company_id() AND my_role() IN ('admin','system'));

-- 2. TABELA: team_targets (meta geral do time por mês)
CREATE TABLE IF NOT EXISTS team_targets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year          INTEGER NOT NULL,
  month         INTEGER NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, year, month)
);

ALTER TABLE team_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "commercial_read_team_targets" ON team_targets
  FOR SELECT USING (company_id = my_company_id() AND my_role() IN ('admin','commercial','system'));

CREATE POLICY IF NOT EXISTS "admin_manage_team_targets" ON team_targets
  FOR ALL USING (company_id = my_company_id() AND my_role() IN ('admin','system'));

-- 3. TABELA: daily_sales (vendas diárias por vendedor)
CREATE TABLE IF NOT EXISTS daily_sales (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  salesperson_name  TEXT NOT NULL,
  sale_date         DATE NOT NULL,
  total_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  ticket_count      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_daily_sale UNIQUE (company_id, salesperson_name, sale_date)
);

ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "commercial_read_daily_sales" ON daily_sales
  FOR SELECT USING (company_id = my_company_id() AND my_role() IN ('admin','commercial','system'));

CREATE POLICY IF NOT EXISTS "commercial_upsert_daily_sales" ON daily_sales
  FOR INSERT WITH CHECK (company_id = my_company_id() AND my_role() IN ('admin','commercial','system'));

CREATE POLICY IF NOT EXISTS "commercial_update_daily_sales" ON daily_sales
  FOR UPDATE USING (company_id = my_company_id() AND my_role() IN ('admin','commercial','system'));

CREATE POLICY IF NOT EXISTS "admin_delete_daily_sales" ON daily_sales
  FOR DELETE USING (my_role() IN ('admin','system'));

-- ============================================================
-- SEED: Metas por vendedor (Ago / Set / Out 2026)
-- ============================================================

INSERT INTO salesperson_targets (company_id, salesperson_name, year, month, target_amount) VALUES
  -- Agosto 2026
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', 2026, 8, 75000.00),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna',    2026, 8, 28000.00),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica',  2026, 8, 17000.00),
  -- Setembro 2026
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna',    2026, 9, 75000.00),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica',  2026, 9, 25000.00),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', 2026, 9, 20000.00),
  -- Outubro 2026
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna',    2026, 10, 75000.00),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica',  2026, 10, 25000.00),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', 2026, 10, 20000.00),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Evandro',  2026, 10, 15000.00)
ON CONFLICT (company_id, salesperson_name, year, month)
  DO UPDATE SET target_amount = EXCLUDED.target_amount;

-- ============================================================
-- SEED: Meta do time (Ago / Set / Out 2026)
-- ============================================================

INSERT INTO team_targets (company_id, year, month, target_amount) VALUES
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 2026, 8,  120000.00),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 2026, 9,  120000.00),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 2026, 10, 135000.00)
ON CONFLICT (company_id, year, month)
  DO UPDATE SET target_amount = EXCLUDED.target_amount;

-- ============================================================
-- SEED: Vendas diárias históricas (Ago / Set / Out parcial)
-- Valores distribuídos proporcionalmente dos totais semanais
-- da planilha CONTROLE VENDAS LAESC
-- ============================================================

INSERT INTO daily_sales (company_id, salesperson_name, sale_date, total_amount, ticket_count) VALUES
  -- ── AGOSTO 2026 — GERÔNIMO (meta R$ 75.000) ──────────────────────────
  -- Sem 1 (Seg 03/08 - Sex 07/08): R$ 9.424,00 → 5 dias
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-03', 1884.80, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-04', 1884.80, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-05', 1884.80, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-06', 1884.80, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-07', 1884.80, 0),
  -- Sem 2 (Seg 10/08 - Sex 14/08): R$ 16.690,80 → 5 dias
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-10', 3338.16, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-11', 3338.16, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-12', 3338.16, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-13', 3338.16, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-14', 3338.16, 0),
  -- Sem 3 (Seg 17/08 - Sex 21/08): R$ 11.727,20 → 5 dias
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-17', 2345.44, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-18', 2345.44, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-19', 2345.44, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-20', 2345.44, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-21', 2345.44, 0),
  -- Sem 4 (Seg 24/08 - Sex 28/08): R$ 13.491,90 → 5 dias
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-24', 2698.38, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-25', 2698.38, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-26', 2698.38, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-27', 2698.38, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-28', 2698.38, 0),
  -- Sem 5 (Seg 31/08): R$ 79,90 → 1 dia
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-08-31',   79.90, 0),

  -- ── AGOSTO 2026 — BRUNA (meta R$ 28.000) ─────────────────────────────
  -- Sem 1: R$ 4.325,90 → 5 dias
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-03',  865.18, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-04',  865.18, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-05',  865.18, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-06',  865.18, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-07',  865.18, 0),
  -- Sem 2: R$ 5.318,50 → 5 dias
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-10', 1063.70, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-11', 1063.70, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-12', 1063.70, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-13', 1063.70, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-14', 1063.70, 0),
  -- Sem 3: R$ 4.477,90 → 5 dias
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-17',  895.58, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-18',  895.58, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-19',  895.58, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-20',  895.58, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-21',  895.58, 0),
  -- Sem 4: R$ 7.931,80 → 5 dias
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-24', 1586.36, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-25', 1586.36, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-26', 1586.36, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-27', 1586.36, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-28', 1586.36, 0),
  -- Sem 5: R$ 3.271,40 → 1 dia
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-08-31', 3271.40, 0),

  -- ── AGOSTO 2026 — JÉSSICA (meta R$ 17.000) ───────────────────────────
  -- Sem 1: R$ 1.835,33 → 5 dias
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-03',  367.07, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-04',  367.07, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-05',  367.07, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-06',  367.07, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-07',  367.05, 0),
  -- Sem 2: R$ 2.910,30 → 5 dias
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-10',  582.06, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-11',  582.06, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-12',  582.06, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-13',  582.06, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-14',  582.06, 0),
  -- Sem 3: R$ 2.059,40 → 5 dias
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-17',  411.88, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-18',  411.88, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-19',  411.88, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-20',  411.88, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-21',  411.88, 0),
  -- Sem 4: R$ 1.308,50 → 5 dias
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-24',  261.70, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-25',  261.70, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-26',  261.70, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-27',  261.70, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-28',  261.70, 0),
  -- Sem 5: R$ 738,50 → 1 dia
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-08-31',  738.50, 0),

  -- ── SETEMBRO 2026 — BRUNA (meta R$ 75.000) ───────────────────────────
  -- Sem 1 (Ter 01/09 - Sex 04/09, 4 dias): R$ 13.691,00
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-01', 3422.75, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-02', 3422.75, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-03', 3422.75, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-04', 3422.75, 0),
  -- Sem 2 (Ter 08/09 - Sex 11/09, 4 dias, seg 07/09=feriado): R$ 20.672,70
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-08', 5168.18, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-09', 5168.18, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-10', 5168.18, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-11', 5168.16, 0),
  -- Sem 3 (Seg 14/09 - Sex 18/09, 5 dias): R$ 30.231,30
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-14', 6046.26, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-15', 6046.26, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-16', 6046.26, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-17', 6046.26, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-18', 6046.26, 0),
  -- Sem 4 (Seg 21/09 - Sex 25/09, 5 dias): R$ 16.832,63
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-21', 3366.53, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-22', 3366.53, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-23', 3366.53, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-24', 3366.53, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-25', 3366.51, 0),
  -- Sem 5 (Seg 28/09 - Qua 30/09, 3 dias): R$ 540,10
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-28',  180.03, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-29',  180.03, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-09-30',  180.04, 0),

  -- ── SETEMBRO 2026 — JÉSSICA (meta R$ 25.000) ─────────────────────────
  -- Sem 1 (4 dias): R$ 5.149,26
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-01', 1287.32, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-02', 1287.32, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-03', 1287.32, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-04', 1287.30, 0),
  -- Sem 2 (4 dias): R$ 5.101,00
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-08', 1275.25, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-09', 1275.25, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-10', 1275.25, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-11', 1275.25, 0),
  -- Sem 3 (5 dias): R$ 7.152,40
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-14', 1430.48, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-15', 1430.48, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-16', 1430.48, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-17', 1430.48, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-18', 1430.48, 0),
  -- Sem 4 (5 dias): R$ 9.729,50
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-21', 1945.90, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-22', 1945.90, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-23', 1945.90, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-24', 1945.90, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-25', 1945.90, 0),
  -- Sem 5 (3 dias): R$ 875,50
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-28',  291.83, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-29',  291.83, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-09-30',  291.84, 0),

  -- ── SETEMBRO 2026 — GERÔNIMO (meta R$ 20.000) ────────────────────────
  -- Sem 1 (4 dias): R$ 6.784,20
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-01', 1696.05, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-02', 1696.05, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-03', 1696.05, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-04', 1696.05, 0),
  -- Sem 2 (4 dias): R$ 6.664,90
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-08', 1666.22, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-09', 1666.22, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-10', 1666.22, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-11', 1666.24, 0),
  -- Sem 3 (5 dias): R$ 4.145,40
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-14',  829.08, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-15',  829.08, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-16',  829.08, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-17',  829.08, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-18',  829.08, 0),
  -- Sem 4 (5 dias): R$ 3.051,18
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-21',  610.24, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-22',  610.24, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-23',  610.24, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-24',  610.24, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-25',  610.22, 0),
  -- Sem 5 (3 dias): R$ 174,10
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-28',   58.03, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-29',   58.03, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-09-30',   58.04, 0),

  -- ── OUTUBRO 2026 — BRUNA (meta R$ 75.000) ────────────────────────────
  -- Sem 1 (Qui 01/10 - Sex 02/10, 2 dias): R$ 6.741,60
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-10-01', 3370.80, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-10-02', 3370.80, 0),
  -- Sem 2 (Seg 05/10 - Sex 09/10, 5 dias): R$ 6.646,00
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-10-05', 1329.20, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-10-06', 1329.20, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-10-07', 1329.20, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-10-08', 1329.20, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Bruna', '2026-10-09', 1329.20, 0),

  -- ── OUTUBRO 2026 — JÉSSICA (meta R$ 25.000) ──────────────────────────
  -- Sem 1 (2 dias): R$ 2.285,10
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-10-01', 1142.55, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-10-02', 1142.55, 0),
  -- Sem 2 (5 dias): R$ 3.263,60
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-10-05',  652.72, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-10-06',  652.72, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-10-07',  652.72, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-10-08',  652.72, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Jéssica', '2026-10-09',  652.72, 0),

  -- ── OUTUBRO 2026 — GERÔNIMO (meta R$ 20.000) ─────────────────────────
  -- Sem 2 (5 dias): R$ 3.186,50
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-10-05',  637.30, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-10-06',  637.30, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-10-07',  637.30, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-10-08',  637.30, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Gerônimo', '2026-10-09',  637.30, 0),

  -- ── OUTUBRO 2026 — EVANDRO (meta R$ 15.000) ──────────────────────────
  -- Sem 2 (5 dias): R$ 1.642,50
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Evandro', '2026-10-05',  328.50, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Evandro', '2026-10-06',  328.50, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Evandro', '2026-10-07',  328.50, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Evandro', '2026-10-08',  328.50, 0),
  ('64b833c2-e99d-43fc-9e79-2d6d882858e7', 'Evandro', '2026-10-09',  328.50, 0)
ON CONFLICT (company_id, salesperson_name, sale_date) DO NOTHING;
