// Ficheiro: components/scanner/BotaoDigitalizar.tsx
// Botão "Digitalizar (gera o PDF)", ao lado do seletor de arquivo de todos os envios de PDF: abre o scanner
// (ScannerDocumento — bordas, perspectiva, realce, várias páginas pelo "Adicionar página") e entrega um File PDF
// de até 10 MB (config/limitePdf.ts) ao mesmo fluxo do arquivo escolhido. Sem câmera (PC), o scanner cai no
// seletor de imagens do sistema.
import React, { useState } from 'react';
import { Button, type ButtonProps } from '../ui/Button';
import { ScannerDocumento } from './ScannerDocumento';

interface Props extends Omit<ButtonProps, 'onClick' | 'children'> {
  /** Recebe o PDF gerado (File "application/pdf"). */
  onPdf: (arquivo: File) => void;
  /** Prefixo do nome do arquivo (ex.: "exames" → exames-digitalizado-3p.pdf). */
  nomeBase?: string;
  /** Título do scanner. */
  titulo?: string;
  rotulo?: string;
}

export const ROTULO_DIGITALIZAR = 'Digitalizar (gera o PDF)';

export const BotaoDigitalizar: React.FC<Props> = ({ onPdf, nomeBase = 'documento', titulo = 'Digitalizar documento', rotulo = ROTULO_DIGITALIZAR, variant = 'secondary', icon = 'document_scanner', ...resto }) => {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} icon={icon} {...resto} onClick={() => setAberto(true)}>{rotulo}</Button>
      {aberto && (
        <ScannerDocumento
          titulo={titulo}
          onCancelar={() => setAberto(false)}
          onConcluir={(paginas, pdf) => {
            setAberto(false);
            onPdf(new File([pdf], `${nomeBase}-digitalizado-${paginas.length}p.pdf`, { type: 'application/pdf' }));
          }}
        />
      )}
    </>
  );
};
