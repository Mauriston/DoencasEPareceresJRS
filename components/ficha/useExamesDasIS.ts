// Ficheiro: components/ficha/useExamesDasIS.ts
// PDFs enviados em "Enviar exames" de cada IS do inspecionado (inspecoes/{isId}/exames — um ouvinte por IS,
// sem consulta à coleção inteira). Devolve a lista achatada, cada PDF com o id e o nº da IS.
import { useEffect, useMemo, useState } from 'react';
import { observarExamesDaIS, type ExameISRecord } from '../../services/examesIS';

export type ExameDaFicha = ExameISRecord & { isId: string; is: number };

export const useExamesDasIS = (inspecoes: ReadonlyArray<{ id: string; is: number }>, ativo: boolean): ExameDaFicha[] => {
  const chave = inspecoes.map(i => `${i.id}:${i.is}`).join('|');
  const [porIS, setPorIS] = useState<Record<string, ExameDaFicha[]>>({});
  useEffect(() => {
    setPorIS({});
    if (!ativo || !chave) return;
    const pares = chave.split('|').map(s => { const [id, n] = s.split(':'); return { id, is: Number(n) }; });
    const parar = pares.map(({ id, is }) => observarExamesDaIS(
      id,
      lista => setPorIS(m => ({ ...m, [id]: lista.map(e => ({ ...e, isId: id, is })) })),
      () => setPorIS(m => ({ ...m, [id]: [] })),
    ));
    return () => parar.forEach(f => f());
  }, [chave, ativo]);
  return useMemo(() => (Object.values(porIS) as ExameDaFicha[][]).flat().sort((a, b) => (b.enviadoEm?.toMillis?.() ?? 0) - (a.enviadoEm?.toMillis?.() ?? 0)), [porIS]);
};
