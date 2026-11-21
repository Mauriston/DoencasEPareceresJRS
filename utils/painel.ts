// Ficheiro: utils/painel.ts
// Regras puras (sem Firebase) do Painel (components/painel/): janelas de período com o período anterior
// equivalente, variação contra o período anterior (com o sentido de "bom"/"ruim") e as agregações das
// seções Inspeções de Saúde, Perícias Menores, Concursos e Uso do app. Tudo é calculado no cliente a
// partir dos documentos que já existem (ver hooks/usePainel.ts). Datas em texto "AAAA-MM-DD".
import { ehFaltaIS } from './faltaIS';
import { diasEntre, somarDias, statusEfetivoIS, type StatusIS, type SituacaoIS } from './inspecoes';
import { ultimoDiaDoMes, type Intervalo } from './periodos';
import { TIPOS_EMAIL } from '../config/emails';
import { ehMinhaPericia } from './exclusaoPericia';

// ---------------------------------------------------------------------------
// Períodos
// ---------------------------------------------------------------------------

export type PeriodoPainel = 'mes' | '3m' | '12m' | 'ano';

export const PERIODOS_PAINEL: { id: PeriodoPainel; rotulo: string; curto: string }[] = [
  { id: 'mes', rotulo: 'Mês', curto: 'Mês' },
  { id: '3m', rotulo: '3 meses', curto: '3 m' },
  { id: '12m', rotulo: '12 meses', curto: '12 m' },
  { id: 'ano', rotulo: 'Ano', curto: 'Ano' },
];

