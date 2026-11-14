// Ficheiro: components/sobre/LinhaArea.tsx
// Linha de uma área em destaque da página "Sobre o app" (auditoria v3, 6c Layout B / 6d celular), usada nas
// versões interna e pública:
// - Largura útil ≥ @split (960 px): texto em 5 colunas + composição em 7 (captura do desktop com a do celular
//   sobreposta, num painel), alternando os lados a cada linha.
// - Container médio (tablet): Layout A empilhado — texto em cima, captura do desktop embaixo.
// - Celular: uma coluna — ícone, título, texto, até 3 itens com "Ver tudo", botão Abrir e a captura do
//   celular num painel de largura total.
import React, { useId, useState } from 'react';
import { ImagemSobre } from './Imagem';
import type { AreaSobre, TextoAreaSobre } from '../../config/sobre';

const DESKTOP = { w: 1280, h: 800 };
const CELULAR = { w: 390, h: 844 };

/** Ícone redondo da área (cabeçalho da linha e do bloco de e-mails). */
export const IconeSecao: React.FC<{ icone: string }> = ({ icone }) => (
  <span className="w-12 h-12 rounded-full bg-white border border-line ring-8 ring-surface-2 flex items-center justify-center shrink-0">
    <span className="material-symbols-outlined text-[26px] text-navy" aria-hidden="true">{icone}</span>
  </span>
);

/** Moldura do celular (borda escura de aparelho) com a captura. */
const Celular: React.FC<{ area: AreaSobre; className?: string }> = ({ area, className = '' }) => (
  <div className={`rounded-[26px] border-[6px] border-black bg-black overflow-hidden shadow-lg ${className}`}>
    <ImagemSobre chave={`telas/${area.imagens!.celular}`} alt={area.imagens!.altCelular} reserva={CELULAR} icone={area.icone} />
  </div>
);

/** Moldura do desktop (janela clara com borda) com a captura. */
const Desktop: React.FC<{ area: AreaSobre; className?: string }> = ({ area, className = '' }) => (
  <div className={`rounded-xl bg-white border border-line p-1 shadow-lg ${className}`}>
    <div className="rounded-lg overflow-hidden border border-line">
      <ImagemSobre chave={`telas/${area.imagens!.desktop}`} alt={area.imagens!.altDesktop} reserva={DESKTOP} icone={area.icone} />
    </div>
  </div>
);

/** Composição desktop + celular (≥ @split). `espelhar`: painel à esquerda do texto. */
const Composicao: React.FC<{ area: AreaSobre; espelhar: boolean }> = ({ area, espelhar }) => (
  <div className="relative w-full aspect-[640/460] overflow-hidden rounded-xl bg-surface-2 border border-line">
    <Desktop area={area} className={`absolute top-[8.7%] w-[104%] ${espelhar ? 'right-[25%]' : 'left-[26.5%]'}`} />
    <Celular area={area} className={`absolute top-[19.5%] w-[36%] ${espelhar ? 'right-[6.25%]' : 'left-[6.25%]'}`} />
  </div>
);

interface LinhaAreaProps {
  area: AreaSobre;
  /** Texto a usar (o interno ou o textoPublico). */
  texto: TextoAreaSobre;
  /** Índice da linha: as ímpares põem a imagem à esquerda (≥ @split). */
  indice: number;
  /** Ação ao fim do texto (o "Abrir …" da página interna; a pública não tem). */
  acao?: React.ReactNode;
  /** id da seção (destino dos chips do índice). */
  id: string;
}

export const LinhaArea: React.FC<LinhaAreaProps> = ({ area, texto, indice, acao, id }) => {
  const [tudo, setTudo] = useState(false);
  const idLista = useId();
  const idTitulo = `${id}-titulo`;
  const n = texto.itens.length;
  const espelhar = indice % 2 === 1;
  // Até 4 itens no desktop, até 3 no celular; o resto atrás de "Ver tudo (N)".
  const classeItem = (i: number) => (tudo || i < 3 ? 'flex' : i === 3 ? 'hidden md:flex' : 'hidden');
  // Com 4 itens, o desktop já mostra todos: o botão só existe no celular.
  const verTudo = n > 3 ? (n > 4 ? '' : 'md:hidden') : null;

  return (
    <section id={id} aria-labelledby={idTitulo} className="scroll-mt-24 @container">
      <div className="grid grid-cols-1 @split:grid-cols-12 gap-6 @split:gap-12 items-center">
        <div className={`flex flex-col gap-4 @split:col-span-5 ${espelhar ? '@split:order-2' : ''}`}>
          <IconeSecao icone={area.icone} />
          <h2 id={idTitulo} tabIndex={-1} className="text-h1 text-navy focus:outline-none">{texto.titulo ?? area.titulo}</h2>
          <p className="text-base text-ink">{texto.resumo}</p>
          <ul id={idLista} className="flex flex-col gap-3 pl-2">
            {texto.itens.map((t, i) => (
              <li key={t} className={`${classeItem(i)} gap-2.5 text-sm md:text-base text-ink`}>
                <span className="mt-0.5 w-[22px] h-[22px] shrink-0 rounded-full border-[1.5px] border-navy flex items-center justify-center" aria-hidden="true">
                  <span className="material-symbols-outlined text-[15px] text-navy">check</span>
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          {verTudo !== null && (
            <button
              type="button"
              aria-expanded={tudo}
              aria-controls={idLista}
              onClick={() => setTudo(v => !v)}
              className={`self-start pl-2 min-h-10 text-sm font-bold text-blue underline underline-offset-2 hover:text-navy ${verTudo}`}
            >
              {tudo ? 'Ver menos' : `Ver tudo (${n})`}
            </button>
          )}
          {acao && <div className="self-start">{acao}</div>}
        </div>

        {area.imagens && (
          <div className="@split:col-span-7 min-w-0">
            {/* ≥ @split: composição desktop + celular */}
            <div className="hidden @split:block"><Composicao area={area} espelhar={espelhar} /></div>
            {/* container médio (tablet): só a captura do desktop */}
            <div className="hidden @lg:block @split:hidden"><Desktop area={area} /></div>
            {/* celular: a captura do celular num painel de largura total */}
            <div className="@lg:hidden rounded-xl bg-surface-2 border border-line px-6 pt-6 h-[400px] overflow-hidden flex justify-center">
              <Celular area={area} className="w-[220px] self-start" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
