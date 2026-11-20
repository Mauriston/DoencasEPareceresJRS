// Ficheiro: components/inspecoes/BotaoEnviarEmails.tsx
// "Enviar e-mails" do cabeçalho de Inspeções de Saúde: as listas de e-mails pendentes da JRS (itens de useEmailsIS,
// com a contagem de pendentes de cada lista à direita) e, no gatilho, o badge com o total.
//  • BotaoEnviarEmails — desktop: botão secundário que abre o menu suspenso (MenuAcoes com `botao`).
//  • EmailsPendentesDialog — celular: a mesma lista num diálogo, aberto pela ação "Enviar e-mails" do FAB.
// Os diálogos de envio continuam sendo os de useEmailsIS (renderize `dialogos` na página).
import React from 'react';
import { MenuAcoes, type ItemMenu } from '../ui/MenuAcoes';
import { Dialog } from '../ui/Dialog';

export const ROTULO_ENVIAR_EMAILS = 'Enviar e-mails';

/** Texto acessível com o total de pendências (ex.: "Enviar e-mails (3 pendentes)"). */
export const rotuloEmailsComTotal = (total: number): string =>
  total > 0 ? `${ROTULO_ENVIAR_EMAILS} (${total} pendente${total !== 1 ? 's' : ''})` : ROTULO_ENVIAR_EMAILS;

export const BotaoEnviarEmails: React.FC<{ itens: ItemMenu[]; total: number }> = ({ itens, total }) => (
  <MenuAcoes rotulo={ROTULO_ENVIAR_EMAILS} botao={{ texto: ROTULO_ENVIAR_EMAILS, icone: 'mail', badge: total }} itens={itens} />
);

export const EmailsPendentesDialog: React.FC<{ itens: ItemMenu[]; total: number; onClose: () => void }> = ({ itens, total, onClose }) => (
  <Dialog title={ROTULO_ENVIAR_EMAILS} icon="mail" onClose={onClose}>
    <p className="text-sm text-ink-3 mb-3">
      {total > 0 ? `${total} e-mail${total !== 1 ? 's' : ''} pendente${total !== 1 ? 's' : ''}.` : 'Nenhum e-mail pendente.'}
    </p>
    <ul className="-mx-5 divide-y divide-line border-y border-line">
      {itens.map(i => (
        <li key={i.rotulo}>
          <button
            type="button" aria-disabled={i.desabilitado || undefined}
            onClick={() => { if (i.desabilitado) return; onClose(); i.onClick(); }}
            className={`w-full min-h-12 px-5 py-2 flex items-center gap-3 text-sm font-semibold text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold ${i.desabilitado ? 'text-ink-4 cursor-not-allowed' : 'text-ink hover:bg-thead'}`}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{i.icone}</span>
            <span className="flex flex-col min-w-0 flex-1">
              {i.rotulo}
              {i.dica && <span className="text-xs font-normal text-ink-3 truncate">{i.dica}</span>}
            </span>
            {i.contador !== undefined && (
              <span className={`min-w-[1.5rem] text-right tabular-nums font-bold ${i.desabilitado ? 'text-ink-4' : i.contador > 0 ? 'text-wine' : 'text-ink-3'}`} aria-label={`${i.contador} pendente${i.contador !== 1 ? 's' : ''}`}>{i.contador}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  </Dialog>
);