export interface JanelaPainel {
  periodo: PeriodoPainel;
  atual: Intervalo;
  anterior: Intervalo;
  /** "set–nov 2026" */
  rotulo: string;
  /** "jun–ago" */
  rotuloAnterior: string;
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dois = (n: number): string => String(n).padStart(2, '0');

/** Ano e mês (1–12) deslocados de `n` meses (n negativo = para trás). */
const deslocarMes = (ano: number, mes: number, n: number): [number, number] => {
  const total = ano * 12 + (mes - 1) + n;
  return [Math.floor(total / 12), (total % 12) + 1];
};
const primeiroDia = (ano: number, mes: number): string => `${ano}-${dois(mes)}-01`;
/** O mesmo dia do mês em outro mês, limitado ao último dia dele (31/03 → 28/02). */
const mesmoDia = (ano: number, mes: number, dia: number): string => `${ano}-${dois(mes)}-${dois(Math.min(dia, ultimoDiaDoMes(ano, mes)))}`;

/** "AAAA-MM" → "nov". */
export const mesCurto = (chaveMes: string): string => MESES_CURTOS[Number(chaveMes.slice(5, 7)) - 1] ?? '';

const rotuloIntervalo = (i: Intervalo, comAno: boolean): string => {
  const [ai, mi] = [i.inicio.slice(0, 4), i.inicio.slice(0, 7)];
  const [af, mf] = [i.fim.slice(0, 4), i.fim.slice(0, 7)];
  if (mi === mf) return comAno ? `${mesCurto(mi)} ${ai}` : mesCurto(mi);
  if (ai === af) return `${mesCurto(mi)}–${mesCurto(mf)}${comAno ? ` ${af}` : ''}`;
  return `${mesCurto(mi)} ${ai}–${mesCurto(mf)} ${af}`;
};

/**
 * Janela do período e o período anterior de mesma extensão, ambos "até a data": Mês = do dia 1º a hoje
 * (contra o mês anterior até o mesmo dia); 3 e 12 meses = os últimos meses civis, o atual incluído (contra os
 * N meses anteriores, até o mesmo dia); Ano = de 1º de janeiro a hoje (contra o ano anterior até o mesmo dia).
 * Assim um mês pela metade nunca é comparado com um mês inteiro.
 */
export const janelaDoPeriodo = (periodo: PeriodoPainel, hoje: string): JanelaPainel => {
  const ano = Number(hoje.slice(0, 4));
  const mes = Number(hoje.slice(5, 7));
  const dia = Number(hoje.slice(8, 10));
  if (periodo === 'ano') {
    const atual = { inicio: `${ano}-01-01`, fim: hoje };
    const anterior = { inicio: `${ano - 1}-01-01`, fim: mesmoDia(ano - 1, mes, dia) };
    return { periodo, atual, anterior, rotulo: String(ano), rotuloAnterior: String(ano - 1) };
  }
  const n = periodo === 'mes' ? 1 : periodo === '3m' ? 3 : 12;
  const [ai, mi] = deslocarMes(ano, mes, -(n - 1));
  const [aai, mai] = deslocarMes(ano, mes, -(2 * n - 1));
  const [aaf, maf] = deslocarMes(ano, mes, -n);
  const atual = { inicio: primeiroDia(ai, mi), fim: hoje };
  const anterior = { inicio: primeiroDia(aai, mai), fim: mesmoDia(aaf, maf, dia) };
  return { periodo, atual, anterior, rotulo: rotuloIntervalo(atual, true), rotuloAnterior: rotuloIntervalo(anterior, n === 12) };
};

/** A data (aceita "AAAA-MM-DDThh:mm") está no intervalo fechado? */
export const noIntervalo = (data: string | undefined | null, i: Intervalo): boolean => {
  if (!data) return false;
  const d = data.slice(0, 10);
  return d >= i.inicio && d <= i.fim;
};

/** Os últimos `n` meses ("AAAA-MM"), do mais antigo ao atual. */
export const ultimosMeses = (hoje: string, n = 12): string[] => {
  const ano = Number(hoje.slice(0, 4));
  const mes = Number(hoje.slice(5, 7));
  return Array.from({ length: n }, (_, k) => { const [a, m] = deslocarMes(ano, mes, k - (n - 1)); return `${a}-${dois(m)}`; });
};

/** Os últimos `n` dias ("AAAA-MM-DD"), do mais antigo a hoje. */
export const ultimosDias = (hoje: string, n: number): string[] => Array.from({ length: n }, (_, k) => somarDias(hoje, k - (n - 1)));

/** Data mais antiga que o Painel precisa ler para o período (período anterior, série de 12 meses e janela de 365 dias). */
export const inicioDaLeitura = (janela: JanelaPainel, hoje: string): string => {
  const doze = `${ultimosMeses(hoje, 12)[0]}-01`;
  const ano = somarDias(hoje, -365);
  return [janela.anterior.inicio, doze, ano].sort()[0];
};

// ---------------------------------------------------------------------------
// Variação contra o período anterior
// ---------------------------------------------------------------------------

/** Qual direção é "boa": só então a variação ganha cor (verde/vinho); senão fica neutra. */
export type SentidoKpi = 'maior-melhor' | 'menor-melhor' | 'neutro';
export type ModoVariacao = 'pct' | 'abs' | 'pp';

export interface Variacao {
  direcao: 'sobe' | 'desce' | 'igual';
  /** "12%", "4 dias", "0,8 p.p.", "3" — sem sinal (a seta mostra a direção). */
  texto: string;
  tom: 'bom' | 'ruim' | 'neutro';
}

const fmt1 = (n: number): string => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/**
 * Variação do valor atual contra o anterior. 'pct' = variação percentual (sem base quando o anterior é 0:
 * devolve null); 'abs' = diferença absoluta (com `unidade`); 'pp' = diferença em pontos percentuais.
 * Null também quando algum dos valores não existe (sem dado no período).
 */
export const variacao = (
  atual: number | null | undefined,
  anterior: number | null | undefined,
  modo: ModoVariacao = 'pct',
  sentido: SentidoKpi = 'neutro',
  unidade = '',
): Variacao | null => {
  if (atual == null || anterior == null || Number.isNaN(atual) || Number.isNaN(anterior)) return null;
  const dif = atual - anterior;
  if (modo === 'pct' && anterior === 0) return atual === 0 ? { direcao: 'igual', texto: '0%', tom: 'neutro' } : null;
  const valor = modo === 'pct' ? Math.round((Math.abs(dif) / anterior) * 100) : Math.abs(dif);
  const arred = modo === 'pp' ? Math.round(valor * 10) / 10 : Math.round(valor);
  const direcao: Variacao['direcao'] = arred === 0 ? 'igual' : dif > 0 ? 'sobe' : 'desce';
  const texto = modo === 'pct' ? `${arred}%` : modo === 'pp' ? `${fmt1(arred)} p.p.` : `${arred}${unidade ? ` ${unidade}` : ''}`;
  const tom: Variacao['tom'] = direcao === 'igual' || sentido === 'neutro' ? 'neutro'
    : (direcao === 'sobe') === (sentido === 'maior-melhor') ? 'bom' : 'ruim';
  return { direcao, texto, tom };
};

/** Percentual (0–100, uma casa) ou null sem denominador. */
export const pct = (parte: number, total: number): number | null => (total > 0 ? Math.round((parte / total) * 1000) / 10 : null);

const media = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const contarPor = <T>(xs: T[], chave: (x: T) => string): Map<string, number> => {
  const m = new Map<string, number>();
  xs.forEach(x => { const k = chave(x); if (k) m.set(k, (m.get(k) ?? 0) + 1); });
  return m;
};

export interface ItemRanking { chave: string; rotulo: string; valor: number }
const ranking = (m: Map<string, number>, rotulo: (k: string) => string = k => k): ItemRanking[] =>
  [...m.entries()].map(([chave, valor]) => ({ chave, rotulo: rotulo(chave), valor })).sort((a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));

// ---------------------------------------------------------------------------
// Inspeções de Saúde
// ---------------------------------------------------------------------------

/** Recorte da seção: Médicos começam nas próprias IS; o MPI, nas IS do MPI; os demais, em todas. */
export type RecorteIS = 'todas' | 'minhas' | 'mpi';

export interface ISPainel {
  id: string;
  dataAbertura: string;
  dataEntrevista: string;
  /** Data em que a IS foi finalizada (TIS assinado): a data do laudo; sem ela, a da última alteração. */
  dataFinalizacao: string;
  status: StatusIS;
  situacao: SituacaoIS;
  finalidade: string;
  grupoFinalidade: string;
  peritoUid: string;
  peritoNome: string;
  amp: 'JRS' | 'MPI';
  /** Data da entrevista à qual se refere a comunicação de falta (HNRe), quando houve. */
  emailFaltaDataEntrevista?: string;
  /** 'falta' na IS cancelada por falta (utils/faltaIS.ts). */
  motivoCancelamento?: string;
  // ----- Guias de exames / status "Realizando Exames" (só finalidades com exames mínimos) -----
  /** Há guias geradas (guiasExames != null). */
  temGuias?: boolean;
  guiasEntregues?: boolean;
  /** AAAA-MM-DD da entrega das guias = entrada em "Realizando Exames". */
  guiasEntreguesEm?: string;
  guiasEntreguesVia?: 'presencial' | 'email' | '';
  /** Já houve envio das guias por e-mail (emailGuiasEnviadoEm != null). */
  emailGuiasEnviado?: boolean;
}

export const recorteInicialIS = (perfil: string | undefined): RecorteIS =>
  perfil === 'user_medicos' ? 'minhas' : perfil === 'user_medicos_mpi' ? 'mpi' : 'todas';

export const aplicarRecorteIS = <T extends Pick<ISPainel, 'peritoUid' | 'amp'>>(lista: T[], recorte: RecorteIS, uid: string): T[] =>
  recorte === 'minhas' ? lista.filter(i => i.peritoUid === uid) : recorte === 'mpi' ? lista.filter(i => i.amp === 'MPI') : lista;

const ETAPAS_AGENDAMENTO: StatusIS[] = ['aberta', 'realizando_exames', 'agendada', 'reagendada', 'faltou', 'cancelada'];
const finalizadaNo = (i: ISPainel, j: Intervalo) => i.status === 'tis_assinado' && noIntervalo(i.dataFinalizacao, j);

/**
 * Faltas no intervalo (aproximação — a falta não fica gravada depois do reagendamento): IS com status Faltou e
 * entrevista no intervalo, mais as que tiveram a comunicação de falta ao HNRe de uma entrevista no intervalo.
 * Base: as entrevistas do intervalo mais essas faltas comunicadas que foram reagendadas para fora dele.
 */
export const faltasNoIntervalo = (lista: ISPainel[], j: Intervalo): { faltas: number; agendadas: number } => {
  let faltas = 0, agendadas = 0;
  lista.forEach(i => {
    // Cancelada por falta conta como falta (utils/faltaIS.ts); a cancelada por prazo fica de fora.
    const falta = ehFaltaIS(i);
    if (i.status === 'cancelada' && !falta) return;
    const entrevistaNo = noIntervalo(i.dataEntrevista, j);
    const faltaComunicada = !falta && noIntervalo(i.emailFaltaDataEntrevista, j);
    if (entrevistaNo) agendadas++;
    if (falta && entrevistaNo) faltas++;
    if (faltaComunicada) { faltas++; if (!entrevistaNo) agendadas++; }
  });
  return { faltas, agendadas };
};

const tempoMedioTis = (lista: ISPainel[], j: Intervalo): number | null =>
  media(lista.filter(i => finalizadaNo(i, j) && i.dataAbertura).map(i => Math.max(0, diasEntre(i.dataAbertura, i.dataFinalizacao))));

export interface ResumoIS {
  abertas: { atual: number; anterior: number };
  finalizadas: { atual: number; anterior: number };
  tempoMedio: { atual: number | null; anterior: number | null };
  atrasadas: number;
  atrasadas30: number;
  faltas: { atual: number | null; anterior: number | null; faltas: number; agendadas: number };
}

export const resumoIS = (lista: ISPainel[], janela: JanelaPainel, hoje: string): ResumoIS => {
  const atrasadasLista = lista.filter(i => statusEfetivoIS(i, hoje) === 'atrasada');
  const fa = faltasNoIntervalo(lista, janela.atual);
  const fb = faltasNoIntervalo(lista, janela.anterior);
  return {
    abertas: { atual: lista.filter(i => noIntervalo(i.dataAbertura, janela.atual)).length, anterior: lista.filter(i => noIntervalo(i.dataAbertura, janela.anterior)).length },
    finalizadas: { atual: lista.filter(i => finalizadaNo(i, janela.atual)).length, anterior: lista.filter(i => finalizadaNo(i, janela.anterior)).length },
    tempoMedio: { atual: tempoMedioTis(lista, janela.atual), anterior: tempoMedioTis(lista, janela.anterior) },
    atrasadas: atrasadasLista.length,
    atrasadas30: atrasadasLista.filter(i => diasEntre(i.dataAbertura, hoje) > 30).length,
    faltas: { atual: pct(fa.faltas, fa.agendadas), anterior: pct(fb.faltas, fb.agendadas), ...fa },
  };
};

export interface PontoSerie { chave: string; rotulo: string; valores: number[] }

/** Abertas × finalizadas por mês (últimos 12 meses). */
export const serieMensalIS = (lista: ISPainel[], hoje: string): PontoSerie[] => {
  const meses = ultimosMeses(hoje, 12);
  const abertas = contarPor(lista, i => i.dataAbertura?.slice(0, 7) ?? '');
  const finalizadas = contarPor(lista.filter(i => i.status === 'tis_assinado'), i => i.dataFinalizacao?.slice(0, 7) ?? '');
  return meses.map(m => ({ chave: m, rotulo: mesCurto(m), valores: [abertas.get(m) ?? 0, finalizadas.get(m) ?? 0] }));
};

/** Etapas das IS em curso (situação aberta ou em andamento), na ordem do fluxo. */
export const ETAPAS_EM_CURSO: { id: string; rotulo: string; status: (StatusIS | 'atrasada')[]; alerta?: boolean }[] = [
  { id: 'atrasada', rotulo: 'Atrasadas', status: ['atrasada'], alerta: true },
  { id: 'aberta', rotulo: 'Abertas', status: ['aberta'] },
  { id: 'realizando_exames', rotulo: 'Realizando exames', status: ['realizando_exames'] },
  { id: 'agendada', rotulo: 'Agendadas', status: ['agendada', 'reagendada'] },
  { id: 'faltou', rotulo: 'Faltou', status: ['faltou'] },
  { id: 'parecer', rotulo: 'Parecer solicitado', status: ['parecer_solicitado'] },
  { id: 'auditoria', rotulo: 'Auditoria', status: ['auditoria', 'revisao_exofficio', 'restituicao_auditoria', 'restituicao_jsd'] },
  { id: 'conclusao', rotulo: 'Conclusão', status: ['conclusao_pendente'] },
  { id: 'votacao', rotulo: 'Votação', status: ['votacao_pendente'] },
  { id: 'assinaturas', rotulo: 'Assinaturas', status: ['assinaturas_pendentes'] },
];

export const emCursoPorEtapa = (lista: ISPainel[], hoje: string): (ItemRanking & { alerta: boolean })[] => {
  const emCurso = lista.filter(i => i.situacao !== 'finalizada');
  return ETAPAS_EM_CURSO
    .map(e => ({ chave: e.id, rotulo: e.rotulo, alerta: !!e.alerta, valor: emCurso.filter(i => e.status.includes(statusEfetivoIS(i, hoje))).length }))
    .filter(e => e.valor > 0);
};

/**
 * Status "Realizando Exames" (guias entregues ao inspecionado, presencialmente ou por e-mail). Cada média conta
 * no período em que o evento final acontece, como o tempo até o TIS: abertura → entrega das guias pelas guias
 * entregues no período; entrega → agendamento (data agendada da entrevista) pelas entrevistas do período.
 */
export interface ResumoExamesIS {
  /** IS com status Realizando Exames agora. */
  agora: number;
  /** Entraram em Realizando Exames (guias entregues) no período. */
  entraram: { atual: number; anterior: number };
  aberturaAteGuias: { atual: number | null; anterior: number | null };
  guiasAteAgendamento: { atual: number | null; anterior: number | null };
  /** Entregas no período por via (sem via gravada: presencial, que é o padrão da caixa). */
  via: { email: number; presencial: number; pctEmail: { atual: number | null; anterior: number | null } };
  /** IS ainda abertas com guias geradas e não entregues. */
  aguardandoEntrega: number;
}

export const resumoExamesIS = (lista: ISPainel[], janela: JanelaPainel): ResumoExamesIS => {
  const entregues = (j: Intervalo) => lista.filter(i => i.status !== 'cancelada' && noIntervalo(i.guiasEntreguesEm, j));
  const ateGuias = (j: Intervalo) => media(entregues(j).filter(i => i.dataAbertura).map(i => Math.max(0, diasEntre(i.dataAbertura, i.guiasEntreguesEm!.slice(0, 10)))));
  const ateAgenda = (j: Intervalo) => media(lista
    .filter(i => i.status !== 'cancelada' && i.guiasEntreguesEm && noIntervalo(i.dataEntrevista, j))
    .map(i => Math.max(0, diasEntre(i.guiasEntreguesEm!.slice(0, 10), i.dataEntrevista.slice(0, 10)))));
  const [a, b] = [entregues(janela.atual), entregues(janela.anterior)];
  const porEmail = (xs: ISPainel[]) => xs.filter(i => i.guiasEntreguesVia === 'email').length;
  return {
    agora: lista.filter(i => i.status === 'realizando_exames').length,
    entraram: { atual: a.length, anterior: b.length },
    aberturaAteGuias: { atual: ateGuias(janela.atual), anterior: ateGuias(janela.anterior) },
    guiasAteAgendamento: { atual: ateAgenda(janela.atual), anterior: ateAgenda(janela.anterior) },
    via: { email: porEmail(a), presencial: a.length - porEmail(a), pctEmail: { atual: pct(porEmail(a), a.length), anterior: pct(porEmail(b), b.length) } },
    aguardandoEntrega: lista.filter(i => i.status === 'aberta' && i.temGuias && !i.guiasEntregues).length,
  };
};

/** IS abertas no período, por finalidade (da mais frequente). */
export const porFinalidade = (lista: ISPainel[], janela: JanelaPainel): ItemRanking[] =>
  ranking(contarPor(lista.filter(i => noIntervalo(i.dataAbertura, janela.atual)), i => i.finalidade || 'Sem finalidade'));

export interface LinhaPerito { uid: string; nome: string; amp: string; realizadas: number; tempoMedio: number | null; faltas: number | null }

/**
 * Por perito, no período: entrevistas realizadas (entrevista no período e a IS já passou das etapas de
 * agendamento), tempo médio da abertura ao TIS (finalizadas no período) e % de faltas.
 */
export const porPerito = (lista: ISPainel[], janela: JanelaPainel): LinhaPerito[] => {
  const grupos = new Map<string, ISPainel[]>();
  lista.forEach(i => { if (i.peritoUid) grupos.set(i.peritoUid, [...(grupos.get(i.peritoUid) ?? []), i]); });
  return [...grupos.entries()].map(([uid, is]) => {
    const f = faltasNoIntervalo(is, janela.atual);
    return {
      uid,
      nome: is[0].peritoNome || '—',
      amp: is.some(i => i.amp === 'MPI') && !is.some(i => i.amp === 'JRS') ? 'MPI' : 'JRS',
      realizadas: is.filter(i => noIntervalo(i.dataEntrevista, janela.atual) && !ETAPAS_AGENDAMENTO.includes(i.status)).length,
      tempoMedio: tempoMedioTis(is, janela.atual),
      faltas: pct(f.faltas, f.agendadas),
    };
  }).filter(l => l.realizadas > 0 || l.tempoMedio !== null).sort((a, b) => b.realizadas - a.realizadas || a.nome.localeCompare(b.nome, 'pt-BR'));
};

// ---------------------------------------------------------------------------
// Perícias Menores
// ---------------------------------------------------------------------------

export type RecortePericias = 'todas' | 'minhas';

export interface PericiaPainel {
  id: string;
  militarId: string;
  inspecionado: string;
  om: string;
  cid: string;
  cidCodigo?: string;
  especialidade?: string;
  dispensas: string[];
  dataAtestado: string;
  dataTermino: string;
  tempoHomologado: number;
  homologacao?: boolean;
  peritoUid: string;
  criadoPor?: string;
}

/** Limite de dispensa acumulada considerado no alerta "perto do limite" (30 dias em 12 meses; alerta a partir de 25). */
export const LIMITE_DIAS_PERICIA = 30;
export const ALERTA_DIAS_PERICIA = 25;

/** "Meus": as perícias em que o usuário é o perito responsável (o mesmo critério do "Minhas" da Perícia Menor). */
export const aplicarRecortePericias = <T extends Pick<PericiaPainel, 'peritoUid'>>(lista: T[], recorte: RecortePericias, uid: string): T[] =>
  recorte === 'minhas' ? lista.filter(p => ehMinhaPericia(p, uid)) : lista;

/** "TODAS AS ATIVIDADES" = dispensa total; qualquer outra dispensa = restrição. */
export const ehDispensaTotal = (p: Pick<PericiaPainel, 'dispensas'>): boolean =>
  (p.dispensas ?? []).some(d => d.toUpperCase().includes('TODAS AS ATIVIDADES'));

const chaveMilitarPericia = (p: Pick<PericiaPainel, 'militarId' | 'inspecionado'>): string => p.militarId || p.inspecionado;

export interface ResumoPericias {
  pericias: { atual: number; anterior: number };
  vigentes: number;
  dias: { atual: number; anterior: number; media: number | null };
  homologacoes: { atual: number | null; anterior: number | null };
  pertoDoLimite: number;
  recorrentes: number;
}

export const resumoPericias = (lista: PericiaPainel[], janela: JanelaPainel, hoje: string): ResumoPericias => {
  const no = (j: Intervalo) => lista.filter(p => noIntervalo(p.dataAtestado, j));
  const [a, b] = [no(janela.atual), no(janela.anterior)];
  const soma = (xs: PericiaPainel[]) => xs.reduce((s, p) => s + (Number(p.tempoHomologado) || 0), 0);
  const ultimoAno = lista.filter(p => noIntervalo(p.dataAtestado, { inicio: somarDias(hoje, -364), fim: hoje }));
  const diasPorMilitar = new Map<string, number>();
  const qtdPorMilitar = new Map<string, number>();
  ultimoAno.forEach(p => {
    const k = chaveMilitarPericia(p);
    diasPorMilitar.set(k, (diasPorMilitar.get(k) ?? 0) + (Number(p.tempoHomologado) || 0));
    qtdPorMilitar.set(k, (qtdPorMilitar.get(k) ?? 0) + 1);
  });
  return {
    pericias: { atual: a.length, anterior: b.length },
    vigentes: lista.filter(p => p.dataTermino && p.dataTermino >= hoje && p.dataAtestado <= hoje).length,
    dias: { atual: soma(a), anterior: soma(b), media: a.length ? Math.round((soma(a) / a.length) * 10) / 10 : null },
    homologacoes: { atual: pct(a.filter(p => p.homologacao).length, a.length), anterior: pct(b.filter(p => p.homologacao).length, b.length) },
    pertoDoLimite: [...diasPorMilitar.values()].filter(d => d >= ALERTA_DIAS_PERICIA).length,
    recorrentes: [...qtdPorMilitar.values()].filter(q => q >= 3).length,
  };
};

/** Perícias por mês (últimos 12 meses): [dispensa total, restrições]. */
export const serieMensalPericias = (lista: PericiaPainel[], hoje: string, meses = 12): PontoSerie[] => {
  const chaves = ultimosMeses(hoje, meses);
  return chaves.map(m => {
    const doMes = lista.filter(p => p.dataAtestado?.slice(0, 7) === m);
    const total = doMes.filter(ehDispensaTotal).length;
    return { chave: m, rotulo: mesCurto(m), valores: [total, doMes.length - total] };
  });
};

/** Código do CID ("M545") e rótulo a partir do texto gravado: DESCRABREV ("M54.5 Lombalgia", formato atual)
 *  ou o formato antigo "M545 - Lombalgia". */
const cidDe = (p: Pick<PericiaPainel, 'cid' | 'cidCodigo'>): { codigo: string; rotulo: string } => {
  const texto = (p.cid || '').trim();
  if (texto && !texto.includes(' - ')) {
    const codigo = (p.cidCodigo || texto.split(/\s+/)[0] || '').trim().toUpperCase().replace(/\./g, '');
    return { codigo, rotulo: texto };
  }
  const [cod, ...resto] = texto.split(' - ');
  const codigo = (p.cidCodigo || cod || '').trim().toUpperCase();
  return { codigo, rotulo: [codigo, resto.join(' - ').trim()].filter(Boolean).join(' ') };
};

export const cidsFrequentes = (lista: PericiaPainel[], janela: JanelaPainel): ItemRanking[] => {
  const doPeriodo = lista.filter(p => noIntervalo(p.dataAtestado, janela.atual));
  const rotulos = new Map<string, string>();
  doPeriodo.forEach(p => { const c = cidDe(p); if (c.codigo && !rotulos.has(c.codigo)) rotulos.set(c.codigo, c.rotulo); });
  return ranking(contarPor(doPeriodo, p => cidDe(p).codigo), k => rotulos.get(k) ?? k);
};

/** Perícias do período por especialidade médica (deduzida do CID pela IA); sem classificação: "Não categorizada". */
export const periciasPorEspecialidade = (lista: PericiaPainel[], janela: JanelaPainel): ItemRanking[] =>
  ranking(contarPor(lista.filter(p => noIntervalo(p.dataAtestado, janela.atual)), p => p.especialidade || 'Não categorizada'));

export const periciasPorOm = (lista: PericiaPainel[], janela: JanelaPainel): ItemRanking[] =>
  ranking(contarPor(lista.filter(p => noIntervalo(p.dataAtestado, janela.atual)), p => (p.om || 'Sem OM').trim()));

// ---------------------------------------------------------------------------
// Concursos
// ---------------------------------------------------------------------------

export interface CandidatoPainel {
  status: string; finalizado: boolean; dataLaudo: string; dataAgendamento: string;
  /** Só dos INAPTOS: as Observações, que obrigatoriamente trazem o CID da inaptidão ("M54.5 Dor lombar baixa"). */
  observacoes?: string;
}
export interface ConcursoPainel { id: string; nome: string; status: string; totalCandidatos: number; candidatos: CandidatoPainel[] }

/** Data da IS do candidato: a do laudo (DD/MM/AAAA) ou, sem ela, a do agendamento (AAAA-MM-DD). */
export const dataDoCandidato = (c: Pick<CandidatoPainel, 'dataLaudo' | 'dataAgendamento'>): string => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((c.dataLaudo || '').trim());
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return (c.dataAgendamento || '').slice(0, 10);
};

