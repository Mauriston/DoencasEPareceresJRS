// Ficheiro: components/inspecoes/RestricoesSelect.tsx
// Restrições da IS como um "select" de várias escolhas: o campo mostra o resumo das marcadas
// ("Carregar peso, Embarque" ou "Selecione…") e, ao clique, abre a lista com caixas de seleção.
// Recolhe ao clicar em qualquer outro elemento ou com Esc (só esta camada; o painel continua aberto).
import React, { useEffect, useId, useRef, useState } from 'react';
import { controlClass } from '../ui/Field';
import { useEscapeEmpilhado } from '../../hooks/useEscapeEmpilhado';

interface Props {
  opcoes: string[];
  marcadas: string[];
  onAlternar: (opcao: string, marcada: boolean) => void;
  disabled?: boolean;
  rotulo?: string;
}

export const RestricoesSelect: React.FC<Props> = ({ opcoes, marcadas, onAlternar, disabled = false, rotulo = 'Restrições' }) => {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const id = useId();
  const rotuloId = `${id}-rotulo`;
  const listaId = `${id}-lista`;

  const fechar = (devolverFoco = false) => {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  };

  useEscapeEmpilhado(() => fechar(true), aberto);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: Event) => { if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('pointerdown', fora, true);
    document.addEventListener('focusin', fora, true);
    return () => {
      document.removeEventListener('pointerdown', fora, true);
      document.removeEventListener('focusin', fora, true);
    };
  }, [aberto]);

  useEffect(() => { if (disabled) setAberto(false); }, [disabled]);

  const resumo = marcadas.join(', ');

  return (
    <div ref={raiz} className="relative">
      <span id={rotuloId} className="block text-xs font-semibold text-ink-3 mb-1">{rotulo}</span>
      <button
        ref={botao}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={listaId}
        aria-labelledby={`${rotuloId} ${id}-valor`}
        onClick={() => setAberto(a => !a)}
        className={`${controlClass} flex items-center justify-between gap-2 text-left`}
      >
        <span id={`${id}-valor`} className={`min-w-0 truncate ${resumo ? '' : 'text-ink-4'}`}>{resumo || 'Selecione…'}</span>
        <span className={`material-symbols-outlined text-[20px] text-ink-3 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true">expand_more</span>
      </button>
      {aberto && (
        <ul
          id={listaId}
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={rotuloId}
          className="absolute left-0 right-0 top-full mt-1 z-dropdown max-h-64 overflow-y-auto rounded-lg border border-line bg-white shadow-lg divide-y divide-line"
        >
          {opcoes.length === 0 && <li className="px-3 py-3 text-sm text-ink-3">Nenhuma opção cadastrada.</li>}
          {opcoes.map(op => {
            const marcada = marcadas.includes(op);
            return (
              <li key={op} role="option" aria-selected={marcada}>
                <label className="flex items-center gap-3 px-3 min-h-[44px] text-sm text-ink cursor-pointer hover:bg-thead">
                  <input type="checkbox" checked={marcada} onChange={e => onAlternar(op, e.target.checked)} className="w-5 h-5 accent-navy shrink-0" />
                  <span className="break-words">{op}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
