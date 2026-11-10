// Ficheiro: utils/minutaMensagemResultado.ts
// Minuta de mensagem de conclusão (resultado) de IS no MESMO padrão da página Mensagens.
// A página Mensagens manda o Gemini extrair os dados do TIS (par de imagens) e preencher o modelo descrito em
// PROMPT_MINUTA_MENSAGEM (config/promptsIA.ts): PARA/INFO pela tabela de destinatários, ASSUNTO, ALFA e BRAVO.
// Aqui o mesmo modelo é preenchido de forma determinística com os dados da própria IS finalizada. O que a IS
// não tem fica com o marcador "[preencher: …]" para o perito completar no texto editável.
// Os testes (utils/__tests__/minutasIS.test.ts) conferem a tabela e o modelo contra o texto do prompt.

export const PRE = (campo: string) => `[preencher: ${campo}]`;

/** Linha da tabela "MAPEAMENTO DE DESTINATÁRIOS" do PROMPT_MINUTA_MENSAGEM (cópia literal; teste compara). */
export interface DestinoMensagem { FINALIDADE: string; RESULTADO: string; PARA: string; INFO: string }

export const DESTINOS_MENSAGEM: DestinoMensagem[] = [
  { FINALIDADE: 'Benefícios (Dependentes de Militares da ativa)', RESULTADO: 'Any', PARA: 'OM do militar', INFO: '—' },
  { FINALIDADE: 'Benefícios (Dependentes de Militares inativos)', RESULTADO: 'Any', PARA: 'CPesFN ou SVPM ou OMAC', INFO: '—' },
  { FINALIDADE: 'Benefícios (Militares inativos)', RESULTADO: 'Any', PARA: 'DPM ou CPesFN', INFO: 'SVPM' },
  { FINALIDADE: 'Benefícios (Pensionistas, ex-combatentes e seus Dependentes)', RESULTADO: 'Any', PARA: 'SVPM', INFO: 'OM de Origem' },
  { FINALIDADE: 'Benefícios (Servidores Civis e seus dependentes)', RESULTADO: 'Any', PARA: 'DPM-BSB', INFO: 'OM de Origem' },
  { FINALIDADE: 'Controle Trienal', RESULTADO: 'Any', PARA: 'Órgão de Pessoal', INFO: 'OM de Origem' },
  { FINALIDADE: 'Deixar o SAM', RESULTADO: 'Any', PARA: 'Órgão de Pessoal', INFO: 'OM de Origem' },
  { FINALIDADE: 'Deixar o SMI', RESULTADO: 'Any', PARA: 'DN', INFO: 'OM de Origem' },
  { FINALIDADE: 'Deixar o SMV', RESULTADO: 'Any', PARA: 'DN', INFO: 'DPM + OM de Origem' },
  { FINALIDADE: 'Deixar o SPG', RESULTADO: 'Any', PARA: 'Órgão de Pessoal', INFO: 'OM de Origem' },
  { FINALIDADE: 'Licença para tratamento de saúde de pessoa da família', RESULTADO: 'Any', PARA: 'SDP', INFO: 'Órgão de Pessoal* + OM de Origem' },
  { FINALIDADE: 'Localidade Deficiente em Assistência Sanitária', RESULTADO: 'Any', PARA: 'Órgão de Pessoal', INFO: 'OM de Origem' },
  { FINALIDADE: 'Missão no Exterior', RESULTADO: 'Any', PARA: 'Órgão de Pessoal', INFO: 'OM de Origem' },
  { FINALIDADE: 'Prorrogação de Tempo de Serviço', RESULTADO: 'Any', PARA: 'DN', INFO: 'DPM + OM de Origem' },
  { FINALIDADE: 'Reengajamento', RESULTADO: 'Any', PARA: 'Órgão de Pessoal', INFO: 'OM de Origem' },
  { FINALIDADE: 'Revisão de Reforma por incapacidade definitiva ou invalidez', RESULTADO: 'Any', PARA: 'DPM ou CPesFN', INFO: 'SVPM' },
  { FINALIDADE: 'Semestral de RX, substâncias radioativas e Terapia Antineoplásica', RESULTADO: 'Any', PARA: 'DSM', INFO: 'Órgão de Pessoal* + OM de Origem' },
  { FINALIDADE: 'Tarefa por Tempo Certo', RESULTADO: 'Any', PARA: 'OM de Origem', INFO: '—' },
  { FINALIDADE: 'Término de Incapacidade', RESULTADO: 'Apto para o SAM', PARA: 'Órgão de Pessoal', INFO: 'SDP + OM de Origem' },
  { FINALIDADE: 'Término de Incapacidade', RESULTADO: 'Apto para o SAM com restrições', PARA: 'Órgão de Pessoal', INFO: 'SDP + OM de Origem' },
  { FINALIDADE: 'Término de Incapacidade', RESULTADO: 'Apto para o SMV', PARA: 'DN', INFO: 'DPM + OM de Origem' },
  { FINALIDADE: 'Término de Incapacidade', RESULTADO: 'Apto para o SMV com restrições', PARA: 'DN', INFO: 'DPM + OM de Origem' },
  { FINALIDADE: 'Término de Incapacidade', RESULTADO: 'Incapaz definitivamente para o SAM', PARA: 'Órgão de Pessoal', INFO: 'OM de Origem' },
  { FINALIDADE: 'Término de Incapacidade', RESULTADO: 'Incapaz temporariamente para o SMV', PARA: 'DN', INFO: 'DPM + OM de Origem' },
  { FINALIDADE: 'Término de Restrições', RESULTADO: 'Apto para o SMV', PARA: 'DN', INFO: 'DPM + OM de Origem' },
  { FINALIDADE: 'Término de Restrições', RESULTADO: 'Apto para o SMV com restrições', PARA: 'DN', INFO: 'DPM + OM de Origem' },
  { FINALIDADE: 'Verificação de Deficiência Funcional', RESULTADO: 'Apto para o SAM com restrições', PARA: 'Órgão de Pessoal', INFO: 'OM de Origem' },
  { FINALIDADE: 'Verificação de Deficiência Funcional', RESULTADO: 'Incapaz definitivamente para a especialidade', PARA: 'Órgão de Pessoal', INFO: 'OM de Origem' },
  { FINALIDADE: 'Verificação de Deficiência Funcional', RESULTADO: 'Incapaz definitivamente para o SAM', PARA: 'Órgão de Pessoal', INFO: 'OM de Origem' },
  { FINALIDADE: 'Verificação de Deficiência Funcional', RESULTADO: 'Incapaz definitivamente para o SPG', PARA: 'Órgão de Pessoal', INFO: 'OM de Origem' },
  { FINALIDADE: 'Verificação de Deficiência Funcional', RESULTADO: 'Incapaz temporariamente para o SAM', PARA: 'SDP', INFO: 'Órgão de Pessoal* + OM de Origem' },
  { FINALIDADE: 'Verificação de Deficiência Funcional', RESULTADO: 'Incapaz temporariamente para o SMV', PARA: 'DN', INFO: 'DPM + OM de Origem' },
  { FINALIDADE: 'Verificação de Deficiência Funcional', RESULTADO: 'Incapaz temporariamente para o SPG', PARA: 'OM de Origem', INFO: '—' },
];

