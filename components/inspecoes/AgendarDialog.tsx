// Ficheiro: components/inspecoes/AgendarDialog.tsx
// Agendar / reagendar a entrevista de uma IS: escolhe o perito (do AMP de competência da finalidade),
// a data e o horário (slots de 20 min livres). Grava o slot em transação e sincroniza o evento no
// Google Agenda "JRS/HNRe".
import React, { useMemo, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { SeletorHorario } from './SeletorHorario';
import { agendarInspecao, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { sincronizarAgendaIS } from '../../services/agendaGoogleIS';
import { peritosDoAmp, type PeritoIS } from '../../services/peritosIS';
import { chaveSlot, dataBr, dataHoraBr, type BloqueioAgenda, type ConfigAgenda } from '../../utils/inspecoes';

interface Props {
  inspecao: InspecaoRecord;
  peritos: PeritoIS[];
  config: ConfigAgenda;
  bloqueios: BloqueioAgenda[];
  inspecoes: InspecaoRecord[];
  onClose: () => void;
  onAgendada: (mensagem: string, tom?: 'success' | 'error') => void;
}

export const AgendarDialog: React.FC<Props> = ({ inspecao, peritos, config, bloqueios, inspecoes, onClose, onAgendada }) => {
  const candidatos = useMemo(() => peritosDoAmp(peritos, inspecao.amp), [peritos, inspecao.amp]);
  const [peritoUid, setPeritoUid] = useState(candidatos.some(p => p.uid === inspecao.peritoUid) ? inspecao.peritoUid : '');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Ocupação por outras IS (a própria não conta: dá para repetir o mesmo horário ao trocar só o perito).
  const ocupados = useMemo(() => new Set(inspecoes.filter(i => i.id !== inspecao.id && i.dataEntrevista && i.status !== 'cancelada').map(i => chaveSlot(i.peritoUid, i.dataEntrevista))), [inspecoes, inspecao.id]);
  const perito = candidatos.find(p => p.uid === peritoUid);
  const reagendando = !!inspecao.dataEntrevista;

  const confirmar = async () => {
    if (!perito) { setErro('Escolha o perito.'); return; }
    if (!data || !hora) { setErro('Escolha a data e o horário.'); return; }
    setSalvando(true); setErro('');
    try {
      const dataEntrevista = `${data}T${hora}`;
      const novo = { peritoUid: perito.uid, peritoNome: perito.usuario, peritoGmail: perito.gmail, amp: inspecao.amp, dataEntrevista };
      const status = await agendarInspecao(inspecao, novo);
      const sync = await sincronizarAgendaIS({ ...inspecao, ...novo, status, situacao: 'andamento' });
      const base = `IS ${inspecao.is} ${status === 'reagendada' ? 'reagendada' : 'agendada'} para ${dataHoraBr(dataEntrevista)}.`;
      if (!sync.ok) onAgendada(`${base} Mas o Google Agenda não foi atualizado: ${sync.erro}`, 'error');
      else onAgendada(sync.semConvidado ? `${base} O perito não tem Gmail cadastrado e não foi convidado no Google Agenda.` : `${base} Evento criado no Google Agenda.`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível agendar.');
      setSalvando(false);
    }
  };

  return (
    <Dialog
      title={reagendando ? `Reagendar IS ${inspecao.is}` : `Agendar IS ${inspecao.is}`}
      icon="event"
      size="md"
      onClose={() => { if (!salvando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button icon="check" loading={salvando} onClick={confirmar}>{reagendando ? 'Reagendar' : 'Agendar'}</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="text-ink-3 break-words">{inspecao.inspecionado}<br />{inspecao.finalidade} · competência da {inspecao.amp}</p>
        {reagendando && <p className="text-xs text-ink-3">Entrevista atual: <strong>{dataHoraBr(inspecao.dataEntrevista)}</strong> ({inspecao.peritoNome}). O horário atual será liberado.</p>}
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
        {candidatos.length === 0
          ? <p role="alert" className="text-sm font-semibold text-wine">Não há perito ativo para o AMP {inspecao.amp}.</p>
          : (
            <ChoiceGroup<string>
              label={`Perito (${inspecao.amp === 'JRS' ? 'Admin e médicos JRS' : 'médicos MPI'})`} value={peritoUid}
              onChange={v => { setPeritoUid(v); setHora(''); setErro(''); }}
              options={candidatos.map(p => ({ value: p.uid, label: p.usuario }))}
            />
          )}
        <SeletorHorario peritoUid={peritoUid} data={data} onData={setData} hora={hora} onHora={h => { setHora(h); setErro(''); }} config={config} bloqueios={bloqueios} ocupados={ocupados} />
        {data && hora && <p className="text-xs font-semibold text-green-700">Nova entrevista: {dataBr(data)} às {hora} ({perito?.usuario}).</p>}
      </div>
    </Dialog>
  );
};
