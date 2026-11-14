// Ficheiro: components/ui/Field.tsx
// Campo de formulário único: rótulo (12px, ink-3), controle de 40px no desktop
// (44px em toque, pela regra pointer: coarse do styles/app.css), texto de ajuda
// visível e erro inline. Substitui as classes de input copiadas entre Pareceres,
// Perícia Menor, Perfil, Usuários e as planilhas. Texto 16px abaixo de md (o iOS
// não dá zoom ao focar) e 14px a partir de md (auditoria v3, O2/M2).
// SearchField: o campo de busca padrão (ícone search, mesmo controlClass).
import React, { useId } from 'react';

/** Classes do controle (input/select/textarea) — fonte única. */
export const controlClass =
  'w-full min-h-10 bg-white border border-line rounded-lg px-3 py-2 text-base md:text-sm text-ink placeholder:text-ink-4 ' +
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

interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onChange: (valor: string) => void;
  /** Rótulo acessível (aria-label). O placeholder não substitui o rótulo. */
  label: string;
  /** Classes do wrapper (largura etc.). */
  className?: string;
}

/** Campo de busca padrão do app: ícone search à esquerda, botão limpar quando há texto. */
export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ value, onChange, label, className = '', placeholder, ...rest }, ref) => {
    const interno = React.useRef<HTMLInputElement | null>(null);
    return (
      <div className={`relative ${className}`}>
        <span className="material-symbols-outlined text-[20px] text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">search</span>
        <input
          ref={el => { interno.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; }}
          type="search"
          role="searchbox"
          aria-label={label}
          placeholder={placeholder ?? label}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`${controlClass} pl-10 ${value ? 'pr-10' : ''} [&::-webkit-search-cancel-button]:hidden`}
          {...rest}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); interno.current?.focus(); }}
            aria-label="Limpar busca"
            title="Limpar busca"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center rounded-md text-ink-3 hover:bg-thead hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
          </button>
        )}
      </div>
    );
  },
);
SearchField.displayName = 'SearchField';
