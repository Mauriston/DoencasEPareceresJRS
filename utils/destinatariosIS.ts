// Ficheiro: utils/destinatariosIS.ts
// Roteamento dos destinatários (PARA e INFO) das mensagens de conclusão de IS.
//
// Fonte normativa: DGPM-406 (9ª Rev.), Anexo M, item 2. A tabela foi extraída para a planilha
// "Destinatários das IS" e exportada como JSON hierárquico em data/destinatariosInspecoes.json — FONTE ÚNICA
// usada por:
//   • página Inspeções (minuta de resultado, determinística — este módulo);
//   • página Mensagens (o Gemini/Firebase AI Logic recebe o mesmo JSON no prompt, config/promptsIA.ts);
//   • sugestão por IA quando este módulo não decide sozinho (services/destinatariosIA.ts: a IA só escolhe
//     as CHAVES da tabela — finalidade, situação, laudo — e o PARA/INFO sai sempre daqui).
// Para atualizar: edite a planilha, exporte o JSON e substitua o arquivo; os testes conferem a estrutura.
//
// Hierarquia: finalidadeIS → situacaoInspecionado → laudo ("Any" = qualquer laudo) → { para, info }.
import TABELA_JSON from '../data/destinatariosInspecoes.json';

export interface LaudoDestino { laudo: string; para: string; info: string }
export interface SituacaoDestino { situacaoInspecionado: string; laudos: LaudoDestino[] }
export interface FinalidadeDestino { finalidadeIS: string; situacoes: SituacaoDestino[] }

export const TABELA_DESTINATARIOS: FinalidadeDestino[] = TABELA_JSON as FinalidadeDestino[];

/** Minúsculas, sem acentos e com espaços simples — para comparar textos de finalidade/situação/laudo. */
export const normalizarTexto = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** "Null" ou vazio na tabela → "—" (sem destinatário de informação). */
export const destinoExibido = (v: string | undefined): string => {
  const t = (v || '').trim();
  return !t || /^null$/i.test(t) ? '—' : t;
};

// ---------------------------------------------------------------------------
// Nível 1 — finalidade
// ---------------------------------------------------------------------------

const SUFIXO_SC = ' - Servidor Civil';
const acharFinalidade = (nome: string): FinalidadeDestino | undefined =>
  TABELA_DESTINATARIOS.find(f => normalizarTexto(f.finalidadeIS) === normalizarTexto(nome));

/**
 * Finalidade cadastrada na IS (public/finalidadesIS.json) → `finalidadeIS` da tabela. Nome igual ao da tabela
 * vale direto; senão, equivalências abaixo. `grupoFinalidade` cobre grupos inteiros ("Benefícios", "Justiça e
 * Disciplina"). Devolve null quando a tabela do Anexo M não cobre a finalidade.
 */
