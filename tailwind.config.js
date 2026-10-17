// Ficheiro: tailwind.config.js
// Tokens do design system JRS/HNRe (cores, tipografia, raios, sombra e
// larguras) versionados aqui — o Tailwind agora é compilado no build (Vite +
// PostCSS), não mais carregado por CDN com configuração inline.
//
// Papéis de cor: navy = estrutura e ação primária · ouro = indicador ativo,
// foco e filete (nunca texto) · verde = sucesso/concluído, só como estado ·
// vinho = erro, vigente com prazo, destrutivo · ink = texto e metadados.
// Só existem as cores do DS: navy, gold (com escala 50–900), green, wine
// (escala 50–900), ink (texto e metadados), blue (azul de apoio), line/paper/
// thead/canvas. Os apelidos do Tailwind (gray, slate, red, amber) foram
// removidos — usar uma dessas classes não compila mais (scripts/verificar-ds.mjs
// falha o build).

const vinho = {
  50: '#FBEFEC', 100: '#F6DCD6', 200: '#EBBBB0', 300: '#D98E7E', 400: '#C0675A',
  500: '#85200C', 600: '#85200C', 700: '#6B1A0A', 800: '#6B1A0A', 900: '#4F1308',
};

const ouro = {
  50: '#FEF8E7', 100: '#FDF0CC', 200: '#FCE3A0', 300: '#FBD070', 400: '#FAB932',
  500: '#D99A1A', 600: '#8A6100', 700: '#8A6100', 800: '#6E4D00', 900: '#4D3500',
};

const verde = {
  DEFAULT: '#079551',
  50: '#E8F6EF', 100: '#D0EEDF', 200: '#A7DDC1', 300: '#6FC49A', 400: '#33A874',
  500: '#079551', 600: '#079551', 700: '#04643B', 800: '#04643B', 900: '#03472A',
};

const azulApoio = {
  50: '#EEF2FA', 100: '#DCE4F4', 200: '#BCCBE8', 300: '#8FA8D5', 400: '#5C7FBC',
  500: '#1c4587', 600: '#1c4587', 700: '#163870', 800: '#122C58', 900: '#0C1D3A',
};

import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './{App,index}.tsx',
    './{components,config,context,hooks,utils,services}/**/*.{ts,tsx}',
  ],
  theme: {
    // A paleta é fechada: só existem as cores do DS.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      navy: { DEFAULT: '#050F41', hover: '#01002B', pressed: '#020020' },
      gold: { ...ouro, DEFAULT: '#FAB932', ink: '#8A6100' },
      'gold-ink': '#8A6100',
      green: verde,
      wine: { DEFAULT: '#85200C', dark: '#6B1A0A', ...vinho },
      ink: { DEFAULT: '#3D4460', 3: '#5A627A', 4: '#8A93AC', 5: '#B9BFD1' },
      line: '#E3E6ED',
      paper: '#F7F8FA',
      thead: '#F2F4F8',
      canvas: '#F2F4F8', // fundo das telas (cards brancos por cima)
      blue: azulApoio,
    },
    fontFamily: {
      // Montserrat é a única família de texto (o Carlito era do e-mail legado).
      sans: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
      heading: ['Montserrat', 'system-ui', 'sans-serif'],
      body: ['Montserrat', 'system-ui', 'sans-serif'],
      slogan: ['Montserrat', 'system-ui', 'sans-serif'],
      // Sem webfont: a Roboto Mono nunca foi carregada e caía sempre no monoespaçado do sistema.
      mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
    },
    // Escala tipográfica com PAPÉIS (auditoria v2, V1) — nomes semânticos em vez de apelidos
    // numéricos que colidiam (lg = xl, 2xl = 3xl = 4xl):
    //   display 32/800 · h1 24/800 · h2 20/700 · h3 16/700 · kpi 24/800 (com tabular-nums) ·
    //   base 16 (texto normativo) · sm 14 (corpo) · xs 12 (legenda/eyebrow).
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1.5' }],
      sm: ['0.875rem', { lineHeight: '1.5' }],
      base: ['1rem', { lineHeight: '1.6' }],
      h3: ['1rem', { lineHeight: '1.4' }],
      h2: ['1.25rem', { lineHeight: '1.3' }],
      h1: ['1.5rem', { lineHeight: '1.25' }],
      kpi: ['1.5rem', { lineHeight: '1.1' }],
      display: ['2rem', { lineHeight: '1.15' }],
      // Números-herói (nota dos Casos Periciais) — fora da escala de texto.
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.5rem', { lineHeight: '1' }],
    },
    // Camadas (auditoria v2, G4): base 0 · sticky 10 · topbar/sidebar 20 · dropdown 30 ·
    // drawer 40 · diálogo 50 · toast 60. Use z-sticky, z-topbar, z-dropdown, z-drawer,
    // z-dialog e z-toast.
    zIndex: {
      0: '0', 10: '10', 20: '20', 30: '30', 40: '40', 50: '50', auto: 'auto',
      base: '0', sticky: '10', topbar: '20', dropdown: '30', drawer: '40', dialog: '50', toast: '60',
    },
    // Dois raios: 8 (controles) e 14 (cards, sheets e diálogos).
    borderRadius: {
      none: '0',
      sm: '4px',
      DEFAULT: '8px',
      md: '8px',
      lg: '8px',
      xl: '14px',
      '2xl': '14px',
      '3xl': '14px',
      full: '9999px',
    },
    // Uma sombra só, e só para sobreposições (menus, diálogos, toasts, FABs).
    boxShadow: {
      '2xs': 'none',
      xs: 'none',
      sm: 'none',
      DEFAULT: 'none',
      md: 'none',
      lg: '0 3px 12px rgba(18, 28, 75, 0.08)',
      xl: '0 3px 12px rgba(18, 28, 75, 0.08)',
      '2xl': '0 3px 12px rgba(18, 28, 75, 0.08)',
      inner: 'none',
      none: 'none',
    },
    extend: {
      // Três larguras de conteúdo: leitura 720 · formulário 640 · dados 1200.
      maxWidth: {
        reading: '720px',
        form: '640px',
        data: '1200px',
      },
      letterSpacing: {
        eyebrow: '0.16em',
        label: '0.06em',
        tag: '0.03em',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'backdrop-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'drawer-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
      },
      // Container queries (auditoria v2, G1): os grids respondem à largura ÚTIL do conteúdo
      // (viewport − sidebar − margens), não à da janela. `@container` no wrapper + @split:… (≥ 960 px).
      // Atenção: container-type cria contenção de layout — não pôr `@container` em ancestral de
      // elementos `fixed` (modais/drawers), que passariam a se posicionar em relação a ele.
      containers: { split: '60rem' },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'sheet-up': 'sheet-up 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        'backdrop-in': 'backdrop-in 0.2s ease-out',
        'drawer-in': 'drawer-in 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [containerQueries],
};