/** Minúsculas, sem acentos e com espaços simples — para comparar textos de finalidade/laudo. */
export const normalizarTexto = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Finalidade da tabela do prompt correspondente à finalidade cadastrada na IS (public/finalidadesIS.json).
 * `vinculo` (Carreira/Temporário/Inativo/Dependente/Pensionista) desambigua Benefícios quando informado.
 * Devolve null quando a tabela não cobre a finalidade.
 */
export const finalidadeDaTabela = (finalidade: string, vinculo?: string): string | null => {
  const f = normalizarTexto(finalidade);
  const v = normalizarTexto(vinculo || '');
  const regras: [RegExp, string][] = [
    [/^controle trienal/, 'Controle Trienal'],
    [/^deixar o sam/, 'Deixar o SAM'],
    [/^deixar o smi/, 'Deixar o SMI'],
    [/^deixar o smv/, 'Deixar o SMV'],
    [/^deixar o spg/, 'Deixar o SPG'],
    [/^(ltspf|licenca para tratamento de saude de pessoa da familia)/, 'Licença para tratamento de saúde de pessoa da família'],
    [/^(ldas|localidade (com )?deficien)/, 'Localidade Deficiente em Assistência Sanitária'],
    [/^missao no exterior/, 'Missão no Exterior'],
    [/^prorrogacao (do|de) tempo de servico/, 'Prorrogação de Tempo de Serviço'],
    [/^reengajamento/, 'Reengajamento'],
    // "Revisão de reforma relacionada ao serviço / SIDA / idade-limite" (Benefícios, vínculo Inativo): mesma linha
    // da tabela; PARA/INFO coincidem com "Benefícios (Militares inativos)".
    [/^revisao de reforma/, 'Revisão de Reforma por incapacidade definitiva ou invalidez'],
    [/^(controle semestral (de )?(raios?-?x|rx)|semestral de rx|manipulacao e admin(istracao)? (de )?terapia antineoplasica)/, 'Semestral de RX, substâncias radioativas e Terapia Antineoplásica'],
    [/^(tarefa por tempo certo|ttc\b)/, 'Tarefa por Tempo Certo'],
    [/^termino de incapacidade/, 'Término de Incapacidade'],
    [/^termino de restricoes/, 'Término de Restrições'],
    [/^(verificacao de deficiencia funcional|vdf\b)/, 'Verificação de Deficiência Funcional'],
    // Benefícios exclusivos de militar inativo (finalidadesIS.json: vínculo só "Inativo").
    [/^(auxilio[ -]invalidez|reforma de militar rm1|is para verificacao de preexistencia)/, 'Benefícios (Militares inativos)'],
    // Pensões (beneficiário inválido, ex-combatente, viúva): o requerente é pensionista/dependente de ex-combatente.
    [/^pensao (militar para beneficiario invalido|de ex-combatente|especial a viuva)/, 'Benefícios (Pensionistas, ex-combatentes e seus Dependentes)'],
  ];
  for (const [re, chave] of regras) if (re.test(f)) return chave;
  if (f.startsWith('beneficios (')) {
    const exata = DESTINOS_MENSAGEM.find(d => normalizarTexto(d.FINALIDADE) === f);
    if (exata) return exata.FINALIDADE;
  }
  // Isenção de IR: depende de quem requer.
  if (/^isencao de (pagamento de )?imposto de renda/.test(f)) {
    if (v === 'inativo') return 'Benefícios (Militares inativos)';
    if (v === 'pensionista') return 'Benefícios (Pensionistas, ex-combatentes e seus Dependentes)';
  }
  return null;
};

