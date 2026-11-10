// Ficheiro: utils/minutaMensagemResultado.ts
// Minuta de mensagem de conclusão (resultado) de IS no MESMO padrão da página Mensagens.
// A página Mensagens manda o Gemini extrair os dados do TIS (par de imagens) e preencher o modelo descrito em
// PROMPT_MINUTA_MENSAGEM (config/promptsIA.ts): PARA/INFO pela tabela de destinatários do Anexo M da DGPM-406
// (data/destinatariosInspecoes.json — a mesma que utils/destinatariosIS.ts usa aqui), ASSUNTO, ALFA e BRAVO.
// Aqui o mesmo modelo é preenchido de forma determinística com os dados da própria IS finalizada. O que a IS
// não tem fica com o marcador "[preencher: …]" para o perito completar no texto editável.
// Os testes (utils/__tests__/minutasIS.test.ts) conferem o modelo contra o texto do prompt.

import { destinatariosDaMensagem, normalizarTexto } from './destinatariosIS';

export const PRE = (campo: string) => `[preencher: ${campo}]`;

// PARA/INFO: roteamento pela tabela do Anexo M da DGPM-406 (data/destinatariosInspecoes.json), em utils/destinatariosIS.ts.
export {
  destinatariosDaMensagem, finalidadeDaTabela, normalizarTexto, resultadoDaTabela, tipoDoLaudo,
  type ContextoDestinatarios, type Destinatarios, type ServicoLaudo, type TipoLaudo,
} from './destinatariosIS';

/** Sugestão para o "[preencher]" quando a tabela não decide sozinha. */
const ehDependente = (finalidade: string, vinculo?: string) =>
  /^dependencia de familiar/.test(normalizarTexto(finalidade)) || normalizarTexto(vinculo || '') === 'dependente';
const dicaPara = (finalidade: string, vinculo?: string): string | null =>
  ehDependente(finalidade, vinculo) ? 'PARA: OM do militar (titular da ativa) ou CPesFN/SVPM/OMAC (titular inativo)' : null;
const dicaInfo = (finalidade: string, vinculo?: string): string | null =>
  ehDependente(finalidade, vinculo) ? '—' : null;

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
/** AAAA-MM-DD → DDMMMAAAA (ex.: 2026-06-18 → 18JUN2026). Vazio/ inválido → ''. */
export const dataMensagem = (iso: string | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return '';
  return `${m[3]}${MESES[Number(m[2]) - 1]}${m[1]}`;
};

/** OM com a grafia da mensagem: "HNRE" (qualquer caixa) → "HNRe". */
export const omMensagem = (om: string | undefined): string => {
  const t = (om || '').trim();
  return /^hnre$/i.test(t) ? 'HNRe' : t;
};

/** INSPECIONADO: o texto da IS já vem como "POSTO (QUADRO) NIP NOME" / "POSTO-ESP NIP NOME"; só mascara NIP solto (00.0000.00). */
export const inspecionadoMensagem = (inspecionado: string): string =>
  inspecionado.replace(/\s+/g, ' ').trim().replace(/(^|\s)(\d{2})(\d{4})(\d{2})(?=\s|$)/, '$1$2.$3.$4');

/**
 * Junta que exarou o laudo, na grafia da mensagem: JRS → "JRS/HNRe"; MPI → "MPI/HNRe <NOME DO PERITO>"
 * (ex.: "MPI/HNRe MAURISTON" — o nome de guerra, sem o posto).
 */
export const juntaMensagem = (amp: string | undefined, peritoNome?: string): string => {
  if (amp === 'JRS') return 'JRS/HNRe';
  if (amp === 'MPI') {
    const nome = (peritoNome || '').trim().replace(/^(CMG|CF|CC|CT|1T|2T)\s+/i, '').toUpperCase();
    return `MPI/HNRe ${nome || PRE('nome do perito')}`;
  }
  return PRE('Junta (JRS/HNRe ou MPI/HNRe …)');
};

/** Laudo preservado, numa linha só (quebras de linha viram " / ", como no agrupamento de laudos do modelo). */
export const laudoMensagem = (laudo: string | undefined): string =>
  (laudo || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).join(' / ');

export interface DadosMensagemResultado {
  finalidade: string;
  inspecionado: string;
  /** OM do inspecionado (cadastro), quando conhecida. */
  om?: string;
  /** 'JRS' | 'MPI' */
  amp?: string;
  peritoNome?: string;
  /** AAAA-MM-DD */
  dataLaudo?: string;
  laudo?: string;
  tis?: string;
  ds1a?: string;
  /** Inspecionada do sexo feminino: aplica a concordância do modelo ("atinente à"). */
  feminino?: boolean;
  /** Vínculo do inspecionado (define a situação do inspecionado na tabela de destinatários). */
  vinculo?: string;
  /** Grupo da finalidade (finalidadesIS.json): "Benefícios", "Justiça e Disciplina"… */
  grupoFinalidade?: string;
}

