// Ficheiro: components/sobre/Indice.tsx
// Índice em chips da página "Sobre o app" (auditoria v3, 6c/6d): leva direto à seção da área. No celular os
// chips rolam de lado. São botões (não âncoras "#id"): no HashRouter o "#" é a rota.
import React from 'react';

/** Rola até a seção `id` e põe o foco no título dela (`${id}-titulo`, com tabIndex -1). */
export const rolarPara = (id: string) => {
  const alvo = document.getElementById(id);
  if (!alvo) return;
  const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  alvo.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
  (document.getElementById(`${id}-titulo`) ?? alvo).focus({ preventScroll: true });
};

export interface ItemIndice { id: string; rotulo: string; icone?: string }

export const IndiceChips: React.FC<{ itens: ItemIndice[]; rotulo: string; className?: string }> = ({ itens, rotulo, className = '' }) => (
  <nav aria-label={rotulo} className={`-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto ${className}`}>
    <ul className="flex gap-2 w-max md:w-auto md:flex-wrap">
      {itens.map(i => (
        <li key={i.id}>
          <button
            type="button"
            onClick={() => rolarPara(i.id)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-line bg-white text-sm font-bold text-navy whitespace-nowrap hover:bg-thead transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            {i.icone && <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{i.icone}</span>}
            {i.rotulo}
          </button>
        </li>
      ))}
    </ul>
  </nav>
);
