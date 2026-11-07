// Ficheiro: servidor/documentos/solicitacoesConcurso.ts
// Solicitações da planilha de um concurso em HTML + CSS (substituem os templates do Google Docs):
//  - Solicitação de Parecer Médico Assistencial ("JRSApp - TEMPLATE PARECER CONCURSOS");
//  - Solicitação de Exames Complementares Periciais ("JRSApp - TEMPLATE SOLICITAÇÃO DE EXAMES").
// Texto e formatação dos templates; histórico e exames aceitam várias linhas e o documento cresce
// para outras páginas se precisar (cabeçalho, rodapé e assinatura se repetem como no Google Docs).
import { esc, dataMilitar } from './layoutOficial';
import { documentoPaginado, sigiloAbsoluto, textoAbsoluto, textoLivre, IMG_BRASAO, PAGINA_ALTURA_PT, type DocumentoPaginado } from './paginado';

export interface DadosSolicitacaoBase {
  candidatoId: string;
  candidatoNome: string;
  nomeConcurso: string;
  nomeUsuario: string;
  postoGraduacao: string;
  cargo: string;
  crmPe: string;
  /** Data de emissão (padrão: hoje, em Recife) ou o texto já formatado (comparação com o template). */
  hoje?: Date;
  dataEmissao?: string;
}
export interface DadosSolicitacaoParecer extends DadosSolicitacaoBase { especialidade: string; historico: string }
export interface DadosSolicitacaoExames extends DadosSolicitacaoBase { exames: string }

const data = (d: DadosSolicitacaoBase) => esc(d.dataEmissao ?? dataMilitar(d.hoje));

/** Caixa cinza com Candidato / Inscrição / Finalidade IS (bordas, fundo e tabulação do template). */
const caixaCandidato = (d: DadosSolicitacaoBase, tamanho: number, espaco: number) => `
  <div class="caixa" style="--t:${tamanho}pt;--e:${espaco}pt">
    <p class="p linha"><span class="rot">Candidato:</span><b>${esc(d.candidatoNome)}</b></p>
    <p class="p linha"><span class="rot">Inscrição:</span><b>${esc(d.candidatoId)}</b></p>
    <p class="p linha"><span class="rot">Finalidade IS: </span>Ingresso no ${esc(d.nomeConcurso)}</p>
  </div>`;

const CSS_CAIXA = `
  /* A caixa passa 6,5 pt da margem direita (como no template). A parte de fora é desenhada com sombras, que
     não contam para o tamanho da página (uma margem negativa faria o Chromium encolher tudo ~1,4%). */
  .caixa { background: #f6f6f6; border: 0.5pt solid #ccc; border-right: 0; padding: 6pt 0 6pt 6pt; margin-left: 0.56pt;
    box-shadow: 6.5pt 0 0 -0.5pt #f6f6f6, 6.5pt 0 0 0 #ccc; }
  .caixa .linha { font-size: var(--t); margin-bottom: var(--e); padding-left: 98.37pt; text-indent: -98.37pt; }
  .caixa .linha:last-child { margin-bottom: 0; }
  .caixa .rot { display: inline-block; width: 98.37pt; text-indent: 0; }
`;

// ---------------------------------------------------------------- Solicitação de Parecer

