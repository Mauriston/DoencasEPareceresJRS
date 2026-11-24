// Ficheiro: components/inspecoes/CalendarioDisponibilidade.tsx
// Mini calendário de escolha de data: só os dias com disponibilidade (segundo `disponivel`) podem ser
// escolhidos; os demais ficam esmaecidos. Navega por mês. Com `contagem`, cada dia disponível mostra
// quantas IS já estão agendadas nele.
import React from 'react';
import { hojeISO, nomeMes } from '../../utils/inspecoes';
import { useCalendarioPeriodo } from '../../hooks/useCalendarioPeriodo';

interface Props {
  valor: string;
  onChange: (data: string) => void;
  /** Dia (AAAA-MM-DD) que pode ser escolhido. */
  disponivel: (data: string) => boolean;
  /** Mês exibido ao abrir (qualquer data do mês). */
  mesInicial?: string;
  /** Nº de IS já agendadas no dia, exibido nos dias disponíveis. */
  contagem?: (data: string) => number;
  /** Libera dias anteriores a hoje (só o Admin, ao cadastrar IS retroativa). */
  permitirDataPassada?: boolean;
}

export const CalendarioDisponibilidade: React.FC<Props> = ({ valor, onChange, disponivel, mesInicial, contagem, permitirDataPassada = false }) => {
  const hoje = hojeISO();
  // Celular: uma semana por vez; desktop: o mês inteiro.
  const { dias, referencia: mes, mudar: mudarMes, foraDoPeriodo } = useCalendarioPeriodo(valor || mesInicial || hoje);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <button type="button" onClick={() => mudarMes(-1)} aria-label="Período anterior" className="w-11 h-11 flex items-center justify-center rounded-lg text-navy hover:bg-thead"><span className="material-symbols-outlined text-[22px]" aria-hidden="true">chevron_left</span></button>
        <p className="text-sm font-bold text-navy first-letter:uppercase" aria-live="polite">{nomeMes(mes)} de {mes.slice(0, 4)}</p>
        <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo período" className="w-11 h-11 flex items-center justify-center rounded-lg text-navy hover:bg-thead"><span className="material-symbols-outlined text-[22px]" aria-hidden="true">chevron_right</span></button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-ink-3 uppercase" aria-hidden="true">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => <span key={i} className="py-1">{l}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5" role="group" aria-label={`Datas de ${nomeMes(mes)}`}>
        {dias.map(d => {
          const foraDoMes = foraDoPeriodo(d);
          const livre = !foraDoMes && (permitirDataPassada || d >= hoje) && disponivel(d);
          const ativo = d === valor;
          const n = livre && contagem ? contagem(d) : null;
          return (
            <button
              key={d} type="button" disabled={!livre} aria-pressed={ativo} onClick={() => onChange(d)}
              aria-label={`${Number(d.slice(8))} de ${nomeMes(d)}${livre ? ', disponível' : ', indisponível'}${n !== null ? `, ${n} IS agendada${n !== 1 ? 's' : ''}` : ''}`}
              className={`min-h-[44px] flex flex-col items-center justify-center rounded-lg text-sm font-semibold leading-none transition-colors ${
                ativo ? 'bg-navy text-white' : livre ? 'bg-green/15 text-green-700 hover:bg-green/25' : foraDoMes ? 'text-transparent cursor-default' : 'text-ink-4 cursor-not-allowed'
              } ${d === hoje && !ativo ? 'ring-1 ring-navy' : ''}`}
            >
              {Number(d.slice(8))}
              {n !== null && (
                <span aria-hidden="true" className={`mt-0.5 min-w-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums leading-[14px] ${ativo ? 'bg-white text-navy' : n > 0 ? 'bg-navy text-white' : 'bg-white text-ink-3 border border-line'}`}>{n}</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-ink-3"><span className="inline-block w-3 h-3 rounded-sm bg-green/30 align-middle mr-1" aria-hidden="true" />Datas com horário livre{contagem ? ' · o número é a quantidade de IS já agendadas no dia' : ''}</p>
    </div>
  );
};
