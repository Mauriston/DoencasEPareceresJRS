// Ficheiro: App.tsx
import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { DiseaseGuide } from './components/DiseaseGuide';
import { LawReference } from './components/LawReference';
import { DGPM406Guide } from './components/DGPM406Guide';
import { ConcursosGuide } from './components/ConcursosGuide';
import { ConcursosJRS } from './components/ConcursosJRS';
import { PortariaGuide } from './components/PortariaGuide';
import { ExamesGuide } from './components/ExamesGuide';
import { Infograficos } from './components/Infograficos';
import { Resumos } from './components/Resumos';
import { Pareceres } from './components/Pareceres';
import { TemplatesGuide } from './components/TemplatesGuide';
import { Artigos } from './components/Artigos';
import { ArtigoPericiaMedica } from './components/ArtigoPericiaMedica';
import { ArtigoPerfilPerito } from './components/ArtigoPerfilPerito';
import { ArtigoPericiaAdministrativa } from './components/ArtigoPericiaAdministrativa';
import { ArtigoPericiaPsiquiatria } from './components/ArtigoPericiaPsiquiatria';
import { CasosPericiais } from './components/CasosPericiais';
import { Estudo } from './components/Estudo'; 
import { PericiaMenor } from './components/PericiaMenor';
import { Mensagens } from './components/Mensagens';
import { RoteiroJRS } from './components/RoteiroJRS';
import { UsuariosManagement } from './components/UsuariosManagement';
import { NavItem } from './types';
import { NavContext } from './context/NavContext';
import { canAccessPage } from './config/permissions';

const GAS_URL = 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec';

interface AuthUser { nome: string; perfil: 'admin' | 'user_medicos' | 'user_secretaria' | string; }

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<NavItem>('splash');
  const [periciaMenorVigentes, setPericiaMenorVigentes] = useState(0);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('jrs_auth');
    if (saved) {
      const { usuario, senhaHash } = JSON.parse(saved);
      fetch(`${GAS_URL}?action=login&usuario=${encodeURIComponent(usuario)}&senhaHash=${encodeURIComponent(senhaHash)}`)
        .then(r => r.json())
        .then(json => {
          if (json.success) {
            setAuthUser({ nome: json.nome, perfil: json.perfil });
            setCurrentView('guide');
          } else {
            localStorage.removeItem('jrs_auth');
          }
        })
        .catch(() => {})
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
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

  const handleLogin = (nome: string, perfil: string, usuario: string, senhaHash: string) => {
    localStorage.setItem('jrs_auth', JSON.stringify({ usuario, senhaHash }));
    setAuthUser({ nome, perfil });
    setCurrentView('guide');
  };

  const handleLogout = () => {
    localStorage.removeItem('jrs_auth');
    setAuthUser(null);
    setCurrentView('guide');
  };

  const can = (pageId: string) => canAccessPage(pageId, authUser?.perfil);
  // Artigos e páginas de detalhe navegam a partir de "estudo": herdam a permissão dessa página.
  const canAccessEstudo = can('estudo');

  const renderView = () => {
    switch (currentView) {
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
      case 'resumos': return can('resumos') ? <Resumos /> : <DiseaseGuide />;
      case 'artigos': return canAccessEstudo ? <Artigos onNavigate={setCurrentView} /> : <DiseaseGuide />;
      case 'artigo-pericia': return canAccessEstudo ? <ArtigoPericiaMedica onBack={() => setCurrentView('estudo')} /> : <DiseaseGuide />;
      case 'artigo-perfil': return canAccessEstudo ? <ArtigoPerfilPerito onBack={() => setCurrentView('estudo')} /> : <DiseaseGuide />;
      case 'artigo-administrativa': return canAccessEstudo ? <ArtigoPericiaAdministrativa onBack={() => setCurrentView('estudo')} /> : <DiseaseGuide />;
      case 'artigo-psiquiatria': return canAccessEstudo ? <ArtigoPericiaPsiquiatria onBack={() => setCurrentView('estudo')} /> : <DiseaseGuide />;
      case 'casos': return can('casos') ? <CasosPericiais onBack={() => setCurrentView('guide')} /> : <DiseaseGuide />;
      case 'estudo': return canAccessEstudo ? <Estudo onBack={() => setCurrentView('guide')} onNavigate={setCurrentView} /> : <DiseaseGuide />;
      case 'roteiro': return can('roteiro') ? <RoteiroJRS /> : <DiseaseGuide />;

      // USUÁRIOS PAGE - Restricted for non-admin
      case 'usuarios': return authUser?.perfil === 'admin' ? <UsuariosManagement /> : <DiseaseGuide />;

      default: return <DiseaseGuide />;
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
    return <Login onLogin={handleLogin} />;
  }

  if (currentView === 'splash') {
    return (
      <div
        className="fixed inset-0 w-full h-full cursor-pointer bg-[#050F41] flex flex-col items-center justify-center z-[100]"
        onClick={() => setCurrentView('guide')}
      >
        <img
          src="https://i.imgur.com/5JjsbwG.png"
          alt="Junta Regular de Saúde - Hospital Naval de Recife"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <NavContext.Provider
      value={{
        currentView,
        setCurrentView,
        authUser,
        handleLogout,
        periciaMenorVigentes,
      }}
    >
      <div className="fixed inset-0 flex flex-col bg-[#F3F5F7] text-[#1F2937] overflow-hidden antialiased select-none">
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto relative bg-[#F3F5F7]">
          <main className="flex-grow w-full flex flex-col pb-8">
            {renderView()}
          </main>
        </div>
      </div>
    </NavContext.Provider>
  );
};

export default App;
