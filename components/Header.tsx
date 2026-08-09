import React, { useEffect, useState, useContext } from 'react';
import { NavContext, AuthUser } from '../context/NavContext';
import { NavItem } from '../types';

export interface HeaderProps {
  title?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  onBack?: () => void;
}

const getCategories = (authUser: AuthUser | null, periciaMenorVigentes: number) => {
  const categories = [
    {
      id: 'beneficios',
      label: 'Benefícios',
      icon: 'stethoscope',
      subitems: [
        { id: 'guide' as NavItem, label: 'Doenças de Lei', icon: 'medical_information' },
        { id: 'finalidades' as NavItem, label: 'Finalidades', icon: 'fact_check' },
        { id: 'portaria' as NavItem, label: 'Portaria', icon: 'article' },
      ],
    },
    {
      id: 'avaliacoes',
      label: 'Avaliações',
      icon: 'checklist',
      subitems: [
        { id: 'concursos' as NavItem, label: 'Concursos', icon: 'emoji_events' },
        { id: 'exames' as NavItem, label: 'Exames', icon: 'science' },
      ],
    },
  ];

  if (authUser?.perfil === 'admin' || authUser?.perfil === 'hnre') {
    const docSubitems: { id: NavItem; label: string; icon: string; badge?: number }[] = [
      { id: 'pareceres', label: 'Pareceres', icon: 'assignment' },
      { id: 'pericia-menor', label: 'Perícia Menor', icon: 'personal_injury', badge: periciaMenorVigentes },
    ];
    if (authUser?.perfil === 'admin') {
      docSubitems.push({ id: 'mensagens', label: 'Mensagens', icon: 'chat' });
    }
    categories.push({
      id: 'documentos',
      label: 'Documentos',
      icon: 'description',
      subitems: docSubitems,
    });
  }

  const normasSubitems: { id: NavItem; label: string; icon: string }[] = [
    { id: 'dgpm406', label: 'DGPM-406', icon: 'anchor' },
  ];
  if (authUser?.perfil !== 'user') {
    normasSubitems.push({ id: 'hnre', label: 'HNRe', icon: 'local_hospital' });
  }
  normasSubitems.push(
    { id: 'laws', label: 'Legislação', icon: 'balance' },
    { id: 'templates', label: 'Templates', icon: 'edit_document' }
  );
  categories.push({
    id: 'normas',
    label: 'Normas',
    icon: 'gavel',
    subitems: normasSubitems,
  });

  const extrasSubitems: { id: NavItem; label: string; icon: string }[] = [
    { id: 'casos', label: 'Casos Periciais', icon: 'quiz' },
    { id: 'estudo', label: 'Estudo / Artigos', icon: 'school' },
    { id: 'infograficos', label: 'Infográficos', icon: 'image' },
    { id: 'resumos', label: 'Resumos', icon: 'menu_book' },
  ];
  if (authUser?.perfil !== 'user') {
    extrasSubitems.push({ id: 'roteiro', label: 'Roteiro JRS', icon: 'view_list' });
  }
  categories.push({
    id: 'extras',
    label: 'Extras',
    icon: 'widgets',
    subitems: extrasSubitems,
  });

  return categories;
};

const isCategoryActive = (catId: string, currentView?: NavItem) => {
  if (!currentView) return false;
  switch (catId) {
    case 'beneficios':
      return ['guide', 'finalidades', 'portaria'].includes(currentView);
    case 'avaliacoes':
      return ['concursos', 'exames'].includes(currentView);
    case 'documentos':
      return ['pareceres', 'pericia-menor', 'mensagens'].includes(currentView);
    case 'normas':
      return ['dgpm406', 'dgpm406-anexos', 'hnre', 'regimento-hnre', 'ordem-interna-jrs', 'laws', 'templates'].includes(currentView);
    case 'extras':
      return ['casos', 'estudo', 'artigos', 'artigo-pericia', 'artigo-perfil', 'artigo-administrativa', 'artigo-psiquiatria', 'infograficos', 'resumos', 'roteiro'].includes(currentView);
    default:
      return false;
  }
};

