// Ficheiro: hooks/useEscapeEmpilhado.ts
// Esc fecha só a camada mais alta quando há painéis/diálogos empilhados (ex.: o
// cadastro de militar aberto sobre o formulário de parecer).
import { useEffect, useRef } from 'react';

const pilha: symbol[] = [];

export const useEscapeEmpilhado = (aoEsc: () => void, ativo = true) => {
  const ref = useRef(aoEsc);
  ref.current = aoEsc;
  useEffect(() => {
    if (!ativo) return;
    const id = Symbol('camada');
    pilha.push(id);
    const aoTecla = (e: KeyboardEvent) => { if (e.key === 'Escape' && pilha[pilha.length - 1] === id) ref.current(); };
    window.addEventListener('keydown', aoTecla);
    return () => {
      window.removeEventListener('keydown', aoTecla);
      const i = pilha.indexOf(id);
      if (i >= 0) pilha.splice(i, 1);
    };
  }, [ativo]);
};
