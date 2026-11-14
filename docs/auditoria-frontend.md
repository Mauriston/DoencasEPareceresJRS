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

### Decisões e pendências da Etapa 4

- **F58 (sheet mobile):** o Nº TIS continua **não editável no mobile** — é regra de negócio existente (só se lança na visão desktop, onde há confirmação de finalização); a auditoria sugeria editar. Mantida para não alterar a lógica de preenchimento das planilhas.
- **F52:** indicador de salvamento por linha (salvando → salvo / falha). O desfazer (Ctrl+Z) não existia no app e não foi criado.
- **F60:** a criação de concurso é a página `/concursos/novo` (etapas 1 Mensagem · 2 Revisão · 3 Agendamento), com a mesma permissão `concursosJRS.registrarMensagemPDF`.
- **Code.gs:** `getPareceresList` passou a devolver `perito`, `finalidade` e `om` — **reimplantar o Apps Script** para o histórico de Pareceres mostrar essas colunas (sem a reimplantação a tabela exibe "—").
- Pendências conhecidas na época: `bun.lock` desatualizado em relação ao `package.json`; o perito (nome/e-mail) de Pareceres está fixo no código; o Material Symbols ainda vem do Google Fonts. (Situação atual na seção seguinte.)

\* F29 (affordances só no hover): remoção do botão de excluir imagem em *Mensagens* na etapa 1;
rótulos da sidebar sempre visíveis na etapa 3.

---

## Evoluções após a auditoria (19 a 31/10/2026)

A "regra de ouro" valeu para as 4 etapas da auditoria. Depois delas, as funcionalidades novas **alteram lógica de propósito** (novas telas, coleções e permissões) — mas seguem o sistema de design implantado: só cores e escala do DS (o build falha fora disso), primitivos de `components/ui/` e os mesmos padrões de tabela, sheet e diálogo.

| Entrega | Padrão de UI usado |
|---|---|
| Inspeções de Saúde (tabela, calendário, agendamento, bloqueios) | Tabela com linhas duplas e grupos por data, `Drawer`, `Dialog`, menu de ações |
| Início como painel (Precisa de atenção, Próximas inspeções, mini calendário, Próximas férias na coluna direita, IS de concurso atrasadas, fila de impressão da Secretaria) | `Secao` (card com título, ação e badge), linhas de 56–64 px com chevron |
| Páginas públicas (Doenças de Lei e Portaria) | `ShellPublico` com barra enxuta no celular |
| Exames do candidato e detalhes da IS | Barra lateral (`Drawer`) com seções e itens que abrem nova janela |
| Formação (Vídeos, Infográficos, Apresentações) | Grade de cards; apresentação em modal de tela cheia |
| Notificações (convite, painel, badge no avatar, card no Perfil) | `Dialog` sm/md, badge `wine` |
| Triagem das IS de concurso | Chips TRIAR (`wine`) e TRIADO (`green-700`), formulário em `Dialog`/`Drawer`, seção `gold-50` na barra lateral, `StatusSelect` com destaque `gold-300` |
| Tela de erro (`ErroFatal`) | Mensagem com ação "Recarregar" e detalhe copiável |

Os novos padrões estão documentados em `docs/design.md`, seção 0.4.

### Decisões

- **Chips sólidos de ação na planilha (TRIAR/TRIADO):** exceção pedida pelo Presidente da JRS ao uso contido de cor, para dar destaque à triagem. Vermelho (`wine`) = ação pendente; verde = concluída — o texto (TRIAR/TRIADO) carrega o estado, não só a cor.
- **Fundo amarelo no Status** (`gold-300`), só para o MPI, enquanto a IS triada aguarda o resultado. Ouro usado como indicador, coerente com a regra "ouro só como indicador/foco".
- **F58** continua valendo: o Nº TIS segue não editável no celular.

### Pendências (situação em 31/10/2026)