const statusCand = (c: CandidatoPainel): string => String(c.status || '').trim().toUpperCase();

export interface ContagemConcurso { finalizados: number; aptos: number; inaptos: number; faltas: number; idm: number }
const contar = (cands: CandidatoPainel[]): ContagemConcurso => {
  const r = { finalizados: 0, aptos: 0, inaptos: 0, faltas: 0, idm: 0 };
  cands.forEach(c => {
    if (!c.finalizado) return;
    r.finalizados++;
    const s = statusCand(c);
    if (s === 'APTO') r.aptos++;
    else if (s === 'INAPTO') r.inaptos++;
    else if (s === 'FALTOU') r.faltas++;
    else if (s === 'INSUF DOCUMENTAL') r.idm++;
  });
  return r;
};

export interface ResumoConcursos {
  emAndamento: { id: string; nome: string }[];
  finalizados: { atual: number; anterior: number };
  faltas: { atual: number | null; anterior: number | null };
  inaptos: { atual: number | null; anterior: number | null };
  idm: { atual: number | null; anterior: number | null };
}

export const resumoConcursos = (concursos: ConcursoPainel[], janela: JanelaPainel): ResumoConcursos => {
  const doIntervalo = (j: Intervalo) => contar(concursos.flatMap(c => c.candidatos.filter(x => noIntervalo(dataDoCandidato(x), j))));
  const [a, b] = [doIntervalo(janela.atual), doIntervalo(janela.anterior)];
  return {
    emAndamento: concursos.filter(c => c.status === 'em_andamento').map(c => ({ id: c.id, nome: c.nome })),
    finalizados: { atual: a.finalizados, anterior: b.finalizados },
    faltas: { atual: pct(a.faltas, a.finalizados), anterior: pct(b.faltas, b.finalizados) },
    inaptos: { atual: pct(a.inaptos, a.finalizados), anterior: pct(b.inaptos, b.finalizados) },
    idm: { atual: pct(a.idm, a.finalizados), anterior: pct(b.idm, b.finalizados) },
  };
};

