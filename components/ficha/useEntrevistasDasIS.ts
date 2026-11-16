// Ficheiro: components/ficha/useEntrevistasDasIS.ts
// Entrevistas gravadas de cada IS do inspecionado (inspecoes/{isId}/entrevistas — um ouvinte por IS, sem
// consulta à coleção inteira). Só Admin e user_medicos leem (firestore.rules: isJunta). Lista achatada, da
// mais recente para a mais antiga, cada entrevista com o id e o nº da IS.
import { useEffect, useMemo, useState } from 'react';
import { observarEntrevistas } from '../../services/entrevistasIS';
import type { EntrevistaRecord } from '../../config/entrevistas';

export type EntrevistaDaFicha = EntrevistaRecord & { is: number };

const ms = (t: unknown): number => (t as { toMillis?: () => number } | null)?.toMillis?.() ?? 0;

export const useEntrevistasDasIS = (inspecoes: ReadonlyArray<{ id: string; is: number }>, ativo: boolean): EntrevistaDaFicha[] => {
  const chave = inspecoes.map(i => `${i.id}:${i.is}`).join('|');
  const [porIS, setPorIS] = useState<Record<string, EntrevistaDaFicha[]>>({});
  useEffect(() => {
    setPorIS({});
    if (!ativo || !chave) return;
    const pares = chave.split('|').map(s => { const [id, n] = s.split(':'); return { id, is: Number(n) }; });
    const parar = pares.map(({ id, is }) => observarEntrevistas(
      id,
      lista => setPorIS(m => ({ ...m, [id]: lista.map(e => ({ ...e, isId: id, is })) })),
      () => setPorIS(m => ({ ...m, [id]: [] })),
    ));
    return () => parar.forEach(f => f());
  }, [chave, ativo]);
  return useMemo(() => (Object.values(porIS) as EntrevistaDaFicha[][]).flat().sort((a, b) => ms(b.criadoPor?.em) - ms(a.criadoPor?.em)), [porIS]);
};
