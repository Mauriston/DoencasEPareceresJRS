// Ficheiro: services/firestoreConcursos.ts
// Backend do menu Concursos ("Planilhas de Controle") no Firestore (projeto
// jrs-app-web) — substitui o backend Apps Script standalone (CodeConcursos.gs)
// que expunha os mesmos dados a partir da planilha "TEMPLATE CONCURSOS".
//
// Modelo de dados:
//   concursos/{concursoId}
//     candidatos/{matricula}
//     mensagens/{autoId}
//     agendamentos/{AAAA-MM-DD}
//
// Cada concurso agrupa os candidatos pela IS de Ingresso a que se
// apresentaram, o que antes exigia uma planilha "TEMPLATE CONCURSOS"
// separada por concurso — aqui é só mais um documento na mesma coleção.
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc,
  writeBatch, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { app } from './firebaseAuth';
import {
  MAPA_LAUDO_POR_STATUS, candidatoEstaFinalizado, formatarDataSimples, formatarDataMilitar,
  formatarChaveData, parseChaveData, calcularDiasUteis, distribuirCandidatosNasDatas,
  aplicarPontuacao, numeroItemLista, NOMES_DIAS_SEMANA,
  type CandidatoBasico, type CabecalhoMensagem,
} from '../utils/concursosUtils';

const db = getFirestore(app);
const COL_CONCURSOS = 'concursos';

export type ConcursoStatus = 'em_breve' | 'em_andamento' | 'encerrado';

export const STATUS_LABELS: Record<ConcursoStatus, string> = {
  em_breve: 'Em Breve',
  em_andamento: 'Em Andamento',
  encerrado: 'Encerrado',
};

export interface ConcursoRecord {
  id: string;
  nome: string;
  status: ConcursoStatus;
  dataHoraMensagemInicial: string;
  assuntoMensagemInicial: string;
  periodoInicioISO: string;
  periodoFimISO: string;
  totalCandidatos: number;
  criadoEm: string;
}

export type StatusCandidato = '' | 'Pendente' | 'APTO' | 'INAPTO' | 'FALTOU' | 'INSUF DOCUMENTAL' | 'Reagendado';

export interface CandidatoRecord {
  id: string;
  nome: string;
  dataAgendamento: string; // AAAA-MM-DD
  status: StatusCandidato | string;
  observacoes: string;
  finalizado: boolean;
  recurso: boolean;
  dataLaudo: string; // DD/MM/AAAA
  laudo: string;
  numTIS: string;
  termoRecursoUrl: string;
}

export interface MensagemRecord {
  id: string;
  dataHora: string;
  fileUrl: string;
  proposito: string;
  sender: string;
  recipient: string;
  info: string;
  subject: string;
  texto: string;
}

export interface DataAgendamentoInfo {
  data: string; // AAAA-MM-DD
  dataFormatada: string;
  diaSemana: string;
  quantidadeAgendados: number;
}

const concursoRef = (concursoId: string) => doc(db, COL_CONCURSOS, concursoId);
const candidatosCol = (concursoId: string) => collection(db, COL_CONCURSOS, concursoId, 'candidatos');
const candidatoRef = (concursoId: string, id: string) => doc(db, COL_CONCURSOS, concursoId, 'candidatos', id);
const mensagensCol = (concursoId: string) => collection(db, COL_CONCURSOS, concursoId, 'mensagens');
const agendamentosCol = (concursoId: string) => collection(db, COL_CONCURSOS, concursoId, 'agendamentos');

const toConcursoRecord = (id: string, data: any): ConcursoRecord => ({
  id,
  nome: data.nome || '',
  status: data.status || 'em_breve',
  dataHoraMensagemInicial: data.dataHoraMensagemInicial || '',
  assuntoMensagemInicial: data.assuntoMensagemInicial || '',
  periodoInicioISO: data.periodoInicioISO || '',
  periodoFimISO: data.periodoFimISO || '',
  totalCandidatos: data.totalCandidatos || 0,
  criadoEm: data.criadoEm instanceof Timestamp ? data.criadoEm.toDate().toISOString() : (data.criadoEm || ''),
});

