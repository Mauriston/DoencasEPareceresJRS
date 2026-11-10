// Ficheiro: components/ui/AvatarRadioGroup.tsx
// "Avatar based card radio group": escolha única entre pessoas (ex.: perito da IS) em cards lado a
// lado que quebram linha. Cada card tem o avatar (foto de perfil do usuário — imageProfile, lida pelo
// servidor do app quando o Storage não é acessível — ou as iniciais), o nome e uma linha secundária
// opcional, com o radio visual à direita. Selecionado: borda navy e fundo navy suave.
// Acessível: role="radiogroup" com cards role="radio" (aria-checked), foco itinerante (só o card
// escolhido — ou o primeiro — entra no Tab) e setas ←/→/↑/↓, Home/End movem e escolhem; Espaço/Enter escolhem.
import React, { useId, useRef } from 'react';
import { useUrlArquivo } from '../../services/arquivosStorage';

export interface AvatarRadioOption<T extends string> {
  value: T;
  /** Nome em destaque no card. */
  label: string;
  /** Linha secundária (posto, nome completo, função…). */
  secundaria?: string;
  /** Foto de perfil (URL ou caminho do Storage). */
  imageProfile?: string;
  /** Nome de onde saem as iniciais quando não há foto (padrão: o label). */
  nomeAvatar?: string;
}

interface AvatarRadioGroupProps<T extends string> {
  label: string;
  options: AvatarRadioOption<T>[];
  value: T | '';
  onChange: (value: T) => void;
  required?: boolean;
  error?: string;
  className?: string;
}

/** Até duas iniciais (primeira e última palavra com 2+ letras). */
export const iniciaisDe = (nome: string): string => {
  const palavras = nome.trim().split(/\s+/).filter(p => p.length > 1 || /^[A-ZÀ-Ý]$/i.test(p));
  if (palavras.length === 0) return '';
  const primeira = palavras[0].charAt(0);
  const ultima = palavras.length > 1 ? palavras[palavras.length - 1].charAt(0) : '';
  return `${primeira}${ultima}`.toUpperCase();
};

const AvatarCard: React.FC<{ nome: string; imageProfile?: string }> = ({ nome, imageProfile }) => {
  const { src } = useUrlArquivo(imageProfile);
  if (src) return <img src={src} alt="" className="w-10 h-10 rounded-full object-cover border border-line shrink-0" />;
  const iniciais = iniciaisDe(nome);
  return (
    <span aria-hidden="true" className="w-10 h-10 rounded-full bg-navy text-white text-sm font-bold flex items-center justify-center shrink-0">
      {iniciais || <span className="material-symbols-outlined text-[20px]">person</span>}
    </span>
  );
};

export function AvatarRadioGroup<T extends string>({ label, options, value, onChange, required, error, className = '' }: AvatarRadioGroupProps<T>) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const indiceSelecionado = options.findIndex(o => o.value === value);
  const focavel = indiceSelecionado >= 0 ? indiceSelecionado : 0;

  const escolherIndice = (i: number) => {
    const o = options[i];
    if (!o) return;
    onChange(o.value);
    refs.current[i]?.focus();
  };

  const aoTecla = (e: React.KeyboardEvent, i: number) => {
    const n = options.length;
    let alvo = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') alvo = (i + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') alvo = (i - 1 + n) % n;
    else if (e.key === 'Home') alvo = 0;
    else if (e.key === 'End') alvo = n - 1;
    if (alvo >= 0) { e.preventDefault(); escolherIndice(alvo); }
  };

  return (
    <div className={className}>
      <span id={`${id}-label`} className="block text-xs font-semibold text-ink-3 mb-1">
        {label}
        {required && <span className="text-wine ml-0.5" aria-hidden="true">*</span>}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-erro` : undefined}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        className="flex flex-wrap gap-2"
      >
        {options.map((o, i) => {
          const ativo = o.value === value;
          return (
            <button
              key={o.value}
              ref={el => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={ativo}
              tabIndex={i === focavel ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={e => aoTecla(e, i)}
              className={`flex-1 basis-[200px] min-w-0 max-w-full flex items-center gap-3 min-h-[56px] px-3 py-2 rounded-lg border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                ativo ? 'border-navy ring-1 ring-navy bg-navy/5' : `bg-white hover:bg-thead ${error ? 'border-wine' : 'border-line'}`
              }`}
            >
              <AvatarCard nome={o.nomeAvatar || o.label} imageProfile={o.imageProfile} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-navy break-words">{o.label}</span>
                {o.secundaria && <span className="block text-xs text-ink-3 break-words">{o.secundaria}</span>}
              </span>
              <span
                aria-hidden="true"
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${ativo ? 'border-navy' : 'border-ink-4'}`}
              >
                {ativo && <span className="w-2.5 h-2.5 rounded-full bg-navy" />}
              </span>
            </button>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-erro`} role="alert" className="mt-1 text-xs font-semibold text-wine flex items-start gap-1">
          <span className="material-symbols-outlined text-[16px] leading-none mt-px" aria-hidden="true">error</span>
          {error}
        </p>
      )}
    </div>
  );
}
