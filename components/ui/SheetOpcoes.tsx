// Ficheiro: components/ui/SheetOpcoes.tsx
// Bottom sheet (celular) com uma lista de opções a escolher — o equivalente, no FAB, ao dropdown dos botões
// "Enviar emails ▾" / "Enviar PDF ▾" do desktop. Usa o mesmo contrato de itens do MenuAcoes (ItemMenu).
import React from 'react';
import { Drawer } from './Drawer';
import type { ItemMenu } from './MenuAcoes';

export const SheetOpcoes: React.FC<{ titulo: string; icone?: string; itens: ItemMenu[]; onClose: () => void }> = ({ titulo, icone, itens, onClose }) => (
  <Drawer title={titulo} icon={icone} onClose={onClose}>
    <ul role="menu" aria-label={titulo} className="-my-2 divide-y divide-line">
      {itens.map(i => (
        <li key={i.rotulo} role="none">
          <button
            type="button" role="menuitem" aria-disabled={i.desabilitado || undefined}
            onClick={() => { if (i.desabilitado) return; onClose(); i.onClick(); }}
            className={`w-full min-h-14 py-2 flex items-center gap-3 text-left font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${i.desabilitado ? 'text-ink-4' : i.perigo ? 'text-wine' : 'text-navy'}`}
          >
            {typeof i.icone === 'string'
              ? <span className="material-symbols-outlined text-[24px] shrink-0" aria-hidden="true">{i.icone}</span>
              : <span className="w-6 h-6 flex items-center justify-center shrink-0" aria-hidden="true">{i.icone}</span>}
            <span className="flex flex-col min-w-0 flex-1 text-sm">
              {i.rotulo}
              {i.dica && <span className="text-xs font-normal text-ink-3">{i.dica}</span>}
            </span>
            {i.contador !== undefined && (
              <span className={`min-w-[1.5rem] text-right tabular-nums font-bold ${i.desabilitado ? 'text-ink-4' : i.contador > 0 ? 'text-wine' : 'text-ink-3'}`} aria-label={`${i.contador} pendente${i.contador !== 1 ? 's' : ''}`}>{i.contador}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  </Drawer>
);
