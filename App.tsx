// Ficheiro: App.tsx
import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { DiseaseGuide } from './components/DiseaseGuide';
import { LawReference } from './components/LawReference';
import { DGPM406Guide } from './components/DGPM406Guide';
import { ConcursosGuide } from './components/ConcursosGuide';
import { PortariaGuide } from './components/PortariaGuide';
import { FinalidadesGuide } from './components/FinalidadesGuide';
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
import { HNReGuide } from './components/HNReGuide';
import { RegimentoHNRe } from './components/RegimentoHNRe';
import { OrdemInternaJRS } from './components/OrdemInternaJRS';
import { PericiaMenor } from './components/PericiaMenor';
import { Mensagens } from './components/Mensagens';
import { RoteiroJRS } from './components/RoteiroJRS'; // <-- IMPORTAÇÃO DO ROTEIRO AQUI
import { NavItem } from './types';
import { NavContext } from './context/NavContext';

const GAS_URL = 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec';

interface AuthUser { nome: string; perfil: 'admin' | 'hnre' | 'user'; }

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
    if (authUser?.perfil === 'user') return;
    fetch(`${GAS_URL}?action=getPericiaMenorList`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setPericiaMenorVigentes(json.data.filter((r: { vigente: boolean }) => r.vigente).length);
        }
      })
      .catch(() => {});
  }, [authUser]);

  const handleLogin = (nome: string, perfil: 'admin' | 'user', usuario: string, senhaHash: string) => {
    localStorage.setItem('jrs_auth', JSON.stringify({ usuario, senhaHash }));
    setAuthUser({ nome, perfil });
    setCurrentView('guide');
  };

  const handleLogout = () => {
    localStorage.removeItem('jrs_auth');
    setAuthUser(null);
    setCurrentView('guide');
  };

  const renderView = () => {
    switch (currentView) {
      case 'guide': return <DiseaseGuide />;
      case 'laws': return <LawReference />;
      case 'dgpm406': return <DGPM406Guide />;
      case 'concursos': return <ConcursosGuide />;
      case 'portaria': return <PortariaGuide />;
      case 'finalidades': return <FinalidadesGuide />;
      case 'exames': return <ExamesGuide />;
      case 'infograficos': return <Infograficos />;
      case 'resumos': return <Resumos />;
      case 'pareceres': return <Pareceres />;
      case 'pericia-menor': return <PericiaMenor />;
      case 'mensagens': return <Mensagens />;
      case 'templates': return <TemplatesGuide />;
      case 'artigos': return <Artigos onNavigate={setCurrentView} />;
      case 'artigo-pericia': return <ArtigoPericiaMedica onBack={() => setCurrentView('estudo')} />;
      case 'artigo-perfil': return <ArtigoPerfilPerito onBack={() => setCurrentView('estudo')} />;
      case 'artigo-administrativa': return <ArtigoPericiaAdministrativa onBack={() => setCurrentView('estudo')} />;
      case 'artigo-psiquiatria': return <ArtigoPericiaPsiquiatria onBack={() => setCurrentView('estudo')} />;
      case 'casos': return <CasosPericiais onBack={() => setCurrentView('guide')} />; 
      case 'estudo': return <Estudo onBack={() => setCurrentView('guide')} onNavigate={setCurrentView} />; 
      case 'hnre': return <HNReGuide onNavigate={setCurrentView} />; 
      case 'regimento-hnre': return <RegimentoHNRe onBack={() => setCurrentView('hnre')} />;
      case 'ordem-interna-jrs': return <OrdemInternaJRS onBack={() => setCurrentView('hnre')} />;
      
      // Documentação: Chamada do renderizador da nova página Roteiro JRS
      case 'roteiro': return <RoteiroJRS />; 
      
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
