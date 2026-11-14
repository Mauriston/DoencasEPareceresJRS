// Ficheiro: components/ui/Page.tsx
// Estrutura de página padrão: container com UMA de três larguras (leitura 720 ·
// formulário 640 · dados 1200), margens do grid (16 · 24 · 32) e o PageHeader
// com o título único da página, descrição e ações. Antes, cada tela escolhia
// uma largura própria (672 a 1600 px) e repetia o título na topbar e num H2.
// Contrato do PageHeader (auditoria v3, 3b): trilha na topbar · h1 24/800 ·
// descrição 14 ink-3 (resumo operacional, sem sobrelinha) · ações em linha
// (⋮ · secundária · primária por último), alinhadas ao topo. A primária pode
// vir em `fab`: no celular vira FAB (canto inferior direito).
import React from 'react';
import { Link } from 'react-router-dom';
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
  /** Verbo + objeto (ex.: "Abrir IS"): rótulo do botão no desktop e do FAB estendido no celular. */
  label: string;
  onClick?: () => void;
  /** Navegação interna (react-router) em vez de onClick. */
  to?: string;
  disabled?: boolean;
  loading?: boolean;
}

export interface PageHeaderProps {
  /** h1 24/800 — um por página, igual ao último item da trilha. */
  title: string;
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
  className?: string;
}

const FabPagina: React.FC<{ fab: PageHeaderFab }> = ({ fab }) => {
  const cls =
    'md:hidden fixed right-4 bottom-[var(--fab-bottom)] z-10 inline-flex items-center gap-2 h-14 pl-4 pr-5 rounded-xl ' +
    'bg-navy text-white text-sm font-bold shadow-lg border border-navy hover:bg-navy-hover active:bg-navy-pressed ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50';
  const conteudo = (
    <>
      <span className={`material-symbols-outlined text-[24px] ${fab.loading ? 'animate-spin' : ''}`} aria-hidden="true">{fab.loading ? 'progress_activity' : fab.icon}</span>
      {fab.label}
    </>
  );
  return fab.to && !fab.disabled
    ? <ButtonLinkFab to={fab.to} className={cls}>{conteudo}</ButtonLinkFab>
    : <button type="button" data-page-fab onClick={fab.onClick} disabled={fab.disabled || fab.loading} aria-busy={fab.loading || undefined} className={cls}>{conteudo}</button>;
};

const ButtonLinkFab: React.FC<{ to: string; className: string; children: React.ReactNode }> = ({ to, className, children }) => (
  <Link to={to} data-page-fab className={className}>{children}</Link>
);

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, fab, className = '' }) => {
  const descricaoBloco = description !== undefined && description !== null && typeof description !== 'string' && typeof description !== 'number';
  // M9: no celular o título vira o h1 da topbar (shell/TituloPagina.tsx); aqui o h1 some abaixo de md.
  const tituloNaTopbar = useTituloPagina(title);
  return (
    <div className={`flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-6 ${className}`}>
      <div className="min-w-0">
        <h1 className={`${tituloNaTopbar ? 'hidden md:block ' : ''}text-h1 font-extrabold text-navy leading-tight`}>{title}</h1>
        {description !== undefined && description !== null && description !== false && description !== '' && (
          descricaoBloco
            ? <div className="text-sm text-ink-3 mt-1">{description}</div>
            : <p className="text-sm text-ink-3 mt-1">{description}</p>
        )}
      </div>
      {(actions || fab) && (
        <div className="flex flex-row flex-wrap items-center md:justify-end gap-2 shrink-0">
          {actions}
          {fab && (
            fab.to
              ? <ButtonLink to={fab.to} icon={fab.icon} className="hidden md:inline-flex">{fab.label}</ButtonLink>
              : <Button icon={fab.icon} onClick={fab.onClick} disabled={fab.disabled} loading={fab.loading} className="hidden md:inline-flex">{fab.label}</Button>
          )}
        </div>
      )}
      {fab && <FabPagina fab={fab} />}
    </div>
  );
};

interface PageProps extends PageHeaderProps {
  size?: PageSize;
  children: React.ReactNode;
}

export const Page: React.FC<PageProps> = ({ size = 'data', title, description, actions, fab, children }) => (
  <div className={`py-6 md:py-8 ${fab ? 'pb-28 md:pb-10' : 'pb-10'}`}>
    <Container size={size}>
      <PageHeader title={title} description={description} actions={actions} fab={fab} />
      {children}
    </Container>
  </div>
);
