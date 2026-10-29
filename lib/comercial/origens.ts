// Origem de cada venda registrada no Comercial (tabela public.vendas).
// A pergunta para o cliente é: "como você chegou até a LAESC nesta compra?"

export type Origem =
  | 'reativacao' | 'recompra' | 'site_google' | 'instagram' | 'facebook'
  | 'indicacao' | 'presencial' | 'outro'

export const ORIGENS: { id: Origem; rotulo: string; ajuda: string; cor: string; barra: string }[] = [
  { id: 'site_google', rotulo: 'Site / Google', ajuda: 'Achou pelo Google ou chegou pelo site (orçamento ou botão de WhatsApp)', cor: 'bg-indigo-50 text-indigo-700 border-indigo-200', barra: 'bg-indigo-500' },
  { id: 'instagram', rotulo: 'Instagram', ajuda: 'Veio pelo Instagram (perfil, post, anúncio ou direct)', cor: 'bg-pink-50 text-pink-700 border-pink-200', barra: 'bg-pink-500' },
  { id: 'facebook', rotulo: 'Facebook', ajuda: 'Veio pelo Facebook (página, anúncio ou Messenger)', cor: 'bg-blue-50 text-blue-700 border-blue-200', barra: 'bg-blue-500' },
  { id: 'reativacao', rotulo: 'Reativação', ajuda: 'Cliente que estava parado e voltou a comprar após nosso contato', cor: 'bg-amber-50 text-amber-800 border-amber-200', barra: 'bg-amber-500' },
  { id: 'recompra', rotulo: 'Cliente ativo', ajuda: 'Cliente que já compra com a gente e procurou de novo', cor: 'bg-emerald-50 text-emerald-700 border-emerald-200', barra: 'bg-emerald-500' },
  { id: 'indicacao', rotulo: 'Indicação', ajuda: 'Chegou indicado por outro cliente ou conhecido', cor: 'bg-teal-50 text-teal-700 border-teal-200', barra: 'bg-teal-500' },
  { id: 'presencial', rotulo: 'Presencial (externo)', ajuda: 'Venda feita na visita do vendedor externo', cor: 'bg-orange-50 text-orange-700 border-orange-200', barra: 'bg-orange-500' },
  { id: 'outro', rotulo: 'Outro', ajuda: 'Nenhuma das anteriores (explique na observação)', cor: 'bg-gray-50 text-gray-700 border-gray-200', barra: 'bg-gray-400' },
]
export const infoOrigem = (o: string) => ORIGENS.find((x) => x.id === o) ?? ORIGENS[ORIGENS.length - 1]

export interface VendaIndividual {
  id: string
  company_id: string
  salesperson_name: string
  sale_date: string
  valor: number
  origem: Origem
  cliente: string | null
  pedido: string | null
  observacao: string | null
  site_lead_id: string | null
  canal_site: string | null
  created_at: string
}

/** Orçamento do site ainda em aberto, para vincular à venda. */
export interface LeadAberto {
  id: string
  created_at: string
  nome: string
  empresa: string | null
  cidade: string | null
  canal: string | null
  status: string
}

/** Canais pagos gravados pelo site (ver lib/site/metricas.ts). */
export const CANAL_ROTULO: Record<string, string> = {
  google_ads: 'Google Ads', meta_ads: 'Anúncio Instagram/Facebook', outros_anuncios: 'Outros anúncios',
  busca_organica: 'Google orgânico', redes_sociais: 'Redes sociais (orgânico)', whatsapp: 'Link no WhatsApp',
  outros_sites: 'Outros sites', direto: 'Digitou o endereço', nao_identificado: 'Origem do site não identificada',
}