/** Concursos em andamento: finalizados de quantos candidatos, com aptos/inaptos/faltas/IDM. */
export const andamentoPorConcurso = (concursos: ConcursoPainel[]): ({ id: string; nome: string; total: number } & ContagemConcurso)[] =>
  concursos.filter(c => c.status === 'em_andamento').map(c => ({
    id: c.id, nome: c.nome, total: Math.max(c.totalCandidatos || 0, c.candidatos.length), ...contar(c.candidatos),
  }));

/** Concursos com mais inaptos no período. */
export const concursosComMaisInaptos = (concursos: ConcursoPainel[], janela: JanelaPainel): ItemRanking[] =>
  concursos
    .map(c => ({ chave: c.id, rotulo: c.nome, valor: contar(c.candidatos.filter(x => noIntervalo(dataDoCandidato(x), janela.atual))).inaptos }))
    .filter(c => c.valor > 0)
    .sort((a, b) => b.valor - a.valor);

// Causas de inaptidão. Ao marcar INAPTO, o CID vai obrigatoriamente para as Observações do candidato
// (CidInaptidaoModal grava o DESCRABREV da CID-10: "M54.5 Dor lombar baixa"). Aqui se lê só o código
// no início do texto; o resto das observações (texto livre) não entra em nenhum agregado.
const RE_CID = /^\s*([A-TV-Z]\d{2})(?:[.,]?(\d))?\b/i;

