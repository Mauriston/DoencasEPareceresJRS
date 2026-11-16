// Ficheiro: components/ficha/CascaPainelFicha.tsx
// Casca do PAINEL PRINCIPAL da Ficha do inspecionado (coluna da esquerda): cabeçalho do registro aberto
// (ícone, título, chip ao lado e linha de apoio), corpo e, embaixo, a BARRA DE AÇÕES da aba (botões
// específicos de cada aba — fixa no rodapé da tela ao rolar, a partir de md). Usada pelos detalhes que antes
// abriam num Drawer (InspecaoDetalhe e PericiaMenorPainel em modo "inline") e pelos painéis das abas novas.
import React, { useId } from 'react';
import { Button } from '../ui/Button';
import type { AcaoRodape } from '../ui/AcoesRodape';

interface Props {
  titulo?: React.ReactNode;
  icone?: string;
  /** Ao lado do título (ex.: chip de status). */
  tituloExtra?: React.ReactNode;
  /** Linha de apoio sob o título. */
  subtitulo?: React.ReactNode;
  /** Botões da barra inferior (na ordem dada; a principal por último). Sem ações, a barra não aparece. */
  acoes?: AcaoRodape[];
  /** Rótulo acessível quando não há título visível (ex.: aviso de "sem registros"). */
  rotulo?: string;
  children: React.ReactNode;
}

/** Barra inferior de ações da aba (também usada sozinha, sem casca). */
export const BarraAcoesFicha: React.FC<{ acoes: AcaoRodape[] }> = ({ acoes }) => {
  if (!acoes.length) return null;
  return (
    <div role="toolbar" aria-label="Ações da aba"
      className="md:sticky md:bottom-0 z-[1] border-t border-line bg-white/95 backdrop-blur-sm px-4 md:px-5 py-3 rounded-b-xl grid grid-cols-1 sm:flex sm:flex-wrap sm:justify-end gap-2 print:hidden">
      {acoes.map(a => (
        <Button key={a.id} variant={a.variante ?? 'primary'} icon={a.icone} onClick={a.onClick} disabled={a.disabled} loading={a.loading}>
          {a.rotulo}
        </Button>
      ))}
    </div>
  );
};

export const CascaPainelFicha: React.FC<Props> = ({ titulo, icone, tituloExtra, subtitulo, acoes = [], rotulo, children }) => {
  const tituloId = useId();
  return (
    <section aria-labelledby={titulo ? tituloId : undefined} aria-label={titulo ? undefined : rotulo}
      className="bg-white border border-line rounded-xl flex flex-col min-w-0">
      {titulo && (
        <header className="px-4 md:px-5 pt-4 pb-3 border-b border-line">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {icone && <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">{icone}</span>}
            <h2 id={tituloId} className="font-heading font-extrabold text-h2 text-navy break-words min-w-0">{titulo}</h2>
            {tituloExtra && <div className="shrink-0 flex items-center">{tituloExtra}</div>}
          </div>
          {subtitulo && <p className="text-xs text-ink-3 mt-1 tabular-nums break-words">{subtitulo}</p>}
        </header>
      )}
      <div className="p-4 md:p-5 text-sm text-ink flex-1 min-w-0">{children}</div>
      <BarraAcoesFicha acoes={acoes} />
    </section>
  );
};
