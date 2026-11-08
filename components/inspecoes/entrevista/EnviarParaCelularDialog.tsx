// Ficheiro: components/inspecoes/entrevista/EnviarParaCelularDialog.tsx
// No computador (os PCs do HNRe não têm microfone): "Enviar para o meu celular" manda um push só
// para os celulares do próprio usuário (POST /api/entrevistas/enviar-para-celular). Tocar na
// notificação abre o app instalado em /inspecoes/{isId}/entrevista, com a gravação já aberta.
import React, { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { enviarParaCelular } from '../../../services/entrevistasIS';

interface Props {
  isId: string;
  onClose: () => void;
}

type Estado = { tipo: 'inicial' } | { tipo: 'enviando' } | { tipo: 'enviado' } | { tipo: 'erro'; msg: string };

export const EnviarParaCelularDialog: React.FC<Props> = ({ isId, onClose }) => {
  const [estado, setEstado] = useState<Estado>({ tipo: 'inicial' });

  const enviar = async () => {
    setEstado({ tipo: 'enviando' });
    try {
      await enviarParaCelular(isId);
      setEstado({ tipo: 'enviado' });
    } catch (e) {
      setEstado({ tipo: 'erro', msg: (e as Error)?.message || 'Não foi possível enviar.' });
    }
  };

  return (
    <Dialog
      title="Gravar Entrevista"
      icon="phone_iphone"
      onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}
    >
      <div className="flex flex-col items-center text-center gap-3" aria-live="polite">
        <Button
          icon={estado.tipo === 'enviado' ? 'refresh' : 'send_to_mobile'}
          variant={estado.tipo === 'enviado' ? 'secondary' : 'primary'}
          loading={estado.tipo === 'enviando'}
          onClick={enviar}
          fullWidth
        >
          {estado.tipo === 'enviado' ? 'Enviar de novo' : 'Enviar para o meu celular'}
        </Button>
        {estado.tipo === 'enviado' && (
          <p className="text-sm font-semibold text-ink">Notificação enviada. Toque nela no celular.</p>
        )}
        {estado.tipo === 'erro' && (
          <p role="alert" className="text-sm font-semibold text-wine">{estado.msg}</p>
        )}
      </div>
    </Dialog>
  );
};
