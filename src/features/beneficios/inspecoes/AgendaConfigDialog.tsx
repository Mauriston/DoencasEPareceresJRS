// Ficheiro: components/inspecoes/AgendaConfigDialog.tsx
// "Turnos dos peritos" (só Admin): define, por perito e dia da semana, em quais turnos (manhã
// 07:30–12:00, tarde 13:00–17:00) ele atende. É essa configuração que libera os slots de 20 min
// no agendamento das IS (config/agendaIS no Firestore).
import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { salvarConfigAgenda } from '@/services/firestoreInspecoes';
import type { PeritoIS } from '@/services/peritosIS';
import { DIAS_UTEIS, TURNOS, nomeDiaSemana, type ConfigAgenda, type Turno } from '@/utils/inspecoes';

// 2026-10-19 é uma segunda-feira: serve só para obter o nome do dia pela posição (1 = segunda … 5 = sexta).
const nomeDia = (dow: number) => nomeDiaSemana(`2026-10-${18 + dow}`);

interface Props {
  peritos: PeritoIS[];
  config: ConfigAgenda;
  onClose: () => void;
  onSalvo: () => void;
}

export const AgendaConfigDialog: React.FC<Props> = ({ peritos, config, onClose, onSalvo }) => {
  const [rascunho, setRascunho] = useState<ConfigAgenda>(() => JSON.parse(JSON.stringify(config)));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const alternar = (uid: string, dow: number, turno: Turno) => setRascunho(r => {
    const perito = { ...(r[uid] ?? {}) };
    const dia = { ...(perito[String(dow)] ?? {}) };
    dia[turno] = !dia[turno];
    perito[String(dow)] = dia;
    return { ...r, [uid]: perito };
  });

  const preencherSemana = (uid: string, ligado: boolean) => setRascunho(r => ({
    ...r,
    [uid]: Object.fromEntries(DIAS_UTEIS.map(d => [String(d), { manha: ligado, tarde: ligado }])),
  }));

  const salvar = async () => {
    setSalvando(true); setErro('');
    try { await salvarConfigAgenda(rascunho); onSalvo(); }
    catch (e: any) { setErro(e?.message || 'Não foi possível salvar a configuração.'); setSalvando(false); }
  };

  return (
    <Dialog
      title="Turnos dos peritos"
      icon="schedule"
      size="xl"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button icon="save" loading={salvando} onClick={salvar}>Salvar turnos</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="text-ink-3">Marque os turnos em que cada perito atende. Manhã: 07:30–12:00 · Tarde: 13:00–17:00, em slots de 20 minutos. Só esses horários ficam disponíveis para agendar IS.</p>
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
        {peritos.length === 0 && <p className="text-ink-3">Nenhum usuário médico ativo encontrado.</p>}
        {peritos.map(p => (
          <section key={p.uid} aria-label={`Turnos de ${p.usuario}`} className="border border-line rounded-xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-thead border-b border-line">
              <div>
                <p className="font-bold text-navy">{p.usuario}</p>
                <p className="text-xs text-ink-3">{p.perfil === 'user_medicos_mpi' ? 'Médico MPI' : p.perfil === 'admin' ? 'Admin (JRS)' : 'Médico JRS'}{p.gmail ? ` · ${p.gmail}` : ' · sem Gmail cadastrado (não receberá convite)'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => preencherSemana(p.uid, true)}>Todos os turnos</Button>
                <Button variant="ghost" onClick={() => preencherSemana(p.uid, false)}>Limpar</Button>
              </div>
            </div>
            <div className="divide-y divide-line">
              {DIAS_UTEIS.map(dow => (
                <div key={dow} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-1">
                  <span className="w-28 text-sm font-semibold text-ink capitalize">{nomeDia(dow)}</span>
                  {TURNOS.map(t => (
                    <label key={t.id} className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 accent-navy" checked={!!rascunho[p.uid]?.[String(dow)]?.[t.id]} onChange={() => alternar(p.uid, dow, t.id)} />
                      <span className="text-sm text-ink">{t.rotulo} <span className="text-xs text-ink-3">{t.inicio}–{t.fim}</span></span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Dialog>
  );
};
