# Design System

## 1. Visão geral

### Personalidade visual

A interface possui personalidade **institucional, clínica, técnica e funcional**, alinhada ao contexto médico-pericial e militar do Hospital Naval de Recife e da Junta Regular de Saúde. O sistema prioriza consulta rápida, legibilidade e organização de conteúdo normativo, com uso frequente de cartões, listas, formulários e documentos estruturados.

### Sensação transmitida

- Seriedade e confiabilidade institucional.
- Clareza operacional.
- Organização documental.
- Familiaridade com aplicativos móveis utilitários.
- Baixo grau de ornamentação visual.
- Ênfase em conteúdo e ações práticas.

### Nível de densidade da interface

A densidade é **média**, com variação conforme a tela:

- Telas de consulta: densidade média, com cartões empilhados e blocos textuais.
- Formulários: densidade média-alta, com múltiplos campos agrupados verticalmente.
- Tabelas e históricos: densidade alta, especialmente em telas estreitas.
- Tela de login: densidade baixa, com foco em uma única tarefa.

### Público aparente

Profissionais de saúde, médicos peritos, militares e pessoal administrativo que necessitam consultar normas, produzir documentos, avaliar casos e acessar referências médico-periciais.

### Principais características do estilo

- Layout mobile-first.
- Navegação principal fixa na parte inferior.
- Conteúdo centralizado com largura máxima de `56rem` (`896px`).
- Superfícies predominantemente brancas sobre fundo cinza-claro.
- Azul-marinho institucional como cor dominante.
- Verde como cor de ação positiva e confirmação.
- Dourado como acento editorial e institucional.
- Títulos em Montserrat, geralmente em caixa alta.
- Texto corrido em Carlito.
- Cards com raio amplo, borda discreta e sombra leve.
- Material Symbols e Lucide React usados em conjunto.
- Uso frequente de ícones antes de títulos, campos e ações.
- Feedback visual direto por cores, spinners, badges e mudanças de estado.

### Referências estéticas perceptíveis

- Aplicativos móveis administrativos e clínicos.
- Interfaces baseadas em Material Design, principalmente na navegação inferior, ícones e estados selecionados.
- Design institucional de órgãos públicos e militares.
- Padrões utilitários do Tailwind CSS.
- Cards e menus flutuantes próximos da linguagem visual de aplicativos móveis modernos.

---

## 2. Princípios de design

### Clareza

A interface utiliza títulos objetivos, agrupamentos por cartões e ícones contextuais. O conteúdo é apresentado em blocos visualmente distintos, reduzindo a ambiguidade entre seções.

### Consistência

Os padrões mais consistentes são:

- fundo geral `#F3F5F7`;
- cards brancos;
- títulos em `#050F41`;
- raio predominante de `16px`;
- padding de `16px` ou `20px`;
- bordas em cinza claro;
- navegação inferior com ícone e label;
- ações primárias em azul-marinho ou verde.

Há pequenas inconsistências entre componentes antigos e recentes, sobretudo no uso de bibliotecas de ícones, cores semânticas e tamanhos tipográficos.

### Hierarquia

A hierarquia é construída por:

1. cabeçalhos azul-marinho ou títulos grandes em azul-marinho;
2. títulos de seção em Montserrat, negrito e caixa alta;
3. subtítulos e labels em cinza médio;
4. corpo em Carlito, geralmente entre `12px` e `14px`;
5. metadados em `10px` ou `11px`.

### Simplicidade

O sistema evita fundos decorativos nas telas internas. A maioria dos componentes utiliza apenas uma superfície, borda leve e poucos acentos cromáticos.

### Contraste

O contraste principal utiliza:

- azul-marinho sobre branco;
- branco sobre azul-marinho;
- branco sobre verde;
- cinza-escuro sobre branco;
- dourado sobre branco como acento, não como texto principal.

Alguns textos em cinza claro e transparências sobre fundo escuro podem exigir revisão de contraste.

### Acessibilidade

O projeto apresenta estados de foco em vários formulários, áreas de toque geralmente adequadas e ícones acompanhados de texto na navegação. Entretanto, existem elementos com `focus:outline-none` sem substituição explícita de anel de foco e textos abaixo de `12px`.

### Uso de espaço

O espaçamento segue majoritariamente múltiplos de `4px`, com preferência por:

- `12px` entre elementos relacionados;
- `16px` como padding estrutural;
- `20px` em cards de conteúdo;
- `24px` ou mais entre grandes seções.

### Feedback visual

O feedback ocorre por:

- mudança de cor em hover, active e selected;
- spinners circulares;
- textos de erro em vermelho;
- confirmações em verde;
- badges de contagem;
- modais e overlays;
- alteração de ícones, como `content_copy` para `done_all`;
- escala em botões flutuantes ao pressionar.

---

## 3. Cores

> Os valores abaixo foram extraídos do código. Tokens derivados de classes padrão do Tailwind são identificados como estimativas quando o valor não foi declarado diretamente no projeto.

