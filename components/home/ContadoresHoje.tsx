// Ficheiro: components/home/ContadoresHoje.tsx
// Faixa "Hoje" da Início (auditoria v3, 2a/2d): até 4 contadores escolhidos pelo perfil. Cada contador DECLARA
// a permissão de que depende (`permitido`, lida de canAccessPage/canUseFeature no render) e o link já filtrado da
// lista; a faixa só monta os que o perfil pode abrir, na ordem de prioridade recebida, e no máximo 4.
// Regras: valor 0 continua visível (a faixa não muda de posição de um dia para o outro); vinho só quando o
// contador é de atraso e o valor é maior que 0; as colunas acompanham a quantidade (4, 3, 2 ou 1 card ocupando a
// largura toda, sem card vazio). Sem nenhum contador possível, a faixa não aparece. Todo card leva a outra
// página: a seta (chevron no celular) diz isso.
import React from 'react';
import { Link } from 'react-router-dom';

export interface ContadorHoje {
  id: string;
  rotulo: string;
  valor: number | string;
  /** Linha de apoio (12 px, ink-3). No celular fica oculta: o card mostra só número e rótulo (4b). */
  dica?: string;
  /** Lista já filtrada que o card abre. */
  to: string;
  /** Contador de atraso: número em vinho quando > 0. */
  atraso?: boolean;
  /** A dica em vinho (ex.: "1 além do prazo" num contador que não é de atraso). */
  dicaAtraso?: boolean;
  /** Permissão de que depende (canAccessPage/canUseFeature). false → não entra na faixa. */
  permitido: boolean;
}

export const MAX_CONTADORES = 4;

/** Os contadores que entram na faixa: os permitidos, na ordem de prioridade, até 4. */
export const contadoresDaFaixa = (todos: ContadorHoje[]): ContadorHoje[] => todos.filter(c => c.permitido).slice(0, MAX_CONTADORES);

const COLUNAS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
};

export const ContadoresHoje: React.FC<{ contadores: ContadorHoje[] }> = ({ contadores }) => {
  if (contadores.length === 0) return null;
  return (
    <section aria-label="Hoje">
      <ul className={`grid ${COLUNAS[contadores.length] ?? COLUNAS[4]} gap-3`}>
        {contadores.map(c => {
          const vinho = !!c.atraso && typeof c.valor === 'number' && c.valor > 0;
          return (
            <li key={c.id} className="min-w-0">
              <Link
                to={c.to}
                aria-label={`${c.valor} · ${c.rotulo}${c.dica ? `. ${c.dica}` : ''}`}
                className="group flex flex-col-reverse md:flex-col gap-1 h-full bg-white border border-line rounded-xl px-4 py-3 md:py-3.5 hover:border-navy transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <span className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-xs font-semibold text-ink-3 leading-tight">{c.rotulo}</span>
                  {/* Seta: o card leva à lista filtrada (no celular, chevron; no desktop, seta). */}
                  <span className="md:hidden material-symbols-outlined text-[20px] text-ink-3 shrink-0" aria-hidden="true">chevron_right</span>
                  <span className="hidden md:inline material-symbols-outlined text-[18px] text-ink-4 group-hover:text-navy shrink-0" aria-hidden="true">arrow_forward</span>
                </span>
                <span className="flex flex-col gap-1">
                  <span className={`text-kpi md:text-[1.75rem] font-extrabold tabular-nums leading-none ${vinho ? 'text-wine' : 'text-navy'}`}>{c.valor}</span>
                  {c.dica && <span className={`hidden md:block text-xs truncate ${c.dicaAtraso ? 'text-wine font-semibold' : 'text-ink-3'}`}>{c.dica}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
