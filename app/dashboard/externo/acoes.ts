'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sessaoExterno } from '@/lib/externo/sessao'

export interface EstadoFicha { erros: string[] }

const txt = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? '').trim()
  return v === '' ? null : v
}
const inteiro = (f: FormData, k: string) => {
  const v = txt(f, k)
  if (v === null) return null
  const n = Number(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : NaN
}
const dinheiro = (f: FormData, k: string) => {
  let v = txt(f, k)
  if (v === null) return null
  v = v.replace(/R\$|\s/g, '')
  if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.')
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN
}
const isoParaBr = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : null)

export async function salvarFicha(_estado: EstadoFicha, f: FormData): Promise<EstadoFicha> {
  const { supabase, user, profile, podeEditar } = await sessaoExterno()
  if (!podeEditar) return { erros: ['Seu acesso é só de consulta.'] }

  const visitaId = txt(f, 'visita_id')
  let empresaId = txt(f, 'empresa_id')
  const empresa = {
    rota: txt(f, 'rota') || 'Sem rota',
    nome: txt(f, 'nome'),
    endereco: txt(f, 'endereco'),
    bairro: txt(f, 'bairro'),
    telefone: txt(f, 'telefone'),
    contato: txt(f, 'contato'),
  }
  const visita = {
    data_visita: txt(f, 'data_visita'),
    hora_chegada: txt(f, 'hora_chegada'),
    hora_saida: txt(f, 'hora_saida'),
    n_funcionarios: inteiro(f, 'n_funcionarios'),
    ja_compra_uniforme: txt(f, 'ja_compra_uniforme'),
    ja_comprou_laesc: txt(f, 'ja_comprou_laesc'),
    expectativa_pecas: inteiro(f, 'expectativa_pecas'),
    possibilidade: txt(f, 'possibilidade'),
    pecas_vendidas: inteiro(f, 'pecas_vendidas'),
    faturamento: dinheiro(f, 'faturamento'),
    obs: txt(f, 'obs'),
    agendamento: isoParaBr(txt(f, 'agendamento_data')) || txt(f, 'agendamento_texto'),
  }

  const erros: string[] = []
  if (!empresa.nome) erros.push('Informe o nome da empresa (Descrição).')
  if (!visita.data_visita) erros.push('Informe a data da visita.')
  if (visita.hora_chegada && visita.hora_saida && visita.hora_saida <= visita.hora_chegada) erros.push('A hora de saída precisa ser depois da hora de chegada.')
  const rotulos: [keyof typeof visita, string][] = [['n_funcionarios', 'Nº de funcionários'], ['expectativa_pecas', 'Expectativa de venda'], ['pecas_vendidas', 'Peças vendidas']]
  for (const [k, rot] of rotulos) if (Number.isNaN(visita[k])) erros.push(`${rot}: use só números.`)
  if (Number.isNaN(visita.faturamento)) erros.push('Faturamento: use um valor como 3490,00.')
  if (erros.length) return { erros }

  if (empresaId) {
    const { error } = await supabase.from('ext_empresas').update(empresa).eq('id', empresaId)
    if (error) return { erros: ['Não foi possível atualizar a empresa: ' + error.message] }
  } else {
    const { data, error } = await supabase.from('ext_empresas').insert({ ...empresa, company_id: profile.company_id, criado_por: user.id }).select('id').single()
    if (error) return { erros: ['Não foi possível cadastrar a empresa: ' + error.message] }
    empresaId = String(data.id)
  }

  if (visitaId) {
    const { error } = await supabase.from('ext_visitas').update({ ...visita, empresa_id: empresaId }).eq('id', visitaId)
    if (error) return { erros: ['Não foi possível salvar a ficha: ' + error.message] }
  } else {
    const vendedor = profile.role !== 'externo' && txt(f, 'vendedor_id') ? txt(f, 'vendedor_id') : user.id
    const { error } = await supabase.from('ext_visitas').insert({ ...visita, empresa_id: empresaId, vendedor_id: vendedor, company_id: profile.company_id })
    if (error) return { erros: ['Não foi possível salvar a ficha: ' + error.message] }
  }
  revalidatePath('/dashboard/externo')
  redirect('/dashboard/externo/visitas?salvo=1')
}

export async function apagarFicha(f: FormData) {
  const { supabase } = await sessaoExterno()
  const id = String(f.get('visita_id') || '')
  if (id) await supabase.from('ext_visitas').delete().eq('id', id)
  revalidatePath('/dashboard/externo')
  redirect('/dashboard/externo/visitas?apagado=1')
}
