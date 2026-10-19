// Ficheiro: components/inspecoes/SeletorHorario.tsx
// Escolha de data + horário (slots de 20 min) da entrevista de uma IS para um perito. Mostra só os
// turnos em que o perito atende naquele dia da semana (configuração do Admin) e marca cada slot como
// livre, ocupado (outra IS) ou bloqueado. Fins de semana não têm slots.
import React, { useMemo } from 'react';
import { Field } from '../ui/Field';
import {
  TURNOS, slotsDoTurno, ehDiaUtil, peritoAtendeNoTurno, bloqueioAtinge, chaveSlot, nomeDiaSemana, dataBr, hojeISO,
  type BloqueioAgenda, type ConfigAgenda, type EstadoSlot,
} from '../../utils/inspecoes';

interface Props {
  peritoUid: string;
  /** Data escolhida (AAAA-MM-DD). */
  data: string;
  onData: (data: string) => void;
  /** Horário escolhido (hh:mm). */
  hora: string;
  onHora: (hora: string) => void;
  config: ConfigAgenda;
  bloqueios: BloqueioAgenda[];
  /** Chaves de slot ocupadas por outras IS (ver chaveSlot). */
  ocupados: Set<string>;
  erro?: string;
}

export const estadoDoSlot = (
  peritoUid: string, data: string, hhmm: string, turnoAtende: boolean,
  bloqueios: BloqueioAgenda[], ocupados: Set<string>,
): EstadoSlot => {
  if (!turnoAtende) return 'fora';
  if (bloqueios.some(b => bloqueioAtinge(b, peritoUid, data, hhmm))) return 'bloqueado';
  if (ocupados.has(chaveSlot(peritoUid, `${data}T${hhmm}`))) return 'ocupado';
  return 'livre';
};

export const SeletorHorario: React.FC<Props> = ({ peritoUid, data, onData, hora, onHora, config, bloqueios, ocupados, erro }) => {
  const diaUtil = !!data && ehDiaUtil(data);
  const turnos = useMemo(() => TURNOS.map(t => ({
    ...t,
    atende: !!data && diaUtil && peritoAtendeNoTurno(config, peritoUid, data, t.id),
    slots: slotsDoTurno(t.id).map(hhmm => ({ hhmm, estado: estadoDoSlot(peritoUid, data, hhmm, !!data && diaUtil && peritoAtendeNoTurno(config, peritoUid, data, t.id), bloqueios, ocupados) })),
  })), [config, peritoUid, data, diaUtil, bloqueios, ocupados]);

  const algumTurno = turnos.some(t => t.atende);
  const livres = turnos.reduce((n, t) => n + t.slots.filter(s => s.estado === 'livre').length, 0);

  return (
    <div className="space-y-3">
      <Field label="Data da entrevista" error={!data ? erro : undefined}>
        {a => <input {...a} type="date" min={hojeISO()} value={data} onChange={e => { onData(e.target.value); onHora(''); }} />}
      </Field>

      {data && !diaUtil && <p className="text-xs font-semibold text-wine" role="status">{nomeDiaSemana(data)} não tem expediente de IS. Escolha um dia útil.</p>}
      {data && diaUtil && !peritoUid && <p className="text-xs text-ink-3" role="status">Escolha o perito para ver os horários.</p>}
      {data && diaUtil && peritoUid && !algumTurno && (
        <p className="text-xs font-semibold text-wine" role="status">O perito não atende em {nomeDiaSemana(data)} ({dataBr(data)}). O Admin define os turnos de cada perito em "Turnos dos peritos".</p>
      )}

      {data && diaUtil && peritoUid && algumTurno && (
        <div role="group" aria-label="Horários disponíveis" aria-invalid={erro && data ? true : undefined} className="space-y-3">
          {turnos.filter(t => t.atende).map(t => (
            <div key={t.id}>
              <p className="text-xs font-semibold text-ink-3 mb-1">{t.rotulo} · {t.inicio} às {t.fim}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {t.slots.map(s => {
                  const ativo = s.hhmm === hora;
                  const indisponivel = s.estado !== 'livre';
                  return (
                    <button
                      key={s.hhmm}
                      type="button"
                      disabled={indisponivel}
                      aria-pressed={ativo}
                      onClick={() => onHora(s.hhmm)}
                      title={s.estado === 'ocupado' ? 'Ocupado por outra IS' : s.estado === 'bloqueado' ? 'Horário bloqueado' : undefined}
                      className={`min-h-[44px] rounded-lg border text-sm font-bold font-mono transition-colors ${
                        ativo ? 'bg-navy text-white border-navy'
                          : s.estado === 'ocupado' ? 'bg-thead text-ink-4 border-line line-through cursor-not-allowed'
                          : s.estado === 'bloqueado' ? 'bg-wine/10 text-wine border-wine/30 cursor-not-allowed'
                          : 'bg-white text-navy border-line hover:bg-thead'
                      }`}
                    >
                      {s.hhmm}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-xs text-ink-3">{livres} horário{livres !== 1 ? 's' : ''} livre{livres !== 1 ? 's' : ''} · riscado = ocupado · vinho = bloqueado.</p>
          {erro && data && <p role="alert" className="text-xs font-semibold text-wine">{erro}</p>}
        </div>
      )}
    </div>
  );
};
