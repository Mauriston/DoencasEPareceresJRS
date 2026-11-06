// Ficheiro: components/ui/MenuCascata.tsx
// Menu suspenso em dois níveis (grupo → item), no padrão dos menus do Material 3: superfície clara
// ancorada ao campo, itens compactos de 44 px, altura máxima com rolagem e item escolhido destacado
// com ✓. Tocar num grupo troca o conteúdo do mesmo painel pelos itens dele (com "voltar" no topo),
// em vez de abrir um segundo painel por cima — funciona igual no celular e no desktop.
// Abre já no grupo do valor atual; abre para cima quando falta espaço abaixo do campo.
// Teclado: ↑/↓/Home/End navegam, → ou Enter entra no grupo, ← ou Backspace volta, Esc fecha.
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export interface GrupoMenu { nome: string; itens: string[] }

interface Props {
  grupos: GrupoMenu[];
  value: string;
  onChange: (item: string) => void;
  placeholder?: string;
  erro?: boolean;
  id?: string;
  /** "campo" (padrão) segue o controlClass dos formulários; "destaque" é o campo maior de Exames mínimos. */
  tamanho?: 'campo' | 'destaque';
}

/** Altura máxima da lista (px) — acima disso, rola. ~7 itens de 44 px. */
const ALTURA_MAX = 320;

const Icone: React.FC<{ nome: string; className?: string }> = ({ nome, className = '' }) => (
  <span className={`material-symbols-outlined text-[20px] leading-none shrink-0 ${className}`} aria-hidden="true">{nome}</span>
);

