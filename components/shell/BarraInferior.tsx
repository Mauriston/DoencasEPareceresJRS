// Ficheiro: components/shell/BarraInferior.tsx
// Barra inferior do celular (< md; auditoria v3, M4/4e): os destinos do perfil
// (config/barraInferior.ts, mesma matriz canAccessPage da sidebar) + "Menu", que abre o drawer.
//  • Sem FAB na página, o grupo ocupa a largura da tela (itens distribuídos); com FAB, ajusta-se ao conteúdo.
//  • Flutuante, como o exemplo do Animate UI: o <nav> é um GRUPO centralizado que se ajusta ao conteúdo (flex, gap 10 px) —
//    a pílula (a própria lista de itens: branca, borda, sombra) + o ACESSÓRIO, onde o FAB da página
//    (components/ui/Fab.tsx) entra por portal (hooks/slotFabPagina.ts). O acessório só existe quando a página tem FAB.
//  • Ativo: pílula ouro atrás do ícone + rótulo em negrito (nunca só a cor do ícone).
//  • Rótulos "ao lado" (BottomNavigationLabel show="active"): só o item ativo mostra o nome, ao lado do ícone, dentro
//    da pílula ouro; os demais ficam só com o ícone (o nome continua no aria-label). A largura do rótulo anima com spring.
//  • Animações do Animate UI (primitivo BottomNavigation, `@animate-ui/react` + `motion`): o destaque ouro desliza
//    entre os itens (spring 300/30) e os itens escalam a 0,97 ao toque.
//  • MINIMIZA ao rolar para baixo (scrollBehavior="minimize", ouvindo o <main>): itens e barra encolhem para só os
//    ícones (morph em spring, rótulo dobra) e voltam ao rolar para cima, ao chegar no topo, ao focar ou tocar na barra.
//    A pílula ENCOLHE junto (ela se ajusta aos itens) e o FAB, sendo o acessório, vai de 56 para 48 px no mesmo morph.
//  • Só o teclado virtual OCULTA a barra (hooks/useOcultarAoRolar.ts, rolagem: false), com translateY em spring —
//    fade com prefers-reduced-motion. Oculta fica `inert` (nem clicável nem focável).
//  • Publica no <html> as variáveis que o FAB (components/ui/Fab.tsx) e o conteúdo usam:
//      --tabbar-h      espaço ocupado embaixo (margem 12 px + barra 62 px, ou 54 px minimizada, + área segura) · 0 sem barra/desktop
//      --tabbar-folga  folga fixa embaixo do conteúdo (94 px + área segura) · 0 no desktop
//      --fab-bottom    onde fica o FAB fixo (sem barra: desktop/carregando) e outros botões flutuantes; com a barra o FAB é o acessório
import React, { useContext, useEffect, useState, type RefObject } from 'react';
import { BottomNavigation, BottomNavigationAccessory, BottomNavigationHighlight, BottomNavigationHighlightItem, BottomNavigationItem, BottomNavigationLabel, useBottomNavigation } from '@animate-ui/react/primitives/bottom-navigation';
import { useReducedMotion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { NavContext } from '../../context/NavContext';
import { canAccessPage } from '../../config/permissions';
import { destinosBarraInferior } from '../../config/barraInferior';
import { pathForView } from '../../config/routes';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useOcultarAoRolar } from '../../hooks/useOcultarAoRolar';
import { useConcursoEmAndamento } from '../../hooks/useConcursoEmAndamento';
import { definirSlotFab, useTemFabPagina } from '../../hooks/slotFabPagina';

export const ID_DRAWER_MENU = 'menu-principal-drawer';

const OCUPADO = 'calc(74px + env(safe-area-inset-bottom))';
const OCUPADO_MINIMIZADA = 'calc(66px + env(safe-area-inset-bottom))';
const FOLGA = 'calc(94px + env(safe-area-inset-bottom))';
const FAB_BOTTOM = 'calc(15px + env(safe-area-inset-bottom))';

const definirVariaveis = (vars: Record<string, string | null>) => {
  const raiz = document.documentElement.style;
  Object.entries(vars).forEach(([k, v]) => (v === null ? raiz.removeProperty(k) : raiz.setProperty(k, v)));
};

/** Dentro do BottomNavigation: publica a altura ocupada pela barra (`--tabbar-h`, usada pelo conteúdo e pela BarraSalvar), que
 *  muda quando ela minimiza. */
const PublicaMinimizada: React.FC = () => {
  const { minimized } = useBottomNavigation();
  useEffect(() => { definirVariaveis({ '--tabbar-h': minimized ? OCUPADO_MINIMIZADA : OCUPADO }); }, [minimized]);
  return null;
};

const Item: React.FC<{ icone: string; rotulo: string; compacto: boolean }> = ({ icone, rotulo, compacto }) => (
  <>
    <span className={`material-symbols-outlined shrink-0 ${compacto ? 'text-[22px]' : 'text-[24px] max-[340px]:text-[22px]'}`} aria-hidden="true">{icone}</span>
    {/* Só o item ativo mostra o nome, ao lado do ícone; o espaço fica DENTRO do rótulo (pl-1.5) para dobrar com ele. */}
    <BottomNavigationLabel show="active" className={`pl-1.5 leading-5 font-bold ${compacto ? 'text-[13px]' : 'text-sm max-[340px]:text-[13px]'}`}>{rotulo}</BottomNavigationLabel>
  </>
);