/** Código do CID no início das observações ("M54.5" / "M545" / "M54" → "M54.5" ou "M54") e o rótulo abreviado. */
export const cidDaInaptidao = (observacoes: string | undefined): { codigo: string; rotulo: string } | null => {
  const m = RE_CID.exec(observacoes || '');
  if (!m) return null;
  const codigo = `${m[1].toUpperCase()}${m[2] ? `.${m[2]}` : ''}`;
  const descricao = (observacoes || '').slice(m[0].length).replace(/^[\s\-–:]+/, '').split(/[\n;]/)[0].trim();
  return { codigo, rotulo: descricao ? `${codigo} ${descricao}` : codigo };
};

/** Capítulos da CID-10 (pelo intervalo de categorias), para agrupar as causas por área. */
const CAPITULOS_CID: { de: string; ate: string; nome: string }[] = [
  { de: 'A00', ate: 'B99', nome: 'Infecciosas e parasitárias' },
  { de: 'C00', ate: 'D48', nome: 'Neoplasias' },
  { de: 'D50', ate: 'D89', nome: 'Sangue e imunidade' },
  { de: 'E00', ate: 'E90', nome: 'Endócrinas e metabólicas' },
  { de: 'F00', ate: 'F99', nome: 'Transtornos mentais' },
  { de: 'G00', ate: 'G99', nome: 'Sistema nervoso' },
  { de: 'H00', ate: 'H59', nome: 'Olho e anexos' },
  { de: 'H60', ate: 'H95', nome: 'Ouvido' },
  { de: 'I00', ate: 'I99', nome: 'Aparelho circulatório' },
  { de: 'J00', ate: 'J99', nome: 'Aparelho respiratório' },
  { de: 'K00', ate: 'K93', nome: 'Aparelho digestivo' },
  { de: 'L00', ate: 'L99', nome: 'Pele' },
  { de: 'M00', ate: 'M99', nome: 'Osteomuscular' },
  { de: 'N00', ate: 'N99', nome: 'Geniturinário' },
  { de: 'O00', ate: 'O99', nome: 'Gravidez e puerpério' },
  { de: 'P00', ate: 'P96', nome: 'Período perinatal' },
  { de: 'Q00', ate: 'Q99', nome: 'Malformações congênitas' },
  { de: 'R00', ate: 'R99', nome: 'Sinais e achados anormais' },
  { de: 'S00', ate: 'T98', nome: 'Lesões e causas externas' },
  { de: 'V01', ate: 'Y98', nome: 'Causas externas' },
  { de: 'Z00', ate: 'Z99', nome: 'Fatores que influenciam a saúde' },
];
export const capituloDoCid = (codigo: string): string => {
  const cat = codigo.slice(0, 3).toUpperCase();
  return CAPITULOS_CID.find(c => cat >= c.de && cat <= c.ate)?.nome ?? 'Outros';
};

