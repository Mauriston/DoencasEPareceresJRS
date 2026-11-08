// Ficheiro: components/inspecoes/TrocarPeritoDialog.tsx
// Troca do perito da IS por outro do mesmo AMP que atenda o turno e esteja livre no horário da entrevista.
//  - modo "arraste": aviso ao arrastar uma IS, no calendário, para um turno em que o perito dela não
//    atende; reagenda a IS para o horário de destino com o novo perito.
//  - modo "troca": clique na coluna Perito da tabela; mantém data e hora (a reserva do slot passa ao novo
//    perito, em transação). Sem entrevista marcada, lista todos os peritos do AMP.
import React, { useMemo, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { estadoDoSlot } from './SeletorHorario';
import { agendarInspecao, atualizarInspecao, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { sincronizarAgendaIS } from '../../services/agendaGoogleIS';
import { peritosDoAmp, type PeritoIS } from '../../services/peritosIS';
import {
  ocupadosDe, duracaoDaIS, peritoAtendeNoTurno, turnoDoSlot, TURNOS, dataBr, dataDeEntrevista, horaDeEntrevista, nomeDiaSemana, dataHoraBr,
  type BloqueioAgenda, type ConfigAgenda,
} from '../../utils/inspecoes';

interface Props {
  inspecao: InspecaoRecord;
  /** AAAA-MM-DDThh:mm de destino. */
  dataHora: string;
  modo?: 'arraste' | 'troca';
  peritos: PeritoIS[];
  config: ConfigAgenda;
  bloqueios: BloqueioAgenda[];
  inspecoes: InspecaoRecord[];
  onClose: () => void;
  onConcluido: (msg: string, tom?: 'success' | 'error') => void;
}

export const TrocarPeritoDialog: React.FC<Props> = ({ inspecao, dataHora, modo = 'arraste', peritos, config, bloqueios, inspecoes, onClose, onConcluido }) => {
  const data = dataDeEntrevista(dataHora);
  const hora = horaDeEntrevista(dataHora);
  const turno = turnoDoSlot(hora);
  const rotuloTurno = TURNOS.find(t => t.id === turno)?.rotulo.toLowerCase() ?? 'turno';

  const ocupados = useMemo(() => ocupadosDe(inspecoes, inspecao.id), [inspecoes, inspecao.id]);
  const candidatos = useMemo(() => peritosDoAmp(peritos, inspecao.amp).filter(p =>
    p.uid !== inspecao.peritoUid && (!dataHora || estadoDoSlot(p.uid, data, hora, !!turno && peritoAtendeNoTurno(config, p.uid, data, turno), bloqueios, ocupados, duracaoDaIS(inspecao)) === 'livre')),
  [peritos, inspecao, dataHora, data, hora, turno, config, bloqueios, ocupados]);

  const [peritoUid, setPeritoUid] = useState(candidatos.length === 1 ? candidatos[0].uid : '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    const perito = candidatos.find(p => p.uid === peritoUid);
    if (!perito) { setErro('Escolha o novo perito.'); return; }
    setSalvando(true); setErro('');
    try {
      if (!dataHora) {
        await atualizarInspecao(inspecao.id, { peritoUid: perito.uid, peritoNome: perito.usuario, peritoGmail: perito.gmail });
        onConcluido(`IS ${inspecao.is}: perito ${perito.usuario}.`);
        return;
      }
      const novo = { peritoUid: perito.uid, peritoNome: perito.usuario, peritoGmail: perito.gmail, amp: inspecao.amp, dataEntrevista: dataHora };
      const status = await agendarInspecao(inspecao, novo);
      const sync = await sincronizarAgendaIS({ ...inspecao, ...novo, status, situacao: 'andamento' });
      const base = modo === 'troca' ? `IS ${inspecao.is}: perito ${perito.usuario}.` : `IS ${inspecao.is} reagendada para ${dataHoraBr(dataHora)} com ${perito.usuario}.`;
      onConcluido(sync.ok ? base : `${base} Mas o Google Agenda não foi atualizado: ${sync.erro}`, sync.ok ? 'success' : 'error');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível reagendar.');
      setSalvando(false);
    }
  };

  return (
    <Dialog
      title={modo === 'troca' ? `Perito da IS ${inspecao.is}` : 'O perito não atende neste turno'}
      icon={modo === 'troca' ? 'swap_horiz' : 'warning'}
      size="md"
      onClose={() => { if (!salvando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button icon="swap_horiz" loading={salvando} disabled={candidatos.length === 0} onClick={confirmar}>{modo === 'troca' ? 'Trocar perito' : 'Trocar perito e reagendar'}</Button>
        </>
      )}
    >
      <div className="space-y-4">
        {modo === 'troca' ? (
          <p className="text-ink-3">Atual: <strong className="text-ink">{inspecao.peritoNome || '—'}</strong>{dataHora ? ` · ${nomeDiaSemana(data)}, ${dataHoraBr(dataHora)}` : ''}</p>
        ) : <p className="leading-relaxed"><strong>{inspecao.peritoNome}</strong> não atende na {rotuloTurno} de {nomeDiaSemana(data)}, {dataBr(data)}. Para manter a IS <strong>{inspecao.is}</strong> às <strong>{hora}</strong>, escolha outro perito {inspecao.amp === 'JRS' ? 'da JRS' : 'do MPI'}.</p>}
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
        {candidatos.length === 0 ? (
          <p role="alert" className="text-sm font-semibold text-wine">Nenhum outro perito do AMP {inspecao.amp} disponível{dataHora ? ' neste horário' : ''}.</p>
        ) : (
          <ChoiceGroup<string> label="Novo perito" value={peritoUid} onChange={v => { setPeritoUid(v); setErro(''); }} options={candidatos.map(p => ({ value: p.uid, label: p.usuario, avatar: { nome: p.usuario, imageProfile: p.imageProfile } }))} />
        )}
      </div>
    </Dialog>
  );
};
