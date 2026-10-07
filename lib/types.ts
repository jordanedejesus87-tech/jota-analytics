export type Role = 'system' | 'admin' | 'client' | 'commercial'

export interface Company {
  id: string
  name: string
  slug: string
  logo_url?: string
  created_at: string
}

export interface Profile {
  id: string
  company_id: string
  name: string
  role: Role
  created_at: string
  company?: Company
}

// ── DFC ──────────────────────────────────────────────────────────────────────

export type Mes = 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun' |
                  'jul' | 'ago' | 'set' | 'out' | 'nov' | 'dez'

export interface MesDFC {
  meta: number
  real: number | null     // null = projetado (Out-Dez)
}

export interface DFCData {
  year: number
  period_label: string    // ex: "Jan-Set/26 Realizado | Out-Dez/26 Projetado"
  rv: Record<Mes, MesDFC>
  pvar: Record<Mes, MesDFC>
  pfx: Record<Mes, MesDFC>
  mc: Record<Mes, MesDFC>
  roai: Record<Mes, MesDFC>
  ro: Record<Mes, MesDFC>
  gc: Record<Mes, MesDFC>
  saldo_ini: Record<Mes, number>
  saldo_fin: Record<Mes, number>
  realizados: Mes[]       // meses com dados reais
}

export interface DFCSnapshot {
  id: string
  company_id: string
  year: number
  data: DFCData
  period_label: string
  created_at: string
}

// ── VENDAS ───────────────────────────────────────────────────────────────────

export type Canal = 'loja' | 'digital' | 'b2b' | 'outros'

export interface SaleRecord {
  id: string
  company_id: string
  date: string
  amount: number
  customer: string
  salesperson: string
  channel: Canal
  category?: string
  notes?: string
  created_at: string
}

export interface SaleRecordInsert {
  company_id: string
  date: string
  amount: number
  customer: string
  salesperson: string
  channel: Canal
  category?: string
  notes?: string
}

// ── VENDAS DIÁRIAS ───────────────────────────────────────────────────────────

export interface DailySale {
  id: string
  company_id: string
  salesperson_name: string
  sale_date: string        // 'YYYY-MM-DD'
  total_amount: number
  ticket_count: number
  created_at: string
}

// ── METAS COMERCIAIS ─────────────────────────────────────────────────────────

export interface SalespersonTarget {
  id: string
  company_id: string
  salesperson_name: string
  year: number
  month: number          // 1-12
  target_amount: number
  created_at: string
}

export interface TeamTarget {
  id: string
  company_id: string
  year: number
  month: number          // 1-12
  target_amount: number
  created_at: string
}
