// Ficheiro: components/ui/Fab.tsx
// FAB padrão único do app (auditoria v3, 4d/M7). Um só desenho para o FAB das páginas
// (<FabAcoes>) e para o das ações de sheet/drawer no celular (AcoesRodape): um botão CIRCULAR,
// só com ícone (sem texto; o nome da ação vai no aria-label):
//  • 0 ações → nada (nem espaço reservado; nunca um botão desabilitado);
//  • 1 ação  → o "+" executa a ação direto (no sheet/drawer, o ícone é o da própria ação);
//  • 2+      → o "+" abre a pilha (speed-dial) com TODAS as ações, com ícone e texto, e vira "×";
//              a principal fica mais perto do polegar. Fecha ao tocar fora, ao escolher, com Esc ou ao
//              trocar de rota. A pilha aceita ações com o mesmo rótulo e ícones diferentes.
// Posição: canto inferior direito, com área segura. O da página fica 16 px acima da barra inferior
// e desce junto quando ela se oculta (variável --fab-bottom publicada pela BarraInferior, mesma
// transição de 200 ms); z-index do token sticky. Só no celular (< md): no desktop as mesmas ações
// ficam no PageHeader (a principal por último).
//
// API para as páginas:
//   <FabAcoes acoes={[
//     { id: 'abrir-is', rotulo: 'Abrir IS', icone: 'event_available', to: '/inspecoes?novo=1', permitido: podeAbrirIS },
//     { id: 'pm', rotulo: termos.pagina === 'Atestados' ? 'Atestado' : 'Perícia Menor', icone: 'personal_injury', to: '/pericia-menor?novo=1', permitido: podeNovaPericia },
//     { id: 'exames', rotulo: 'Enviar exames', icone: 'upload_file', onClick: abrirEnvio, permitido: mostrarEnviarExames },
//   ]} />
// A ORDEM do array é a prioridade: a primeira ação com `permitido !== false` é a principal.
// Leia `permitido` de canUseFeature/canAccessPage no render (a matriz muda em tempo real).
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useEscapeEmpilhado } from '../../hooks/useEscapeEmpilhado';

export interface AcaoFab {
  id: string;
  rotulo: string;
  /** Material Symbol. */
  icone: string;
  /** Uma das duas: ação ou rota (react-router). */
  onClick?: () => void;
  to?: string;
  /** false → a ação não entra (o perfil não pode). Padrão: true. */
  permitido?: boolean;
  variante?: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  /** Nome completo para leitores de tela, quando o rótulo é curto. */
  ariaLabel?: string;
  /** Ação única de página que NÃO cria nada (ex.: "Próximo", "Baixar PDF"): mostra o próprio ícone no lugar do "+". */
  manterIcone?: boolean;
}

const COR: Record<NonNullable<AcaoFab['variante']>, string> = {
  primary: 'bg-navy text-white border border-navy hover:bg-navy-hover active:bg-navy-pressed',
  secondary: 'bg-white text-navy border border-navy hover:bg-thead',
  destructive: 'bg-white text-wine border border-wine hover:bg-wine-50',
};
const FOCO = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold';
const PILULA = 'inline-flex items-center gap-2 h-14 max-w-[calc(100vw-2rem)] pl-4 pr-5 shadow-lg text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

/** Onde o FAB fica: na página (acompanha a barra inferior) ou num sheet/drawer (acima da área segura). */
export type PosicaoFab = 'pagina' | 'sheet';

const classePosicao = (posicao: PosicaoFab) => (posicao === 'pagina'
  ? 'fixed right-[calc(1rem+env(safe-area-inset-right))] z-sticky transition-[bottom] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none'
  : 'fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-sticky');
const estiloPosicao = (posicao: PosicaoFab): React.CSSProperties | undefined => (posicao === 'pagina'
  ? { bottom: 'var(--fab-bottom, calc(16px + env(safe-area-inset-bottom)))' }
  : undefined);

const Icone: React.FC<{ acao: AcaoFab }> = ({ acao }) => (
  <span className={`material-symbols-outlined text-[24px] shrink-0 ${acao.loading ? 'animate-spin' : ''}`} aria-hidden="true">
    {acao.loading ? 'progress_activity' : acao.icone}
  </span>
);

interface FabFlutuanteProps {
  /** A principal PRIMEIRO; as demais na ordem de prioridade. */
  acoes: AcaoFab[];
  posicao: PosicaoFab;
}

/** Botão circular do FAB: só o ícone, sem texto (o nome vai no aria-label). */
const CIRCULO = 'inline-flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

/**
 * O desenho do FAB: um botão circular só com ícone ("+").
 *  • 1 ação  → o "+" executa a ação direto (no sheet, o ícone é o da própria ação — "+" não diz "Salvar");
 *  • 2+      → o "+" abre a pilha (speed-dial) com TODAS as ações, com ícone e texto, a principal mais perto
 *              do polegar; o "+" vira "×". Ações com o mesmo rótulo (e ícones diferentes) são aceitas.
 * Use FabAcoes (página) ou AcoesRodape (sheet/drawer).
 */
