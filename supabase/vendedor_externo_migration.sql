-- ============================================================
-- JOTA Analytics — Módulo Vendedor Externo
-- Ficha de atendimento (mesmas perguntas da planilha de roteiro),
-- lista de empresas por rota e base para o painel do vendedor.
-- ============================================================

-- Novo papel: 'externo' (vendedor de rua: vê só a própria ficha e o próprio painel)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'system', 'client', 'commercial', 'externo'));

-- Empresas visitadas / a visitar (lista de prospecção por rota)
CREATE TABLE IF NOT EXISTS ext_empresas (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rota        TEXT NOT NULL DEFAULT 'Sem rota',
  nome        TEXT NOT NULL,
  endereco    TEXT,
  bairro      TEXT,
  telefone    TEXT,
  contato     TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ext_empresas_company_rota_idx ON ext_empresas (company_id, rota);

-- Visitas (a ficha de atendimento)
CREATE TABLE IF NOT EXISTS ext_visitas (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  empresa_id         BIGINT NOT NULL REFERENCES ext_empresas(id) ON DELETE RESTRICT,
  vendedor_id        UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE RESTRICT,
  data_visita        DATE NOT NULL,
  hora_chegada       TIME,
  hora_saida         TIME,
  duracao_min        INTEGER GENERATED ALWAYS AS (
    CASE WHEN hora_chegada IS NOT NULL AND hora_saida IS NOT NULL AND hora_saida > hora_chegada
      THEN (EXTRACT(EPOCH FROM (hora_saida - hora_chegada)) / 60)::INTEGER END
  ) STORED,
  obs                TEXT,
  agendamento        TEXT,
  n_funcionarios     INTEGER CHECK (n_funcionarios >= 0),
  ja_compra_uniforme TEXT CHECK (ja_compra_uniforme IN ('Sim', 'Não')),
  ja_comprou_laesc   TEXT CHECK (ja_comprou_laesc IN ('Sim', 'Não')),
  expectativa_pecas  INTEGER CHECK (expectativa_pecas >= 0),
  possibilidade      TEXT CHECK (possibilidade IN ('Alta', 'Média', 'Baixa')),
  pecas_vendidas     INTEGER CHECK (pecas_vendidas >= 0),
  faturamento        DECIMAL(12, 2) CHECK (faturamento >= 0),
  origem             TEXT NOT NULL DEFAULT 'app',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ext_visitas_vendedor_data_idx ON ext_visitas (vendedor_id, data_visita);
CREATE INDEX IF NOT EXISTS ext_visitas_empresa_idx ON ext_visitas (empresa_id);
CREATE INDEX IF NOT EXISTS ext_visitas_company_data_idx ON ext_visitas (company_id, data_visita);

CREATE OR REPLACE FUNCTION ext_tocar_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS ext_visitas_updated_at ON ext_visitas;
CREATE TRIGGER ext_visitas_updated_at BEFORE UPDATE ON ext_visitas
  FOR EACH ROW EXECUTE FUNCTION ext_tocar_updated_at();

-- Segurança por linha
ALTER TABLE ext_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_visitas  ENABLE ROW LEVEL SECURITY;

-- Empresas: quem trabalha com o módulo na mesma empresa cliente lê, cadastra e corrige.
CREATE POLICY ext_empresas_ler ON ext_empresas FOR SELECT TO authenticated USING (
  my_role() IN ('admin', 'system')
  OR (company_id = my_company_id() AND my_role() IN ('client', 'externo'))
);
CREATE POLICY ext_empresas_criar ON ext_empresas FOR INSERT TO authenticated WITH CHECK (
  my_role() IN ('admin', 'system')
  OR (company_id = my_company_id() AND my_role() = 'externo')
);
CREATE POLICY ext_empresas_editar ON ext_empresas FOR UPDATE TO authenticated USING (
  my_role() IN ('admin', 'system')
  OR (company_id = my_company_id() AND my_role() = 'externo')
);
CREATE POLICY ext_empresas_apagar ON ext_empresas FOR DELETE TO authenticated USING (
  my_role() IN ('admin', 'system')
);

-- Visitas: o vendedor vê e edita as próprias; o dono da empresa (client) vê todas da empresa; admin tudo.
CREATE POLICY ext_visitas_ler ON ext_visitas FOR SELECT TO authenticated USING (
  my_role() IN ('admin', 'system')
  OR (company_id = my_company_id() AND (vendedor_id = (SELECT auth.uid()) OR my_role() = 'client'))
);
CREATE POLICY ext_visitas_criar ON ext_visitas FOR INSERT TO authenticated WITH CHECK (
  my_role() IN ('admin', 'system')
  OR (company_id = my_company_id() AND my_role() = 'externo' AND vendedor_id = (SELECT auth.uid()))
);
CREATE POLICY ext_visitas_editar ON ext_visitas FOR UPDATE TO authenticated USING (
  my_role() IN ('admin', 'system')
  OR (company_id = my_company_id() AND vendedor_id = (SELECT auth.uid()))
);
CREATE POLICY ext_visitas_apagar ON ext_visitas FOR DELETE TO authenticated USING (
  my_role() IN ('admin', 'system')
  OR (company_id = my_company_id() AND vendedor_id = (SELECT auth.uid()))
);

-- Visão usada pelo painel e pela leitura semanal
CREATE OR REPLACE VIEW vw_ext_visitas WITH (security_invoker = true) AS
SELECT v.id, v.company_id, v.data_visita, v.hora_chegada, v.hora_saida, v.duracao_min,
       e.rota, e.nome AS cliente, e.bairro, v.obs, v.agendamento, v.n_funcionarios,
       v.ja_compra_uniforme, v.ja_comprou_laesc, v.expectativa_pecas, v.possibilidade,
       v.pecas_vendidas, v.faturamento, p.name AS vendedor, v.vendedor_id, v.empresa_id, v.origem
FROM ext_visitas v
JOIN ext_empresas e ON e.id = v.empresa_id
JOIN profiles p ON p.id = v.vendedor_id;
