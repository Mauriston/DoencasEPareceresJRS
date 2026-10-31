// Ficheiro: components/InstallAppQrDialog.tsx
// Aviso exibido no desktop: QR code que abre o app no celular já logado
// (ver services/handoff.ts) e inicia o tutorial de ícone na tela inicial.
import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { montarUrlQr } from '@/services/handoff';

interface Props {
  /** "Agora não": volta a aparecer no próximo login. */
  onClose: () => void;
  /** "Já instalei": não aparece mais. */
  onAlreadyInstalled: () => void;
}

export const InstallAppQrDialog: React.FC<Props> = ({ onClose, onAlreadyInstalled }) => {
  const [qr, setQr] = useState<string | null>(null);
  const [comLogin, setComLogin] = useState(true);
  const [erro, setErro] = useState(false);

  const gerar = useCallback(async () => {
    setQr(null);
    setErro(false);
    try {
      const { url, comLogin: ok } = await montarUrlQr();
      setComLogin(ok);
      // Tokens são longos: correção de erro baixa mantém o QR legível.
      setQr(await QRCode.toDataURL(url, { errorCorrectionLevel: 'L', margin: 1, width: 280 }));
    } catch {
      setErro(true);
    }
  }, []);

  useEffect(() => { gerar(); }, [gerar]);

  return (
    <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div role="dialog" aria-modal="true" aria-label="Instalar o app no celular"
        className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-sm overflow-hidden">
        <div className="p-5 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[28px] text-green-700">install_mobile</span>
          </div>
          <h3 className="font-heading font-bold text-sm text-navy mb-1.5">Leve o app para o seu celular</h3>
          <p className="text-sm text-ink-3 mb-3">
            Aponte a câmera do celular para o QR code. O app abrirá
            {comLogin ? ' já com o seu login' : ' no navegador'} e um passo a passo mostrará como colocar o
            ícone na tela inicial.
          </p>

          <div className="w-[200px] h-[200px] mb-3 flex items-center justify-center rounded-xl border border-line bg-white">
            {qr ? (
              <img src={qr} alt="QR code para abrir o app no celular" className="w-full h-full rounded-xl" />
            ) : erro ? (
              <button type="button" onClick={gerar} className="text-xs font-bold text-green-700">Tentar de novo</button>
            ) : (
              <div className="w-6 h-6 border-2 border-line border-t-green rounded-full animate-spin" />
            )}
          </div>

          {qr && !comLogin && (
            <p className="text-xs text-gold-600 mb-2">
              Não foi possível enviar o login: você precisará entrar normalmente no celular.
            </p>
          )}
          <p className="text-xs text-ink-3 mb-4">
            Este QR code dá acesso à sua conta — não o compartilhe nem mostre a tela a terceiros.
            {qr && comLogin && (
              <> <button type="button" onClick={gerar} className="font-bold text-green-700">Gerar novo QR</button></>
            )}
          </p>

          <div className="flex items-center gap-2 w-full">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-line text-sm font-bold text-ink hover:bg-paper transition-colors">
              Agora não
            </button>
            <button type="button" onClick={onAlreadyInstalled}
              className="flex-1 px-4 py-2.5 rounded-lg bg-navy hover:bg-navy-hover text-white text-sm font-bold transition-colors">
              Já instalei
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
