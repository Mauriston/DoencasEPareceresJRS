// Ficheiro: components/ui/BotaoCopiar.tsx
// Botão de copiar para a área de transferência, com a confirmação na própria etiqueta ("Copiado") por alguns
// segundos. Nasceu nos exames transcritos dos concursos (components/concursos/ExamesCandidato.tsx) e serve também
// à transcrição dos exames e atestados da Ficha do inspecionado (components/ficha/exames/PainelDocumentoIS.tsx).
import React, { useState } from 'react';
import { CopyButton, CopyButtonIcon } from '@animate-ui/react/primitives/buttons/copy';

const ICONE = 'material-symbols-outlined text-[18px]';

/** Botão de copiar que confirma na própria etiqueta por alguns segundos. O ícone troca por um check (CopyButton,
 *  Animate UI: encolhe e desfoca de leve; o botão afunda ao toque). */
export const BotaoCopiar: React.FC<{ texto: string; rotulo?: string; titulo: string; className?: string }> = ({ texto, rotulo, titulo, className = '' }) => {
  const [copiado, setCopiado] = useState(false);
  return (
    <CopyButton
      content={texto}
      delay={1800}
      onCopiedChange={setCopiado}
      title={titulo}
      aria-label={titulo}
      className={`shrink-0 inline-flex items-center gap-1 min-h-[36px] px-2 rounded-lg text-xs font-bold transition-colors ${copiado ? 'bg-green-50 text-green-800' : 'text-navy hover:bg-thead'} ${className}`}
    >
      <CopyButtonIcon
        icon={<span className={ICONE} aria-hidden="true">content_copy</span>}
        copiedIcon={<span className={ICONE} aria-hidden="true">check</span>}
      />
      {rotulo && <span>{copiado ? 'Copiado' : rotulo}</span>}
    </CopyButton>
  );
};
