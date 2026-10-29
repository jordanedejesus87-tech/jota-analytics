// Origem de cada venda registrada no Comercial (tabela public.vendas).
// A pergunta para o cliente é: "como você chegou até a LAESC nesta compra?"

export type Origem =
  | 'site_google' | 'instagram_organico' | 'facebook_organico' | 'instagram_anuncio' | 'facebook_anuncio'
  | 'tiktok' | 'reativacao' | 'recompra' | 'indicacao' | 'externo'

/** Origens que vêm de anúncio pago (comparar com o investimento das plataformas). */
export const ORIGENS_ANUNCIO: Origem[] = ['instagram_anuncio', 'facebook_anuncio']
/** Origens digitais (internet / redes sociais). */
export const ORIGENS_DIGITAIS: Origem[] = ['site_google', 'instagram_organico', 'facebook_organico', 'instagram_anuncio', 'facebook_anuncio', 'tiktok']

export const ORIGENS: { id: Origem; rotulo: string; ajuda: string; cor: string; barra: string }[] = [
  { id: 'site_google', rotulo: 'Site / Google', ajuda: 'Achou pelo Google ou chegou pelo site (orçamento ou botão de WhatsApp)', cor: 'bg-indigo-50 text-indigo-700 border-indigo-200', barra: 'bg-indigo-500' },
  { id: 'instagram_organico', rotulo: 'Instagram (orgânico)', ajuda: 'Veio pelo perfil, posts, stories ou direct do Instagram — sem anúncio', cor: 'bg-pink-50 text-pink-700 border-pink-200', barra: 'bg-pink-400' },
  { id: 'instagram_anuncio', rotulo: 'Instagram (anúncio)', ajuda: 'Viu um anúncio pago no Instagram e chamou', cor: 'bg-pink-100 text-pink-800 border-pink-300', barra: 'bg-pink-600' },
  { id: 'facebook_organico', rotulo: 'Facebook (orgânico)', ajuda: 'Veio pela página, posts ou Messenger do Facebook — sem anúncio', cor: 'bg-blue-50 text-blue-700 border-blue-200', barra: 'bg-blue-400' },
  { id: 'facebook_anuncio', rotulo: 'Facebook (anúncio)', ajuda: 'Viu um anúncio pago no Facebook e chamou', cor: 'bg-blue-100 text-blue-800 border-blue-300', barra: 'bg-blue-600' },
  { id: 'tiktok', rotulo: 'TikTok', ajuda: 'Conheceu a LAESC pelo TikTok', cor: 'bg-slate-100 text-slate-800 border-slate-300', barra: 'bg-slate-700' },
  { id: 'reativacao', rotulo: 'Reativação', ajuda: 'Cliente que estava parado e voltou a comprar após nosso contato', cor: 'bg-amber-50 text-amber-800 border-amber-200', barra: 'bg-amber-500' },
  { id: 'recompra', rotulo: 'Cliente ativo (recompra)', ajuda: 'Cliente que já compra com a gente e procurou de novo', cor: 'bg-emerald-50 text-emerald-700 border-emerald-200', barra: 'bg-emerald-500' },
  { id: 'indicacao', rotulo: 'Indicação', ajuda: 'Chegou indicado por outro cliente ou conhecido', cor: 'bg-teal-50 text-teal-700 border-teal-200', barra: 'bg-teal-500' },
  { id: 'externo', rotulo: 'Venda externa (visitas)', ajuda: 'Venda feita na visita do vendedor externo', cor: 'bg-orange-50 text-orange-700 border-orange-200', barra: 'bg-orange-500' },
]
export const infoOrigem = (o: string) => ORIGENS.find((x) => x.id === o) ?? { id: o as Origem, rotulo: o, ajuda: '', cor: 'bg-gray-50 text-gray-700 border-gray-200', barra: 'bg-gray-400' }

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
