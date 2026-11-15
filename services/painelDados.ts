// Ficheiro: services/painelDados.ts
// Leituras do Painel (components/painel/), limitadas ao período: as IS abertas a partir de uma data (mais as
// que seguem em curso, de qualquer data), as Perícias Menores com atestado a partir de uma data e os candidatos
// dos concursos em andamento ou com período de agendamento na janela. Leitura única (getDocs), sem listener:
// o Painel mostra "atualizado há N min" e tem o botão Atualizar. Só os campos que o Painel usa saem daqui
// (nada de nome de inspecionado ou NIP nos objetos agregados; das guias, só se existem e quando/como foram entregues).
import { getFirestore, collection, getDocs, query, where, type Timestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import type { InspecaoDoc } from './firestoreInspecoes';
import type { PericiaMenorDoc } from './firestorePericiasMenores';
import { listarCandidatos, listarConcursos } from './firestoreConcursos';
import type { ConcursoPainel, ISPainel, PericiaPainel } from '../utils/painel';
import { paraISO } from '../utils/inspecoes';

const db = getFirestore(app);

const dataDoTimestamp = (t: Timestamp | null | undefined): string => {
  try { return t && typeof t.toDate === 'function' ? paraISO(t.toDate()) : ''; } catch { return ''; }
};

const paraISPainel = (id: string, d: InspecaoDoc): ISPainel => ({
  id,
  dataAbertura: d.dataAbertura || '',
  dataEntrevista: d.dataEntrevista || '',
  dataFinalizacao: d.status === 'tis_assinado' ? (d.dataLaudo || dataDoTimestamp(d.atualizadoEm)) : '',
  status: d.status,
  situacao: d.situacao,
  finalidade: d.finalidade || '',
  grupoFinalidade: d.grupoFinalidade || '',
  peritoUid: d.peritoUid || '',
  peritoNome: d.peritoNome || '',
  amp: d.amp === 'MPI' ? 'MPI' : 'JRS',
  emailFaltaDataEntrevista: d.emailFaltaDataEntrevista || '',
  // Guias de exames e status Realizando Exames (só se lê se há guias e quando/como foram entregues).
  temGuias: d.guiasExames != null,
  guiasEntregues: !!d.guiasEntregues,
  guiasEntreguesEm: d.guiasEntreguesEm || '',
  guiasEntreguesVia: d.guiasEntreguesVia === 'email' ? 'email' : d.guiasEntreguesVia === 'presencial' ? 'presencial' : '',
  emailGuiasEnviado: d.emailGuiasEnviadoEm != null,
});

/**
 * IS abertas desde `inicio` (com 180 dias de folga, para pegar as finalizadas na janela que foram abertas antes)
 * e todas as que ainda estão em curso (atrasadas e etapas em andamento independem da data).
 */
export const lerInspecoesPainel = async (inicio: string): Promise<ISPainel[]> => {
  const folga = new Date(`${inicio}T12:00:00`);
  folga.setDate(folga.getDate() - 180);
  const desde = paraISO(folga);
  const [porData, emCurso] = await Promise.all([
    getDocs(query(collection(db, 'inspecoes'), where('dataAbertura', '>=', desde))),
    getDocs(query(collection(db, 'inspecoes'), where('situacao', 'in', ['aberta', 'andamento']))),
  ]);
  const mapa = new Map<string, ISPainel>();
  [...porData.docs, ...emCurso.docs].forEach(s => mapa.set(s.id, paraISPainel(s.id, s.data() as InspecaoDoc)));
  return [...mapa.values()];
};

export const lerPericiasPainel = async (inicio: string): Promise<PericiaPainel[]> => {
  const snap = await getDocs(query(collection(db, 'periciasMenores'), where('dataAtestado', '>=', inicio)));
  return snap.docs.map(s => {
    const d = s.data() as PericiaMenorDoc;
    return {
      id: s.id, militarId: d.militarId || '', inspecionado: d.militarId ? '' : (d.inspecionado || ''), om: d.om || '', cid: d.cid || '', cidCodigo: d.cidCodigo,
      dispensas: d.dispensas ?? [], dataAtestado: d.dataAtestado || '', dataTermino: d.dataTermino || '', tempoHomologado: Number(d.tempoHomologado) || 0,
      homologacao: !!d.homologacao, peritoUid: d.peritoUid || '', criadoPor: d.criadoPor,
    };
  });
};

/** Concursos em andamento ou cujo período de agendamento cruza [inicio, hoje] (sem período: entram). */
export const lerConcursosPainel = async (inicio: string): Promise<ConcursoPainel[]> => {
  const concursos = (await listarConcursos()).filter(c =>
    c.status === 'em_andamento' || !c.periodoFimISO || c.periodoFimISO >= inicio);
  return Promise.all(concursos.map(async c => ({
    id: c.id, nome: c.nome, status: c.status, totalCandidatos: c.totalCandidatos,
    candidatos: (await listarCandidatos(c.id)).map(x => ({ status: String(x.status || ''), finalizado: !!x.finalizado, dataLaudo: x.dataLaudo || '', dataAgendamento: x.dataAgendamento || '' })),
  })));
};
