// Ficheiro: components/administracao/Interruptor.tsx
// Interruptor liga/desliga (role="switch") de 40 × 24 (auditoria v3, 8b/8c): navy ligado, ink-5 desligado.
// A área de toque é a linha inteira quando o rótulo vem junto (label envolvendo o botão).
import React from 'react';

interface InterruptorProps {
  ligado: boolean;
  onAlternar: (ligar: boolean) => void;
  /** Rótulo acessível quando não há texto visível associado. */
  rotulo?: string;
  /** Id do elemento que rotula o interruptor (aria-labelledby). */
  rotuloId?: string;
  disabled?: boolean;
  /** Motivo do bloqueio (title), ex.: "Ligue a página primeiro". */
  dica?: string;
}

export const Interruptor: React.FC<InterruptorProps> = ({ ligado, onAlternar, rotulo, rotuloId, disabled = false, dica }) => (
  <button
    type="button"
    role="switch"
    aria-checked={ligado}
    aria-label={rotuloId ? undefined : rotulo}
    aria-labelledby={rotuloId}
    disabled={disabled}
    title={dica}
    onClick={() => onAlternar(!ligado)}
    className={`relative inline-flex shrink-0 w-10 h-6 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50 ${ligado ? 'bg-navy' : 'bg-ink-5'}`}
  >
    <span aria-hidden="true" className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-placa transition-[left] duration-150 ${ligado ? 'left-[19px]' : 'left-[3px]'}`} />
  </button>
);
