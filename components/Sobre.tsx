// Ficheiro: components/Sobre.tsx
// Página "Sobre o app" (menu do avatar e menu lateral → Ajuda), auditoria v3 §6 — Layout B (6c) com o
// celular de 6d: só as áreas que o perfil acessa (canAccessPage), na ordem de uso; as 4 em destaque com as
// telas (desktop + celular) e o resto em "Também no app"; índice em chips; e o bloco dos e-mails do app (6f).
// O texto fica em config/sobre.ts (o mesmo da versão pública, components/sobre/SobrePublico.tsx).
import React from 'react';
import { Container, PageHeader } from './ui/Page';
import { ButtonLink } from './ui/Button';
import { useNav } from '../context/NavContext';
import { canAccessPage } from '../config/permissions';
import { pathForView } from '../config/routes';
import { AREAS_SOBRE, type AreaSobre } from '../config/sobre';
import type { NavItem } from '../types';
import { LinhaArea } from './sobre/LinhaArea';
import { IndiceChips } from './sobre/Indice';
import { TambemNoApp } from './sobre/TambemNoApp';
import { EmailsApp } from './sobre/EmailsApp';

/** 1ª página da área que o perfil acessa ('home' é de todos); undefined = a área não aparece. */
export const paginaAcessivel = (area: AreaSobre, perfil: string | undefined): NavItem | undefined =>
  area.paginas.find(p => p === 'home' || canAccessPage(p, perfil));

export const Sobre: React.FC = () => {
  const perfil = useNav()?.authUser?.perfil;
  const areas = AREAS_SOBRE
    .map(area => ({ area, pagina: paginaAcessivel(area, perfil) }))
    .filter((a): a is { area: AreaSobre; pagina: NavItem } => a.pagina !== undefined);
  const destaques = areas.filter(a => a.area.destaque);
  const outras = areas.filter(a => !a.area.destaque);
  // O perfil que só vê uma área (ex.: Médicos Geral) dispensa o índice.
  const indice = [
    ...destaques.map(({ area }) => ({ id: `sobre-${area.id}`, rotulo: area.chip, icone: area.icone })),
    ...(outras.length ? [{ id: 'sobre-tambem', rotulo: 'Também no app', icone: 'apps' }] : []),
    { id: 'sobre-emails', rotulo: 'E-mails', icone: 'mail' },
  ];

  return (
    <Container size="data" className="py-6 md:py-8 pb-10">
      <PageHeader
        title="Sobre o app"
        description="As funções do app que o seu perfil usa, com as telas reais. Toque em uma área para ir direto a ela."
      />
      <IndiceChips itens={indice} rotulo="Áreas desta página" className="mb-8 md:mb-10" />

      <div className="flex flex-col gap-16 @container">
        {destaques.map(({ area, pagina }, i) => (
          <LinhaArea
            key={area.id}
            id={`sobre-${area.id}`}
            area={area}
            texto={area}
            indice={i}
            acao={pagina !== 'home' ? (
              <ButtonLink variant="secondary" to={pathForView(pagina)}>
                Abrir {area.chip}
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>
              </ButtonLink>
            ) : undefined}
          />
        ))}

        <TambemNoApp
          cards={outras.map(({ area, pagina }) => ({ id: area.id, titulo: area.titulo, icone: area.icone, texto: area.resumoCurto, to: pathForView(pagina) }))}
        />

        <EmailsApp />
      </div>
    </Container>
  );
};
