'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { salvarFicha, type EstadoFicha } from '@/app/dashboard/externo/acoes'

const campo = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const rotulo = 'grid gap-1.5 text-sm font-medium text-gray-700'

function Salvar() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60">
      {pending ? 'Salvando…' : 'Salvar visita'}
    </button>
  )
}

function Opcoes({ name, valores, atual }: { name: string; valores: string[]; atual?: string | null }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {[...valores, ''].map((v) => (
        <label key={v || 'vazio'} className="relative">
          <input type="radio" name={name} value={v} defaultChecked={(atual || '') === v} className="peer sr-only" />
          <span className="inline-flex min-h-[40px] cursor-pointer items-center rounded-full border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500">
            {v || 'Não informado'}
          </span>
        </label>
      ))}
    </div>
  )
}

function agora() {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
}

function Hora({ id, titulo, valor }: { id: string; titulo: string; valor?: string | null }) {
  return (
    <label className={rotulo}>
      {titulo}
      <span className="flex gap-2">
        <input id={id} name={id} type="time" defaultValue={valor || ''} className={campo} />
        <button type="button" onClick={() => { (document.getElementById(id) as HTMLInputElement).value = agora() }} className="rounded-lg border border-indigo-600 px-3 text-sm font-semibold text-indigo-700">Agora</button>
      </span>
    </label>
  )
}

function CampoRota({ rotas, atual }: { rotas: string[]; atual?: string | null }) {
  const inicial = atual && atual !== 'Sem rota' ? atual : ''
  const lista = inicial && !rotas.includes(inicial) ? [inicial, ...rotas] : rotas
  const [valor, setValor] = useState(inicial)
  return (
    <div className="grid gap-1.5">
      <label htmlFor="rota" className="text-sm font-medium text-gray-700">Rota</label>
      <select id="rota" name="rota" value={valor} onChange={(e) => setValor(e.target.value)} className={campo}>
        <option value="">Sem rota</option>
        {lista.map((r) => <option key={r} value={r}>{r}</option>)}
        <option value="__nova__">+ Criar rota nova…</option>
      </select>
      {valor === '__nova__' && (
        <input name="rota_nova" autoFocus placeholder="Nome da rota nova (ex.: Rota 5, Lavras)" className={campo} />
      )}
    </div>
  )
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
      <legend className="px-1 text-sm font-bold text-gray-900">{titulo}</legend>
      {children}
    </fieldset>
  )
}

export interface VisitaHistorico {
  id: number
  data_visita: string
  hora_chegada: string | null
  tipo?: string | null
  objetivo?: string | null
  obs: string | null
  proximo_passo?: string | null
  agendamento: string | null
  expectativa_pecas: number | null
  possibilidade: string | null
  pecas_vendidas: number | null
  faturamento: number | string | null
}

const dmyH = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const reais = (v: unknown) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function Historico({ itens }: { itens: VisitaHistorico[] }) {
  if (!itens.length) return null
  return (
    <Bloco titulo={`Histórico da empresa · ${itens.length} visita(s)`}>
      <ol className="space-y-3">
        {itens.map((v, i) => (
          <li key={v.id} className={i === 0 ? 'rounded-lg bg-indigo-50/70 border border-indigo-100 p-3' : 'border-l-2 border-gray-200 pl-3'}>
            <p className="text-xs font-semibold text-gray-500">
              {dmyH(v.data_visita)}{v.hora_chegada ? ` · ${v.hora_chegada.slice(0, 5)}` : ''} · {v.tipo === 'followup' ? 'Follow-up' : '1ª visita'}{i === 0 ? ' · última visita' : ''}
            </p>
            {v.objetivo && <p className="text-sm text-gray-800"><span className="font-medium">Objetivo:</span> {v.objetivo}</p>}
            <p className="text-sm text-gray-800"><span className="font-medium">{v.tipo === 'followup' ? 'Combinado:' : 'Obs:'}</span> {v.obs || 'sem anotação'}</p>
            {v.proximo_passo && <p className="text-sm text-gray-800"><span className="font-medium">Próximo passo:</span> {v.proximo_passo}</p>}
            <p className="text-xs text-gray-500 mt-0.5">
              {[
                v.agendamento && `retorno: ${v.agendamento}`,
                v.expectativa_pecas && `${v.expectativa_pecas} peças esperadas`,
                v.possibilidade && `chance ${v.possibilidade.toLowerCase()}`,
                Number(v.faturamento) > 0 && `vendeu ${reais(v.faturamento)}`,
              ].filter(Boolean).join(' · ')}
            </p>
          </li>
        ))}
      </ol>
    </Bloco>
  )
}

