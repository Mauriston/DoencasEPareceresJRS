// Ficheiro: components/ui/Autocomplete.tsx
// Campo com autocomplete (combobox acessível): digita-se para filtrar e cada
// opção tem duas linhas — a principal e uma secundária em fonte menor. Setas,
// Enter e Esc funcionam; escolher uma opção chama onSelect.
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Field } from './Field';
import { normalizarBusca } from '../../utils/corposQuadros';

export interface OpcaoAutocomplete {
  chave: string;
  principal: string;
  secundaria?: string;
  /** Texto (sem acento, minúsculo) em que a digitação é procurada. */
  busca?: string;
}

interface AutocompleteProps {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Texto exibido no campo. */
  valor: string;
  onDigitar: (texto: string) => void;
  opcoes: OpcaoAutocomplete[];
  onSelecionar: (opcao: OpcaoAutocomplete) => void;
  maxOpcoes?: number;
  className?: string;
  /** Quando a busca não encontra nada, oferece este botão (ex.: "Cadastrar novo") no fim da lista. */
  aoNaoEncontrar?: { rotulo: string; onClick: () => void };
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  label, required, help, error, placeholder, disabled, valor, onDigitar, opcoes, onSelecionar, maxOpcoes = 8, className = '', aoNaoEncontrar,
}) => {
  const listaId = useId();
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);

  const filtradas = useMemo(() => {
    const termos = normalizarBusca(valor).split(/\s+/).filter(Boolean);
    const base = termos.length === 0
      ? opcoes
      : opcoes.filter(o => { const alvo = o.busca ?? normalizarBusca(`${o.principal} ${o.secundaria ?? ''}`); return termos.every(t => alvo.includes(t)); });
    return base.slice(0, maxOpcoes);
  }, [valor, opcoes, maxOpcoes]);

  useEffect(() => { setAtivo(0); }, [valor, opcoes]);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  const escolher = (o: OpcaoAutocomplete) => { onSelecionar(o); setAberto(false); };

  const aoTecla = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAberto(true); setAtivo(i => Math.min(i + 1, Math.max(filtradas.length - 1, 0))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && aberto && filtradas[ativo]) { e.preventDefault(); escolher(filtradas[ativo]); }
    else if (e.key === 'Escape') setAberto(false);
  };

  return (
    <div ref={raiz} className={`relative ${className}`}>
      <Field label={label} required={required} help={help} error={error}>
        {a => (
          <input
            {...a}
            type="text"
            role="combobox"
            aria-expanded={aberto}
            aria-controls={listaId}
            aria-autocomplete="list"
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            value={valor}
            onChange={e => { onDigitar(e.target.value); setAberto(true); }}
            onFocus={() => setAberto(true)}
            onKeyDown={aoTecla}
          />
        )}
      </Field>
      {aberto && !disabled && (
        <ul id={listaId} role="listbox" className="absolute z-30 left-0 right-0 mt-1 bg-white border border-line rounded-lg shadow-lg max-h-64 overflow-y-auto divide-y divide-line">
          {filtradas.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-3">
              <span className="block">Nenhuma opção encontrada.</span>
              {aoNaoEncontrar && (
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setAberto(false); aoNaoEncontrar.onClick(); }}
                  className="mt-2 inline-flex items-center gap-1 min-h-[44px] px-3 rounded-lg border border-navy text-navy font-bold hover:bg-thead"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">person_add</span>
                  {aoNaoEncontrar.rotulo}
                </button>
              )}
            </li>
          ) : filtradas.map((o, i) => (
            <li key={o.chave} role="option" aria-selected={i === ativo}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => escolher(o)}
                className={`w-full text-left px-4 py-2 min-h-[44px] ${i === ativo ? 'bg-thead' : 'hover:bg-thead'}`}
              >
                <span className="block text-sm font-bold text-navy">{o.principal}</span>
                {o.secundaria && <span className="block text-xs text-ink-3">{o.secundaria}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
