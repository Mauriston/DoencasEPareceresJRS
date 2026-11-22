// Ficheiro: servidor/documentos/is/laudoPericial.ts
// Laudo Pericial (Isenção de IR) — DGPM-406, Anexo V-I-1: cabeçalho com o bloco "INFORMAÇÃO PESSOAL" + brasão,
// título e a tabela do anexo (contribuinte, médico, declaração com o laudo na íntegra e a doença legal, exposição dos
// exames, quadro "PREENCHIMENTO OBRIGATÓRIO" com o X na doença escolhida, carimbo e "Em dd/mm/aaaa" + assinatura do
// Presidente com rubrica). Só IS de Isenção de IR finalizada com laudo de enquadramento (utils/documentosIS.ts).
// Médico = quem lançou o laudo (IS.peritoUid → usuarios/{uid}); o formulário pode corrigir CRM/especialidade.
// CPF do cadastro do inspecionado; sem ele, vem do formulário. Ao gerar, tira a tag "LAUDO PERICIAL PENDENTE".
// Ajustes (config/documentosIS.laudoPericial): titulo, obs1, obs2, rotuloCarimbo, rotuloAssinatura.
import { FieldValue } from 'firebase-admin/firestore';
import {
  DOENCAS_LEGAIS_IR, ehDoencaLegalIR, PERFIS_DOCUMENTO_IS, ROTULO_DOCUMENTO_IS, sugerirDoencaLegalPeloLaudo, TAG_LAUDO_PERICIAL_PENDENTE,
  type DoencaLegalIR,
} from '../../../utils/documentosIS';
import { blocoAssinatura, blocoSigilo, cabecalhoInstitucional, documentoUmaPagina, esc, nomeSemPostoNip, texto, textoLongo } from './comum';
import { ErroDocumentoIS, type ContextoDocumentoIS, type GeradorDocumentoIS } from './tipos';

export interface DadosLaudoPericial {
  cpf: string;
  doenca: DoencaLegalIR;
  exposicao: string;
  medico: { nome: string; crm: string; especialidade: string };
}

export const AJUSTES_PADRAO_LAUDO = {
  titulo: 'LAUDO PERICIAL',
  obs1: '1- O laudo deverá ser fundamentado com exposição das observações, estudos, exames efetuados, registros das conclusões e emitido por SERVIÇO MÉDICO OFICIAL da União, dos Estados, do Distrito Federal ou dos Municípios.',
  obs2: '2 – Moléstias relacionadas no inciso XIV do art. 6° da Lei n° 7.713/88, e no § 2° do art. 30 da Lei n° 9.250/95:',
  rotuloCarimbo: 'CARIMBO DE IDENTIFICAÇÃO DO SERVIÇO MÉDICO OFICIAL',
  rotuloAssinatura: '',
};
const ajuste = (ctx: Pick<ContextoDocumentoIS, 'ajustes'>, k: keyof typeof AJUSTES_PADRAO_LAUDO) =>
  texto(ctx.ajustes?.[k], 600) || AJUSTES_PADRAO_LAUDO[k];

const formatarCpf = (v: string) => {
  const d = v.replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : v.trim();
};

/** Primeira letra minúscula ("Tem histórico…" → "tem histórico…"), para seguir "o(a) inspecionado(a) FULANO". */
const continuacao = (laudo: string) => laudo.trim().replace(/^([A-ZÀ-Ý])(?=[a-zà-ÿ])/, c => c.toLowerCase()).replace(/[.;\s]+$/, '');

const dd = (d: Date) => [d.getDate(), d.getMonth() + 1].map(n => String(n).padStart(2, '0')).concat(String(d.getFullYear())).join('/');

/** Médico que lançou o laudo (usuarios/{peritoUid}); campos do formulário têm precedência. */
const lerMedico = async (ctx: Omit<ContextoDocumentoIS, 'assinante'>, dados: Record<string, unknown>) => {
  let u: Record<string, unknown> = {};
  if (ctx.is.peritoUid) {
    try { u = (await ctx.db.collection('usuarios').doc(ctx.is.peritoUid).get()).data() || {}; } catch { /* sem cadastro */ }
  }
  const posto = texto(u.postoGraduacao, 60);
  const nomeU = texto(u.nome, 120);
  return {
    nome: texto(dados.medicoNome, 160) || [posto, nomeU].filter(Boolean).join(' ') || texto(ctx.is.bruto.peritoNome, 120),
    crm: texto(dados.medicoCrm, 40) || (texto(u.crmPe, 30) ? `${texto(u.crmPe, 30)}-PE` : ''),
    especialidade: texto(dados.medicoEspecialidade, 80) || texto(u.especialidade, 80),
  };
};

