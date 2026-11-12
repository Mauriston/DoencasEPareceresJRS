// Ficheiro: components/configuracoes/TurnosPeritos.tsx
// Seção "Agenda das IS — turnos dos peritos" da página Configurações (só Admin; antes era o botão "Horários" de
// Inspeções de Saúde). Define, por perito e dia útil, em quais turnos (manhã 07:30–12:00, tarde 13:00–17:00) ele
// atende — é o que libera os slots de 20 min no agendamento das IS (config/agendaIS no Firestore). Tem leitura
// em tempo real e "Salvar turnos" próprios (independentes dos e-mails, que gravam config/emails).
import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { observarConfigAgenda, salvarConfigAgenda } from '../../services/firestoreInspecoes';
import { carregarPeritos, type PeritoIS } from '../../services/peritosIS';
import { DIAS_UTEIS, TURNOS, nomeDiaSemana, type ConfigAgenda, type Turno } from '../../utils/inspecoes';

// 2026-10-19 é uma segunda-feira: serve só para obter o nome do dia pela posição (1 = segunda … 5 = sexta).
const nomeDia = (dow: number) => nomeDiaSemana(`2026-10-${18 + dow}`);

export const TurnosPeritos: React.FC<{ onAviso: (msg: string, tom?: 'success' | 'error') => void }> = ({ onAviso }) => {
  const [peritos, setPeritos] = useState<PeritoIS[] | null>(null);
  const [salvo, setSalvo] = useState<ConfigAgenda | null>(null);
  const [rascunho, setRascunho] = useState<ConfigAgenda | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregarPeritos().then(setPeritos).catch(() => setPeritos([])); }, []);
  useEffect(() => observarConfigAgenda(c => { setSalvo(c); setRascunho(r => (r === null ? JSON.parse(JSON.stringify(c)) : r)); }), []);

  if (!peritos || !rascunho || !salvo) return <p className="text-sm text-ink-3">Carregando…</p>;
  const alterado = JSON.stringify(rascunho) !== JSON.stringify(salvo);

  const alternar = (uid: string, dow: number, turno: Turno) => setRascunho(r => {
    const base = r ?? {};
    const perito = { ...(base[uid] ?? {}) };
    const dia = { ...(perito[String(dow)] ?? {}) };
    dia[turno] = !dia[turno];
    perito[String(dow)] = dia;
    return { ...base, [uid]: perito };
  });
  const preencherSemana = (uid: string, ligado: boolean) => setRascunho(r => ({
    ...(r ?? {}),
    [uid]: Object.fromEntries(DIAS_UTEIS.map(d => [String(d), { manha: ligado, tarde: ligado }])),
  }));

  const salvar = async () => {
    setSalvando(true);
    try { await salvarConfigAgenda(rascunho); setSalvo(rascunho); onAviso('Turnos dos peritos salvos.'); }
    catch (e: any) { onAviso(e?.message || 'Não foi possível salvar os turnos.', 'error'); }
    finally { setSalvando(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-3 flex-1 min-w-[16rem]">Marque os turnos em que cada perito atende. Manhã: 07:30–12:00 · Tarde: 13:00–17:00, em slots de 20 minutos. Só esses horários ficam disponíveis para agendar IS.</p>
        <div className="flex gap-2">
          <Button variant="secondary" icon="undo" disabled={!alterado || salvando} onClick={() => setRascunho(JSON.parse(JSON.stringify(salvo)))}>Descartar</Button>
          <Button icon="save" loading={salvando} disabled={!alterado} onClick={salvar}>Salvar turnos</Button>
        </div>
      </div>
      {peritos.length === 0 && <p className="text-sm text-ink-3">Nenhum usuário médico ativo encontrado.</p>}
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {peritos.map(p => (
          <section key={p.uid} aria-label={`Turnos de ${p.usuario}`} className="bg-white border border-line rounded-xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-thead border-b border-line">
              <div className="min-w-0">
                <p className="font-bold text-navy">{p.usuario}</p>
                <p className="text-xs text-ink-3 break-words">{p.perfil === 'user_medicos_mpi' ? 'Médico MPI' : p.perfil === 'admin' ? 'Admin (JRS)' : 'Médico JRS'}{p.gmail ? ` · ${p.gmail}` : ' · sem Gmail cadastrado (não receberá convite)'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => preencherSemana(p.uid, true)}>Todos</Button>
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
    </div>
  );
};
