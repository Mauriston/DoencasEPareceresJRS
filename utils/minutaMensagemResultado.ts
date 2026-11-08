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
    [/^localidade (com )?deficien/, 'Localidade Deficiente em Assistência Sanitária'],
    [/^missao no exterior/, 'Missão no Exterior'],
    [/^prorrogacao (do|de) tempo de servico/, 'Prorrogação de Tempo de Serviço'],
    [/^reengajamento/, 'Reengajamento'],
    [/^revisao de reforma/, 'Revisão de Reforma por incapacidade definitiva ou invalidez'],
    [/^(controle semestral raios-?x|semestral de rx|manipulacao e admin terapia antineoplasica)/, 'Semestral de RX, substâncias radioativas e Terapia Antineoplásica'],
    [/^tarefa por tempo certo/, 'Tarefa por Tempo Certo'],
    [/^termino de incapacidade/, 'Término de Incapacidade'],
    [/^termino de restricoes/, 'Término de Restrições'],
    [/^verificacao de deficiencia funcional/, 'Verificação de Deficiência Funcional'],
    // Benefícios exclusivos de militar inativo (finalidadesIS.json: vínculo só "Inativo").
    [/^(auxilio invalidez de militar inativo|reforma de militar rm1|is para verificacao de preexistencia)/, 'Benefícios (Militares inativos)'],
  ];
  for (const [re, chave] of regras) if (re.test(f)) return chave;
  if (f.startsWith('beneficios (')) {
    const exata = DESTINOS_MENSAGEM.find(d => normalizarTexto(d.FINALIDADE) === f);
    if (exata) return exata.FINALIDADE;
  }
  // Demais benefícios: só com o vínculo dá para escolher a linha.
  if (/^(isencao de pagamento de imposto de renda|pensao |dependencia de familiar)/.test(f)) {
    if (v === 'inativo') return 'Benefícios (Militares inativos)';
    if (v === 'pensionista') return 'Benefícios (Pensionistas, ex-combatentes e seus Dependentes)';
  }
  return null;
};

/** PARA e INFO pela tabela (finalidade + início do laudo, ignorando o período de restrições). */
export const destinatariosDaMensagem = (finalidade: string, laudo: string, vinculo?: string): { para: string; info: string } | null => {
  const chave = finalidadeDaTabela(finalidade, vinculo);
  if (!chave) return null;
  const linhas = DESTINOS_MENSAGEM.filter(d => d.FINALIDADE === chave);
  const qualquer = linhas.find(d => d.RESULTADO === 'Any');
  if (qualquer) return { para: qualquer.PARA, info: qualquer.INFO };
  const l = normalizarTexto(laudo);
  const casada = linhas
    .filter(d => l.startsWith(normalizarTexto(d.RESULTADO)))
    .sort((a, b) => b.RESULTADO.length - a.RESULTADO.length)[0];
  return casada ? { para: casada.PARA, info: casada.INFO } : null;
};

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

/**
 * Minuta de resultado no modelo "TEMPLATE — IS ÚNICA" do PROMPT_MINUTA_MENSAGEM:
 *
 *   PARA: [PARA]
 *
 *   INFO: [INFO]
 *
 *   ASSUNTO: INSPEÇÃO DE SAÚDE FIM [FINALIDADE] - [INSPECIONADO] ([OM])
 *
 *   ALFA - PTC que a [Junta] concluiu em [DATA] a IS FIM [FINALIDADE] atinente ao [INSPECIONADO] ([OM]) e exarou o
 *   seguinte laudo: "[LAUDO]". ACD TIS nº [TIS]; e
 *
 *   BRAVO - O REF TIS (modelo DS-1A) pode ser verificado digitalmente por meio do acesso ao sítio
 *   https://sinais.dsm.mb/tisonline, informando o código de validação [DS1A] e selecionando a opção "Download do TIS" BT
 */
export const minutaMensagemResultado = (d: DadosMensagemResultado): string => {
  const laudo = laudoMensagem(d.laudo);
  const dest = destinatariosDaMensagem(d.finalidade, laudo, d.vinculo);
  const para = dest?.para || PRE('PARA');
  const info = dest?.info || PRE('INFO');
  const finalidade = d.finalidade.trim().toUpperCase() || PRE('finalidade');
  const inspecionado = inspecionadoMensagem(d.inspecionado) || PRE('inspecionado');
  const om = omMensagem(d.om) || PRE('OM');
  const junta = juntaMensagem(d.amp, d.peritoNome);
  const data = dataMensagem(d.dataLaudo) || PRE('data do laudo');
  const tis = (d.tis || '').trim() || PRE('nº do TIS');
  const ds1a = (d.ds1a || '').trim() || PRE('código DS-1A');
  const atinente = d.feminino ? 'atinente à' : 'atinente ao';
  return [
    `PARA: ${para}`,
    '',
    `INFO: ${info}`,
    '',
    `ASSUNTO: INSPEÇÃO DE SAÚDE FIM ${finalidade} - ${inspecionado} (${om})`,
    '',
    `ALFA - PTC que a ${junta} concluiu em ${data} a IS FIM ${finalidade} ${atinente} ${inspecionado} (${om}) e exarou o seguinte laudo: "${laudo || PRE('laudo')}". ACD TIS nº ${tis}; e`,
    '',
    `BRAVO - O REF TIS (modelo DS-1A) pode ser verificado digitalmente por meio do acesso ao sítio https://sinais.dsm.mb/tisonline, informando o código de validação ${ds1a} e selecionando a opção "Download do TIS" BT`,
  ].join('\n');
};

/** Quantos marcadores "[preencher: …]" restam no texto. */
export const contarPreencher = (texto: string): number => (texto.match(/\[preencher\b/g) || []).length;
