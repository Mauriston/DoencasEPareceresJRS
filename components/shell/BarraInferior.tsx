// Ficheiro: components/shell/BarraInferior.tsx
// Barra inferior do celular (< md; auditoria v3, M4/4e): os destinos do perfil
// (config/barraInferior.ts, mesma matriz canAccessPage da sidebar) + "Menu", que abre o drawer.
//  • Ativo: pílula ouro atrás do ícone + rótulo em negrito (nunca só a cor do ícone).
//  • Oculta ao rolar para baixo e volta ao rolar para cima (hooks/useOcultarAoRolar.ts), com
//    translateY(100%) em 200 ms cubic-bezier(0.2,0,0,1) — sem animação com prefers-reduced-motion.
//    Oculta fica `inert` (nem clicável nem focável).
//  • Publica no <html> as variáveis que o FAB (components/ui/Fab.tsx) e o conteúdo usam:
//      --tabbar-h      altura da barra (64 px + área segura) · 0 sem barra/desktop
//      --tabbar-folga  folga fixa embaixo do conteúdo (78 px + área segura) · 0 no desktop
//      --fab-bottom    onde o FAB da página fica: 16 px acima da barra, ou 16 px + área segura com ela oculta
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

const ALTURA = 'calc(64px + env(safe-area-inset-bottom))';
const FOLGA = 'calc(78px + env(safe-area-inset-bottom))';
const FAB_SEM_BARRA = 'calc(16px + env(safe-area-inset-bottom))';

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

const CLASSE_ITEM = 'flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 h-16 px-1 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold';

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
      '--tabbar-h': ativa ? ALTURA : '0px',
      '--tabbar-folga': FOLGA,
      '--fab-bottom': ativa && visivel ? `calc(${ALTURA} + 16px)` : FAB_SEM_BARRA,
    });
  }, [isDesktop, ativa, visivel]);
  useEffect(() => () => definirVariaveis({ '--tabbar-h': null, '--tabbar-folga': null, '--fab-bottom': null }), []);

  if (!ativa) return null;
  const destinos = destinosBarraInferior(perfil, { concursoEmAndamento: !!emAndamento, viewAtual: view });

  return (
    <nav
      aria-label="Navegação principal"
      // `inert` fora da tela: nem clicável nem focável.
      inert={!visivel}
      onFocus={mostrar}
      className={`md:hidden fixed inset-x-0 bottom-0 z-topbar bg-white border-t border-line pb-[env(safe-area-inset-bottom)] transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${visivel ? 'translate-y-0' : 'translate-y-full'}`}
    >
      <ul className="flex items-stretch">
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
  );
};
