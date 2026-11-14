// Ficheiro: components/sobre/TambemNoApp.tsx
// "Também no app" (auditoria v3, 6c): as áreas sem destaque em cards pequenos de 4 colunas, sem imagem.
// Na página interna o card inteiro leva à área (quando o perfil a acessa); na pública é só texto.
import React from 'react';
import { Link } from 'react-router-dom';
import { GradeCards } from '../ui/Grade';

export interface CardTambem { id: string; titulo: string; icone: string; texto: string; to?: string }

export const TambemNoApp: React.FC<{ cards: CardTambem[]; id?: string }> = ({ cards, id = 'sobre-tambem' }) => {
  if (!cards.length) return null;
  const corpo = (c: CardTambem) => (
    <>
      <span className="material-symbols-outlined text-[24px] text-navy" aria-hidden="true">{c.icone}</span>
      <span className="text-h3 text-navy">{c.titulo}</span>
      <span className="text-sm text-ink">{c.texto}</span>
    </>
  );
  const classe = 'h-full flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-line';
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-24 flex flex-col gap-4">
      <h2 id={`${id}-titulo`} tabIndex={-1} className="text-h2 text-navy focus:outline-none">Também no app</h2>
      <GradeCards as="ul">
        {cards.map(c => (
          <li key={c.id}>
            {c.to ? (
              <Link to={c.to} className={`${classe} hover:border-navy transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold`}>
                {corpo(c)}
              </Link>
            ) : (
              <div className={classe}>{corpo(c)}</div>
            )}
          </li>
        ))}
      </GradeCards>
    </section>
  );
};