- `bun.lock` continua desatualizado (sem `firebase-admin`, `pdf-lib`, `qrcode` etc.); o CI usa `npm` e o `package-lock.json`.
- Material Symbols ainda vem do Google Fonts (e o service worker do push carrega o SDK do Firebase do gstatic).
- Dois textos de 11 px abaixo do piso de 12 px: `components/ui/VisualizacoesBadge.tsx` e `components/Apresentacoes.tsx` (`text-[11px]`, que escapa da verificação do DS por ser valor arbitrário).
- **Resolvida:** a nota sobre reimplantar o `Code.gs` para as colunas de Pareceres ficou obsoleta — Pareceres foi para o Firestore.
- **Resolvida:** o perito de Pareceres não está mais fixo no código (o solicitante vem do usuário logado).

## Auditoria v3 — implementação (14/11/2026)

Auditoria feita no Claude Design (seções 1–10 + achados globais G1–G10), implementada em três fases: fundação do DS (seção 3 e 4f), páginas (2a–2c, 4, 5–10) e varredura/verificação. Verificação final: `tsc` 0 erros · `verificar-ds` OK (384 arquivos) · `vitest` 461/461 · `e2e` 17/17 (emuladores) · `build` OK (aviso de chunk > 500 kB: `StatusTag-*.js` 529 kB e `DGPM406Guide-*.js` 408 kB — só código-splitting, sem efeito funcional). Legenda: **feito** · **parcial** · **não feito**.

