// Ficheiro: utils/importacaoIS.ts
// "IS por foto": regras puras que convertem o que a IA leu nos prints do SINAIS (services/sinaisIA.ts)
// numa IS a criar ou atualizar — várias fotos, de uma ou mais IS, em qualquer ordem (agrupadas pelo nº).
//  - Tela da IS ("Dados da Inspeção" + "Dados do Inspecionado"): Nº da IS, Junta (JRS/HNRE → JRS;
//    MPI/… → MPI), Data de Criação (abertura) e Data de Agendamento (entrevista). Só com ela a IS
//    fica Aberta ou Agendada.
//  - Conclusão (laudos e restrições associadas): com ela valem também o Código DS-1A, a Data do Laudo e
//    o Num. TIS da tela da IS, e o status sai do Laudo, do Nº do TIS e do DS-1A (Votação pendente,
//    Assinaturas pendentes ou TIS assinado). Só a conclusão: atualiza a IS já cadastrada com aquele nº.
// Testadas em utils/__tests__/importacaoIS.test.ts.
import { normalizarBusca, type GrupoFinalidadeIS } from './corposQuadros';
import { dataCivilISO, normalizarNip } from './dados';
import { GRUPO_VERIFICACOES, statusAoAgendar, type StatusIS } from './inspecoes';
import { juntarRestricoes, STATUS_ENCAMINHAMENTO } from './conclusaoIS';
import type { DadosSinais } from './inspecionadoSinais';

export type AmpImportacao = 'JRS' | 'MPI';

/** Foto 1: "Dados da Inspeção" (texto como aparece) + "Dados do Inspecionado". */
export interface DadosISSinais extends DadosSinais {
  numInspecao?: string;
  junta?: string;
  finalidadeTis?: string;
  dataCriacao?: string;
  dataAgendamento?: string;
  ds1a?: string;
  dataLaudo?: string;
  numTis?: string;
}

/** Foto 2: cabeçalho, laudos e restrições associadas. */
export interface ConclusaoSinais {
  numInspecao?: string;
  nip?: string;
  finalidade?: string;
  laudos?: { resultado?: string; finalidade?: string; laudo?: string }[];
  restricoes?: string[];
  /** Data do campo "Laudo" no rodapé da tela da conclusão. */
  dataLaudo?: string;
}

const chave = (t: string | undefined): string => normalizarBusca(String(t || '')).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** "JRS/HNRE" → JRS; "MPI/CASSUNDÉ" → MPI; outro texto → ''. */
export const ampDaJunta = (junta: string | undefined): AmpImportacao | '' => {
  const j = chave(junta);
  if (/\bmpi\b/.test(j)) return 'MPI';
  if (/\bjrs\b/.test(j)) return 'JRS';
  return '';
};

/** Data do SINAIS (AAAA-MM-DD ou DD/MM/AAAA) → AAAA-MM-DD; '-' ou ilegível → ''. */
export const dataDoSinais = (texto: string | undefined): string => {
  const achada = String(texto || '').match(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/);
  return achada ? dataCivilISO(achada[0]) || '' : '';
};

/** Nº da IS: só dígitos, sem zeros à esquerda. */
export const numeroDaIs = (texto: string | undefined): string => String(texto || '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');

/**
 * Finalidade do app (public/finalidadesIS.json) que corresponde ao texto do SINAIS: igual, ou a mais longa
 * cujo nome inicia o texto ("VERIFICAÇÃO DE DEFICIÊNCIA FUNCIONAL - MILITAR" → "Verificação de Deficiência
 * Funcional"). Null se nenhuma servir.
 */
export const acharFinalidade = (texto: string | undefined, grupos: GrupoFinalidadeIS[]): { finalidade: string; grupo: string; amp: string } | null => {
  const alvo = chave(texto);
  if (!alvo) return null;
  let melhor: { finalidade: string; grupo: string; amp: string; tam: number } | null = null;
  for (const g of grupos) {
    for (const f of g.finalidades) {
      const k = chave(f.nome);
      if (!k) continue;
      if (k === alvo) return { finalidade: f.nome, grupo: g.grupo, amp: f.amp };
      if ((alvo.startsWith(`${k} `)) && (!melhor || k.length > melhor.tam)) melhor = { finalidade: f.nome, grupo: g.grupo, amp: f.amp, tam: k.length };
    }
  }
  return melhor ? { finalidade: melhor.finalidade, grupo: melhor.grupo, amp: melhor.amp } : null;
};

/** Laudo(s) da foto 2 num só texto (vários laudos separados por " / "). */
export const laudoDaConclusao = (c: ConclusaoSinais | undefined): string =>
  Array.from(new Set((c?.laudos ?? []).map(l => String(l.laudo || '').replace(/\s+/g, ' ').trim()).filter(Boolean))).join(' / ');

