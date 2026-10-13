// Ficheiro: components/InstallAppTutorial.tsx
// Mini-tutorial passo a passo (com telas ilustradas) de como adicionar o
// ícone do app à tela inicial do celular, pelo menu do navegador. As telas
// são desenhadas em HTML/CSS (não são prints reais), com o ponto de toque
// destacado em cada etapa.
import React, { useState } from 'react';
import { PlataformaTutorial } from '../utils/pwa';

const APP_ICON = 'https://i.imgur.com/KUbQz08.png';

const PLATAFORMAS: { id: PlataformaTutorial; label: string }[] = [
  { id: 'iphone-safari', label: 'iPhone · Safari' },
  { id: 'ios-topo', label: 'iPad / Chrome iOS' },
  { id: 'android', label: 'Android' },
];

// ── Peças das telas ────────────────────────────────────────────────────────

const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined leading-none ${className}`}>{name}</span>
);

/** Anel pulsante que marca onde tocar. */
const Alvo: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`relative inline-flex items-center justify-center ${className}`}>
    <span className="absolute inset-[-6px] rounded-xl bg-[#FAB932]/50 animate-ping" />
    <span className="absolute inset-[-4px] rounded-xl border-2 border-[#FAB932] bg-[#FAB932]/20" />
    <span className="relative">{children}</span>
  </span>
);

const Moldura: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative mx-auto w-[210px] h-[330px] rounded-[26px] border-[5px] border-gray-800 bg-white overflow-hidden shadow-xl">
    {children}
  </div>
);

/** Conteúdo falso do site, para dar contexto de "página aberta". */
const PaginaFalsa: React.FC = () => (
  <div className="absolute inset-0 bg-[#F3F5F7]">
    <div className="h-14 bg-[#050F41] flex items-end px-3 pb-2">
      <img src={APP_ICON} alt="" className="w-6 h-6 rounded" />
      <span className="ml-2 text-[10px] font-bold text-white">JRS/HNRe</span>
    </div>
    <div className="p-3 space-y-2">
      {[80, 100, 65, 90, 55].map((w, i) => (
        <div key={i} className="h-3 rounded bg-gray-300/70" style={{ width: `${w}%` }} />
      ))}
    </div>
  </div>
);

const BarraEndereco: React.FC<{ children?: React.ReactNode; direita?: React.ReactNode }> = ({ direita }) => (
  <div className="absolute top-0 inset-x-0 h-10 bg-gray-100 border-b border-gray-300 flex items-center gap-1.5 px-2 z-10">
    <div className="flex-1 h-5 rounded-full bg-white border border-gray-300 text-[8px] text-gray-500 flex items-center px-2">
      mauriston.github.io
    </div>
    {direita}
  </div>
);

const BarraInferiorSafari: React.FC<{ destacarCompartilhar?: boolean }> = ({ destacarCompartilhar }) => (
  <div className="absolute bottom-0 inset-x-0 h-12 bg-gray-100 border-t border-gray-300 flex items-center justify-around px-1 z-10">
    <Icon name="chevron_left" className="text-[20px] text-gray-400" />
    <Icon name="chevron_right" className="text-[20px] text-gray-400" />
    {destacarCompartilhar ? (
      <Alvo><Icon name="ios_share" className="text-[20px] text-blue-600" /></Alvo>
    ) : (
      <Icon name="ios_share" className="text-[20px] text-blue-600" />
    )}
    <Icon name="menu_book" className="text-[20px] text-blue-600" />
    <Icon name="filter_none" className="text-[18px] text-blue-600" />
  </div>
);

const Dica: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`absolute z-20 px-2 py-1 rounded-lg bg-[#050F41] text-white text-[9px] font-bold shadow-lg ${className}`}>
    {children}
  </div>
);

// ── Cenas ──────────────────────────────────────────────────────────────────

const CenaIosCompartilhar: React.FC<{ topo: boolean }> = ({ topo }) => (
  <Moldura>
    <PaginaFalsa />
    {topo ? (
      <>
        <BarraEndereco direita={<Alvo><Icon name="ios_share" className="text-[18px] text-blue-600" /></Alvo>} />
        <Dica className="top-12 right-2">Toque em Compartilhar</Dica>
      </>
    ) : (
      <>
        <BarraInferiorSafari destacarCompartilhar />
        <Dica className="bottom-16 left-1/2 -translate-x-1/2">Toque em Compartilhar</Dica>
      </>
    )}
  </Moldura>
);

