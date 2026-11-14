// Ficheiro: components/administracao/useAvisoSaida.tsx
// Aviso ao sair de uma subpágina da Administração com alterações não salvas (auditoria v3, 8b — CF2).
// O app usa <HashRouter>, e o useBlocker do react-router só funciona dentro de um data router
// (createHashRouter/RouterProvider) — trocar o roteador mexeria no index.tsx e no App inteiro. Por isso o
// aviso é feito assim, sem tocar no roteador:
//   - cliques em links internos (<a href="#/…">: sidebar, barra inferior, trilha, sub-navegação da
//     Administração, atalhos) são interceptados na fase de captura do document — antes do onClick do
//     <Link> — e abrem a confirmação; confirmando, navega para o destino;
//   - recarregar/fechar a aba usa o beforeunload do navegador.
// Não cobre navegações programáticas (busca global, itens do menu do avatar) nem o botão Voltar do navegador.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../ui/Dialog';
import { NoCorpo } from './NoCorpo';

/** Liga o aviso enquanto `pendente`. Devolve o diálogo de confirmação (renderize-o na subpágina). */
export const useAvisoSaida = (pendente: boolean, onDescartar?: () => void): React.ReactNode => {
  const navigate = useNavigate();
  const [destino, setDestino] = useState<string | null>(null);
  const descartar = useRef(onDescartar);
  descartar.current = onDescartar;

  useEffect(() => {
    if (!pendente) return;
    const antesDeSair = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const clique = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const alvo = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!(alvo instanceof HTMLAnchorElement) || alvo.target === '_blank' || alvo.hasAttribute('download')) return;
      const href = alvo.getAttribute('href') || '';
      if (!href.startsWith('#/')) return;
      const para = href.slice(1);
      const atual = window.location.hash.replace(/^#/, '') || '/';
      if (para === atual) return;
      e.preventDefault();
      e.stopPropagation();
      setDestino(para);
    };
    window.addEventListener('beforeunload', antesDeSair);
    document.addEventListener('click', clique, true);
    return () => {
      window.removeEventListener('beforeunload', antesDeSair);
      document.removeEventListener('click', clique, true);
    };
  }, [pendente]);

  if (!destino) return null;
  return (
    <NoCorpo>
      <ConfirmDialog
        title="Sair sem salvar?"
        message="Há alterações não salvas nesta página. Se sair agora, elas serão descartadas."
        confirmLabel="Sair sem salvar"
        cancelLabel="Continuar editando"
        destructive
        onCancel={() => setDestino(null)}
        onConfirm={() => {
          const para = destino;
          setDestino(null);
          descartar.current?.();
          navigate(para);
        }}
      />
    </NoCorpo>
  );
};
