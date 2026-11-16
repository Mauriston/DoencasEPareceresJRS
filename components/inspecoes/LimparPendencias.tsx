// Ficheiro: components/inspecoes/LimparPendencias.tsx
// Botão "Limpar" dos modais de e-mails pendentes (só Admin): tira as IS marcadas da lista de pendências sem enviar o
// e-mail (services/firestoreInspecoes.ts → dispensarEmailsPendentes). Pede confirmação no próprio botão (2 cliques).
import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';

interface Props {
  /** Quantas IS estão marcadas. */
  quantidade: number;
  /** Grava a dispensa; o modal some com as IS na próxima leitura da lista. */
  onLimpar: () => Promise<void>;
  /** Bloqueia enquanto o modal envia. */
  disabled?: boolean;
  onErro: (msg: string) => void;
}

export const LimparPendencias: React.FC<Props> = ({ quantidade, onLimpar, disabled, onErro }) => {
  const [confirmando, setConfirmando] = useState(false);
  const [limpando, setLimpando] = useState(false);
  useEffect(() => { if (!quantidade) setConfirmando(false); }, [quantidade]);
  const clicar = async () => {
    if (!confirmando) { setConfirmando(true); return; }
    setLimpando(true);
    try { await onLimpar(); setConfirmando(false); } catch (e: any) { onErro(e?.message || 'Não foi possível limpar as pendências.'); } finally { setLimpando(false); }
  };
  return (
    <Button
      variant="destructive" className="sm:mr-auto" icon="playlist_remove" loading={limpando} disabled={disabled || !quantidade} onClick={clicar}
      title="Tira as IS marcadas da lista de pendências, sem enviar o e-mail"
    >
      {confirmando ? `Confirmar limpeza (${quantidade})` : quantidade ? `Limpar (${quantidade})` : 'Limpar'}
    </Button>
  );
};