export const Header: React.FC<HeaderProps> = ({ title, leftAction, rightAction, onBack }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [openDesktopCategory, setOpenDesktopCategory] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null);

  const nav = useContext(NavContext);
  const currentView = nav?.currentView;
  const setCurrentView = nav?.setCurrentView || (() => {});
  const authUser = nav?.authUser || null;
  const handleLogout = nav?.handleLogout || (() => {});
  const periciaMenorVigentes = nav?.periciaMenorVigentes || 0;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = getCategories(authUser, periciaMenorVigentes);

  const handleNavigate = (view: NavItem) => {
    setCurrentView(view);
    setOpenDesktopCategory(null);
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      <header 
        className={`w-full sticky top-0 z-40 h-[56px] flex items-center justify-between transition-all duration-300 bg-[#050F41] text-white shadow-sm border-b border-white/10 shrink-0 ${
          isScrolled ? 'shadow-md' : ''
        }`}
      >
        <div className="w-full flex items-center justify-between px-4 md:px-8 h-full relative">
          
          {/* DESKTOP LEFT: LOGO ICON */}
          <div className="hidden md:flex items-center shrink-0 pr-3">
            <div 
              className="w-8 h-8 bg-white rounded-lg p-1 flex items-center justify-center shadow-sm cursor-pointer hover:bg-gray-100 transition-colors" 
              onClick={() => handleNavigate('guide')}
              title="HNRe"
            >
              <img 
                src="https://i.imgur.com/KUbQz08.png" 
                alt="HNRe Logo" 
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          {/* DESKTOP CENTER AREA: SPLIT INTO LEFT HALF (TITLE) AND RIGHT HALF (MENU ITEMS) */}
          <div className="hidden md:flex flex-1 items-center h-full mx-2 lg:mx-4">
            {/* Left Half: Page Title Centered */}
            <div className="w-1/2 flex items-center justify-center text-center px-2 font-heading text-sm lg:text-base font-bold tracking-wide truncate text-white uppercase">
              {title}
            </div>

            {/* Right Half: Navigation Menu Items */}
            <div className="w-1/2 flex items-center justify-end pl-2 h-full">
              <nav className="flex items-center space-x-1 lg:space-x-1.5 h-full">
                {categories.map((cat) => {
                  const isActive = isCategoryActive(cat.id, currentView);
                  const isOpen = openDesktopCategory === cat.id;

                  return (
                    <div key={cat.id} className="relative h-full flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDesktopCategory(isOpen ? null : cat.id);
                          setIsAvatarMenuOpen(false);
                        }}
                        className={`flex items-center px-2.5 lg:px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider font-heading transition-all whitespace-nowrap cursor-pointer ${
                          isActive
                            ? 'bg-white/20 text-white shadow-xs'
                            : 'text-gray-200 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{cat.label}</span>
                      </button>

                      {/* Desktop Subitems Dropdown */}
                      {isOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40 bg-transparent" 
                            onClick={() => setOpenDesktopCategory(null)} 
                          />
                          <div className="absolute right-0 top-full mt-1 w-52 bg-white text-gray-800 rounded-xl shadow-xl border border-gray-100 p-1.5 z-50 animate-fade-in space-y-0.5">
                            {cat.subitems.map((sub) => (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleNavigate(sub.id)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  currentView === sub.id
                                    ? 'bg-[#050F41] text-white shadow-xs font-bold'
                                    : 'text-gray-700 hover:bg-gray-100/80 hover:text-[#050F41]'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <span className="material-symbols-outlined text-[18px]">{sub.icon}</span>
                                  <span>{sub.label}</span>
                                </div>
                                {'badge' in sub && sub.badge && sub.badge > 0 ? (
                                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                    {sub.badge}
                                  </span>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* MOBILE LEFT: HAMBURGER ICON BUTTON & ONBACK */}
          <div className="flex md:hidden items-center justify-start min-w-[48px]">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:bg-white/10 transition-colors"
                aria-label="Voltar"
              >
                <span className="material-symbols-outlined text-[24px]">chevron_left</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:bg-white/10 transition-colors"
                aria-label="Menu Principal"
              >
                <span className="material-symbols-outlined text-[24px]">menu</span>
              </button>
            )}
            {leftAction}
          </div>

          {/* MOBILE CENTER: TITLE */}
          <div className="flex-1 text-center px-2 font-heading text-sm font-bold tracking-wide truncate text-white uppercase md:hidden">
            {title}
          </div>

          {/* RIGHT SIDE: CUSTOM RIGHT ACTION & USER AVATAR WITH DROPDOWN */}
          <div className="flex items-center justify-end space-x-2 min-w-[48px]">
            {rightAction}

            {/* User Avatar Button */}
            <div className="relative flex items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAvatarMenuOpen(!isAvatarMenuOpen);
                  setOpenDesktopCategory(null);
                }}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center justify-center border border-white/30 transition-all shadow-sm focus:outline-none active:scale-95 cursor-pointer uppercase"
                aria-label="Menu do usuário"
                title={authUser?.nome || 'Usuário'}
              >
                {authUser?.nome ? authUser.nome.charAt(0).toUpperCase() : 'U'}
              </button>

              {/* Avatar Dropdown Menu */}
              {isAvatarMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setIsAvatarMenuOpen(false)} 
                  />
                  <div className="absolute right-0 top-11 w-52 bg-white text-gray-800 rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-fade-in divide-y divide-gray-100">
                    <div className="px-4 py-2">
                      <p className="text-xs font-bold text-[#050F41] truncate">{authUser?.nome || 'Usuário'}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{authUser?.perfil || 'perfil'}</p>
                    </div>
                    <div className="py-1">
                      {authUser?.perfil === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            // sem função ao clique por enquanto
                            setIsAvatarMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center space-x-2.5 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px] text-gray-500">group</span>
                          <span>Usuários</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsAvatarMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center space-x-2.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px] text-red-500">logout</span>
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE HAMBURGER LEFT DRAWER */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <aside className="relative w-full max-w-[50vw] bg-white text-gray-800 h-full shadow-2xl flex flex-col z-50 animate-slide-in-left overflow-hidden">
            {/* Header with HNRe Logo at Top */}
            <div className="p-3 bg-[#050F41] text-white flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-8 h-8 bg-white rounded-lg p-0.5 flex items-center justify-center shadow-sm shrink-0">
                  <img src="https://i.imgur.com/KUbQz08.png" alt="HNRe Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="font-heading text-xs font-bold tracking-wide text-white uppercase truncate">HNRe</h1>
                  <p className="text-[10px] text-gray-300 truncate font-body">JRS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                aria-label="Fechar menu"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Accordion First-Level Category List */}
            <div className="flex-1 py-2.5 px-2 space-y-1 overflow-y-auto">
              {categories.map((category) => {
                const isExpanded = expandedMobileCategory === category.id;
                const isActive = isCategoryActive(category.id, currentView);

                return (
                  <div key={category.id} className="rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        // Accordion behavior: expand this category and collapse any other
                        setExpandedMobileCategory(isExpanded ? null : category.id);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-xl text-xs font-bold transition-all uppercase font-heading ${
                        isActive || isExpanded
                          ? 'bg-[#050F41]/10 text-[#050F41]'
                          : 'text-gray-700 hover:bg-gray-100/70'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="material-symbols-outlined text-[18px] text-[#050F41] shrink-0">
                          {category.icon}
                        </span>
                        <span className="truncate">{category.label}</span>
                      </div>
                      <span className={`material-symbols-outlined text-[18px] text-gray-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180 text-[#079551]' : ''}`}>
                        expand_more
                      </span>
                    </button>

                    {/* Accordion Subitems */}
                    {isExpanded && (
                      <div className="pl-2 pr-1 py-1 space-y-0.5 bg-gray-50/80 rounded-xl my-1 border border-gray-100/80">
                        {category.subitems.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleNavigate(sub.id)}
                            className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                              currentView === sub.id
                                ? 'bg-[#050F41] text-white shadow-sm font-bold'
                                : 'text-gray-700 hover:bg-white hover:text-[#050F41]'
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className="material-symbols-outlined text-[16px] shrink-0">{sub.icon}</span>
                              <span className="truncate">{sub.label}</span>
                            </div>
                            {'badge' in sub && sub.badge && sub.badge > 0 ? (
                              <span className="bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center shrink-0">
                                {sub.badge}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile Drawer Footer with User Profile and Logout */}
            <div className="p-2.5 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0 gap-1.5">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#050F41] text-white flex items-center justify-center font-bold text-[11px] shrink-0 uppercase shadow-sm">
                  {authUser?.nome ? authUser.nome.charAt(0) : 'U'}
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-[11px] font-bold text-[#050F41] truncate">{authUser?.nome}</span>
                  <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider truncate">{authUser?.perfil}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  handleLogout();
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                title="Sair do sistema"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
