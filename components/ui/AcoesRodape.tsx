// Ficheiro: components/ui/AcoesRodape.tsx
// Ações do rodapé de um Drawer/bottom sheet, adaptadas à tela:
//  • desktop (≥ md): os Buttons do DS lado a lado, na ordem dada (como os rodapés de sempre —
//    a principal por último);
//  • mobile (< md): o FAB padrão único do app (components/ui/Fab.tsx, auditoria v3 M7). Com 1
//    ação, FAB estendido (ícone + texto); com 2–3, FAB estendido com a PRINCIPAL + "˄", que abre a
//    pilha das demais com a principal mais perto do polegar. Fecha ao tocar fora, ao escolher uma
//    ação ou com Esc. A principal é a última ação primária (a mesma que fica por último no desktop).
// "Fechar"/"Cancelar" que só fecham o sheet não entram aqui (no mobile o sheet fecha no X ou
// arrastando). O corpo rolável do sheet deve ter `data-sheet-corpo` (o Drawer já tem) para
// ganhar folga embaixo e o FAB não cobrir o fim do conteúdo — ver styles/app.css.
// Para o FAB de uma PÁGINA (ações de criação do perfil), use <FabAcoes> de Fab.tsx.
import React from 'react';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { Button } from './Button';
import { FabFlutuante, type AcaoFab } from './Fab';

export interface AcaoRodape {
  id: string;
  rotulo: string;
  /** Material Symbol. */
  icone: string;
  onClick: () => void;
  variante?: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
}

interface Props {
  acoes: AcaoRodape[];
  /** Classes extras do contêiner da barra de botões (desktop). */
  className?: string;
}

/** Submete um <form> pelo id — para ações de rodapé que salvam um formulário (valida como o submit nativo). */
export const submeterFormulario = (formId: string) => {
  const form = document.getElementById(formId);
  if (form instanceof HTMLFormElement) form.requestSubmit();
};

/** Ordem do FAB: a principal (última primária; sem primária, a última) primeiro, depois as demais da direita para a esquerda. */
export const ordenarParaFab = (acoes: AcaoRodape[]): AcaoFab[] => {
  let iPrincipal = -1;
  for (let i = acoes.length - 1; i >= 0; i--) if ((acoes[i].variante ?? 'primary') === 'primary') { iPrincipal = i; break; }
  if (iPrincipal < 0) iPrincipal = acoes.length - 1;
  const demais = acoes.filter((_, i) => i !== iPrincipal).reverse();
  return [acoes[iPrincipal], ...demais];
};

export const AcoesRodape: React.FC<Props> = ({ acoes, className = '' }) => {
  const isDesktop = useIsDesktop();
  if (!acoes.length) return null;

  if (isDesktop) {
    const botoes = acoes.map(a => (
      <Button key={a.id} variant={a.variante ?? 'primary'} icon={a.icone} onClick={a.onClick} disabled={a.disabled} loading={a.loading}>
        {a.rotulo}
      </Button>
    ));
    // Sem className, os botões entram direto no flex do rodapé (alinhados aos vizinhos, ex.: "Cancelar").
    return className ? <div className={`flex flex-row flex-wrap items-center justify-end gap-2 ${className}`}>{botoes}</div> : <>{botoes}</>;
  }

  return <FabFlutuante acoes={ordenarParaFab(acoes)} posicao="sheet" />;
};
