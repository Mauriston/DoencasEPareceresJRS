// Ficheiro: components/inspecoes/EmailAgendaDialog.tsx
// Envio manual (só Admin) do e-mail "IS AGENDADAS EM dd/mm/aaaa" — o mesmo que sai sozinho às 18h de domingo a
// quinta (servidor/email/agendaIS.ts). O Admin escolhe o dia: campo de data (padrão: amanhã) ou a lista dos dias
// do mês atual com IS agendadas (e candidatos de concurso), com a marca dos dias já enviados. Reenviar substitui
// o PDF da data no Storage (não duplica).
import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import type { DiaConcurso } from '../../services/agendaConcursos';
import { enviarEmailAgendaIS, observarEnviosAgendaIS, type RegistroEmailAgenda } from '../../services/emailAgendaIS';
import { dataIsoValida, dataTituloDeIso, feriadoEm, somarDias } from '../../utils/emailAgendaIS';

interface Props {
  hoje: string;
  inspecoes: InspecaoRecord[];
  diasConcursos: DiaConcurso[];
  onClose: () => void;
  onEnviado: (msg: string, tom?: 'success' | 'error') => void;
}

const quando = (r?: RegistroEmailAgenda): string => {
  const t = r?.ultimoEnvioEm?.toDate?.();
  return t ? t.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
};

export const EmailAgendaDialog: React.FC<Props> = ({ hoje, inspecoes, diasConcursos, onClose, onEnviado }) => {
  const [data, setData] = useState(() => somarDias(hoje, 1));
  const [envios, setEnvios] = useState<Map<string, RegistroEmailAgenda>>(new Map());
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  useEffect(() => observarEnviosAgendaIS(setEnvios, () => { /* sem leitura: a lista só não marca os enviados */ }), []);

  // Dias do mês atual com IS agendadas (menos canceladas) ou candidatos de concurso.
  const mes = hoje.slice(0, 7);
  const dias = useMemo(() => {
    const porDia = new Map<string, { is: number; concursos: number }>();
    const item = (d: string) => porDia.get(d) ?? { is: 0, concursos: 0 };
    inspecoes.forEach(i => {
      const d = (i.dataEntrevista || '').slice(0, 10);
      if (d.startsWith(mes) && i.status !== 'cancelada') porDia.set(d, { ...item(d), is: item(d).is + 1 });
    });
    diasConcursos.forEach(c => { if (c.data.startsWith(mes)) porDia.set(c.data, { ...item(c.data), concursos: item(c.data).concursos + c.total }); });
    return [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, n]) => ({ data: d, ...n }));
  }, [inspecoes, diasConcursos, mes]);

  const valida = dataIsoValida(data);
  const registro = envios.get(data);
  const feriado = valida ? feriadoEm(data) : '';

  const enviar = async () => {
    if (!valida) { setErro('Escolha uma data válida.'); return; }
    setEnviando(true); setErro('');
    try {
      const r = await enviarEmailAgendaIS(data);
      const total = r.totalIS === 0 ? 'sem IS agendadas' : `${r.totalIS} IS`;
      onEnviado(`E-mail das IS de ${dataTituloDeIso(data)} ${r.reenvio ? 'reenviado' : 'enviado'} (${total}${r.totalConcursos ? `, ${r.totalConcursos} de concursos` : ''}) para ${r.para.length + r.cc.length} endereços.`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar o e-mail.');
      setEnviando(false);
    }
  };

  return (
    <Dialog
      title="E-mail das IS agendadas"
      icon="outgoing_mail"
      size="md"
      onClose={() => { if (!enviando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button icon="send" loading={enviando} disabled={!valida} onClick={enviar}>{registro ? 'Reenviar e-mail' : 'Enviar e-mail'}</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-3">Sai sozinho às 18h, de domingo a quinta, com as IS do dia seguinte (não sai em véspera de feriado). Aqui o envio é imediato, para o dia escolhido.</p>

        <Field label="Inspeções agendadas em" required help={valida ? `${dataTituloDeIso(data)}${feriado ? ` · feriado: ${feriado}` : ''}` : undefined}>
          {a => <input {...a} type="date" value={data} onChange={e => { setData(e.target.value); setErro(''); }} />}
        </Field>

        {registro && (
          <p role="status" className="text-xs font-semibold text-ink-2">
            Já enviado{registro.envios > 1 ? ` ${registro.envios} vezes` : ''} (último em {quando(registro)}). Reenviar substitui o PDF dessa data, sem duplicar.
          </p>
        )}

        <div>
          <p className="text-xs font-semibold text-ink-3 mb-1">Dias com IS agendadas neste mês</p>
          {dias.length === 0 ? (
            <p className="text-sm text-ink-3">Nenhuma IS agendada neste mês.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto rounded-xl border border-line divide-y divide-line">
              {dias.map(d => {
                const sel = d.data === data;
                const env = envios.get(d.data);
                return (
                  <li key={d.data}>
                    <button
                      type="button" onClick={() => { setData(d.data); setErro(''); }} aria-pressed={sel}
                      className={`w-full min-h-[44px] px-3 py-2 flex items-center gap-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${sel ? 'bg-navy text-white' : 'hover:bg-thead text-ink'}`}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold">{dataTituloDeIso(d.data)}</span>
                        <span className={`block text-xs ${sel ? 'text-white' : 'text-ink-3'}`}>
                          {d.is} IS{d.concursos ? ` · ${d.concursos} de concursos` : ''}{d.data < hoje ? ' · passado' : ''}
                        </span>
                      </span>
                      {env && (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${sel ? 'text-white' : 'text-ink-2'}`} title={`Enviado em ${quando(env)}`}>
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">mark_email_read</span>
                          Enviado
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
