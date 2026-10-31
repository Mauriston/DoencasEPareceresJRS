// Ficheiro: components/ui/Page.tsx
// Estrutura de página padrão: container com UMA de três larguras (leitura 720 ·
// formulário 640 · dados 1200), margens do grid (16 · 24 · 32) e o PageHeader
// com o título único da página, descrição e ações. Antes, cada tela escolhia
// uma largura própria (672 a 1600 px) e repetia o título na topbar e num H2.
import React from 'react';

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

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  /** Ações da página (botões): a primária é única e fica por último. */
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, className = '' }) => (
  <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 ${className}`}>
    <div className="min-w-0">
      <h1 className="text-h1 font-extrabold text-navy leading-tight">{title}</h1>
      {description && <p className="text-sm text-ink-3 mt-1">{description}</p>}
    </div>
    {actions && <div className="flex flex-col-reverse sm:flex-row gap-2 shrink-0">{actions}</div>}
  </div>
);

interface PageProps extends PageHeaderProps {
  size?: PageSize;
  children: React.ReactNode;
}

export const Page: React.FC<PageProps> = ({ size = 'data', title, description, actions, children }) => (
  <div className="py-6 md:py-8 pb-10">
    <Container size={size}>
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </Container>
  </div>
);