// O destaque (pílula ouro) desliza entre os itens (primitivo do Animate UI); o ativo leva ícone + nome em navy.
// Com 5 destinos (ou tela de até 340 px) o padding lateral encolhe, para a barra não estourar ao lado do FAB.
const classeItem = (ativo: boolean, compacto: boolean) => `relative z-10 h-[52px] min-w-10 flex items-center justify-center ${compacto ? 'px-2.5' : 'px-3 max-[340px]:px-2.5'} rounded-full transition-colors data-[minimized]:h-11 data-[minimized]:w-11 data-[minimized]:min-w-0 data-[minimized]:px-0 ${ativo ? 'text-navy' : 'text-ink-3'} focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold`;

export const BarraInferior: React.FC<{ alvo: RefObject<HTMLElement | null> }> = ({ alvo }) => {
  const nav = useContext(NavContext);
  const { pathname } = useLocation();
  const isDesktop = useIsDesktop();
  const reduzMovimento = useReducedMotion();
  const perfil = nav?.authUser?.perfil;
  const view = nav?.currentView;
  const drawerAberto = !!nav?.isMobileMenuOpen;
  const temFab = useTemFabPagina();

  // Concursos na barra: decidido ao abrir o app e a cada troca de rota — nunca no meio da rolagem.
  const podeConcursos = canAccessPage('concursosJRS', perfil);
  const { valor: emAndamentoAoVivo } = useConcursoEmAndamento(!isDesktop && podeConcursos);
  const [emAndamento, setEmAndamento] = useState<boolean | null>(emAndamentoAoVivo);
  useEffect(() => { if (emAndamento === null && emAndamentoAoVivo !== null) setEmAndamento(emAndamentoAoVivo); }, [emAndamentoAoVivo, emAndamento]);
  useEffect(() => { if (emAndamentoAoVivo !== null) setEmAndamento(emAndamentoAoVivo); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sem cache e ainda carregando: espera, para a barra não pular de 4 para 5 itens.
  const pronta = !podeConcursos || emAndamento !== null;
  const ativa = !isDesktop && pronta;
  const { visivel } = useOcultarAoRolar(alvo, { ativo: ativa, chaveRota: pathname, congelado: drawerAberto, rolagem: false });

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
    <BottomNavigation
      aria-label="Navegação principal"
      value={drawerAberto ? 'menu' : (view ?? '')}
      // Rolar para baixo MINIMIZA (primitivo, ouvindo o <main>); só o teclado virtual oculta (useOcultarAoRolar,
      // rolagem: false) e aí a barra fica `inert` (nem clicável nem focável).
      scrollBehavior="minimize"
      scrollContainer={alvo}
      inert={!visivel}
      initial={false}
      animate={reduzMovimento ? { opacity: visivel ? 1 : 0, y: 0 } : { opacity: 1, y: visivel ? 0 : '250%' }}
      transition={reduzMovimento ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 35 }}
      data-barra-flutuante=""
      className={`md:hidden fixed z-topbar inset-x-0 mx-auto max-w-[calc(100vw-24px)] flex items-center gap-2.5 ${temFab ? 'w-fit' : 'w-full px-3'} bottom-[calc(12px+env(safe-area-inset-bottom))]`}
    >
      <PublicaMinimizada />
      <BottomNavigationHighlight className="absolute inset-0 rounded-full bg-gold">
        <ul className={`min-w-0 flex items-center p-1 bg-white border border-line rounded-full shadow-[0_10px_28px_-4px_rgba(18,28,75,0.28),0_2px_8px_rgba(18,28,75,0.14)] ${temFab ? '' : 'w-full justify-around'}`}>
          {destinos.map(d => {
            const ativo = view === d.view && !drawerAberto;
            return (
              <li key={d.view} className={`flex ${ativo ? 'shrink-0' : `min-w-0 ${temFab ? '' : 'flex-1 justify-center'}`}`}>
                <BottomNavigationHighlightItem value={d.view} className="rounded-full">
                  <BottomNavigationItem asChild value={d.view}>
                    <Link to={pathForView(d.view)} aria-label={d.ariaLabel} aria-current={ativo ? 'page' : undefined} className={classeItem(ativo, destinos.length > 4)}>
                      <Item icone={d.icone} rotulo={d.rotulo} compacto={destinos.length > 4} />
                    </Link>
                  </BottomNavigationItem>
                </BottomNavigationHighlightItem>
              </li>
            );
          })}
          <li className={`flex ${drawerAberto ? 'shrink-0' : `min-w-0 ${temFab ? '' : 'flex-1 justify-center'}`}`}>
            <BottomNavigationHighlightItem value="menu" className="rounded-full">
              <BottomNavigationItem asChild value="menu">
                <button
                  type="button"
                  onClick={() => nav?.setIsMobileMenuOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={drawerAberto}
                  aria-controls={ID_DRAWER_MENU}
                  className={classeItem(drawerAberto, destinos.length > 4)}
                >
                  <Item icone="menu" rotulo="Menu" compacto={destinos.length > 4} />
                </button>
              </BottomNavigationItem>
            </BottomNavigationHighlightItem>
          </li>
        </ul>
      </BottomNavigationHighlight>
      {/* Acessório: onde o FAB da página entra (portal). 56 px, 48 px minimizado (morph do primitivo). */}
      {temFab && <BottomNavigationAccessory ref={definirSlotFab} className="relative shrink-0 size-14 data-[minimized]:size-12 rounded-full" />}
    </BottomNavigation>
    </>
  );
};
