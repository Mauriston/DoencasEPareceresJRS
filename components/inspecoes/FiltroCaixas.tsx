// Ficheiro: components/inspecoes/FiltroCaixas.tsx
// Filtro de múltipla escolha no padrão da barra das Inspeções de Saúde: botão (ícone + resumo + seta) que abre um
// popover com caixas de seleção, a opção "Todas"/"Todos" (marca/desmarca tudo) e contadores ao lado de cada opção.
// Usado pela Situação das IS (FiltroSituacaoIS) e pelos filtros de Tipo e Status da página Férias.
import React from 'react';
import { FiltroPopover } from './FiltroPopover';

const Opcao: React.FC<{ rotulo: string; marcado: boolean; misto?: boolean; contador?: number; forte?: boolean; onChange: () => void }> = ({ rotulo, marcado, misto, contador, forte, onChange }) => (
  <label className="flex items-center gap-3 min-h-[44px] px-3 cursor-pointer hover:bg-thead">
    <input
      type="checkbox" className="w-5 h-5 shrink-0 accent-navy" checked={marcado} onChange={onChange}
      ref={el => { if (el) el.indeterminate = !!misto; }}
    />
    <span className={`flex-1 text-sm ${forte ? 'font-bold text-navy' : 'font-semibold text-ink'}`}>{rotulo}</span>
    {contador !== undefined && <span className="text-xs font-bold text-ink-3 bg-thead border border-line rounded-full px-2 py-0.5">{contador}</span>}
  </label>
);

interface Props<T extends string> {
  /** Nome do filtro (título do botão e do popover), ex.: "Situação". */
  nome: string;
  icone: string;
  opcoes: readonly { id: T; rotulo: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  contadores?: Partial<Record<T, number>>;
  /** Rótulo da opção que marca tudo e do resumo com tudo marcado: "Todas" ou "Todos". */
  rotuloTodas?: string;
  /** Resumo sem nada marcado: "Nenhuma" ou "Nenhum". */
  rotuloNenhum?: string;
  /** Resumo com 2+ marcadas (sem todas): ex.: n => `${n} situações`. */
  resumoVarios: (n: number) => string;
  className?: string;
}

export function FiltroCaixas<T extends string>({ nome, icone, opcoes, value, onChange, contadores, rotuloTodas = 'Todas', rotuloNenhum = 'Nenhuma', resumoVarios, className }: Props<T>) {
  const todas = value.length === opcoes.length;
  const resumo = value.length === 0 ? rotuloNenhum : todas ? rotuloTodas : value.length === 1 ? (opcoes.find(o => o.id === value[0])?.rotulo ?? '') : resumoVarios(value.length);
  // Mantém a ordem das opções.
  const alternar = (id: T) => onChange(value.includes(id) ? value.filter(v => v !== id) : opcoes.map(o => o.id).filter(o => o === id || value.includes(o)));
  return (
    <FiltroPopover nome={nome} icone={icone} resumo={resumo} className={className}>
      {() => (
        <fieldset>
          <legend className="sr-only">{nome}</legend>
          <Opcao rotulo={rotuloTodas} forte marcado={todas} misto={!todas && value.length > 0} onChange={() => onChange(todas ? [] : opcoes.map(o => o.id))} />
          <div className="border-t border-line my-1" aria-hidden="true" />
          {opcoes.map(o => (
            <Opcao key={o.id} rotulo={o.rotulo} marcado={value.includes(o.id)} contador={contadores?.[o.id]} onChange={() => alternar(o.id)} />
          ))}
        </fieldset>
      )}
    </FiltroPopover>
  );
}
