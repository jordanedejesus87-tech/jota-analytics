# JOTA Analytics — Guia de Deploy

Passo a passo completo para colocar o sistema no ar usando Supabase + GitHub + Vercel.

---

## 1. Supabase — Criar Projeto

1. Acesse [app.supabase.com](https://app.supabase.com) e clique em **New Project**
2. Nomeie como `jota-analytics`, escolha a região **South America (São Paulo)**
3. Anote a senha do banco (você precisará dela depois)
4. Aguarde o projeto inicializar (~2 min)

### Executar o Schema SQL

1. No painel Supabase, vá em **SQL Editor → New Query**
2. Cole o conteúdo de `supabase/schema.sql`
3. Clique em **Run** (deve executar sem erros)
4. Vá em **Table Editor** e confirme que as tabelas `companies`, `profiles`, `dfc_snapshots` e `sales_records` foram criadas

### Criar o usuário Admin (Jordane)

1. Vá em **Authentication → Users → Invite user**
2. Digite o e-mail do admin (jordanedejesus87@gmail.com)
3. Após confirmar o e-mail e criar senha, vá em **SQL Editor** e execute:

```sql
-- Associar o admin à empresa LAESC e definir role
UPDATE profiles
SET
  role = 'admin',
  company_id = (SELECT id FROM companies WHERE slug = 'laesc'),
  name = 'Jordane Lopes'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'jordanedejesus87@gmail.com'
);
```

### Coletar as chaves da API

No painel Supabase, vá em **Project Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (manter secreto!)

---

## 2. GitHub — Publicar o Código

```bash
# No terminal, dentro da pasta DashboardLAESC:
cd "LAESC MALHAS/DashboardLAESC"

git init
git add .
git commit -m "feat: JOTA Analytics v1"

# Crie um repositório em github.com (ex: jota-analytics)
git remote add origin https://github.com/SEU_USUARIO/jota-analytics.git
git branch -M main
git push -u origin main
```

> **Atenção:** nunca commite o arquivo `.env.local` (já está no `.gitignore`).

---

## 3. Vercel — Deploy

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **Add New → Project** e selecione o repositório `jota-analytics`
3. Em **Framework Preset**, selecione **Next.js**
4. Em **Environment Variables**, adicione as três variáveis:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role (apenas server-side) |

5. Clique em **Deploy** — o sistema estará online em ~2 minutos

### URL final
Vercel gera uma URL como `jota-analytics.vercel.app`. Você pode adicionar um domínio próprio depois.

---

## 4. Criar Usuários para Clientes

Para cada novo cliente (empresa), execute no SQL Editor do Supabase:

```sql
-- 1. Criar empresa
INSERT INTO companies (name, slug)
VALUES ('Nome da Empresa', 'slug-empresa');

-- 2. Após criar o usuário via Authentication → Users, associar:
UPDATE profiles
SET
  role = 'client',   -- ou 'commercial'
  company_id = (SELECT id FROM companies WHERE slug = 'slug-empresa'),
  name = 'Nome do Usuário'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'email@cliente.com'
);
```

**Perfis disponíveis:**
- `admin` — JOTA Soluções, vê tudo
- `client` — Dono da empresa, vê DFC financeiro
- `commercial` — Funcionário, vê e registra vendas

---

## 5. Carregar Dados DFC

### Exportar JSON do script Python

Execute no terminal:
```bash
python build_dfc_laesc.py --export-json
```
Isso gera o arquivo `dfc_laesc_2026.json` na mesma pasta.

### Upload pelo Painel Admin

1. Faça login no sistema como admin
2. Vá em **Administração → Upload DFC**
3. Selecione a empresa, o ano e o arquivo JSON
4. Clique em **Carregar DFC**

Os dados ficam salvos no banco e atualizam automaticamente o dashboard do cliente.

---

## 6. Deploy Contínuo

Qualquer `git push` para o branch `main` faz deploy automático no Vercel.

```bash
# Fluxo de atualização
git add .
git commit -m "fix: descrição da mudança"
git push
# Vercel faz deploy automático em ~1 min
```

---

## Suporte

Dúvidas: jordanedejesus87@gmail.com | JOTA Soluções
