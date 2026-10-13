// Ficheiro: hooks/useStoragePdf.tsx
// Abre um PDF do Firebase Storage: no desktop, num modal em tela cheia; no
// mobile, numa nova aba (como os PDFs das mensagens de concursos). A aba é
// aberta de forma síncrona no clique, antes de qualquer await — senão o
// navegador a trata como pop-up e pede permissão.
import React, { useCallback, useState } from 'react';
import { useIsDesktop } from './useIsDesktop';
import { getStoragePdfUrl } from '../services/firebaseStorageNormas';
import { PdfFullscreenModal } from '../components/PdfFullscreenModal';

export const useStoragePdf = () => {
  const isDesktop = useIsDesktop();
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<{ title: string; url: string } | null>(null);

  const open = useCallback(async (caminho: string, title: string) => {
    const novaAba = isDesktop ? null : window.open('', '_blank');
    if (novaAba) novaAba.opener = null;
    setBusy(true);
    try {
      const url = await getStoragePdfUrl(caminho);
      if (!url) {
        novaAba?.close();
        alert('O PDF deste documento ainda não está disponível.');
        return;
      }
      if (isDesktop) setModal({ title, url });
      else if (novaAba) novaAba.location.href = url;
      else window.location.assign(url);
    } catch {
      novaAba?.close();
      alert('Não foi possível abrir o PDF. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }, [isDesktop]);

  const modalElement = modal
    ? React.createElement(PdfFullscreenModal, { title: modal.title, url: modal.url, onClose: () => setModal(null) })
    : null;

  return { open, busy, modalElement };
};