| Token sugerido | Cor | Uso |
| -------------- | --- | --- |
| `color-primary` | `#050F41` | Azul-marinho institucional; cabeçalhos, botões primários, títulos, estados selecionados e fundos de destaque. |
| `color-primary-light` | `#1A2A6C` | Variante clara declarada no tema; uso pouco frequente. |
| `color-primary-soft` | `rgba(5, 15, 65, 0.05)` | Fundo de itens selecionados e cabeçalhos de tabela. |
| `color-primary-shadow` | `rgba(5, 15, 65, 0.08)` | Sombra de menus flutuantes. |
| `color-secondary` | `#079551` | Verde institucional; ações positivas, login, confirmação, filtros concluídos e indicadores. |
| `color-secondary-hover` | `#067A43` | Hover de botões verdes. |
| `color-secondary-active` | `#056635` | Estado pressionado de botões verdes. |
| `color-accent` | `#FAB932` | Dourado institucional; ícones e destaques editoriais. |
| `color-accent-dark` | `#D49B20` | Variante escura do dourado, declarada no tema. |
| `color-accent-alt` | `#B8860B` | Dourado escuro usado em algumas áreas específicas. |
| `color-background` | `#F3F5F7` | Fundo principal das telas. |
| `color-background-subtle` | `#F9FAFB` — estimativa Tailwind `gray-50` | Fundos secundários, hover e áreas internas. |
| `color-surface` | `#FFFFFF` | Cards, menus, modais, navegação inferior e campos claros. |
| `color-surface-overlay` | `rgba(255, 255, 255, 0.95)` | Menus flutuantes com blur. |
| `color-text-primary` | `#1F2937` | Texto principal global. |
| `color-text-heading` | `#050F41` | Títulos, labels importantes e texto institucional. |
| `color-text-secondary` | `#6B7280` — estimativa Tailwind `gray-500` | Descrições, metadados e labels secundários. |
| `color-text-muted` | `#9CA3AF` — estimativa Tailwind `gray-400` | Ícones e textos auxiliares. |
| `color-text-disabled` | `rgba(255, 255, 255, 0.40)` ou opacidade `40%` | Campos e botões desabilitados em fundos escuros e claros. |
| `color-border` | `#E5E7EB` — estimativa Tailwind `gray-200` | Bordas padrão de cards, inputs e tabelas. |
| `color-border-subtle` | `#F3F4F6` — estimativa Tailwind `gray-100` | Separadores internos e divisores. |
| `color-success` | `#079551` | Sucesso e conclusão. |
| `color-success-soft` | `#DCFCE7` — estimativa Tailwind `green-100` | Badges e estados positivos suaves. |
| `color-warning` | `#FBBF24` — estimativa Tailwind `amber-400` | Filtros e estados de restrição. |
| `color-warning-soft` | `#FEF3C7` — estimativa Tailwind `amber-100` | Badges de aviso. |
| `color-error` | `#EF4444` — estimativa Tailwind `red-500` | Erros, contagens críticas e filtros vigentes. |
| `color-error-dark` | `#991B1B` — estimativa Tailwind `red-800` | Botões e estados clínicos graves. |
| `color-error-deep` | `#7F1D1D` — estimativa Tailwind `red-900` | Estado grave e barra fixa de resultado. |
| `color-error-soft` | `#FEE2E2` — estimativa Tailwind `red-100` | Fundos de erro e badges. |
| `color-info` | `#2563EB` — estimativa Tailwind `blue-600` | Hover de links e itens informativos. |
| `color-info-soft` | `#DBEAFE` — estimativa Tailwind `blue-100` | Estado selecionado da navegação e botões auxiliares. |
| `color-highlight` | `#FFFF99` | Realce textual em conteúdos específicos. |
| `color-overlay` | `rgba(0, 0, 0, 0.50)` | Fundo de modais convencionais. |
| `color-overlay-strong` | `rgba(0, 0, 0, 0.95)` | Visualizadores de mídia em tela cheia. |

### Uso cromático

- Azul-marinho deve permanecer como identidade principal.
- Verde deve ser reservado para confirmação, sucesso e ação positiva.
- Dourado deve funcionar como acento, especialmente em ícones de títulos.
- Vermelho indica erro, gravidade, vigência crítica ou ação destrutiva.
- Cinzas estruturam hierarquia sem competir com o conteúdo.

---

## 4. Tipografia

### Famílias tipográficas

- **Títulos:** Montserrat.
- **Corpo:** Carlito.
- **Fallback:** `sans-serif`.
- **Ícones tipográficos:** Material Symbols Outlined.

### Escala observada

| Estilo | Fonte | Tamanho | Peso | Altura de linha | Uso |
| ------ | ----- | ------- | ---- | --------------- | --- |
| `display` | Montserrat | `32–36px` — estimativa | `700` | `1.1–1.2` | Resultados numéricos, destaques e telas especiais. |
| `heading-1` | Montserrat | `20px` | `700` | `1.0–1.25` | Títulos principais de página e módulos. |
| `heading-2` | Montserrat | `18px` | `700` | `1.25` | Títulos de modal e seções principais. |
| `heading-3` | Montserrat | `16px` | `700` | `1.25–1.4` | Títulos de cards e seções internas. |
| `heading-4` | Montserrat | `14px` | `700` | `1.25–1.4` | Itens de acordeão e títulos compactos. |
| `body-lg` | Carlito | `16px` | `400–700` | `1.5` | Textos importantes e confirmações. |
| `body-md` | Carlito | `14px` | `400–600` | `1.4–1.6` | Corpo padrão, formulários e listas. |
| `body-sm` | Carlito | `12px` | `400–600` | `1.4–1.6` | Descrições, tabelas e labels. |
| `caption` | Carlito ou Montserrat | `11px` | `500–700` | `1.2–1.4` | Navegação inferior, metadados e descrições compactas. |
| `micro` | Carlito ou Montserrat | `10px` | `700` | `1.0–1.2` | Badges, contagens e chips. |
| `button` | Carlito ou Montserrat | `12–14px` | `700` | `1.2` | Botões primários e secundários. |
| `label` | Montserrat | `10–12px` | `700` | `1.2` | Labels de formulário, frequentemente em caixa alta e com tracking. |

### Pesos observados

- `400`: texto corrido e descrições.
- `500`: labels secundários e navegação.
- `600`: ênfase moderada.
- `700`: títulos, botões, chips e dados importantes.
- `800`: uso pontual em títulos de maior ênfase.

### Altura de linha

- Títulos compactos: `1.0–1.25`.
- Corpo padrão: `1.4–1.6`.
- Conteúdo longo: `leading-relaxed`, equivalente aproximado a `1.625`.
- Itens compactos: `leading-tight` ou `leading-snug`.

### Espaçamento entre letras

- Títulos: padrão ou levemente compacto.
- Labels: `tracking-widest` ou `tracking-wider` em alguns formulários e metadados.
- Navegação: espaçamento padrão.

