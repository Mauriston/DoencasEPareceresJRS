// Ficheiro: servidor/documentos/pedidoParecer.ts
// Pedido de Parecer Médico da página Pareceres em HTML + CSS (substitui o template "JRSApp MODELO
// PARECER" do Google Docs): 1ª página com o pedido (inspecionado, finalidade, histórico, quesitos e
// assinatura) e, em página nova, a folha "PARECER OU RESULTADO DE EXAME" com as linhas para a resposta.
// Cabeçalho e rodapé de sigilo e "- n de N -" em toda página, como no template.
import { esc } from './layoutOficial';
import { documentoPaginado, sigiloAbsoluto, textoAbsoluto, textoLivre, IMG_BRASAO, type DocumentoPaginado } from './paginado';

export interface DadosPedidoParecer {
  inspecionado: string;
  especialidade: string;
  finalidade: string;
  historico: string;
  quesitos: string[];
  nomeUsuario: string;
  postoGraduacao: string;
  cargo: string;
  crmPe: string;
  hoje?: Date;
  /** Data já por extenso (substitui `hoje`; comparação com o template). */
  dataEmissao?: string;
}

/** Data por extenso no padrão do pedido: "1º de outubro de 2026" (fuso de Recife). */
export const dataPorExtenso = (agora: Date = new Date()): string => {
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Recife', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(agora);
  const v = (t: string) => Number(p.find(x => x.type === t)?.value);
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dia = v('day');
  return `${dia === 1 ? '1º' : dia} de ${MESES[v('month') - 1]} de ${v('year')}`;
};

/** Quesitos como no Apps Script: "1. texto"; as linhas seguintes de um quesito (ex.: "A) …") recuam. */
export const listaQuesitos = (quesitos: string[]): string => quesitos
  .map(q => String(q ?? '').trim()).filter(Boolean)
  .map((q, i) => {
    const [primeira, ...resto] = q.split(/\r?\n/);
    return `${i + 1}. ${primeira}${resto.map(l => `\n    ${l.trim()}`).join('')}`;
  })
  .join('\n');

/** Linhas da folha de resposta (2ª página): 30 traços, como a tabela do template. */
const LINHAS_RESPOSTA = 30;
const PASSO_LINHA_PT = 18.563;

export const docPedidoParecer = (d: DadosPedidoParecer): DocumentoPaginado => {
  const margens = { topo: 102.1, base: 95.1, esq: 85.04, dir: 42.52 };
  const data = esc(d.dataEmissao ?? dataPorExtenso(d.hoje));
  const corpo = `
    <div style="height:61.7pt">${IMG_BRASAO}</div>
    <p class="p c b">MARINHA DO BRASIL</p>
    <p class="p c b">HOSPITAL NAVAL DE RECIFE</p>
    <p class="p c b">JUNTA REGULAR DE SAÚDE</p>
    <p class="p"></p>
    <p class="p d">Recife, PE, ${data}.</p>
    <p class="p"></p>
    <p class="p c b">SOLICITAÇÃO DE PARECER MÉDICO ASSISTENCIAL À ${esc(d.especialidade)}</p>
    <p class="p"></p><p class="p"></p>
    <div class="caixa">
      <p class="p linha b"><span class="rot">INSPECIONADO: </span>${esc(d.inspecionado)}</p>
      <p class="p linha"><span class="rot b">FINALIDADE: </span>${esc(d.finalidade)}</p>
      <p class="p linha ultima"><span class="rot b">HISTÓRICO: </span>${textoLivre(d.historico)}</p>
    </div>
    <p class="p"></p>
    <p class="p b sb10">QUESITOS A SEREM RESPONDIDOS:</p>
    <p class="p l115 sb10">${esc(listaQuesitos(d.quesitos))}</p>
    <p class="p l115 sb10"></p>
    <p class="p sb10"></p>
    <p class="p sb10">Grato pela colaboração, aproveito para reforçar os votos de estima e consideração.</p>
    <p class="p sb10"></p><p class="p sb10"></p><p class="p"></p>
    <div class="assinatura">
      <p class="p l115 c b">${esc(d.nomeUsuario)}</p>
      <p class="p l115 c f11">${esc(d.postoGraduacao)}</p>
      <p class="p l115 c f11">${esc(d.cargo)}</p>
      <p class="p l115 c f11">CRM-PE: ${esc(d.crmPe)}</p>
    </div>
    <section class="quebra">
      <p class="p c b">PARECER OU RESULTADO DE EXAME</p>
      <p class="p"></p><p class="p"></p>
      <div class="linhas">${Array.from({ length: LINHAS_RESPOSTA }, (_, i) => `<i style="top:${(i * PASSO_LINHA_PT).toFixed(3)}pt"></i>`).join('')}</div>
      <p class="p j" style="font-size:10pt">(Caso julgue oportuno, o prezado colega pode enviar a resposta desse parecer em arquivo digital para <a href="mailto:hnre.jrs@marinha.mil.br">hnre.jrs@marinha.mil.br</a>)</p>
    </section>`;
  const css = `
    .sb10 { margin-bottom: 10pt; }
    .f11 { font-size: 11pt; }
    /* Passa 7 pt das margens, como no template; a parte da direita vai em sombras (ver solicitacoesConcurso.ts). */
    .caixa { background: #f6f6f6; border: 1pt solid #efefef; border-right: 0; padding: 6pt 0 6pt 6pt; margin: 0 0 0 -7pt;
      box-shadow: 7pt 0 0 -1pt #f6f6f6, 7pt 0 0 0 #efefef; }
    .caixa .linha { margin-bottom: 10pt; padding-left: 0; }
    .caixa .linha.ultima { margin-bottom: 0; }
    .caixa .rot { display: inline-block; min-width: 84.46pt; }
    .assinatura { break-inside: avoid; }
    /* Linhas da resposta: traços reais de 1 pt (um gradiente repetido falhava em algumas resoluções). */
    .linhas { position: relative; height: ${(LINHAS_RESPOSTA - 1) * PASSO_LINHA_PT + 1.3}pt; margin: -1.03pt -0.14pt 0; width: 466.5pt; }
    .linhas i { position: absolute; left: 0; right: 0; height: 0; border-top: 1pt solid #000; }
    a { color: #1155cc; text-decoration: underline; }`;
  const sobreposicao = `
    ${sigiloAbsoluto({ topo: 19.9, centro: 317.9, titulo: 14, linhas: 8, cor: '#cc0000' })}
    ${sigiloAbsoluto({ topo: 761.4, centro: 318.9, titulo: 14, linhas: 8, cor: '#cc0000' })}
    ${textoAbsoluto({ topo: 817.6, centro: 318.9, html: '- <span class="pageNumber"></span> de <span class="totalPages"></span> -' })}`;
  return documentoPaginado(`Pedido de Parecer - ${d.especialidade}`, margens, css, corpo, sobreposicao);
};
