// Ficheiro: components/NotificacoesPainel.tsx
// Lista das notificações recebidas pelo usuário (item "Notificações" do menu
// do avatar). Abrir o modal já conta como leitura: as notificações exibidas
// saem do histórico na hora (`onVistas` as apaga) e o badge do avatar zera; o
// modal continua mostrando o que foi aberto (as não lidas, destacadas) até
// fechar. As que chegam com o modal aberto também entram e saem do histórico.
// Tocar num item abre a tela do aviso (ex.: o concurso). Sem "Marcar todas".
import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from './ui/Dialog';
import type { NotificacaoRecord } from '../services/notificacoesPush';

interface Props {
  /** Histórico ao vivo (services/notificacoesPush.ts → observarNotificacoes). */
  lista: NotificacaoRecord[];
  onAbrir: (n: NotificacaoRecord) => void;
  /** Notificações exibidas: saem do histórico. */
  onVistas: (ids: string[]) => void;
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

export const NotificacoesPainel: React.FC<Props> = ({ lista, onAbrir, onVistas, onClose }) => {
  // O que já foi exibido fica na tela (com o estado de leitura de quando chegou), mesmo depois de sair do histórico.
  const [exibidas, setExibidas] = useState<NotificacaoRecord[]>(lista);
  const vistas = useRef(new Set<string>());
  useEffect(() => {
    const novas = lista.filter(n => !vistas.current.has(n.id));
    if (!novas.length) return;
    novas.forEach(n => vistas.current.add(n.id));
    setExibidas(atual => {
      const ids = new Set(atual.map(n => n.id));
      return [...atual, ...novas.filter(n => !ids.has(n.id))].sort((a, b) => (b.em?.getTime() ?? 0) - (a.em?.getTime() ?? 0));
    });
    onVistas(novas.map(n => n.id));
  }, [lista]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog
      title="Notificações"
      icon="notifications"
      size="md"
      onClose={onClose}
    >
      {exibidas.length === 0 ? (
        <p className="text-ink-3 text-center py-6">Nenhuma notificação por enquanto.</p>
      ) : (
        <ul className="-mx-5 -my-5 divide-y divide-line">
          {exibidas.map(n => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onAbrir(n)}
                className={`w-full text-left px-5 py-3 flex gap-3 items-start transition-colors hover:bg-thead ${n.lida ? '' : 'bg-navy/5'}`}
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.lida ? 'bg-transparent' : 'bg-wine'}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm truncate ${n.lida ? 'font-semibold text-ink' : 'font-bold text-navy'}`}>{n.titulo}</span>
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