/** Restrições da foto 2 (linhas vazias saem), com a grafia da lista do app quando houver a mesma restrição. */
export const restricoesDaConclusao = (c: ConclusaoSinais | undefined, opcoes: string[] = []): string => {
  const porChave = new Map(opcoes.map(o => [chave(o), o]));
  return juntarRestricoes((c?.restricoes ?? []).map(r => String(r || '').replace(/\s+/g, ' ').trim()).filter(Boolean).map(r => porChave.get(chave(r)) ?? r));
};

/** Status pela conclusão (foto 2): Laudo → Votação pendente; + Nº do TIS → Assinaturas pendentes; + DS-1A → TIS assinado. */
export const statusDaConclusao = (c: { laudo: string; tis: string; ds1a: string }, statusAtual?: StatusIS): StatusIS => {
  if (c.laudo && c.tis && c.ds1a) return 'tis_assinado';
  if (c.laudo && c.tis) return 'assinaturas_pendentes';
  // Encaminhada à Auditoria/JSD (ou restituída) antes do TIS: o status do encaminhamento continua valendo.
  if (statusAtual && STATUS_ENCAMINHAMENTO.includes(statusAtual)) return statusAtual;
  return 'votacao_pendente';
};

/** Status só com a foto 1: Aberta ou Agendada — ou, numa IS já cadastrada, o que `statusAoAgendar` mandar. */
export const statusDosDados = (dataEntrevista: string, atual?: { status: StatusIS; dataEntrevista?: string }): StatusIS => {
  if (!atual) return dataEntrevista ? 'agendada' : 'aberta';
  if (!dataEntrevista) return atual.status;
  // Mesma data já gravada (com outra hora): não é reagendamento.
  if (atual.dataEntrevista && atual.dataEntrevista.slice(0, 10) === dataEntrevista.slice(0, 10)) return atual.status;
  return statusAoAgendar(atual, dataEntrevista);
};

/** O que as fotos dizem da IS (antes de o usuário conferir). */
export interface PropostaImportacao {
  numero: string;
  nip: string;
  amp: AmpImportacao | '';
  finalidade: string;
  grupoFinalidade: string;
  /** Texto da finalidade lido (quando não corresponde a nenhuma finalidade do app). */
  finalidadeLida: string;
  dataAbertura: string;
  /** AAAA-MM-DD (o SINAIS não mostra a hora). */
  dataAgendamento: string;
  temDados: boolean;
  temConclusao: boolean;
  laudo: string;
  dataLaudo: string;
  restricoes: string;
  tis: string;
  ds1a: string;
  avisos: string[];
}

/** O que já está gravado da IS (atualização). */
export interface ISCadastrada { inspecionadoId: string; finalidade: string; dataAbertura: string }

/**
 * Junta as leituras de uma IS numa proposta; `erro` quando não há como seguir (sem nº, fotos de IS
 * diferentes…). Só a foto da conclusão: a IS precisa já estar cadastrada (é atualizada com o laudo).
 */
export const proporImportacao = (
  d: DadosISSinais | undefined, c: ConclusaoSinais | undefined, grupos: GrupoFinalidadeIS[], opcoesRestricoes: string[] = [],
  atual?: ISCadastrada | null,
): { proposta: PropostaImportacao | null; erro: string } => {
  const numero = numeroDaIs(d?.numInspecao) || numeroDaIs(c?.numInspecao);
  if (!numero) return { proposta: null, erro: 'Não foi possível ler o nº da IS.' };
  if (!d && !c) return { proposta: null, erro: `IS ${numero}: nenhuma foto lida.` };
  if (!d && !atual) return { proposta: null, erro: `IS ${numero} não cadastrada: envie também a foto da tela da IS.` };
  const nip = normalizarNip(d?.nip || '') || normalizarNip(c?.nip || '');
  if (d && c) {
    const num2 = numeroDaIs(c.numInspecao);
    if (num2 && num2 !== numero) return { proposta: null, erro: `As fotos são de IS diferentes (${numero} e ${num2}).` };
    const nip1 = normalizarNip(d.nip || '');
    const nip2 = normalizarNip(c.nip || '');
    if (nip1 && nip2 && nip2 !== nip1) return { proposta: null, erro: `IS ${numero}: as fotos são de inspecionados diferentes (NIP não confere).` };
  }
  if (atual && nip && atual.inspecionadoId && atual.inspecionadoId !== nip) return { proposta: null, erro: `IS ${numero}: o NIP da foto não confere com o da IS cadastrada.` };
  const avisos: string[] = [];

  const achada = acharFinalidade(d?.finalidadeTis, grupos) ?? acharFinalidade(c?.finalidade, grupos) ?? acharFinalidade(c?.laudos?.[0]?.finalidade, grupos)
    ?? (atual ? acharFinalidade(atual.finalidade, grupos) : null);
  const finalidadeLida = (d?.finalidadeTis || c?.finalidade || '').trim();
  if (!achada) avisos.push(finalidadeLida ? `Finalidade "${finalidadeLida}" não identificada: escolha na lista.` : 'Finalidade não lida: escolha na lista.');
  const ampJunta = ampDaJunta(d?.junta);
  const amp: AmpImportacao | '' = ampJunta || (achada ? (/mpi/i.test(achada.amp) ? 'MPI' : 'JRS') : '');

  const dataAbertura = dataDoSinais(d?.dataCriacao) || atual?.dataAbertura || '';
  if (!dataAbertura) avisos.push('Data de Criação não lida: informe a data de abertura.');
  const dataAgendamento = dataDoSinais(d?.dataAgendamento);

  // DS-1A, Data do Laudo e Num. TIS (da tela da IS) só valem com a foto da conclusão.
  let laudo = '', dataLaudo = '', restricoes = '', tis = '', ds1a = '';
  if (c) {
    laudo = laudoDaConclusao(c);
    if (!laudo) avisos.push('Laudo não lido na foto da conclusão.');
    else dataLaudo = dataDoSinais(d?.dataLaudo) || dataDoSinais(c.dataLaudo);
    if (laudo && d) {
      tis = String(d.numTis || '').replace(/\s+/g, '').replace(/^-$/, '');
      ds1a = String(d.ds1a || '').replace(/\s+/g, '').replace(/^-$/, '').toUpperCase();
      if (ds1a && !tis) { avisos.push('Código DS-1A sem Num. TIS: o DS-1A foi ignorado.'); ds1a = ''; }
    }
    if (achada?.grupo === GRUPO_VERIFICACOES) restricoes = restricoesDaConclusao(c, opcoesRestricoes);
  }

  return {
    proposta: {
      numero, nip, amp, finalidade: achada?.finalidade ?? '', grupoFinalidade: achada?.grupo ?? '', finalidadeLida,
      dataAbertura, dataAgendamento, temDados: !!d, temConclusao: !!c, laudo, dataLaudo, restricoes, tis, ds1a, avisos,
    },
    erro: '',
  };
};

