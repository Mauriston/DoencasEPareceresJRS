// Ficheiro: components/pareceres/EnviarImpressaoDialog.tsx
// "Enviar para Impressão": confirma e manda o PDF do pedido de parecer por e-mail para a impressão
// (services/drivePareceres.ts → Apps Script). Aparece logo depois de gerar um parecer e pelo ícone
// de impressora na lista de pareceres.
import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { enviarParecerParaImpressao } from '../../services/drivePareceres';

export interface AlvoImpressao {
  /** Nome do inspecionado (só para o texto do diálogo). */
  nome: string;
  pdfUrl: string;
  /** Médico que solicitou o parecer (ex.: "CT MAURISTON"): nome de exibição e assinatura do e-mail. */
  remetente: string;
}

interface Props {
  alvo: AlvoImpressao;
  /** true quando o diálogo abre logo após gerar o parecer (muda o título e o botão de recusa). */
  aposGerar?: boolean;
  onClose: () => void;
  onEnviado: (mensagem: string) => void;
}

export const EnviarImpressaoDialog: React.FC<Props> = ({ alvo, aposGerar = false, onClose, onEnviado }) => {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const enviar = async () => {
    setEnviando(true);
    setErro('');
    try {
      await enviarParecerParaImpressao({ pdfUrl: alvo.pdfUrl, remetente: alvo.remetente });
      onEnviado(`Pedido de parecer de ${alvo.nome} enviado para impressão.`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar para impressão.');
      setEnviando(false);
    }
  };

  return (
    <Dialog
      title={aposGerar ? 'Parecer gerado. Enviar para impressão?' : 'Enviar para impressão'}
      icon="print"
      size="md"
      travado={enviando}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={enviando}>{aposGerar ? 'Agora não' : 'Cancelar'}</Button>
          <Button icon="send" loading={enviando} onClick={enviar}>Enviar para impressão</Button>
        </>
      )}
    >
      <div className="space-y-3 text-sm text-ink">
        <p>O PDF do pedido de parecer de <strong className="text-navy">{alvo.nome}</strong> será enviado por e-mail para <strong>giorginis@marinha.mil.br</strong>, pedindo impressão em frente e verso colorido.</p>
        <p className="text-ink-3">Remetente exibido: <strong className="text-ink">{alvo.remetente}</strong></p>
        {erro && <p role="alert" className="font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
