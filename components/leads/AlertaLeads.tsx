'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { BellRing, MessageCircle, Check, Volume2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fmtMin, tempoResposta, linkWhats, quando } from '@/lib/leads/crm'

interface LeadNovo { id: string; nome: string; cidade: string; produtos: string | null; quantidade: string | null; prazo: string | null; telefone: string | null; created_at: string; respondido_em: null }

const ADIAR_MS = 2 * 60e3 // "Abrir lead" esconde a janela por 2 minutos; se continuar sem resposta, ela volta

/** Janela de alerta + som + notificação do navegador para quem recebe os leads do site (ex.: Bruna). */
export default function AlertaLeads({ companyId }: { companyId: string }) {
  const router = useRouter()
  const path = usePathname()
  const supabase = useRef(createClient()).current
  const [leads, setLeads] = useState<LeadNovo[]>([])
  const [adiadoAte, setAdiadoAte] = useState(0)
  const [somLiberado, setSomLiberado] = useState(false)
  const [notif, setNotif] = useState<NotificationPermission | 'indisponivel'>('default')
  const [salvando, setSalvando] = useState(false)
  const audio = useRef<AudioContext | null>(null)
  const vistos = useRef<Set<string>>(new Set())
  const titulo = useRef<string>('')

  // libera o som no primeiro clique/tecla (o navegador exige um gesto antes de tocar áudio)
  useEffect(() => {
    const liberar = () => {
      try {
        if (!audio.current) audio.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        audio.current.resume().then(() => setSomLiberado(audio.current?.state === 'running'))
      } catch { /* sem áudio */ }
    }
    window.addEventListener('pointerdown', liberar)
    window.addEventListener('keydown', liberar)
    setNotif(typeof Notification === 'undefined' ? 'indisponivel' : Notification.permission)
    titulo.current = document.title
    return () => { window.removeEventListener('pointerdown', liberar); window.removeEventListener('keydown', liberar) }
  }, [])

  const tocar = useCallback(() => {
    const ctx = audio.current
    if (!ctx || ctx.state !== 'running') return
    const nota = (freq: number, ini: number, dur: number) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = freq
      g.gain.setValueAtTime(0.0001, ctx.currentTime + ini)
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + ini + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ini + dur)
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + ini); o.stop(ctx.currentTime + ini + dur + 0.05)
    }
    nota(880, 0, 0.18); nota(1175, 0.22, 0.18); nota(1568, 0.44, 0.3)
  }, [])

  const buscar = useCallback(async () => {
    const { data } = await supabase.from('site_leads')
      .select('id, nome, cidade, produtos, quantidade, prazo, telefone, created_at, respondido_em')
      .eq('company_id', companyId).eq('status', 'novo').order('created_at', { ascending: true }).limit(20)
    const lista = (data ?? []) as LeadNovo[]
    const novos = lista.filter((l) => !vistos.current.has(l.id))
    if (novos.length && vistos.current.size + novos.length > 0) {
      novos.forEach((l) => vistos.current.add(l.id))
      setAdiadoAte(0) // lead novo de verdade: mostra na hora, mesmo se estava adiado
      try {
        const recente = novos.find((x) => Date.now() - new Date(x.created_at).getTime() < 60 * 60e3)
        if (recente && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const n = recente
          new Notification('Novo lead no site da LAESC', { body: `${n.nome} · ${n.cidade} · ${n.produtos ?? ''}`, tag: 'lead-' + n.id, requireInteraction: true })
        }
      } catch { /* sem notificação */ }
    }
    setLeads(lista)
  }, [supabase, companyId])

  useEffect(() => { buscar(); const t = setInterval(buscar, 15000); return () => clearInterval(t) }, [buscar])

  const visivel = leads.length > 0 && Date.now() >= adiadoAte
  // som a cada 10 s e título piscando enquanto houver lead sem resposta
  useEffect(() => {
    if (!leads.length) { if (titulo.current) document.title = titulo.current; return }
    let alt = false
    if (visivel) tocar()
    const t = setInterval(() => {
      alt = !alt
      document.title = alt ? `(${leads.length}) NOVO LEAD!` : titulo.current
      if (visivel) tocar()
    }, 10000)
    return () => { clearInterval(t); if (titulo.current) document.title = titulo.current }
  }, [leads.length, visivel, tocar])
  // reavalia o adiamento
  useEffect(() => { if (!adiadoAte) return; const t = setTimeout(() => setAdiadoAte(0), Math.max(0, adiadoAte - Date.now())); return () => clearTimeout(t) }, [adiadoAte])

  async function respondi(id: string) {
    setSalvando(true)
    await supabase.from('site_leads').update({ status: 'em_atendimento' }).eq('id', id)
    setSalvando(false)
    await buscar()
    router.refresh()
  }

  function abrir(id: string) {
    setAdiadoAte(Date.now() + ADIAR_MS)
    router.push(`/dashboard/leads?lead=${id}`)
  }

  const l = leads[0]
  const wa = l ? linkWhats(l.telefone) : null

  return (
    <>
      {(!somLiberado || notif === 'default') && (
        <div className="fixed bottom-3 right-3 z-40 max-w-xs rounded-xl border border-indigo-200 bg-white p-3 shadow-lg text-sm space-y-2">
          <p className="flex items-center gap-2 font-semibold text-gray-900"><BellRing className="w-4 h-4 text-indigo-600" /> Alertas de lead do site</p>
          {!somLiberado && <p className="text-gray-600 flex items-center gap-1.5"><Volume2 className="w-4 h-4" /> Clique em qualquer lugar da tela para ativar o som.</p>}
          {notif === 'default' && (
            <button type="button" onClick={() => Notification.requestPermission().then(setNotif)} className="w-full rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-700">
              Avisar mesmo com a aba minimizada
            </button>
          )}
        </div>
      )}

      {visivel && l && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="alerta-lead-titulo">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-red-600 px-5 py-4 text-white">
              <p id="alerta-lead-titulo" className="flex items-center gap-2 text-lg font-bold"><BellRing className="w-5 h-5 animate-pulse" /> Novo lead no site{leads.length > 1 ? ` (${leads.length} aguardando)` : ''}</p>
              <p className="text-sm text-red-100">Prioridade máxima: responda em até 15 minutos.</p>
            </div>
            <div className="px-5 py-4 space-y-2">
              <p className="text-lg font-semibold text-gray-900">{l.nome} <span className="text-sm font-normal text-gray-500">· {l.cidade}</span></p>
              <p className="text-sm text-gray-700">{[l.produtos, l.quantidade, l.prazo].filter(Boolean).join(' · ')}</p>
              <p className="text-sm tabular-nums text-gray-500">Chegou {quando(l.created_at)} · aguardando há <b className="text-red-600">{fmtMin(tempoResposta(l))}</b> de expediente</p>
            </div>
            <div className="grid gap-2 px-5 pb-5">
              {wa && <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"><MessageCircle className="w-5 h-5" /> Chamar {l.telefone} no WhatsApp</a>}
              <button type="button" disabled={salvando} onClick={() => respondi(l.id)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><Check className="w-5 h-5" /> Já respondi este cliente</button>
              {path !== '/dashboard/leads' && <button type="button" onClick={() => abrir(l.id)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Ver detalhes do lead</button>}
              {path === '/dashboard/leads' && <button type="button" onClick={() => setAdiadoAte(Date.now() + ADIAR_MS)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Fechar por 2 minutos</button>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
