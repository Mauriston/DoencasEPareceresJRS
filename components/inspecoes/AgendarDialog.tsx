// Ficheiro: components/inspecoes/AgendarDialog.tsx
// Agendar / reagendar a entrevista de uma IS: escolhe a data (calendário com os dias em que os peritos do
// AMP de competência têm horário livre e a contagem de IS do dia), o perito com horário no dia e o
// horário (slots de 20 min livres) — components/inspecoes/EscolhaEntrevista. Grava o slot em transação e sincroniza o evento no
// Google Agenda "JRS/HNRe". Vindo do calendário (IS arrastada para um dia/horário), abre com a data — e,
// se couber, o perito e o horário — já preenchidos; a transação de agendamento valida o slot.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { EscolhaEntrevista } from './EscolhaEntrevista';
import { slotsLivresDoDia } from '../../utils/disponibilidadeAgenda';
import { agendarInspecao, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { sincronizarAgendaIS } from '../../services/agendaGoogleIS';
import { avisarAgendamento } from '../../services/emailAgendamentoIS';
import { peritosDoAmp, type PeritoIS } from '../../services/peritosIS';
import { ocupadosDe, duracaoDaIS, dataBr, dataHoraBr, type BloqueioAgenda, type ConfigAgenda } from '../../utils/inspecoes';

interface Props {
  inspecao: InspecaoRecord;
  peritos: PeritoIS[];
  config: ConfigAgenda;
  bloqueios: BloqueioAgenda[];
  inspecoes: InspecaoRecord[];
  onClose: () => void;
  onAgendada: (mensagem: string, tom?: 'success' | 'error') => void;
  /** Data (AAAA-MM-DD) já escolhida, ex.: dia em que a IS foi solta no calendário. */
  dataInicial?: string;
  /** Horário (hh:mm) já escolhido, se a IS foi solta num horário e ele estiver livre. */
  horaInicial?: string;
  /** Perito preferido (o atual da IS ou o filtrado no calendário), se tiver horário livre no dia. */
  peritoInicial?: string;
}

export const AgendarDialog: React.FC<Props> = ({ inspecao, peritos, config, bloqueios, inspecoes, onClose, onAgendada, dataInicial, horaInicial, peritoInicial }) => {
  const candidatos = useMemo(() => peritosDoAmp(peritos, inspecao.amp), [peritos, inspecao.amp]);
  const [peritoUid, setPeritoUid] = useState('');
  const [data, setData] = useState(dataInicial ?? '');
  const [hora, setHora] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Ocupação por outras IS (a própria não conta: dá para repetir o mesmo horário ao trocar só o perito).
  const ocupados = useMemo(() => ocupadosDe(inspecoes, inspecao.id), [inspecoes, inspecao.id]);
  const duracao = duracaoDaIS(inspecao);
  const perito = candidatos.find(p => p.uid === peritoUid);

  const reagendando = !!inspecao.dataEntrevista;

  // Data vinda do calendário: escolhe o perito (o preferido, ou o único livre no dia) e o horário, se livre.
  // Espera os peritos carregarem; roda uma vez.
  const inicialAplicado = useRef(false);
  useEffect(() => {
    if (inicialAplicado.current || !dataInicial || candidatos.length === 0) return;
    inicialAplicado.current = true;
    const livres = candidatos.filter(p => slotsLivresDoDia(p.uid, dataInicial, config, bloqueios, ocupados, duracao).length > 0);
    const uid = livres.find(p => p.uid === peritoInicial)?.uid ?? (livres.length === 1 ? livres[0].uid : '');
    setPeritoUid(uid);
    if (uid && horaInicial && slotsLivresDoDia(uid, dataInicial, config, bloqueios, ocupados, duracao).includes(horaInicial)) setHora(horaInicial);
  }, [candidatos]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Verificações e Términos: a página pergunta se envia o e-mail de agendamento.
      avisarAgendamento({ ...inspecao, status }, dataEntrevista);
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
        <EscolhaEntrevista
          amp={inspecao.amp} candidatos={candidatos} config={config} bloqueios={bloqueios} ocupados={ocupados}
          inspecoes={inspecoes} ignorarId={inspecao.id} duracao={duracao}
          data={data} peritoUid={peritoUid} hora={hora} mesInicial={dataInicial}
          onData={d => { setData(d); setErro(''); }} onPerito={uid => { setPeritoUid(uid); setErro(''); }} onHora={h => { setHora(h); setErro(''); }}
        />
        {data && hora && <p className="text-xs font-semibold text-green-700">Nova entrevista: {dataBr(data)} às {hora} ({perito?.usuario}).</p>}
      </div>
    </Dialog>
  );
};
