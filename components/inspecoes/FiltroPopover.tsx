// Ficheiro: components/inspecoes/FiltroPopover.tsx
// Botão de filtro (ícone + rótulo que resume a seleção + seta) que abre um popover ancorado logo abaixo. O
// popover é um diálogo não modal: fecha com Esc (devolvendo o foco ao botão) ou com clique fora; ao abrir, foca a
// opção marcada (ou o primeiro controle).
// Variantes: 'campo' (padrão · altura de controle do DS, ex.: Férias) e 'chip' (filtro em chip da lista de
// Inspeções, no estilo do FilterChip; `ativo` = há filtro). No chip o popover vai num portal com posição fixa,
// para não ser cortado pela linha de chips com rolagem lateral do celular (M3).
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface FiltroPopoverProps {
  /** Nome do filtro (aria-label do popover e prefixo acessível do botão), ex.: "Situação". */
  nome: string;
  icone: string;
  /** Resumo da seleção mostrado no botão, ex.: "Em andamento", "2 situações". */
  resumo: string;
  className?: string;
  /** Mostra um × no campo que limpa o filtro (ex.: período da página Férias). */
  onLimpar?: () => void;
  /** 'campo' (padrão) ou 'chip'. */
  variante?: 'campo' | 'chip';
  /** Só no chip: destaca o chip (há filtro aplicado). */
  ativo?: boolean;
  /** Conteúdo do popover; recebe `fechar` para fechar após uma escolha. */
  children: (fechar: () => void) => React.ReactNode;
}

export const FiltroPopover: React.FC<FiltroPopoverProps> = ({ nome, icone, resumo, className = '', onLimpar, variante = 'campo', ativo = false, children }) => {
  const chip = variante === 'chip';
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const id = useId();

  const fechar = () => { setAberto(false); botao.current?.focus(); };

  // Chip: posição fixa calculada a partir do botão (sem passar da borda direita da janela).
  useLayoutEffect(() => {
    if (!aberto || !chip) return;
    const r = botao.current!.getBoundingClientRect();
    const largura = painel.current?.offsetWidth ?? 0;
    setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - largura - 8)) });
  }, [aberto, chip]);

  useEffect(() => {
    if (!aberto) return;
    (painel.current?.querySelector<HTMLElement>('input:checked') ?? painel.current?.querySelector<HTMLElement>('input:not([disabled]), button:not([disabled])'))?.focus();
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (!raiz.current?.contains(alvo) && !painel.current?.contains(alvo)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } };
    // Chip (posição fixa): rolar a página fora do popover o fecha, como o MenuAcoes.
    const rolar = (e: Event) => { if (chip && !painel.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla, true);
    window.addEventListener('scroll', rolar, true);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla, true);
      window.removeEventListener('scroll', rolar, true);
    };
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  const classeBotao = chip
    ? `inline-flex items-center gap-2 min-h-10 pl-3 pr-2 rounded-lg border text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
      ativo || aberto ? 'bg-thead border-navy text-navy' : 'bg-white border-line text-ink-3 hover:border-navy hover:text-navy'}`
    : `w-full min-h-[44px] inline-flex items-center gap-2 bg-white border rounded-lg pl-3 pr-2 py-2 text-sm text-ink whitespace-nowrap hover:border-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${aberto ? 'border-navy' : 'border-line'}`;

  const conteudo = aberto && (
    <div
      ref={painel} id={id} role="dialog" aria-label={nome}
      style={chip ? { position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999 } : undefined}
      className={`${chip ? 'z-dialog min-w-[14rem] max-h-[min(24rem,70vh)] overflow-y-auto' : 'absolute left-0 top-full mt-1 z-dropdown min-w-full'} w-max max-w-[calc(100vw-2rem)] bg-white border border-line rounded-lg shadow-xl py-1`}
    >
      {children(fechar)}
    </div>
  );

  return (
    <div ref={raiz} className={`relative ${chip ? 'shrink-0' : ''} ${className}`}>
      <button
        ref={botao} type="button" onClick={() => setAberto(a => !a)}
        aria-haspopup="dialog" aria-expanded={aberto} aria-controls={aberto ? id : undefined} aria-label={`${nome}: ${resumo}`} title={nome}
        className={classeBotao}
      >
        <span className={`material-symbols-outlined text-[20px] ${chip ? '' : 'text-ink-3'}`} aria-hidden="true">{icone}</span>
        <span className={chip ? '' : 'flex-1 min-w-0 truncate text-left font-semibold'}>{resumo}</span>
        {onLimpar && <span className="w-8 shrink-0" aria-hidden="true" />}
        <span className={`material-symbols-outlined text-[20px] ${chip ? '' : 'text-ink-3'} transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true">expand_more</span>
      </button>
      {onLimpar && (
        <button
          type="button" onClick={() => { onLimpar(); setAberto(false); }} aria-label={`Limpar filtro de ${nome.toLowerCase()}`} title="Limpar"
          className="absolute right-8 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-3 hover:bg-thead hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
        </button>
      )}
      {chip ? (conteudo && createPortal(conteudo, document.body)) : conteudo}
    </div>
  );
};