/** Solicitação de Parecer Médico Assistencial (concursos). */
export const docSolicitacaoParecer = (d: DadosSolicitacaoParecer): DocumentoPaginado => {
  const margens = { topo: 75.0, base: 164.0, esq: 85.04, dir: 56.69 };
  const quesitos = [
    'Apresenta alguma condição clínica? Qual o diagnóstico com CID?',
    'Há queixas? Caso afirmativo, quais são as queixas atuais?',
    'Quais alterações são encontradas no exame físico?',
    'O diagnóstico foi subsidiado por exames complementares? Quais? Se possível, anexar os laudos.',
    'Há indicação de tratamento e/ou acompanhamento médico no momento? Em caso afirmativo, qual a proposta terapêutica atual e as próximas condutas previstas.',
    'Qual o prognóstico atual?',
  ];
  const corpo = `
    <div style="height:71.3pt">${IMG_BRASAO}</div>
    <p class="p c b sb3">MARINHA DO BRASIL</p>
    <p class="p c b sb3">HOSPITAL NAVAL DE RECIFE</p>
    <p class="p c b sb3">JUNTA REGULAR DE SAÚDE</p>
    <p class="p"></p>
    <p class="p c b sb6" style="font-size:13pt">SOLICITAÇÃO DE PARECER MÉDICO ASSISTENCIAL</p>
    <p class="p c b sb6" style="color:#434343">${esc(d.especialidade)}</p>
    <p class="p"></p>
    ${caixaCandidato(d, 12, 4)}
    <p class="p hist"><span class="rot b">HISTÓRICO: </span>${textoLivre(d.historico)}</p>
    <p class="p b" style="margin:6pt 0 4pt">QUESITOS A SEREM RESPONDIDOS:</p>
    <ol class="quesitos">${quesitos.map(q => `<li>${q}</li>`).join('')}</ol>`;
  const css = `${CSS_CAIXA}
    .sb3 { margin-bottom: 2.65pt; } .sb6 { margin-bottom: 6pt; }
    .caixa { margin-top: -0.9pt; }
    .hist { margin: 20pt 0 15pt; padding-left: 70.87pt; text-indent: -70.87pt; }
    .hist .rot { display: inline-block; width: 70.87pt; text-indent: 0; }
    .quesitos { margin: 0; padding: 0; list-style: none; counter-reset: q; }
    .quesitos li { counter-increment: q; position: relative; margin: 0 0 5.65pt; padding-left: 36pt; font-size: 12pt; line-height: 1.2207; }
    .quesitos li::before { content: counter(q) '.'; position: absolute; left: 18pt; }`;
  const sobreposicao = `
    ${sigiloAbsoluto({ topo: 19.6, centro: 311.8, titulo: 14, linhas: 8, cor: '#ff0000' })}
    ${textoAbsoluto({ topo: 704.7, centro: 201.7, negrito: true, html: `Recife, PE, ${data(d)}`, largura: 223 })}
    <div style="position:absolute;bottom:${PAGINA_ALTURA_PT - 762.9}pt;left:${434.9 - 111.6}pt;width:223.2pt;text-align:center;font-family:Carlito,Calibri,sans-serif;color:#000">
      <div style="font-size:12pt;line-height:calc(1.2207*1.15);font-weight:700;position:relative;top:-1.2pt">${esc(d.nomeUsuario)}</div>
      <div style="font-size:11pt;line-height:1.2207">${esc(d.postoGraduacao)}</div>
      <div style="font-size:11pt;line-height:1.2207">${esc(d.cargo)}</div>
      <div style="font-size:11pt;line-height:1.2207">CRM-PE: ${esc(d.crmPe)}</div>
    </div>
    ${sigiloAbsoluto({ topo: 787.6, centro: 301.3, titulo: 14, linhas: 8, cor: '#ff0000' })}`;
  return documentoPaginado(`Solicitação de Parecer - ${d.candidatoId}`, margens, css, corpo, sobreposicao);
};

// ---------------------------------------------------------------- Solicitação de Exames

/** Solicitação de Exames Complementares Periciais (concursos; sem cabeçalho/rodapé de sigilo, como o template). */
export const docSolicitacaoExames = (d: DadosSolicitacaoExames): DocumentoPaginado => {
  const margens = { topo: 56.69, base: 56.69, esq: 85.04, dir: 42.52 };
  const corpo = `
    <div style="height:61.7pt">${IMG_BRASAO}</div>
    <p class="p c b sb6">MARINHA DO BRASIL</p>
    <p class="p c b sb6">HOSPITAL NAVAL DE RECIFE</p>
    <p class="p c b sb6">JUNTA REGULAR DE SAÚDE</p>
    <p class="p"></p><p class="p"></p>
    <p class="p c b" style="font-size:14pt;margin-bottom:8pt">SOLICITAÇÃO DE EXAMES COMPLEMENTARES PERICIAIS</p>
    <p class="p" style="margin-bottom:10pt"></p>
    ${caixaCandidato(d, 14, 8)}
    <p class="p b" style="font-size:14pt;line-height:calc(16pt * 1.2207);margin:16.7pt 0 16.9pt">SOLICITO: </p>
    <div class="exames"><p class="p">${textoLivre(d.exames)}</p></div>
    <div class="assinatura">
      <p class="p b data"> Recife, PE, ${data(d)}</p>
      <div class="quem">
        <p class="p c b">${esc(d.nomeUsuario)}</p>
        <p class="p c">${esc(d.postoGraduacao)}</p>
        <p class="p c">${esc(d.cargo)}</p>
        <p class="p c">CRM-PE: ${esc(d.crmPe)}</p>
      </div>
    </div>
    <script>
      // A assinatura fica na altura do template (traço a 637 pt da página) quando os exames são poucos;
      // com muitos exames, ela desce junto, logo depois da lista.
      window.__ajustar = () => {
        const a = document.querySelector('.assinatura');
        const pt = px => px * 0.75;
        const topoNaPagina = pt(a.getBoundingClientRect().top) + ${margens.topo};
        const falta = 637.23 - topoNaPagina;
        if (falta > 0) a.style.marginTop = (parseFloat(getComputedStyle(a).marginTop) * 0.75 + falta) + 'pt';
      };
    </script>`;
  const css = `${CSS_CAIXA}
    .sb6 { margin-bottom: 6pt; }
    .exames { column-count: 2; column-gap: 36pt; }
    .exames .p { font-size: 13pt; padding-left: 14.17pt; margin-bottom: 20pt; }
    .assinatura { position: relative; margin: 20pt 0 0 -11.69pt; width: 466.5pt; display: flex; break-inside: avoid; }
    .assinatura .data, .assinatura .quem .p { line-height: calc(1.2207 * 1.15); }
    .assinatura .data { width: 233.25pt; padding: 7pt 5pt 0; }
    .assinatura .quem { width: 233.25pt; border-top: 1pt solid #000; padding: 6.5pt 5pt 0; }`;
  return documentoPaginado(`Solicitação de Exames - ${d.candidatoId}`, margens, css, corpo);
};
