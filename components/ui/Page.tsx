// Ficheiro: components/ui/Page.tsx
// Estrutura de página padrão: container com UMA de três larguras (leitura 720 ·
// formulário 640 · dados 1200), margens do grid (16 · 24 · 32) e o PageHeader
// com o título único da página, descrição e ações. Antes, cada tela escolhia
// uma largura própria (672 a 1600 px) e repetia o título na topbar e num H2.
// Contrato do PageHeader (auditoria v3, 3b): trilha na topbar · h1 24/800 ·
// descrição 14 ink-3 (resumo operacional) · ações em linha (⋮ · secundária ·
// primária por último), alinhadas ao topo. A primária pode vir em `fab`: no
// celular vira FAB (canto inferior direito).
// Celular (auditoria v3, 4b/M1/M9): o título vai para a topbar (h1), a descrição some
// (salvo `descricaoNoCelular`) e as `actions` são levadas à topbar (portal no slot
// #topbar-acoes, à direita da busca) — o conteúdo da página começa logo abaixo da topbar.
// Botões de AÇÃO com texto (secundárias e primária) nunca vão para a topbar: a primária vem em `fab` e as
// secundárias em `secundarias` — no desktop são Buttons no cabeçalho; no celular, a pilha do FAB padrão
// (a primária é a principal; sem primária, a primeira secundária). `actions` fica para ⋮ e botões só ícone.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FabAcoes, type AcaoFab } from './Fab';
import { Button, ButtonLink } from './Button';
import { useTituloPagina } from '../shell/TituloPagina';

export type PageSize = 'reading' | 'form' | 'data';

const LARGURA: Record<PageSize, string> = {
  reading: 'max-w-reading',
  form: 'max-w-form',
  data: 'max-w-data',
};

export const Container: React.FC<{ size?: PageSize; className?: string; children: React.ReactNode }> = ({ size = 'data', className = '', children }) => (
  <div className="w-full px-4 md:px-6 xl:px-8">
    <div className={`mx-auto w-full ${LARGURA[size]} ${className}`}>{children}</div>
  </div>
);

/** Ação primária que, no celular (< md), vira FAB no canto inferior direito. */
export interface PageHeaderFab {
  /** Material Symbol (ex.: 'add'). */
  icon: string;
  /** Verbo + objeto (ex.: "Abrir IS"): rótulo do botão no desktop e aria-label do FAB (só ícone) no celular. */
  label: string;
  onClick?: () => void;
  /** Navegação interna (react-router) em vez de onClick. */
  to?: string;
  disabled?: boolean;
  loading?: boolean;
}

/** Slot da topbar onde as ações da página aparecem no celular (Topbar.tsx). */
export const TOPBAR_ACOES_ID = 'topbar-acoes';

export interface PageHeaderProps {
  /** h1 24/800 — um por página, igual ao último item da trilha. */
  title: string;
  /** Título mostrado na topbar do celular quando difere do h1 (ex.: Início: h1 "Boa tarde, Nome", topbar "Início"). */
  tituloTopbar?: string;
  /** Sobrelinha 12/700 acima do h1 (ex.: a data na Início). Visível também no celular. */
  eyebrow?: string;
  /** Mantém a descrição visível no celular (padrão: só no desktop). */
  descricaoNoCelular?: boolean;
  /** Linha de resumo 14 ink-3 (data, situação, período, contadores). Aceita ReactNode. */
  description?: React.ReactNode;
  /**
   * Ações da página, em linha e alinhadas ao topo do título, nesta ordem:
   * ⋮ (MenuAcoes com o resto) · secundária(s) · primária por último. No celular continuam
   * em linha compacta (não empilham em largura total).
   */
  actions?: React.ReactNode;
  /** Primária da página: no desktop entra por último nas ações (Button primary); no celular vira FAB. */
  fab?: PageHeaderFab;
  /**
   * Ações secundárias com texto: no desktop, Buttons secundários antes da primária; no celular entram na pilha
   * do FAB (não lotam a topbar). Respeita `permitido` como no FabAcoes.
   */
  secundarias?: AcaoFab[];
  className?: string;
}