function Oportunidade({ visita }: { visita: Record<string, any> }) {
  return (
    <Bloco titulo="Oportunidade">
      <label className={rotulo + ' sm:max-w-xs'}>Expectativa de venda (peças)<input id="expectativa_pecas" name="expectativa_pecas" inputMode="numeric" defaultValue={visita.expectativa_pecas ?? ''} className={campo} /></label>
      <div className="grid gap-1.5"><span className="text-sm font-medium text-gray-700">Possibilidade de venda</span><Opcoes name="possibilidade" valores={['Alta', 'Média', 'Baixa']} atual={visita.possibilidade} /></div>
    </Bloco>
  )
}

function Venda({ visita }: { visita: Record<string, any> }) {
  const fat = visita.faturamento != null ? String(visita.faturamento).replace('.', ',') : ''
  return (
    <Bloco titulo="Venda">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={rotulo}>Peças vendidas (real)<input id="pecas_vendidas" name="pecas_vendidas" inputMode="numeric" defaultValue={visita.pecas_vendidas ?? ''} className={campo} /></label>
        <label className={rotulo}>Faturamento vendido (R$)<input id="faturamento" name="faturamento" inputMode="decimal" defaultValue={fat} placeholder="0,00" className={campo} /></label>
      </div>
    </Bloco>
  )
}

function Reagendar({ visita, hoje }: { visita: Record<string, any>; hoje: string }) {
  const ag = String(visita.agendamento || '')
  const agData = visita.retorno_data || (/^\d{2}\/\d{2}\/\d{4}$/.test(ag) ? `${ag.slice(6)}-${ag.slice(3, 5)}-${ag.slice(0, 2)}` : '')
  const marcar = (dias: number) => {
    const d = new Date(hoje + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() + dias)
    ;(document.getElementById('agendamento_data') as HTMLInputElement).value = d.toISOString().slice(0, 10)
  }
  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={rotulo}>Reagendar: voltar nesta empresa em<input id="agendamento_data" name="agendamento_data" type="date" min={hoje} defaultValue={agData} className={campo} /></label>
        <label className={rotulo}>ou período <span className="text-xs font-normal text-gray-500">quando não há data certa</span><input id="agendamento_texto" name="agendamento_texto" defaultValue={agData ? '' : ag} placeholder="Ex.: Dezembro" className={campo} /></label>
      </div>
      <div className="flex flex-wrap gap-2">
        {[['Amanhã', 1], ['Em 1 semana', 7], ['Em 15 dias', 15], ['Em 30 dias', 30]].map(([r, d]) => (
          <button key={r} type="button" onClick={() => marcar(Number(d))} className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700">{r}</button>
        ))}
      </div>
      <p className="text-xs text-gray-500">Com data marcada, a empresa aparece na sua <b>Agenda</b> no dia do retorno.</p>
    </div>
  )
}

interface Props {
  tipo?: 'primeira' | 'followup'
  empresa?: Record<string, any>
  visita?: Record<string, any>
  historico?: VisitaHistorico[]
  rotas: string[]
  hoje: string
  vendedores?: { id: string; name: string }[]
  agoraInicial?: string
}

