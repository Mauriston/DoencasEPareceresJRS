// Ficheiro: components/ui/Field.tsx
// Campo de formulário único: rótulo (12px, ink-3), controle de 44px, texto de
// ajuda visível e erro inline. Substitui as classes de input copiadas entre
// Pareceres, Perícia Menor, Perfil, Usuários e as planilhas.
import React, { useId } from 'react';

/** Classes do controle (input/select/textarea) — fonte única. */
export const controlClass =
  'w-full min-h-[44px] bg-white border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-4 ' +
  'focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy disabled:bg-thead disabled:text-ink-3 disabled:cursor-not-allowed';
export const controlErrorClass = 'border-wine focus:border-wine focus:ring-wine';

interface FieldProps {
  label: string;
  /** Marca o campo como obrigatório (asterisco vinho + aria-required no controle). */
  required?: boolean;
  /** Texto de ajuda visível abaixo do controle. */
  help?: string;
  /** Mensagem de erro inline (substitui a ajuda quando presente). */
  error?: string;
  className?: string;
  /** Recebe os atributos de acessibilidade a aplicar no controle. */
  children: (aria: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; 'aria-required'?: boolean; className: string }) => React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, required, help, error, className = '', children }) => {
  const id = useId();
  const descId = error || help ? `${id}-desc` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-semibold text-ink-3 mb-1">
        {label}
        {required && <span className="text-wine ml-0.5" aria-hidden="true">*</span>}
      </label>
      {children({
        id,
        'aria-describedby': descId,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
        className: `${controlClass} ${error ? controlErrorClass : ''}`,
      })}
      {error ? (
        <p id={descId} role="alert" className="mt-1 text-xs font-semibold text-wine flex items-start gap-1">
          <span className="material-symbols-outlined text-[16px] leading-none mt-px" aria-hidden="true">error</span>
          {error}
        </p>
      ) : help ? (
        <p id={descId} className="mt-1 text-xs text-ink-3">{help}</p>
      ) : null}
    </div>
  );
};
