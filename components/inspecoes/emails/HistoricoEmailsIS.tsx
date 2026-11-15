// Ficheiro: components/inspecoes/emails/HistoricoEmailsIS.tsx
// Seção "E-mails enviados" do detalhe da IS (visível a todos que acessam Inspeções de Saúde): lê, em tempo real,
// inspecoes/{isId}/emails (services/historicoEmailsIS.ts) e mostra, do mais recente, o tipo, o assunto, para quem,
// a data/hora (dd/mm/aaaa hh:mm) e quem enviou. IS antigas: entram também os envios que só existem nos campos
// antigos da IS (utils/historicoEmailsIS.ts → mesclarHistoricoEmails). Sem envio, a seção não aparece.
import React, { useEffect, useMemo, useState } from 'react';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import { observarEmailsDaIS, type RegistroEmailISRecord } from '../../../services/historicoEmailsIS';
import { dataHoraDoEnvio, mesclarHistoricoEmails } from '../../../utils/historicoEmailsIS';
import { useNav } from '../../../context/NavContext';

interface Props {
  is: InspecaoRecord;
}

export const HistoricoEmailsIS: React.FC<Props> = ({ is }) => {
  const nav = useNav();
  const eu = nav?.authUser;
  const [registros, setRegistros] = useState<RegistroEmailISRecord[]>([]);

  useEffect(() => observarEmailsDaIS(is.id, setRegistros, () => setRegistros([])), [is.id]);

  const itens = useMemo(
    () => mesclarHistoricoEmails(registros, is, uid => (eu && uid === eu.uid ? eu.usuario : undefined)),
    [registros, is, eu],
  );
  if (!itens.length) return null;

  return (
    <section aria-labelledby={`emails-enviados-${is.id}`} className="space-y-2">
      <h4 id={`emails-enviados-${is.id}`} className="text-xs font-semibold text-ink-3">E-mails enviados</h4>
      <ul className="divide-y divide-line rounded-lg border border-line bg-white">
        {itens.map(e => (
          <li key={e.chave} className="flex items-start gap-3 px-3 py-2.5">
            <span className="material-symbols-outlined text-[20px] text-green-700 shrink-0 mt-0.5" aria-hidden="true">mark_email_read</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-bold text-navy break-words">{e.rotulo}</p>
                <p className="text-xs text-ink-3 tabular-nums shrink-0">{dataHoraDoEnvio(e.enviadoEmMs)}</p>
              </div>
              {e.assunto && <p className="text-xs text-ink break-words">{e.assunto}</p>}
              <p className="text-xs text-ink-3 break-words">
                {e.para.length ? <>Para {e.para.join(', ')}</> : 'Destinatários da configuração'}
                {' · '}{e.usuario ? `por ${e.usuario}` : e.legado ? 'registro anterior ao histórico' : 'remetente não registrado'}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