/** Minuta em campos, como são colados no sistema de mensagens. `de` só existe na minuta de cancelamento. */
export interface MinutaCampos { de?: string; para: string; info?: string; assunto: string; texto: string }

/**
 * Minuta de resultado no modelo "TEMPLATE — IS ÚNICA" do PROMPT_MINUTA_MENSAGEM, em campos:
 *   para / info / assunto ("INSPEÇÃO DE SAÚDE FIM [FINALIDADE] - [INSPECIONADO] ([OM])") /
 *   texto (ALFA + linha em branco + BRAVO).
 */
export const camposMensagemResultado = (d: DadosMensagemResultado): MinutaCampos => {
  const laudo = laudoMensagem(d.laudo);
  const dest = destinatariosDaMensagem(d.finalidade, laudo, { vinculo: d.vinculo, inspecionado: d.inspecionado, grupoFinalidade: d.grupoFinalidade });
  const para = dest?.para || PRE(dicaPara(d.finalidade, d.vinculo) || 'PARA');
  const info = dest?.info || dicaInfo(d.finalidade, d.vinculo) || PRE('INFO');
  const finalidade = d.finalidade.trim().toUpperCase() || PRE('finalidade');
  const inspecionado = inspecionadoMensagem(d.inspecionado) || PRE('inspecionado');
  const om = omMensagem(d.om) || PRE('OM');
  const junta = juntaMensagem(d.amp, d.peritoNome);
  const data = dataMensagem(d.dataLaudo) || PRE('data do laudo');
  const tis = (d.tis || '').trim() || PRE('nº do TIS');
  const ds1a = (d.ds1a || '').trim() || PRE('código DS-1A');
  const atinente = d.feminino ? 'atinente à' : 'atinente ao';
  return {
    para,
    info,
    assunto: `INSPEÇÃO DE SAÚDE FIM ${finalidade} - ${inspecionado} (${om})`,
    texto: [
      `ALFA - PTC que a ${junta} concluiu em ${data} a IS FIM ${finalidade} ${atinente} ${inspecionado} (${om}) e exarou o seguinte laudo: "${laudo || PRE('laudo')}". ACD TIS nº ${tis}; e`,
      '',
      `BRAVO - O REF TIS (modelo DS-1A) pode ser verificado digitalmente por meio do acesso ao sítio https://sinais.dsm.mb/tisonline, informando o código de validação ${ds1a} e selecionando a opção "Download do TIS" BT`,
    ].join('\n'),
  };
};

/**
 * Texto completo da minuta. Resultado (com INFO): cabeçalhos separados por linha em branco, como o template.
 * Cancelamento (com DE): cabeçalho compacto DE/PARA/ASSUNTO e uma linha em branco antes do texto.
 */
export const juntarMinuta = (c: MinutaCampos): string => {
  if (c.de !== undefined) {
    return [`DE: ${c.de}`, `PARA: ${c.para}`, ...(c.info !== undefined ? [`INFO: ${c.info}`] : []), `ASSUNTO: ${c.assunto}`, '', c.texto].join('\n');
  }
  return [`PARA: ${c.para}`, '', ...(c.info !== undefined ? [`INFO: ${c.info}`, ''] : []), `ASSUNTO: ${c.assunto}`, '', c.texto].join('\n');
};

/**
 * Separa um texto de minuta (ex.: minuta de cancelamento gravada na IS) nos campos: cabeçalhos "DE:", "PARA:",
 * "INFO:" e "ASSUNTO:" no início (linhas em branco entre eles são ignoradas); o resto é o texto.
 */
export const separarMinuta = (texto: string): MinutaCampos => {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  const c: Partial<MinutaCampos> = {};
  let i = 0;
  for (; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l.trim()) continue;
    const m = /^(DE|PARA|INFO|ASSUNTO):\s?(.*)$/.exec(l);
    if (!m) break;
    const k = ({ DE: 'de', PARA: 'para', INFO: 'info', ASSUNTO: 'assunto' } as const)[m[1] as 'DE' | 'PARA' | 'INFO' | 'ASSUNTO'];
    if (c[k] !== undefined) break;
    c[k] = m[2].trim();
  }
  return { ...c, para: c.para ?? '', assunto: c.assunto ?? '', texto: linhas.slice(i).join('\n').trim() };
};

/** Minuta de resultado como texto único (compatibilidade). */
export const minutaMensagemResultado = (d: DadosMensagemResultado): string => juntarMinuta(camposMensagemResultado(d));

/** Quantos marcadores "[preencher: …]" restam no texto. */
export const contarPreencher = (texto: string): number => (texto.match(/\[preencher\b/g) || []).length;