export const finalidadeDaTabela = (finalidade: string, grupoFinalidade?: string): string | null => {
  const exata = acharFinalidade(finalidade);
  if (exata) return exata.finalidadeIS;
  const f = normalizarTexto(finalidade);
  const regras: [RegExp, string][] = [
    [/^controle anual de praca de maquinas|^anual de maquinas/, 'Anual de máquinas'],
    [/^controle trienal/, 'Controle Trienal'],
    [/^(controle semestral (de )?(raios?-?x|rx)|semestral de rx)/, 'Semestral de RX, substâncias radioativas e Terapia Antineoplásica'],
    [/^manipulacao (e admin(istracao)? )?(de )?terapia antineoplasica/, 'Manipulação de terapia antineoplásica'],
    [/^(servico com explosivos|servico com otto fuel+ ii|propelentes)/, 'Propelentes e explosivos'],
    [/^(selecao para )?cursos? de carreira/, 'Cursos de carreira'],
    [/^prorrogacao (do|de) tempo de servico/, 'Prorrogação de Tempo de Serviço'],
    [/^reengajamento/, 'Reengajamento'],
    [/^engajamento/, 'Engajamento'],
    [/^(tarefa por tempo certo|ttc\b)/, 'Tarefa por Tempo Certo'],
    [/^deixar o sam/, 'Deixar o SAM'],
    [/^deixar o smi/, 'Deixar o SMI'],
    [/^deixar o smv/, 'Deixar o SMV'],
    [/^deixar o spg/, 'Deixar o SPG'],
    [/^(ldas|localidade (com )?deficien)/, 'Localidade Deficiente em Assistência Sanitária'],
    [/^missao antartica/, 'Missão Antártica'],
    [/^missao no exterior/, 'Missão no Exterior'],
    [/^(ltspf|licenca para tratamento de saude de pessoa da familia)/, 'Licença para tratamento de saúde de pessoa da família'],
    // "Reversão ou Reintegração ao SPG": as duas linhas da tabela têm o mesmo PARA/INFO.
    [/^reversao/, 'Reversão ao SPG'],
    [/^reintegracao ao spg/, 'Reintegração ao SPG'],
    [/^readaptacao/, 'Readaptação ao SPG'],
    [/^redistribuicao/, 'Redistribuição no SPG'],
    [/^(pad\b|processo administrativo)/, 'Processo Administrativo de Civis (PAD)'],
    [/^horario especial/, 'Horário especial ao Servidor Civil'],
    [/^exame (medico )?periodico/, 'Exame médico periódico - Servidor Civil'],
    [/^operacao com substancias radioativas/, 'Operação com substâncias radioativas'],
    [/^revisao de reforma por incapacidade definitiva ou invalidez/, 'Revisão de Reforma por incapacidade definitiva ou invalidez'],
    // "Revisão de reforma relacionada ao serviço / SIDA / idade-limite" (vínculo Inativo).
    [/^revisao de reforma/, 'Revisão de Reforma'],
    [/^revisao de incapacidade definitiva/, 'Revisão de Incapacidade Definitiva'],
    [/^revisao de invalidez/, 'Revisão de Invalidez'],
    [/^(verificacao de deficiencia funcional|vdf\b).*\b(sc|servidor civil)$/, 'Verificação de Deficiência Funcional - Servidor Civil'],
    [/^(verificacao de deficiencia funcional|vdf\b).*\bsmi$/, 'Verificação de Deficiência Funcional - SMI'],
    [/^(verificacao de deficiencia funcional|vdf\b)/, 'Verificação de Deficiência Funcional'],
    [/^termino de incapacidade/, 'Término de Incapacidade'],
    [/^termino de restricoes/, 'Término de Restrições'],
    // Benefícios (grupo "Benefícios" do finalidadesIS.json): a situação do inspecionado decide a linha.
    [/^(auxilio[ -]invalidez|reforma de militar rm1|is para verificacao de preexistencia|isencao de (pagamento de )?imposto de renda|pensao |dependencia de familiar|beneficios\b)/, 'Benefícios'],
    // Grupo "Justiça e Disciplina": exame de sanidade em IPM, reintegração de militar.
    [/^(exame de sanidade|reintegracao de militar)/, 'Justiça e Disciplina'],
  ];
  for (const [re, chave] of regras) if (re.test(f)) return chave;
  const g = normalizarTexto(grupoFinalidade || '');
  if (g === 'beneficios') return 'Benefícios';
  return null;
};

// ---------------------------------------------------------------------------
// Nível 2 — situação do inspecionado
// ---------------------------------------------------------------------------

/** Situação canônica (uma linha "situacaoInspecionado" da tabela pode listar várias, separadas por vírgula). */
export type Situacao = 'ativa' | 'temporario' | 'inativo' | 'servidor' | 'pensionista' | 'dep_ativa' | 'dep_inativo' | 'servidor_dep';

const ROTULOS_SITUACAO: [RegExp, Situacao[]][] = [
  [/^pensionistas, ex-combatentes e seus dependentes$/, ['pensionista']],
  [/^servidores civis e seus dependentes$/, ['servidor', 'servidor_dep']],
  [/^dependentes de militares da ativa$/, ['dep_ativa']],
  [/^dependentes de militares inativos$/, ['dep_inativo']],
  [/^militares da ativa$/, ['ativa']],
  [/^militares temporarios$/, ['temporario']],
  [/^militares inativos$/, ['inativo']],
  [/^servidor(es)? civ(il|is)$/, ['servidor']],
];

/** Situações canônicas de um rótulo da tabela ("Militares da ativa, Servidor Civil" → ['ativa', 'servidor']). */
export const situacoesDoRotulo = (rotulo: string): Situacao[] => {
  const r = normalizarTexto(rotulo);
  const inteiro = ROTULOS_SITUACAO.find(([re]) => re.test(r));
  if (inteiro) return inteiro[1];
  return r.split(/\s*,\s*/).flatMap(p => ROTULOS_SITUACAO.find(([re]) => re.test(p))?.[1] ?? []);
};

