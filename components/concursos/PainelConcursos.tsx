// Ficheiro: components/concursos/PainelConcursos.tsx
// Peças da lista de concursos (auditoria v3, 2c · C1/C4/C5/C6/C7):
//  - KpisContexto: KPIs do filtro ativo (situação + ano), todos em % com o absoluto na dica,
//    em faixa rolável no celular e 5 colunas quando cabe;
//  - CardConcurso: período primeiro, nome em até 2 linhas (com tooltip), barra empilhada
//    Aptos · Inaptos · Faltas · IDM · Pendentes com as contagens e o próximo dia no rodapé.
//    O card NÃO é clicável inteiro: o título é um botão real e o ⋮ fica fora dele;
//  - ProximosDias: candidatos por dia nos próximos dias de concurso (substitui o calendário 50/50).
import React from 'react';
import type { ConcursoRecord } from '../../services/firestoreConcursos';
import type { DiaConcurso } from '../../services/agendaConcursos';
import { hojeISO, somarDias, deISO } from '../../utils/inspecoes';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MenuAcoes, type ItemMenu } from '../ui/MenuAcoes';
import { isoParaBR } from './compartilhado';

/** Resumo dos candidatos de um concurso (só os finalizados entram em aptos/inaptos/faltas/IDM). */
export interface ResumoConcurso {
  total: number;
  finalizados: number;
  apto: number;
  inapto: number;
  faltou: number;
  idm: number;
}