const toCandidatoRecord = (id: string, data: any): CandidatoRecord => ({
  id,
  nome: data.nome || '',
  dataAgendamento: data.dataAgendamento || '',
  status: data.status || '',
  observacoes: data.observacoes || '',
  finalizado: !!data.finalizado,
  recurso: !!data.recurso,
  dataLaudo: data.dataLaudo || '',
  laudo: data.laudo || '',
  numTIS: data.numTIS || '',
  termoRecursoUrl: data.termoRecursoUrl || '',
});

export const listarConcursos = async (): Promise<ConcursoRecord[]> => {
  const snap = await getDocs(collection(db, COL_CONCURSOS));
  return snap.docs
    .map(d => toConcursoRecord(d.id, d.data()))
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
};

export const getConcurso = async (concursoId: string): Promise<ConcursoRecord | null> => {
  const snap = await getDoc(concursoRef(concursoId));
  return snap.exists() ? toConcursoRecord(snap.id, snap.data()) : null;
};

export const listarCandidatos = async (concursoId: string): Promise<CandidatoRecord[]> => {
  const snap = await getDocs(candidatosCol(concursoId));
  return snap.docs.map(d => toCandidatoRecord(d.id, d.data()));
};

/**
 * Cria um novo concurso a partir dos dados já extraídos da mensagem
 * administrativa (PDF): grava o concurso, os candidatos, o registro da
 * mensagem e o calendário de dias úteis do período informado. Status
 * inicial sempre "em_breve" — cabe ao Admin abrir o concurso depois
 * (ver `abrirConcurso`).
 */
export const criarConcursoDaMensagem = async (params: {
  nome: string;
  cabecalho: CabecalhoMensagem;
  candidatos: CandidatoBasico[];
  periodo: { inicio: Date; fim: Date } | null;
  fileUrl: string;
}): Promise<{ concursoId: string; diasUteis: Date[] }> => {
  const { nome, cabecalho, candidatos, periodo, fileUrl } = params;
  const diasUteis = periodo ? calcularDiasUteis(periodo.inicio, periodo.fim) : [];

  const novoConcursoRef = doc(collection(db, COL_CONCURSOS));
  const concursoId = novoConcursoRef.id;

  const operacoes: (() => Promise<any>)[] = [];
  let batch = writeBatch(db);
  let contador = 0;
  const flush = async () => {
    if (contador > 0) {
      await batch.commit();
      batch = writeBatch(db);
      contador = 0;
    }
  };
  const add = (fn: (b: typeof batch) => void) => {
    fn(batch);
    contador++;
    if (contador >= 400) operacoes.push(flush);
  };

  add(b => b.set(novoConcursoRef, {
    nome,
    status: 'em_breve',
    dataHoraMensagemInicial: cabecalho.dataHora,
    assuntoMensagemInicial: cabecalho.subject,
    periodoInicioISO: periodo ? formatarChaveData(periodo.inicio) : '',
    periodoFimISO: periodo ? formatarChaveData(periodo.fim) : '',
    totalCandidatos: candidatos.length,
    criadoEm: serverTimestamp(),
  }));

  candidatos.forEach(c => {
    add(b => b.set(candidatoRef(concursoId, c.id), {
      nome: c.nome,
      dataAgendamento: '',
      status: '',
      observacoes: '',
      finalizado: false,
      recurso: false,
      dataLaudo: '',
      laudo: '',
      numTIS: '',
      termoRecursoUrl: '',
    }));
  });

  add(b => b.set(doc(mensagensCol(concursoId)), {
    dataHora: cabecalho.dataHora,
    fileUrl,
    proposito: cabecalho.purpose,
    sender: cabecalho.sender,
    recipient: cabecalho.recipient,
    info: cabecalho.info,
    subject: cabecalho.subject,
    texto: cabecalho.texto,
  }));

  diasUteis.forEach(d => {
    const chave = formatarChaveData(d);
    add(b => b.set(doc(agendamentosCol(concursoId), chave), {
      diaSemana: NOMES_DIAS_SEMANA[d.getDay()],
    }));
  });

  for (const op of operacoes) await op();
  await flush();

  return { concursoId, diasUteis };
};

