// Ficheiro: components/inspecoes/AgendarNoHorarioDialog.tsx
// Clique num horário vazio do calendário: agenda ali uma IS já aberta (ainda sem entrevista) ou segue
// para o cadastro de uma nova IS nesse horário. O perito precisa atender o turno, o horário estar livre e
// ser do AMP de competência da finalidade da IS.
import React, { useMemo, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { StatusTag } from '../ui/StatusTag';
import { controlClass } from '../ui/Field';
import { estadoDoSlot } from './SeletorHorario';
import { agendarInspecao, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { sincronizarAgendaIS } from '../../services/agendaGoogleIS';
import { peritosDoAmp, type PeritoIS } from '../../services/peritosIS';
import { normalizarBusca } from '../../utils/corposQuadros';
import {
  STATUS_IS, statusEfetivoIS, chaveSlot, peritoAtendeNoTurno, turnoDoSlot, dataBr, dataDeEntrevista, horaDeEntrevista, nomeDiaSemana, dataHoraBr,
  type BloqueioAgenda, type ConfigAgenda,
} from '../../utils/inspecoes';

type Modo = 'aberta' | 'nova';

interface Props {
  /** AAAA-MM-DDThh:mm do horário clicado. */
  dataHora: string;
  /** Perito filtrado no calendário ('' = todos). */
  peritoFiltro: string;
  inspecoes: InspecaoRecord[];
  peritos: PeritoIS[];
  config: ConfigAgenda;
  bloqueios: BloqueioAgenda[];
  podeCadastrar: boolean;
  onNova: () => void;
  onClose: () => void;
  onAgendada: (msg: string, tom?: 'success' | 'error') => void;
}

const nomeCurto = (inspecionado: string): string => inspecionado.replace(/^.*?\d{2}\.\d{4}\.\d{2}\s*/, '') || inspecionado;

export const AgendarNoHorarioDialog: React.FC<Props> = ({ dataHora, peritoFiltro, inspecoes, peritos, config, bloqueios, podeCadastrar, onNova, onClose, onAgendada }) => {
  const data = dataDeEntrevista(dataHora);
  const hora = horaDeEntrevista(dataHora);
  const abertas = useMemo(() => inspecoes.filter(i => i.status === 'aberta' && !i.dataEntrevista).sort((a, b) => a.dataAbertura.localeCompare(b.dataAbertura) || a.is - b.is), [inspecoes]);

  const [modo, setModo] = useState<Modo>(abertas.length > 0 || !podeCadastrar ? 'aberta' : 'nova');
  const [busca, setBusca] = useState('');
  const [escolhida, setEscolhida] = useState<InspecaoRecord | null>(null);
  const [peritoUid, setPeritoUid] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const ocupados = useMemo(() => new Set<string>(inspecoes.filter(i => i.dataEntrevista && i.status !== 'cancelada').map(i => chaveSlot(i.peritoUid, i.dataEntrevista))), [inspecoes]);
  const livre = (p: PeritoIS) => {
    const t = turnoDoSlot(hora);
    return estadoDoSlot(p.uid, data, hora, !!t && peritoAtendeNoTurno(config, p.uid, data, t), bloqueios, ocupados) === 'livre';
  };

  const filtradas = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    return abertas.filter(i => { const alvo = normalizarBusca(`${i.is} ${i.inspecionado} ${i.finalidade}`); return termos.every(t => alvo.includes(t)); });
  }, [abertas, busca]);

  // Peritos que podem atender esta IS neste horário (e o filtrado no calendário, se houver).
  const candidatos = useMemo(() => (escolhida ? peritosDoAmp(peritos, escolhida.amp).filter(p => (!peritoFiltro || p.uid === peritoFiltro) && livre(p)) : []), [escolhida, peritos, peritoFiltro, config, bloqueios, ocupados]); // eslint-disable-line react-hooks/exhaustive-deps

  const escolher = (is: InspecaoRecord) => {
    setEscolhida(is); setErro('');
    const possiveis = peritosDoAmp(peritos, is.amp).filter(p => (!peritoFiltro || p.uid === peritoFiltro) && livre(p));
    setPeritoUid(possiveis.length === 1 ? possiveis[0].uid : possiveis.find(p => p.uid === is.peritoUid)?.uid ?? '');
  };

  const confirmar = async () => {
    const perito = candidatos.find(p => p.uid === peritoUid);
    if (!escolhida) { setErro('Escolha a IS.'); return; }
    if (!perito) { setErro('Escolha o perito.'); return; }
    setSalvando(true); setErro('');
    try {
      const novo = { peritoUid: perito.uid, peritoNome: perito.usuario, peritoGmail: perito.gmail, amp: escolhida.amp, dataEntrevista: dataHora };
      const status = await agendarInspecao(escolhida, novo);
      const sync = await sincronizarAgendaIS({ ...escolhida, ...novo, status, situacao: 'andamento' });
      const base = `IS ${escolhida.is} agendada para ${dataHoraBr(dataHora)}.`;
      if (!sync.ok) onAgendada(`${base} Mas o Google Agenda não foi atualizado: ${sync.erro}`, 'error');
      else onAgendada(sync.semConvidado ? `${base} O perito não tem Gmail cadastrado e não foi convidado.` : `${base} Evento criado no Google Agenda.`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível agendar.');
      setSalvando(false);
    }
  };

  return (
    <Dialog
      title={`${nomeDiaSemana(data)}, ${dataBr(data)} às ${hora}`}
      icon="event"
      size="md"
      onClose={() => { if (!salvando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
          {modo === 'aberta'
            ? <Button icon="check" loading={salvando} disabled={!escolhida} onClick={confirmar}>Agendar neste horário</Button>
            : <Button icon="add" onClick={onNova}>Cadastrar IS neste horário</Button>}
        </>
      )}
    >
      <div className="space-y-4">
        {podeCadastrar && (
          <Segmented<Modo>
            ariaLabel="O que fazer neste horário" fullWidth value={modo} onChange={m => { setModo(m); setErro(''); }}
            options={[{ value: 'aberta', label: 'Agendar IS aberta', badge: abertas.length, badgeTone: 'neutro' }, { value: 'nova', label: 'Nova IS' }]}
          />
        )}

        {modo === 'nova' ? (
          <p className="text-ink-3">Abre o cadastro de uma nova IS já com a entrevista marcada para {dataBr(data)} às {hora}. O perito é escolhido a partir da finalidade (AMP de competência).</p>
        ) : (
          <>
            {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
            {abertas.length === 0 ? (
              <p className="text-ink-3">Não há IS aberta aguardando agendamento.{podeCadastrar ? ' Use "Nova IS" para cadastrar uma.' : ''}</p>
            ) : (
              <>
                <input type="search" aria-label="Buscar IS aberta" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nº, inspecionado ou finalidade…" className={controlClass} autoComplete="off" />
                <ul className="border border-line rounded-xl divide-y divide-line max-h-60 overflow-y-auto" aria-label="IS abertas">
                  {filtradas.length === 0 && <li className="px-3 py-3 text-ink-3">Nenhuma IS encontrada.</li>}
                  {filtradas.map(is => {
                    const st = STATUS_IS[statusEfetivoIS(is)];
                    const ativo = escolhida?.id === is.id;
                    return (
                      <li key={is.id}>
                        <button type="button" onClick={() => escolher(is)} aria-pressed={ativo} className={`w-full text-left px-3 py-2 min-h-[44px] ${ativo ? 'bg-thead' : 'hover:bg-thead'}`}>
                          <span className="flex items-start justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block text-sm font-bold text-navy break-words">IS {is.is} · {nomeCurto(is.inspecionado)}</span>
                              <span className="block text-xs text-ink-3 break-words">{is.finalidade} · {is.amp}</span>
                            </span>
                            <StatusTag tone={st.tom}>{st.rotulo}</StatusTag>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            {escolhida && (candidatos.length === 0
              ? <p role="alert" className="text-sm font-semibold text-wine">Nenhum perito do AMP {escolhida.amp} está disponível neste horário (turno não configurado, bloqueio ou horário ocupado).</p>
              : (
                <ChoiceGroup<string>
                  label="Perito" value={peritoUid} onChange={v => { setPeritoUid(v); setErro(''); }}
                  options={candidatos.map(p => ({ value: p.uid, label: p.usuario }))}
                />
              ))}
          </>
        )}
      </div>
    </Dialog>
  );
};
