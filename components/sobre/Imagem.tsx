// Ficheiro: components/sobre/Imagem.tsx
// Imagem da página "Sobre o app" (capturas das telas e modelos de e-mail em public/sobre/): <picture> com 1× e
// 2×, versão escura quando existe (prefers-color-scheme no modo Sistema; a escolhida quando o usuário força
// Claro/Escuro), loading="lazy", largura e altura fixas (nada pula ao carregar) e texto alternativo.
// Imagem ainda não gerada (fora de components/sobre/imagens.gerado.ts) → moldura leve com o ícone da área,
// na mesma proporção, até o script rodar (scripts/sobre/gerar-capturas.ts e gerar-emails.ts).
import React from 'react';
import { useTema } from '../../hooks/useTema';
import { IMAGENS_GERADAS } from './imagens.gerado';

const BASE = `${import.meta.env.BASE_URL}sobre/`;

/** URL de uma imagem de public/sobre/ (sem extensão no nome). */
export const urlSobre = (nome: string, escala: 1 | 2 = 1) => `${BASE}${nome}${escala === 2 ? '@2x' : ''}.webp`;

const srcSet = (nome: string) => `${urlSobre(nome)} 1x, ${urlSobre(nome, 2)} 2x`;

export const imagemGerada = (chave: string) => IMAGENS_GERADAS[chave];

interface ImagemSobreProps {
  /** Chave do manifesto: 'telas/inspecoes-desktop', 'emails/agendaIS'… */
  chave: string;
  alt: string;
  /** Proporção da moldura enquanto a imagem não existe (largura × altura). */
  reserva: { w: number; h: number };
  /** Ícone da moldura. */
  icone?: string;
  className?: string;
  /** Carrega já (a imagem do visualizador, que só existe quando aberto). */
  imediata?: boolean;
}

export const ImagemSobre: React.FC<ImagemSobreProps> = ({ chave, alt, reserva, icone = 'image', className = '', imediata = false }) => {
  const tema = useTema();
  const dim = IMAGENS_GERADAS[chave];
  if (!dim) {
    return (
      <div
        role="img"
        aria-label={`${alt} (imagem ainda não gerada)`}
        style={{ aspectRatio: `${reserva.w} / ${reserva.h}` }}
        className={`w-full flex items-center justify-center bg-surface-2 text-ink-3 ${className}`}
      >
        <span className="material-symbols-outlined text-[40px]" aria-hidden="true">{icone}</span>
      </div>
    );
  }
  const claro = `${chave}${dim.escuro ? '-claro' : ''}`;
  const escuro = `${chave}-escuro`;
  const img = (nome: string) => (
    <img
      src={urlSobre(nome)}
      srcSet={srcSet(nome)}
      width={dim.w}
      height={dim.h}
      alt={alt}
      loading={imediata ? 'eager' : 'lazy'}
      decoding="async"
      className={`block w-full h-auto ${className}`}
    />
  );
  if (!dim.escuro) return img(claro);
  // Tema forçado (Claro/Escuro em Meu perfil): a versão escolhida; modo Sistema: o navegador decide pela mídia.
  if (tema.modo !== 'sistema') return img(tema.efetivo === 'dark' ? escuro : claro);
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet={srcSet(escuro)} width={dim.w} height={dim.h} />
      {img(claro)}
    </picture>
  );
};