export const plural = (n: number, um: string, varios: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;

/** 51% · 9,8% (uma casa decimal abaixo de 10%). */
export const formatarPct = (parte: number, todo: number): string => {
  if (!todo) return '—';
  const v = (parte / todo) * 100;
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: v > 0 && v < 10 ? 1 : 0 })}%`;
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** "06/10 a 30/10/2026" (o ano só no fim quando é o mesmo). */
export const periodoCurto = (c: Pick<ConcursoRecord, 'periodoInicioISO' | 'periodoFimISO'>): string => {
  if (!c.periodoInicioISO) return 'Período a definir';
  const ini = isoParaBR(c.periodoInicioISO);
  const fim = c.periodoFimISO ? isoParaBR(c.periodoFimISO) : '';
  if (!fim) return `A partir de ${ini}`;
  return c.periodoInicioISO.slice(0, 4) === c.periodoFimISO.slice(0, 4) ? `${ini.slice(0, 5)} a ${fim}` : `${ini} a ${fim}`;
};

/** "Hoje" · "Amanhã" · "Seg 20/10". */
export const rotuloDia = (iso: string): string => {
  const hoje = hojeISO();
  if (iso === hoje) return 'Hoje';
  if (iso === somarDias(hoje, 1)) return 'Amanhã';
  return `${DIAS_SEMANA[deISO(iso).getDay()]} ${isoParaBR(iso).slice(0, 5)}`;
};

// -------------------------------------------------------------------------
// KPIs no contexto do filtro
// -------------------------------------------------------------------------

export type ChaveKpi = 'finalizados' | 'apto' | 'inapto' | 'faltou' | 'idm';

interface KpisContextoProps {
  /** "Em andamento · 2026 · 2 concursos · 260 candidatos" */
  contexto: string;
  soma: ResumoConcurso | null;
  /** Abre o ranking de concursos daquele indicador (só para inaptos, faltas e IDM). */
  onAbrirRanking?: (k: Exclude<ChaveKpi, 'finalizados' | 'apto'>) => void;
}

export const KpisContexto: React.FC<KpisContextoProps> = ({ contexto, soma, onAbrirRanking }) => {
  const fin = soma?.finalizados ?? 0;
  const kpis: { k: ChaveKpi; label: string; value: string; hint: string; cor: string }[] = soma ? [
    { k: 'finalizados', label: 'Finalizados', value: formatarPct(fin, soma.total), hint: `${fin.toLocaleString('pt-BR')} de ${soma.total.toLocaleString('pt-BR')}`, cor: 'text-navy' },
    { k: 'apto', label: 'Aptos', value: formatarPct(soma.apto, fin), hint: fin ? 'dos finalizados' : 'sem IS finalizadas', cor: 'text-green-700' },
    { k: 'inapto', label: 'Inaptos', value: formatarPct(soma.inapto, fin), hint: plural(soma.inapto, 'candidato', 'candidatos'), cor: 'text-wine' },
    { k: 'faltou', label: 'Faltas', value: formatarPct(soma.faltou, fin), hint: plural(soma.faltou, 'candidato', 'candidatos'), cor: 'text-gold-ink' },
    { k: 'idm', label: 'IDM', value: formatarPct(soma.idm, fin), hint: plural(soma.idm, 'candidato', 'candidatos'), cor: 'text-ink-3' },
  ] : [];
  return (
    <div className="px-4 pt-3 pb-4 space-y-3">
      <p className="eyebrow text-blue-700">{contexto}</p>
      {soma && soma.total > 0 && (
        <div className="@container">
          {/* Celular: faixa rolável (nada some — C1/M5); a partir de @2xl, 5 colunas. */}
          <ul className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 snap-x @2xl:grid @2xl:grid-cols-5 @2xl:overflow-visible @2xl:mx-0 @2xl:px-0 @2xl:pb-0" aria-label="Indicadores do filtro">
            {kpis.map(kpi => {
              const ranking = onAbrirRanking && (kpi.k === 'inapto' || kpi.k === 'faltou' || kpi.k === 'idm') && (soma as any)[kpi.k] > 0;
              const corpo = (
                <>
                  <span className="block text-xs font-semibold text-ink-3">{kpi.label}</span>
                  <span className={`block mt-0.5 text-kpi tabular-nums ${kpi.cor}`}>{kpi.value}</span>
                  <span className="block text-xs text-ink-3">{kpi.hint}</span>
                </>
              );
              const base = 'block w-full h-full text-left rounded-lg border border-line px-3 py-2.5';
              return (
                <li key={kpi.k} className="shrink-0 min-w-[8.5rem] snap-start @2xl:min-w-0">
                  {ranking ? (
                    <button
                      type="button"
                      onClick={() => onAbrirRanking!(kpi.k as 'inapto' | 'faltou' | 'idm')}
                      aria-label={`${kpi.label}: ${kpi.value}, ${kpi.hint}. Ver concursos com mais ${kpi.label.toLowerCase()}`}
                      className={`${base} hover:border-navy transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold`}
                    >{corpo}</button>
                  ) : <div className={base}>{corpo}</div>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------------------
// Barra empilhada do card
// -------------------------------------------------------------------------

const SEGMENTOS: { k: keyof ResumoConcurso | 'pendentes'; label: string; cor: string }[] = [
  { k: 'apto', label: 'Aptos', cor: 'bg-green' },
  { k: 'inapto', label: 'Inaptos', cor: 'bg-wine' },
  { k: 'faltou', label: 'Faltas', cor: 'bg-gold' },
  { k: 'idm', label: 'IDM', cor: 'bg-ink-3' },
  { k: 'pendentes', label: 'Pendentes', cor: 'bg-line' },
];

export const BarraResultado: React.FC<{ resumo: ResumoConcurso }> = ({ resumo }) => {
  const pendentes = Math.max(0, resumo.total - resumo.finalizados);
  const valor = (k: typeof SEGMENTOS[number]['k']) => (k === 'pendentes' ? pendentes : resumo[k]);
  const descricao = SEGMENTOS.map(s => `${valor(s.k)} ${s.label.toLowerCase()}`).join(', ');
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-kpi tabular-nums text-navy">{formatarPct(resumo.finalizados, resumo.total)} <span className="text-sm font-semibold text-ink-3">finalizado</span></span>
        <span className="text-xs text-ink-3 tabular-nums">{resumo.finalizados} de {plural(resumo.total, 'candidato', 'candidatos')}</span>
      </div>
      <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden bg-thead" role="img" aria-label={descricao}>
        {resumo.total > 0 && SEGMENTOS.map(s => {
          const n = valor(s.k);
          return n > 0 ? <span key={s.k} className={`h-full ${s.cor}`} style={{ width: `${(n / resumo.total) * 100}%` }} /> : null;
        })}
      </div>
      <dl className="grid grid-cols-5 gap-1">
        {SEGMENTOS.map(s => (
          <div key={s.k} className="min-w-0">
            <dt className="flex items-center gap-1 text-xs font-semibold text-ink-3 truncate">
              <span className={`w-2 h-2 rounded-sm shrink-0 ${s.cor} ${s.k === 'pendentes' ? 'ring-1 ring-inset ring-ink-5' : ''}`} aria-hidden="true" />
              {s.label}
            </dt>
            <dd className="text-sm font-bold text-navy tabular-nums">{valor(s.k)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

// -------------------------------------------------------------------------
// Card do concurso
// -------------------------------------------------------------------------

interface CardConcursoProps {
  concurso: ConcursoRecord;
  resumo?: ResumoConcurso;
  /** Próximo dia com candidatos (AAAA-MM-DD) e quantos estão agendados nele. */
  proximoDia?: { data: string; total: number } | null;
  itensMenu: ItemMenu[];
  onAbrirPlanilha: () => void;
  /** Concurso Em breve: botão "Abrir concurso" (muda a situação para Em andamento). */
  onAbrirConcurso?: () => void;
}

export const CardConcurso: React.FC<CardConcursoProps> = ({ concurso: c, resumo, proximoDia, itensMenu, onAbrirPlanilha, onAbrirConcurso }) => (
  <Card as="article" padding="none" className="flex flex-col h-full">
    <div className="flex items-start gap-2 pt-4 pl-4 pr-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-ink-3 tabular-nums">{periodoCurto(c)}</p>
        <h3 className="mt-1 text-h3 text-navy">
          {/* C4/C7: o título é o controle que abre a planilha (até 2 linhas, nome completo no tooltip). */}
          <button
            type="button"
            onClick={onAbrirPlanilha}
            title={c.nome}
            className="text-left line-clamp-2 [text-wrap:pretty] hover:underline underline-offset-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >{c.nome}</button>
        </h3>
      </div>
      {itensMenu.length > 0 && <MenuAcoes rotulo={`Ações do concurso ${c.nome}`} itens={itensMenu} size="sm" />}
    </div>
    <div className="px-4 pt-3 pb-4">
      {c.status === 'em_breve' ? (
        <p className="text-sm text-ink">{plural(resumo?.total ?? c.totalCandidatos, 'candidato', 'candidatos')} · sem IS realizadas</p>
      ) : resumo ? (
        <BarraResultado resumo={resumo} />
      ) : (
        <p className="text-sm text-ink-3" role="status">Carregando os resultados…</p>
      )}
    </div>
    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-line">
      <span className="flex items-center gap-1.5 text-sm text-ink min-w-0">
        <span className="material-symbols-outlined text-[18px] text-navy" aria-hidden="true">event</span>
        {proximoDia
          ? <span className="truncate">{rotuloDia(proximoDia.data)} · {plural(proximoDia.total, 'agendado', 'agendados')}</span>
          : <span className="truncate text-ink-3">{c.status === 'encerrado' ? 'Encerrado' : c.status === 'em_breve' && c.periodoInicioISO ? `Inicia ${isoParaBR(c.periodoInicioISO)}` : 'Sem dias agendados'}</span>}
      </span>
      {onAbrirConcurso
        ? <Button variant="secondary" size="sm" icon="play_circle" onClick={onAbrirConcurso}>Abrir concurso</Button>
        : <Button variant="secondary" size="sm" onClick={onAbrirPlanilha} aria-label={`Abrir a planilha de ${c.nome}`}>Abrir planilha</Button>}
    </div>
  </Card>
);

// -------------------------------------------------------------------------
// Próximos dias
// -------------------------------------------------------------------------

interface ProximosDiasProps {
  dias: DiaConcurso[];
  onSelecionarDia: (data: string) => void;
  onVerMes: () => void;
  /** Quantos dias listar (padrão 5). */
  limite?: number;
}

export const ProximosDias: React.FC<ProximosDiasProps> = ({ dias, onSelecionarDia, onVerMes, limite = 5 }) => {
  const hoje = hojeISO();
  const porData = new Map<string, DiaConcurso[]>();
  dias.filter(d => d.data >= hoje && !d.encerrado).forEach(d => porData.set(d.data, [...(porData.get(d.data) ?? []), d]));
  const proximos = [...porData.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, limite);
  const nomeCurto = (nome: string) => nome.split(/\s+[—–-]\s+/)[0];
  return (
    <Card padding="none" as="section" title="Próximos dias" titleAs="h2" actions={<Button variant="ghost" size="sm" onClick={onVerMes}>Ver mês</Button>}>
      {proximos.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-ink-3">Nenhum dia de concurso agendado a partir de hoje.</p>
      ) : (
        <ul>
          {proximos.map(([data, doDia]) => {
            const total = doDia.reduce((s, d) => s + d.total, 0);
            const ehHoje = data === hoje;
            const titulo = doDia.length === 1 ? doDia[0].nome : doDia.map(d => nomeCurto(d.nome)).join(' · ');
            const sub = doDia.length === 1 ? plural(total, 'candidato', 'candidatos') : `${doDia.map(d => d.total).join(' + ')} candidatos`;
            return (
              <li key={data} className="border-t border-line">
                <button
                  type="button"
                  onClick={() => onSelecionarDia(data)}
                  aria-label={`${rotuloDia(data)}, ${isoParaBR(data)}: ${titulo}, ${plural(total, 'candidato', 'candidatos')}. Ver os candidatos do dia`}
                  className="w-full grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 text-left hover:bg-thead transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
                >
                  <span className={`text-center leading-tight rounded-lg py-1 ${ehHoje ? 'bg-navy text-white' : 'bg-thead text-navy'}`} aria-hidden="true">
                    <span className="block text-xs font-semibold uppercase">{DIAS_SEMANA[deISO(data).getDay()]}</span>
                    <span className="block text-h2 font-extrabold tabular-nums">{Number(data.slice(8, 10))}</span>
                  </span>
                  <span className="min-w-0" aria-hidden="true">
                    <span className="block text-sm font-bold text-navy truncate" title={titulo}>{titulo}</span>
                    <span className="block text-xs text-ink-3">{ehHoje ? `Hoje · ${sub}` : sub}</span>
                  </span>
                  <span className="text-sm font-extrabold text-navy tabular-nums" aria-hidden="true">{total}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};
