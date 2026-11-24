// Ficheiro: components/shell/BarraInferior.tsx
// Barra inferior do celular (< md; auditoria v3, M4/4e): os destinos do perfil
// (config/barraInferior.ts, mesma matriz canAccessPage da sidebar) + "Menu", que abre o drawer.
//  • Flutuante: pílula branca com sombra, solta das bordas (12 px de margem), e o FAB da página
//    (components/ui/Fab.tsx) fica ao lado dela, separado, na mesma linha de base. Quando a página tem
//    FAB (html[data-fab-pagina], publicado pelo Fab), a pílula encolhe à direita para abrir espaço (styles/app.css).
//  • Ativo: pílula ouro atrás do ícone + rótulo em negrito (nunca só a cor do ícone).
//  • Oculta ao rolar para baixo e volta ao rolar para cima (hooks/useOcultarAoRolar.ts), com
//    translateY(100%) em 200 ms cubic-bezier(0.2,0,0,1) — sem animação com prefers-reduced-motion.
//    Oculta fica `inert` (nem clicável nem focável).
//  • Publica no <html> as variáveis que o FAB (components/ui/Fab.tsx) e o conteúdo usam:
//      --tabbar-h      espaço ocupado embaixo (margem 12 px + barra 64 px + área segura) · 0 sem barra/desktop
//      --tabbar-folga  folga fixa embaixo do conteúdo (96 px + área segura) · 0 no desktop
//      --fab-bottom    onde o FAB da página fica: centrado na barra (16 px + área segura), fixo mesmo com a barra oculta
import React, { useContext, useEffect, useState, type RefObject } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NavContext } from '../../context/NavContext';
import { canAccessPage } from '../../config/permissions';
import { destinosBarraInferior } from '../../config/barraInferior';
import { pathForView } from '../../config/routes';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useOcultarAoRolar } from '../../hooks/useOcultarAoRolar';
import { useConcursoEmAndamento } from '../../hooks/useConcursoEmAndamento';

export const ID_DRAWER_MENU = 'menu-principal-drawer';

const OCUPADO = 'calc(76px + env(safe-area-inset-bottom))';
const FOLGA = 'calc(96px + env(safe-area-inset-bottom))';
const FAB_BOTTOM = 'calc(16px + env(safe-area-inset-bottom))';

const definirVariaveis = (vars: Record<string, string | null>) => {
  const raiz = document.documentElement.style;
  Object.entries(vars).forEach(([k, v]) => (v === null ? raiz.removeProperty(k) : raiz.setProperty(k, v)));
};

const Item: React.FC<{ ativo: boolean; icone: string; rotulo: string }> = ({ ativo, icone, rotulo }) => (
  <>
    <span className={`flex items-center justify-center w-14 h-8 rounded-full transition-colors ${ativo ? 'bg-gold text-navy' : 'text-ink-3'}`} aria-hidden="true">
      <span className="material-symbols-outlined text-[24px]">{icone}</span>
    </span>
    <span className={`text-xs leading-4 truncate max-w-full ${ativo ? 'font-bold text-navy' : 'font-semibold text-ink-3'}`}>{rotulo}</span>
  </>
);

const CLASSE_ITEM = 'flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 h-16 px-1 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold rounded-full';

export const BarraInferior: React.FC<{ alvo: RefObject<HTMLElement | null> }> = ({ alvo }) => {
  const nav = useContext(NavContext);
  const { pathname } = useLocation();
  const isDesktop = useIsDesktop();
  const perfil = nav?.authUser?.perfil;
  const view = nav?.currentView;
  const drawerAberto = !!nav?.isMobileMenuOpen;

  // Concursos na barra: decidido ao abrir o app e a cada troca de rota — nunca no meio da rolagem.
  const podeConcursos = canAccessPage('concursosJRS', perfil);
  const { valor: emAndamentoAoVivo } = useConcursoEmAndamento(!isDesktop && podeConcursos);
  const [emAndamento, setEmAndamento] = useState<boolean | null>(emAndamentoAoVivo);
  useEffect(() => { if (emAndamento === null && emAndamentoAoVivo !== null) setEmAndamento(emAndamentoAoVivo); }, [emAndamentoAoVivo, emAndamento]);
  useEffect(() => { if (emAndamentoAoVivo !== null) setEmAndamento(emAndamentoAoVivo); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sem cache e ainda carregando: espera, para a barra não pular de 4 para 5 itens.
  const pronta = !podeConcursos || emAndamento !== null;
  const ativa = !isDesktop && pronta;
  const { visivel, mostrar } = useOcultarAoRolar(alvo, { ativo: ativa, chaveRota: pathname, congelado: drawerAberto });

  useEffect(() => {
    if (isDesktop) { definirVariaveis({ '--tabbar-h': null, '--tabbar-folga': null, '--fab-bottom': null }); return; }
    definirVariaveis({
      '--tabbar-h': ativa ? OCUPADO : '0px',
      '--tabbar-folga': FOLGA,
      '--fab-bottom': FAB_BOTTOM,
    });
  }, [isDesktop, ativa]);
  useEffect(() => () => definirVariaveis({ '--tabbar-h': null, '--tabbar-folga': null, '--fab-bottom': null }), []);

  if (!ativa) return null;
  const destinos = destinosBarraInferior(perfil, { concursoEmAndamento: !!emAndamento, viewAtual: view });

  return (
    <>
    {/* Véu atrás da barra: esmaece o conteúdo que passa por baixo para a pílula branca não se perder nos cards brancos. */}
    <div
      aria-hidden="true"
      className={`md:hidden fixed inset-x-0 bottom-0 z-[9] pointer-events-none h-[calc(120px+env(safe-area-inset-bottom))] bg-gradient-to-t from-canvas via-canvas/85 to-transparent transition-opacity duration-200 motion-reduce:transition-none ${visivel ? 'opacity-100' : 'opacity-0'}`}
    />
    <nav
      aria-label="Navegação principal"
      // `inert` fora da tela: nem clicável nem focável.
      inert={!visivel}
      onFocus={mostrar}
      data-barra-flutuante=""
      className={`md:hidden fixed z-topbar bg-white border border-line rounded-full shadow-[0_10px_28px_-4px_rgba(18,28,75,0.28),0_2px_8px_rgba(18,28,75,0.14)] bottom-[calc(12px+env(safe-area-inset-bottom))] left-[calc(12px+env(safe-area-inset-left))] right-[calc(12px+env(safe-area-inset-right))] transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${visivel ? 'translate-y-0' : 'translate-y-[calc(100%+24px+env(safe-area-inset-bottom))]'}`}
    >
      <ul className="flex items-stretch px-1">
        {destinos.map(d => {
          const ativo = view === d.view && !drawerAberto;
          return (
            <li key={d.view} className="flex-1 min-w-0 flex">
              <Link to={pathForView(d.view)} aria-label={d.ariaLabel} aria-current={ativo ? 'page' : undefined} className={CLASSE_ITEM}>
                <Item ativo={ativo} icone={d.icone} rotulo={d.rotulo} />
              </Link>
            </li>
          );
        })}
        <li className="flex-1 min-w-0 flex">
          <button
            type="button"
            onClick={() => nav?.setIsMobileMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={drawerAberto}
            aria-controls={ID_DRAWER_MENU}
            className={CLASSE_ITEM}
          >
            <Item ativo={drawerAberto} icone="menu" rotulo="Menu" />
          </button>
        </li>
      </ul>
    </nav>
    </>
  );
};
