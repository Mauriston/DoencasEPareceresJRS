// Ficheiro: hooks/useStoragePdf.tsx
// Abre um PDF do Firebase Storage em NOVA ABA (visualizador nativo do navegador/aparelho), via
// services/abrirPdf (aba aberta no clique, antes de qualquer await, para não cair no bloqueador de pop-ups).
import { useCallback, useState } from 'react';
import { getStoragePdfUrl } from '../services/firebaseStorageNormas';
import { abrirPdf } from '../services/abrirPdf';

export const useStoragePdf = () => {
  const [busy, setBusy] = useState(false);

  const open = useCallback(async (caminho: string, _title?: string) => {
    let indisponivel = false;
    setBusy(true);
    try {
      await abrirPdf(async () => { const url = await getStoragePdfUrl(caminho); if (!url) indisponivel = true; return url || ''; });
    } catch {
      alert(indisponivel ? 'O PDF deste documento ainda não está disponível.' : 'Não foi possível abrir o PDF. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }, []);

  /** PDF cuja URL já é conhecida: nova aba. */
  const openUrl = useCallback((url: string, _title?: string) => { abrirPdf(url).catch(() => { /* aba fechada */ }); }, []);

  return { open, openUrl, busy };
};