export default function FichaForm({ tipo = 'primeira', empresa = {}, visita = {}, historico = [], rotas, hoje, vendedores = [], agoraInicial }: Props) {
  const [estado, acao] = useFormState<EstadoFicha, FormData>(salvarFicha, { erros: [] })
  const followup = tipo === 'followup'
  const chegada = visita.id ? visita.hora_chegada?.slice(0, 5) : visita.hora_chegada?.slice(0, 5) || agoraInicial

  const dadosEmpresa = (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={rotulo}>Descrição (nome da empresa)<input id="nome" name="nome" required defaultValue={empresa.nome || ''} className={campo} /></label>
      <CampoRota rotas={rotas} atual={empresa.rota} />
      <label className={rotulo}>Endereço<input id="endereco" name="endereco" defaultValue={empresa.endereco || ''} className={campo} /></label>
      <label className={rotulo}>Bairro<input id="bairro" name="bairro" defaultValue={empresa.bairro || ''} className={campo} /></label>
      <label className={rotulo}>Telefone<input id="telefone" name="telefone" type="tel" inputMode="tel" defaultValue={empresa.telefone || ''} placeholder="(55) 99999-9999" className={campo} /></label>
      <label className={rotulo}>Contato<input id="contato" name="contato" defaultValue={empresa.contato || ''} placeholder="Com quem falou" className={campo} /></label>
    </div>
  )

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="tipo" value={tipo} />
      {visita.id && <input type="hidden" name="visita_id" value={visita.id} />}
      {empresa.id && <input type="hidden" name="empresa_id" value={empresa.id} />}

      {estado.erros.length > 0 && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
          {estado.erros.map((e) => <p key={e}>{e}</p>)}
        </div>
      )}

      {followup ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 sm:px-5">
          <p className="font-semibold text-gray-900">{empresa.nome}</p>
          <p className="text-xs text-gray-500">{[empresa.rota, empresa.bairro, empresa.endereco].filter(Boolean).join(' · ') || 'Sem endereço'}</p>
          {(empresa.contato || empresa.telefone) && (
            <p className="text-sm text-gray-700 mt-1">
              {empresa.contato}{empresa.contato && empresa.telefone ? ' · ' : ''}
              {empresa.telefone && <a href={`tel:${String(empresa.telefone).replace(/[^\d+]/g, '')}`} className="font-semibold text-indigo-700 underline">{empresa.telefone}</a>}
            </p>
          )}
        </div>
      ) : empresa.id ? (
        <details className="group rounded-xl border border-gray-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <span className="min-w-0">
              <span className="block font-semibold text-gray-900 truncate">{empresa.nome}</span>
              <span className="block text-xs text-gray-500 truncate">{[empresa.rota, empresa.bairro, empresa.contato, empresa.telefone].filter(Boolean).join(' · ') || 'Sem dados de contato'}</span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-indigo-700 group-open:hidden">Editar dados</span>
            <span className="shrink-0 hidden text-sm font-semibold text-gray-500 group-open:inline">Fechar</span>
          </summary>
          <div className="border-t border-gray-100 p-4 sm:p-5">{dadosEmpresa}</div>
        </details>
      ) : (
        <Bloco titulo="Cadastro da empresa">{dadosEmpresa}</Bloco>
      )}

      {followup && <Historico itens={historico} />}

      <Bloco titulo={followup ? 'Follow-up · retorno' : 'Visita'}>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={rotulo}>Data da visita<input id="data_visita" name="data_visita" type="date" required defaultValue={visita.data_visita || hoje} className={campo} /></label>
          <Hora id="hora_chegada" titulo={followup ? 'Hora de chegada *' : 'Hora de chegada'} valor={chegada} />
          <Hora id="hora_saida" titulo={followup ? 'Hora de saída *' : 'Hora de saída'} valor={visita.hora_saida?.slice(0, 5)} />
        </div>
        {vendedores.length > 0 && !visita.id && (
          <label className={rotulo}>Vendedor
            <select id="vendedor_id" name="vendedor_id" defaultValue={vendedores[0]?.id} className={campo}>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
        )}
        <p className="text-xs text-gray-500">A chegada já vem com a hora em que a visita foi aberta. Ao sair da empresa, toque em <b>Agora</b> na saída.</p>
        {followup && (
          <>
            <label className={rotulo}>Objetivo desta visita *<textarea id="objetivo" name="objetivo" rows={2} defaultValue={visita.objetivo || ''} placeholder="Ex.: apresentar orçamento das polos, levar amostra, fechar pedido" className={campo} /></label>
            <label className={rotulo}>O que foi combinado *<textarea id="obs" name="obs" rows={3} defaultValue={visita.obs || ''} placeholder="Ex.: vai aprovar com o gerente até sexta; quer 30 polos azul-marinho" className={campo} /></label>
            <label className={rotulo}>Próximo passo / plano de ação *<textarea id="proximo_passo" name="proximo_passo" rows={2} defaultValue={visita.proximo_passo || ''} placeholder="Ex.: enviar orçamento por WhatsApp amanhã e voltar dia 28 para fechar" className={campo} /></label>
            <Reagendar visita={visita} hoje={hoje} />
          </>
        )}
      </Bloco>

      {!followup && (
        <Bloco titulo="Perfil do cliente">
          <label className={rotulo + ' sm:max-w-xs'}>Nº de funcionários<input id="n_funcionarios" name="n_funcionarios" inputMode="numeric" defaultValue={visita.n_funcionarios ?? ''} className={campo} /></label>
          <div className="grid gap-1.5"><span className="text-sm font-medium text-gray-700">Já compra uniforme?</span><Opcoes name="ja_compra_uniforme" valores={['Sim', 'Não']} atual={visita.ja_compra_uniforme} /></div>
          <div className="grid gap-1.5"><span className="text-sm font-medium text-gray-700">Já comprou da LAESC?</span><Opcoes name="ja_comprou_laesc" valores={['Sim', 'Não']} atual={visita.ja_comprou_laesc} /></div>
        </Bloco>
      )}

      <Oportunidade visita={visita} />
      <Venda visita={visita} />

      {!followup && (
        <Bloco titulo="Observações e próximo passo">
          <label className={rotulo}>Obs <span className="text-xs font-normal text-gray-500">O que aconteceu na visita</span>
            <textarea id="obs" name="obs" rows={3} defaultValue={visita.obs || ''} className={campo} />
          </label>
          <label className={rotulo}>Próximo passo / plano de ação<textarea id="proximo_passo" name="proximo_passo" rows={2} defaultValue={visita.proximo_passo || ''} placeholder="Ex.: mandar orçamento e voltar com amostras" className={campo} /></label>
          <Reagendar visita={visita} hoje={hoje} />
        </Bloco>
      )}

      <div className="sticky bottom-[72px] lg:bottom-0 z-20 flex justify-end bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 pb-2 [&>button]:w-full sm:[&>button]:w-auto"><Salvar /></div>
    </form>
  )
}