### Caixa alta e baixa

- Todos os elementos `h1` a `h6` recebem `text-transform: uppercase` globalmente.
- Títulos de cards e seções também aplicam `uppercase` explicitamente.
- Corpo, botões e itens de menu usam capitalização natural.
- Alguns metadados e labels usam caixa alta para reforçar caráter institucional.

---

## 5. Espaçamento e grid

### Unidade base

A unidade base observada é **4px**, correspondente à escala padrão do Tailwind CSS.

### Escala sugerida de tokens

| Token | Valor | Uso predominante |
| ----- | ----: | ---------------- |
| `space-0` | `0px` | Ausência de espaço. |
| `space-0_5` | `2px` | Microajustes e gaps muito compactos. |
| `space-1` | `4px` | Separação mínima, padding de ícones e itens. |
| `space-1_5` | `6px` | Padding de menus e chips compactos. |
| `space-2` | `8px` | Ícones, botões pequenos e gaps internos. |
| `space-2_5` | `10px` | Linhas de tabela e itens compactos. |
| `space-3` | `12px` | Campos, listas e espaçamento recorrente. |
| `space-3_5` | `14px` | Botões primários e campos altos. |
| `space-4` | `16px` | Padding padrão de página, card e modal. |
| `space-5` | `20px` | Cards de conteúdo editorial. |
| `space-6` | `24px` | Separação entre seções maiores. |
| `space-8` | `32px` | Grandes blocos e margens verticais. |
| `space-10` | `40px` | Respiro de áreas especiais. |
| `space-12` | `48px` | Ícones grandes, estados vazios e modais. |

### Margens e padding

- Página: `16px` nas telas principais.
- Cards: `16px` ou `20px`.
- Cabeçalhos: aproximadamente `16px` horizontal e vertical.
- Menus flutuantes: `6px` no container e `10px 16px` nos itens.
- Inputs: aproximadamente `12px 16px`.
- Barra inferior: `16px` horizontal e altura útil de `64px`.

### Largura máxima

- Layout principal: `max-w-4xl`, equivalente a `896px`.
- Conteúdo de leitura e formulários: `max-w-2xl`, equivalente a `672px`.
- Modais convencionais: `max-w-lg`, equivalente a `512px`.
- Formulário de login: `max-w-sm`, equivalente a `384px`.
- Calculadoras: `max-w-3xl`, equivalente a `768px`.

### Colunas e comportamento de grid

- Predomina uma coluna no mobile.
- Algumas telas usam grids responsivos em larguras maiores, conforme classes específicas dos componentes.
- Tabelas mantêm estrutura tabular e podem exigir rolagem horizontal.
- Cards são empilhados verticalmente na maior parte do sistema.

### Alinhamentos predominantes

- Conteúdo: alinhado à esquerda.
- Texto extenso: frequentemente justificado.
- Títulos de página: esquerda.
- Ações de confirmação: centralizadas.
- Navegação inferior: distribuição uniforme.
- Modais: centralizados na viewport.

### Ritmo vertical

O ritmo vertical padrão alterna:

- `12px` entre elementos correlatos;
- `16px` entre componentes;
- `24–32px` entre seções independentes.

---

## 6. Layout

### Estrutura geral

A aplicação utiliza um shell fixo que ocupa toda a viewport:

1. área principal rolável;
2. conteúdo centralizado;
3. navegação fixa na parte inferior;
4. overlays acima do conteúdo para menus e modais.

O container raiz usa `fixed inset-0`, impedindo rolagem do documento e delegando a rolagem à área principal.

### Cabeçalho

Existem cabeçalhos internos reutilizáveis e cabeçalhos específicos por tela. O padrão recorrente inclui:

- fundo azul-marinho ou branco;
- título em Montserrat e negrito;
- botão de voltar à esquerda;
- ícones com `20–24px`;
- posição sticky em algumas telas;
- z-index entre `40` e `50`.

### Navegação

A navegação principal é inferior, fixa e baseada em cinco grupos:

- Benefícios;
- Avaliações;
- Documentos, condicionado ao perfil;
- Normas;
- Extras.

Cada item contém:

- ícone Material Symbols de `24px`;
- cápsula visual para estado selecionado;
- label de `11px`;
- área ocupando toda a altura de `64px`.

Ao tocar, abre-se um menu flutuante acima do item.

### Barra lateral

Não há barra lateral permanente. A navegação secundária ocorre por menus flutuantes ligados à barra inferior.

### Área principal

- Largura máxima de `896px`.
- Rolagem vertical independente.
- Padding inferior de aproximadamente `80px` para evitar sobreposição com a navegação.
- Em páginas detalhadas, largura reduzida para `672px`.

### Rodapé

Existe componente de rodapé com:

- fundo azul-marinho;
- altura aproximada de `164px`;
- conteúdo centralizado;
- padding inferior maior no mobile para compensar a navegação fixa.

O rodapé não aparece como elemento dominante em todas as telas.

### Containers e seções

- Container principal com largura responsiva e centralização horizontal.
- Seções delimitadas por cards ou cabeçalhos com borda inferior.
- Blocos informativos separados por `space-y-4`.

### Cards

Padrão predominante:

- fundo branco;
- raio de `16px`;
- padding de `16px` ou `20px`;
- borda cinza clara com opacidade;
- sombra pequena;
- conteúdo em coluna;
- títulos com ícone dourado ou azul-marinho.

### Modais

- Overlay preto com `50%` ou `95%` de opacidade.
- `backdrop-blur-sm` em vários casos.
- Conteúdo centralizado.
- Raio entre `12px` e `16px`.
- Sombra elevada.
- Padding externo de `16px` para evitar contato com bordas da tela.

### Painéis e menus flutuantes

- Fundo branco com `95%` de opacidade.
- Blur de fundo.
- Raio de `16px`.
- Sombra azul-marinho suave.
- Largura mínima entre `155px` e `175px`.
- Itens com raio de `12px`.

