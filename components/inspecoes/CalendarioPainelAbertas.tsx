// Ficheiro: components/inspecoes/CalendarioPainelAbertas.tsx
// Painel à esquerda da visão Calendário: as IS abertas e ainda sem entrevista, em cartões (avatar com a
// inicial, inspecionado e, abaixo, um ponto colorido + finalidade · dias em aberto; atrasada em vinho).
// Quem pode agendar arrasta um cartão para um dia/horário do calendário ou usa o botão "Agendar…" do
// cartão (alternativa acessível ao arraste). No topo, opcionalmente, o mini calendário (visão Dia).
// No celular o painel vira uma seção recolhível acima do calendário.
import React, { useState } from 'react';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import { diasEmAberto } from '../../utils/inspecoes';
import { abertaAtrasada, finalidadeSemGrupo, nomeCurtoInspecionado, rotuloDiasEmAberto } from '../../utils/calendarioIS';

/** Tipo do dado no dataTransfer do arraste de uma IS (o id da IS). */
export const TIPO_ARRASTE_IS = 'application/x-jrs-is';

interface Props {
  abertas: InspecaoRecord[];
  hoje: string;
  /** Presente só para quem pode agendar: botão "Agendar…" e arraste. */
  onAgendar?: (is: InspecaoRecord) => void;
  onAbrir: (is: InspecaoRecord) => void;
  onArrastarInicio: (is: InspecaoRecord, e: React.DragEvent<HTMLElement>) => void;
  onArrastarFim: () => void;
  arrastandoId: string | null;
  /** Conteúdo acima da lista (mini calendário na visão Dia). */
  topo?: React.ReactNode;
}

export const CalendarioPainelAbertas: React.FC<Props> = ({ abertas, hoje, onAgendar, onAbrir, onArrastarInicio, onArrastarFim, arrastandoId, topo }) => {
  const [abertoNoCelular, setAbertoNoCelular] = useState(false);
  const idLista = 'calendario-painel-abertas';

  return (
    <aside aria-label="IS abertas aguardando agendamento" className="bg-white rounded-xl border border-line overflow-clip flex flex-col lg:h-full lg:min-h-0">
      {/* Cabeçalho: no celular, recolhe/expande o painel. */}
      <button
        type="button"
        onClick={() => setAbertoNoCelular(a => !a)}
        aria-expanded={abertoNoCelular}
        aria-controls={idLista}
        className="lg:hidden flex items-center justify-between gap-2 w-full min-h-[44px] px-3 py-2 text-left"
      >
        <span className="text-sm font-bold text-navy">Aguardando agendamento <span className="ml-1 text-xs font-bold text-ink-3 bg-thead border border-line rounded-full px-2 py-0.5">{abertas.length}</span></span>
        <span className="material-symbols-outlined text-[22px] text-navy" aria-hidden="true">{abertoNoCelular ? 'expand_less' : 'expand_more'}</span>
      </button>
      <h2 className="hidden lg:flex items-center gap-2 px-3 py-3 border-b border-line text-sm font-bold text-navy">
        Aguardando agendamento
        <span className="text-xs font-bold text-ink-3 bg-thead border border-line rounded-full px-2 py-0.5">{abertas.length}</span>
      </h2>

      <div id={idLista} className={`${abertoNoCelular ? 'block' : 'hidden'} lg:block flex-1 min-h-0 overflow-y-auto max-h-[60vh] lg:max-h-none border-t border-line lg:border-t-0`}>
        {topo && <div className="p-2 border-b border-line">{topo}</div>}
        {onAgendar && abertas.length > 0 && <p className="px-3 pt-2 text-xs text-ink-3 hidden lg:block">Arraste um cartão para um dia do calendário para agendar.</p>}
        {abertas.length === 0 ? (
          <p className="px-3 py-4 text-sm text-ink-3">Nenhuma IS aberta aguardando agendamento.</p>
        ) : (
          <ul className="p-2 space-y-1" aria-label="IS abertas não agendadas">
            {abertas.map(is => {
              const nome = nomeCurtoInspecionado(is.inspecionado);
              const dias = diasEmAberto(is.dataAbertura, hoje);
              const atrasada = abertaAtrasada(is, hoje);
              const arrastavel = !!onAgendar;
              return (
                <li
                  key={is.id}
                  draggable={arrastavel}
                  onDragStart={arrastavel ? e => onArrastarInicio(is, e) : undefined}
                  onDragEnd={arrastavel ? onArrastarFim : undefined}
                  className={`group flex items-center gap-2 rounded-lg border border-transparent hover:bg-thead hover:border-line ${arrastavel ? 'cursor-grab active:cursor-grabbing' : ''} ${arrastandoId === is.id ? 'opacity-40' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => onAbrir(is)}
                    aria-label={`IS ${is.is}: ${nome}, ${is.finalidade}, ${rotuloDiasEmAberto(dias)} em aberto${atrasada ? ', atrasada' : ''}. Abrir detalhes`}
                    className={`flex-1 min-w-0 flex items-center gap-3 px-2 py-2 min-h-[44px] text-left rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${arrastavel ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    <span className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold uppercase ${is.amp === 'JRS' ? 'bg-navy text-white' : 'bg-gold/30 text-gold-ink'}`} aria-hidden="true">
                      {nome.charAt(0) || '?'}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-navy truncate" title={is.inspecionado}>{nome}</span>
                      <span className={`flex items-center gap-1.5 text-xs ${atrasada ? 'text-wine font-semibold' : 'text-ink-3'}`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${atrasada ? 'bg-wine' : is.amp === 'JRS' ? 'bg-navy' : 'bg-gold'}`} aria-hidden="true" />
                        <span className="truncate" title={`${is.finalidade} · ${rotuloDiasEmAberto(dias)}${atrasada ? ' (atrasada)' : ''}`}>
                          {finalidadeSemGrupo(is.finalidade, is.grupoFinalidade)} · {rotuloDiasEmAberto(dias)}
                        </span>
                      </span>
                    </span>
                  </button>
                  {onAgendar && (
                    <button
                      type="button"
                      onClick={() => onAgendar(is)}
                      aria-label={`Agendar IS ${is.is} (${nome})…`}
                      title="Agendar…"
                      className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-lg text-navy hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                    >
                      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">event</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
};
