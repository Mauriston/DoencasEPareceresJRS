// Ficheiro: components/ficha/inspecoes/documentos/DialogFormularioDocumento.tsx
// Casca comum dos formulários dos documentos da IS: Dialog com título, campos (children) e Cancelar / Gerar.
import React from 'react';
import { Dialog } from '../../../ui/Dialog';
import { Button } from '../../../ui/Button';

interface Props {
  titulo: string;
  icone?: string;
  enviando: boolean;
  /** Desabilita "Gerar" (ex.: campo obrigatório vazio). */
  invalido?: boolean;
  onCancelar: () => void;
  onGerar: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export const DialogFormularioDocumento: React.FC<Props> = ({ titulo, icone = 'post_add', enviando, invalido, onCancelar, onGerar, size = 'md', children }) => (
  <Dialog
    title={titulo} icon={icone} size={size} onClose={onCancelar} travado={enviando}
    footer={<>
      <Button variant="secondary" onClick={onCancelar} disabled={enviando}>Cancelar</Button>
      <Button icon="picture_as_pdf" onClick={onGerar} loading={enviando} disabled={invalido}>Gerar</Button>
    </>}
  >
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (!invalido && !enviando) onGerar(); }}>{children}</form>
  </Dialog>
);
