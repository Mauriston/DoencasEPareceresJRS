// Ficheiro: App.tsx
import React, { useState, useEffect, useReducer, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate, useNavigationType, useRoutes } from 'react-router-dom';
import { Login } from './components/Login';
import { Home } from './components/Home';
import { Sidebar } from './components/shell/Sidebar';
import { Topbar } from './components/shell/Topbar';
import { BreadcrumbProvider } from './context/BreadcrumbContext';
import { ROUTES, pathForView, viewForPath } from './config/routes';
import { Dialog } from './components/ui/Dialog';
import { Button } from './components/ui/Button';
import { EmptyState } from './components/ui/EmptyState';
import { Page } from './components/ui/Page';
import { Perfil } from './components/Perfil';
import { DiseaseGuide } from './components/DiseaseGuide';
import { LawReference } from './components/LawReference';
import { DGPM406Guide } from './components/DGPM406Guide';
import { ConcursosGuide } from './components/ConcursosGuide';
import { ConcursosJRS } from './components/ConcursosJRS';
import { PortariaGuide } from './components/PortariaGuide';
import { ExamesGuide } from './components/ExamesGuide';
import { Infograficos } from './components/Infograficos';
import { Pareceres } from './components/Pareceres';
import { TemplatesGuide } from './components/TemplatesGuide';
import { CasosPericiais } from './components/CasosPericiais';
import { Videos } from './components/Videos';
import { PericiaMenor } from './components/PericiaMenor';
import { Mensagens } from './components/Mensagens';
import { RoteiroJRS } from './components/RoteiroJRS';
import { UsuariosManagement } from './components/UsuariosManagement';
import { Militares } from './components/Militares';
import { AccessDenied } from './components/ui/AccessDenied';
import { PAGE_DEFS } from './config/permissions';
import { NavItem } from './types';
import { NavContext, AuthUser, getPrimeiroNome } from './context/NavContext';
import { canAccessPage, setPermissoesCache } from './config/permissions';
import { InstallAppTutorial } from './components/InstallAppTutorial';
import { InstallAppQrDialog } from './components/InstallAppQrDialog';
import { onAuthChange, logoutUsuario } from './services/firebaseAuth';
import { entrarComToken } from './services/handoff';
import {
  detectarPlataformaTutorial, isMobileDevice, isStandalone,
  marcarTutorialConcluidoLocal, tutorialConcluidoLocal,
} from './utils/pwa';
import { getUsuarioProfile, setUsuarioPublico, updateUsuarioProfile, UsuarioRecord } from './services/firestoreUsuarios';
import { observarPermissoes, salvarPermissoesRemoto, type PermissoesArmazenadas } from './services/firestorePermissions';
import { getCasosResultado } from './services/firestoreCasos';
import { definirAtorAuditoria } from './services/auditoriaIS';
import { useIsDesktop } from './hooks/useIsDesktop';