| Id | Achado | Situação |
|---|---|---|
| G1 | Vinho só para exceção que exige ação | feito — "vigente", "dia de concurso", "agendada" em neutro/navy; vinho só em atrasado/pendência |
| G2 | Abas sublinhadas (ouro = ativo) para situação; Segmented só ícone para a vista | feito — Inspeções (Ativas/Finalizadas), Concursos (`AbasSituacao`), Perícia Menor; vista Lista/Calendário em `Segmented` de ícones |
| G3 | Grade de 12 colunas | feito — `GradeCards`/`GradePainel`/`GradeIndice` (`components/ui/Grade.tsx`) com gatilho `@split` |
| G4 | 44 px só em `pointer: coarse` | feito — `Button`/`IconButton`/`controlClass` 40 px (32 em `size="sm"`); 44 px por regra global em toque |
| G5 | Sem `font-mono` | feito — `tabular-nums`; `font-mono` barrado pelo `verificar-ds` |
| G6 | Caixa de frase nos rótulos | feito — "Em andamento", "Em breve", "Reabrir concurso", "Não finalizados", "Próximas inspeções", "Enviar exames", "Enviar e-mail", "Gerar parecer", "Adicionar candidato", "Registrar mensagem", "Minuta de resultados"…; plurais reais (`plural()`) em vez de "candidato(s)" |
| G7 | Usar Button/Card/Field | feito — botões crus restantes só em `Login.tsx`, chips de estado da `TabelaCandidatos` e células editáveis inline (ver "Pendências" abaixo) |
| G8 | PageHeader em toda página | feito — `PageHeader` com `description`/`actions`/`fab`; páginas sem cabeçalho usam `useTituloPagina` |
| G9 | `ink-2` não existe | feito — lint barra tonalidades inexistentes |
| G10 | Mobile | feito — ver M1–M10, 4b/4d/4e |
| L1–L6 | Layout: gatilho por conteúdo, container, proporções, grade de cards, espaçamento duplo, grid escondido | feito — `Grade*` com container queries; `Container` leitura 720 · formulário 640 · dados 1200; espaçamento de seção único |
| P1–P5 | Página: Início no contrato, títulos de rota, voltar, primária com rótulo, contexto fixo | feito — `PageHeader` em todas as páginas (Início inclusive), `useTituloPagina`, voltar na topbar (não como ação), primária sempre com texto; P5 **parcial**: dados de contexto no `description` do `PageHeader` onde há |
| B1–B6 | Botões: componente, link-botão, tamanho compacto, uma primária por região, ghost/ícone, microinterações | feito — `Button`/`ButtonLink`/`IconButton`/`buttonClass`, `size="sm"`, `variant="ghost"`, sem `active:scale`, foco ouro |
| O1–O5 | Card do DS, dois sistemas de formulário, hierarquia de seção, token inexistente, sombras | feito — `Card padding/title/actions`, `Field`/`controlClass`/`SearchField`, `text-h1/h2/h3` + `.eyebrow`, lint de tonalidade, `shadow-sm/md` barrados |
| M1 | Cabeçalho ocupa a primeira tela | feito — h1 vai para a topbar no celular; ações em ⋮ e FAB |
| M2 | Zoom automático no iPhone | feito — controles 16 px abaixo de `md` |
| M3 | Filtros antes do conteúdo | feito — chips numa linha rolável; busca pelo ícone |
| M4 | Navegação só pelo drawer | feito — barra inferior (4e) com Início · Inspeções · Concursos · Perícia Menor · Menu, por perfil |
| M5 | Conteúdo que some | feito — KPIs de Concursos e calendário em versão compacta no celular |
| M6 | Tabela larga forçada | feito — listas no celular (Inspeções, Concursos, Usuários); tabela só no desktop |
| M7 | Botões flutuantes sem padrão | feito — `FabAcoes`/`fab` do `PageHeader`; "voltar ao topo" usa `--fab-bottom` |
| M8 | Texto abaixo de 12 px | feito — últimos `text-[11px]` (MenuCascata, VisualizacoesBadge, PainelConcursos) viraram `text-xs` |
| M9 | Título dito duas vezes | feito — topbar recebe o h1; sem repetição |
| M10 | Duas implementações por lista | **parcial** — Inspeções/Perícia Menor numa implementação; Concursos e Usuários ainda têm tabela + lista separadas |
| 4b/4d/4e/4f | Proposta mobile, FAB por perfil, barra inferior, tema escuro | feito — `FabAcoes` (1ª permitida = principal, 2–3 em pilha), barra inferior com `--tabbar-h`, tema claro/escuro (Marinho · Grafite · OLED) por `useTema` |
| 4g/CAL1–CAL2 | Calendário IS no celular | feito — no celular o calendário cai na lista do dia (`?dia=`); no desktop o painel não empurra a grade (`GradePainel`) |
| H1–H6 | Início | feito — contadores por perfil (2d) sem duplicar "Precisa de atenção"; "Acesso rápido" removido (H2, código morto apagado nesta fase); pesos de tag unificados; Próximas inspeções com hora à direita e linha que abre a IS; calendário com legenda e dias por extenso; saudação 24 px |
| I1–I8 | Inspeções | feito — chips Atrasadas/Sem agendamento/Minhas/Perito/Período na URL (`?situacao=atrasadas|sem_agendamento|finalizadas&perito=&minhas=1`), uma tabela só com grupos (Hoje primeiro, sem agendamento à parte), coluna Prazo no desktop, Finalizadas paginadas, etapas com progresso; `?novo=manual&inspecionado=<nip>` abre a nova IS já com o inspecionado (Ficha) |
| C1–C7 | Concursos | feito — KPIs no contexto do filtro e compactos no celular, abas de situação + Segmented de ícone, sem tag redundante, nome com `title`, card com aptos/inaptos/faltas/IDM (barra empilhada), 8+4 com "Próximos dias" e quantidade, card com link próprio e ⋮ fora do `role=button` (`?situacao=em_andamento&ano=`) |
| PM1–PM10 | Perícia Menor | feito — mestre-detalhe (lista + painel com abas "Esta perícia"/"Histórico", `?sel=&aba=`), prazo com contagem, 3 KPIs, títulos formatados, cores só por estado; PM3 feito (FAB só "Nova perícia"); PM10 feito (lista começa pelo principal) |
| PMD1–PMD3 | Detalhe da PM | feito — painel lateral em vez de Drawer modal, primária não tira da página, `Container` de dados |
| SB1–SB6 | Sobre | feito — entrada na sidebar/menu, áreas com peso e capturas (`components/sobre/imagens.gerado.ts`), índice em chips no celular, filtrado por `canAccessPage`; SB6 **parcial** — textos continuam no código (`content/`), mas gerados a partir das `PAGE_DEFS` onde possível |
| 6e | Versão pública sem login | feito — `components/sobre/SobrePublico.tsx` (`/publico/sobre`, `ShellPublico`), sem dados nem nomes |
| 6f | E-mails do app | feito — `components/sobre/EmailsApp.tsx` com os modelos e quem envia |
| 7 | Painel | feito — `/painel` com seções Inspeções, Perícias, Concursos e Uso do app (só Admin), janela de período, contadores que abrem as listas filtradas por URL; "Sem acesso há 30 dias" → `/administracao/usuarios?situacao=sem-acesso-30` |
| U1–U6 | Usuários | feito — ativar/desativar só no detalhe com `ConfirmDialog` e impacto; matriz de permissões com `BarraSalvar` (diferenças, descartar, aviso ao sair); Administração dividida em Usuários · Perfis · E-mails · Agenda · Integrações · Registro; controles do DS; lista no celular; formulário no `Drawer` |
| CF1–CF4 | Configurações | feito — `GradeCards` dentro do container; um só jeito de salvar (`BarraSalvar`) com trava de saída (`useAvisoSaida`); páginas curtas por assunto; ajustes do Admin reunidos em `/administracao` |
| 9 / MF1–MF4 | Ficha do inspecionado | feito — `/inspecionados/<nip>` (`components/ficha/`), seções por permissão (`ficha/permissoes.ts`), consultas por pessoa (`where`), substitui o histórico da PM (rota antiga redireciona), "Abrir IS"/"Novo parecer"/"Nova perícia" pré-preenchidos; MF4 **parcial** — eventos por pessoa só a partir do que já existe nas coleções (sem coleção nova de eventos) |
| PT1–PT8 | Portaria | feito — índice com âncoras (`GradeIndice`), capítulos na ordem, h2/h3 reais, numeração estruturada, citações como `blockquote`, tabelas com estilo do DS, margens únicas no celular, um só flutuante |