### Comportamento em telas largas

- O conteúdo não se expande indefinidamente.
- Cards e listas permanecem centralizados.
- Visualizadores de mídia podem alcançar `1024px` ou mais.
- A navegação inferior permanece centralizada dentro de `896px`.

### Comportamento em telas estreitas

- Cards ocupam quase toda a largura.
- Menus são posicionados a partir do item correspondente da navegação.
- Formulários e ações empilham verticalmente.
- Tabelas podem manter largura mínima e utilizar overflow.
- Botões flutuantes ficam próximos ao canto inferior direito.

---

## 7. Bordas, raios e sombras

### Bordas

| Token | Valor | Uso |
| ----- | ----- | --- |
| `border-width-default` | `1px` | Cards, inputs, menus e tabelas. |
| `border-width-emphasis` | `2px` | Indicadores, score e estados específicos. |
| `border-color-default` | `#E5E7EB` — estimativa | Bordas padrão. |
| `border-color-subtle` | `#F3F4F6` — estimativa | Divisores internos. |
| `border-color-primary` | `#050F41` | Foco, seleção e botões. |
| `border-color-success` | `#079551` | Estados concluídos e filtros positivos. |
| `border-color-error` | `#EF4444` — estimativa | Filtros críticos e erros. |

### Raios

| Token | Valor | Uso |
| ----- | ----: | --- |
| `radius-sm` | `4px` | Marcadores e elementos internos pequenos. |
| `radius-md` | `8px` | Imagens, miniaturas e controles compactos. |
| `radius-lg` | `12px` | Inputs, botões e modais menores. |
| `radius-xl` | `16px` | Cards e menus principais. |
| `radius-2xl` | `16px` no Tailwind | Padrão mais recorrente de card. |
| `radius-full` | `9999px` | Chips, badges, ícones circulares e FABs. |

### Sombras

| Token | Valor | Uso |
| ----- | ----- | --- |
| `shadow-sm` | Tailwind `shadow-sm` — estimativa: `0 1px 2px rgba(0,0,0,0.05)` | Cards e cabeçalhos. |
| `shadow-md` | Tailwind `shadow-lg` — estimativa | Dropdowns e modais convencionais. |
| `shadow-float` | `0 8px 32px rgba(5,15,65,0.08)` | Menus flutuantes. |
| `shadow-nav` | `0 -4px 16px rgba(0,0,0,0.03)` | Navegação inferior. |
| `shadow-fab` | Tailwind `shadow-2xl` — estimativa | Botões flutuantes e visualizadores. |

### Separadores

- Linhas de `1px` em cinza `gray-100` ou `gray-200`.
- Uso de `divide-y` em listas e menus.
- Títulos de cards frequentemente possuem `border-bottom` e padding inferior de `8px`.

### Contornos de foco

- Inputs: alteração da cor da borda para azul-marinho ou verde.
- Diversos botões removem o outline padrão sem adicionar `focus-visible:ring`, o que deve ser corrigido.

---

## 8. Iconografia

### Bibliotecas identificadas

- **Material Symbols Outlined**, via Google Fonts.
- **Lucide React**, versão declarada `^0.563.0`.

### Estilo

- Material Symbols: geometria preenchível, usada em navegação, labels e ações utilitárias.
- Lucide: ícones lineares com traço uniforme, usados em páginas clínicas e controles específicos.

### Tamanhos observados

- `13–16px`: badges, ordenação e ações muito compactas.
- `18–20px`: itens de menu e botões internos.
- `22–24px`: títulos, navegação e ações principais.
- `26–28px`: FABs e destaques.
- `48px`: estados de sucesso ou vazios.

### Espessura dos traços

- Material Symbols: peso `400`, fill `0` por padrão e fill `1` no estado selecionado da navegação.
- Lucide: traço padrão da biblioteca, aproximadamente `2px`.

### Cor

- Azul-marinho para conteúdo e navegação ativa.
- Cinza para estado neutro.
- Dourado para ícones de seção.
- Verde para confirmação.
- Vermelho para erro e ação crítica.
- Branco sobre fundos escuros.

### Alinhamento

- Ícones alinhados ao centro em botões.
- Em títulos, ficam à esquerda com margem direita de `8px`.
- Em inputs, aparecem posicionados absolutamente a `12px` da borda esquerda.
- Em menus, usam margem direita de `12px`.

### Regra recomendada

Para novas telas, preferir uma biblioteca por contexto. Material Symbols deve permanecer na navegação e nas ações institucionais; Lucide pode ser usado em conteúdos clínicos específicos. Evitar combinar os dois estilos no mesmo componente.

---

## 9. Imagens e ilustrações

### Imagem de login

- Ocupa a metade superior da tela.
- Usa `background-size: cover`.
- Posicionamento `center top`.
- A metade inferior utiliza overlay azul-marinho a `90%` e blur.

### Splash screen

- Fundo integral azul-marinho.
- Imagem central com `object-contain`.
- Ocupa largura e altura completas sem corte.

### Infográficos e conteúdo de mídia

- Visualização em overlay preto quase opaco.
- Imagem limitada por `max-width: 100%` e `max-height: 90vh`.
- `object-contain` para preservar proporção.
- Raio aproximado de `8px`.
- Sombra elevada.

### Vídeos

- Container `aspect-video`, proporção `16:9`.
- Fundo preto.
- Raio de `12px`.
- Borda cinza escura.

### Avatares

Não foi identificado um sistema de avatar como padrão central.

### Miniaturas e placeholders

- Placeholders são predominantemente textuais ou representados por ícones.
- Não há linguagem consistente de ilustração vetorial.

---

## 10. Componentes

### 10.1 Botões

#### Botão primário azul-marinho

- Fundo: `#050F41`.
- Texto: branco.
- Altura típica: `44–48px`.
- Padding horizontal: `16px`.
- Raio: `12px`.
- Peso: `700`.
- Tamanho: `12–14px`.
- Hover: escurecimento leve ou alteração de opacidade.
- Active: escala ou tom mais escuro em casos específicos.

