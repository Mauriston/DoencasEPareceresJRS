// Ficheiro: components/inspecoes/CalendarioDisponibilidade.tsx
// Mini calendário de escolha de data: só os dias com disponibilidade (segundo `disponivel`) podem ser
// escolhidos; os demais ficam esmaecidos. Navega por mês.
import React, { useState } from 'react';
import { hojeISO, somarDias, inicioDaSemana, inicioDoMes, nomeMes, deISO, paraISO } from '@/utils/inspecoes';

interface Props {
  valor: string;
  onChange: (data: string) => void;
  /** Dia (AAAA-MM-DD) que pode ser escolhido. */
  disponivel: (data: string) => boolean;
  /** Mês exibido ao abrir (qualquer data do mês). */
  mesInicial?: string;
}

export const CalendarioDisponibilidade: React.FC<Props> = ({ valor, onChange, disponivel, mesInicial }) => {
  const hoje = hojeISO();
  const [mes, setMes] = useState(inicioDoMes(valor || mesInicial || hoje));
  const mudarMes = (n: number) => { const d = deISO(mes); d.setMonth(d.getMonth() + n, 1); setMes(paraISO(d)); };
  const inicio = inicioDaSemana(mes);
  const semanas = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => somarDias(inicio, w * 7 + d)))
    .filter((s, i) => i < 5 || s.some(d => d.slice(0, 7) === mes.slice(0, 7)));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior" className="w-11 h-11 flex items-center justify-center rounded-lg text-navy hover:bg-thead"><span className="material-symbols-outlined text-[22px]" aria-hidden="true">chevron_left</span></button>
        <p className="text-sm font-bold text-navy first-letter:uppercase" aria-live="polite">{nomeMes(mes)} de {mes.slice(0, 4)}</p>
        <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês" className="w-11 h-11 flex items-center justify-center rounded-lg text-navy hover:bg-thead"><span className="material-symbols-outlined text-[22px]" aria-hidden="true">chevron_right</span></button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-ink-3 uppercase" aria-hidden="true">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => <span key={i} className="py-1">{l}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5" role="group" aria-label={`Datas de ${nomeMes(mes)}`}>
        {semanas.flat().map(d => {
          const foraDoMes = d.slice(0, 7) !== mes.slice(0, 7);
          const livre = !foraDoMes && d >= hoje && disponivel(d);
          const ativo = d === valor;
          return (
            <button
              key={d} type="button" disabled={!livre} aria-pressed={ativo} onClick={() => onChange(d)}
              aria-label={`${Number(d.slice(8))} de ${nomeMes(d)}${livre ? ', disponível' : ', indisponível'}`}
              className={`min-h-[40px] rounded-lg text-sm font-semibold transition-colors ${
                ativo ? 'bg-navy text-white' : livre ? 'bg-green/15 text-green-700 hover:bg-green/25' : foraDoMes ? 'text-transparent cursor-default' : 'text-ink-4 cursor-not-allowed'
              } ${d === hoje && !ativo ? 'ring-1 ring-navy' : ''}`}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-ink-3"><span className="inline-block w-3 h-3 rounded-sm bg-green/30 align-middle mr-1" aria-hidden="true" />Datas com horário livre</p>
    </div>
  );
};
