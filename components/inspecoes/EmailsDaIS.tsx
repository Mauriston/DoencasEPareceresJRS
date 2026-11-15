// Ficheiro: components/inspecoes/EmailsDaIS.tsx
// Seção "E-mails" da barra lateral de detalhe da IS: botões de envio (só Admin e Secretaria), cada um SÓ quando a
// IS se qualifica pelas mesmas regras do menu "Enviar e-mail" — agendamento/reagendamento (todos os grupos, de hoje
// em diante, sem o e-mail desta data), resultado (Finalizada de Verificações e Términos, com laudo), resultado de
// Benefícios (com Nº do TIS, ainda não enviado), falta (HNRe) e NAC. Já enviado = botão some.
// Os envios já feitos aparecem na seção "E-mails enviados" (emails/HistoricoEmailsIS), para todos.
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { EmailFaltasDialog } from './EmailFaltasDialog';
import { EmailNacDialog } from './EmailNacDialog';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import { agendamentoPendente } from '../../utils/emailAgendamentoIS';
import { ehReagendamentoEmail } from '../../utils/confirmacaoAgendamentoIS';
import { resultadoPendente } from '../../utils/emailResultadoIS';
import { resultadoBeneficiosDisponivel, resultadoBeneficiosEnviado } from '../../utils/resultadoBeneficiosIS';
import { ehOmHnre, faltaSemEmail } from '../../utils/emailFaltasHNRe';
import { pendenteNac } from '../../utils/emailNac';

interface Props {
  is: InspecaoRecord;
  /** OM do inspecionado (regra das faltas: só HNRe). */
  om?: string;
  hoje: string;
  /** Admin e Secretaria enviam. */
  podeEnviar: boolean;
  onEnviarAgendamento: (is: InspecaoRecord) => void;
  onEnviarResultado: (is: InspecaoRecord) => void;
  onEnviarResultadoBeneficios: (is: InspecaoRecord) => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

export const EmailsDaIS: React.FC<Props> = ({ is, om, hoje, podeEnviar, onEnviarAgendamento, onEnviarResultado, onEnviarResultadoBeneficios, onAviso }) => {
  const [aberto, setAberto] = useState<'faltas' | 'nac' | null>(null);

  const botoes = podeEnviar ? [
    agendamentoPendente(is, hoje) && { chave: 'agendamento', rotulo: ehReagendamentoEmail(is) ? 'E-mail de reagendamento' : 'E-mail de agendamento', icone: 'forward_to_inbox', onClick: () => onEnviarAgendamento(is) },
    resultadoPendente(is) && { chave: 'resultado', rotulo: 'E-mail de resultado', icone: 'mark_email_unread', onClick: () => onEnviarResultado(is) },
    resultadoBeneficiosDisponivel(is) && !resultadoBeneficiosEnviado(is) && { chave: 'beneficios', rotulo: 'E-mail de resultado (Benefícios)', icone: 'mark_email_unread', onClick: () => onEnviarResultadoBeneficios(is) },
    faltaSemEmail(is) && ehOmHnre(om) && { chave: 'falta', rotulo: 'Comunicar falta (HNRe)', icone: 'unsubscribe', onClick: () => setAberto('faltas') },
    pendenteNac(is) && { chave: 'nac', rotulo: 'E-mail ao NAC', icone: 'assignment_turned_in', onClick: () => setAberto('nac') },
  ].filter(Boolean) as { chave: string; rotulo: string; icone: string; onClick: () => void }[] : [];

  if (!botoes.length) return null;

  return (
    <section aria-label="Enviar e-mails da IS" className="space-y-2">
      <p className="text-xs font-semibold text-ink-3">E-mails</p>
      <div className="flex flex-wrap gap-2">
        {botoes.map(b => <Button key={b.chave} variant="secondary" icon={b.icone} onClick={b.onClick}>{b.rotulo}</Button>)}
      </div>
      {aberto === 'faltas' && <EmailFaltasDialog pendentes={[is]} onClose={() => setAberto(null)} onEnviado={(m, t) => { setAberto(null); onAviso(m, t); }} />}
      {aberto === 'nac' && <EmailNacDialog pendentes={[is]} onClose={() => setAberto(null)} onEnviado={(m, t) => { setAberto(null); onAviso(m, t); }} />}
    </section>
  );
};
