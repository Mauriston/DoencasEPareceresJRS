// Ficheiro: components/ui/statusTheme.tsx
// Mapeamento ÚNICO de status → cor (auditoria F39/F40/F51). Antes, o mesmo
// status aparecia com três cores diferentes (fundo do card, ícone da tabela e
// chip da planilha) e seis paletas Tailwind para seis status.
//
//  Candidato (resultado da IS)          Concurso (ciclo de vida)
//   Apto ............ verde               Em andamento .. navy cheio
//   Inapto .......... vinho               Em breve ....... navy contornado
//   Faltou .......... ouro (atenção)      Encerrado ...... cinza
//   Insuf. documental ouro (atenção)
//   Pendente · Reagendado · Sem status: neutro
//
// Verde e vinho ficam reservados ao RESULTADO do candidato: o concurso não os
// usa. O status é sempre escrito por extenso ao lado da cor.
import React from 'react';
import { StatusTag, type StatusTone } from './StatusTag';
import type { ConcursoStatus } from '../../services/firestoreConcursos';

export interface StatusVisual {
  label: string;
  tone: StatusTone;
  /** Cor do texto (select/linha) sobre fundo branco. */
  text: string;
  /** Cor do ponto indicador. */
  dot: string;
}

const NEUTRO = { tone: 'neutral' as StatusTone, text: 'text-ink-3', dot: 'bg-ink-4' };
const SUCESSO = { tone: 'success' as StatusTone, text: 'text-green-700', dot: 'bg-green' };
const VINHO = { tone: 'danger' as StatusTone, text: 'text-wine', dot: 'bg-wine' };
const ATENCAO = { tone: 'attention' as StatusTone, text: 'text-gold-ink', dot: 'bg-gold' };

export const CANDIDATO_STATUS: Record<string, StatusVisual> = {
  APTO: { label: 'Apto', ...SUCESSO },
  INAPTO: { label: 'Inapto', ...VINHO },
  FALTOU: { label: 'Faltou', ...ATENCAO },
  'INSUF DOCUMENTAL': { label: 'Insuf. documental', ...ATENCAO },
  Pendente: { label: 'Pendente', ...NEUTRO },
  Reagendado: { label: 'Reagendado', ...NEUTRO },
};

export const SEM_STATUS: StatusVisual = { label: 'Sem status', ...NEUTRO };

export const getCandidatoStatusVisual = (status: string): StatusVisual => CANDIDATO_STATUS[status] ?? SEM_STATUS;

export const CandidatoStatusTag: React.FC<{ status: string }> = ({ status }) => {
  const v = getCandidatoStatusVisual(status);
  return <StatusTag tone={v.tone}>{v.label}</StatusTag>;
};

export const CONCURSO_STATUS_LABEL: Record<ConcursoStatus, string> = {
  em_andamento: 'Em andamento',
  em_breve: 'Em breve',
  encerrado: 'Encerrado',
};

const CONCURSO_TONE: Record<ConcursoStatus, StatusTone> = {
  em_andamento: 'navy',
  em_breve: 'navyOutline',
  encerrado: 'muted',
};

export const ConcursoStatusTag: React.FC<{ status: ConcursoStatus; className?: string }> = ({ status, className }) => (
  <StatusTag tone={CONCURSO_TONE[status]} dot={status === 'encerrado'} className={className}>
    {CONCURSO_STATUS_LABEL[status]}
  </StatusTag>
);

interface StatusSelectProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
  /** Fundo amarelo de alerta (ex.: IS triada aguardando o status, para o MPI). */
  destaque?: boolean;
}

/** Select de status NEUTRO: a cor fica só no ponto e no texto, nunca no fundo (salvo `destaque`). */
export const StatusSelect: React.FC<StatusSelectProps> = ({ value, options, onChange, className = '', destaque = false }) => {
  const v = getCandidatoStatusVisual(value);
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <span aria-hidden="true" className={`absolute left-2.5 w-2 h-2 rounded-full pointer-events-none ${v.dot}`} />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Status do candidato"
        className={`w-full pl-7 pr-2 py-1.5 text-sm font-bold rounded-lg border focus:outline-none focus:border-navy cursor-pointer ${destaque ? 'bg-gold-300 border-gold-500' : 'bg-white border-line'} ${v.text}`}
      >
        {options.map(o => <option key={o.value} value={o.value} className="text-ink">{o.label}</option>)}
      </select>
    </span>
  );
};
