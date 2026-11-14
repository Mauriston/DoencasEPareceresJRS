// Ficheiro: components/administracao/AgendaIS.tsx
// Administração › Agenda das IS: turnos de atendimento de cada perito (config/agendaIS). Rascunho local,
// barra de salvar comum (resumo + "Revisar e salvar") e aviso ao sair com alterações; a gravação vai para o
// Registro de alterações (auditoria_acoes, 'config.alterar' · 'agendaIS', sem nomes).
import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { ButtonLink } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { TurnosPeritos, nomeDia } from '../configuracoes/TurnosPeritos';
import { BarraSalvar, type LinhaDiferenca } from './BarraSalvar';
import { useAvisoSaida } from './useAvisoSaida';
import { NoCorpo } from './NoCorpo';
import { observarConfigAgenda, salvarConfigAgenda } from '../../services/firestoreInspecoes';
import { carregarPeritos, type PeritoIS } from '../../services/peritosIS';
import { registrarAcaoSensivel } from '../../services/auditoriaAcoes';
import { TURNOS, type ConfigAgenda } from '../../utils/inspecoes';
import { diferencasTurnos, plural, type MapaTurnos } from '../../utils/administracao';

const copiar = (c: ConfigAgenda): ConfigAgenda => JSON.parse(JSON.stringify(c));

export const AgendaIS: React.FC = () => {
  const [peritos, setPeritos] = useState<PeritoIS[] | null>(null);
  const [salvo, setSalvo] = useState<ConfigAgenda | null>(null);
  const [rascunho, setRascunho] = useState<ConfigAgenda | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  useEffect(() => { carregarPeritos().then(setPeritos).catch(() => setPeritos([])); }, []);
  useEffect(() => observarConfigAgenda(c => { setSalvo(c); setRascunho(r => (r === null ? copiar(c) : r)); }), []);

  const difs = useMemo(() => (salvo && rascunho ? diferencasTurnos(salvo as MapaTurnos, rascunho as MapaTurnos) : []), [salvo, rascunho]);
  const descartar = () => { if (salvo) setRascunho(copiar(salvo)); };
  const aviso = useAvisoSaida(difs.length > 0, descartar);

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4500); };
  const nomePerito = (uid: string) => peritos?.find(p => p.uid === uid)?.usuario || 'Perito';
  const rotuloTurno = (t: string) => TURNOS.find(x => x.id === t)?.rotulo || t;

  const linhas: LinhaDiferenca[] = difs.map(d => ({
    rotulo: `${nomePerito(d.uid)} · ${nomeDia(Number(d.dia))} · ${rotuloTurno(d.turno)}`,
    antes: d.depois ? 'Não atende' : 'Atende',
    depois: d.depois ? 'Atende' : 'Não atende',
  }));
  const peritosAlterados = new Set(difs.map(d => d.uid)).size;
  const resumo = difs.length ? `${plural(difs.length, 'turno alterado', 'turnos alterados')} · ${plural(peritosAlterados, 'perito', 'peritos')}` : '';

  const salvar = async () => {
    if (!rascunho) return false;
    setSalvando(true);
    try {
      await salvarConfigAgenda(rascunho);
      setSalvo(rascunho);
      void registrarAcaoSensivel('config.alterar', 'agendaIS', [`${resumo} (turnos de atendimento)`]);
      avisar('Turnos dos peritos salvos. Valem para os próximos agendamentos.');
      return true;
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível salvar os turnos.', 'error');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const configurados = rascunho ? Object.values(rascunho).filter(p => Object.values(p || {}).some(d => d?.manha || d?.tarde)).length : 0;

  return (
    <div>
      <NoCorpo><Toast message={toast?.msg ?? null} tone={toast?.tone} /></NoCorpo>
      {aviso}
      <Card as="section" title="Turnos dos peritos" titleAs="h2" actions={<ButtonLink to="/inspecoes" variant="ghost" size="sm" icon="event_busy">Bloqueios de agenda</ButtonLink>} className="mb-4">
        <p className="text-sm text-ink-3">
          Marque os turnos em que cada perito atende. Manhã: 07:30–12:00 · Tarde: 13:00–17:00, em slots de 20 minutos. Só esses horários ficam disponíveis para agendar IS.
          {peritos && rascunho ? ` ${plural(configurados, 'perito com turnos', 'peritos com turnos')} de ${peritos.length}.` : ''}
        </p>
        <p className="text-xs text-ink-3 mt-2">Bloqueios pontuais (férias, ausências, um turno ou horário) ficam em Inspeções de Saúde.</p>
      </Card>
      {!peritos || !rascunho || !salvo
        ? <p className="text-sm text-ink-3">Carregando…</p>
        : <TurnosPeritos peritos={peritos} rascunho={rascunho} salvo={salvo} onChange={setRascunho} />}
      <BarraSalvar resumo={resumo} diferencas={linhas} onDescartar={descartar} onSalvar={salvar} salvando={salvando} aviso="Os horários já agendados não mudam; só os próximos agendamentos seguem os novos turnos." />
    </div>
  );
};