### Varredura final (fase 3)

- e2e `Inspeções: abas…` (teste 11): o chip "Sem agendamento" já expunha `aria-pressed` (`FilterChip`); a asserção lia o atributo logo após o clique, antes de o React Router concluir a navegação (`setSearchParams` é uma *transition*). O teste passou a esperar `getByRole('button', { pressed: true })`, sem enfraquecer a verificação.
- Código morto removido: `registrarAcessoPagina` (App.tsx), `utils/acessoRapido.ts`, `services/acessoRapido.ts` (+ testes) e `components/inspecoes/FiltroSituacaoIS.tsx`. As regras `acessoRapido/{uid}` em `firestore.rules` ficaram (sem leitura no app; retirar quando as regras forem republicadas).
- DS: último botão cru primário fora de `ui/` (`CardFaltasHNRe`) → `Button`; 14 inputs/selects/textarea de Concursos (`ModaisConcurso`, `ModalRegistrarMensagem`, `ModalImportarCsv`, `SheetCandidatoMobile`) → `controlClass`; 4 `text-[11px]` → `text-xs`. Hex fixos (`bg-[#`, `text-[#`) e `active:scale` em `components/`: 0.

### Pendências (situação em 14/11/2026)

- `focus:outline-none` sem `focus-visible`: 45 ocorrências, quase todas legítimas (controles do `Field`/`controlClass` com `focus:ring`, títulos com `tabIndex={-1}`, contêineres de diálogo). Fora disso: células editáveis da `TabelaCandidatos` (2), campos da `Triagem` (3) e 3 inputs compactos de `ModalRegistrarMensagem` (lista de candidatos), que seguem com classes próprias por serem edição inline numa planilha.
- `bg-white rounded-xl` à mão: 26 ocorrências em 18 arquivos (cards de calendário, popovers, cartões de lista). Como `bg-white` é token (`--c-white` → `surface` no escuro), o tema escuro cobre todas; a troca por `Card` fica para a próxima rodada.
- `M10`: Concursos e Usuários ainda mantêm tabela (desktop) e lista (celular) separadas.
- `scripts/testar-regras-firestore.cjs` exige `GOOGLE_APPLICATION_CREDENTIALS` (API de simulação de regras); não roda no ambiente de verificação — roda no CI antes de publicar as regras.
- Build: chunks `StatusTag` (529 kB) e `DGPM406Guide` (408 kB) acima do aviso do Vite; dividir com `manualChunks`.
