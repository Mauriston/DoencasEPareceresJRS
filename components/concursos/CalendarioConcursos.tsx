// Ficheiro: components/concursos/CalendarioConcursos.tsx
// Calendário do mês da página Concursos (visão em cards, desktop): marca só os dias com candidatos agendados de
// concursos Em andamento / Em breve (ponto vinho; verde quando todos do dia estão finalizados). O clique num dia
// abre a tabela de candidatos daquele dia (agrupada por concurso).
import React, { useMemo, useState } from 'react';
import type { DiaConcurso } from '../../services/agendaConcursos';
import { hojeISO, somarDias, inicioDaSemana, inicioDoMes, nomeMes, deISO, paraISO } from '../../utils/inspecoes';

interface Props {
  dias: DiaConcurso[];
  onSelecionarDia: (data: string) => void;
}

export const CalendarioConcursos: React.FC<Props> = ({ dias, onSelecionarDia }) => {
  const hoje = hojeISO();
  const [mes, setMes] = useState(inicioDoMes(hoje));

  const porDia = useMemo(() => {
    const m = new Map<string, DiaConcurso[]>();
    dias.forEach(d => m.set(d.data, [...(m.get(d.data) ?? []), d]));
    return m;
  }, [dias]);

  const inicio = inicioDaSemana(mes);
  const semanas = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => somarDias(inicio, w * 7 + d)))
    .filter((s, i) => i < 5 || s.some(d => d.slice(0, 7) === mes.slice(0, 7)));
  const mudarMes = (n: number) => { const d = deISO(mes); d.setMonth(d.getMonth() + n, 1); setMes(paraISO(d)); };

  return (
    <section aria-label="Calendário dos concursos" className="bg-white rounded-xl border border-line p-4">
      <h2 className="text-h3 font-bold text-navy mb-1">Dias de concurso</h2>
      <div className="flex items-center justify-between mb-1">
        <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior" className="w-11 h-11 flex items-center justify-center rounded-lg text-navy hover:bg-thead"><span className="material-symbols-outlined text-[22px]" aria-hidden="true">chevron_left</span></button>
        <p className="text-sm font-bold text-navy first-letter:uppercase" aria-live="polite">{nomeMes(mes)} de {mes.slice(0, 4)}</p>
        <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês" className="w-11 h-11 flex items-center justify-center rounded-lg text-navy hover:bg-thead"><span className="material-symbols-outlined text-[22px]" aria-hidden="true">chevron_right</span></button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-ink-3 uppercase" aria-hidden="true">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => <span key={i} className="py-1">{l}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5" role="grid" aria-label={`Calendário de ${nomeMes(mes)}`}>
        {semanas.flat().map(d => {
          const concursos = porDia.get(d) ?? [];
          const foraDoMes = d.slice(0, 7) !== mes.slice(0, 7);
          const tem = concursos.length > 0;
          const rotulo = `${Number(d.slice(8))} de ${nomeMes(d)}${tem ? `, ${concursos.map(c => c.nome).join(', ')}` : ''}`;
          const cor = `min-h-[44px] flex flex-col items-center justify-center rounded-lg text-sm font-semibold ${d === hoje ? 'border border-navy' : ''}`;
          return tem ? (
            <button key={d} type="button" role="gridcell" onClick={() => onSelecionarDia(d)} aria-label={rotulo}
              className={`${cor} text-navy hover:bg-thead transition-colors`}>
              {Number(d.slice(8))}
              <span className="flex gap-0.5 h-1.5 mt-0.5" aria-hidden="true">
                <span className={`w-1.5 h-1.5 rounded-full ${concursos.every(c => c.encerrado) ? 'bg-green' : 'bg-wine'}`} />
              </span>
            </button>
          ) : (
            <span key={d} role="gridcell" aria-label={rotulo} className={`${cor} ${foraDoMes ? 'text-ink-4' : 'text-ink-3'}`}>{Number(d.slice(8))}</span>
          );
        })}
      </div>
      <p className="text-xs text-ink-3 mt-2">Clique num dia marcado para ver os candidatos agendados.</p>
    </section>
  );
};
