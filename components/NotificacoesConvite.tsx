// Ficheiro: components/NotificacoesConvite.tsx
// Convite para ativar as notificações push, exibido ao abrir o app (depois do
// login). O navegador só deixa pedir a permissão a partir de um clique — por
// isso o diálogo do app vem antes e o "Ativar" dispara o pedido oficial.
// Aparece até a pessoa autorizar ou bloquear (o navegador guarda a resposta);
// "Agora não" adia por 7 dias neste aparelho. No iPhone fora da Tela de
// Início o push não existe: o convite vira o passo a passo de instalação.
// Com a permissão já dada, só renova o token do aparelho em segundo plano.
import React, { useEffect, useState } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import {
  estadoNotificacoes, conviteAdiado, adiarConvite, ativarNotificacoes, sincronizarAparelho,
  type EstadoNotificacoes,
} from '../services/notificacoesPush';

interface Props {
  usuario: string;
  /** Outro diálogo (ex.: senha temporária) está aberto: espera a vez. */
  aguardar: boolean;
  onInstalarApp: () => void;
}

export const NotificacoesConvite: React.FC<Props> = ({ usuario, aguardar, onInstalarApp }) => {
  const [estado, setEstado] = useState<EstadoNotificacoes | null>(null);
  const [fechado, setFechado] = useState(false);
  const [ativando, setAtivando] = useState(false);

  useEffect(() => {
    let vivo = true;
    estadoNotificacoes().then(e => {
      if (!vivo) return;
      setEstado(e);
      if (e === 'ativadas') sincronizarAparelho(usuario).catch(err => console.error('Falha ao vincular aparelho às notificações:', err));
    });
    return () => { vivo = false; };
  }, [usuario]);

  if (fechado || aguardar || conviteAdiado()) return null;

  const agoraNao = () => { adiarConvite(); setFechado(true); };

  if (estado === 'instalar-ios') {
    return (
      <Dialog
        title="Receba as notificações"
        icon="notifications"
        onClose={agoraNao}
        footer={(
          <>
            <Button variant="secondary" onClick={agoraNao}>Agora não</Button>
            <Button icon="add_to_home_screen" onClick={() => { setFechado(true); onInstalarApp(); }}>Como instalar</Button>
          </>
        )}
      >
        <p className="text-ink-3 leading-relaxed">
          No iPhone, as notificações da JRS (laudos de inaptidão, IDM e IS do dia finalizadas) só
          chegam com o app adicionado à <strong>Tela de Início</strong>. Instale o app e abra-o pelo
          ícone para ativá-las.
        </p>
      </Dialog>
    );
  }

  if (estado !== 'pendente') return null;

  const ativar = async () => {
    setAtivando(true);
    try {
      await ativarNotificacoes(usuario);
    } catch (e) {
      console.error('Falha ao ativar notificações:', e);
    } finally {
      setFechado(true);
    }
  };

  return (
    <Dialog
      title="Ativar notificações"
      icon="notifications"
      onClose={agoraNao}
      footer={(
        <>
          <Button variant="secondary" onClick={agoraNao} disabled={ativando}>Agora não</Button>
          <Button icon="notifications_active" onClick={ativar} loading={ativando}>Ativar</Button>
        </>
      )}
    >
      <p className="text-ink-3 leading-relaxed">
        Ao tocar em <strong>Ativar</strong>, o navegador vai pedir sua autorização.
      </p>
    </Dialog>
  );
};
