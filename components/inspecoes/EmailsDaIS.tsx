// Ficheiro: components/inspecoes/EmailsDaIS.tsx
// Seção "E-mails" da barra lateral de detalhe da IS:
//  - Botões de envio (só Admin e Secretaria), cada um SÓ quando a IS se qualifica pelas mesmas regras do menu
//    "Enviar Email" — agendamento (Verificações e Términos, de hoje em diante, sem o e-mail desta data), resultado
//    (Finalizada, Verificações e Términos ou Benefícios, com laudo), falta (HNRe) e NAC. Já enviado = botão some.
//  - Cards (sem clique) dos e-mails já enviados desta IS, com destinatário e data.
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { EmailFaltasDialog } from './EmailFaltasDialog';
import { EmailNacDialog } from './EmailNacDialog';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import { agendamentoPendente } from '../../utils/emailAgendamentoIS';
import { resultadoPendente } from '../../utils/emailResultadoIS';
import { ehOmHnre, faltaSemEmail } from '../../utils/emailFaltasHNRe';
import { pendenteNac } from '../../utils/emailNac';
import { dataBr, dataHoraBr } from '../../utils/inspecoes';

interface Props {
  is: InspecaoRecord;
  /** OM do inspecionado (regra das faltas: só HNRe). */
  om?: string;
  hoje: string;
  /** Admin e Secretaria enviam. */
  podeEnviar: boolean;
  onEnviarAgendamento: (is: InspecaoRecord) => void;
  onEnviarResultado: (is: InspecaoRecord) => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

const quando = (t: unknown): string => {
  const d = (t as { toDate?: () => Date } | null)?.toDate?.();
  return d ? d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
};

const CardEnviado: React.FC<{ icone: string; titulo: string; detalhe: string }> = ({ icone, titulo, detalhe }) => (
  <div className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 min-h-[44px]">
    <span className="material-symbols-outlined text-[20px] text-green-700 shrink-0" aria-hidden="true">{icone}</span>
    <span className="min-w-0">
      <span className="block text-sm font-bold text-navy">{titulo}</span>
      <span className="block text-xs text-ink-3 break-words">{detalhe}</span>
    </span>
  </div>
);

export const EmailsDaIS: React.FC<Props> = ({ is, om, hoje, podeEnviar, onEnviarAgendamento, onEnviarResultado, onAviso }) => {
  const [aberto, setAberto] = useState<'faltas' | 'nac' | null>(null);

  const botoes = podeEnviar ? [
    agendamentoPendente(is, hoje) && { chave: 'agendamento', rotulo: 'E-mail de agendamento', icone: 'forward_to_inbox', onClick: () => onEnviarAgendamento(is) },
    resultadoPendente(is) && { chave: 'resultado', rotulo: 'E-mail de resultado', icone: 'mark_email_unread', onClick: () => onEnviarResultado(is) },
    faltaSemEmail(is) && ehOmHnre(om) && { chave: 'falta', rotulo: 'Comunicar falta (HNRe)', icone: 'unsubscribe', onClick: () => setAberto('faltas') },
    pendenteNac(is) && { chave: 'nac', rotulo: 'E-mail ao NAC', icone: 'assignment_turned_in', onClick: () => setAberto('nac') },
  ].filter(Boolean) as { chave: string; rotulo: string; icone: string; onClick: () => void }[] : [];

  const enviados = [
    is.emailAgendamentoPara && { chave: 'agendamento', icone: 'forward_to_inbox', titulo: 'Agendamento enviado', detalhe: `Para ${is.emailAgendamentoPara}${is.emailAgendamentoDataEntrevista ? ` · entrevista ${dataHoraBr(is.emailAgendamentoDataEntrevista)}` : ''}${quando(is.emailAgendamentoEnviadoEm) ? ` · ${quando(is.emailAgendamentoEnviadoEm)}` : ''}` },
    is.emailResultadoPara && { chave: 'resultado', icone: 'mark_email_read', titulo: 'Resultado enviado', detalhe: `Para ${is.emailResultadoPara}${quando(is.emailResultadoEnviadoEm) ? ` · ${quando(is.emailResultadoEnviadoEm)}` : ''}` },
    is.emailFaltaEnviadoEm && { chave: 'falta', icone: 'unsubscribe', titulo: 'Falta comunicada (Div. Pessoal)', detalhe: `Falta de ${dataBr((is.emailFaltaDataEntrevista || '').slice(0, 10)) || '—'}${quando(is.emailFaltaEnviadoEm) ? ` · ${quando(is.emailFaltaEnviadoEm)}` : ''}` },
    is.emailNacEnviadoEm && { chave: 'nac', icone: 'assignment_turned_in', titulo: 'Enviada ao NAC', detalhe: quando(is.emailNacEnviadoEm) || 'Enviado' },
  ].filter(Boolean) as { chave: string; icone: string; titulo: string; detalhe: string }[];

  if (!botoes.length && !enviados.length) return null;

  return (
    <section aria-label="E-mails da IS" className="space-y-2">
      <p className="text-xs font-semibold text-ink-3">E-mails</p>
      {botoes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {botoes.map(b => <Button key={b.chave} variant="secondary" icon={b.icone} onClick={b.onClick}>{b.rotulo}</Button>)}
        </div>
      )}
      {enviados.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {enviados.map(e => <CardEnviado key={e.chave} icone={e.icone} titulo={e.titulo} detalhe={e.detalhe} />)}
        </div>
      )}
      {aberto === 'faltas' && <EmailFaltasDialog pendentes={[is]} onClose={() => setAberto(null)} onEnviado={(m, t) => { setAberto(null); onAviso(m, t); }} />}
      {aberto === 'nac' && <EmailNacDialog pendentes={[is]} onClose={() => setAberto(null)} onEnviado={(m, t) => { setAberto(null); onAviso(m, t); }} />}
    </section>
  );
};
