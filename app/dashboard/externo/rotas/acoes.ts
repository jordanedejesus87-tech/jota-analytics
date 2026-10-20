'use server'

import { revalidatePath } from 'next/cache'
import { sessaoExterno, SEM_ROTA } from '@/lib/externo/sessao'

export interface EstadoRota { ok?: string; erro?: string; n: number }

const limpo = (v: FormDataEntryValue | null) => String(v ?? '').replace(/\s+/g, ' ').trim()

function pronto(ok: string, n: number): EstadoRota {
  revalidatePath('/dashboard/externo', 'layout')
  return { ok, n: n + 1 }
}

export async function criarRota(estado: EstadoRota, f: FormData): Promise<EstadoRota> {
  const { supabase, profile, podeEditar } = await sessaoExterno()
  if (!podeEditar) return { erro: 'Seu acesso é só de consulta.', n: estado.n + 1 }
  const nome = limpo(f.get('nome'))
  if (!nome) return { erro: 'Digite o nome da rota.', n: estado.n + 1 }
  if (nome.toLowerCase() === SEM_ROTA.toLowerCase()) return { erro: `"${SEM_ROTA}" é reservado. Escolha outro nome.`, n: estado.n + 1 }
  const { error } = await supabase.from('ext_rotas').insert({ company_id: profile.company_id, nome })
  if (error) return { erro: error.code === '23505' ? `Já existe uma rota chamada "${nome}".` : 'Não foi possível criar a rota: ' + error.message, n: estado.n + 1 }
  return pronto(`Rota "${nome}" criada.`, estado.n)
}

export async function renomearRota(estado: EstadoRota, f: FormData): Promise<EstadoRota> {
  const { supabase, profile, podeEditar } = await sessaoExterno()
  if (!podeEditar) return { erro: 'Seu acesso é só de consulta.', n: estado.n + 1 }
  const antigo = limpo(f.get('antigo'))
  const nome = limpo(f.get('nome'))
  if (!nome) return { erro: 'Digite o novo nome.', n: estado.n + 1 }
  if (nome === antigo) return { n: estado.n + 1 }
  if (nome.toLowerCase() === SEM_ROTA.toLowerCase()) return { erro: `"${SEM_ROTA}" é reservado. Escolha outro nome.`, n: estado.n + 1 }
  const { data: existe } = await supabase.from('ext_rotas').select('id').eq('company_id', profile.company_id).eq('nome', nome).maybeSingle()
  if (existe) return { erro: `Já existe uma rota chamada "${nome}".`, n: estado.n + 1 }
  const { data: atual } = await supabase.from('ext_rotas').select('id').eq('company_id', profile.company_id).eq('nome', antigo).maybeSingle()
  const r1 = atual
    ? await supabase.from('ext_rotas').update({ nome }).eq('id', atual.id)
    : await supabase.from('ext_rotas').insert({ company_id: profile.company_id, nome })
  if (r1.error) return { erro: 'Não foi possível renomear: ' + r1.error.message, n: estado.n + 1 }
  const r2 = await supabase.from('ext_empresas').update({ rota: nome }).eq('company_id', profile.company_id).eq('rota', antigo)
  if (r2.error) return { erro: 'A rota foi renomeada, mas as empresas não foram atualizadas: ' + r2.error.message, n: estado.n + 1 }
  return pronto(`Rota "${antigo}" agora se chama "${nome}".`, estado.n)
}

export async function excluirRota(estado: EstadoRota, f: FormData): Promise<EstadoRota> {
  const { supabase, profile, podeEditar } = await sessaoExterno()
  if (!podeEditar) return { erro: 'Seu acesso é só de consulta.', n: estado.n + 1 }
  const nome = limpo(f.get('nome'))
  const destino = limpo(f.get('destino')) || SEM_ROTA
  if (destino === nome) return { erro: 'Escolha outra rota para receber as empresas.', n: estado.n + 1 }
  const r1 = await supabase.from('ext_empresas').update({ rota: destino }).eq('company_id', profile.company_id).eq('rota', nome)
  if (r1.error) return { erro: 'Não foi possível mover as empresas: ' + r1.error.message, n: estado.n + 1 }
  const r2 = await supabase.from('ext_rotas').delete().eq('company_id', profile.company_id).eq('nome', nome)
  if (r2.error) return { erro: 'Não foi possível excluir a rota: ' + r2.error.message, n: estado.n + 1 }
  return pronto(`Rota "${nome}" excluída${destino ? ` — empresas foram para "${destino}"` : ''}.`, estado.n)
}
