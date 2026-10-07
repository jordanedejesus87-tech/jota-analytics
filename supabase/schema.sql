-- ============================================================
-- JOTA Analytics — Schema Supabase
-- Execute no SQL Editor do painel Supabase (app.supabase.com)
-- ============================================================

-- 1. EMPRESAS (multi-tenant)
CREATE TABLE IF NOT EXISTS companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  logo_url   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PERFIS (extend auth.users com role + empresa)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  name       TEXT,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'client', 'commercial')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-cria perfil ao registrar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. SNAPSHOTS DFC (dados financeiros por empresa/ano)
CREATE TABLE IF NOT EXISTS dfc_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year         INTEGER NOT NULL,
  period_label TEXT,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by   UUID REFERENCES auth.users(id),
  UNIQUE (company_id, year)
);

-- 4. REGISTROS DE VENDA
CREATE TABLE IF NOT EXISTS sales_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  amount       DECIMAL(12,2) NOT NULL,
  customer     TEXT NOT NULL DEFAULT '',
  salesperson  TEXT NOT NULL DEFAULT '',
  channel      TEXT CHECK (channel IN ('loja','digital','b2b','outros')) DEFAULT 'loja',
  category     TEXT,
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE companies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfc_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_records  ENABLE ROW LEVEL SECURITY;

-- Helper: retorna company_id do usuário logado
CREATE OR REPLACE FUNCTION my_company_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$;

-- Helper: retorna role do usuário logado
CREATE OR REPLACE FUNCTION my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- companies: cada usuário vê só a própria empresa
CREATE POLICY "users_see_own_company" ON companies
  FOR SELECT USING (id = my_company_id());

-- Admin vê todas as empresas
CREATE POLICY "admin_see_all_companies" ON companies
  FOR ALL USING (my_role() = 'admin');

-- profiles: usuário vê o próprio perfil
CREATE POLICY "users_see_own_profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admin gerencia todos os perfis
CREATE POLICY "admin_manage_profiles" ON profiles
  FOR ALL USING (my_role() = 'admin');

-- dfc_snapshots: client e admin veem dados da empresa
CREATE POLICY "company_sees_own_dfc" ON dfc_snapshots
  FOR SELECT USING (company_id = my_company_id() OR my_role() = 'admin');

-- Admin pode inserir/atualizar DFC
CREATE POLICY "admin_manage_dfc" ON dfc_snapshots
  FOR ALL USING (my_role() = 'admin');

-- sales_records: commercial e admin veem e editam
CREATE POLICY "commercial_sees_sales" ON sales_records
  FOR SELECT USING (
    company_id = my_company_id()
    AND my_role() IN ('admin','commercial')
  );

CREATE POLICY "commercial_inserts_sales" ON sales_records
  FOR INSERT WITH CHECK (
    company_id = my_company_id()
    AND my_role() IN ('admin','commercial')
  );

CREATE POLICY "commercial_updates_own_sales" ON sales_records
  FOR UPDATE USING (
    company_id = my_company_id()
    AND my_role() IN ('admin','commercial')
  );

CREATE POLICY "admin_deletes_sales" ON sales_records
  FOR DELETE USING (my_role() = 'admin');

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

-- Empresa LAESC
INSERT INTO companies (name, slug)
VALUES ('LAESC Malhas', 'laesc')
ON CONFLICT (slug) DO NOTHING;
