/**
 * Google Ads → Jota Analytics
 * Script instalado DENTRO da conta do Google Ads (Ferramentas → Ações em massa → Scripts),
 * agendado para rodar todo dia de madrugada. Envia, por dia e por campanha:
 * impressões, cliques, custo e conversões (total, WhatsApp e orçamento do site),
 * além dos termos de pesquisa. Reenvia sempre a janela recente inteira, porque o
 * Google Ads continua atribuindo conversões a cliques de dias anteriores.
 *
 * CHAVE: preencher na conta do Google Ads; não guardar a chave real no repositório.
 */
var CONFIG = {
  url: 'https://kzcfhaiwbpweqqsdepyu.supabase.co/rest/v1/rpc/ads_receber',
  apikey: 'sb_publishable__5j5mP3mysaZF5wxgG5Wrg_3K1sECek',
  chave: 'COLE_A_CHAVE_AQUI',
  inicio: '2026-08-01',   // primeiro dia a enviar (histórico)
  janelaDias: 120,        // depois de 120 dias, envia só a janela recente
  convWhatsapp: 'Botão do WhatsApp',
  convOrcamento: 'Orçamento enviado pelo site'
};

function main() {
  var tz = AdsApp.currentAccount().getTimeZone();
  var hoje = new Date();
  var ontem = Utilities.formatDate(new Date(hoje.getTime() - 864e5), tz, 'yyyy-MM-dd');
  var limite = Utilities.formatDate(new Date(hoje.getTime() - CONFIG.janelaDias * 864e5), tz, 'yyyy-MM-dd');
  var de = limite > CONFIG.inicio ? limite : CONFIG.inicio;
  var periodo = "segments.date BETWEEN '" + de + "' AND '" + ontem + "'";

  var linhas = {};
  var it = AdsApp.search(
    'SELECT segments.date, campaign.id, campaign.name, campaign.status, metrics.impressions, metrics.clicks, ' +
    'metrics.cost_micros, metrics.conversions FROM campaign WHERE ' + periodo);
  while (it.hasNext()) {
    var r = it.next();
    var k = r.segments.date + '|' + r.campaign.id;
    linhas[k] = {
      data: r.segments.date, campanha_id: String(r.campaign.id), campanha: r.campaign.name, status: r.campaign.status,
      impressoes: Number(r.metrics.impressions || 0), cliques: Number(r.metrics.clicks || 0),
      custo: Math.round(Number(r.metrics.costMicros || 0) / 1e4) / 100,
      conversoes: Number(r.metrics.conversions || 0), conv_whatsapp: 0, conv_orcamento: 0
    };
  }

  var conv = AdsApp.search(
    'SELECT segments.date, campaign.id, segments.conversion_action_name, metrics.all_conversions FROM campaign WHERE ' + periodo);
  while (conv.hasNext()) {
    var c = conv.next();
    var l = linhas[c.segments.date + '|' + c.campaign.id];
    if (!l) continue;
    var n = Number(c.metrics.allConversions || 0);
    if (c.segments.conversionActionName === CONFIG.convWhatsapp) l.conv_whatsapp += n;
    if (c.segments.conversionActionName === CONFIG.convOrcamento) l.conv_orcamento += n;
  }

  var termos = [];
  var st = AdsApp.search(
    'SELECT segments.date, campaign.name, search_term_view.search_term, metrics.impressions, metrics.clicks, ' +
    'metrics.cost_micros, metrics.conversions FROM search_term_view WHERE ' + periodo + ' AND metrics.impressions > 0');
  while (st.hasNext() && termos.length < 5000) {
    var t = st.next();
    termos.push({
      data: t.segments.date, campanha: t.campaign.name, termo: t.searchTermView.searchTerm,
      impressoes: Number(t.metrics.impressions || 0), cliques: Number(t.metrics.clicks || 0),
      custo: Math.round(Number(t.metrics.costMicros || 0) / 1e4) / 100, conversoes: Number(t.metrics.conversions || 0)
    });
  }

  var diario = Object.keys(linhas).map(function (k) { return linhas[k]; });
  var resp = UrlFetchApp.fetch(CONFIG.url, {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: CONFIG.apikey, Authorization: 'Bearer ' + CONFIG.apikey },
    payload: JSON.stringify({ p_chave: CONFIG.chave, p_diario: diario, p_termos: termos }),
    muteHttpExceptions: true
  });
  Logger.log('Período ' + de + ' a ' + ontem + ': ' + diario.length + ' linha(s), ' + termos.length + ' termo(s). Resposta ' +
    resp.getResponseCode() + ': ' + resp.getContentText().slice(0, 300));
  if (resp.getResponseCode() >= 300) throw new Error('Falha ao enviar para o Jota Analytics');
}
