// Ficheiro: components/ficha/CascaFormulario.tsx
// Casca de um formulário que abre num Drawer (padrão: barra lateral/bottom sheet) ou, na Ficha do inspecionado
// em telas grandes, no PAINEL PRINCIPAL (CascaPainelFicha), com o rodapé do formulário na barra inferior.
// No celular a Ficha continua usando o Drawer (bottom sheet) — decisão do Presidente da JRS (16/11/2026).
import React from 'react';
import { Drawer } from '../ui/Drawer';
import { CascaPainelFicha } from './CascaPainelFicha';

export type CascaForm = 'drawer' | 'inline';

interface Props {
  casca?: CascaForm;
  title: string;
  icon?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const CascaFormulario: React.FC<Props> = ({ casca = 'drawer', title, icon, onClose, footer, children }) => (
  casca === 'inline'
    ? <CascaPainelFicha titulo={title} icone={icon} acoes={footer ? [{ id: 'rodape', node: footer }] : []}>{children}</CascaPainelFicha>
    : <Drawer title={title} icon={icon} onClose={onClose} footer={footer}>{children}</Drawer>
);