/** Serviço citado no resultado (SAM, SMV, SMI, SPG) ou "especialidade". */
export type ServicoLaudo = 'SAM' | 'SMV' | 'SMI' | 'SPG';
export type TipoLaudo = 'apto' | 'apto_restricoes' | 'incapaz_temporario' | 'incapaz_definitivo' | 'incapaz_especialidade';

/** Início do laudo (1º laudo, se houver vários com " / "), sem período, "em prorrogação" e parênteses. */
const inicioDoLaudo = (laudo: string): string =>
  normalizarTexto(laudo.split(/\s\/\s|\r?\n/)[0] || '')
    .replace(/[()]/g, ' ')
    .replace(/,?\s*(necessitando\b|(por|pelo prazo de|durante)\s+(\d+|um|dois|tres|seis|trinta|sessenta|noventa|cento)\b)[^,;.]*/g, ' ')
    .replace(/,?\s*em prorrogacao/g, ' ')
    .replace(/\s+/g, ' ').trim();

/** Tipo de laudo pelo início do texto ("Apto com restrições por 90 dias" → apto_restricoes). */
export const tipoDoLaudo = (laudo: string): TipoLaudo | null => {
  const l = inicioDoLaudo(laudo);
  if (/^(continua )?(incapaz|inapto)\w* definitiv\w* para (o exercicio d)?a especialidade/.test(l)) return 'incapaz_especialidade';
  if (/^(continua )?(incapaz|inapto)\w* (temporari|por tempo determinado)/.test(l)) return 'incapaz_temporario';
  if (/^(continua )?(incapaz|inapto)\w* definitiv/.test(l) || /^incapacidade definitiva/.test(l)) return 'incapaz_definitivo';
  if (/^apto\b/.test(l)) return /\bcom restri/.test(l) ? 'apto_restricoes' : 'apto';
  return null;
};

/** Serviço citado no início do laudo, se houver. */
const servicoNoLaudo = (laudo: string): ServicoLaudo | null => {
  const m = /\b(sam|smv|smi|spg)\b/.exec(inicioDoLaudo(laudo));
  return m ? (m[1].toUpperCase() as ServicoLaudo) : null;
};

/**
 * Serviço a que o resultado se refere: o do laudo; senão o da finalidade ("VDF - SMI", "VDF - SC");
 * senão o do vínculo/posto (Temporário ou "RM2" no inspecionado → SMV; Carreira → SAM).
 */
export const servicoDoResultado = (finalidade: string, laudo: string, vinculo?: string, inspecionado?: string): ServicoLaudo | null => {
  const doLaudo = servicoNoLaudo(laudo);
  if (doLaudo) return doLaudo;
  const f = normalizarTexto(finalidade);
  if (/\bsmi$/.test(f)) return 'SMI';
  if (/\b(sc|servidor civil)$/.test(f)) return 'SPG';
  const v = normalizarTexto(vinculo || '');
  if (v === 'temporario' || /\brm2\b/i.test(inspecionado || '')) return 'SMV';
  if (v === 'carreira') return 'SAM';
  return null;
};

