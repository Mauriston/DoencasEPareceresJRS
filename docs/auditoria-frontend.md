# Auditoria de frontend — implementação

Origem: *Auditoria Frontend DoencasEPareceresJRS* (Claude Design, 15–16/10/2026) — 61 achados
(F01–F62; o F08 não existe na numeração original), wireframes W1–W7 e sequência de implantação
em 4 fases. Este documento registra **em que etapa cada achado foi tratado**.

Regra de ouro das 4 etapas: **nenhuma lógica de exibição de página, permissão por perfil
(`config/permissions.ts`, `canAccessPage`, `canUseFeature`) ou de preenchimento das planilhas
(Firestore/Apps Script) foi alterada** — só apresentação, estrutura de navegação e componentes.

| Etapa | Escopo | Achados |
|---|---|---|
| 1 · Correções diretas | `select-none`, piso de 12 px, ink-3, botões rotulados, status por extenso | F06 F09 F10 F12 F21 F23 F29* F30 F32 F35 F36 · Concursos: F41 F50 F53 F62 |
| 2 · Fundação | Tailwind compilado + tokens do DS, Montserrat única, uma biblioteca de ícones, primitivos | F01 F02 F03 F04 F05 F07 F11 F37 · Concursos: F39 F40 F51 F61 |
| 3 · Shell e rotas | Router com URL, sidebar fixa, PageHeader com breadcrumb, containers/grid | F13 F14 F16 F19 F20 F22 F28 F29* F31 · Concursos: F38 F48 F49 |
| 4 · Telas | Home painel, detalhe 8+4, formulários, planilha | F15 F17 F18 F24 F25 F26 F27 F33 F34 · Concursos: F42 F43 F44 F45 F46 F47 F52 F54 F55 F56 F57 F58 F59 F60 |

\* F29 (affordances só no hover): remoção do botão de excluir imagem em *Mensagens* na etapa 1;
rótulos da sidebar sempre visíveis na etapa 3.
