// Ficheiro: components/ui/BotaoCopiar.tsx
// Botão de copiar para a área de transferência, com a confirmação na própria etiqueta ("Copiado") por alguns
// segundos. Nasceu nos exames transcritos dos concursos (components/concursos/ExamesCandidato.tsx) e serve também
// à transcrição dos exames e atestados da Ficha do inspecionado (components/ficha/exames/PainelDocumentoIS.tsx).
import React, { useEffect, useState } from 'react';

const copiar = async (texto: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
};

/** Botão de copiar que confirma na própria etiqueta por alguns segundos. */
export const BotaoCopiar: React.FC<{ texto: string; rotulo?: string; titulo: string; className?: string }> = ({ texto, rotulo, titulo, className = '' }) => {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = window.setTimeout(() => setCopiado(false), 1800);
    return () => window.clearTimeout(t);
  }, [copiado]);
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={async () => { if (await copiar(texto)) setCopiado(true); }}
      className={`shrink-0 inline-flex items-center gap-1 min-h-[36px] px-2 rounded-lg text-xs font-bold transition-colors ${copiado ? 'bg-green-50 text-green-800' : 'text-navy hover:bg-thead'} ${className}`}
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{copiado ? 'check' : 'content_copy'}</span>
      {rotulo && <span>{copiado ? 'Copiado' : rotulo}</span>}
    </button>
  );
};