/** Resultado na grafia da coluna RESULTADO da tabela (ex.: "Apto para o SAM com restrições"). */
export const resultadoDaTabela = (tipo: TipoLaudo, servico: ServicoLaudo | null): string | null => {
  if (tipo === 'incapaz_especialidade') return 'Incapaz definitivamente para a especialidade';
  if (!servico) return null;
  switch (tipo) {
    case 'apto': return `Apto para o ${servico}`;
    case 'apto_restricoes': return `Apto para o ${servico} com restrições`;
    case 'incapaz_temporario': return `Incapaz temporariamente para o ${servico}`;
    case 'incapaz_definitivo': return `Incapaz definitivamente para o ${servico}`;
  }
};

export interface Destinatarios {
  para: string;
  info: string;
  /**
   * 'tabela': linha da tabela (Any ou resultado exato). 'analogia': a tabela não tem o resultado exato, mas
   * todas as linhas da mesma finalidade e do mesmo serviço dão o mesmo PARA/INFO (ex.: SMV → DN / DPM + OM),
   * ou é "Apto" sem a linha "Apto" e com a linha "Apto … com restrições" (a tabela trata os dois igual).
   */
  regra: 'tabela' | 'analogia';
}

export interface ContextoDestinatarios { vinculo?: string; inspecionado?: string }

/**
 * PARA e INFO pela tabela do PROMPT_MINUTA_MENSAGEM, como a IA da página Mensagens faz: finalidade + início do
 * laudo, ignorando o período das restrições. O laudo da IS costuma omitir o serviço ("Apto com restrições por
 * 90 dias"); nesse caso o serviço vem da finalidade ou do vínculo do inspecionado.
 */
export const destinatariosDaMensagem = (finalidade: string, laudo: string, ctx: ContextoDestinatarios | string = {}): Destinatarios | null => {
  const { vinculo, inspecionado } = typeof ctx === 'string' ? { vinculo: ctx, inspecionado: undefined } : ctx;
  const chave = finalidadeDaTabela(finalidade, vinculo);
  if (!chave) return null;
  const linhas = DESTINOS_MENSAGEM.filter(d => d.FINALIDADE === chave);
  const qualquer = linhas.find(d => d.RESULTADO === 'Any');
  if (qualquer) return { para: qualquer.PARA, info: qualquer.INFO, regra: 'tabela' };
  const tipo = tipoDoLaudo(laudo);
  if (!tipo) return null;
  const servico = servicoDoResultado(finalidade, laudo, vinculo, inspecionado);
  const resultado = resultadoDaTabela(tipo, servico);
  if (!resultado) return null;
  const achar = (r: string) => linhas.find(d => normalizarTexto(d.RESULTADO) === normalizarTexto(r));
  const exata = achar(resultado);
  if (exata) return { para: exata.PARA, info: exata.INFO, regra: 'tabela' };
  // Analogia 1: "Apto" ⇄ "Apto … com restrições" do mesmo serviço (na tabela, sempre com o mesmo destino).
  if (servico && (tipo === 'apto' || tipo === 'apto_restricoes')) {
    const par = achar(resultadoDaTabela(tipo === 'apto' ? 'apto_restricoes' : 'apto', servico)!);
    if (par) return { para: par.PARA, info: par.INFO, regra: 'analogia' };
  }
  // Analogia 2: todas as linhas da finalidade para esse serviço concordam.
  if (servico) {
    const doServico = linhas.filter(d => new RegExp(`\\b${servico}\\b`).test(d.RESULTADO));
    const unicos = new Set(doServico.map(d => `${d.PARA}|${d.INFO}`));
    if (doServico.length && unicos.size === 1) return { para: doServico[0].PARA, info: doServico[0].INFO, regra: 'analogia' };
  }
  return null;
};

/** Sugestão para o "[preencher]" quando a tabela não decide sozinha. */
const dicaPara = (finalidade: string): string | null =>
  /^dependencia de familiar/.test(normalizarTexto(finalidade)) ? 'PARA: OM do militar (ativa) ou CPesFN/SVPM/OMAC (inativo)' : null;
const dicaInfo = (finalidade: string): string | null =>
  /^dependencia de familiar/.test(normalizarTexto(finalidade)) ? '—' : null;

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
  /** Vínculo do inspecionado (desambigua Benefícios). */
  vinculo?: string;
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
  const dest = destinatariosDaMensagem(d.finalidade, laudo, { vinculo: d.vinculo, inspecionado: d.inspecionado });
  const para = dest?.para || PRE(dicaPara(d.finalidade) || 'PARA');
  const info = dest?.info || dicaInfo(d.finalidade) || PRE('INFO');
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