export interface ContextoDestinatarios {
  /** Vínculo do cadastro (Carreira/Temporário/Inativo/Pensionista/Dependente). */
  vinculo?: string;
  /** Texto do inspecionado ("1T (RM2-Md) …"): RM2 indica temporário. */
  inspecionado?: string;
  /** Situação já conhecida, com o rótulo da tabela (ex.: escolhida pela IA ou pelo perito). */
  situacao?: string;
  /** Dependente: o titular é inativo (true) ou da ativa (false). */
  titularInativo?: boolean;
  /** Grupo da finalidade (finalidadesIS.json), para "Benefícios"/"Justiça e Disciplina". */
  grupoFinalidade?: string;
}

/** Serviço citado no resultado (SAM, SMV, SMI, SPG). */
export type ServicoLaudo = 'SAM' | 'SMV' | 'SMI' | 'SPG';
export type TipoLaudo = 'apto' | 'apto_restricoes' | 'incapaz_temporario' | 'incapaz_definitivo' | 'incapaz_especialidade';

/** Início do laudo (1º laudo, se houver vários com " / "), sem período, "em prorrogação" e parênteses. */
const inicioDoLaudo = (laudo: string): string =>
  normalizarTexto(laudo.split(/\s\/\s|\r?\n/)[0] || '')
    .replace(/[()]/g, ' ')
    .replace(/,?\s*(necessitando\b|(por|pelo prazo de|durante)\s+(\d+|um|dois|tres|seis|trinta|sessenta|noventa|cento)\b)[^,;.]*/g, ' ')
    .replace(/,?\s*em prorrogacao\b\.*/g, ' ')
    .replace(/\.{2,}/g, ' ')
    .replace(/\s+/g, ' ').trim();

const emProrrogacao = (laudo: string): boolean => /\bem prorrogacao\b/.test(normalizarTexto(laudo));

/** Tipo de laudo pelo início do texto ("Apto com restrições por 90 dias" → apto_restricoes). */
export const tipoDoLaudo = (laudo: string): TipoLaudo | null => {
  const l = inicioDoLaudo(laudo);
  if (/^(continua )?(incapaz|inapto)\w* definitiv\w* para (o exercicio d)?a especialidade/.test(l)) return 'incapaz_especialidade';
  if (/^(continua )?(incapaz|inapto)\w* (temporari|por tempo determinado)/.test(l)) return 'incapaz_temporario';
  if (/^(continua )?(incapaz|inapto)\w* definitiv/.test(l) || /^incapacidade definitiva/.test(l)) return 'incapaz_definitivo';
  if (/^apto\b/.test(l)) return /\bcom restri/.test(l) ? 'apto_restricoes' : 'apto';
  return null;
};

const servicoNoLaudo = (laudo: string): ServicoLaudo | null => {
  const m = /\b(sam|smv|smi|spg)\b/.exec(inicioDoLaudo(laudo));
  return m ? (m[1].toUpperCase() as ServicoLaudo) : null;
};

/**
 * Situações candidatas do inspecionado: grupos em ordem de preferência; dentro de um grupo, alternativas que
 * precisam levar ao mesmo destino (ex.: dependente sem saber se o titular é da ativa ou inativo).
 * Temporário também é militar da ativa: se a finalidade só tiver "Militares da ativa", ela vale.
 * Vazio = situação desconhecida.
 */
export const situacoesDoInspecionado = (finalidade: string, laudo: string, ctx: ContextoDestinatarios): Situacao[][] => {
  if (ctx.situacao) return [situacoesDoRotulo(ctx.situacao)].filter(g => g.length);
  const f = normalizarTexto(finalidade);
  const v = normalizarTexto(ctx.vinculo || '');
  const servico = servicoNoLaudo(laudo);
  if (/\b(sc|servidor civil)$/.test(f) || servico === 'SPG') return [['servidor']];
  if (v === 'pensionista' || /^pensao /.test(f)) return [['pensionista']];
  if (v === 'dependente') {
    if (ctx.titularInativo === true) return [['dep_inativo']];
    if (ctx.titularInativo === false) return [['dep_ativa']];
    return [['dep_ativa', 'dep_inativo']];
  }
  if (v === 'inativo') return [['inativo']];
  if (v === 'temporario' || /\brm2\b/i.test(ctx.inspecionado || '') || servico === 'SMV' || servico === 'SMI') return [['temporario'], ['ativa']];
  if (v === 'carreira' || servico === 'SAM') return [['ativa']];
  return [];
};

