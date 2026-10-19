// Ficheiro: utils/minutasIS.ts
// Rascunhos (texto) das minutas de mensagem ligadas às IS: cancelamento de IS atrasada e comunicação
// de resultado. São pontos de partida editáveis na tela — o texto final é revisado pelo perito.
import { dataBr, diasEmAberto, prazoAtrasoDias, dataHoraBr } from './inspecoes';

interface DadosMinuta {
  is: number;
  finalidade: string;
  grupoFinalidade?: string;
  inspecionado: string;
  dataAbertura: string;
  amp: string;
  /** OM do inspecionado (destinatária da mensagem), quando conhecida. */
  om?: string;
}

const cabecalho = (d: DadosMinuta, assunto: string) => [
  'DE: HNRe (JRS)',
  `PARA: ${d.om || '<OM do inspecionado>'}`,
  `ASSUNTO: ${assunto}`,
  '',
].join('\n');

/** Minuta de cancelamento de IS aberta e não agendada além do prazo (7 dias; 60 para Benefícios). */
export const minutaCancelamento = (d: DadosMinuta): string => {
  const prazo = prazoAtrasoDias(d.grupoFinalidade);
  return [
    cabecalho(d, `CANCELAMENTO DE INSPEÇÃO DE SAÚDE Nº ${d.is}`),
    `1. Comunico que a Inspeção de Saúde (IS) nº ${d.is}, finalidade "${d.finalidade}", aberta em ${dataBr(d.dataAbertura)} em favor de ${d.inspecionado}, foi CANCELADA, por não ter sido agendada no prazo de ${prazo} dias (${diasEmAberto(d.dataAbertura)} dias em aberto).`,
    '',
    '2. Caso persista a necessidade da inspeção, solicito nova apresentação do inspecionado a esta Junta Regular de Saúde, com a documentação pertinente.',
  ].join('\n');
};

/** Comunicação de resultado da IS (sem diagnóstico — DGPM-406). */
export const minutaResultado = (d: DadosMinuta & { dataEntrevista?: string; dataLaudo?: string; laudo: string; restricoes?: string; tis?: string }): string => [
  cabecalho(d, `RESULTADO DE INSPEÇÃO DE SAÚDE Nº ${d.is}`),
  `1. Comunico o resultado da IS nº ${d.is}, finalidade "${d.finalidade}", de ${d.inspecionado}${d.dataEntrevista ? `, realizada em ${dataHoraBr(d.dataEntrevista)}` : ''}${d.tis ? `, TIS nº ${d.tis}` : ''}:`,
  '',
  `LAUDO${d.dataLaudo ? ` (${dataBr(d.dataLaudo)})` : ''}: ${d.laudo || '<laudo>'}`,
  d.restricoes ? `RESTRIÇÕES: ${d.restricoes}` : '',
].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
