// Ficheiro: components/inspecoes/MiniCalendarioIS.tsx
// Mini calendário do mês para a Home: marca os dias com IS agendadas (ponto azul-marinho = JRS,
// dourado = MPI) e com concursos (ponto vinho; verde quando o dia é encerrado) e lista, abaixo da grade, o que
// ocupa o dia selecionado (começa em hoje): os concursos (turno da manhã inteiro) e as IS.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import { tituloDiaConcurso, type DiaConcurso } from '../../services/agendaConcursos';
import { concursoPath } from '../../config/routes';
import {
  hojeISO, somarDias, inicioDaSemana, inicioDoMes, nomeMes, nomeDiaSemana, deISO, paraISO, dataBr, dataDeEntrevista, horaDeEntrevista,
} from '../../utils/inspecoes';

const nomeCurto = (inspecionado: string): string => inspecionado.replace(/^.*?\d{2}\.\d{4}\.\d{2}\s*/, '') || inspecionado;

export const MiniCalendarioIS: React.FC<{ inspecoes: InspecaoRecord[]; diasConcursos?: DiaConcurso[]; concursosClicaveis?: boolean }> = ({ inspecoes, diasConcursos = [], concursosClicaveis = false }) => {
  const hoje = hojeISO();
  const [mes, setMes] = useState(inicioDoMes(hoje));
  const [selecionado, setSelecionado] = useState(hoje);

  const porDia = useMemo(() => {
    const m = new Map<string, InspecaoRecord[]>();
    inspecoes.forEach(i => {
      if (!i.dataEntrevista || i.status === 'cancelada') return;
      const d = dataDeEntrevista(i.dataEntrevista);
      m.set(d, [...(m.get(d) ?? []), i]);
    });
    m.forEach(l => l.sort((a, b) => a.dataEntrevista.localeCompare(b.dataEntrevista)));
    return m;
  }, [inspecoes]);

  const concursosPorDia = useMemo(() => {
    const m = new Map<string, DiaConcurso[]>();
    diasConcursos.forEach(d => m.set(d.data, [...(m.get(d.data) ?? []), d]));
    return m;
  }, [diasConcursos]);

  const inicio = inicioDaSemana(mes);
  const semanas = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => somarDias(inicio, w * 7 + d)))
    .filter((s, i) => i < 5 || s.some(d => d.slice(0, 7) === mes.slice(0, 7)));

  const mudarMes = (n: number) => { const d = deISO(mes); d.setMonth(d.getMonth() + n, 1); setMes(paraISO(d)); };
  const doDia = porDia.get(selecionado) ?? [];
  const concursosDoDia = concursosPorDia.get(selecionado) ?? [];

  return (
    <div className="px-3 pb-3">
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
          const lista = porDia.get(d) ?? [];
          const foraDoMes = d.slice(0, 7) !== mes.slice(0, 7);
          const ativo = d === selecionado;
          const temJrs = lista.some(i => i.amp === 'JRS');
          const temMpi = lista.some(i => i.amp !== 'JRS');
          const concursos = concursosPorDia.get(d) ?? [];
          return (
            <button
              key={d} type="button" role="gridcell" onClick={() => setSelecionado(d)} aria-pressed={ativo}
              aria-label={`${Number(d.slice(8))} de ${nomeMes(d)}${lista.length ? `, ${lista.length} inspeç${lista.length !== 1 ? 'ões' : 'ão'}` : ''}${concursos.length ? `, ${concursos.length} concurso${concursos.length !== 1 ? 's' : ''}` : ''}`}
              className={`min-h-[40px] flex flex-col items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                ativo ? 'bg-navy text-white' : d === hoje ? 'border border-navy text-navy' : foraDoMes ? 'text-ink-4 hover:bg-thead' : 'text-ink hover:bg-thead'
              }`}
            >
              {Number(d.slice(8))}
              <span className="flex gap-0.5 h-1.5 mt-0.5" aria-hidden="true">
                {temJrs && <span className={`w-1.5 h-1.5 rounded-full ${ativo ? 'bg-white' : 'bg-navy'}`} />}
                {temMpi && <span className="w-1.5 h-1.5 rounded-full bg-gold" />}
                {concursos.length > 0 && <span className={`w-1.5 h-1.5 rounded-full ${concursos.every(c => c.encerrado) ? 'bg-green' : 'bg-wine'}`} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t border-line pt-2">
        <p className="text-xs font-bold text-ink-3 capitalize mb-1">{nomeDiaSemana(selecionado)}, {dataBr(selecionado)}</p>
        {concursosDoDia.length > 0 && (
          <ul className="space-y-1 mb-1" aria-label="Concursos do dia">
            {concursosDoDia.map(c => {
              const corpo = (
                <>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.encerrado ? 'bg-green' : 'bg-wine'}`} aria-hidden="true" />
                  <span className="font-mono font-bold text-navy shrink-0">07:30–12:00</span>
                  <span className="text-ink min-w-0 break-words">{tituloDiaConcurso(c)}{c.encerrado ? ' · encerrado' : ''}</span>
                </>
              );
              return (
                <li key={c.chave}>
                  {concursosClicaveis
                    ? <Link to={concursoPath(c.concursoId)} className="flex items-center gap-2 min-h-[32px] text-sm hover:underline">{corpo}</Link>
                    : <span className="flex items-center gap-2 min-h-[32px] text-sm">{corpo}</span>}
                </li>
              );
            })}
          </ul>
        )}
        {doDia.length === 0 ? (
          concursosDoDia.length === 0 && <p className="text-xs text-ink-3 py-1">Nenhuma IS agendada.</p>
        ) : (
          <ul className="space-y-1">
            {doDia.slice(0, 5).map(i => (
              <li key={i.id}>
                <Link to="/inspecoes" className="flex items-center gap-2 min-h-[32px] text-sm hover:underline">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${i.amp === 'JRS' ? 'bg-navy' : 'bg-gold'}`} aria-hidden="true" />
                  <span className="font-mono font-bold text-navy shrink-0">{horaDeEntrevista(i.dataEntrevista)}</span>
                  <span className="truncate text-ink">{nomeCurto(i.inspecionado)}</span>
                </Link>
              </li>
            ))}
            {doDia.length > 5 && <li className="text-xs text-ink-3">+{doDia.length - 5} mais</li>}
          </ul>
        )}
        <Link to="/inspecoes" className="inline-flex items-center min-h-[44px] text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Abrir calendário completo</Link>
      </div>
    </div>
  );
};
