// Ficheiro: components/publico/ShellPublico.tsx
// Moldura das páginas públicas (sem login): cabeçalho institucional, o mesmo
// container de rolagem do app (<main id="conteudo">, de que dependem o
// "voltar ao topo" e as barras sticky das telas — ver utils/dom.ts) e o
// rodapé de identificação da OM.
//
// MARCA (MIV MB): o público destas páginas é militar — peritos e médicos de
// outras OM —, caso em que o padrão é o DISTINTIVO naval, não o logotipo da
// Marinha. Usa-se aqui o mesmo arquivo oficial e o mesmo tratamento do
// Sidebar (components/shell/Sidebar.tsx), sem recolorir, recortar ou
// redesenhar, com respiro no contêiner e acima da redução mínima digital
// (50 px na horizontal).
import React from 'react';
import { Link } from 'react-router-dom';
import iconeJrs from '../../../assets/icone-jrs.png';

export const ShellPublico: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 flex flex-col bg-canvas text-ink overflow-hidden antialiased">
    <a
      href="#conteudo"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[300] focus:bg-navy focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
    >
      Pular para o conteúdo
    </a>

    <header className="shrink-0 bg-navy text-white">
      <div className="mx-auto w-full max-w-data px-4 md:px-6 py-2 md:py-3 flex items-center gap-3 md:gap-4">
        {/* Área de segurança da marca: o respiro é do contêiner (p-1.5/p-2), não do arquivo. */}
        <span className="shrink-0 w-10 h-10 p-1.5 md:w-14 md:h-14 md:p-2 bg-white rounded-lg flex items-center justify-center">
          <img src={iconeJrs} alt="Hospital Naval de Recife" className="h-full w-full object-contain" />
        </span>
        <div className="min-w-0 flex-1">
          {/* Celular: barra enxuta, só a sigla ao lado da marca. */}
          <p className="md:hidden text-sm font-bold tracking-[0.12em] truncate">JRS/HNRe</p>
          <p className="hidden md:block text-xs font-bold uppercase tracking-[0.16em] text-white/70">Marinha do Brasil</p>
          <p className="hidden md:block text-base font-bold leading-tight truncate">Hospital Naval de Recife</p>
          <p className="hidden md:block text-xs text-white/70 truncate">Junta Regular de Saúde</p>
        </div>
        <Link
          to="/"
          className="shrink-0 inline-flex items-center justify-center gap-2 min-h-[44px] px-3 md:px-4 rounded-lg border border-white/30 text-sm font-bold text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">login</span>
          <span className="hidden sm:inline">Acessar o app</span>
        </Link>
      </div>
    </header>
    {/* Acento institucional: divisor em Amarelo Ouro sob a faixa Azul Marinha. */}
    <div className="shrink-0 h-[3px] bg-gold" aria-hidden="true" />

    <main id="conteudo" tabIndex={-1} className="flex-1 min-h-0 overflow-y-auto focus:outline-none">
      <div className="flex flex-col min-h-full w-full">
        {children}
        <footer className="shrink-0 border-t border-line bg-white px-4 md:px-6 py-6">
          <div className="mx-auto w-full max-w-data flex flex-col gap-2">
            <p className="text-sm font-bold text-navy">Hospital Naval de Recife · Marinha do Brasil</p>
            <p className="text-xs text-ink-3 leading-relaxed">
              Consulta à legislação e às normas técnicas periciais, aberta aos peritos e médicos das demais
              Organizações Militares. Reproduz apenas conteúdo normativo de publicação oficial — não contém
              dados de inspecionados nem informação clínica individual.
            </p>
            <p className="text-xs text-ink-3">
              Em caso de divergência, prevalece o texto publicado no Diário Oficial da União.
            </p>
          </div>
        </footer>
      </div>
    </main>
  </div>
);
