// Ficheiro: components/concursos/AbasSituacao.tsx
// Abas sublinhadas de situação da lista de concursos (auditoria v3, G2/C2): ouro = aba ativa,
// contagem ao lado do rótulo. São abas (tablist) que controlam o painel `${idBase}-painel`;
// a vista (cards × tabela) fica num Segmented só de ícones, à parte.
import React, { useRef } from 'react';

export interface AbaSituacao<T extends string> {
  value: T;
  label: string;
  contagem: number;
}

interface Props<T extends string> {
  abas: AbaSituacao<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  idBase: string;
  className?: string;
}

export function AbasSituacao<T extends string>({ abas, value, onChange, ariaLabel, idBase, className = '' }: Props<T>) {
  const raiz = useRef<HTMLDivElement>(null);
  // Setas movem a seleção (roving tabindex), como no Segmented.
  const aoTecla = (e: React.KeyboardEvent) => {
    const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const i = abas.findIndex(a => a.value === value);
    const prox = abas[(i + passo + abas.length) % abas.length];
    onChange(prox.value);
    requestAnimationFrame(() => raiz.current?.querySelectorAll<HTMLElement>('[role="tab"]')[abas.indexOf(prox)]?.focus());
  };
  return (
    <div ref={raiz} role="tablist" aria-label={ariaLabel} onKeyDown={aoTecla} className={`flex gap-1 overflow-x-auto ${className}`}>
      {abas.map(a => {
        const ativo = a.value === value;
        return (
          <button
            key={a.value}
            type="button"
            role="tab"
            id={`${idBase}-aba-${a.value}`}
            aria-selected={ativo}
            aria-controls={`${idBase}-painel`}
            tabIndex={ativo ? 0 : -1}
            onClick={() => onChange(a.value)}
            className={`shrink-0 inline-flex items-center gap-2 h-12 px-3 border-b-[3px] text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold ${
              ativo ? 'text-navy border-gold' : 'text-ink-3 border-transparent hover:text-navy'
            }`}
          >
            {a.label}
            <span className={`min-w-5 h-5 px-1.5 rounded-full text-xs font-bold tabular-nums inline-flex items-center justify-center ${ativo ? 'bg-navy text-white' : 'bg-line text-ink'}`}>{a.contagem}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Vista da lista só com ícones (G2): mesmo desenho do Segmented do DS, com nome acessível e
 * tooltip em cada opção (o Segmented do DS exige rótulo visível).
 */
export function VistaIcones<T extends string>({ opcoes, value, onChange, ariaLabel, className = '' }: {
  opcoes: { value: T; icone: string; rotulo: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const aoTecla = (e: React.KeyboardEvent) => {
    const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const i = opcoes.findIndex(o => o.value === value);
    const prox = opcoes[(i + passo + opcoes.length) % opcoes.length];
    onChange(prox.value);
    requestAnimationFrame(() => raiz.current?.querySelectorAll<HTMLElement>('[role="radio"]')[opcoes.indexOf(prox)]?.focus());
  };
  return (
    <div ref={raiz} role="radiogroup" aria-label={ariaLabel} onKeyDown={aoTecla} className={`inline-flex gap-0.5 p-0.5 rounded-lg bg-thead border border-line ${className}`}>
      {opcoes.map(o => {
        const ativo = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-label={o.rotulo}
            title={o.rotulo}
            tabIndex={ativo ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`w-8 h-7 inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold ${ativo ? 'bg-navy text-white' : 'text-ink-3 hover:bg-white hover:text-navy'}`}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{o.icone}</span>
          </button>
        );
      })}
    </div>
  );
}
