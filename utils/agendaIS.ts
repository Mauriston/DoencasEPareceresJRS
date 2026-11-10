// Ficheiro: utils/agendaIS.ts
// Agrupamento da visão Tabela das Inspeções de Saúde no formato "agenda": um grupo por dia da
// entrevista (dias em ordem crescente; dentro do dia, pela hora) e, no topo, o grupo das IS sem
// data de entrevista ("Não agendadas", pela data de abertura). O filtro de período vale só para as
// IS com data de entrevista; as não agendadas passam sempre.
import { dentroDoIntervalo, type Intervalo } from './periodos';

export interface ItemAgendaIS { is: number; dataAbertura: string; dataEntrevista?: string }

/** `data` = "AAAA-MM-DD" do dia; null = grupo "Não agendadas". */
export interface DiaAgendaIS<T> { data: string | null; itens: T[] }

/** A IS entra no período? Sem data de entrevista: sempre. */
export const passaNoPeriodo = (is: { dataEntrevista?: string }, intervalo: Intervalo): boolean =>
  !is.dataEntrevista || dentroDoIntervalo(is.dataEntrevista, intervalo);

export const agruparAgendaIS = <T extends ItemAgendaIS>(lista: T[]): DiaAgendaIS<T>[] => {
  const semData = lista.filter(i => !i.dataEntrevista)
    .sort((a, b) => a.dataAbertura.localeCompare(b.dataAbertura) || a.is - b.is);
  const comData = lista.filter(i => !!i.dataEntrevista)
    .sort((a, b) => a.dataEntrevista!.localeCompare(b.dataEntrevista!) || a.is - b.is);
  const dias: DiaAgendaIS<T>[] = [];
  for (const is of comData) {
    const dia = is.dataEntrevista!.slice(0, 10);
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.data === dia) ultimo.itens.push(is);
    else dias.push({ data: dia, itens: [is] });
  }
  return semData.length ? [{ data: null, itens: semData }, ...dias] : dias;
};
