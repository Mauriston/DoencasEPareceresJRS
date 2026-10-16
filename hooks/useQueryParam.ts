// Ficheiro: hooks/useQueryParam.ts
// Estado de tela guardado na URL (?chave=valor): vira deep link, entra no
// histórico do navegador (botão voltar) e sobrevive ao refresh.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useQueryParam = (chave: string): [string | null, (valor: string | null, opcoes?: { replace?: boolean }) => void] => {
  const [params, setParams] = useSearchParams();
  const valor = params.get(chave);
  const definir = useCallback((novo: string | null, opcoes?: { replace?: boolean }) => {
    setParams(prev => {
      const proximo = new URLSearchParams(prev);
      if (novo === null || novo === '') proximo.delete(chave); else proximo.set(chave, novo);
      return proximo;
    }, { replace: opcoes?.replace });
  }, [chave, setParams]);
  return [valor, definir];
};
