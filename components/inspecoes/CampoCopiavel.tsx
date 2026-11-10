// Ficheiro: components/inspecoes/CampoCopiavel.tsx
// Campo editável com rótulo e botão de copiar só o seu conteúdo (feedback "Copiado" por ~1,5 s).
// `multilinha`: textarea que ocupa a altura disponível; senão, input de 1 linha (texto longo rola na horizontal).
import React, { useEffect, useId, useRef, useState } from 'react';
import { IconButton } from '../ui/IconButton';
import { controlClass } from '../ui/Field';

interface Props {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  multilinha?: boolean;
  /** Falha ao copiar (sem permissão da área de transferência). */
  onErroCopiar?: () => void;
}

export const copiarTexto = async (texto: string): Promise<boolean> => {
  try { await navigator.clipboard.writeText(texto); return true; } catch { return false; }
};

export const CampoCopiavel: React.FC<Props> = ({ rotulo, valor, onChange, multilinha = false, onErroCopiar }) => {
  const id = useId();
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copiar = async () => {
    if (await copiarTexto(valor)) {
      setCopiado(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopiado(false), 1500);
    } else onErroCopiar?.();
  };

  return (
    <div className={multilinha ? 'flex flex-col flex-1 min-h-0 gap-1' : 'flex flex-col gap-1'}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold text-ink-3">{rotulo}</label>
        {copiado && <span role="status" className="text-xs font-semibold text-green">Copiado</span>}
      </div>
      <div className={multilinha ? 'flex items-start gap-2 flex-1 min-h-0' : 'flex items-center gap-2'}>
        {multilinha ? (
          <textarea id={id} value={valor} onChange={e => onChange(e.target.value)} className={`${controlClass} h-full min-h-[240px] resize-none font-mono text-xs leading-relaxed`} />
        ) : (
          <input id={id} type="text" value={valor} onChange={e => onChange(e.target.value)} className={`${controlClass} font-mono text-xs whitespace-nowrap overflow-x-auto`} />
        )}
        <IconButton icon={copiado ? 'check' : 'content_copy'} label={`Copiar ${rotulo.replace(/:$/, '')}`} variant="secondary" onClick={copiar} />
      </div>
    </div>
  );
};