export const FabFlutuante: React.FC<FabFlutuanteProps> = ({ acoes, posicao }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [aberto, setAberto] = useState(false);
  const fab = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const principal = acoes[0];
  const varias = acoes.length > 1;

  const fechar = useCallback((devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) fab.current?.focus();
  }, []);
  useEscapeEmpilhado(() => fechar(), aberto);
  useEffect(() => { setAberto(false); }, [pathname]);
  useEffect(() => {
    if (!aberto) return;
    // Foco no item mais perto do polegar (a principal, último da pilha).
    const itens = menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)');
    itens?.[itens.length - 1]?.focus();
  }, [aberto]);

  const executar = (a: AcaoFab) => {
    if (a.to) navigate(a.to);
    else a.onClick?.();
  };

  if (!principal) return null;

  if (!varias) {
    const nome = principal.ariaLabel ?? principal.rotulo;
    const icone = principal.loading ? 'progress_activity' : posicao === 'pagina' && !principal.manterIcone ? 'add' : principal.icone;
    return (
      <div data-acoes-fab="" className={classePosicao(posicao)} style={estiloPosicao(posicao)}>
        <button
          type="button"
          onClick={() => executar(principal)}
          disabled={principal.disabled || principal.loading}
          aria-busy={principal.loading || undefined}
          aria-label={nome}
          title={nome}
          className={`${CIRCULO} ${FOCO} ${COR[principal.variante ?? 'primary']}`}
        >
          <span className={`material-symbols-outlined text-[28px] ${principal.loading ? 'animate-spin' : ''}`} aria-hidden="true">{icone}</span>
        </button>
      </div>
    );
  }

  const navegar = (e: React.KeyboardEvent) => {
    const itens: HTMLButtonElement[] = menu.current ? Array.from(menu.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')) : [];
    if (!itens.length) return;
    const i = itens.indexOf(document.activeElement as HTMLButtonElement);
    const ir = (n: number) => { e.preventDefault(); itens[(n + itens.length) % itens.length].focus(); };
    if (e.key === 'ArrowDown') ir(i + 1);
    else if (e.key === 'ArrowUp') ir(i - 1);
    else if (e.key === 'Home') ir(0);
    else if (e.key === 'End') ir(itens.length - 1);
    else if (e.key === 'Tab') fechar(false);
  };

  // Pilha de cima para baixo: as demais (a de menor prioridade no alto) e a principal por último.
  const pilha = [...acoes.slice(1).reverse(), principal];
  const nomePrincipal = principal.ariaLabel ?? principal.rotulo;
  const rotuloFab = aberto
    ? 'Fechar ações'
    : `Ações: ${nomePrincipal} e mais ${acoes.length - 1} ${acoes.length - 1 === 1 ? 'ação' : 'ações'}`;

  return (
    <>
      {aberto && <div className="fixed inset-0 z-sticky bg-black/10 animate-backdrop-in" onClick={() => fechar()} aria-hidden="true" />}
      <div data-acoes-fab="" className={`${classePosicao(posicao)} flex flex-col items-end gap-3`} style={estiloPosicao(posicao)}>
        {aberto && (
          <div ref={menu} id={menuId} role="menu" aria-label="Ações" onKeyDown={navegar} className="flex flex-col items-end gap-2">
            {pilha.map((a, i) => (
              <button
                // id + posição: a pilha aceita ações com o mesmo rótulo (ex.: "Abrir IS" manual e por foto).
                key={`${a.id}-${i}`}
                type="button"
                role="menuitem"
                disabled={a.disabled || a.loading}
                aria-busy={a.loading || undefined}
                aria-label={a.ariaLabel}
                onClick={() => { fechar(); executar(a); }}
                style={{ animationDelay: `${(pilha.length - 1 - i) * 30}ms` }}
                className={`fab-item-in ${PILULA} rounded-full ${FOCO} ${COR[a === principal ? (a.variante ?? 'primary') : (a.variante === 'destructive' ? 'destructive' : 'secondary')]}`}
              >
                <Icone acao={a} />
                <span className="truncate">{a.rotulo}</span>
              </button>
            ))}
          </div>
        )}
        <button
          ref={fab}
          type="button"
          aria-label={rotuloFab}
          title={aberto ? 'Fechar ações' : 'Ações'}
          aria-haspopup="menu"
          aria-expanded={aberto}
          aria-controls={aberto ? menuId : undefined}
          onClick={() => (aberto ? fechar() : setAberto(true))}
          className={`${CIRCULO} ${FOCO} ${COR.primary}`}
        >
          <span className={`material-symbols-outlined text-[28px] transition-transform duration-200 motion-reduce:transition-none ${aberto ? 'rotate-90' : ''}`} aria-hidden="true">
            {aberto ? 'close' : 'add'}
          </span>
        </button>
      </div>
    </>
  );
};

/**
 * FAB da página (só no celular). `acoes` em ordem de prioridade; as não permitidas saem.
 * Renderizado no próprio lugar (sem portal): os sheets/drawers da página (z-drawer) ficam por
 * cima dele. Não o coloque dentro de um elemento com `transform`/`filter` (viraria o bloco de
 * contenção do `position: fixed`).
 */
export const FabAcoes: React.FC<{ acoes: AcaoFab[] }> = ({ acoes }) => {
  const isDesktop = useIsDesktop();
  const permitidas = acoes.filter(a => a.permitido !== false);
  if (isDesktop || !permitidas.length) return null;
  return <FabFlutuante acoes={permitidas} posicao="pagina" />;
};
