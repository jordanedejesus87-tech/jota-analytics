// Jota Analytics — sincronização dos anúncios do Meta (Facebook/Instagram) com public.midia_diario.
//
// Quem chama:
//  • o agendamento diário (pg_cron), com o cabeçalho x-sync-key (conferido pelo hash em midia_sync_chaves);
//  • o botão "Atualizar agora" do painel, com o login do usuário (admin/system, ou o dono da própria empresa).
// O token do Meta fica como segredo da função (nome em midia_contas.token_env), nunca no banco nem no navegador.
// Sempre reenvia os últimos 28 dias, porque o Meta continua ajustando conversas de dias anteriores.
// TikTok: a tabela e a tela já aceitam plataforma = 'tiktok'; a coleta entra quando a conta da LAESC existir.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const API = 'https://graph.facebook.com/v23.0'
const JANELA_DIAS = 28
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-key',
}

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const iso = (d: Date) => d.toISOString().slice(0, 10)
const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
const somar = (s: string, n: number) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d) }

async function sha256(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('')
}

type Acao = { action_type: string; value: string }
const acao = (lista: Acao[] | undefined, ...tipos: string[]) => {
  for (const t of tipos) {
    const a = lista?.find((x) => x.action_type === t)
    if (a) return Number(a.value) || 0
  }
  return 0
}

async function buscarMeta(conta: string, token: string, de: string, ate: string) {
  const linhas: Record<string, unknown>[] = []
  // Em blocos de 31 dias para não estourar o tempo de resposta do Meta
  for (let ini = de; ini <= ate; ini = somar(ini, 31)) {
    const fim = somar(ini, 30) < ate ? somar(ini, 30) : ate
    const q = new URLSearchParams({
      level: 'ad',
      time_increment: '1',
      time_range: JSON.stringify({ since: ini, until: fim }),
      breakdowns: 'publisher_platform',
      fields: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,objective,impressions,reach,clicks,inline_link_clicks,spend,actions',
      limit: '500',
      access_token: token,
    })
    let url: string | null = `${API}/act_${conta}/insights?${q}`
    while (url) {
      const r = await fetch(url)
      const j = await r.json()
      if (!r.ok || j.error) throw new Error(j.error?.message || `Meta respondeu ${r.status}`)
      for (const x of j.data ?? []) {
        const a = x.actions as Acao[] | undefined
        linhas.push({
          plataforma: 'meta',
          data: x.date_start,
          campanha_id: x.campaign_id,
          campanha: x.campaign_name ?? '(sem nome)',
          objetivo: x.objective ?? null,
          conjunto_id: x.adset_id ?? null,
          conjunto: x.adset_name ?? null,
          anuncio_id: x.ad_id,
          anuncio: x.ad_name ?? null,
          posicionamento: x.publisher_platform ?? 'todos',
          impressoes: Number(x.impressions) || 0,
          alcance: Number(x.reach) || 0,
          cliques: Number(x.clicks) || 0,
          cliques_link: Number(x.inline_link_clicks) || 0,
          custo: Number(x.spend) || 0,
          conversas: acao(a, 'onsite_conversion.messaging_conversation_started_7d'),
          leads: acao(a, 'lead', 'onsite_conversion.lead_grouped'),
          visitas_pagina: acao(a, 'landing_page_view'),
          engajamento: acao(a, 'post_engagement'),
          video_views: acao(a, 'video_view'),
          seguidores: acao(a, 'like', 'onsite_conversion.follow'),
          acoes: a ?? null,
        })
      }
      url = j.paging?.next ?? null
    }
  }
  return linhas
}

async function nomeConta(conta: string, token: string) {
  const r = await fetch(`${API}/act_${conta}?fields=name&access_token=${encodeURIComponent(token)}`)
  const j = await r.json()
  return r.ok ? (j.name as string) : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const responder = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

  // ── Quem está chamando ──────────────────────────────────────────────────
  let empresaPermitida: string | null | undefined // undefined = sem acesso; null = todas
  const chave = req.headers.get('x-sync-key')
  if (chave) {
    const { data } = await admin.from('midia_sync_chaves').select('id').eq('chave_hash', await sha256(chave)).maybeSingle()
    if (data) empresaPermitida = null
  } else {
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: u } = await admin.auth.getUser(jwt)
    if (u?.user) {
      const { data: p } = await admin.from('profiles').select('role, company_id').eq('id', u.user.id).single()
      if (p && ['admin', 'system'].includes(p.role)) empresaPermitida = null
      else if (p && p.role === 'client') empresaPermitida = p.company_id
    }
  }
  if (empresaPermitida === undefined) return responder({ erro: 'sem permissao' }, 401)

  const corpo = await req.json().catch(() => ({})) as { company_id?: string }
  let filtro = admin.from('midia_contas').select('company_id, plataforma, conta_id, token_env, inicio, ultimo_envio').eq('ativo', true).eq('plataforma', 'meta')
  const alvo = empresaPermitida ?? corpo.company_id
  if (alvo) filtro = filtro.eq('company_id', alvo)
  const { data: contas, error } = await filtro
  if (error) return responder({ erro: error.message }, 500)

  const hoje = hojeSP()
  const resultado: Record<string, unknown>[] = []
  for (const c of contas ?? []) {
    const token = Deno.env.get(c.token_env)
    try {
      if (!token) throw new Error(`O token ${c.token_env} ainda não foi cadastrado nos segredos da função`)
      const de = c.ultimo_envio ? (somar(hoje, -JANELA_DIAS) > c.inicio ? somar(hoje, -JANELA_DIAS) : c.inicio) : c.inicio
      const linhas = (await buscarMeta(c.conta_id, token, de, hoje)).map((l) => ({ ...l, company_id: c.company_id, atualizado_em: new Date().toISOString() }))
      for (let i = 0; i < linhas.length; i += 500) {
        const { error: e } = await admin.from('midia_diario').upsert(linhas.slice(i, i + 500), { onConflict: 'company_id,plataforma,data,anuncio_id,posicionamento' })
        if (e) throw new Error(e.message)
      }
      const nome = await nomeConta(c.conta_id, token)
      await admin.from('midia_contas').update({ ultimo_envio: new Date().toISOString(), ultimo_erro: null, ...(nome ? { conta_nome: nome } : {}) })
        .eq('company_id', c.company_id).eq('plataforma', c.plataforma)
      resultado.push({ empresa: c.company_id, de, ate: hoje, linhas: linhas.length })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await admin.from('midia_contas').update({ ultimo_erro: msg.slice(0, 500) }).eq('company_id', c.company_id).eq('plataforma', c.plataforma)
      resultado.push({ empresa: c.company_id, erro: msg })
    }
  }
  return responder({ ok: true, contas: resultado })
})