export interface CausasInaptidao {
  /** Inaptos finalizados no período. */
  inaptos: number;
  /** Quantos deles têm CID legível nas observações. */
  comCid: number;
  /** CID mais frequentes (código + descrição abreviada). */
  porCid: ItemRanking[];
  /** Os mesmos, agrupados por capítulo da CID-10. */
  porCapitulo: ItemRanking[];
}

/** Causas de inaptidão (CID das observações) dos inaptos finalizados no período, em todos os concursos lidos. */
export const causasInaptidao = (concursos: ConcursoPainel[], janela: JanelaPainel): CausasInaptidao => {
  const inaptos = concursos.flatMap(c => c.candidatos.filter(x => x.finalizado && statusCand(x) === 'INAPTO' && noIntervalo(dataDoCandidato(x), janela.atual)));
  const cids = inaptos.map(x => cidDaInaptidao(x.observacoes)).filter((c): c is { codigo: string; rotulo: string } => !!c);
  const rotulos = new Map<string, string>();
  cids.forEach(c => { if (!rotulos.has(c.codigo)) rotulos.set(c.codigo, c.rotulo); });
  return {
    inaptos: inaptos.length,
    comCid: cids.length,
    porCid: ranking(contarPor(cids, c => c.codigo), k => rotulos.get(k) ?? k),
    porCapitulo: ranking(contarPor(cids, c => capituloDoCid(c.codigo))),
  };
};

