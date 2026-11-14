// Ficheiro: components/home/CalendarioMes.tsx
// Calendário do mês da Início (coluna de apoio, auditoria v3, 2a/H5/M8). Clicar num dia mostra a agenda daquele
// dia no card "Agenda" (o estado do dia escolhido fica na Home). Marcas por TIPO, não só por cor: IS JRS (ponto
// navy), IS MPI (ponto ouro) e concurso (quadrado azul; verde quando concluído) — com legenda. Rótulos de dia
// não ambíguos (Seg Ter Qua Qui Sex Sáb Dom), no mínimo 12 px, números em tabular-nums.
import React, { useState } from 'react';
import { Secao } from './Secao';
import { IconButton } from '../ui/IconButton';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import type { DiaConcurso } from '../../services/agendaConcursos';
import { marcasDoDia } from '../../utils/agendaHome';
import { somarDias, inicioDaSemana, inicioDoMes, nomeMes } from '../../utils/inspecoes';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

interface Props {
  hoje: string;
  selecionado: string;
  onSelecionar: (dia: string) => void;
  inspecoes: InspecaoRecord[];
  diasConcursos: DiaConcurso[];
}

const Legenda: React.FC = () => (
  <ul className="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-xs text-ink-3" aria-label="Legenda do calendário">
    <li className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-navy" aria-hidden="true" />IS JRS</li>
    <li className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gold" aria-hidden="true" />IS MPI</li>
    <li className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-[2px] bg-blue" aria-hidden="true" />Concurso</li>
    <li className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-[2px] bg-green" aria-hidden="true" />Concurso concluído</li>
  </ul>
);

export const CalendarioMes: React.FC<Props> = ({ hoje, selecionado, onSelecionar, inspecoes, diasConcursos }) => {
  const [mes, setMes] = useState(inicioDoMes(selecionado || hoje));
  const ano = Number(mes.slice(0, 4));
  const mudarMes = (n: number) => {
    const total = ano * 12 + (Number(mes.slice(5, 7)) - 1) + n;
    setMes(`${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`);
  };

  const inicio = inicioDaSemana(mes);
  // 5 semanas; a 6ª só quando o mês ainda tem dias nela.
  const dias = Array.from({ length: 42 }, (_, i) => somarDias(inicio, i))
    .filter((_, i) => i < 35 || Array.from({ length: 7 }, (__, k) => somarDias(inicio, 35 + k)).some(x => x.slice(0, 7) === mes.slice(0, 7)));
  const tituloMes = `${nomeMes(mes).charAt(0).toUpperCase()}${nomeMes(mes).slice(1)} de ${ano}`;

  return (
    <Secao
      id="home-calendario" titulo={tituloMes}
      acao={(
        <span className="flex gap-1">
          <IconButton icon="chevron_left" label="Mês anterior" variant="ghost" size="sm" onClick={() => mudarMes(-1)} />
          <IconButton icon="chevron_right" label="Próximo mês" variant="ghost" size="sm" onClick={() => mudarMes(1)} />
        </span>
      )}
    >
      <div className="px-3 pb-3">
      <Legenda />
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-ink-3" aria-hidden="true">
        {DIAS.map(d => <span key={d} className="py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 mt-1" role="group" aria-label={`Calendário de ${tituloMes}`}>
        {dias.map(d => {
          const fora = d.slice(0, 7) !== mes.slice(0, 7);
          const ativo = d === selecionado;
          const ehHoje = d === hoje;
          const m = marcasDoDia(d, inspecoes, diasConcursos);
          const marcas = [m.jrs && 'inspeções JRS', m.mpi && 'inspeções MPI', m.concurso && (m.concursoConcluido ? 'concurso concluído' : 'concurso')].filter(Boolean).join(', ');
          return (
            <button
              key={d} type="button" aria-pressed={ativo} onClick={() => onSelecionar(d)}
              aria-label={`${Number(d.slice(8))} de ${nomeMes(d)}${ehHoje ? ' (hoje)' : ''}${marcas ? `, com ${marcas}` : ''}`}
              className={`min-h-[40px] rounded-lg flex flex-col items-center justify-center text-sm font-semibold tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
                ativo ? 'bg-navy text-white' : ehHoje ? 'text-navy ring-1 ring-inset ring-navy hover:bg-thead' : fora ? 'text-ink-4 hover:bg-thead' : 'text-ink hover:bg-thead'
              }`}
            >
              {Number(d.slice(8))}
              <span className="flex gap-0.5 h-1.5 mt-0.5" aria-hidden="true">
                {m.jrs && <span className={`w-1.5 h-1.5 rounded-full ${ativo ? 'bg-white' : 'bg-navy'}`} />}
                {m.mpi && <span className="w-1.5 h-1.5 rounded-full bg-gold" />}
                {m.concurso && <span className={`w-1.5 h-1.5 rounded-[1px] ${m.concursoConcluido ? 'bg-green' : ativo ? 'bg-white' : 'bg-blue'}`} />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 pt-3 border-t border-line text-xs text-ink-3">Escolha um dia para ver a agenda daquele dia.</p>
      </div>
    </Secao>
  );
};