export const criarCandidato = async (concursoId: string, id: string, nome: string): Promise<CandidatoRecord> => {
  const existente = await getDoc(candidatoRef(concursoId, id));
  if (existente.exists()) throw new Error(`Já existe um candidato com a matrícula "${id}" neste concurso.`);

  const dados = {
    nome, dataAgendamento: '', status: '', observacoes: '', finalizado: false,
    recurso: false, dataLaudo: '', laudo: '', numTIS: '', termoRecursoUrl: '',
  };
  await setDoc(candidatoRef(concursoId, id), dados);
  await updateDoc(concursoRef(concursoId), { totalCandidatos: (await listarCandidatos(concursoId)).length });
  return toCandidatoRecord(id, dados);
};

export const atualizarCandidato = async (
  concursoId: string,
  id: string,
  patch: { status?: string; observacoes?: string; numTIS?: string }
): Promise<CandidatoRecord> => {
  const snap = await getDoc(candidatoRef(concursoId, id));
  if (!snap.exists()) throw new Error(`Candidato com matrícula "${id}" não encontrado.`);
  const atual = toCandidatoRecord(id, snap.data());

  const proximo: Partial<CandidatoRecord> = {};

  if (patch.observacoes !== undefined) proximo.observacoes = patch.observacoes || '';
  if (patch.numTIS !== undefined) proximo.numTIS = patch.numTIS || '';

  if (patch.status !== undefined) {
    const novoValor = String(patch.status || '').trim().toUpperCase();
    if (!novoValor) {
      proximo.status = '';
      proximo.dataLaudo = '';
      proximo.laudo = '';
    } else if (novoValor === 'PENDENTE') {
      proximo.status = 'Pendente';
      proximo.dataLaudo = '';
      proximo.laudo = '';
    } else {
      const laudoTexto = MAPA_LAUDO_POR_STATUS[novoValor];
      if (!laudoTexto) throw new Error(`Status inválido: "${patch.status}".`);
      proximo.status = novoValor;
      proximo.dataLaudo = formatarDataSimples(new Date());
      proximo.laudo = laudoTexto;
    }
  }

  const statusFinal = proximo.status !== undefined ? proximo.status : atual.status;
  const numTisFinal = proximo.numTIS !== undefined ? proximo.numTIS : atual.numTIS;
  proximo.finalizado = candidatoEstaFinalizado(statusFinal, numTisFinal);

  await updateDoc(candidatoRef(concursoId, id), proximo as any);
  return { ...atual, ...proximo };
};

export const reagendarCandidato = async (concursoId: string, id: string, dataISO: string): Promise<CandidatoRecord> => {
  const snap = await getDoc(candidatoRef(concursoId, id));
  if (!snap.exists()) throw new Error(`Candidato com matrícula "${id}" não encontrado.`);
  const atual = toCandidatoRecord(id, snap.data());

  const proximo = {
    dataAgendamento: dataISO,
    status: 'Reagendado',
    finalizado: false,
    dataLaudo: '',
    laudo: '',
  };
  await updateDoc(candidatoRef(concursoId, id), proximo);
  return { ...atual, ...proximo };
};

export const listarDatasAgendamento = async (concursoId: string): Promise<DataAgendamentoInfo[]> => {
  const [agendamentosSnap, candidatos] = await Promise.all([
    getDocs(agendamentosCol(concursoId)),
    listarCandidatos(concursoId),
  ]);

  const contagem: Record<string, number> = {};
  candidatos.forEach(c => {
    if (c.dataAgendamento) contagem[c.dataAgendamento] = (contagem[c.dataAgendamento] || 0) + 1;
  });

  return agendamentosSnap.docs
    .map(d => ({
      data: d.id,
      dataFormatada: formatarDataSimples(parseChaveData(d.id)),
      diaSemana: (d.data() as any).diaSemana || '',
      quantidadeAgendados: contagem[d.id] || 0,
    }))
    .sort((a, b) => a.data.localeCompare(b.data));
};

export const obterContextoAgendamento = async (concursoId: string): Promise<{
  totalPendentes: number; periodoInicio: string; periodoFim: string; diasUteisDisponiveis: number;
}> => {
  const [concurso, candidatos, datas] = await Promise.all([
    getConcurso(concursoId),
    listarCandidatos(concursoId),
    listarDatasAgendamento(concursoId),
  ]);
  const pendentes = candidatos.filter(c => !c.dataAgendamento);
  return {
    totalPendentes: pendentes.length,
    periodoInicio: concurso?.periodoInicioISO ? formatarDataSimples(parseChaveData(concurso.periodoInicioISO)) : '',
    periodoFim: concurso?.periodoFimISO ? formatarDataSimples(parseChaveData(concurso.periodoFimISO)) : '',
    diasUteisDisponiveis: datas.length,
  };
};