const CSS = `
  .corpo { left: 42pt; top: 26pt; width: 511pt; }
  .corpo > div[style*="61.7pt"] { height: 48pt !important; }
  .corpo > div[style*="61.7pt"] img, .corpo > div[style*="61.7pt"] svg { height: 48pt !important; width: auto !important; }
  .sigilo.sb10 { margin-bottom: 4pt; }
  .corpo .sb6 { margin-bottom: 2pt; }
  .titulo { font-size: 14pt; margin: 6pt 0 6pt; }
  table.lp { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.5pt; line-height: 1.2; }
  table.lp td { border: 0.75pt solid #000; padding: 2.5pt 4pt; vertical-align: middle; }
  table.lp td.sec { background: #d9d9d9; text-align: center; font-weight: 700; font-size: 7.5pt; padding: 3pt; }
  table.lp td.sec.g { font-size: 9.5pt; }
  table.lp td.rot { font-weight: 700; font-size: 7.5pt; height: 22pt; }
  table.lp td.rot span { font-weight: 400; font-size: 9.5pt; margin-left: 4pt; }
  .decl { padding: 8pt 6pt 4pt !important; font-size: 10pt; }
  .decl .txt { text-align: justify; line-height: 1.35; margin: 0 0 10pt; text-indent: 24pt; }
  .decl .doenca { text-align: center; font-weight: 700; font-size: 14pt; margin: 0 22pt; padding-bottom: 2pt; border-bottom: 0.75pt solid #000; text-transform: uppercase; }
  .decl .leg { text-align: center; font-weight: 700; font-size: 7pt; margin-top: 2pt; }
  .expo { height: 118pt; vertical-align: top !important; padding: 5pt 8pt !important; font-size: 9pt; }
  .expo ul { margin: 0; padding-left: 14pt; } .expo li { margin-bottom: 1.5pt; }
  .obs { font-size: 7.5pt !important; line-height: 1.25; }
  td.cx { width: 18pt; text-align: center; font-weight: 700; font-size: 11pt; padding: 0 !important; height: 15pt; }
  td.dl { font-size: 7.5pt; }
  .rodape td { height: 128pt; vertical-align: top; position: relative; }
  .carimbo { width: 200pt; height: 88pt; border: 0.75pt solid #000; margin: 6pt auto 6pt; }
  .leg2 { text-align: center; font-weight: 700; font-size: 7.5pt; }
  .em { text-align: right; font-size: 9pt; margin: 4pt 6pt 44pt; }
  .rodape .assinatura { width: 210pt; padding-top: 3pt; }
  .rodape .assinatura .p { font-size: 9pt; }
  .rodape .assinatura .rubrica { left: 72pt; top: -70pt; width: 44pt; height: 76pt; }
`;

/** Quadro das doenças (8 colunas: [X][nome] × 4), na disposição do Anexo V-I-1. */
const quadroDoencas = (sel: DoencaLegalIR) => {
  const x = (d: DoencaLegalIR) => `<td class="cx">${d === sel ? 'X' : ''}</td>`;
  const c = (d: DoencaLegalIR, span = 1) => `${x(d)}<td class="dl"${span > 1 ? ` colspan="${span}"` : ''}>${esc(d === 'Síndrome de Imunodeficiência Adquirida' ? 'Síndrome de Imunodeficiência adquirida' : d)}</td>`;
  const linhas: string[] = [
    c('Moléstia Profissional') + c('Cardiopatia Grave') + c('Tuberculose Ativa') + c('Doença de Parkinson'),
    c('Alienação Mental') + c('Esclerose Múltipla') + c('Nefropatia Grave') + c('Neoplasia Maligna'),
    c('Cegueira (inclusive monocular)') + c('Hanseníase') + c('Contaminação por Radiação') + c('Espondiloartrose Anquilosante'),
    c('Estados Avançados da Doença de Paget (Osteíte Deformante)', 3) + c('Síndrome de Imunodeficiência Adquirida', 3),
    c('Paralisia Irreversível e Incapacitante', 3) + c('Fibrose Cística (mucoviscidose)') + c('Hepatopatia Grave'),
  ];
  return linhas.map(l => `<tr>${l}</tr>`).join('');
};

