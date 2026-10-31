// Ficheiro: components/inspecoes/MinutaDialog.tsx
// Minuta de mensagem editável: mostra o rascunho, permite ajustar e copiar. Com `confirmar`, o botão
// principal copia o texto e executa a ação (ex.: cancelar a IS atrasada).
import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { controlClass } from '../ui/Field';

interface Props {
  titulo: string;
  textoInicial: string;
  /** Ação principal que depende da minuta (recebe o texto final). */
  confirmar?: { rotulo: string; icone: string; destrutiva?: boolean; aviso?: string; onConfirmar: (texto: string) => Promise<void> };
  onClose: () => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

const copiar = async (texto: string): Promise<boolean> => {
  try { await navigator.clipboard.writeText(texto); return true; } catch { return false; }
};

export const MinutaDialog: React.FC<Props> = ({ titulo, textoInicial, confirmar, onClose, onAviso }) => {
  const [texto, setTexto] = useState(textoInicial);
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState('');

  const soCopiar = async () => {
    const ok = await copiar(texto);
    onAviso(ok ? 'Minuta copiada.' : 'Não foi possível copiar; selecione o texto e copie manualmente.', ok ? 'success' : 'error');
  };

  const executar = async () => {
    if (!confirmar) return;
    setExecutando(true); setErro('');
    const copiou = await copiar(texto);
    try {
      await confirmar.onConfirmar(texto);
      onAviso(copiou ? 'Minuta copiada e ação concluída.' : 'Ação concluída; copie a minuta manualmente.', copiou ? 'success' : 'error');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível concluir a ação.');
      setExecutando(false);
    }
  };

  return (
    <Dialog
      title={titulo}
      icon="mail"
      size="lg"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={executando}>Fechar</Button>
          <Button variant="secondary" icon="content_copy" onClick={soCopiar} disabled={executando}>Copiar minuta</Button>
          {confirmar && <Button variant={confirmar.destrutiva ? 'destructive' : 'primary'} icon={confirmar.icone} loading={executando} onClick={executar}>{confirmar.rotulo}</Button>}
        </>
      )}
    >
      <div className="space-y-3">
        {confirmar?.aviso && <p className="text-ink-3">{confirmar.aviso}</p>}
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
        <label htmlFor="texto-minuta" className="block text-xs font-semibold text-ink-3">Texto da minuta (editável)</label>
        <textarea id="texto-minuta" value={texto} onChange={e => setTexto(e.target.value)} className={`${controlClass} min-h-[280px] font-mono text-xs leading-relaxed`} />
      </div>
    </Dialog>
  );
};
