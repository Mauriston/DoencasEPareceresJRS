// Ficheiro: components/configuracoes/ListaEmails.tsx
// Lista editável de e-mails (PARA / CC / CCO) da página Configurações: chips removíveis e um campo em que
// Enter, vírgula, ponto e vírgula ou sair do campo acrescentam o(s) e-mail(s) digitado(s). Inválidos ficam no
// campo, com erro inline.
import React, { useId, useState } from 'react';
import { controlClass, controlErrorClass } from '../ui/Field';
import { adicionarEmails, removerEmail } from '../../utils/configuracoes';

interface Props {
  rotulo: string;
  emails: string[];
  onChange: (emails: string[]) => void;
}

export const ListaEmails: React.FC<Props> = ({ rotulo, emails, onChange }) => {
  const id = useId();
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');

  const confirmar = () => {
    if (!texto.trim()) return;
    const r = adicionarEmails(emails, texto);
    if (r.lista.length !== emails.length) onChange(r.lista);
    setTexto(r.invalidos.join(' '));
    setErro(r.invalidos.length ? `E-mail inválido: ${r.invalidos.join(', ')}` : '');
  };

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink-3 mb-1">{rotulo}</label>
      {emails.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-1.5" aria-label={`${rotulo}: e-mails`}>
          {emails.map(e => (
            <li key={e} className="inline-flex items-center gap-1 max-w-full pl-3 pr-1 min-h-[32px] rounded-full bg-thead border border-line text-sm text-ink">
              <span className="truncate">{e}</span>
              <button
                type="button" onClick={() => onChange(removerEmail(emails, e))} aria-label={`Remover ${e} de ${rotulo}`}
                className="w-7 h-7 inline-flex items-center justify-center rounded-full text-ink-3 hover:bg-white hover:text-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id} type="email" inputMode="email" autoComplete="off" value={texto}
        placeholder={emails.length ? 'Acrescentar e-mail' : 'Nenhum — digite um e-mail e Enter'}
        aria-invalid={erro ? true : undefined} aria-describedby={erro ? `${id}-erro` : undefined}
        className={`${controlClass} ${erro ? controlErrorClass : ''}`}
        onChange={e => { setTexto(e.target.value); setErro(''); }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',' || e.key === ';') { e.preventDefault(); confirmar(); } }}
        onBlur={confirmar}
      />
      {erro && <p id={`${id}-erro`} role="alert" className="mt-1 text-xs font-semibold text-wine">{erro}</p>}
    </div>
  );
};
