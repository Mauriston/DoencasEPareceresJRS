// Ficheiro: components/inspecoes/entrevista/AbrirNoCelularDialog.tsx
// No computador (os PCs do HNRe não têm microfone): QR code que abre esta IS no celular, já com o
// login do perito (handoff — services/handoff.ts) e direto na gravação da entrevista
// (?abrir=/inspecoes/{isId}/entrevista).
import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { montarUrlQr } from '../../../services/handoff';
import { inspecaoPath } from '../../../config/routes';

interface Props {
  isId: string;
  aberto: boolean;
  onClose: () => void;
}

export const AbrirNoCelularDialog: React.FC<Props> = ({ isId, aberto, onClose }) => {
  const [qr, setQr] = useState<string | null>(null);
  const [comLogin, setComLogin] = useState(true);
  const [erro, setErro] = useState(false);

  const gerar = useCallback(async () => {
    setQr(null);
    setErro(false);
    try {
      const { url, comLogin: ok } = await montarUrlQr(inspecaoPath(isId, 'entrevista'));
      setComLogin(ok);
      // Tokens são longos: correção de erro baixa mantém o QR legível.
      setQr(await QRCode.toDataURL(url, { errorCorrectionLevel: 'L', margin: 1, width: 280 }));
    } catch {
      setErro(true);
    }
  }, [isId]);

  useEffect(() => {
    if (aberto) gerar();
    else setQr(null);
  }, [aberto, gerar]);

  if (!aberto) return null;

  return (
    <Dialog
      title="Gravar a entrevista no celular"
      icon="phone_iphone"
      onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}
    >
      <div className="flex flex-col items-center text-center">
        <p className="text-sm text-ink mb-3">
          Este computador não grava áudio. Aponte a câmera do celular para o QR code: o app abrirá
          {comLogin ? ' já com o seu login' : ''} nesta IS, pronto para gravar a entrevista.
        </p>

        <div className="w-[220px] h-[220px] mb-3 flex items-center justify-center rounded-xl border border-line bg-white" aria-live="polite">
          {qr ? (
            <img src={qr} alt="QR code para abrir a gravação da entrevista desta IS no celular" className="w-full h-full rounded-xl" />
          ) : erro ? (
            <Button variant="ghost" icon="refresh" onClick={gerar}>Tentar de novo</Button>
          ) : (
            <span className="material-symbols-outlined text-[28px] text-ink-4 animate-spin" role="status" aria-label="Gerando o QR code">progress_activity</span>
          )}
        </div>

        {qr && !comLogin && (
          <p className="text-xs text-gold-ink font-semibold mb-2">
            Não foi possível enviar o login: entre normalmente no celular — o app abrirá esta IS em seguida.
          </p>
        )}

        <ol className="text-left text-sm text-ink-3 space-y-1 list-decimal pl-5 mb-3 self-stretch">
          <li>Abra a câmera do celular e toque no link do QR code.</li>
          <li>Preencha os participantes e confirme o consentimento do inspecionado.</li>
          <li>Grave e toque em “Encerrar e enviar”. O resultado aparece aqui, nesta IS, em alguns minutos.</li>
        </ol>

        <p className="text-xs text-ink-3">
          Este QR code dá acesso à sua conta — não o compartilhe nem mostre a tela a terceiros.
          {qr && comLogin && (
            <> <button type="button" onClick={gerar} className="font-bold text-navy underline underline-offset-2 min-h-[44px]">Gerar novo QR</button></>
          )}
        </p>
      </div>
    </Dialog>
  );
};
