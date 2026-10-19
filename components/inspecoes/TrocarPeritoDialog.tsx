// Ficheiro: components/inspecoes/TrocarPeritoDialog.tsx
// Aviso ao arrastar uma IS, no calendário, para um turno em que o perito dela não atende: oferece trocar o
// perito (outro do mesmo AMP que atenda o turno e esteja livre naquele horário) e reagenda a IS para lá.
import React, { useMemo, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { estadoDoSlot } from './SeletorHorario';
import { agendarInspecao, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { sincronizarAgendaIS } from '../../services/agendaGoogleIS';
import { peritosDoAmp, type PeritoIS } from '../../services/peritosIS';
import {
  chaveSlot, peritoAtendeNoTurno, turnoDoSlot, TURNOS, dataBr, dataDeEntrevista, horaDeEntrevista, nomeDiaSemana, dataHoraBr,
  type BloqueioAgenda, type ConfigAgenda,
} from '../../utils/inspecoes';

interface Props {
  inspecao: InspecaoRecord;
  /** AAAA-MM-DDThh:mm de destino. */
  dataHora: string;
  peritos: PeritoIS[];
  config: ConfigAgenda;
  bloqueios: BloqueioAgenda[];
  inspecoes: InspecaoRecord[];
  onClose: () => void;
  onConcluido: (msg: string, tom?: 'success' | 'error') => void;
}

export const TrocarPeritoDialog: React.FC<Props> = ({ inspecao, dataHora, peritos, config, bloqueios, inspecoes, onClose, onConcluido }) => {
  const data = dataDeEntrevista(dataHora);
  const hora = horaDeEntrevista(dataHora);
  const turno = turnoDoSlot(hora);
  const rotuloTurno = TURNOS.find(t => t.id === turno)?.rotulo.toLowerCase() ?? 'turno';

  const ocupados = useMemo(() => new Set<string>(inspecoes.filter(i => i.id !== inspecao.id && i.dataEntrevista && i.status !== 'cancelada').map(i => chaveSlot(i.peritoUid, i.dataEntrevista))), [inspecoes, inspecao.id]);
  const candidatos = useMemo(() => peritosDoAmp(peritos, inspecao.amp).filter(p =>
    p.uid !== inspecao.peritoUid && estadoDoSlot(p.uid, data, hora, !!turno && peritoAtendeNoTurno(config, p.uid, data, turno), bloqueios, ocupados) === 'livre'),
  [peritos, inspecao, data, hora, turno, config, bloqueios, ocupados]);

  const [peritoUid, setPeritoUid] = useState(candidatos.length === 1 ? candidatos[0].uid : '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    const perito = candidatos.find(p => p.uid === peritoUid);
    if (!perito) { setErro('Escolha o novo perito.'); return; }
    setSalvando(true); setErro('');
    try {
      const novo = { peritoUid: perito.uid, peritoNome: perito.usuario, peritoGmail: perito.gmail, amp: inspecao.amp, dataEntrevista: dataHora };
      const status = await agendarInspecao(inspecao, novo);
      const sync = await sincronizarAgendaIS({ ...inspecao, ...novo, status, situacao: 'andamento' });
      const base = `IS ${inspecao.is} reagendada para ${dataHoraBr(dataHora)} com ${perito.usuario}.`;
      onConcluido(sync.ok ? base : `${base} Mas o Google Agenda não foi atualizado: ${sync.erro}`, sync.ok ? 'success' : 'error');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível reagendar.');
      setSalvando(false);
    }
  };

  return (
    <Dialog
      title="O perito não atende neste turno"
      icon="warning"
      size="md"
      onClose={() => { if (!salvando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button icon="swap_horiz" loading={salvando} disabled={candidatos.length === 0} onClick={confirmar}>Trocar perito e reagendar</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="leading-relaxed"><strong>{inspecao.peritoNome}</strong> não atende na {rotuloTurno} de {nomeDiaSemana(data)}, {dataBr(data)}. Para manter a IS <strong>{inspecao.is}</strong> às <strong>{hora}</strong>, escolha outro perito {inspecao.amp === 'JRS' ? 'da JRS' : 'do MPI'}.</p>
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
        {candidatos.length === 0 ? (
          <p role="alert" className="text-sm font-semibold text-wine">Nenhum outro perito do AMP {inspecao.amp} está disponível neste horário (turno não configurado, bloqueio ou horário ocupado). Cancele e escolha outro horário.</p>
        ) : (
          <ChoiceGroup<string> label="Novo perito" value={peritoUid} onChange={v => { setPeritoUid(v); setErro(''); }} options={candidatos.map(p => ({ value: p.uid, label: p.usuario }))} />
        )}
      </div>
    </Dialog>
  );
};
