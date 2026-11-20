// Ficheiro: components/StoragePdfButtons.tsx
// Botões de download de PDF: botão secundário rotulado no desktop e o FAB padrão
// do app no celular (components/ui/Fab.tsx — --fab-bottom + área segura, auditoria
// v3 M7). Usados nas páginas renderizadas de capítulos/anexos da DGPM-406 e do
// guia de concursos.
import React from 'react';
import { Button } from './ui/Button';
import { FabAcoes } from './ui/Fab';

interface StoragePdfButtonProps {
  busy: boolean;
  onClick: () => void;
}

/** Botão rotulado no desktop (esconde no celular, onde o FAB assume). */
export const StoragePdfIconButton: React.FC<StoragePdfButtonProps> = ({ busy, onClick }) => (
  <Button variant="secondary" icon="download" loading={busy} onClick={onClick} title="Baixar em PDF" className="hidden md:inline-flex">
    Baixar PDF
  </Button>
);

/**
 * FAB no celular (some no desktop). Renderize fora de grades/containers com transform.
 * `bottomClass` ficou só por compatibilidade: a altura vem de --fab-bottom.
 */
export const StoragePdfFab: React.FC<StoragePdfButtonProps & { bottomClass?: string }> = ({ busy, onClick }) => (
  <FabAcoes acoes={[{ id: 'baixar-pdf', rotulo: 'Baixar PDF', icone: 'download', onClick, loading: busy, disabled: busy , manterIcone: true }]} />
);