const extrairNomeConcursoDoAssunto = (subject: string): string => {
  const m = subject.match(/([A-ZÇ]{2,10}\/\d{4})/);
  return m ? m[1] : subject;
};

const gerarTextoMinutaAgendamento = (
  nomeConcurso: string,
  dataHoraInicial: string,
  agendamento: { data: string; diaSemana: string; candidatos: CandidatoBasico[] }[]
): string => {
  const linhas: string[] = [];
  linhas.push(`${dataHoraInicial}, PTC:`);
  linhas.push('');
  linhas.push(`ALFA - As IS de Ingresso dos Candidatos a ${nomeConcurso} estão agendadas conforme:`);
  linhas.push('');

  agendamento.forEach((item, indice) => {
    const marcador = numeroItemLista(indice + 1);
    linhas.push(`${marcador} - ${formatarDataMilitar(parseChaveData(item.data))} às 7h30:`);
    const itensCandidatos = item.candidatos.map(c => `- ${c.id} ${c.nome}`);
    linhas.push(aplicarPontuacao(itensCandidatos, false).join('\n'));
    linhas.push('');
  });

  linhas.push('BRAVO - CFM o item 3.1.2 da DGPM-406 (9ª Revisão), Os candidatos que não comparecerem das respectivas datas de agendamentos de suas IS ou não apresentarem a totalidade dos exames previstos no edital do certame da data agendada, terão suas IS concluídas e assinadas tempestivamente com laudos, respectivamente, de "faltou" ou "Insuficiência Documental Médica" BT');

  return linhas.join('\n');
};

/**
 * Distribui os candidatos ainda sem agendamento pelas datas selecionadas
 * pelo Admin (checkboxes na UI, não mais um filtro fixo de dias da
 * semana), grava a data de cada um e devolve a minuta pronta.
 */
export const confirmarAgendamento = async (
  concursoId: string,
  datasSelecionadasISO: string[],
  quantidadePorDia: number
): Promise<{ minuta: string }> => {
  const [concurso, candidatos, mensagensSnap] = await Promise.all([
    getConcurso(concursoId),
    listarCandidatos(concursoId),
    getDocs(mensagensCol(concursoId)),
  ]);
  if (!concurso) throw new Error('Concurso não encontrado.');

  const pendentes = candidatos.filter(c => !c.dataAgendamento);
  const datasOrdenadas = [...datasSelecionadasISO].sort();
  const datasComDiaSemana = datasOrdenadas.map(iso => ({ data: iso, diaSemana: NOMES_DIAS_SEMANA[parseChaveData(iso).getDay()] }));

  const agendamento = distribuirCandidatosNasDatas(pendentes, datasComDiaSemana, quantidadePorDia);
  if (agendamento.length === 0) throw new Error('Nenhum agendamento para confirmar. Verifique as datas selecionadas.');

  const batch = writeBatch(db);
  agendamento.forEach(item => {
    item.candidatos.forEach(c => {
      batch.update(candidatoRef(concursoId, c.id), { dataAgendamento: item.data });
    });
  });
  await batch.commit();

  const mensagemInicial = mensagensSnap.docs.find(d => (d.data() as any).proposito === 'Apresentação e IS');
  const dataHoraInicial = mensagemInicial ? (mensagemInicial.data() as any).dataHora : concurso.dataHoraMensagemInicial || 'R-000000Z/MMM/AAAA';
  const nomeConcurso = extrairNomeConcursoDoAssunto(concurso.assuntoMensagemInicial || concurso.nome);

  return { minuta: gerarTextoMinutaAgendamento(nomeConcurso, dataHoraInicial, agendamento) };
};

