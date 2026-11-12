// Ficheiro: components/Sobre.tsx
// Página "Sobre o app" (menu lateral → Ajuda): as principais funcionalidades do app, por área, em cards. Por padrão
// para todos os perfis menos user_medicos_geral (matriz de permissões, página 'sobre'). O texto fica em
// config/sobre.ts; o botão "Abrir" de cada área só aparece para quem acessa a página correspondente.
import React from 'react';
import { Link } from 'react-router-dom';
import { Container, PageHeader } from './ui/Page';
import { useNav } from '../context/NavContext';
import { canAccessPage } from '../config/permissions';
import { pathForView } from '../config/routes';
import { AREAS_SOBRE } from '../config/sobre';

export const Sobre: React.FC = () => {
  const perfil = useNav()?.authUser?.perfil;
  return (
    <Container size="data" className="py-6 md:py-8 pb-10">
      <PageHeader
        title="Sobre o app"
        description="As principais funcionalidades do app da Junta Regular de Saúde do HNRe, por área."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {AREAS_SOBRE.map(a => {
          const acessa = !a.pagina || a.pagina === 'home' || canAccessPage(a.pagina, perfil);
          return (
            <section key={a.id} aria-labelledby={`sobre-${a.id}`} className="bg-white border border-line rounded-xl p-4 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <span className="w-10 h-10 rounded-lg bg-thead flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px] text-navy" aria-hidden="true">{a.icone}</span>
                </span>
                <div className="min-w-0">
                  <h2 id={`sobre-${a.id}`} className="text-h3 font-bold text-navy">{a.titulo}</h2>
                  <p className="text-xs text-ink-3">{a.resumo}</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-sm text-ink flex-1">
                {a.itens.map(t => (
                  <li key={t} className="flex gap-2">
                    <span className="material-symbols-outlined text-[18px] text-green-700 shrink-0 mt-px" aria-hidden="true">check</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              {a.pagina && a.pagina !== 'home' && acessa && (
                <Link to={pathForView(a.pagina)} className="mt-3 self-start inline-flex items-center gap-1 min-h-[44px] text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">
                  Abrir {a.titulo}<span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
                </Link>
              )}
            </section>
          );
        })}
      </div>
    </Container>
  );
};
