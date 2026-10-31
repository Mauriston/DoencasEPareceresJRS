// Ficheiro: components/concursos/compartilhado.tsx
// Peças comuns às telas de Concursos: opções de status, datas em DD/MM/AAAA, interpretação da
// mensagem administrativa, tipo do diálogo de confirmação e o calendário de agendamento.
import React, { useMemo, useState } from 'react';
import { type DataAgendamentoInfo } from '../../services/firestoreConcursos';
import { type MensagemExtraida } from '../../services/driveConcursos';
import { limparRuidoPaginacao, extrairCandidatosComAgendamento, extrairPeriodoJRS, extrairNomeConcurso, formatarChaveData, type CabecalhoMensagem, type CandidatoBasico } from '../../utils/concursosUtils';

export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Sem status' },
  { value: 'Pendente', label: 'Pendente' },
  { value: 'APTO', label: 'Apto' },
  { value: 'INAPTO', label: 'Inapto' },
  { value: 'FALTOU', label: 'Faltou' },
  { value: 'INSUF DOCUMENTAL', label: 'Insuf. Documental' },
  { value: 'Reagendado', label: 'Reagendado' },
];

export const parseDataBR = (str: string): Date | null => {
  if (!str) return null;
  const partes = str.split('/');
  if (partes.length !== 3) return null;
  const [d, m, y] = partes.map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
};

export const isoParaBR = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Converte o JSON lido pelo Gemini nas estruturas do app. A lista de candidatos vem do Gemini; se ele não
 * devolver nenhuma (PDF ilegível, formato fora do comum), cai na extração por regras sobre o texto transcrito.
 */
export const interpretarMensagem = (m: MensagemExtraida): {
  cabecalho: CabecalhoMensagem; nomeConcurso: string; candidatos: CandidatoBasico[];
  modoAgendamento: boolean; periodo: { inicio: string; fim: string } | null; texto: string;
} => {
  const textoLimpo = limparRuidoPaginacao(m.texto);
  const cabecalho: CabecalhoMensagem = {
    dataHora: m.dataHora, sender: m.remetente, recipient: m.destinatario, info: m.info, subject: m.assunto,
    texto: textoLimpo,
    purpose: m.mensagemDeAgendamento ? 'Agendamento' : (/candidatos\s+abaixo\s+relacionados/i.test(textoLimpo) || m.candidatos.length > 0 ? 'Apresentação' : 'Outros'),
  };

  let candidatos: CandidatoBasico[] = m.candidatos
    .filter(c => /^\d{5,7}-\d$/.test(c.matricula) && c.nome)
    .map(c => ({ id: c.matricula, nome: c.nome, ...(c.dataAgendamento ? { dataAgendamento: c.dataAgendamento } : {}) }));
  let modoAgendamento = m.mensagemDeAgendamento && candidatos.some(c => c.dataAgendamento);
  let periodo = m.periodoJRS;

  if (candidatos.length === 0 && textoLimpo) {
    const mDtg = m.dataHora.match(/\/([A-ZÇ]{3})\/(\d{2,4})$/);
    const anoMsg = mDtg ? (mDtg[2].length === 2 ? 2000 + parseInt(mDtg[2], 10) : parseInt(mDtg[2], 10)) : undefined;
    const mesMsg = mDtg ? ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'].indexOf(mDtg[1]) : -1;
    const extraido = extrairCandidatosComAgendamento(textoLimpo, { remetente: m.remetente, anoPadrao: anoMsg, mesReferencia: mesMsg >= 0 ? mesMsg : undefined });
    candidatos = extraido.candidatos;
    modoAgendamento = extraido.modoAgendamento;
    if (modoAgendamento) cabecalho.purpose = 'Agendamento';
  }
  if (!periodo && textoLimpo) {
    const p = extrairPeriodoJRS(textoLimpo);
    if (p) periodo = { inicio: formatarChaveData(p.inicio), fim: formatarChaveData(p.fim) };
  }
  // Apresentação: ordem alfabética (o agendamento automático distribui os candidatos nessa ordem).
  if (!modoAgendamento) candidatos = [...candidatos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  return { cabecalho, nomeConcurso: m.nomeConcurso || extrairNomeConcurso(m.assunto), candidatos, modoAgendamento, periodo, texto: textoLimpo };
};

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  /** Ação destrutiva: confirmação contornada em vinho. */
  destrutivo?: boolean;
}

export interface CalendarioAgendamentoProps {
  datas: DataAgendamentoInfo[];
  onSelect: (dataISO: string) => void;
  loading?: boolean;
}

export const CalendarioAgendamento: React.FC<CalendarioAgendamentoProps> = ({ datas, onSelect, loading }) => {
  const mapaDatas = useMemo(() => {
    const mapa: Record<string, DataAgendamentoInfo> = {};
    datas.forEach(d => { mapa[d.data] = d; });
    return mapa;
  }, [datas]);

  const mesInicial = datas.length ? new Date(datas[0].data + 'T00:00:00') : new Date();
  const [mesAtual, setMesAtual] = useState(new Date(mesInicial.getFullYear(), mesInicial.getMonth(), 1));

  const primeiroDiaSemana = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1).getDay();
  const diasNoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate();

  const celulas: (string | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let dia = 1; dia <= diasNoMes; dia++) {
    celulas.push(formatarChaveData(new Date(mesAtual.getFullYear(), mesAtual.getMonth(), dia)));
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-ink-3">
        <span className="material-symbols-outlined animate-spin text-[28px] text-navy">progress_activity</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setMesAtual(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} aria-label="Mês anterior" className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-thead text-ink-3">
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        <span className="text-sm font-bold text-navy uppercase">
          {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={() => setMesAtual(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} aria-label="Próximo mês" className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-thead text-ink-3">
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
          <div key={d} className="text-center text-xs font-bold text-ink-3">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celulas.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const info = mapaDatas[iso];
          const dia = Number(iso.split('-')[2]);
          if (!info) {
            return <div key={i} className="aspect-square flex items-center justify-center text-sm text-ink-4 rounded-lg">{dia}</div>;
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(iso)}
              title={`${info.dataFormatada} — ${info.quantidadeAgendados} agendado(s)`}
              className="aspect-square min-h-[44px] flex flex-col items-center justify-center rounded-lg text-sm font-bold bg-navy text-white border border-navy hover:bg-navy-hover transition-colors cursor-pointer"
            >
              <span>{dia}</span>
              <span className="text-xs font-semibold">{info.quantidadeAgendados}</span>
            </button>
          );
        })}
      </div>

      {datas.length === 0 && <p className="text-sm text-ink-3 text-center py-4">Nenhuma data de agendamento configurada.</p>}
    </div>
  );
};