#### Botão primário verde

- Fundo: `#079551`.
- Hover: `#067A43`.
- Active: `#056635`.
- Texto: branco.
- Raio: `12px`.
- Uso: login, cadastro, confirmação e ações positivas.

#### Botão secundário

- Fundo: cinza-claro ou branco.
- Texto: cinza-escuro ou azul-marinho.
- Borda: cinza clara.
- Hover: `gray-50` ou `gray-100`.

#### Botão destrutivo/crítico

- Vermelho `red-500`, `red-800` ou `red-900`, conforme gravidade.
- Texto branco.
- Deve ser reservado para exclusão, erro grave ou condição clínica crítica.

#### Botão flutuante

- Dimensão: `56 × 56px`.
- Forma: circular.
- Sombra: elevada.
- Ícone: `26px`.
- Hover: escala `1.05`.
- Active: escala `0.95`.

### 10.2 Inputs

- Largura: `100%`.
- Fundo: branco, `gray-50` ou branco com `10%` de opacidade no login.
- Borda: `1px` cinza-clara ou branca translúcida.
- Raio: `12px`.
- Padding: `12px 16px`.
- Texto: `14px`.
- Placeholder: cinza médio ou branco translúcido.
- Focus: borda azul-marinho ou verde; sem outline padrão.
- Disabled: opacidade reduzida e cursor bloqueado.

### 10.3 Textareas

O padrão segue os inputs, com:

- altura variável;
- padding de `12–16px`;
- resize conforme implementação local;
- corpo em `14px`;
- borda de foco institucional.

### 10.4 Selects

- Mesma altura e raio dos inputs.
- Indicador de seta customizado no login.
- `appearance-none` no select escuro.
- Opções com fundo azul-marinho na tela de login.

### 10.5 Checkboxes e radios

São usados de forma pontual. Quando estilizados por composição, devem manter área clicável mínima de `40px`, label próxima e cor ativa azul-marinho ou verde.

### 10.6 Toggles

Não foi identificado um padrão visual global consolidado. Novos toggles devem seguir a escala de `40–44px` de largura, com estado ativo verde ou azul-marinho.

### 10.7 Cards

- Fundo branco.
- Raio `16px`.
- Borda `1px` cinza-clara.
- Sombra pequena.
- Padding `16–20px`.
- Título Montserrat `14–16px`, negrito e azul-marinho.
- Ícone opcional dourado.
- Conteúdo Carlito `12–14px`.

### 10.8 Tabelas

- Fundo branco.
- Cabeçalho com azul-marinho a `5%` ou cinza-claro.
- Fonte entre `12px` e `14px`.
- Células com padding de `10–12px` vertical e `12–16px` horizontal.
- Divisores horizontais cinza-claro.
- Cabeçalhos em negrito e azul-marinho.
- Ordenação indicada por ícone de `13px`.
- Linhas críticas podem usar fundos vermelhos suaves.

### 10.9 Abas

As abas são representadas por botões segmentados ou controles locais. O estado ativo tende a usar azul-marinho, verde ou fundo suave institucional.

### 10.10 Breadcrumbs

Não foi identificado um breadcrumb global. A navegação de retorno ocorre por botão com seta no cabeçalho.

### 10.11 Badges e contadores

- Forma circular ou cápsula.
- Tamanho tipográfico `10px`.
- Peso `700`.
- Contadores circulares: cerca de `16 × 16px`.
- Cores semânticas: vermelho, verde, âmbar e cinza.

### 10.12 Tags e filtros

- Formato cápsula.
- Padding aproximado de `6px 12px`.
- Fonte `12px`, peso `600`.
- Borda `1px`.
- Estado selecionado com fundo semântico e texto branco.
- Estado neutro branco com borda cinza.

### 10.13 Alertas

- Erro: texto vermelho, geralmente centralizado, `12px`.
- Sucesso: ícone verde grande e texto em branco ou azul-marinho conforme fundo.
- Alertas mais complexos devem usar card semântico com ícone, título e descrição.

### 10.14 Tooltips

Não foi identificado um padrão visual de tooltip. Alguns botões usam o atributo nativo `title`.

### 10.15 Dropdowns

- Fundo branco.
- Borda cinza.
- Raio `12–16px`.
- Sombra média.
- Itens de `40–44px` de altura.
- Hover em cinza-claro.
- Pode utilizar posicionamento absoluto abaixo do campo.

### 10.16 Modais

- Overlay preto.
- Conteúdo branco ou mídia sobre preto.
- Raio `12px`.
- Cabeçalho com título e botão fechar.
- Padding `16px`.
- Largura máxima específica por conteúdo.
- Clique no overlay normalmente fecha o modal.

### 10.17 Menus

- Menus da navegação inferior usam superfície translúcida com blur.
- Itens alinhados horizontalmente com ícone, texto e contador opcional.
- Estado atual usa fundo azul-marinho a `5%` e texto azul-marinho.

### 10.18 Paginação

Não foi identificado um componente global consolidado. Listas extensas tendem a usar filtros e rolagem.

### 10.19 Barras de progresso

Não há padrão global claramente consolidado. Carregamento é comunicado principalmente por spinner.

### 10.20 Skeletons

Não foi identificado skeleton estruturado. Estados iniciais usam texto “Carregando...” ou spinner.

### 10.21 Toasts

Não foi identificado um sistema global de toast. Feedback é mostrado inline, em modal ou pela mudança do próprio botão.

### 10.22 Navegação superior

Não existe navegação superior global. Cabeçalhos de página fornecem contexto e retorno.

### 10.23 Barra inferior

- Posição fixa no rodapé.
- Fundo branco.
- Borda superior cinza com opacidade.
- Sombra para cima.
- Altura de `64px`, além da safe area.
- Até cinco itens distribuídos uniformemente.
- Estado ativo com cápsula azul-clara, ícone preenchido e label azul-marinho em negrito.