/** Serviço implícito na situação (o laudo da IS costuma omitir: "Apto com restrições por 90 dias"). */
const servicoDaSituacao = (s: Situacao | undefined): ServicoLaudo | null =>
  s === 'ativa' ? 'SAM' : s === 'temporario' ? 'SMV' : s === 'servidor' ? 'SPG' : null;

/** Resultado na grafia da tabela (ex.: "Apto para o SAM com restrições"). */
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

// ---------------------------------------------------------------------------
// Nível 3 — laudo
// ---------------------------------------------------------------------------

export interface Destinatarios {
  para: string;
  info: string;
  /**
   * 'tabela': linha da tabela ("Any" ou laudo correspondente). 'analogia': a tabela não tem o laudo exato, mas
   * "Apto" ⇄ "Apto … com restrições" do mesmo serviço, ou todas as linhas do mesmo serviço, dão o mesmo destino.
   */
  regra: 'tabela' | 'analogia';
  /** Chaves usadas na tabela (rastreabilidade). */
  finalidadeIS: string;
  situacaoInspecionado: string;
  laudo: string;
}

const chaveLaudo = (s: string) => ({ texto: inicioDoLaudo(s), prorrogacao: emProrrogacao(s) });

/** Linha de laudo correspondente dentro de uma situação. */
const laudoNaSituacao = (sit: SituacaoDestino, laudo: string, situacao: Situacao | undefined): { linha: LaudoDestino; regra: Destinatarios['regra'] } | null => {
  const qualquer = sit.laudos.find(l => /^any$/i.test(l.laudo.trim()));
  if (qualquer) return { linha: qualquer, regra: 'tabela' };
  const alvo = chaveLaudo(laudo);
  const achar = (texto: string) => {
    const iguais = sit.laudos.filter(l => chaveLaudo(l.laudo).texto === texto);
    return iguais.find(l => chaveLaudo(l.laudo).prorrogacao === alvo.prorrogacao) ?? iguais.find(l => !chaveLaudo(l.laudo).prorrogacao);
  };
  // 1) Texto do laudo igual ao da tabela (ex.: "Apto A", "Incapaz B1", "Apto com restrições").
  const literal = achar(alvo.texto);
  if (literal) return { linha: literal, regra: 'tabela' };
  // 2) Forma canônica: tipo + serviço (do laudo ou da situação) + "com amparo legal".
  const tipo = tipoDoLaudo(laudo);
  if (!tipo) return null;
  const servico = servicoNoLaudo(laudo) ?? servicoDaSituacao(situacao);
  const base = resultadoDaTabela(tipo, servico);
  if (!base) return null;
  const amparo = /\bcom amparo legal\b/.test(alvo.texto) ? ' com amparo legal' : '';
  const canonica = achar(normalizarTexto(base + amparo));
  if (canonica) return { linha: canonica, regra: 'tabela' };
  // 3) Analogia: "Apto" ⇄ "Apto … com restrições" do mesmo serviço.
  if (servico && (tipo === 'apto' || tipo === 'apto_restricoes')) {
    const par = achar(normalizarTexto(resultadoDaTabela(tipo === 'apto' ? 'apto_restricoes' : 'apto', servico)!));
    if (par) return { linha: par, regra: 'analogia' };
  }
  // 4) Analogia: todas as linhas do mesmo serviço concordam.
  if (servico) {
    // Linhas "com amparo legal"/"em prorrogação" só valem se o laudo também disser isso.
    const doServico = sit.laudos.filter(l => {
      const k = chaveLaudo(l.laudo);
      return new RegExp(`\\b${servico}\\b`).test(l.laudo) && k.prorrogacao === alvo.prorrogacao && (!/\bamparo legal\b/.test(k.texto) || !!amparo);
    });
    const unicos = new Set(doServico.map(l => `${destinoExibido(l.para)}|${destinoExibido(l.info)}`));
    if (doServico.length && unicos.size === 1) return { linha: doServico[0], regra: 'analogia' };
  }
  return null;
};