const CenaIosLista: React.FC = () => (
  <Moldura>
    <PaginaFalsa />
    <div className="absolute inset-0 bg-black/40 z-10" />
    <div className="absolute bottom-0 inset-x-0 h-[78%] rounded-t-2xl bg-gray-100 z-20 p-2.5 overflow-hidden">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-300">
        <img src={APP_ICON} alt="" className="w-7 h-7 rounded-lg" />
        <div className="leading-tight">
          <div className="text-[9px] font-bold text-gray-800">JRS/HNRe</div>
          <div className="text-[8px] text-gray-500">mauriston.github.io</div>
        </div>
      </div>
      <div className="mt-2 rounded-xl bg-white divide-y divide-gray-200 text-[9px] text-gray-800">
        <div className="flex items-center justify-between px-2.5 py-2">Copiar <Icon name="content_copy" className="text-[14px]" /></div>
        <div className="flex items-center justify-between px-2.5 py-2">Adicionar aos Favoritos <Icon name="star" className="text-[14px]" /></div>
        <div className="flex items-center justify-between px-2.5 py-2 relative">
          <Alvo className="w-full justify-between px-1.5 -mx-1.5 py-0.5">
            <span className="flex w-full items-center justify-between font-bold text-[#050F41]">
              Adicionar à Tela de Início <Icon name="add_box" className="text-[16px]" />
            </span>
          </Alvo>
        </div>
        <div className="flex items-center justify-between px-2.5 py-2">Buscar na Página <Icon name="search" className="text-[14px]" /></div>
      </div>
    </div>
    <Dica className="top-3 left-1/2 -translate-x-1/2 w-[170px] text-center">Role a lista para cima, se preciso</Dica>
  </Moldura>
);

const CenaIosConfirmar: React.FC = () => (
  <Moldura>
    <PaginaFalsa />
    <div className="absolute inset-0 bg-black/40 z-10" />
    <div className="absolute bottom-0 inset-x-0 h-[88%] rounded-t-2xl bg-gray-100 z-20 p-2.5">
      <div className="flex items-center justify-between text-[9px]">
        <span className="text-blue-600">Cancelar</span>
        <span className="font-bold text-gray-800">Adicionar à Tela…</span>
        <Alvo><span className="text-blue-600 font-bold px-1">Adicionar</span></Alvo>
      </div>
      <div className="mt-3 rounded-xl bg-white p-2.5 flex items-center gap-2">
        <img src={APP_ICON} alt="" className="w-10 h-10 rounded-xl" />
        <div className="flex-1 text-[10px] font-bold text-gray-800 border-b border-gray-200 pb-1">JRS/HNRe</div>
      </div>
      <p className="mt-2 px-1 text-[8px] text-gray-500 leading-snug">
        Um ícone será adicionado à sua tela de início para que você possa acessar rapidamente este site.
      </p>
    </div>
    <Dica className="top-3 right-2">Toque em “Adicionar”</Dica>
  </Moldura>
);

const CenaAndroidMenu: React.FC = () => (
  <Moldura>
    <PaginaFalsa />
    <BarraEndereco direita={<Alvo><Icon name="more_vert" className="text-[18px] text-gray-700" /></Alvo>} />
    <Dica className="top-12 right-2">Toque nos 3 pontinhos</Dica>
  </Moldura>
);

const CenaAndroidOpcao: React.FC = () => (
  <Moldura>
    <PaginaFalsa />
    <BarraEndereco direita={<Icon name="more_vert" className="text-[18px] text-gray-700" />} />
    <div className="absolute top-9 right-2 w-[150px] rounded-lg bg-white shadow-2xl border border-gray-200 z-20 text-[9px] text-gray-800 divide-y divide-gray-100">
      <div className="px-2.5 py-2">Nova guia</div>
      <div className="px-2.5 py-2">Favoritos</div>
      <div className="px-2.5 py-2">
        <Alvo className="w-full">
          <span className="w-full text-left font-bold text-[#050F41]">Adicionar à tela inicial</span>
        </Alvo>
      </div>
      <div className="px-2.5 py-2 text-gray-500">Instalar app (se aparecer)</div>
      <div className="px-2.5 py-2">Compartilhar…</div>
    </div>
  </Moldura>
);

const CenaAndroidConfirmar: React.FC = () => (
  <Moldura>
    <PaginaFalsa />
    <div className="absolute inset-0 bg-black/45 z-10" />
    <div className="absolute z-20 left-3 right-3 top-1/2 -translate-y-1/2 rounded-2xl bg-white p-3 shadow-2xl">
      <div className="text-[10px] font-bold text-gray-800 mb-2">Adicionar à tela inicial</div>
      <div className="flex items-center gap-2 mb-3">
        <img src={APP_ICON} alt="" className="w-9 h-9 rounded-xl" />
        <div className="flex-1 text-[10px] text-gray-800 border-b border-gray-300 pb-0.5">JRS/HNRe</div>
      </div>
      <div className="flex justify-end gap-3 text-[10px] font-bold">
        <span className="text-gray-500">Cancelar</span>
        <Alvo><span className="text-[#079551] px-1">Adicionar</span></Alvo>
      </div>
    </div>
    <Dica className="bottom-4 left-1/2 -translate-x-1/2 w-[170px] text-center">Confirme em “Adicionar” (e, se pedir, “Adicionar automaticamente”)</Dica>
  </Moldura>
);