---

## 11. Estados interativos

| Estado | Representação visual |
| ------ | -------------------- |
| Padrão | Fundo neutro, texto cinza-escuro ou azul-marinho, borda discreta. |
| Hover | Fundo cinza-claro, mudança de cor do texto ou leve escala em FABs. |
| Focus | Alteração da borda para azul-marinho ou verde; em vários botões o outline padrão é removido. |
| Active | Tom mais escuro, escala `0.95` ou mudança imediata de fundo. |
| Selected | Fundo azul-claro ou azul-marinho a baixa opacidade, texto azul-marinho e ícone preenchido. |
| Disabled | Opacidade em torno de `40%`, cursor `not-allowed` e ausência de hover. |
| Loading | Spinner circular com borda parcial ou texto como “Carregando...” e “Verificando...”. |
| Error | Texto vermelho, fundo vermelho suave ou borda semântica. |
| Success | Verde, ícone `check_circle`, texto de confirmação e ação de continuidade. |
| Empty | Texto centralizado em cinza, geralmente com padding vertical de `48px`. |
| Pressed | Escala reduzida ou cor mais escura. |

### Observação de acessibilidade

Todos os estados interativos devem incluir uma variante `focus-visible` independente de hover e active. O estado selected não deve depender exclusivamente de cor; manter ícone preenchido, peso tipográfico ou marcador adicional.

---

## 12. Animações e transições

### Durações observadas

- `200ms`: navegação, hover e mudanças simples.
- `300ms`: expansão de acordeões, rotação de ícones e mudanças mais estruturais.

### Curvas

Não há curva customizada declarada. O comportamento utiliza o easing padrão do Tailwind, geralmente `ease-in-out` ou equivalente conforme a classe.

### Propriedades animadas

- `color` e `background-color`.
- `transform`.
- `opacity`.
- `border-color`.
- rotação de ícones.
- escala de FABs.

### Modais

Utilizam `animate-fade-in` em várias telas. A definição da animação não foi encontrada no arquivo fornecido; portanto, duração e keyframes exatos são **não confirmados**.

### Expansão de menus

- Menus aparecem sobre o conteúdo.
- Acordeões utilizam rotação de `180deg` no ícone e transição de `300ms`.
- A animação de altura não está padronizada em todos os componentes.

### Feedback de carregamento

- Spinner circular com `animate-spin`.
- Diâmetros observados: `20px` e `32px`.
- Borda de `2px`.

### Movimento reduzido

Não foi identificada implementação explícita de `prefers-reduced-motion`. Deve ser adicionada para desativar escalas, rotações e fades não essenciais.

---

## 13. Responsividade

| Faixa | Largura sugerida | Comportamento |
| ----- | ---------------: | ------------- |
| Mobile compacto | `0–479px` | Uma coluna; cards ocupam a largura; menus posicionados sobre a navegação; tipografia compacta; tabelas com overflow. |
| Mobile amplo | `480–639px` | Uma coluna com maior respiro lateral; botões podem permanecer empilhados. |
| Tablet | `640–767px` | Containers centralizados; possíveis grids de duas colunas em telas específicas; modais maiores. |
| Tablet amplo | `768–1023px` | Conteúdo limitado a `672–896px`; rodapé reduz padding inferior; visualização mais confortável de tabelas. |
| Desktop | `1024px+` | Conteúdo não ultrapassa `896px` na maioria das telas; mídia pode chegar a `1024px`; navegação inferior permanece com largura limitada. |

### Breakpoints aparentes

O código utiliza principalmente breakpoints padrão Tailwind:

- `sm`: `640px` — estimativa baseada no padrão Tailwind.
- `md`: `768px`.
- `lg`: `1024px` — estimativa.
- `xl`: `1280px` — não predominante.

### Mudanças de layout

- Empilhamento vertical no mobile.
- Aumento de largura dos containers sem alterar a estrutura principal.
- Ajuste do padding do rodapé em `md`.
- Modais e visualizadores passam a usar larguras máximas maiores.

### Navegação mobile

A barra inferior é o padrão primário e permanece ativa também em desktop. Deve respeitar `env(safe-area-inset-bottom)`.

### Áreas de toque

- Navegação: adequada, com altura de `64px`.
- Botões principais: aproximadamente `44–48px`.
- Alguns ícones isolados com padding pequeno podem ficar abaixo do recomendado.

### Tabelas

- Devem utilizar `overflow-x-auto` quando houver risco de corte.
- Em mobile, considerar cards por linha para dados muito extensos.

---

## 14. Acessibilidade

### Contraste

**Pontos positivos:**

- Azul-marinho e branco oferecem contraste alto.
- Texto principal `#1F2937` sobre branco é legível.
- Botões verdes com texto branco apresentam contraste adequado em tamanhos normais, embora deva ser validado formalmente.

**Problemas potenciais:**

- `text-white/40`, `text-white/50` e `text-gray-400` podem falhar em textos pequenos.
- Dourado não deve ser usado como texto pequeno sobre branco.
- Azul-claro de seleção depende do texto azul-marinho para manter contraste.

### Tamanho mínimo de texto

Há diversos textos de `10px` e `11px`. Recomenda-se:

- mínimo de `12px` para metadados;
- mínimo de `14px` para corpo principal;
- `16px` em inputs para evitar zoom automático em alguns navegadores móveis.

### Áreas de toque

- Meta mínima: `44 × 44px`.
- Itens da navegação atendem ao requisito.
- Botões de fechar, copiar e voltar devem manter padding suficiente mesmo quando o ícone mede apenas `20px`.

### Estados de foco

Problema observado: vários botões usam `focus:outline-none` sem um substituto visível.

Recomendação:

```css
:focus-visible {
  outline: 3px solid rgba(250, 185, 50, 0.75);
  outline-offset: 2px;
}
```

### Uso de cor

