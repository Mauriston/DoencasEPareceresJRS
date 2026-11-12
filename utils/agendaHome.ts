// Ficheiro: utils/agendaHome.ts
// Eventos do dia do card "Agenda de inspeções" da Início (regras puras, testadas):
//  - cada IS agendada é um evento (hora, inspecionado, status);
//  - os concursos aparecem como UM evento por concurso e por turno (manhã/tarde), com o nome do concurso e a
//    quantidade de candidatos, e a mesma altura das demais IS, por mais que o turno dure. Os dias dos concursos
//    (agenda própria dos concursos, sempre no turno da manhã) vêm de `diasConcursos`; IS de concurso cadastradas
//    em Inspeções que não estejam nessa agenda são agrupadas pelo nome do concurso (finalidade) e pelo turno.
import { ehISDeConcurso, finalidadeSemGrupo, nomeCurtoInspecionado } from './calendarioIS';
import { STATUS_IS, dataDeEntrevista, horaDeEntrevista, statusEfetivoIS, type StatusIS, type TomStatus } from './inspecoes';

export interface DiaConcursoAgenda { chave: string; concursoId: string; nome: string; data: string; total: number; encerrado: boolean }
export interface ISAgenda {
  id: string; is: number; inspecionado: string; dataEntrevista?: string; status: StatusIS; situacao?: string;
  dataAbertura: string; finalidade: string; grupoFinalidade?: string; peritoNome?: string; amp?: string;
}

export interface EventoAgenda {
  chave: string;
  tipo: 'is' | 'concurso';
  /** HH:MM de início (concurso da agenda própria: 07:30). */
  hora: string;
  titulo: string;
  detalhe: string;
  tag: { rotulo: string; tom: TomStatus };
  /** Só concursos da agenda própria: abre a planilha do concurso. */
  concursoId?: string;
  /** IS de JRS ou de MPI (marca de cor); concursos não têm. */
  amp?: string;
}

const HORA_CONCURSO = '07:30';
const turnoDe = (hora: string): 'manhã' | 'tarde' => (hora < '12:00' ? 'manhã' : 'tarde');
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

export const eventosDoDia = (dia: string, inspecoes: ISAgenda[], diasConcursos: DiaConcursoAgenda[], hoje: string): EventoAgenda[] => {
  const eventos: EventoAgenda[] = [];
  const concursosDoDia = diasConcursos.filter(d => d.data === dia);
  concursosDoDia.forEach(d => eventos.push({
    chave: `concurso:${d.chave}`, tipo: 'concurso', hora: HORA_CONCURSO, titulo: d.nome,
    detalhe: `${plural(d.total, 'candidato', 'candidatos')} · manhã`,
    tag: d.encerrado ? { rotulo: 'Concluído', tom: 'success' } : { rotulo: 'Concurso', tom: 'navyOutline' },
    concursoId: d.concursoId,
  }));

  const doDia = inspecoes.filter(i => i.dataEntrevista && i.status !== 'cancelada' && dataDeEntrevista(i.dataEntrevista) === dia);
  // IS de concurso: já representadas pela agenda dos concursos quando o dia tem concurso; senão, agrupadas.
  const grupos = new Map<string, { nome: string; hora: string; lista: ISAgenda[] }>();
  doDia.filter(i => ehISDeConcurso(i)).forEach(i => {
    if (concursosDoDia.length) return;
    const hora = horaDeEntrevista(i.dataEntrevista!);
    const nome = finalidadeSemGrupo(i.finalidade, i.grupoFinalidade) || 'Concurso';
    const chave = `${nome}|${turnoDe(hora)}`;
    const g = grupos.get(chave) ?? { nome, hora, lista: [] };
    g.lista.push(i);
    if (hora < g.hora) g.hora = hora;
    grupos.set(chave, g);
  });
  grupos.forEach((g, chave) => eventos.push({
    chave: `grupo:${chave}`, tipo: 'concurso', hora: g.hora, titulo: g.nome,
    detalhe: `${plural(g.lista.length, 'candidato', 'candidatos')} · ${turnoDe(g.hora)}`,
    tag: g.lista.every(i => i.situacao === 'finalizada') ? { rotulo: 'Concluído', tom: 'success' } : { rotulo: 'Concurso', tom: 'navyOutline' },
  }));

  doDia.filter(i => !ehISDeConcurso(i)).forEach(i => {
    const st = STATUS_IS[statusEfetivoIS(i, hoje)];
    eventos.push({
      chave: `is:${i.id}`, tipo: 'is', hora: horaDeEntrevista(i.dataEntrevista!), titulo: nomeCurtoInspecionado(i.inspecionado),
      detalhe: [`IS ${i.is}`, finalidadeSemGrupo(i.finalidade, i.grupoFinalidade), i.peritoNome].filter(Boolean).join(' · '),
      tag: { rotulo: st.rotulo, tom: st.tom }, amp: i.amp,
    });
  });

  return eventos.sort((a, b) => a.hora.localeCompare(b.hora) || (a.tipo === b.tipo ? a.titulo.localeCompare(b.titulo, 'pt-BR') : a.tipo === 'concurso' ? -1 : 1));
};

/** Marcas do dia na grade: IS de JRS, de MPI e concurso (concluído ou não). */
export const marcasDoDia = (dia: string, inspecoes: ISAgenda[], diasConcursos: DiaConcursoAgenda[]) => {
  const doDia = inspecoes.filter(i => i.dataEntrevista && i.status !== 'cancelada' && dataDeEntrevista(i.dataEntrevista) === dia);
  const concursos = diasConcursos.filter(d => d.data === dia);
  const isConcurso = doDia.filter(i => ehISDeConcurso(i));
  const comuns = doDia.filter(i => !ehISDeConcurso(i));
  return {
    jrs: comuns.some(i => i.amp === 'JRS'),
    mpi: comuns.some(i => i.amp !== 'JRS'),
    concurso: concursos.length > 0 || isConcurso.length > 0,
    concursoConcluido: (concursos.length > 0 || isConcurso.length > 0)
      && concursos.every(c => c.encerrado) && isConcurso.every(i => i.situacao === 'finalizada'),
  };
};