export const gerarMinutaResultados = async (
  concursoId: string
): Promise<{ bloqueado: true; pendentes: { id: string; nome: string }[] } | { bloqueado: false; minuta: string }> => {
  const [concurso, candidatos, mensagensSnap] = await Promise.all([
    getConcurso(concursoId),
    listarCandidatos(concursoId),
    getDocs(mensagensCol(concursoId)),
  ]);
  if (!concurso) throw new Error('Concurso não encontrado.');

  const pendentes = candidatos.filter(c => !c.finalizado);
  if (pendentes.length > 0) {
    return { bloqueado: true, pendentes: pendentes.map(c => ({ id: c.id, nome: c.nome })) };
  }

  const mensagemInicial = mensagensSnap.docs.find(d => (d.data() as any).proposito === 'Apresentação e IS');
  const dataHoraInicial = mensagemInicial ? (mensagemInicial.data() as any).dataHora : concurso.dataHoraMensagemInicial || 'R-000000Z/MMM/AAAA';
  const nomeConcurso = extrairNomeConcursoDoAssunto(concurso.assuntoMensagemInicial || concurso.nome);

  const aptos: string[] = [], inaptos: string[] = [], faltosos: string[] = [], idm: string[] = [], recursos: string[] = [];
  candidatos.forEach(c => {
    const item = `- ${c.id}  ${c.nome}`;
    const status = String(c.status).trim().toUpperCase();
    if (status === 'APTO') aptos.push(item);
    else if (status === 'INAPTO') inaptos.push(item);
    else if (status === 'FALTOU') faltosos.push(item);
    else if (status === 'INSUF DOCUMENTAL') idm.push(item);
    if (c.recurso) recursos.push(`- Em ${formatarDataMilitar(c.dataLaudo ? new Date(c.dataLaudo.split('/').reverse().join('-')) : new Date())}: ${c.id}  ${c.nome}`);
  });

  const aptosF = aplicarPontuacao(aptos, false);
  const inaptosF = aplicarPontuacao(inaptos, false);
  const faltososF = aplicarPontuacao(faltosos, false);
  const idmF = aplicarPontuacao(idm, false);
  const recursosF = aplicarPontuacao(recursos, true);

  const texto: string[] = [];
  texto.push(`${dataHoraInicial}, PTC que JRS/HNRe concluiu em ${formatarDataMilitar(new Date())} as IS dos ${candidatos.length} candidatos APS FIM Ingresso no ${nomeConcurso} CFM os resultados abaixo relacionados:`);
  texto.push('');
  texto.push(`ALFA - Candidatos considerados "Aptos para Ingresso" (total: ${aptosF.length}):`);
  if (aptosF.length) texto.push(aptosF.join('\n'));
  texto.push('');
  texto.push(`BRAVO - Candidatos considerados "Inaptos para Ingresso" (total: ${inaptosF.length}):`);
  if (inaptosF.length) texto.push(inaptosF.join('\n'));
  texto.push('');
  texto.push(`CHARLIE - Candidatos com IS não concluídas por não comparecimento (total: ${faltososF.length}):`);
  if (faltososF.length) texto.push(faltososF.join('\n'));
  texto.push('');
  texto.push(`DELTA - Candidatos com IS não concluídas por Insuficiência Documental Médica (total: ${idmF.length}):`);
  if (idmF.length) texto.push(idmF.join('\n'));
  texto.push('');
  texto.push(`ECHO - Candidatos que interpuseram recurso junto à JSD/COM3ºDN através da assinatura do Termo de Reconhecimento de Recurso (total: ${recursosF.length}):`);
  texto.push(recursosF.length ? `${recursosF.join('\n')} BT` : '(total: 0) BT');

  return { bloqueado: false, minuta: texto.join('\n') };
};

/** Abre o concurso (Em Breve → Em Andamento). Exclusivo do Admin (UI). */
export const abrirConcurso = (concursoId: string) => updateDoc(concursoRef(concursoId), { status: 'em_andamento' as ConcursoStatus });

/** Encerra o concurso, só quando todos os candidatos estão finalizados. Exclusivo do Admin (UI). */
export const encerrarConcurso = async (concursoId: string) => {
  const candidatos = await listarCandidatos(concursoId);
  if (candidatos.some(c => !c.finalizado)) {
    throw new Error('Ainda há candidatos não finalizados. Encerre apenas quando todos estiverem finalizados.');
  }
  await updateDoc(concursoRef(concursoId), { status: 'encerrado' as ConcursoStatus });
};

export const salvarTermoRecurso = (concursoId: string, candidatoId: string, url: string) =>
  updateDoc(candidatoRef(concursoId, candidatoId), { recurso: true, termoRecursoUrl: url });