- Estados selecionados combinam cor, preenchimento de ícone e peso tipográfico, o que é positivo.
- Estados de erro e sucesso devem sempre incluir texto ou ícone, não apenas cor.

### Hierarquia semântica

- O uso de `h1–h6` é frequente, mas a transformação global para caixa alta não garante ordem semântica.
- Cada tela deve possuir um único `h1` principal.
- Títulos de cards devem respeitar níveis hierárquicos, não apenas aparência.

### Formulários

- Labels visíveis estão presentes em várias telas.
- Mensagens de erro aparecem próximas ao formulário.
- Recomenda-se associar `label` e campo por `htmlFor`/`id`.
- Adicionar `aria-describedby` para erro e ajuda.
- Informar campos obrigatórios de forma textual.

### Navegação por teclado

- Menus e modais devem controlar foco.
- Ao abrir modal, mover o foco para o título ou primeiro controle.
- Ao fechar, devolver o foco ao acionador.
- Esc deve fechar overlays.

### Leitores de tela

- Botões apenas com ícone devem ter `aria-label`.
- Badges de contagem devem possuir descrição contextual.
- Ícones decorativos devem usar `aria-hidden="true"`.
- Modais devem usar `role="dialog"` e `aria-modal="true"`.

### Movimento reduzido

Adicionar:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 15. Tokens de design

```css
:root {
  /* Cores confirmadas */
  --color-primary: #050F41;
  --color-primary-light: #1A2A6C;
  --color-primary-soft: rgba(5, 15, 65, 0.05);
  --color-primary-shadow: rgba(5, 15, 65, 0.08);

  --color-secondary: #079551;
  --color-secondary-hover: #067A43;
  --color-secondary-active: #056635;

  --color-accent: #FAB932;
  --color-accent-dark: #D49B20;
  --color-accent-alt: #B8860B;

  --color-background: #F3F5F7;
  --color-surface: #FFFFFF;
  --color-surface-overlay: rgba(255, 255, 255, 0.95);

  --color-text-primary: #1F2937;
  --color-text-heading: #050F41;

  --color-highlight: #FFFF99;
  --color-overlay: rgba(0, 0, 0, 0.50);
  --color-overlay-strong: rgba(0, 0, 0, 0.95);

  /* Cores Tailwind inferidas */
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-red-500: #EF4444;
  --color-red-800: #991B1B;
  --color-red-900: #7F1D1D;
  --color-amber-400: #FBBF24;
  --color-blue-100: #DBEAFE;

  /* Tipografia */
  --font-heading: "Montserrat", sans-serif;
  --font-body: "Carlito", sans-serif;

  --font-size-micro: 0.625rem;   /* 10px */
  --font-size-caption: 0.6875rem;/* 11px */
  --font-size-sm: 0.75rem;       /* 12px */
  --font-size-md: 0.875rem;      /* 14px */
  --font-size-lg: 1rem;          /* 16px */
  --font-size-xl: 1.125rem;      /* 18px */
  --font-size-2xl: 1.25rem;      /* 20px */
  --font-size-display: 2.25rem;  /* 36px */

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;

  --line-height-tight: 1.25;
  --line-height-snug: 1.375;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;

  /* Espaçamento */
  --space-0: 0;
  --space-0-5: 0.125rem;
  --space-1: 0.25rem;
  --space-1-5: 0.375rem;
  --space-2: 0.5rem;
  --space-2-5: 0.625rem;
  --space-3: 0.75rem;
  --space-3-5: 0.875rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  /* Raios */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Bordas */
  --border-width-default: 1px;
  --border-width-emphasis: 2px;
  --border-color-default: #E5E7EB;
  --border-color-subtle: #F3F4F6;

  /* Sombras */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-float: 0 8px 32px rgba(5, 15, 65, 0.08);
  --shadow-nav: 0 -4px 16px rgba(0, 0, 0, 0.03);
  --shadow-modal: 0 20px 25px -5px rgba(0, 0, 0, 0.10),
                  0 8px 10px -6px rgba(0, 0, 0, 0.10);

  /* Layout */
  --content-width-sm: 24rem;  /* 384px */
  --content-width-lg: 32rem;  /* 512px */
  --content-width-2xl: 42rem; /* 672px */
  --content-width-3xl: 48rem; /* 768px */
  --content-width-4xl: 56rem; /* 896px */
  --bottom-nav-height: 4rem;  /* 64px */

  /* Breakpoints inferidos do Tailwind */
  --breakpoint-sm: 40rem;  /* 640px */
  --breakpoint-md: 48rem;  /* 768px */
  --breakpoint-lg: 64rem;  /* 1024px */
  --breakpoint-xl: 80rem;  /* 1280px */

  /* Movimento */
  --duration-fast: 150ms;
  --duration-default: 200ms;
  --duration-slow: 300ms;
  --easing-default: ease-in-out;

  /* Elevação */
  --z-base: 0;
  --z-sticky: 40;
  --z-navigation: 50;
  --z-splash: 100;
  --z-modal: 110;
  --z-media-overlay: 200;
}
```

---

## 16. Diretrizes de reprodução

### O que deve ser mantido

- Azul-marinho `#050F41` como cor institucional principal.
- Verde `#079551` para confirmação e sucesso.
- Dourado `#FAB932` apenas como acento.
- Fundo geral cinza-claro `#F3F5F7`.
- Cards brancos com raio de `16px`.
- Montserrat para títulos e Carlito para corpo.
- Títulos curtos, objetivos e predominantemente em caixa alta.
- Navegação inferior persistente e compatível com safe area.
- Conteúdo centralizado com largura máxima de `896px`.
- Espaçamento baseado em múltiplos de `4px`.
- Ícones acompanhados de texto quando a ação não for universalmente reconhecível.

### O que deve ser evitado