/** Exposição: cada linha vira um item (marcadores "-", "•", "*" no início são removidos). */
const listaExposicao = (t: string) => {
  const itens = t.split('\n').map(l => l.replace(/^\s*[-•*–]\s*/, '').trim()).filter(Boolean);
  return itens.length ? `<ul>${itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
};

export const htmlLaudoPericial = (d: DadosLaudoPericial, ctx: ContextoDocumentoIS) => {
  const titulo = ajuste(ctx, 'titulo');
  const nome = nomeSemPostoNip(texto(ctx.militar?.nome, 160) || ctx.is.inspecionado).toUpperCase();
  const larg = [18, 110.75, 18, 110.75, 18, 110.75, 18, 110.75];
  return documentoUmaPagina(titulo, `
    ${blocoSigilo()}${cabecalhoInstitucional()}<p class="p c b titulo">${esc(titulo)}</p>
    <table class="lp">
      <colgroup>${larg.map(w => `<col style="width:${w}pt">`).join('')}</colgroup>
      <tr><td class="sec" colspan="8">DADOS DO CONTRIBUINTE</td></tr>
      <tr><td class="rot" colspan="6">NOME:<span><b>${esc(nome)}</b></span></td><td class="rot" colspan="2">CPF:<span>${esc(d.cpf)}</span></td></tr>
      <tr><td class="sec" colspan="8">MÉDICO</td></tr>
      <tr><td class="rot" colspan="8">NOME:<span>${esc(d.medico.nome.toUpperCase())}</span></td></tr>
      <tr><td class="rot" colspan="3">CRM:<span>${esc(d.medico.crm)}</span></td><td class="rot" colspan="5">ESPECIALIDADE:<span>${esc(d.medico.especialidade)}</span></td></tr>
      <tr><td class="sec" colspan="8">DECLARAÇÃO</td></tr>
      <tr><td class="decl" colspan="8">
        <p class="txt">Declaro, sob as penas da Lei, que o(a) inspecionado(a) <b>${esc(nome)}</b> ${esc(continuacao(ctx.is.laudo))}, sob a rubrica de</p>
        <div class="doenca">${esc(d.doenca)}</div>
        <div class="leg">(DENOMINAÇÃO UTILIZADA PELO LEGISLADOR - ABAIXO)</div>
      </td></tr>
      <tr><td class="sec g" colspan="8">Exposição das observações, estudos, exames efetuados e registros das conclusões:</td></tr>
      <tr><td class="expo" colspan="8">${listaExposicao(d.exposicao)}</td></tr>
      <tr><td class="sec" colspan="8">PREENCHIMENTO OBRIGATÓRIO</td></tr>
      <tr><td class="obs" colspan="8">${esc(ajuste(ctx, 'obs1'))}<br>${esc(ajuste(ctx, 'obs2'))}</td></tr>
      ${quadroDoencas(d.doenca)}
      <tr class="rodape">
        <td colspan="4"><div class="carimbo"></div><div class="leg2">${esc(ajuste(ctx, 'rotuloCarimbo'))}</div></td>
        <td colspan="4">
          <p class="em">Em ${dd(ctx.agora)}</p>
          ${blocoAssinatura(ctx.assinante)}
          ${ajuste(ctx, 'rotuloAssinatura') ? `<div class="leg2" style="margin-top:2pt">${esc(ajuste(ctx, 'rotuloAssinatura'))}</div>` : ''}
        </td>
      </tr>
    </table>`, CSS);
};

export const gerador: GeradorDocumentoIS<DadosLaudoPericial> = {
  tipo: 'laudoPericial',
  titulo: ROTULO_DOCUMENTO_IS.laudoPericial,
  perfis: PERFIS_DOCUMENTO_IS.laudoPericial,
  assinante: 'presidente',
  validar: async (dados, ctx) => {
    const cpf = formatarCpf(texto(ctx.militar?.cpf, 20) || texto(dados.cpf, 20));
    if (cpf.replace(/\D/g, '').length !== 11) throw new ErroDocumentoIS(400, 'Informe o CPF do inspecionado (11 dígitos).');
    if (!ehDoencaLegalIR(dados.doenca)) throw new ErroDocumentoIS(400, 'Selecione a doença especificada em lei.');
    const medico = await lerMedico(ctx, dados);
    if (!medico.nome) throw new ErroDocumentoIS(400, 'Médico do laudo não identificado: informe o nome.');
    if (!medico.especialidade) throw new ErroDocumentoIS(400, 'Especialidade do médico é obrigatória no Laudo Pericial: informe-a no formulário ou no cadastro do usuário.');
    return { cpf, doenca: dados.doenca, exposicao: textoLongo(dados.exposicao, 3000), medico };
  },
  dadosTeste: ctx => ({
    cpf: '000.000.000-00',
    doenca: sugerirDoencaLegalPeloLaudo(ctx.is.laudo) ?? DOENCAS_LEGAIS_IR[Math.floor(Math.random() * DOENCAS_LEGAIS_IR.length)],
    exposicao: [
      'Biópsia de mama esquerda (12/01/2025): carcinoma ductal invasivo, grau histológico 2.',
      'Ressonância magnética das mamas (20/01/2025): lesão espiculada de 2,1 cm em QSE da mama esquerda (BI-RADS 6).',
      'Relatório oncológico (10/10/2026): em hormonioterapia adjuvante após mastectomia e quimioterapia.',
    ].join('\n'),
    medico: { nome: 'CC (Md) BELTRANO DE SOUZA', crm: '12345-PE', especialidade: 'Clínica Médica' },
  }),
  gerarHtml: (d, ctx) => htmlLaudoPericial(d, ctx),
  resumo: d => d.doenca,
  aposGerar: async (_d, ctx) => {
    await ctx.db.collection('inspecoes').doc(ctx.is.id).update({
      tags: FieldValue.arrayRemove(TAG_LAUDO_PERICIAL_PENDENTE), laudoPericialGeradoEm: FieldValue.serverTimestamp(),
    });
  },
};
