// Ficheiro: components/shell/BarraInferior.tsx
// Barra inferior do celular (< md; auditoria v3, M4/4e): os destinos do perfil
// (config/barraInferior.ts, mesma matriz canAccessPage da sidebar) + "Menu", que abre o drawer.
//  • Flutuante: pílula branca com sombra, solta das bordas (12 px de margem), e o FAB da página
//    (components/ui/Fab.tsx) fica ao lado dela, separado, na mesma linha de base. Quando a página tem
//    FAB (html[data-fab-pagina], publicado pelo Fab), a pílula encolhe à direita para abrir espaço (styles/app.css).
//  • Ativo: pílula ouro atrás do ícone + rótulo em negrito (nunca só a cor do ícone).
//  • Rótulos "ao lado" (BottomNavigationLabel show="active"): só o item ativo mostra o nome, ao lado do ícone, dentro
//    da pílula ouro; os demais ficam só com o ícone (o nome continua no aria-label). A largura do rótulo anima com spring.
//  • Animações do Animate UI (primitivo BottomNavigation, `@animate-ui/react` + `motion`): o destaque ouro desliza
//    entre os itens (spring 300/30) e os itens escalam a 0,97 ao toque. A decisão de ocultar continua nossa.
//  • Oculta ao rolar para baixo e volta ao rolar para cima (hooks/useOcultarAoRolar.ts), com
//    translateY(100%) em 200 ms cubic-bezier(0.2,0,0,1) — sem animação com prefers-reduced-motion.
//    Oculta fica `inert` (nem clicável nem focável).
//  • Publica no <html> as variáveis que o FAB (components/ui/Fab.tsx) e o conteúdo usam:
//      --tabbar-h      espaço ocupado embaixo (margem 12 px + barra 62 px + área segura) · 0 sem barra/desktop
//      --tabbar-folga  folga fixa embaixo do conteúdo (94 px + área segura) · 0 no desktop
//      --fab-bottom    onde o FAB da página fica: centrado na barra (15 px + área segura), fixo mesmo com a barra oculta
import React, { useContext, useEffect, useState, type RefObject } from 'react';
import { BottomNavigation, BottomNavigationHighlight, BottomNavigationHighlightItem, BottomNavigationItem, BottomNavigationLabel } from '@animate-ui/react/primitives/bottom-navigation';
import { useReducedMotion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { NavContext } from '../../context/NavContext';
import { canAccessPage } from '../../config/permissions';
import { destinosBarraInferior } from '../../config/barraInferior';
import { pathForView } from '../../config/routes';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useOcultarAoRolar } from '../../hooks/useOcultarAoRolar';
import { useConcursoEmAndamento } from '../../hooks/useConcursoEmAndamento';

export const ID_DRAWER_MENU = 'menu-principal-drawer';

const OCUPADO = 'calc(74px + env(safe-area-inset-bottom))';
const FOLGA = 'calc(94px + env(safe-area-inset-bottom))';
const FAB_BOTTOM = 'calc(15px + env(safe-area-inset-bottom))';

const definirVariaveis = (vars: Record<string, string | null>) => {
  const raiz = document.documentElement.style;
  Object.entries(vars).forEach(([k, v]) => (v === null ? raiz.removeProperty(k) : raiz.setProperty(k, v)));
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
const classeItem = (ativo: boolean, compacto: boolean) => `relative z-10 h-[52px] min-w-10 flex items-center justify-center ${compacto ? 'px-2.5' : 'px-3 max-[340px]:px-2.5'} rounded-full transition-colors ${ativo ? 'text-navy' : 'text-ink-3'} focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold`;

export const BarraInferior: React.FC<{ alvo: RefObject<HTMLElement | null> }> = ({ alvo }) => {
  const nav = useContext(NavContext);
  const { pathname } = useLocation();
  const isDesktop = useIsDesktop();
  const reduzMovimento = useReducedMotion();
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
    <BottomNavigation
      aria-label="Navegação principal"
      value={drawerAberto ? 'menu' : (view ?? '')}
      scrollBehavior="none"
      // `inert` fora da tela: nem clicável nem focável. Quem decide ocultar é o nosso useOcultarAoRolar
      // (teclado, sheets, limiar, rota); o primitivo só anima o deslize, numa spring.
      inert={!visivel}
      onFocus={mostrar}
      initial={false}
      animate={reduzMovimento ? { opacity: visivel ? 1 : 0, y: 0 } : { opacity: 1, y: visivel ? 0 : '250%' }}
      transition={reduzMovimento ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 35 }}
      data-barra-flutuante=""
      className="md:hidden fixed z-topbar bg-white border border-line rounded-full shadow-[0_10px_28px_-4px_rgba(18,28,75,0.28),0_2px_8px_rgba(18,28,75,0.14)] bottom-[calc(12px+env(safe-area-inset-bottom))] left-[calc(12px+env(safe-area-inset-left))] right-[calc(12px+env(safe-area-inset-right))]"
    >
      <BottomNavigationHighlight className="absolute inset-0 rounded-full bg-gold">
        <ul className="flex items-center justify-between p-1">
          {destinos.map(d => {
            const ativo = view === d.view && !drawerAberto;
            return (
              <li key={d.view} className={`flex ${ativo ? 'shrink-0' : 'min-w-0'}`}>
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
          <li className={`flex ${drawerAberto ? 'shrink-0' : 'min-w-0'}`}>
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
    </BottomNavigation>
    </>
  );
};
