// Ficheiro: App.tsx
import React, { useState, useEffect, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Login } from './components/Login';
import { Home } from './components/Home';
import { Sidebar } from './components/Sidebar';
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
import { NavItem } from './types';
import { NavContext, AuthUser } from './context/NavContext';
import { canAccessPage, setPermissoesCache } from './config/permissions';
import { onAuthChange, logoutUsuario } from './services/firebaseAuth';
import { getUsuarioProfile, setUsuarioPublico, UsuarioRecord } from './services/firestoreUsuarios';
import { observarPermissoes, salvarPermissoesRemoto, type PermissoesArmazenadas } from './services/firestorePermissions';

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
});

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<NavItem>('home');
  const [periciaMenorVigentes, setPericiaMenorVigentes] = useState(0);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [permissoesLoading, setPermissoesLoading] = useState(true);
  const [senhaAlertDismissed, setSenhaAlertDismissed] = useState(false);
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
      if (dados === null && authUser.perfil === 'admin') {
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
        setCurrentView('home');
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

  const handleLogout = () => {
    logoutUsuario();
    setCurrentView('home');
  };

  const updateAuthUser = (patch: Partial<AuthUser>) => {
    setAuthUser(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const navigateTo = (view: NavItem) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  const can = (pageId: string) => canAccessPage(pageId, authUser?.perfil);

  const renderView = () => {
    switch (currentView) {
      case 'home': return <Home />;
      case 'perfil': return <Perfil />;
      case 'guide': return <DiseaseGuide />;
      case 'laws': return can('laws') ? <LawReference /> : <DiseaseGuide />;
      case 'dgpm406': return can('dgpm406') ? <DGPM406Guide /> : <DiseaseGuide />;
      case 'concursos': return can('concursos') ? <ConcursosGuide /> : <DiseaseGuide />;
      case 'portaria': return can('portaria') ? <PortariaGuide /> : <DiseaseGuide />;
      case 'exames': return can('exames') ? <ExamesGuide /> : <DiseaseGuide />;
      case 'templates': return can('templates') ? <TemplatesGuide /> : <DiseaseGuide />;

      // PÁGINAS RESTRITAS POR PERFIL (config/permissions.ts, editável em Usuários)
      case 'pareceres': return can('pareceres') ? <Pareceres /> : <DiseaseGuide />;
      case 'concursosJRS': return can('concursosJRS') ? <ConcursosJRS /> : <DiseaseGuide />;
      case 'pericia-menor': return can('pericia-menor') ? <PericiaMenor /> : <DiseaseGuide />;
      case 'mensagens': return can('mensagens') ? <Mensagens /> : <DiseaseGuide />;
      case 'infograficos': return can('infograficos') ? <Infograficos /> : <DiseaseGuide />;
      case 'casos': return can('casos') ? <CasosPericiais onBack={() => setCurrentView('guide')} /> : <DiseaseGuide />;
      case 'videos': return can('videos') ? <Videos /> : <DiseaseGuide />;
      case 'roteiro': return can('roteiro') ? <RoteiroJRS /> : <DiseaseGuide />;

      // USUÁRIOS PAGE - Restricted for non-admin
      case 'usuarios': return authUser?.perfil === 'admin' ? <UsuariosManagement /> : <DiseaseGuide />;

      default: return <Home />;
    }
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-[#050F41] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!authUser) {
    return <Login />;
  }

  if (permissoesLoading) {
    return (
      <div className="fixed inset-0 bg-[#050F41] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const mostrarAlertaSenha = !!authUser.senhaTemporaria && currentView !== 'perfil' && !senhaAlertDismissed;

  return (
    <NavContext.Provider
      value={{
        currentView,
        setCurrentView: navigateTo,
        authUser,
        updateAuthUser,
        handleLogout,
        periciaMenorVigentes,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        isAvatarMenuOpen,
        setIsAvatarMenuOpen,
      }}
    >
      <div className="fixed inset-0 flex bg-[#F3F5F7] text-[#1F2937] overflow-hidden antialiased select-none">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto relative bg-[#F3F5F7]">
          <main className="flex-grow w-full flex flex-col pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col flex-1 min-h-0 w-full"
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {mostrarAlertaSenha && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden">
            <div className="p-5 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[28px] text-amber-500">warning</span>
              </div>
              <h3 className="font-heading font-bold text-sm text-[#050F41] mb-1.5">Altere sua senha inicial</h3>
              <p className="text-xs md:text-sm text-gray-500 mb-5">
                Você ainda está usando a senha temporária (seu NIP). Por segurança, altere sua senha de acesso.
              </p>
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setSenhaAlertDismissed(true)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Depois
                </button>
                <button
                  type="button"
                  onClick={() => { setSenhaAlertDismissed(true); setCurrentView('perfil'); }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#079551] hover:bg-[#067a43] text-white text-xs md:text-sm font-bold transition-colors"
                >
                  Alterar Senha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NavContext.Provider>
  );
};

export default App;
