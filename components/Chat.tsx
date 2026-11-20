// Ficheiro: components/Chat.tsx
// Página do Chat entre usuários (/chat e /chat/{conversaId}); acesso pelo menu do avatar (UserMenu), sem item
// na barra lateral. Desktop: lista à esquerda e conversa à direita. Celular: a lista; a conversa abre em tela
// cheia por cima do shell, com "voltar". Independente das Mensagens das IS (components/Mensagens.tsx).
import React, { useContext } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { NavContext } from '../context/NavContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { Container, PageHeader } from './ui/Page';
import { Card } from './ui/Card';
import { AccessDenied } from './ui/AccessDenied';
import { useChat } from './chat/ChatContext';
import { ListaContatos } from './chat/ListaContatos';
import { Conversa } from './chat/Conversa';
import { chatPath } from '../config/routes';
import { participantesDe } from '../utils/chat';

export const Chat: React.FC = () => {
  const nav = useContext(NavContext);
  const chat = useChat();
  const { conversaId: bruto } = useParams<{ conversaId?: string }>();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const uid = nav?.authUser?.uid || '';
  if (!chat?.ativo) return <AccessDenied pagina="Chat" />;

  const conversaId = bruto && participantesDe(bruto).length === 2 && participantesDe(bruto).includes(uid) ? bruto : null;
  if (bruto && !conversaId) return <Navigate to={chatPath()} replace />;
  const abrir = (id: string) => navigate(chatPath(id));

  if (!isDesktop && conversaId) {
    return (
      <div className="fixed inset-0 z-drawer bg-canvas pt-[env(safe-area-inset-top)]" role="dialog" aria-modal="true" aria-label="Conversa">
        <Conversa uid={uid} perfil={nav?.authUser?.perfil} conversaId={conversaId} onVoltar={() => navigate(chatPath())} />
      </div>
    );
  }

  return (
    <Container size="data" className="py-6 md:py-8 pb-10 flex flex-col flex-1 min-h-0">
      <PageHeader title="Chat" description="Converse com os usuários do app. Os anexos ficam disponíveis por 7 dias." />
      <Card padding="none" as="section" aria-label="Chat" className="flex-1 min-h-[480px] md:h-[calc(100dvh-14rem)] overflow-hidden">
        <div className="flex h-full min-h-[480px]">
          <div className={`${isDesktop ? 'w-80 border-r border-line' : 'w-full'} shrink-0 min-h-0`}>
            <ListaContatos uid={uid} selecionada={conversaId} onAbrir={abrir} />
          </div>
          {isDesktop && (
            <div className="flex-1 min-w-0 min-h-0">
              {conversaId ? (
                <Conversa uid={uid} perfil={nav?.authUser?.perfil} conversaId={conversaId} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-3">
                  <span className="material-symbols-outlined text-[48px] text-ink-4" aria-hidden="true">forum</span>
                  <p className="mt-2 text-sm">Escolha uma conversa ou um contato.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </Container>
  );
};

export default Chat;
