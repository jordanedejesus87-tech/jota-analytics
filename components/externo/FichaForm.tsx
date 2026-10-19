'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { salvarFicha, type EstadoFicha } from '@/app/dashboard/externo/acoes'

const campo = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const rotulo = 'grid gap-1.5 text-sm font-medium text-gray-700'

function Salvar() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60">
      {pending ? 'Salvando…' : 'Salvar ficha'}
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

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
      <legend className="px-1 text-sm font-bold text-gray-900">{titulo}</legend>
      {children}
    </fieldset>
  )
}

interface Props {
  empresa?: Record<string, any>
  visita?: Record<string, any>
  rotas: string[]
  hoje: string
  vendedores?: { id: string; name: string }[]
  agoraInicial?: string
}

export default function FichaForm({ empresa = {}, visita = {}, rotas, hoje, vendedores = [], agoraInicial }: Props) {
  const [estado, acao] = useFormState<EstadoFicha, FormData>(salvarFicha, { erros: [] })
  const ag = String(visita.agendamento || '')
  const agData = /^\d{2}\/\d{2}\/\d{4}$/.test(ag) ? `${ag.slice(6)}-${ag.slice(3, 5)}-${ag.slice(0, 2)}` : ''
  const fat = visita.faturamento != null ? String(visita.faturamento).replace('.', ',') : ''

  return (
    <form action={acao} className="space-y-4">
      {visita.id && <input type="hidden" name="visita_id" value={visita.id} />}
      {empresa.id && <input type="hidden" name="empresa_id" value={empresa.id} />}

      {estado.erros.length > 0 && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
          {estado.erros.map((e) => <p key={e}>{e}</p>)}
        </div>
      )}

      {empresa.id ? (
        <details className="group rounded-xl border border-gray-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <span className="min-w-0">
              <span className="block font-semibold text-gray-900 truncate">{empresa.nome}</span>
              <span className="block text-xs text-gray-500 truncate">{[empresa.rota, empresa.bairro, empresa.contato, empresa.telefone].filter(Boolean).join(' · ') || 'Sem dados de contato'}</span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-indigo-700 group-open:hidden">Editar dados</span>
            <span className="shrink-0 hidden text-sm font-semibold text-gray-500 group-open:inline">Fechar</span>
          </summary>
          <div className="border-t border-gray-100 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={rotulo}>Descrição (nome da empresa)<input id="nome" name="nome" required defaultValue={empresa.nome || ''} className={campo} /></label>
          <label className={rotulo}>Rota
            <input id="rota" name="rota" list="lista-rotas" defaultValue={empresa.rota || ''} placeholder="Ex.: Rota 4" className={campo} />
            <datalist id="lista-rotas">{rotas.map((r) => <option key={r} value={r} />)}</datalist>
          </label>
          <label className={rotulo}>Endereço<input id="endereco" name="endereco" defaultValue={empresa.endereco || ''} className={campo} /></label>
          <label className={rotulo}>Bairro<input id="bairro" name="bairro" defaultValue={empresa.bairro || ''} className={campo} /></label>
          <label className={rotulo}>Telefone<input id="telefone" name="telefone" type="tel" inputMode="tel" defaultValue={empresa.telefone || ''} placeholder="(55) 99999-9999" className={campo} /></label>
          <label className={rotulo}>Contato<input id="contato" name="contato" defaultValue={empresa.contato || ''} placeholder="Com quem falou" className={campo} /></label>
        </div>
          </div>
        </details>
      ) : (
        <Bloco titulo="Empresa">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={rotulo}>Descrição (nome da empresa)<input id="nome" name="nome" required defaultValue={empresa.nome || ''} className={campo} /></label>
          <label className={rotulo}>Rota
            <input id="rota" name="rota" list="lista-rotas" defaultValue={empresa.rota || ''} placeholder="Ex.: Rota 4" className={campo} />
            <datalist id="lista-rotas">{rotas.map((r) => <option key={r} value={r} />)}</datalist>
          </label>
          <label className={rotulo}>Endereço<input id="endereco" name="endereco" defaultValue={empresa.endereco || ''} className={campo} /></label>
          <label className={rotulo}>Bairro<input id="bairro" name="bairro" defaultValue={empresa.bairro || ''} className={campo} /></label>
          <label className={rotulo}>Telefone<input id="telefone" name="telefone" type="tel" inputMode="tel" defaultValue={empresa.telefone || ''} placeholder="(55) 99999-9999" className={campo} /></label>
          <label className={rotulo}>Contato<input id="contato" name="contato" defaultValue={empresa.contato || ''} placeholder="Com quem falou" className={campo} /></label>
        </div>
        </Bloco>
      )}

      <Bloco titulo="Visita">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={rotulo}>Data da visita<input id="data_visita" name="data_visita" type="date" required defaultValue={visita.data_visita || hoje} className={campo} /></label>
          <Hora id="hora_chegada" titulo="Hora de chegada" valor={visita.id ? visita.hora_chegada?.slice(0, 5) : visita.hora_chegada?.slice(0, 5) || agoraInicial} />
          <Hora id="hora_saida" titulo="Hora de saída" valor={visita.hora_saida?.slice(0, 5)} />
        </div>
        {vendedores.length > 0 && !visita.id && (
          <label className={rotulo}>Vendedor
            <select id="vendedor_id" name="vendedor_id" defaultValue={vendedores[0]?.id} className={campo}>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
        )}
        <p className="text-xs text-gray-500">A chegada já vem com a hora em que a ficha foi aberta. Ao sair da empresa, toque em <b>Agora</b> na saída. A duração é calculada sozinha.</p>
      </Bloco>

      <Bloco titulo="Perfil do cliente">
        <label className={rotulo + ' sm:max-w-xs'}>Nº de funcionários<input id="n_funcionarios" name="n_funcionarios" inputMode="numeric" defaultValue={visita.n_funcionarios ?? ''} className={campo} /></label>
        <div className="grid gap-1.5"><span className="text-sm font-medium text-gray-700">Já compra uniforme?</span><Opcoes name="ja_compra_uniforme" valores={['Sim', 'Não']} atual={visita.ja_compra_uniforme} /></div>
        <div className="grid gap-1.5"><span className="text-sm font-medium text-gray-700">Já comprou da LAESC?</span><Opcoes name="ja_comprou_laesc" valores={['Sim', 'Não']} atual={visita.ja_comprou_laesc} /></div>
      </Bloco>

      <Bloco titulo="Oportunidade">
        <label className={rotulo + ' sm:max-w-xs'}>Expectativa de venda (peças)<input id="expectativa_pecas" name="expectativa_pecas" inputMode="numeric" defaultValue={visita.expectativa_pecas ?? ''} className={campo} /></label>
        <div className="grid gap-1.5"><span className="text-sm font-medium text-gray-700">Possibilidade de venda</span><Opcoes name="possibilidade" valores={['Alta', 'Média', 'Baixa']} atual={visita.possibilidade} /></div>
      </Bloco>

      <Bloco titulo="Venda">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={rotulo}>Peças vendidas (real)<input id="pecas_vendidas" name="pecas_vendidas" inputMode="numeric" defaultValue={visita.pecas_vendidas ?? ''} className={campo} /></label>
          <label className={rotulo}>Faturamento vendido (R$)<input id="faturamento" name="faturamento" inputMode="decimal" defaultValue={fat} placeholder="0,00" className={campo} /></label>
        </div>
      </Bloco>

      <Bloco titulo="Observações e retorno">
        <label className={rotulo}>Obs <span className="text-xs font-normal text-gray-500">O que aconteceu na visita e qual o próximo passo</span>
          <textarea id="obs" name="obs" rows={3} defaultValue={visita.obs || ''} className={campo} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={rotulo}>Agendamento (data do retorno)<input id="agendamento_data" name="agendamento_data" type="date" defaultValue={agData} className={campo} /></label>
          <label className={rotulo}>ou período <span className="text-xs font-normal text-gray-500">quando não há data certa</span><input id="agendamento_texto" name="agendamento_texto" defaultValue={agData ? '' : ag} placeholder="Ex.: Dezembro" className={campo} /></label>
        </div>
      </Bloco>

      <div className="sticky bottom-[72px] lg:bottom-0 z-20 flex justify-end bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 pb-2 [&>button]:w-full sm:[&>button]:w-auto"><Salvar /></div>
    </form>
  )
}