const montar = (f: FinalidadeDestino, s: SituacaoDestino, r: { linha: LaudoDestino; regra: Destinatarios['regra'] }): Destinatarios => ({
  para: destinoExibido(r.linha.para), info: destinoExibido(r.linha.info), regra: r.regra,
  finalidadeIS: f.finalidadeIS, situacaoInspecionado: s.situacaoInspecionado, laudo: r.linha.laudo,
});

/**
 * PARA e INFO da mensagem de conclusão pela tabela do Anexo M: finalidade → situação do inspecionado → laudo
 * (ignorando o período das restrições). Devolve null quando a tabela não decide sem ambiguidade — a minuta
 * fica com "[preencher]" e a tela oferece a sugestão por IA.
 */
export const destinatariosDaMensagem = (finalidade: string, laudo: string, ctx: ContextoDestinatarios = {}): Destinatarios | null => {
  let chave = finalidadeDaTabela(finalidade, ctx.grupoFinalidade);
  if (!chave) return null;
  const grupos = situacoesDoInspecionado(finalidade, laudo, ctx);
  // Servidor civil: usa a variante "… - Servidor Civil" da finalidade, quando existir.
  if (grupos[0]?.[0] === 'servidor' && !chave.endsWith(SUFIXO_SC) && acharFinalidade(chave + SUFIXO_SC)) chave += SUFIXO_SC;
  const f = acharFinalidade(chave);
  if (!f) return null;

  const resolver = (s: SituacaoDestino, sit: Situacao | undefined) => {
    const r = laudoNaSituacao(s, laudo, sit);
    return r ? montar(f, s, r) : null;
  };
  /** Todas as opções precisam existir e concordar no PARA/INFO. */
  const unanime = (ds: (Destinatarios | null)[], regra?: Destinatarios['regra']): Destinatarios | null => {
    if (!ds.length || !ds.every(Boolean) || new Set(ds.map(d => `${d!.para}|${d!.info}`)).size !== 1) return null;
    return ds.length > 1 ? { ...ds[0]!, regra: regra ?? 'analogia' } : ds[0];
  };

  // Situação conhecida: o primeiro grupo de candidatas presente na finalidade.
  for (const grupo of grupos) {
    const presentes = grupo
      .map(c => ({ c, s: f.situacoes.find(x => situacoesDoRotulo(x.situacaoInspecionado).includes(c)) }))
      .filter((x): x is { c: Situacao; s: SituacaoDestino } => !!x.s);
    if (!presentes.length) continue;
    if (presentes.length < grupo.length) return null; // alternativa sem linha na tabela: ambíguo
    return unanime(presentes.map(x => resolver(x.s, x.c)));
  }
  // Finalidade com uma só situação: vale para qualquer inspecionado.
  if (f.situacoes.length === 1) {
    const s = f.situacoes[0];
    return resolver(s, grupos[0]?.[0] ?? situacoesDoRotulo(s.situacaoInspecionado)[0]);
  }
  // Várias situações e inspecionado indefinido: só decide se todas levam ao mesmo destino.
  if (grupos.length) return null;
  return unanime(f.situacoes.map(s => resolver(s, situacoesDoRotulo(s.situacaoInspecionado)[0])));
};

/**
 * Busca direta pelas três chaves (como a IA as devolve). Situação/laudo aceitam variações de caixa e acento;
 * laudo que não seja um rótulo exato passa pela mesma correspondência do roteador.
 */
export const destinatariosPorChaves = (finalidadeIS: string, situacaoInspecionado: string, laudo: string): Destinatarios | null => {
  const f = acharFinalidade(finalidadeIS);
  if (!f) return null;
  const s = f.situacoes.find(x => normalizarTexto(x.situacaoInspecionado) === normalizarTexto(situacaoInspecionado));
  if (!s) return null;
  const r = laudoNaSituacao(s, laudo, situacoesDoRotulo(s.situacaoInspecionado)[0]);
  return r ? montar(f, s, r) : null;
};

/** JSON compacto da tabela para o prompt da IA. */
export const tabelaDestinatariosParaPrompt = (): string => JSON.stringify(TABELA_DESTINATARIOS);