export const MenuCascata: React.FC<Props> = ({ grupos, value, onChange, placeholder = 'Selecione', erro, id, tamanho = 'campo' }) => {
  const menuId = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [grupoAtual, setGrupoAtual] = useState<string | null>(null);
  const [acima, setAcima] = useState(false);
  const [alturaMax, setAlturaMax] = useState(ALTURA_MAX);
  // No celular a barra de rolagem fica oculta: um degradê no rodapé indica que há mais itens.
  const [maisAbaixo, setMaisAbaixo] = useState(false);
  const medirRolagem = () => {
    const el = lista.current;
    setMaisAbaixo(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  };

  const umGrupo = grupos.length === 1;
  const grupoDoValor = grupos.find(g => g.itens.includes(value))?.nome ?? null;
  const grupo = umGrupo ? grupos[0] : grupos.find(g => g.nome === grupoAtual);

  const abrir = () => {
    const r = gatilho.current?.getBoundingClientRect();
    if (r) {
      const abaixo = window.innerHeight - r.bottom - 12;
      const emCima = r.top - 12;
      const paraCima = abaixo < Math.min(ALTURA_MAX, 240) && emCima > abaixo;
      setAcima(paraCima);
      setAlturaMax(Math.max(160, Math.min(ALTURA_MAX, paraCima ? emCima : abaixo) - 52));
    }
    setGrupoAtual(grupoDoValor);
    setAberto(true);
  };
  const fechar = (devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) gatilho.current?.focus();
  };

  // Fecha ao tocar fora.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent | TouchEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('touchstart', fora);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('touchstart', fora); };
  }, [aberto]);

  // Ao abrir ou trocar de nível: foco (e rolagem) no item escolhido, senão no primeiro.
  useLayoutEffect(() => {
    if (!aberto) return;
    const el = lista.current?.querySelector<HTMLElement>('[aria-checked="true"], [data-atual="true"]')
      ?? lista.current?.querySelector<HTMLElement>('[data-item]');
    el?.scrollIntoView({ block: 'nearest' });
    el?.focus({ preventScroll: true });
    medirRolagem();
  }, [aberto, grupoAtual]);

  const itensFocaveis = (): HTMLElement[] => (raiz.current ? Array.from(raiz.current.querySelectorAll<HTMLElement>('[data-item], [data-voltar]')) : []);
  const mover = (delta: number | 'inicio' | 'fim') => {
    const itens = itensFocaveis();
    if (!itens.length) return;
    const i = itens.indexOf(document.activeElement as HTMLElement);
    const prox = delta === 'inicio' ? 0 : delta === 'fim' ? itens.length - 1 : (i + delta + itens.length) % itens.length;
    itens[prox].focus();
  };

  const aoTeclaMenu = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (k === 'ArrowDown') { e.preventDefault(); mover(1); }
    else if (k === 'ArrowUp') { e.preventDefault(); mover(-1); }
    else if (k === 'Home') { e.preventDefault(); mover('inicio'); }
    else if (k === 'End') { e.preventDefault(); mover('fim'); }
    else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); }
    else if (k === 'Tab') setAberto(false);
    else if ((k === 'ArrowLeft' || k === 'Backspace') && grupo && !umGrupo) { e.preventDefault(); setGrupoAtual(null); }
    else if (k === 'ArrowRight') {
      const nome = (document.activeElement as HTMLElement | null)?.dataset.grupo;
      if (nome) { e.preventDefault(); setGrupoAtual(nome); }
    }
  };

  const aoTeclaGatilho = (e: React.KeyboardEvent) => {
    if (!aberto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); abrir(); }
    else if (aberto && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); }
  };

  const destaque = tamanho === 'destaque';
  const item = 'w-full flex items-center gap-3 min-h-[44px] px-3 py-2 text-left text-sm leading-snug outline-none transition-colors hover:bg-thead focus-visible:bg-thead';

  return (
    <div ref={raiz} className="relative">
      <button
        ref={gatilho}
        id={id}
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? menuId : undefined}
        aria-invalid={erro || undefined}
        onClick={() => (aberto ? fechar(false) : abrir())}
        onKeyDown={aoTeclaGatilho}
        className={`w-full flex items-center justify-between gap-3 border rounded-lg text-left transition-colors focus:outline-none focus:ring-1 ${erro ? 'border-wine focus:border-wine focus:ring-wine' : `${aberto ? 'border-navy ring-1 ring-navy' : 'border-line'} focus:border-navy focus:ring-navy`} ${destaque ? 'bg-paper p-3 shadow-inner' : 'bg-white min-h-[44px] px-3 py-1.5'}`}
      >
        <span className="min-w-0">
          {grupoDoValor && <span className="block text-[11px] font-bold text-ink-3 uppercase tracking-label leading-tight">{grupoDoValor}</span>}
          <span className={`block leading-snug ${value ? `text-navy ${destaque ? 'text-base font-semibold' : 'text-sm font-semibold'}` : `text-ink-4 ${destaque ? 'text-base' : 'text-sm'}`}`}>{value || placeholder}</span>
        </span>
        <Icone nome="arrow_drop_down" className={`text-[24px] text-ink-3 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div
          id={menuId}
          role="menu"
          aria-label={grupo ? grupo.nome : 'Grupos'}
          onKeyDown={aoTeclaMenu}
          className={`absolute z-dropdown left-0 right-0 ${acima ? 'bottom-full mb-1 origin-bottom' : 'top-full mt-1 origin-top'} bg-white rounded-xl border border-line shadow-xl overflow-hidden animate-menu-in`}
        >
          {grupo && !umGrupo && (
            <button
              type="button"
              data-voltar
              onClick={() => setGrupoAtual(null)}
              className="w-full flex items-center gap-2 min-h-[44px] px-3 border-b border-line bg-thead text-left text-xs font-bold text-ink-3 uppercase tracking-label outline-none hover:text-navy focus-visible:text-navy focus-visible:bg-line/60"
            >
              <Icone nome="arrow_back" className="text-[18px]" />
              <span className="truncate">{grupo.nome}</span>
            </button>
          )}
          <div className="relative">
          <div
            ref={lista}
            key={grupo?.nome ?? '__grupos'}
            onScroll={medirRolagem}
            className="overflow-y-auto overscroll-contain py-1 animate-menu-nivel"
            style={{ maxHeight: alturaMax }}
          >
            {grupo ? grupo.itens.map(nome => {
              const sel = nome === value;
              return (
                <button
                  key={nome}
                  type="button"
                  role="menuitemradio"
                  aria-checked={sel}
                  data-item
                  onClick={() => { onChange(nome); fechar(); }}
                  className={`${item} ${sel ? 'bg-navy/10 hover:bg-navy/15 focus-visible:bg-navy/15 text-navy font-semibold' : 'text-ink'}`}
                >
                  <span className="w-5 flex justify-center shrink-0">{sel && <Icone nome="check" className="text-[18px] text-navy" />}</span>
                  <span className="min-w-0 flex-1">{nome}</span>
                </button>
              );
            }) : grupos.map(g => {
              const atual = g.nome === grupoDoValor;
              return (
                <button
                  key={g.nome}
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  data-item
                  data-grupo={g.nome}
                  data-atual={atual || undefined}
                  onClick={() => setGrupoAtual(g.nome)}
                  className={`${item} ${atual ? 'text-navy font-semibold' : 'text-ink'}`}
                >
                  <span className="w-5 flex justify-center shrink-0">{atual && <span className="w-2 h-2 rounded-full bg-navy" aria-hidden="true" />}</span>
                  <span className="min-w-0 flex-1">{g.nome}</span>
                  <span className="text-xs text-ink-3 tabular-nums">{g.itens.length}</span>
                  <Icone nome="chevron_right" className="text-ink-3 -mr-1" />
                </button>
              );
            })}
            {grupos.length === 0 && <p className="px-3 py-3 text-sm text-ink-3">Nenhuma opção disponível.</p>}
          </div>
          {maisAbaixo && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent flex items-end justify-center pb-0.5" aria-hidden="true">
              <Icone nome="keyboard_arrow_down" className="text-[18px] text-ink-3" />
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};