- Novas cores de marca sem função semântica clara.
- Gradientes decorativos nas telas de conteúdo.
- Sombras fortes em todos os cards.
- Cantos quadrados em componentes principais.
- Texto dourado pequeno sobre branco.
- Mistura excessiva de Material Symbols e Lucide dentro do mesmo componente.
- Texto abaixo de `12px`, salvo badges estritamente necessários.
- Remoção de outline sem substituição por `focus-visible`.
- Conteúdo encoberto pela barra inferior.
- Ações destrutivas usando a mesma aparência das ações primárias.

### Regras de composição

1. Utilizar uma coluna principal no mobile.
2. Aplicar `16px` de padding lateral nas páginas.
3. Agrupar conteúdo relacionado em cards.
4. Usar no máximo uma ação primária dominante por seção.
5. Posicionar ações secundárias abaixo ou ao lado da primária, com menor peso visual.
6. Manter títulos e ícones alinhados pela linha de base ou pelo centro óptico.
7. Separar seções independentes por pelo menos `16px`.
8. Limitar linhas de texto extenso a aproximadamente `60–80` caracteres quando possível.

### Regras de hierarquia

- Um `h1` por tela.
- Títulos de card em `14–16px`, Montserrat, peso `700`.
- Subtítulos em `12–14px`, cinza médio.
- Corpo em `14px`, Carlito, altura de linha entre `1.5` e `1.625`.
- Metadados em `12px`, evitando `10px` salvo contadores.
- Ações primárias com fundo sólido; secundárias com fundo neutro ou outline.

### Uso correto das cores

- Azul-marinho: identidade, títulos, navegação ativa e ação principal documental.
- Verde: concluir, confirmar, autenticar e indicar sucesso.
- Dourado: destacar categorias, ícones de seção ou referências institucionais.
- Vermelho: erro, exclusão, gravidade ou pendência crítica.
- Âmbar: alerta ou restrição não crítica.
- Azul-claro: seleção suave e apoio informativo.

### Uso correto dos componentes

- Reutilizar o mesmo padrão de card em todas as telas de consulta.
- Reutilizar os mesmos estilos de input, select e textarea.
- Centralizar a lógica visual de botões em componentes reutilizáveis.
- Padronizar modais com cabeçalho, corpo, rodapé e foco controlado.
- Manter chips e filtros com semântica cromática consistente.

### Consistência entre desktop e mobile

- Não criar uma experiência desktop completamente diferente.
- Preservar a navegação e a ordem do conteúdo.
- Apenas aumentar largura, respiro e quantidade de colunas quando houver espaço.
- Manter áreas de toque adequadas em todos os tamanhos.
- Garantir que menus flutuantes não ultrapassem a viewport.
- Tabelas devem possuir estratégia explícita para telas estreitas.

---

## 17. Checklist de consistência

### Identidade visual

- [ ] O azul-marinho principal é `#050F41`.
- [ ] O verde de sucesso é `#079551`.
- [ ] O dourado é usado apenas como acento.
- [ ] O fundo principal é `#F3F5F7`.
- [ ] Não foram introduzidas cores semânticas redundantes.

### Tipografia

- [ ] Títulos usam Montserrat.
- [ ] Corpo usa Carlito.
- [ ] Existe apenas um `h1` por tela.
- [ ] Títulos seguem hierarquia semântica.
- [ ] Corpo principal tem pelo menos `14px`.
- [ ] Textos abaixo de `12px` foram evitados.
- [ ] Caixa alta foi aplicada apenas em títulos e labels adequados.

### Layout e espaçamento

- [ ] A página usa padding lateral de `16px` no mobile.
- [ ] O conteúdo respeita largura máxima adequada.
- [ ] O espaçamento usa múltiplos de `4px`.
- [ ] Cards relacionados mantêm o mesmo raio e padding.
- [ ] O conteúdo não fica oculto pela navegação inferior.
- [ ] Safe areas foram consideradas.

### Componentes

- [ ] Cards usam fundo branco, borda discreta e raio de `16px`.
- [ ] Inputs e selects usam raio de `12px`.
- [ ] Botões primários possuem altura mínima de `44px`.
- [ ] Ação destrutiva possui estilo vermelho distinto.
- [ ] Ícones possuem tamanho e alinhamento consistentes.
- [ ] Menus e dropdowns não ultrapassam a viewport.
- [ ] Tabelas possuem comportamento definido no mobile.

### Estados

- [ ] Hover está definido para dispositivos compatíveis.
- [ ] Focus-visible é claramente perceptível.
- [ ] Active ou pressed fornece feedback imediato.
- [ ] Disabled não depende apenas de cor.
- [ ] Loading evita múltiplos envios.
- [ ] Error apresenta mensagem textual próxima ao problema.
- [ ] Success apresenta confirmação clara.
- [ ] Empty state explica a ausência de dados.

### Acessibilidade

- [ ] Contraste atende ao WCAG AA.
- [ ] Áreas de toque possuem pelo menos `44 × 44px`.
- [ ] Botões apenas com ícone possuem `aria-label`.
- [ ] Labels estão associados aos campos.
- [ ] Erros usam `aria-describedby` ou equivalente.
- [ ] Modais controlam e restauram o foco.
- [ ] A navegação funciona por teclado.
- [ ] Estados não dependem somente de cor.
- [ ] Ícones decorativos estão ocultos de leitores de tela.
- [ ] `prefers-reduced-motion` é respeitado.

### Responsividade

- [ ] A tela funciona entre `320px` e desktop amplo.
- [ ] Não há rolagem horizontal involuntária.
- [ ] Tabelas e mídia possuem overflow controlado.
- [ ] Botões não ficam excessivamente comprimidos.
- [ ] Modais mantêm margem mínima de `16px`.
- [ ] Tipografia permanece legível em todos os breakpoints.

### Qualidade final

- [ ] O componente reutiliza tokens em vez de valores isolados.
- [ ] Não existem estilos duplicados sem necessidade.
- [ ] A nova tela parece pertencer ao mesmo produto.
- [ ] As ações principais são identificáveis em poucos segundos.
- [ ] A interface mantém o caráter institucional, clínico e objetivo do aplicativo.
