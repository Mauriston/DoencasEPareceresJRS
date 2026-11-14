// Ficheiro: hooks/useConcursoEmAndamento.ts
// Existe pelo menos um concurso com situação "Em andamento"? (barra inferior do celular, 4e).
// Lê a mesma coleção que a Início já observa (observarConcursos): o SDK do Firestore compartilha
// o listener de consultas idênticas no mesmo cliente, então não há leitura extra. O último valor
// fica em cache local para a primeira pintura (sem a barra pular de 4 para 5 itens).
import { useEffect, useState } from 'react';
import { observarConcursos } from '../services/firestoreConcursos';

const CHAVE_CACHE = 'jrs_barra_concurso_em_andamento';

export const lerCacheConcursoEmAndamento = (): boolean | null => {
  try {
    const v = localStorage.getItem(CHAVE_CACHE);
    return v === '1' ? true : v === '0' ? false : null;
  } catch { return null; }
};

/** null enquanto não há dado (nem em cache). `ativo` = o perfil acessa Concursos. */
export const useConcursoEmAndamento = (ativo: boolean): { valor: boolean | null; carregado: boolean } => {
  const [valor, setValor] = useState<boolean | null>(() => (ativo ? lerCacheConcursoEmAndamento() : false));
  const [carregado, setCarregado] = useState(!ativo);
  useEffect(() => {
    if (!ativo) { setValor(false); setCarregado(true); return; }
    setCarregado(false);
    return observarConcursos(lista => {
      const tem = lista.some(c => c.status === 'em_andamento');
      setValor(tem);
      setCarregado(true);
      try { localStorage.setItem(CHAVE_CACHE, tem ? '1' : '0'); } catch { /* sem localStorage */ }
    }, () => { setCarregado(true); /* silencioso: fica o cache */ });
  }, [ativo]);
  return { valor, carregado };
};