// ---------------------------------------------------------------------------
// Uso do app (coleção uso_diario — services/usoDiario.ts)
// ---------------------------------------------------------------------------

/** Tipos de ação contados no uso do app (chaves sem ponto: viram chaves de mapa no Firestore). */
export type TipoAcaoUso =
  | 'is_cadastrar' | 'is_agendar' | 'pericia_registrar' | 'email_enviar' | 'documento_gerar'
  | 'exame_ia' | 'exclusao' | 'importacao' | 'config' | 'afastamento';

export const ROTULO_ACAO_USO: Record<TipoAcaoUso, string> = {
  is_agendar: 'Agendamentos',
  email_enviar: 'E-mails enviados',
  is_cadastrar: 'IS cadastradas',
  pericia_registrar: 'Perícias registradas',
  documento_gerar: 'Documentos gerados',
  exame_ia: 'Exames transcritos (IA)',
  afastamento: 'Afastamentos',
  importacao: 'Importações',
  config: 'Configurações',
  exclusao: 'Exclusões',
};

export interface UsoDia {
  /** AAAA-MM-DD (id do documento). */
  dia: string;
  /** Acessos por página (NavItem → contagem). */
  paginas: Record<string, number>;
  /** Acessos por usuário (uid → contagem). */
  acessosPorUsuario: Record<string, number>;
  /** Ações por usuário e tipo (uid → tipo → contagem). */
  acoesPorUsuario: Record<string, Record<string, number>>;
  /** Último acesso do usuário no dia (uid → ms desde a época). */
  ultimo: Record<string, number>;
  /** E-mails enviados pelo servidor no dia, por tipo (TipoEmail → contagem; servidor/email/registroEmailsIS.ts). */
  emailsPorTipo?: Record<string, number>;
  /** Guias de exames geradas no dia (PDFs). */
  guiasGeradas?: number;
}

/** Rótulo do tipo de e-mail (config/emails.ts → TIPOS_EMAIL). */
export const rotuloTipoEmail = (tipo: string): string => TIPOS_EMAIL.find(t => t.tipo === tipo)?.rotulo ?? tipo;

export interface UsuarioUso { uid: string; usuario: string; perfil: string; ativo: boolean }