/** No celular: o FAB padrão do app (components/ui/Fab.tsx — transição, pilha, --fab-bottom), primária primeiro. */
const FabPagina: React.FC<{ fab?: PageHeaderFab; secundarias: AcaoFab[] }> = ({ fab, secundarias }) => (
  <FabAcoes acoes={[
    ...(fab ? [{ id: 'principal', rotulo: fab.label, icone: fab.icon, onClick: fab.onClick, to: fab.to, disabled: fab.disabled, loading: fab.loading }] : []),
    // No FAB as secundárias seguem o estilo da pilha (o FabAcoes decide a cor); o variante do desktop não vale aqui.
    ...secundarias.map(a => ({ ...a, variante: undefined })),
  ]} />
);

export const PageHeader: React.FC<PageHeaderProps> = ({ title, tituloTopbar, eyebrow, description, descricaoNoCelular = false, actions, fab, secundarias: secundariasTodas = [], className = '' }) => {
  const secundarias = secundariasTodas.filter(a => a.permitido !== false);
  const descricaoBloco = description !== undefined && description !== null && typeof description !== 'string' && typeof description !== 'number';
  const temDescricao = description !== undefined && description !== null && description !== false && description !== '';
  // M9: no celular o título vira o h1 da topbar (shell/TituloPagina.tsx); aqui o h1 some abaixo de md.
  const tituloNaTopbar = useTituloPagina(tituloTopbar ?? title);
  // 4b: no celular as ações vão para a topbar (slot #topbar-acoes, à direita da busca).
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => { setSlot(document.getElementById(TOPBAR_ACOES_ID)); }, []);
  // No celular, sem sobrelinha nem descrição visível, o cabeçalho não ocupa espaço: o conteúdo cola na topbar.
  const vazioNoCelular = tituloNaTopbar && !eyebrow && !(temDescricao && descricaoNoCelular);
  return (<>
    {/* No celular, o cabeçalho vazio some de vez (display:none): assim não conta no gap/space-y de quem o contém. */}
    <div className={`${vazioNoCelular ? 'hidden md:flex' : 'flex'} flex-col md:flex-row md:items-start md:justify-between gap-3 mb-6 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className={`${tituloNaTopbar ? 'hidden md:block ' : ''}text-h1 font-extrabold text-navy leading-tight`}>{title}</h1>
        {temDescricao && (
          descricaoBloco
            ? <div className={`text-sm text-ink-3 mt-1 ${descricaoNoCelular || !tituloNaTopbar ? '' : 'hidden md:block'}`}>{description}</div>
            : <p className={`text-sm text-ink-3 mt-1 ${descricaoNoCelular || !tituloNaTopbar ? '' : 'hidden md:block'}`}>{description}</p>
        )}
      </div>
      {(actions || fab || secundarias.length > 0) && (
        <div className={`${tituloNaTopbar && slot ? 'hidden md:flex' : 'flex'} flex-row flex-wrap items-center justify-end gap-2 shrink-0`}>
          {actions}
          {secundarias.map(a => (
            a.to
              ? <ButtonLink key={a.id} to={a.to} variant={a.variante ?? 'secondary'} icon={a.icone} className="hidden md:inline-flex">{a.rotulo}</ButtonLink>
              : <Button key={a.id} variant={a.variante ?? 'secondary'} icon={a.icone} onClick={a.onClick} disabled={a.disabled} loading={a.loading} aria-label={a.ariaLabel} className="hidden md:inline-flex">{a.rotulo}</Button>
          ))}
          {fab && (
            fab.to
              ? <ButtonLink to={fab.to} icon={fab.icon} className="hidden md:inline-flex">{fab.label}</ButtonLink>
              : <Button icon={fab.icon} onClick={fab.onClick} disabled={fab.disabled} loading={fab.loading} className="hidden md:inline-flex">{fab.label}</Button>
          )}
        </div>
      )}
    </div>
    {/* Celular: as mesmas ações na topbar (o slot só existe/aparece abaixo de md). */}
    {actions && tituloNaTopbar && slot && createPortal(<div className="flex items-center gap-1">{actions}</div>, slot)}
    {(fab || secundarias.length > 0) && <FabPagina fab={fab} secundarias={secundarias} />}
  </>);
};

interface PageProps extends PageHeaderProps {
  size?: PageSize;
  children: React.ReactNode;
}

export const Page: React.FC<PageProps> = ({ size = 'data', title, description, actions, fab, secundarias, children, ...resto }) => (
  <div className={`py-6 md:py-8 pt-4 md:pt-8 ${fab || secundarias?.length ? 'pb-28 md:pb-10' : 'pb-10'}`}>
    <Container size={size}>
      <PageHeader title={title} description={description} actions={actions} fab={fab} secundarias={secundarias} {...resto} />
      {children}
    </Container>
  </div>
);
