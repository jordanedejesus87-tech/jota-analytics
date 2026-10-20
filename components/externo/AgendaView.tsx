import Link from 'next/link'
import { clsx } from 'clsx'
import { Phone, MapPin } from 'lucide-react'
import { dm, num, type Agenda, type ItemAgenda } from '@/lib/externo/metricas'

const diaSemana = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '')

function Item({ item, hoje, podeEditar }: { item: ItemAgenda; hoje: string; podeEditar: boolean }) {
  const v = item.ultima
  const atrasado = item.data && item.data < hoje
  const tel = v.telefone ? String(v.telefone).replace(/[^\d+]/g, '') : ''
  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{v.cliente}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{[v.rota, v.bairro, v.endereco].filter(Boolean).join(' · ') || 'Sem endereço'}</p>
        </div>
        <span className={clsx('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold', atrasado ? 'bg-red-50 text-red-700' : item.data === hoje ? 'bg-indigo-600 text-white' : item.data ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600')}>
          {item.data ? (item.data === hoje ? 'hoje' : `${diaSemana(item.data)} ${dm(item.data)}`) : v.agendamento}
        </span>
      </div>
      <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {v.proximo_passo ? <p><span className="font-medium">Próximo passo:</span> {v.proximo_passo}</p> : null}
        <p className={v.proximo_passo ? 'text-xs text-gray-500 mt-0.5' : ''}>
          {v.tipo === 'followup' ? 'Combinado' : 'Última visita'} em {dm(v.data_visita)}: {v.obs || 'sem anotação'}
        </p>
        {(v.expectativa_pecas || v.possibilidade) && (
          <p className="text-xs text-gray-500 mt-0.5">{[v.expectativa_pecas && `${num(v.expectativa_pecas)} peças esperadas`, v.possibilidade && `chance ${v.possibilidade.toLowerCase()}`].filter(Boolean).join(' · ')}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {podeEditar && (
          <Link href={`/dashboard/externo/ficha/nova?tipo=followup&empresa=${v.empresa_id}`} className="flex-1 sm:flex-none rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700">Fazer follow-up</Link>
        )}
        {tel && (
          <a href={`tel:${tel}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700"><Phone className="w-4 h-4" />Ligar</a>
        )}
        <span className="self-center text-xs text-gray-400">{item.visitas} visita(s)</span>
      </div>
    </li>
  )
}

function Secao({ titulo, itens, hoje, podeEditar, destaque, vazio }: { titulo: string; itens: ItemAgenda[]; hoje: string; podeEditar: boolean; destaque?: 'red' | 'indigo'; vazio?: string }) {
  if (!itens.length && !vazio) return null
  return (
    <section className="space-y-2">
      <h3 className={clsx('text-sm font-bold uppercase tracking-wide', destaque === 'red' ? 'text-red-700' : destaque === 'indigo' ? 'text-indigo-700' : 'text-gray-600')}>{titulo} · {itens.length}</h3>
      {itens.length ? <ul className="grid gap-2 lg:grid-cols-2">{itens.map((i) => <Item key={i.ultima.empresa_id} item={i} hoje={hoje} podeEditar={podeEditar} />)}</ul>
        : <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-500">{vazio}</p>}
    </section>
  )
}

export default function AgendaView({ agenda, hoje, podeEditar, vendedores, vendedorId, salvo }: { agenda: Agenda; hoje: string; podeEditar: boolean; vendedores: { id: string; name: string }[]; vendedorId?: string; salvo?: boolean }) {
  const total = agenda.atrasados.length + agenda.hoje.length + agenda.proximos.length
  return (
    <div className="space-y-5">
      {salvo && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Visita salva e retorno marcado na agenda.</p>}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Agenda de retornos</h2>
        <p className="text-sm text-gray-500">{total ? `${agenda.hoje.length} para hoje · ${agenda.atrasados.length} atrasado(s) · ${agenda.proximos.length} nos próximos 7 dias` : 'Nenhum retorno marcado para os próximos dias.'} Marque o retorno ao salvar cada visita.</p>
      </div>
      {vendedores.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {vendedores.map((v) => <Link key={v.id} href={`?v=${v.id}`} className={clsx('rounded-full border px-3 py-1 text-sm', v.id === vendedorId ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700')}>{v.name}</Link>)}
        </div>
      )}
      <Secao titulo="Hoje" itens={agenda.hoje} hoje={hoje} podeEditar={podeEditar} destaque="indigo" vazio="Nada marcado para hoje." />
      <Secao titulo="Atrasados" itens={agenda.atrasados} hoje={hoje} podeEditar={podeEditar} destaque="red" />
      <Secao titulo="Próximos 7 dias" itens={agenda.proximos} hoje={hoje} podeEditar={podeEditar} />
      <Secao titulo="Mais adiante" itens={agenda.depois} hoje={hoje} podeEditar={podeEditar} />
      <Secao titulo="Sem data definida" itens={agenda.semData} hoje={hoje} podeEditar={podeEditar} />
    </div>
  )
}
