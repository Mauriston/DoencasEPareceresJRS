// Ficheiro: components/NotificacoesPainel.tsx
// Lista das notificações recebidas pelo usuário (item "Notificações" do menu
// do avatar). Tocar num item marca como lida e abre a tela do aviso (ex.: o
// concurso); as não lidas vêm destacadas e somam no badge do avatar.
import React from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import type { NotificacaoRecord } from '../services/notificacoesPush';

interface Props {
  lista: NotificacaoRecord[];
  onAbrir: (n: NotificacaoRecord) => void;
  onMarcarTodas: () => void;
  onClose: () => void;
}

const quando = (d: Date | null): string => {
  if (!d) return '';
  const min = Math.round((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const hoje = new Date();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoje.toDateString()) return `hoje, ${hora}`;
  const ontem = new Date(hoje.getTime() - 86_400_000);
  if (d.toDateString() === ontem.toDateString()) return `ontem, ${hora}`;
  return `${d.toLocaleDateString('pt-BR')}, ${hora}`;
};

export const NotificacoesPainel: React.FC<Props> = ({ lista, onAbrir, onMarcarTodas, onClose }) => {
  const naoLidas = lista.filter(n => !n.lida).length;
  return (
    <Dialog
      title="Notificações"
      icon="notifications"
      size="md"
      onClose={onClose}
      footer={naoLidas > 0 ? <Button variant="secondary" icon="done_all" onClick={onMarcarTodas}>Marcar todas como lidas</Button> : undefined}
    >
      {lista.length === 0 ? (
        <p className="text-ink-3 text-center py-6">Nenhuma notificação por enquanto.</p>
      ) : (
        <ul className="-mx-5 -my-5 divide-y divide-line">
          {lista.map(n => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onAbrir(n)}
                className={`w-full text-left px-5 py-3 flex gap-3 items-start transition-colors hover:bg-thead ${n.lida ? '' : 'bg-navy/5'}`}
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.lida ? 'bg-transparent' : 'bg-wine'}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm truncate ${n.lida ? 'font-semibold text-ink-2' : 'font-bold text-navy'}`}>{n.titulo}</span>
                    <span className="text-xs text-ink-3 shrink-0">{quando(n.em)}</span>
                  </span>
                  <span className={`block text-sm leading-snug mt-0.5 ${n.lida ? 'text-ink-3' : 'text-ink'}`}>{n.corpo}</span>
                  {!n.lida && <span className="sr-only">(não lida)</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
};
