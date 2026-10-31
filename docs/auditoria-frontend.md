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
| Início como painel (Precisa de atenção, Próximas Inspeções, mini calendário, Próximas férias na coluna direita, IS de concurso atrasadas, fila de impressão da Secretaria) | `Secao` (card com título, ação e badge), linhas de 56–64 px com chevron |
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
