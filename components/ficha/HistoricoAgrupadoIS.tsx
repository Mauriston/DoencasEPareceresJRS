// Ficheiro: components/ficha/HistoricoAgrupadoIS.tsx
// Histórico em dois níveis do painel de apoio da Ficha (abas Exames e Outros): 1º nível = uma linha por IS
// (finalidade · data da entrevista · nº de registros), que expande/recolhe; 2º nível = os registros daquela IS.
// Os registros sem IS ficam no grupo final "Sem IS". Expandida de início: a IS pedida (?is=) ou a do registro
// aberto; senão, a IS mais recente.
// `soltarUnicos` (aba Atestados e Laudos): só vira grupo expansível a IS com 2 ou mais registros; a IS com um só
// registro e os registros sem IS (ex.: atestados da Perícia Menor) aparecem soltos, como linha comum.
import React, { useEffect, useState } from 'react';

export interface GrupoHistoricoIS<T> {
  /** id da IS (ou SEM_IS). */
  id: string;
  titulo: string;
  /** Data já formatada (dd/mm/aaaa) ou vazia. */
  data: string;
  itens: T[];
}

export const SEM_IS = '__sem_is__';

/** Agrupa os registros por IS, na ordem das IS dadas (entrevista mais recente primeiro); os sem IS vão para "Sem IS" no fim. */
export const agruparPorIS = <T,>(
  itens: ReadonlyArray<T>, isDoItem: (t: T) => string | null | undefined,
  inspecoes: ReadonlyArray<{ id: string; titulo: string; data: string }>,
): GrupoHistoricoIS<T>[] => {
  const porIS = new Map<string, T[]>();
  itens.forEach(t => {
    const id = isDoItem(t);
    const chave = id && inspecoes.some(i => i.id === id) ? id : SEM_IS;
    porIS.set(chave, [...(porIS.get(chave) ?? []), t]);
  });
  const grupos: GrupoHistoricoIS<T>[] = inspecoes.filter(i => porIS.has(i.id)).map(i => ({ ...i, itens: porIS.get(i.id)! }));
  if (porIS.has(SEM_IS)) grupos.push({ id: SEM_IS, titulo: 'Sem IS', data: '', itens: porIS.get(SEM_IS)! });
  return grupos;
};

interface Props<T> {
  grupos: GrupoHistoricoIS<T>[];
  /** IS a expandir de início (a pedida pela navegação ou a do registro aberto); sem ela, a primeira (mais recente). */
  inicial?: string | null;
  idItem: (t: T) => string;
  /** `agrupado`: o item está dentro de um grupo expansível (a linha pode usar rótulos mais curtos). */
  renderItem: (t: T, agrupado: boolean) => React.ReactNode;
  soltarUnicos?: boolean;
  rotulo: string;
  /** Sufixo do nº de registros para o leitor de tela (ex.: "exames"). */
  nomeItens: string;
}

export const HistoricoAgrupadoIS = <T,>({ grupos, inicial, idItem, renderItem, rotulo, nomeItens, soltarUnicos = false }: Props<T>) => {
  const alvo = inicial && grupos.some(g => g.id === inicial) ? inicial : grupos[0]?.id;
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set(alvo ? [alvo] : []));
  // A IS pedida/aberta pode chegar depois (dados assíncronos ou outro registro selecionado): garante-a expandida.
  useEffect(() => {
    if (alvo) setAbertos(s => (s.has(alvo) ? s : new Set(s).add(alvo)));
  }, [alvo]);
  const alternar = (id: string) => setAbertos(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <ul className="divide-y divide-line border-t border-line overflow-y-auto overscroll-contain max-h-[60vh] xl:max-h-[calc(100dvh-14rem)] rounded-b-xl" aria-label={rotulo}>
      {grupos.map(g => {
        if (soltarUnicos && (g.itens.length < 2 || g.id === SEM_IS)) {
          return <React.Fragment key={g.id}>{g.itens.map(t => <li key={idItem(t)}>{renderItem(t, false)}</li>)}</React.Fragment>;
        }
        const aberto = abertos.has(g.id);
        const idLista = `hist-grupo-${g.id}`;
        return (
          <li key={g.id}>
            <button type="button" onClick={() => alternar(g.id)} aria-expanded={aberto} aria-controls={idLista}
              className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-thead transition-colors">
              <span className={`material-symbols-outlined text-[20px] text-navy shrink-0 transition-transform ${aberto ? 'rotate-90' : ''}`} aria-hidden="true">chevron_right</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-navy break-words">{g.titulo}</span>
                {g.data && <span className="block text-xs text-ink-3 tabular-nums">{g.data}</span>}
              </span>
              <span className="shrink-0 text-sm font-bold text-navy tabular-nums">
                {g.itens.length}<span className="sr-only"> {nomeItens}</span>
              </span>
            </button>
            {aberto && (
              <ul id={idLista} className="divide-y divide-line border-t border-line bg-canvas/40">
                {g.itens.map(t => <li key={idItem(t)} className="pl-4">{renderItem(t, true)}</li>)}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
};