const somaValores = (r: Record<string, number> | undefined): number => Object.values(r ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
const acoesDoDia = (d: UsoDia): number => Object.values(d.acoesPorUsuario ?? {}).reduce((s, porTipo) => s + somaValores(porTipo), 0);

export interface LinhaUsuarioUso { uid: string; usuario: string; perfil: string; acessos: number; acoes: number; ultimo: number | null; porTipo: Record<string, number> }

export interface ResumoUso {
  ativos: { atual: number; anterior: number; total: number; hoje: number };
  acessos: { atual: number; anterior: number; porDia: number | null };
  acoes: { atual: number; anterior: number };
  maisUsado: { pagina: string; pct: number | null } | null;
  semAcesso30: number;
  serie28: PontoSerie[];
  paginas: ItemRanking[];
  usuarios: LinhaUsuarioUso[];
  acoesPorTipo: ItemRanking[];
  porPerfil: ItemRanking[];
  /** Tipos de ação presentes no período (colunas do mapa de calor), do mais frequente. */
  tipos: string[];
  /** E-mails enviados (todos os tipos) e guias geradas no período. */
  emails: { atual: number; anterior: number };
  guias: { atual: number; anterior: number };
  /** E-mails do período por tipo (rótulos de TIPOS_EMAIL), do mais frequente. */
  emailsPorTipo: ItemRanking[];
  /** Últimos 28 dias: [e-mails, guias]. */
  envios28: PontoSerie[];
}

const emailsDoDia = (d: UsoDia): number => somaValores(d.emailsPorTipo);
const guiasDoDia = (d: UsoDia): number => Number(d.guiasGeradas) || 0;

/** Linhas por dia do intervalo (para o CSV de envios): dia, total de e-mails, por tipo (na ordem de `tipos`) e guias. */
export const enviosPorDia = (docs: UsoDia[], janela: JanelaPainel, tipos: string[]): (string | number)[][] =>
  docs.filter(d => noIntervalo(d.dia, janela.atual)).sort((x, y) => x.dia.localeCompare(y.dia))
    .map(d => [d.dia, emailsDoDia(d), ...tipos.map(t => Number(d.emailsPorTipo?.[t]) || 0), guiasDoDia(d)]);

export const resumoUso = (docs: UsoDia[], usuarios: UsuarioUso[], janela: JanelaPainel, hoje: string): ResumoUso => {
  const em = (j: Intervalo) => docs.filter(d => noIntervalo(d.dia, j));
  const [a, b] = [em(janela.atual), em(janela.anterior)];
  const distintos = (ds: UsoDia[]) => new Set(ds.flatMap(d => Object.keys(d.acessosPorUsuario ?? {}).filter(u => (d.acessosPorUsuario[u] ?? 0) > 0)));
  const ativosCadastro = usuarios.filter(u => u.ativo);
  const ult30 = distintos(docs.filter(d => noIntervalo(d.dia, { inicio: somarDias(hoje, -29), fim: hoje })));
  const doHoje = docs.find(d => d.dia === hoje);

  const paginas = new Map<string, number>();
  a.forEach(d => Object.entries(d.paginas ?? {}).forEach(([p, n]) => paginas.set(p, (paginas.get(p) ?? 0) + (Number(n) || 0))));
  const acessosA = a.reduce((s, d) => s + somaValores(d.paginas), 0);
  const rankPaginas = ranking(paginas);

  const porUid = new Map<string, LinhaUsuarioUso>();
  const infoDe = new Map(usuarios.map(u => [u.uid, u]));
  const linha = (uid: string): LinhaUsuarioUso => {
    let l = porUid.get(uid);
    if (!l) { const u = infoDe.get(uid); l = { uid, usuario: u?.usuario || 'Usuário removido', perfil: u?.perfil || '', acessos: 0, acoes: 0, ultimo: null, porTipo: {} }; porUid.set(uid, l); }
    return l;
  };
  a.forEach(d => {
    Object.entries(d.acessosPorUsuario ?? {}).forEach(([uid, n]) => { linha(uid).acessos += Number(n) || 0; });
    Object.entries(d.acoesPorUsuario ?? {}).forEach(([uid, porTipo]) => {
      const l = linha(uid);
      Object.entries(porTipo ?? {}).forEach(([t, n]) => { l.acoes += Number(n) || 0; l.porTipo[t] = (l.porTipo[t] ?? 0) + (Number(n) || 0); });
    });
  });
  // Último acesso: o mais recente em todos os dias lidos (não só no período).
  docs.forEach(d => Object.entries(d.ultimo ?? {}).forEach(([uid, ms]) => {
    const l = porUid.get(uid);
    if (l && (l.ultimo === null || ms > l.ultimo)) l.ultimo = ms;
  }));
  const linhas = [...porUid.values()].sort((x, y) => y.acessos - x.acessos || y.acoes - x.acoes);

  const porTipo = new Map<string, number>();
  linhas.forEach(l => Object.entries(l.porTipo).forEach(([t, n]) => porTipo.set(t, (porTipo.get(t) ?? 0) + n)));
  const rotuloTipo = (t: string) => ROTULO_ACAO_USO[t as TipoAcaoUso] ?? t;
  const rankTipos = ranking(porTipo, rotuloTipo);

  const porPerfil = new Map<string, number>();
  linhas.forEach(l => { if (l.perfil) porPerfil.set(l.perfil, (porPerfil.get(l.perfil) ?? 0) + l.acessos); });

  const emailsTipo = new Map<string, number>();
  a.forEach(d => Object.entries(d.emailsPorTipo ?? {}).forEach(([t, n]) => emailsTipo.set(t, (emailsTipo.get(t) ?? 0) + (Number(n) || 0))));
  [...emailsTipo.entries()].forEach(([t, n]) => { if (!n) emailsTipo.delete(t); });

  const diasAtual = Math.max(1, diasEntre(janela.atual.inicio, janela.atual.fim) + 1);
  const porDiaMapa = new Map(docs.map(d => [d.dia, d]));
  return {
    ativos: { atual: distintos(a).size, anterior: distintos(b).size, total: ativosCadastro.length, hoje: doHoje ? Object.keys(doHoje.acessosPorUsuario ?? {}).length : 0 },
    acessos: { atual: acessosA, anterior: b.reduce((s, d) => s + somaValores(d.paginas), 0), porDia: acessosA ? Math.round(acessosA / diasAtual) : null },
    acoes: { atual: a.reduce((s, d) => s + acoesDoDia(d), 0), anterior: b.reduce((s, d) => s + acoesDoDia(d), 0) },
    maisUsado: rankPaginas[0] ? { pagina: rankPaginas[0].chave, pct: pct(rankPaginas[0].valor, acessosA) } : null,
    semAcesso30: ativosCadastro.filter(u => !ult30.has(u.uid)).length,
    serie28: ultimosDias(hoje, 28).map(dia => {
      const d = porDiaMapa.get(dia);
      return { chave: dia, rotulo: String(Number(dia.slice(8, 10))), valores: [d ? somaValores(d.paginas) : 0, d ? acoesDoDia(d) : 0] };
    }),
    paginas: rankPaginas,
    usuarios: linhas,
    acoesPorTipo: rankTipos,
    porPerfil: ranking(porPerfil),
    tipos: rankTipos.map(t => t.chave),
    emails: { atual: a.reduce((s, d) => s + emailsDoDia(d), 0), anterior: b.reduce((s, d) => s + emailsDoDia(d), 0) },
    guias: { atual: a.reduce((s, d) => s + guiasDoDia(d), 0), anterior: b.reduce((s, d) => s + guiasDoDia(d), 0) },
    emailsPorTipo: ranking(emailsTipo, rotuloTipoEmail),
    envios28: ultimosDias(hoje, 28).map(dia => {
      const d = porDiaMapa.get(dia);
      return { chave: dia, rotulo: String(Number(dia.slice(8, 10))), valores: [d ? emailsDoDia(d) : 0, d ? guiasDoDia(d) : 0] };
    }),
  };
};

/** Dias de uso_diario fora da retenção de 12 meses (os ids anteriores a hoje − 365 dias). */
export const limiteRetencaoUso = (hoje: string): string => somarDias(hoje, -365);
