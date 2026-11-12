// Ficheiro: components/inspecoes/BotaoEmailFaltas.tsx
// Botão do cabeçalho de Inspeções de Saúde (à esquerda do botão do e-mail das IS agendadas; só Admin e
// Secretaria): e-mail de faltas dos inspecionados do HNRe. CONTRATO das props (implementação: agente "faltas").
import React from 'react';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import type { MilitarRecord } from '../../services/firestoreMilitares';

export interface BotaoEmailFaltasProps {
  inspecoes: InspecaoRecord[];
  militares: MilitarRecord[];
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

export const BotaoEmailFaltas: React.FC<BotaoEmailFaltasProps> = () => null;