// ---------------------------------------------------------------- Várias fotos, várias IS

/** Leitura de um print qualquer do SINAIS: a IA diz de que tela é e devolve os campos daquela tela. */
export interface LeituraPrint extends DadosISSinais {
  /** "is" (tela da IS), "conclusao" (laudos/restrições) ou outra coisa. */
  tipo?: string;
  /** "Tipo" do inspecionado na tela da IS (Titular, Dependente…) — vira `tipo` em `dadosDaLeitura`. */
  tipoInspecionado?: string;
  finalidade?: string;
  laudos?: ConclusaoSinais['laudos'];
  restricoes?: string[];
}

export type TipoPrint = 'is' | 'conclusao' | '';

export const tipoDoPrint = (l: LeituraPrint): TipoPrint => {
  const t = chave(l.tipo);
  if (/conclus|laudo|resultado/.test(t)) return 'conclusao';
  if (/\bis\b|inspec|dados/.test(t)) return 'is';
  if ((l.laudos?.length ?? 0) > 0) return 'conclusao';
  if (l.junta || l.dataCriacao || l.finalidadeTis) return 'is';
  return '';
};

export const conclusaoDaLeitura = (l: LeituraPrint): ConclusaoSinais => ({
  numInspecao: l.numInspecao, nip: l.nip, finalidade: l.finalidade, laudos: l.laudos ?? [], restricoes: l.restricoes ?? [], dataLaudo: l.dataLaudo,
});

/** Campos da tela da IS (com o `tipo` do inspecionado, como o cadastro espera). */
export const dadosDaLeitura = (l: LeituraPrint): DadosISSinais => {
  const { tipo: _tela, tipoInspecionado, finalidade: _f, laudos: _l, restricoes: _r, ...resto } = l;
  return { ...resto, ...(tipoInspecionado ? { tipo: tipoInspecionado } : {}) };
};

export interface GrupoPrints<T> {
  numero: string;
  dados?: { leitura: DadosISSinais; origem: T };
  conclusao?: { leitura: ConclusaoSinais; origem: T };
  /** Fotos repetidas da mesma tela (só a primeira vale). */
  repetidas: T[];
}

/** Agrupa as leituras pelo nº da IS, na ordem em que aparecem; sem nº ou sem tela reconhecida, à parte. */
export const agruparPrints = <T>(lidos: { leitura: LeituraPrint; origem: T }[]): { grupos: GrupoPrints<T>[]; naoReconhecidas: T[] } => {
  const grupos = new Map<string, GrupoPrints<T>>();
  const naoReconhecidas: T[] = [];
  for (const { leitura, origem } of lidos) {
    const tipo = tipoDoPrint(leitura);
    const numero = numeroDaIs(leitura.numInspecao);
    if (!tipo || !numero) { naoReconhecidas.push(origem); continue; }
    const g = grupos.get(numero) ?? { numero, repetidas: [] };
    if (tipo === 'is') { if (g.dados) g.repetidas.push(origem); else g.dados = { leitura: dadosDaLeitura(leitura), origem }; }
    else if (g.conclusao) g.repetidas.push(origem);
    else g.conclusao = { leitura: conclusaoDaLeitura(leitura), origem };
    grupos.set(numero, g);
  }
  return { grupos: [...grupos.values()], naoReconhecidas };
};
