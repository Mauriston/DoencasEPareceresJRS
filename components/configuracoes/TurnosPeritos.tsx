// Ficheiro: components/configuracoes/TurnosPeritos.tsx
// Grade de turnos dos peritos (Administração › Agenda das IS; só Admin; antes era o botão "Horários" de
// Inspeções de Saúde). Define, por perito e dia útil, em quais turnos (manhã 07:30–12:00, tarde 13:00–17:00) ele
// atende — é o que libera os slots de 20 min no agendamento das IS (config/agendaIS no Firestore). Componente
// controlado: o rascunho e a gravação ficam na subpágina (components/administracao/AgendaIS.tsx), que usa a
// barra de salvar comum da Administração.
import React from 'react';
import { Button } from '../ui/Button';
import { StatusTag } from '../ui/StatusTag';
import type { PeritoIS } from '../../services/peritosIS';
import { DIAS_UTEIS, TURNOS, nomeDiaSemana, type ConfigAgenda, type Turno } from '../../utils/inspecoes';

// 2026-10-19 é uma segunda-feira: serve só para obter o nome do dia pela posição (1 = segunda … 5 = sexta).
export const nomeDia = (dow: number) => nomeDiaSemana(`2026-10-${18 + dow}`);

interface Props {
  peritos: PeritoIS[];
  rascunho: ConfigAgenda;
  salvo: ConfigAgenda;
  onChange: (c: ConfigAgenda) => void;
}

export const TurnosPeritos: React.FC<Props> = ({ peritos, rascunho, salvo, onChange }) => {
  const alternar = (uid: string, dow: number, turno: Turno) => {
    const perito = { ...(rascunho[uid] ?? {}) };
    const dia = { ...(perito[String(dow)] ?? {}) };
    dia[turno] = !dia[turno];
    perito[String(dow)] = dia;
    onChange({ ...rascunho, [uid]: perito });
  };
  const preencherSemana = (uid: string, ligado: boolean) => onChange({
    ...rascunho,
    [uid]: Object.fromEntries(DIAS_UTEIS.map(d => [String(d), { manha: ligado, tarde: ligado }])),
  });
  const alterado = (uid: string) => JSON.stringify(rascunho[uid] ?? {}) !== JSON.stringify(salvo[uid] ?? {});

  if (peritos.length === 0) return <p className="text-sm text-ink-3">Nenhum usuário médico ativo encontrado.</p>;

  return (
    <div className="@container">
      <div className="grid gap-4 @[48rem]:grid-cols-2 items-start">
        {peritos.map(p => (
          <section key={p.uid} aria-label={`Turnos de ${p.usuario}`} className="bg-white border border-line rounded-xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-thead border-b border-line">
              <div className="min-w-0">
                <p className="font-bold text-navy flex flex-wrap items-center gap-2">{p.usuario}{alterado(p.uid) && <StatusTag tone="attention">alterado</StatusTag>}</p>
                <p className="text-xs text-ink-3 break-words">{p.perfil === 'user_medicos_mpi' ? 'Médico MPI' : p.perfil === 'admin' ? 'Admin (JRS)' : 'Médico JRS'}{p.gmail ? ` · ${p.gmail}` : ' · sem Gmail cadastrado (não receberá convite)'}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => preencherSemana(p.uid, true)}>Todos</Button>
                <Button size="sm" variant="ghost" onClick={() => preencherSemana(p.uid, false)}>Limpar</Button>
              </div>
            </div>
            <div className="divide-y divide-line">
              {DIAS_UTEIS.map(dow => (
                <div key={dow} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-1">
                  <span className="w-28 text-sm font-semibold text-ink capitalize">{nomeDia(dow)}</span>
                  {TURNOS.map(t => (
                    <label key={t.id} className="flex items-center gap-2 min-h-[40px] cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 accent-navy" checked={!!rascunho[p.uid]?.[String(dow)]?.[t.id]} onChange={() => alternar(p.uid, dow, t.id)} />
                      <span className="text-sm text-ink">{t.rotulo} <span className="text-xs text-ink-3 tabular-nums">{t.inicio}–{t.fim}</span></span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
