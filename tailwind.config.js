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
// thead/canvas, surface/surface-2 e placa (branco fixo). Valores em styles/tokens.css. Os apelidos do Tailwind (gray, slate, red, amber) foram
// removidos — usar uma dessas classes não compila mais (scripts/verificar-ds.mjs
// falha o build).

// Cores TEMATIZÁVEIS (auditoria v3, 4f): cada cor aponta para uma variável RGB de
// styles/tokens.css (--c-<nome>), com suporte a alpha (bg-navy/10). Os hex do tema
// claro e das três variantes do escuro (Marinho · Grafite · OLED) vivem lá.
// No escuro: white → surface, navy → action (primário invertido), paper/thead → surface-2.
const v = (nome) => `rgb(var(--c-${nome}) / <alpha-value>)`;
const escala = (nome) => Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(n => [n, v(`${nome}-${n}`)]));

const vinho = escala('wine');
const ouro = escala('gold');
const verde = { DEFAULT: v('green'), ...escala('green') };
const azulApoio = { DEFAULT: v('blue-600'), ...escala('blue') }; // text-blue = link (azul de apoio)

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
      // white = superfície (cards, campos, topbar) e texto sobre cor cheia; no escuro vira --surface.
      white: v('white'),
      black: v('black'),
      // Branco que NÃO muda com o tema: placa de imagens/PDF/brasão e texto sobre mídia/preto.
      placa: '#ffffff',
      navy: { DEFAULT: v('navy'), hover: v('navy-hover'), pressed: v('navy-pressed') },
      gold: { ...ouro, DEFAULT: v('gold'), ink: v('gold-ink') },
      'gold-ink': v('gold-ink'),
      green: verde,
      wine: { DEFAULT: v('wine'), dark: v('wine-dark'), ...vinho },
      ink: { DEFAULT: v('ink'), 3: v('ink-3'), 4: v('ink-4'), 5: v('ink-5') },
      line: v('line'),
      paper: v('paper'),
      thead: v('thead'),
      canvas: v('canvas'), // fundo das telas (cards brancos por cima)
      // Papéis semânticos explícitos (preferir em código novo de superfície).
      surface: { DEFAULT: v('surface'), 2: v('surface-2') },
      blue: azulApoio,
    },
    fontFamily: {
      // Montserrat é a única família de texto (o Carlito era do e-mail legado).
      sans: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
      heading: ['Montserrat', 'system-ui', 'sans-serif'],
      body: ['Montserrat', 'system-ui', 'sans-serif'],
      slogan: ['Montserrat', 'system-ui', 'sans-serif'],
      // Sem font-mono (auditoria v3, G5): números alinhados = Montserrat + tabular-nums.
    },
    // Escala tipográfica com PAPÉIS (auditoria v2, V1) — nomes semânticos em vez de apelidos
    // numéricos que colidiam (lg = xl, 2xl = 3xl = 4xl):
    //   display 32/800 · h1 24/800 · h2 20/700 · h3 16/700 · kpi 24/800 (com tabular-nums) ·
    //   base 16 (texto normativo) · sm 14 (corpo) · xs 12 (legenda/eyebrow).
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1.5' }],
      sm: ['0.875rem', { lineHeight: '1.5' }],
      base: ['1rem', { lineHeight: '1.6' }],
      // Os papéis de título já trazem o peso (h3/h2 700 · h1/kpi/display 800); font-* explícito sobrepõe.
      h3: ['1rem', { lineHeight: '1.4', fontWeight: '700' }],
      h2: ['1.25rem', { lineHeight: '1.3', fontWeight: '700' }],
      h1: ['1.5rem', { lineHeight: '1.25', fontWeight: '800' }],
      kpi: ['1.5rem', { lineHeight: '1.1', fontWeight: '800' }],
      display: ['2rem', { lineHeight: '1.15', fontWeight: '800' }],
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
    // Uma sombra só, e só para sobreposições (menus, diálogos, toasts, FABs). No escuro a
    // variável vira uma borda line (sem sombra; a elevação vem da superfície).
    boxShadow: {
      '2xs': 'none',
      xs: 'none',
      sm: 'none',
      DEFAULT: 'none',
      md: 'none',
      lg: 'var(--shadow-overlay)',
      xl: 'var(--shadow-overlay)',
      '2xl': 'var(--shadow-overlay)',
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
        // Top sheet (desce do topo — ex.: dados cadastrais na Ficha do inspecionado).
        'sheet-down': { from: { transform: 'translateY(-100%)' }, to: { transform: 'translateY(0)' } },
        'backdrop-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'drawer-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        // Menu suspenso (padrão M3): cresce a partir do campo que o abriu.
        'menu-in': { from: { opacity: '0', transform: 'scaleY(0.9)' }, to: { opacity: '1', transform: 'scaleY(1)' } },
        // Troca de nível do menu em cascata (grupo ↔ finalidades).
        'menu-nivel': { from: { opacity: '0', transform: 'translateX(8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
      // Container queries (auditoria v2, G1): os grids respondem à largura ÚTIL do conteúdo
      // (viewport − sidebar − margens), não à da janela. `@container` no wrapper + @split:… (≥ 960 px).
      // Atenção: container-type cria contenção de layout — não pôr `@container` em ancestral de
      // elementos `fixed` (modais/drawers), que passariam a se posicionar em relação a ele.
      containers: { split: '60rem' },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'sheet-up': 'sheet-up 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        'sheet-down': 'sheet-down 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        'backdrop-in': 'backdrop-in 0.2s ease-out',
        'drawer-in': 'drawer-in 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        'menu-in': 'menu-in 0.16s cubic-bezier(0.2, 0, 0, 1)',
        'menu-nivel': 'menu-nivel 0.14s ease-out',
      },
    },
  },
  plugins: [containerQueries],
};