const CenaTelaInicial: React.FC = () => (
  <Moldura>
    <div className="absolute inset-0 bg-gradient-to-b from-[#1a2a6c] to-[#050F41]" />
    <div className="relative z-10 grid grid-cols-4 gap-x-2 gap-y-4 p-4 pt-8">
      {['#ef4444', '#3b82f6', '#a855f7', '#f59e0b', '#14b8a6', '#ec4899'].map(c => (
        <div key={c} className="flex flex-col items-center gap-1">
          <div className="w-9 h-9 rounded-xl" style={{ background: c, opacity: 0.55 }} />
          <div className="h-1.5 w-7 rounded bg-white/30" />
        </div>
      ))}
      <div className="flex flex-col items-center gap-1">
        <Alvo><img src={APP_ICON} alt="" className="w-9 h-9 rounded-xl" /></Alvo>
        <div className="text-[8px] font-bold text-white">JRS/HNRe</div>
      </div>
    </div>
    <Dica className="bottom-6 left-1/2 -translate-x-1/2 w-[170px] text-center">Pronto! O ícone está na sua tela inicial</Dica>
  </Moldura>
);

// ── Passos por plataforma ──────────────────────────────────────────────────

interface Passo { titulo: string; texto: string; cena: React.ReactNode }

const passosDe = (p: PlataformaTutorial): Passo[] => {
  if (p === 'android') {
    return [
      { titulo: 'Abra o menu do navegador', texto: 'No Chrome, toque nos três pontinhos (⋮) no canto superior direito.', cena: <CenaAndroidMenu /> },
      { titulo: 'Escolha “Adicionar à tela inicial”', texto: 'Se aparecer “Instalar app”, pode usar essa opção — o resultado é o mesmo.', cena: <CenaAndroidOpcao /> },
      { titulo: 'Confirme', texto: 'Toque em “Adicionar” (ou “Instalar”) e, se o celular pedir, confirme novamente.', cena: <CenaAndroidConfirmar /> },
      { titulo: 'Pronto!', texto: 'O ícone do JRS/HNRe já está na sua tela inicial. Abra o app por ele daqui em diante.', cena: <CenaTelaInicial /> },
    ];
  }
  const topo = p === 'ios-topo';
  return [
    {
      titulo: 'Toque em Compartilhar',
      texto: topo
        ? 'Toque no ícone de Compartilhar (quadrado com seta ↑), no canto superior direito da barra de endereço.'
        : 'Toque no ícone de Compartilhar (quadrado com seta ↑), na barra inferior do Safari.',
      cena: <CenaIosCompartilhar topo={topo} />,
    },
    { titulo: 'Adicionar à Tela de Início', texto: 'Role a lista de opções para cima e toque em “Adicionar à Tela de Início”.', cena: <CenaIosLista /> },
    { titulo: 'Confirme', texto: 'Toque em “Adicionar”, no canto superior direito.', cena: <CenaIosConfirmar /> },
    { titulo: 'Pronto!', texto: 'O ícone do JRS/HNRe já está na sua tela inicial. Abra o app por ele daqui em diante.', cena: <CenaTelaInicial /> },
  ];
};

// ── Componente ─────────────────────────────────────────────────────────────

interface Props {
  plataformaInicial: PlataformaTutorial;
  /** Fechou sem terminar ("Pular"/"Depois"): o aviso volta a aparecer depois. */
  onClose: () => void;
  /** Terminou o último passo ("Concluir"): o aviso não aparece mais. */
  onComplete: () => void;
}

export const InstallAppTutorial: React.FC<Props> = ({ plataformaInicial, onClose, onComplete }) => {
  const [plataforma, setPlataforma] = useState<PlataformaTutorial>(plataformaInicial);
  const [indice, setIndice] = useState(0);
  const passos = passosDe(plataforma);
  const passo = passos[indice];
  const ultimo = indice === passos.length - 1;

  return (
    <div className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div role="dialog" aria-modal="true" aria-label="Como adicionar o ícone à tela inicial"
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm max-h-full overflow-y-auto">
        <div className="p-4 flex flex-col items-center text-center">
          <h3 className="font-heading font-bold text-sm text-[#050F41] mb-2">Ícone na tela inicial</h3>

          <div className="flex items-center gap-1 mb-3 p-0.5 rounded-full bg-gray-100">
            {PLATAFORMAS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setPlataforma(p.id); setIndice(0); }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                  plataforma === p.id ? 'bg-[#050F41] text-white' : 'text-gray-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div key={`${plataforma}-${indice}`} className="animate-fade-in mb-3">{passo.cena}</div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-[#079551] mb-0.5">
            Passo {indice + 1} de {passos.length}
          </p>
          <h4 className="font-heading font-bold text-sm text-[#050F41] mb-1">{passo.titulo}</h4>
          <p className="text-xs text-gray-500 mb-3 min-h-[48px]">{passo.texto}</p>

          <div className="flex items-center gap-1.5 mb-3">
            {passos.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === indice ? 'w-5 bg-[#079551]' : 'w-1.5 bg-gray-300'}`} />
            ))}
          </div>

          <div className="flex items-center gap-2 w-full">
            {indice === 0 ? (
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                Depois
              </button>
            ) : (
              <button type="button" onClick={() => setIndice(indice - 1)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                Voltar
              </button>
            )}
            <button type="button" onClick={() => (ultimo ? onComplete() : setIndice(indice + 1))}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#079551] hover:bg-[#067a43] text-white text-xs md:text-sm font-bold transition-colors">
              {ultimo ? 'Concluir' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
