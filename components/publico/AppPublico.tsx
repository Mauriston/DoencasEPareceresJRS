// Ficheiro: components/publico/AppPublico.tsx
// App das páginas públicas (sem login): só as duas telas de conteúdo
// normativo, dentro do ShellPublico. Não monta NavContext, permissões,
// Firebase Auth nem listeners do Firestore — nada aqui depende de sessão.
import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigationType, useRoutes } from 'react-router-dom';
import { DiseaseGuide } from '../DiseaseGuide';
import { PortariaGuide } from '../PortariaGuide';
import { ShellPublico } from './ShellPublico';
import { PUBLICO_DOENCAS, PUBLICO_PORTARIA } from '../../config/routes';
import { getMainScroller } from '../../utils/dom';

// No app, voltar um nível é função das migalhas da Topbar, que o shell
// público não tem. Aqui o caminho de volta é o próprio endereço sem o último
// segmento: /publico/doencas/:id/:idx → /publico/doencas/:id → /publico/doencas.
const VoltarPublico: React.FC = () => {
  const { pathname } = useLocation();
  if (!pathname.startsWith(`${PUBLICO_DOENCAS}/`)) return null;
  return (
    <div className="w-full px-4 md:px-6 xl:px-8 pt-4 -mb-2">
      <div className="mx-auto w-full max-w-data">
        <Link
          to={pathname.slice(0, pathname.lastIndexOf('/'))}
          className="inline-flex items-center gap-1 min-h-[44px] text-sm font-bold text-navy hover:underline"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_back</span>
          Voltar
        </Link>
      </div>
    </div>
  );
};

export const AppPublico: React.FC = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const rotas = useRoutes([
    { path: `${PUBLICO_DOENCAS}/:doencaId?/:diagnosticoIdx?`, element: <DiseaseGuide publico /> },
    { path: PUBLICO_PORTARIA, element: <PortariaGuide publico /> },
  ]);
  // Mesma regra do app: a nova tela começa no topo; o foco só se desloca
  // quando a navegação partiu de um clique (não no voltar/avançar).
  const primeiroRender = useRef(true);
  useEffect(() => {
    const scroller = getMainScroller();
    scroller?.scrollTo({ top: 0 });
    if (!primeiroRender.current && navigationType !== 'POP') scroller?.focus({ preventScroll: true });
    primeiroRender.current = false;
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ShellPublico>
      <div key={location.pathname} className="flex flex-col flex-1 w-full animate-fade-in">
        <VoltarPublico />
        {rotas}
      </div>
    </ShellPublico>
  );
};
