import React, { useState } from 'react';
import { Header } from './Header';
import Capitulo1 from './resumos-dgpm/pages/Capitulo1';
import Capitulo2 from './resumos-dgpm/pages/Capitulo2';
import Capitulo3 from './resumos-dgpm/pages/Capitulo3';
import Capitulo4 from './resumos-dgpm/pages/Capitulo4';
import Capitulo6 from './resumos-dgpm/pages/Capitulo6';
import Capitulo7 from './resumos-dgpm/pages/Capitulo7';
import Capitulo8 from './resumos-dgpm/pages/Capitulo8';
import Capitulo9 from './resumos-dgpm/pages/Capitulo9';
import Capitulo10 from './resumos-dgpm/pages/Capitulo10';
import Capitulo11 from './resumos-dgpm/pages/Capitulo11';
import Capitulo13 from './resumos-dgpm/pages/Capitulo13';
import Capitulo17 from './resumos-dgpm/pages/Capitulo17';
import Icon from './resumos-dgpm/components/Icon';
import { Menu } from 'lucide-react';

const chapters = [
  { id: 'capitulo-1', title: 'Cap 1: Estrutura do Subsistema Médico-Pericial', component: <Capitulo1 />, icon: 'hub' },
  { id: 'capitulo-2', title: 'Cap 2: Processos das Inspeções de Saúde', component: <Capitulo2 />, icon: 'rule_folder' },
  { id: 'capitulo-3', title: 'Cap 3: Procedimentos de Ingresso no SAM', component: <Capitulo3 />, icon: 'login' },
  { id: 'capitulo-4', title: 'Cap 4: Inspeções Pós-Admissionais', component: <Capitulo4 />, icon: 'event_repeat' },
  { id: 'capitulo-6', title: 'Cap 6: VDF e Término de Incapacidade', component: <Capitulo6 />, icon: 'playlist_add_check' },
  { id: 'capitulo-7', title: 'Cap 7: IS para Justiça e Disciplina', component: <Capitulo7 />, icon: 'gavel' },
  { id: 'capitulo-8', title: 'Cap 8: Exclusão do Serviço Ativo', component: <Capitulo8 />, icon: 'logout' },
  { id: 'capitulo-9', title: 'Cap 9: Concessão de Benefícios', component: <Capitulo9 />, icon: 'redeem' },
  { id: 'capitulo-10', title: 'Cap 10: IS para Servidores Civis', component: <Capitulo10 />, icon: 'badge' },
  { id: 'capitulo-11', title: 'Cap 11: IS para Serviço Militar Temporário', component: <Capitulo11 />, icon: 'military_tech' },
  { id: 'capitulo-13', title: 'Cap 13: Comprovação de Nexo Causal', component: <Capitulo13 />, icon: 'medical_information' },
  { id: 'capitulo-17', title: 'Cap 17: Exame Toxicológico', component: <Capitulo17 />, icon: 'science' },
];

export const Resumos: React.FC = () => {
  const [activePage, setActivePage] = useState('capitulo-1');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const renderPage = () => {
    return chapters.find(c => c.id === activePage)?.component || <Capitulo1 />;
  };

  const NavLinks = () => (
    <>
      {chapters.map((chapter) => (
        <button
          key={chapter.id}
          onClick={() => {
            setActivePage(chapter.id);
            setIsMenuOpen(false);
            window.scrollTo(0,0);
          }}
          className={`flex items-center w-full text-left p-3 my-1 rounded-md text-base transition-colors duration-200 ${
            activePage === chapter.id
              ? 'bg-gold text-navy font-bold'
              : 'text-gray-200 hover:bg-navy/80 hover:text-white'
          }`}
        >
          <Icon name={chapter.icon} className="mr-4 text-2xl" />
          <span className="flex-1 text-sm">{chapter.title}</span>
        </button>
      ))}
    </>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      <Header 
        title="RESUMOS DGPM-406" 
        leftAction={
          <button
            className="p-1 -ml-2 text-white hover:text-gold transition-colors focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>
        }
      />

      <aside
        className={`fixed top-0 left-0 h-full bg-navy w-80 p-4 z-[90] transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl border-r border-gold/30 ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-8 h-16 flex-shrink-0 border-b border-white/10 mt-safe">
            <h1 className="font-heading text-lg font-bold text-white flex items-center">
              <Icon name="local_hospital" className="text-gold text-2xl mr-2"/>
              Capítulos
            </h1>
            <button
               onClick={() => setIsMenuOpen(false)}
               className="p-2 text-white/70 hover:text-white transition-colors"
            >
               <Icon name="close" className="text-2xl" />
            </button>
        </div>
        <nav className="flex-grow overflow-y-auto pb-20 scrollbar-hide">
          <NavLinks />
        </nav>
      </aside>

      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[80] transition-opacity duration-300"
          onClick={() => setIsMenuOpen(false)}
        ></div>
      )}

      <div 
        className={`flex-1 w-full transition-all duration-300 overflow-y-auto ${
          isMenuOpen ? 'blur-sm' : ''
        }`}
      >
        {renderPage()}

        {(() => {
          const currentIndex = chapters.findIndex(c => c.id === activePage);
          const nextChapter = chapters[currentIndex + 1];

          if (!nextChapter) return null;

          const nextChapterTitle = nextChapter.title.replace('Cap ', 'Capítulo ');

          return (
            <div className="w-full max-w-5xl mx-auto flex justify-end px-4 sm:px-8 mt-6 mb-10 pb-8">
              <button 
                onClick={() => { setActivePage(nextChapter.id); window.scrollTo(0,0); }}
                className="flex items-center space-x-2 bg-navy text-white px-5 py-3 rounded-lg hover:bg-navy/90 active:scale-95 transition-all shadow-sm border border-gold/50"
              >
                <span className="text-sm font-semibold">Ir para o {nextChapterTitle.split(':')[0]}</span>
                <span className="material-symbols-outlined text-lg">arrow_forward_ios</span>
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