// Chave do antigo armazenamento (localStorage, só neste navegador) das
// permissões — mantido aqui apenas para a migração automática de uma vez
// (ver efeito abaixo): se um admin abrir o app num navegador que ainda tem
// essa configuração local e o documento compartilhado no Firestore ainda
// não existir, promove-a automaticamente em vez de descartar silenciosamente
// o que o admin já tinha configurado.
const LEGACY_PERMISSOES_STORAGE_KEY = 'jrs_permissoes_config';
const lerPermissoesLegadoLocalStorage = (): PermissoesArmazenadas | null => {
  try {
    const raw = localStorage.getItem(LEGACY_PERMISSOES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return { pages: parsed.pages || {}, features: parsed.features || {} };
  } catch {
    return null;
  }
};

const GAS_URL = 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec';

const buildAuthUser = (profile: UsuarioRecord): AuthUser => ({
  uid: profile.id,
  usuario: profile.usuario,
  nome: profile.nome,
  perfil: profile.perfil,
  postoGraduacao: profile.postoGraduacao,
  cargo: profile.cargo,
  nip: profile.nip,
  crmPe: profile.crmPe,
  rqe: profile.rqe,
  email: profile.email,
  gmail: profile.gmail,
  celular: profile.celular,
  imageProfile: profile.imageProfile,
  senhaTemporaria: !!profile.senhaTemporaria,
  pwaTutorialConcluido: !!profile.pwaTutorialConcluido,
});

interface AppProps {
  /** Token do login por QR code (#h=…), lido em index.tsx ANTES de o roteador ler o hash. */
  handoffToken?: string | null;
}

const App: React.FC<AppProps> = ({ handoffToken = null }) => {
  // A página atual vem da URL (HashRouter); `currentView` continua sendo o
  // identificador usado pelas permissões, pela sidebar e pela Home.
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const currentView: NavItem = viewForPath(location.pathname) ?? 'home';
  const [periciaMenorVigentes, setPericiaMenorVigentes] = useState(0);
  const [authUserReal, setAuthUser] = useState<AuthUser | null>(null);
  // "Ver como" (só Admin): troca a visualização do app para outro perfil, sem alterar o perfil de fato.
  const [verComo, setVerComoState] = useState<string | null>(() => {
    try { return sessionStorage.getItem('jrs_ver_como'); } catch { return null; }
  });
  const setVerComo = (perfil: string | null) => {
    setVerComoState(perfil);
    try { if (perfil) sessionStorage.setItem('jrs_ver_como', perfil); else sessionStorage.removeItem('jrs_ver_como'); } catch { /* sem sessionStorage */ }
  };
  const authUser = useMemo<AuthUser | null>(
    () => (authUserReal && authUserReal.perfil === 'admin' && verComo ? { ...authUserReal, perfil: verComo } : authUserReal),
    [authUserReal, verComo],
  );
  const [authLoading, setAuthLoading] = useState(true);
  const [permissoesLoading, setPermissoesLoading] = useState(true);
  const [senhaAlertDismissed, setSenhaAlertDismissed] = useState(false);
  const [casosAlertDismissed, setCasosAlertDismissed] = useState(false);
  const [pwaAlertDismissed, setPwaAlertDismissed] = useState(false);
  // Login vindo do QR code do desktop (#h=<custom token>): o token é lido e
  // removido da barra de endereço em index.tsx; enquanto a troca por sessão
  // acontece, mantemos a tela de carregamento em vez de piscar o Login.
  const [handoffPendente, setHandoffPendente] = useState(!!handoffToken);
  const mainRef = useRef<HTMLElement>(null);
  const sentinelaRef = useRef<HTMLDivElement>(null);
  const [rolou, setRolou] = useState(false);
  // null enquanto ainda não verificamos; depois, true/false conforme já
  // existe (ou não) um resultado salvo para este usuário.
  const [casosRespondido, setCasosRespondido] = useState<boolean | null>(null);
  const isDesktop = useIsDesktop();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Estado do menu do usuário (avatar) compartilhado entre o Header (que o
  // renderiza) e o item de rodapé do drawer mobile do Sidebar (que também
  // precisa abri-lo).
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  // A matriz de permissões (config/permissoes no Firestore) é compartilhada
  // entre todos os usuários/dispositivos — o listener fica aberto durante
  // toda a sessão para refletir em tempo real uma alteração feita por um
  // admin em outro lugar. Como canAccessPage/canUseFeature continuam
  // síncronos (lêem um cache em memória), forçamos um novo render do app
  // a cada atualização para que as páginas já montadas releiam o cache.
  const [, forcarRerenderPermissoes] = useReducer(x => x + 1, 0);

  // Ator do log de auditoria das IS (ver services/auditoriaIS.ts).
  useEffect(() => {
    definirAtorAuditoria(authUser ? { uid: authUser.uid, usuario: authUser.usuario, nome: authUser.nome } : null);
  }, [authUser?.uid]);

  useEffect(() => {
    if (!authUser) {
      // Sem usuário autenticado as regras do Firestore negam a leitura do
      // documento — não há por que assinar nem bloquear a tela de login.
      setPermissoesCache(null);
      setPermissoesLoading(false);
      return;
    }
    setPermissoesLoading(true);
    const unsubscribe = observarPermissoes(dados => {
      if (dados === null && authUserReal?.perfil === 'admin') {
        const legado = lerPermissoesLegadoLocalStorage();
        if (legado) {
          // Doc remoto ainda não existe: promove a configuração que este
          // admin já tinha localmente em vez de perdê-la. O próprio
          // onSnapshot dispara de novo com os dados reais em seguida.
          salvarPermissoesRemoto(legado).catch(() => {});
          return;
        }
      }
      setPermissoesCache(dados);
      setPermissoesLoading(false);
      forcarRerenderPermissoes();
    });
    return unsubscribe;
  }, [authUser?.uid]);

  // Lembrete de Casos Periciais (só mobile, ver modal mais abaixo): verifica
  // uma vez por login se este usuário já tem um resultado salvo. A
  // permissão em si (canAccessPage) é checada no render, não aqui, para
  // sempre refletir o cache de permissões mais atual.
  useEffect(() => {
    if (!authUser) { setCasosRespondido(null); return; }
    let cancelado = false;
    getCasosResultado(authUser.uid)
      .then(resultado => { if (!cancelado) setCasosRespondido(!!resultado); })
      .catch(() => { if (!cancelado) setCasosRespondido(null); });
    return () => { cancelado = true; };
  }, [authUser?.uid]);

  useEffect(() => {
    if (!handoffToken) return;
    entrarComToken(handoffToken)
      .catch(() => {}) // token inválido/expirado: segue para o login normal
      .finally(() => setHandoffPendente(false));
  }, [handoffToken]);

  // Já abriu pelo ícone da tela inicial: não há mais o que ensinar.
  useEffect(() => {
    if (authUser && !authUser.pwaTutorialConcluido && isStandalone()) concluirTutorialPwa();
  }, [authUser?.uid]);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (!firebaseUser) {
        setAuthUser(null);
        setAuthLoading(false);
        return;
      }
      try {
        const profile = await getUsuarioProfile(firebaseUser.uid);
        if (!profile || !profile.ativo) {
          await logoutUsuario();
          setAuthUser(null);
          return;
        }
        setAuthUser(buildAuthUser(profile));
        setSenhaAlertDismissed(false);
        setCasosAlertDismissed(false);
        setPwaAlertDismissed(false);
        // (Sem navegar para a Home aqui: com URL por tela, recarregar a página ou
        // abrir um link direto precisa manter a tela — o logout já volta ao início.)
        // Auto-cura do espelho público (menu suspenso de login): garante que
        // este usuário sempre apareça na lista, mesmo se o registro em
        // "usuarios_publicos" nunca tiver sido criado/estiver desatualizado.
        setUsuarioPublico(profile.id, { usuario: profile.usuario, ativo: profile.ativo }).catch(() => {});
      } catch {
        await logoutUsuario();
        setAuthUser(null);
      } finally {
        setAuthLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authUser?.perfil === 'user_secretaria') return;
    fetch(`${GAS_URL}?action=getPericiaMenorList`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setPericiaMenorVigentes(json.data.filter((r: { vigente: boolean }) => r.vigente).length);
        }
      })
      .catch(() => {});
  }, [authUser]);

  // Tutorial do ícone na tela inicial concluído (ou "já instalei"): grava
  // neste aparelho e no perfil (vale para o desktop também). A gravação no
  // perfil é best-effort — o localStorage já garante este aparelho.
  const concluirTutorialPwa = () => {
    marcarTutorialConcluidoLocal();
    if (!authUser) return;
    setAuthUser(prev => (prev ? { ...prev, pwaTutorialConcluido: true } : prev));
    updateUsuarioProfile(authUser.uid, { pwaTutorialConcluido: true }).catch(() => {});
  };

  const handleLogout = () => {
    setVerComo(null);
    logoutUsuario();
    navigate('/', { replace: true });
  };

  const updateAuthUser = (patch: Partial<AuthUser>) => {
    setAuthUser(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const setCurrentView = (view: NavItem) => {
    navigate(pathForView(view));
  };

  // O drawer mobile fecha a cada navegação; a nova página volta ao topo e
  // recebe o foco (leitores de tela e teclado começam no conteúdo).
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsAvatarMenuOpen(false);
    // POP (botão voltar/avançar) preserva a rolagem natural do navegador não — mas aqui o
    // container de rolagem é único e simples: sempre começa no topo.
    mainRef.current?.scrollTo({ top: 0 });
    if (navigationType !== 'POP') mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  // F31: a topbar ganha sombra quando o conteúdo rola por baixo dela
  // (o container que rola é o <main>, não a janela).
  useEffect(() => {
    const main = mainRef.current;
    const sentinela = sentinelaRef.current;
    if (!main || !sentinela) return;
    const obs = new IntersectionObserver(([entrada]) => setRolou(!entrada.isIntersecting), { root: main, threshold: 0 });
    obs.observe(sentinela);
    return () => obs.disconnect();
  }, [authUser?.uid, permissoesLoading, authLoading, handoffPendente]);

  const can = (pageId: string) => canAccessPage(pageId, authUser?.perfil);
  const paginaLabel = (pageId: string) => PAGE_DEFS.find(p => p.id === pageId)?.label;

  // As permissões continuam sendo checadas página a página (can) — a URL só
  // escolhe a página; sem permissão, o estado explícito de acesso negado.
  const renderView = (view: NavItem) => {
    switch (view) {
      case 'home': return <Home />;
      case 'perfil': return <Perfil />;
      case 'guide': return <DiseaseGuide />;
      case 'laws': return can('laws') ? <LawReference /> : <AccessDenied pagina={paginaLabel('laws')} />;
      case 'dgpm406': return can('dgpm406') ? <DGPM406Guide /> : <AccessDenied pagina={paginaLabel('dgpm406')} />;
      case 'concursos': return can('concursos') ? <ConcursosGuide /> : <AccessDenied pagina={paginaLabel('concursos')} />;
      case 'portaria': return can('portaria') ? <PortariaGuide /> : <AccessDenied pagina={paginaLabel('portaria')} />;
      case 'exames': return can('exames') ? <ExamesGuide /> : <AccessDenied pagina={paginaLabel('exames')} />;
      case 'templates': return can('templates') ? <TemplatesGuide /> : <AccessDenied pagina={paginaLabel('templates')} />;

      // PÁGINAS RESTRITAS POR PERFIL (config/permissions.ts, editável em Usuários)
      case 'pareceres': return can('pareceres') ? <Pareceres /> : <AccessDenied pagina={paginaLabel('pareceres')} />;
      case 'concursosJRS': return can('concursosJRS') ? <ConcursosJRS /> : <AccessDenied pagina={paginaLabel('concursosJRS')} />;
      case 'pericia-menor': return can('pericia-menor') ? <PericiaMenor /> : <AccessDenied pagina={paginaLabel('pericia-menor')} />;
      case 'mensagens': return can('mensagens') ? <Mensagens /> : <AccessDenied pagina={paginaLabel('mensagens')} />;
      case 'infograficos': return can('infograficos') ? <Infograficos /> : <AccessDenied pagina={paginaLabel('infograficos')} />;
      case 'casos': return can('casos') ? <CasosPericiais /> : <AccessDenied pagina={paginaLabel('casos')} />;
      case 'videos': return can('videos') ? <Videos /> : <AccessDenied pagina={paginaLabel('videos')} />;
      case 'roteiro': return can('roteiro') ? <RoteiroJRS /> : <AccessDenied pagina={paginaLabel('roteiro')} />;

      // USUÁRIOS PAGE - Restricted for non-admin
      case 'militares': return authUser?.perfil === 'admin' ? <Militares /> : <AccessDenied pagina="Militares" />;
      case 'usuarios': return authUser?.perfil === 'admin' ? <UsuariosManagement /> : <AccessDenied pagina="Usuários" />;

      default: return <Home />;
    }
  };

  // Hook antes de qualquer retorno antecipado (ordem de hooks estável).
  const rotas = useRoutes([
    ...ROUTES.map(r => ({ path: r.path, element: renderView(r.view) })),
    {
      path: '*',
      element: (
        <Page title="Página não encontrada" size="form">
          <EmptyState icon="travel_explore" title="Esse endereço não existe" description="A página pode ter sido movida. Volte à Página Inicial ou use a busca no topo." action={<Button icon="home" onClick={() => navigate('/')}>Ir para a Página Inicial</Button>} />
        </Page>
      ),
    },
  ]);

  if (authLoading || handoffPendente) {
    return (
      <div className="fixed inset-0 bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!authUser) {
    return <Login />;
  }

  if (permissoesLoading) {
    return (
      <div className="fixed inset-0 bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const mostrarAlertaSenha = !!authUser.senhaTemporaria && currentView !== 'perfil' && !senhaAlertDismissed;
  // Só mobile, só depois do alerta de senha (se houver), só quem tem
  // permissão para a página e ainda não respondeu.
  const mostrarAlertaCasos =
    !isDesktop &&
    !mostrarAlertaSenha &&
    !casosAlertDismissed &&
    casosRespondido === false &&
    currentView !== 'casos' &&
    canAccessPage('casos', authUser.perfil);
  // Ícone na tela inicial: só para usuários comuns (não admin) que ainda não
  // concluíram o tutorial nem abriram o app pelo ícone. No celular abre o
  // passo a passo; no desktop, o QR code que leva o app (e o login) ao celular.
  const pwaPendente =
    authUser.perfil !== 'admin' &&
    !authUser.pwaTutorialConcluido &&
    !tutorialConcluidoLocal() &&
    !isStandalone() &&
    !pwaAlertDismissed;
  const mostrarTutorialPwa = pwaPendente && isMobileDevice() && !mostrarAlertaSenha && !mostrarAlertaCasos;
  const mostrarQrPwa = pwaPendente && !isMobileDevice() && !mostrarAlertaSenha;

  return (
    <NavContext.Provider
      value={{
        currentView,
        setCurrentView,
        navigate: (to, opcoes) => navigate(to, opcoes),
        authUser,
        perfilReal: authUserReal?.perfil,
        verComo: authUserReal?.perfil === 'admin' ? verComo : null,
        setVerComo,
        updateAuthUser,
        handleLogout,
        periciaMenorVigentes,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        isAvatarMenuOpen,
        setIsAvatarMenuOpen,
      }}
    >
      <BreadcrumbProvider>
      <div className="fixed inset-0 flex bg-canvas text-ink overflow-hidden antialiased">
        <button
          type="button"
          onClick={() => mainRef.current?.focus()}
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[300] focus:bg-navy focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
        >
          Pular para o conteúdo
        </button>
        <Sidebar />
        <div className="flex-1 flex flex-col h-full min-w-0">
          <Topbar rolou={rolou} />
          {/* Único container de rolagem do app: as telas só crescem; toolbars e
              cabeçalhos de tabela usam `sticky` dentro dele. */}
          <main id="conteudo" ref={mainRef} tabIndex={-1} className="flex-1 min-h-0 overflow-y-auto focus:outline-none">
            <div ref={sentinelaRef} className="h-px -mb-px" aria-hidden="true" />
            <motion.div
              key={currentView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col min-h-full w-full"
            >
              {rotas}
            </motion.div>
          </main>
        </div>
      </div>
      </BreadcrumbProvider>

      {mostrarAlertaSenha && (
        <Dialog
          title="Altere sua senha inicial"
          icon="warning"
          onClose={() => setSenhaAlertDismissed(true)}
          footer={(
            <>
              <Button variant="secondary" onClick={() => setSenhaAlertDismissed(true)}>Depois</Button>
              <Button onClick={() => { setSenhaAlertDismissed(true); setCurrentView('perfil'); }}>Alterar senha</Button>
            </>
          )}
        >
          <p className="text-ink-3 leading-relaxed">
            Você ainda está usando a senha temporária (seu NIP). Por segurança, altere sua senha de acesso.
          </p>
        </Dialog>
      )}

      {mostrarTutorialPwa && (
        <InstallAppTutorial
          plataformaInicial={detectarPlataformaTutorial()}
          onClose={() => setPwaAlertDismissed(true)}
          onComplete={concluirTutorialPwa}
        />
      )}

      {mostrarQrPwa && (
        <InstallAppQrDialog
          onClose={() => setPwaAlertDismissed(true)}
          onAlreadyInstalled={concluirTutorialPwa}
        />
      )}

      {mostrarAlertaCasos && (
        <Dialog
          title={`${getPrimeiroNome(authUser)},`}
          icon="quiz"
          onClose={() => setCasosAlertDismissed(true)}
          footer={(
            <>
              <Button variant="secondary" onClick={() => setCasosAlertDismissed(true)}>Responder depois</Button>
              <Button onClick={() => { setCasosAlertDismissed(true); setCurrentView('casos'); }}>Responder</Button>
            </>
          )}
        >
          <p className="text-ink-3 leading-relaxed mb-2">
            Você ainda não respondeu os <strong className="text-navy">Casos Periciais</strong>. Trata-se de
            um bloco de 24 questões comentadas de múltipla escolha sobre os pontos mais importantes na prática
            da DGPM-406. Não deixe de fazer essa auto-avaliação!
          </p>
          <p className="text-ink-3 italic">CT Mauriston.</p>
        </Dialog>
      )}
    </NavContext.Provider>
  );
};

export default App;
