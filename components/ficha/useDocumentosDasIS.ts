// Ficheiro: components/ficha/useDocumentosDasIS.ts
// Documentos gerados nas IS do inspecionado (inspecoes/{isId}/documentos — um ouvinte por IS), para a aba Outros.
import { useEffect, useMemo, useState } from 'react';
import { observarDocumentosDaIS, type RegistroDocumentoIS } from '../../services/documentosIS';

export const useDocumentosDasIS = (inspecoes: ReadonlyArray<{ id: string }>, ativo: boolean): RegistroDocumentoIS[] => {
  const chave = inspecoes.map(i => i.id).join('|');
  const [porIS, setPorIS] = useState<Record<string, RegistroDocumentoIS[]>>({});
  useEffect(() => {
    setPorIS({});
    if (!ativo || !chave) return;
    const parar = chave.split('|').map(id => observarDocumentosDaIS(id, l => setPorIS(m => ({ ...m, [id]: l })), () => setPorIS(m => ({ ...m, [id]: [] }))));
    return () => parar.forEach(f => f());
  }, [chave, ativo]);
  return useMemo(() => (Object.values(porIS) as RegistroDocumentoIS[][]).flat().sort((a, b) => b.criadoEmMs - a.criadoEmMs), [porIS]);
};
