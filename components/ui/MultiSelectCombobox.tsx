// Ficheiro: components/ui/MultiSelectCombobox.tsx
// Multi-select combobox com chips apagáveis: o campo mostra as opções escolhidas como chips (cada um
// com × para remover) e um campo de texto que filtra a lista. Clique/Enter numa opção alterna a marca
// (✓); ↑/↓/Home/End navegam; Backspace com o texto vazio remove o último chip; Esc ou clique fora fecha.
// Os cliques na lista e nos chips não tiram o foco do campo (mousedown com preventDefault), então a
// lista não fecha antes do clique — e o fechamento por "fora" usa pointerdown no documento, não o blur.
// Acessível: input role="combobox" (aria-expanded/aria-controls/aria-activedescendant) e listbox
// aria-multiselectable com options aria-selected.
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { normalizarBusca } from '../../utils/corposQuadros';
import { useEscapeEmpilhado } from '../../hooks/useEscapeEmpilhado';

interface MultiSelectComboboxProps {
  label: string;
  opcoes: string[];
  selecionadas: string[];
  onChange: (selecionadas: string[]) => void;
  placeholder?: string;
  required?: boolean;
  help?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const MultiSelectCombobox: React.FC<MultiSelectComboboxProps> = ({
  label, opcoes, selecionadas, onChange, placeholder = 'Selecione ou digite para filtrar…', required, help, error, disabled = false, className = '',
}) => {
  const id = useId();
  const inputId = `${id}-campo`;
  const listaId = `${id}-lista`;
  const descId = `${id}-desc`;
  const raiz = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [ativo, setAtivo] = useState(0);

  // Escolhidas que não estão nas opções (dados antigos) continuam na lista para poderem ser desmarcadas.
  const todas = useMemo(() => [...opcoes, ...selecionadas.filter(s => !opcoes.includes(s))], [opcoes, selecionadas]);
  const filtradas = useMemo(() => {
    const termos = normalizarBusca(texto).split(/\s+/).filter(Boolean);
    if (termos.length === 0) return todas;
    return todas.filter(o => { const alvo = normalizarBusca(o); return termos.every(t => alvo.includes(t)); });
  }, [todas, texto]);

  useEffect(() => { setAtivo(0); }, [texto]);
  useEffect(() => { if (ativo >= filtradas.length) setAtivo(Math.max(filtradas.length - 1, 0)); }, [filtradas.length, ativo]);
  useEffect(() => { if (disabled) setAberto(false); }, [disabled]);

  const fechar = () => { setAberto(false); setTexto(''); };
  useEscapeEmpilhado(fechar, aberto);

  // Clique/toque fora fecha (pointerdown no documento; os cliques de dentro não passam por aqui).
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: Event) => { if (raiz.current && !raiz.current.contains(e.target as Node)) fechar(); };
    document.addEventListener('pointerdown', fora, true);
    return () => document.removeEventListener('pointerdown', fora, true);
  }, [aberto]);

  // Opção ativa visível ao navegar com as setas.
  useEffect(() => {
    if (!aberto) return;
    document.getElementById(`${id}-op-${ativo}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [ativo, aberto, id]);

  const alternar = (op: string) => {
    onChange(selecionadas.includes(op) ? selecionadas.filter(s => s !== op) : [...selecionadas, op]);
    setTexto('');
    input.current?.focus();
  };
  const remover = (op: string) => { onChange(selecionadas.filter(s => s !== op)); input.current?.focus(); };

  const aoTecla = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!aberto) { setAberto(true); return; }
      setAtivo(i => Math.min(i + 1, Math.max(filtradas.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!aberto) { setAberto(true); return; }
      setAtivo(i => Math.max(i - 1, 0));
    } else if (e.key === 'Home' && aberto) { e.preventDefault(); setAtivo(0); }
    else if (e.key === 'End' && aberto) { e.preventDefault(); setAtivo(Math.max(filtradas.length - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault(); // dentro de <form> não submete
      if (!aberto) { setAberto(true); return; }
      if (filtradas[ativo]) alternar(filtradas[ativo]);
    } else if (e.key === 'Backspace' && !texto && selecionadas.length > 0) {
      onChange(selecionadas.slice(0, -1));
    } else if (e.key === 'Escape' && aberto) {
      // Fecha só a lista; o painel por trás (Drawer/Dialog) continua aberto.
      e.stopPropagation();
      fechar();
    } else if (e.key === 'Tab') fechar();
  };

  const manterFoco = (e: React.MouseEvent) => e.preventDefault();
  const descricao = [help ? descId : '', error ? `${id}-erro` : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div ref={raiz} className={`relative ${className}`}>
      <label htmlFor={inputId} className="block text-xs font-semibold text-ink-3 mb-1">
        {label}
        {required && <span className="text-wine ml-0.5" aria-hidden="true">*</span>}
      </label>
      <div
        onMouseDown={e => {
          if (disabled || (e.target as HTMLElement).closest('button')) return; // × do chip cuida de si
          if (e.target !== input.current) e.preventDefault();
          input.current?.focus();
          setAberto(true);
        }}
        className={`w-full min-h-[44px] flex flex-wrap items-center gap-1.5 bg-white border rounded-lg pl-2 pr-1 py-1.5 text-sm text-ink transition-colors ${
          disabled ? 'bg-thead text-ink-3 cursor-not-allowed border-line' : `cursor-text focus-within:ring-1 ${error ? 'border-wine focus-within:ring-wine' : 'border-line focus-within:border-navy focus-within:ring-navy'}`
        }`}
      >
        {selecionadas.map(op => (
          <span key={op} className="inline-flex items-center gap-1 max-w-full min-h-[28px] pl-2.5 pr-0.5 rounded-full bg-navy/10 text-navy text-xs font-semibold">
            <span className="break-words min-w-0">{op}</span>
            {!disabled && (
              <button
                type="button"
                aria-label={`Remover ${op}`}
                onMouseDown={manterFoco}
                onClick={e => { e.stopPropagation(); remover(op); }}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-navy/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold shrink-0"
              >
                <span className="material-symbols-outlined text-[16px] leading-none" aria-hidden="true">close</span>
              </button>
            )}
          </span>
        ))}
        <input
          ref={input}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={aberto && filtradas[ativo] ? `${id}-op-${ativo}` : undefined}
          aria-describedby={descricao}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          autoComplete="off"
          disabled={disabled}
          value={texto}
          placeholder={selecionadas.length === 0 ? placeholder : ''}
          onChange={e => { setTexto(e.target.value); setAberto(true); }}
          onFocus={() => setAberto(true)}
          onKeyDown={aoTecla}
          className="flex-1 min-w-[120px] min-h-[28px] bg-transparent border-0 p-0 px-1 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
        />
        <span className={`material-symbols-outlined text-[20px] text-ink-3 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true">expand_more</span>
      </div>
      {help && <p id={descId} className="mt-1 text-xs text-ink-3">{help}</p>}
      {error && (
        <p id={`${id}-erro`} role="alert" className="mt-1 text-xs font-semibold text-wine flex items-start gap-1">
          <span className="material-symbols-outlined text-[16px] leading-none mt-px" aria-hidden="true">error</span>
          {error}
        </p>
      )}
      {aberto && !disabled && (
        <ul
          id={listaId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          onMouseDown={manterFoco}
          className="absolute left-0 right-0 top-full mt-1 z-dropdown max-h-64 overflow-y-auto rounded-lg border border-line bg-white shadow-lg py-1"
        >
          {filtradas.length === 0 && (
            <li role="presentation" className="px-3 py-3 text-sm text-ink-3">{todas.length === 0 ? 'Nenhuma opção cadastrada.' : 'Nenhuma opção encontrada.'}</li>
          )}
          {filtradas.map((op, i) => {
            const marcada = selecionadas.includes(op);
            return (
              <li
                key={op}
                id={`${id}-op-${i}`}
                role="option"
                aria-selected={marcada}
                onClick={() => alternar(op)}
                onMouseMove={() => { if (i !== ativo) setAtivo(i); }}
                className={`flex items-center gap-3 px-3 min-h-[44px] text-sm cursor-pointer ${i === ativo ? 'bg-thead' : ''} ${marcada ? 'font-semibold text-navy' : 'text-ink'}`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex items-center justify-center w-5 h-5 rounded border shrink-0 ${marcada ? 'bg-navy border-navy text-white' : 'bg-white border-ink-4'}`}
                >
                  {marcada && <span className="material-symbols-outlined text-[16px] leading-none">check</span>}
                </span>
                <span className="break-words min-w-0">{op}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
