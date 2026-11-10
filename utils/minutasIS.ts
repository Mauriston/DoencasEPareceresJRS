// Ficheiro: utils/minutasIS.ts
// Rascunhos (em campos PARA/INFO/ASSUNTO/texto, e como texto único) das minutas de mensagem ligadas às IS: cancelamento de IS atrasada e comunicação
// de resultado. São pontos de partida editáveis na tela — o texto final é revisado pelo perito.
// A minuta de resultado segue o padrão da página Mensagens (ver utils/minutaMensagemResultado.ts); a de
// cancelamento continua no formato próprio (a página Mensagens não tem modelo de cancelamento).
import { dataBr, diasEmAberto, prazoAtrasoDias } from './inspecoes';
import { camposMensagemResultado, juntarMinuta, type DadosMensagemResultado, type MinutaCampos } from './minutaMensagemResultado';

export { minutaMensagemResultado, contarPreencher, juntarMinuta, separarMinuta, type MinutaCampos } from './minutaMensagemResultado';

interface DadosMinuta {
  is: number;
  finalidade: string;
  grupoFinalidade?: string;
  inspecionado: string;
  dataAbertura: string;
  amp: string;
  /** OM do inspecionado (destinatária da mensagem), quando conhecida. */
  om?: string;
  /** AAAA-MM-DDThh:mm: com entrevista marcada, o cancelamento foi por falta (não por prazo). */
  dataEntrevista?: string;
}

/** Minuta de cancelamento de IS aberta e não agendada além do prazo (7 dias; 60 para Benefícios), em campos. */
export const camposCancelamento = (d: DadosMinuta): MinutaCampos => {
  const prazo = prazoAtrasoDias(d.grupoFinalidade);
  const motivo = d.dataEntrevista
    ? `pelo não comparecimento do inspecionado à entrevista agendada para ${dataBr(d.dataEntrevista.slice(0, 10))}`
    : `por não ter sido agendada no prazo de ${prazo} dias (${diasEmAberto(d.dataAbertura)} dias em aberto)`;
  return {
    de: 'HNRe (JRS)',
    para: d.om || '<OM do inspecionado>',
    assunto: `CANCELAMENTO DE INSPEÇÃO DE SAÚDE Nº ${d.is}`,
    texto: [
      `1. Comunico que a Inspeção de Saúde (IS) nº ${d.is}, finalidade "${d.finalidade}", aberta em ${dataBr(d.dataAbertura)} em favor de ${d.inspecionado}, foi CANCELADA, ${motivo}.`,
      '',
      '2. Caso persista a necessidade da inspeção, solicito nova apresentação do inspecionado a esta Junta Regular de Saúde, com a documentação pertinente.',
    ].join('\n'),
  };
};

/** Minuta de cancelamento como texto único (formato próprio: DE/PARA/ASSUNTO + itens). */
export const minutaCancelamento = (d: DadosMinuta): string => juntarMinuta(camposCancelamento(d));

/** Campos extras aceitos pela minuta de resultado (todos vêm da IS / do cadastro do inspecionado). */
export type DadosMinutaResultado = DadosMinuta & {
  dataLaudo?: string;
  laudo: string;
  tis?: string;
  ds1a?: string;
  peritoNome?: string;
  feminino?: boolean;
  vinculo?: string;
  /** Aceitos por compatibilidade; o modelo da página Mensagens não os usa. */
  dataEntrevista?: string;
  restricoes?: string;
};

/**
 * Comunicação de resultado da IS no padrão da minuta da página Mensagens (PARA/INFO/ASSUNTO/ALFA/BRAVO).
 * Campos que a chamada não informar (ex.: `ds1a`, `peritoNome` em IS de MPI) saem como "[preencher: …]".
 */
export const camposResultado = (d: DadosMinutaResultado): MinutaCampos => camposMensagemResultado(dadosDeResultado(d));
export const minutaResultado = (d: DadosMinutaResultado): string => juntarMinuta(camposResultado(d));

const dadosDeResultado = (d: DadosMinutaResultado): DadosMensagemResultado => ({
  finalidade: d.finalidade, grupoFinalidade: d.grupoFinalidade, inspecionado: d.inspecionado, om: d.om, amp: d.amp, peritoNome: d.peritoNome,
  dataLaudo: d.dataLaudo, laudo: d.laudo, tis: d.tis, ds1a: d.ds1a, feminino: d.feminino, vinculo: d.vinculo,
});

/** Campos da IS (InspecaoRecord) usados pela minuta de resultado. */
export type ISParaMinuta = Pick<DadosMinutaResultado, 'is' | 'finalidade' | 'grupoFinalidade' | 'inspecionado' | 'dataAbertura' | 'amp' | 'dataLaudo' | 'laudo' | 'tis' | 'ds1a' | 'peritoNome' | 'dataEntrevista' | 'restricoes'>;

/** Atalho: minuta de resultado direto do registro da IS (+ OM, sexo e vínculo do cadastro do inspecionado). */
export const camposResultadoDaIS = (is: ISParaMinuta, extras: { om?: string; feminino?: boolean; vinculo?: string } = {}): MinutaCampos =>
  camposResultado({ ...is, ...extras });
export const minutaResultadoDaIS = (is: ISParaMinuta, extras: { om?: string; feminino?: boolean; vinculo?: string } = {}): string =>
  juntarMinuta(camposResultadoDaIS(is, extras));
