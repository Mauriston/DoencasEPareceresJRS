// Ficheiro: servidor/documentos/is/papeletaDispensa.ts
// Papeleta de Dispensa (DGPM-406 Anexo I) da IS de VDF / Término de Incapacidade (Ficha › Gerar Documento):
// bloco "INFORMAÇÃO PESSOAL" + brasão, SEM a caixa cinza; título em 2 linhas; dias por extenso; assinada por quem
// gerou (rubrica se Admin); OBS. abaixo do divisor. E-mail: CC = Divisão de Pessoal do HNRe / EAMPE (copiasPorOM) +
// caixa da JRS, com o aviso de que o anexo é cópia sem assinatura digital.
// Ajustes (config/documentosIS.papeletaDispensa): titulo, subtitulo, observacoes[], paragrafosEmail[].
import { PERFIS_DOCUMENTO_IS, ROTULO_DOCUMENTO_IS } from '../../../utils/documentosIS';
import { CAIXA_JRS, copiasPorOM } from '../../../config/emails';
import { blocoAssinatura, blocoSigilo, cabecalhoInstitucional, documentoUmaPagina, esc, localData } from './comum';
import { ErroDocumentoIS, type GeradorDocumentoIS } from './tipos';

interface Dados { dias: number; data: string }

const UNIDADES_M = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze',
  'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS_M = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

/** Número (0–999) por extenso em pt-BR, concordando em gênero ("um/uma", "dois/duas", "duzentos/duzentas"). */
export const numeroPorExtenso = (n: number, genero: 'm' | 'f' = 'm'): string => {
  const v = Math.trunc(Math.abs(n));
  if (v > 999) return String(v);
  const fem = (s: string) => (genero === 'f' ? s.replace(/^um$/, 'uma').replace(/^dois$/, 'duas').replace(/entos$/, 'entas') : s);
  if (v < 20) return fem(UNIDADES_M[v]);
  if (v < 100) { const u = v % 10; return DEZENAS[Math.floor(v / 10)] + (u ? ` e ${fem(UNIDADES_M[u])}` : ''); }
  if (v === 100) return 'cem';
  const r = v % 100;
  return fem(CENTENAS_M[Math.floor(v / 100)]) + (r ? ` e ${numeroPorExtenso(r, genero)}` : '');
};

export const OBSERVACOES_PADRAO = [
  'a) As dispensas na presente papeleta não deverão exceder vinte dias, podendo ser prorrogadas por mais dez dias, mediante preenchimento de nova papeleta; e',
  'b) Os períodos de afastamento do serviço nos casos de doenças infectoparasitárias deverão ser orientados pela clínica especializada.',
];

const str = (v: unknown, padrao: string) => (typeof v === 'string' && v.trim() ? v.trim() : padrao);
const lista = (v: unknown, padrao: string[]) => {
  const l = (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : []).map(x => String(x ?? '').trim()).filter(Boolean);
  return l.length ? l : padrao;
};
const dataDoc = (iso: string, agora: Date) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00-03:00`) : agora);

export const gerador: GeradorDocumentoIS<Dados> = {
  tipo: 'papeletaDispensa',
  titulo: ROTULO_DOCUMENTO_IS.papeletaDispensa,
  perfis: PERFIS_DOCUMENTO_IS.papeletaDispensa,
  assinante: 'gerador',
  validar: d => {
    const dias = Number(d.dias);
    if (!Number.isInteger(dias) || dias < 1 || dias > 30) throw new ErroDocumentoIS(400, 'Informe a quantidade de dias (1 a 30).');
    const data = String(d.data ?? '').trim();
    if (data && (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data)))) throw new ErroDocumentoIS(400, 'Data do documento inválida.');
    return { dias, data };
  },
  dadosTeste: () => ({ dias: 1 + Math.floor(Math.random() * 20), data: '' }),
  resumo: d => `${d.dias} ${d.dias === 1 ? 'dia' : 'dias'}`,
  gerarHtml: (d, ctx) => {
    const obs = lista(ctx.ajustes.observacoes, OBSERVACOES_PADRAO);
    const diasTxt = d.dias === 1 ? 'dia' : 'dias';
    return documentoUmaPagina(ROTULO_DOCUMENTO_IS.papeletaDispensa, `
      ${blocoSigilo()}
      ${cabecalhoInstitucional()}
      <div style="margin:18pt 0 22pt">
        <p class="p c b" style="font-size:14pt;line-height:1">${esc(str(ctx.ajustes.titulo, 'PAPELETA DE DISPENSA'))}</p>
        <p class="p c" style="font-size:14pt;line-height:1">${esc(str(ctx.ajustes.subtitulo, '(DGPM-406 ANEXO I)'))}</p>
      </div>
      <p class="p j" style="line-height:1.5;margin-bottom:24pt">O <b>${esc(ctx.is.inspecionado)}</b> necessita ${esc(numeroPorExtenso(d.dias))} (<b>${d.dias}</b>) <b>${diasTxt} de dispensa de todas as atividades militares</b>, enquanto aguarda conclusão de sua inspeção de saúde nº ${esc(ctx.is.is)}.</p>
      <p class="p c" style="margin-bottom:84pt">${esc(localData(dataDoc(d.data, ctx.agora)))}</p>
      ${blocoAssinatura(ctx.assinante)}
      <div class="hr" style="margin-top:28pt"></div>
      <p class="p b sb6" style="font-size:10pt">OBS.:</p>
      ${obs.map(t => `<p class="p j sb6" style="font-size:10pt">${esc(t)}</p>`).join('')}`);
  },
  email: (d, ctx) => ({
    cc: [...copiasPorOM(String(ctx.militar?.om ?? '')), CAIXA_JRS],
    paragrafos: lista(ctx.ajustes.paragrafosEmail, [
      `Segue em anexo a Papeleta de Dispensa de {{dias}} referente à IS nº {{is}} fim {{finalidade}}.`,
      'ATENÇÃO: a papeleta anexa é apenas uma cópia sem assinatura digital, para simples conferência. A via original, assinada, deve ser entregue pelo inspecionado na Divisão de Pessoal da sua OM.',
    ]).map(p => p.replace(/\{\{\s*dias\s*\}\}/g, `${d.dias} (${numeroPorExtenso(d.dias)}) ${d.dias === 1 ? 'dia' : 'dias'}`)
      .replace(/\{\{\s*is\s*\}\}/g, String(ctx.is.is)).replace(/\{\{\s*finalidade\s*\}\}/g, ctx.is.finalidade)),
  }),
};
