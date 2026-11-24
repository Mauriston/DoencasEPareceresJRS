// Ficheiro: components/inspecoes/EscolherISDialog.tsx
// Lista de IS com e-mail individual pendente (menu "Enviar e-mails" de Inspeções): agendamento, resultado e
// resultado de Benefícios. "Enviar" em cada linha abre o diálogo de envio daquela IS.
// Admin (`onLimpar`): caixas de seleção em cada IS e o botão "Limpar", que tira as marcadas da lista de pendências
// sem enviar o e-mail (LimparPendencias). Os demais perfis veem a lista sem caixas.
import { ScrollFade } from '@animate-ui/react/primitives/effects/scroll-fade';
import React, { useMemo, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { LimparPendencias } from './LimparPendencias';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';

interface Props {
  titulo: string;
  icone: string;
  descricao: string;
  vazio: string;
  pendentes: InspecaoRecord[];
  /** Segunda linha de cada IS (ex.: data da entrevista ou do laudo). */
  detalhe: (is: InspecaoRecord) => string;
  onEscolher: (is: InspecaoRecord) => void;
  onClose: () => void;
  /** Só Admin: tira as IS marcadas da lista de pendências. */
  onLimpar?: (lista: InspecaoRecord[]) => Promise<void>;
}

export const EscolherISDialog: React.FC<Props> = ({ titulo, icone, descricao, vazio, pendentes, detalhe, onEscolher, onClose, onLimpar }) => {
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set());
  const [erro, setErro] = useState('');
  // Só as que ainda estão na lista (as limpas somem na próxima leitura).
  const escolhidas = useMemo(() => pendentes.filter(i => marcadas.has(i.id)), [pendentes, marcadas]);
  const todas = pendentes.length > 0 && escolhidas.length === pendentes.length;
  const alternar = (id: string) => setMarcadas(m => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const alternarTodas = () => setMarcadas(todas ? new Set() : new Set(pendentes.map(i => i.id)));
  const limpar = async () => {
    if (!onLimpar) return;
    setErro('');
    await onLimpar(escolhidas);
    setMarcadas(new Set());
  };

  return (
    <Dialog
      title={titulo} icon={icone} size="md" onClose={onClose}
      footer={onLimpar && pendentes.length > 0 ? (
        <>
          <LimparPendencias quantidade={escolhidas.length} onLimpar={limpar} onErro={setErro} />
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </>
      ) : undefined}
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-3">{descricao}</p>
        {pendentes.length === 0 ? (
          <p className="text-sm text-ink-3">{vazio}</p>
        ) : (
          <div>
            {onLimpar && (
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-semibold text-ink-3">{escolhidas.length} de {pendentes.length} marcada{pendentes.length !== 1 ? 's' : ''}</p>
                <button type="button" onClick={alternarTodas} className="min-h-[44px] px-2 text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">
                  {todas ? 'Desmarcar todas' : 'Marcar todas'}
                </button>
              </div>
            )}
            <ScrollFade asChild shrink={0} blur={0}><ul className="max-h-80 overflow-y-auto rounded-xl border border-line divide-y divide-line">
              {pendentes.map(i => (
                <li key={i.id} className="flex items-center gap-3 px-3 py-2">
                  {onLimpar && (
                    <input
                      type="checkbox" className="w-5 h-5 shrink-0 accent-navy cursor-pointer" checked={marcadas.has(i.id)} onChange={() => alternar(i.id)}
                      aria-label={`Marcar a IS ${i.is}`}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink break-words">{i.inspecionado}</span>
                    <span className="block text-xs text-ink-3">IS {i.is} · {detalhe(i)} · {i.finalidade}</span>
                  </span>
                  <Button variant="secondary" icon="send" onClick={() => onEscolher(i)}>Enviar</Button>
                </li>
              ))}
            </ul></ScrollFade>
          </div>
        )}
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
