# Guia Médico Naval - JRS / HNRe

Este projeto é uma aplicação web progressiva (PWA instalável, com notificações push) desenvolvida para auxiliar a Junta Regular de Saúde (JRS) do Hospital Naval de Recife (HNRe) no seu cotidiano pericial. A ferramenta unifica o acesso rápido a normativas, organiza o trabalho da JRS (Inspeções de Saúde, concursos, pareceres e perícias menores) e automatiza a geração de documentos periciais utilizando **Inteligência Artificial**.

> Documentação técnica: `docs/architecture.md` (arquitetura), `docs/database.md` (dados e regras), `docs/design.md` (design system) e `docs/auditoria-frontend.md` (auditoria e evoluções da interface).

---

## 🚀 Funcionalidades Principais

A aplicação funciona como um canivete suíço digital para os Peritos Médicos, com menus intuitivos que filtram lógicas periciais, dados normativos e emitem relatórios na nuvem.

### 1. Doenças de Lei (`/components/DiseaseGuide.tsx`)
Esta página serve como um "Livro de Bolso" de acesso instantâneo ao rol de doenças previstas nas legislações que garantem isenções ou amparam reformas.
* **Lógica Envolvida:** Utiliza um fluxo de dados baseado em JSON local estático (`/constants.ts`). Expõe uma lista expansível permitindo pesquisa livre em tempo real (`onChange` do campo de busca filtra o nome das patologias e critérios).
* **Funcionalidade:** Exibe componentes retráteis internos detalhando os Critérios Diagnósticos, Exames Subsidiários e Documentação exigida para reconhecimento incontestável da doença na esfera civil-militar. Calculadoras integradas: **CDR** (Clinical Dementia Rating), **Escala de Webster** (Doença de Parkinson, com card de enquadramento) e **Child-Pugh** (Hepatopatia Grave); tabela de classificação da **SIDA/AIDS** e diagnóstico de **Cardiopatia Isquêmica – Pós IAM**.
* **Páginas públicas (sem login):** `/publico/doencas` e `/publico/portaria`, com barra enxuta no celular.

### 2. Concursos e Avaliações (`/components/ConcursosGuide.tsx` e `ExamesGuide.tsx`)
Projetada para os momentos atarefados de inspeção admissional e de rotina.
* **Funcionalidade:** Filtra, a partir de objetos rígidos, os índices incapacitantes. Detalha ponto-a-ponto todos os quadros médicos, medidas antropométricas e acuidade visual que eliminam um candidato nos certames e concursos da Marinha do Brasil. Adicionalmente, mapeia os exames mandatórios exigidos por tipo de finalidade/engajamento.

### 3. Pareceres (`/components/Pareceres.tsx`)
Pedidos de parecer médico por especialidade, com acompanhamento do andamento de cada um.
* **Lista:** tabela (Firestore, coleção `pareceres`) com busca por inspecionado/NIP, filtro por especialidade e situação *Solicitado / Atrasado (20 dias ou mais) / Concluído*; o detalhe abre em barra lateral (bottom sheet no mobile).
* **Novo parecer:** o militar é escolhido por autocomplete na base `militares`, com a finalidade da IS e os quesitos sugeridos por especialidade (editáveis; modelos mantidos pelo Admin em `quesitosParecer`).
* **Output:** um Apps Script preenche o template do Google Docs, o PDF é guardado no Google Drive e o pedido é registrado no Firestore.
* **Enviar para Impressão:** depois de gerar (ou pelo ícone de impressora da lista), o PDF vai por e-mail para a impressão (Apps Script, ação `enviarParecerImpressao`). Nos concursos, o Termo de Recurso e as solicitações de parecer e de exames são enviados para impressão automaticamente.

### 3.1 Inspeções de Saúde (`/components/Inspecoes.tsx` e `/components/inspecoes/`)
Cadastro das IS (exceto as de concursos), agendamento, acompanhamento de prazos e minutas de mensagem.
* **Visões:** tabela agrupada em *Abertas / Em andamento / Finalizadas* (padrão) ou calendário no formato do Google Agenda (Dia · Semana · Mês), com filtro por perito.
* **Campos (coleção `inspecoes`, id = nº da IS):** IS, data de abertura, data/hora da entrevista, finalidade (`public/finalidadesIS.json`), AMP (JRS ou MPI, definido pela finalidade), perito, inspecionado (autocomplete na base *Inspecionados*), situação, status, data do laudo, laudo, observações, restrições (`public/restricoesIS.json`), TIS (`AAA.000.N…`: 3 últimos dígitos do ano, `000` e 1 ou mais dígitos; ex.: `026.000.123`) e DS-1a.
* **Status:** Aberta, Agendada, Reagendada, Faltou, Em auditoria, Em Revisão Ex-officio, Conclusão pendente, Votação pendente, Assinaturas pendentes e TIS assinado. **Atrasada** é dinâmico (IS aberta sem entrevista há mais de 7 dias; 60 dias para o grupo *Benefícios*) e permite a **Minuta de Mensagem de Cancelamento**, que muda o status para *Cancelada* (situação *Finalizada*). IS nova nasce *Aberta*, ou *Agendada* se já tem data de entrevista.
* **Agendamento:** slots de 20 minutos (manhã 07:30–12:00, tarde 13:00–17:00, dias úteis), por perito; a duração da entrevista depende do grupo da finalidade — **Benefícios 60 min**, **Verificações e Términos 30 min**, demais 20 min — e a IS ocupa todos os slots que toca (precisam estar livres e dentro do turno), conforme a competência da finalidade (JRS → Admin e `user_medicos`; MPI → `user_medicos_mpi`). O Admin define os turnos de cada perito (*Turnos dos peritos*, `config/agendaIS`). Cada horário ocupado é reservado numa transação (`agendaSlots`), então não há dois agendamentos no mesmo horário. **Bloqueios** (`bloqueiosAgenda`): de um horário, de um turno, do dia ou de um **período** (início e término, dias inteiros; cria também um evento de dia inteiro, cinza, no Google Agenda com o título `{perito ou Todos os peritos} - {motivo}`, removido junto com o bloqueio), para todos os peritos ou um perito — Admin e Secretaria bloqueiam qualquer perito; um perfil médico (se o Admin liberar a funcionalidade) só bloqueia os próprios turnos.
* **Google Agenda:** IS com data de entrevista são sincronizadas com a agenda **JRS/HNRe** (Apps Script `CodeConcursos.gs`, ação `sincronizarEventoIS`), com o perito convidado pelo Gmail cadastrado em Usuários. Reagendar atualiza o evento; cancelar ou apagar a IS o remove. Depois de colar o `.gs` atualizado, reimplante o script e autorize o serviço Google Agenda. Os eventos das IS também enviam convite por e-mail ao perito (Gmail cadastrado) e têm **notificação padrão de 12 h antes**.
* **Página Concursos (cards):** no desktop os cards ficam empilhados na metade esquerda e, na direita, um calendário marca os dias com candidatos agendados; o clique abre `/concursos/dia/AAAA-MM-DD`, com a tabela de candidatos daquele dia (uma tabela por concurso, agrupadas). A visão em tabela não mostra o calendário.
* **Concursos no calendário:** cada dia com candidatos agendados de concursos *Em andamento* ou *Em breve* aparece como um evento que ocupa o turno da manhã inteiro (07:30–12:00), com o título `{concurso} - X candidatos`, e **bloqueia o turno para todos os peritos**. Vermelho enquanto o dia está aberto; verde quando todos os candidatos do dia estão finalizados. O clique abre a tabela do concurso. No Google Agenda "JRS/HNRe" o evento segue o mesmo padrão (vermelho; verde e título iniciado por ✅ quando o dia é encerrado) a descrição é uma lista com marcadores só com os nomes dos candidatos do dia, **todos os usuários ativos do appweb são convidados** pelo Gmail cadastrado (com convite por e-mail) e a **notificação padrão é 12 h antes**; a sincronização é idempotente (tags privadas nos eventos) e roda em qualquer página, para quem pode agendar.
* **Documentos:** a partir da IS é possível solicitar Pedido de Parecer (formulário de Pareceres já preenchido) e gerar a minuta de resultado.
* **Exames do candidato (PDF + IA):** o menu ⋮ do concurso (*Enviar Exames do Candidato*) e o da linha do candidato (*Enviar Exames (PDF)*) enviam o PDF com os exames entregues na IS de Ingresso. O arquivo é renomeado para `EXAMES_{NOME_SEM_ACENTOS}.pdf` e guardado na pasta do candidato no Drive (mesma lógica dos termos); o Gemini então transcreve os laudos na íntegra — desprezando cabeçalho e rodapé das clínicas — e a transcrição estruturada vai para o Firestore (`candidatos/{matrícula}/exames`). Depois do envio, a linha do candidato ganha um **botão de exames com badge da quantidade transcrita**, que abre uma tela cheia com cada exame num bloco próprio para copiar: hemograma, EAS e bioquímica mostram cada analito separadamente (sem unidade) com o emissor fechando o bloco; Beta-HCG, VDRL e anti-HIV copiam resultado e emissor juntos; exames de imagem, colpocitologia, ECG e toxicológico vão com o laudo integral; qualquer outro exame vem com `# NOME DO EXAME` no topo. No **celular**, a Home ganha o botão *Enviar exames de concurso* (só quando há concurso em andamento), que abre um sheet com autocomplete dos candidatos dos concursos em andamento. Permissão: `concursosJRS.enviarExamesCandidato` (ler a transcrição já enviada é liberado a quem abre a planilha).

### 3.2 Inspecionados (`/components/Militares.tsx`)
Antiga página *Militares*; a base (coleção `militares`) agora reúne **militares, dependentes e pensionistas** (campo `tipo`). *Cadastrar novo* tem duas abas: **Militares** (formulário em cascata) e **Dep/Pens.** — *Dependente* (titular por autocomplete na base, com *Cadastrar novo* se não achar; OM herdada do titular; INSPECIONADO = `DEP-{posto do titular} {NIP} {NOME}`) ou *Pensionista* (nome, NIP e posto/graduação; INSPECIONADO = `PENS-{posto} {NIP} {NOME}`). O endereço antigo `#/militares` continua funcionando.

### Permissões
Em *Usuários → Permissões por Perfil* entram as páginas **Inspeções de Saúde** e **Inspecionados** e as funcionalidades de *Inspeções de Saúde* (cadastrar, agendar, editar, gerar minuta, bloquear agenda) e *Inspecionados* (cadastrar). A configuração de turnos dos peritos, apagar IS e editar/apagar/inativar inspecionados continuam exclusivos do Admin. Publique também as regras: `firebase deploy --only firestore:rules`.

### IS de concurso atrasadas
*Precisa de atenção*, na Início, mostra para todos os perfis a quantidade de **IS de concurso atrasadas** (agendadas antes de hoje e ainda não finalizadas, nos concursos Em andamento/Em breve). O clique abre `/concursos/atrasadas`: uma tabela por concurso, só com as IS atrasadas.

### Triagem das IS de concurso
Na tabela do concurso, ao lado do ícone de copiar o nome, o **user_medicos_mpi** vê, nas IS agendadas para o dia atual, o botão de texto **TRIAR**, que abre o formulário de triagem (modal no desktop, bottom sheet no celular): biometria (altura com vírgula automática, peso, IMC calculado, PAS, PAD, FC), oftalmologia (Snellen S/C e C/C no formato 20/xxx, Ishihara com 15 placas e nº de erros) e alterações na entrevista, no exame clínico e nos exames (texto livre quando marcadas). O formulário mostra os alertas de possível inaptidão (altura < 1,54 e IMC < 18 → R62.8; IMC > 30 → E66.9; PAS > 140 → R03.0, PAD > 100 → R03.1 e FC > 120 → R00.0 após repetir em 15 min; Snellen S/C pior que 20/100 → H52.7 a depender do concurso; Snellen C/C diferente de 20/20 → H52.7; Ishihara com 5 ou mais erros → H53.5). Depois de salvo, o botão vira **TRIADO** (para todos menos a Secretaria), com badge vermelho de alertas + alterações descritas, e abre a seção **Triagem** da barra lateral da IS (Biometria, Oftalmologia e Outros, com botão de copiar o dado bruto e os valores alterados em vermelho; o MPI tem *Editar*). Com a IS finalizada, o botão e a seção somem. Gravado em `concursos/{id}/candidatos/{matrícula}.triagem` (`utils/triagem.ts`, `components/concursos/Triagem.tsx`). O MPI vê um aviso sobre o TRIAR nos 3 primeiros acessos ao app (por aparelho).

### Início: fila de impressão da Secretaria
Para o perfil `user_secretaria`, a Início mostra **Últimos documentos gerados** logo abaixo de *Precisa de atenção*: os documentos enviados por e-mail para impressão (Termo de Recurso e Cientificação, Pedido de Parecer e Solicitação de Exames dos concursos, Pedido de Parecer da página Pareceres), além dos Termos de Cientificação de Resultado dos concursos, que ainda não foram abertos, com contador. Mostra os 5 mais recentes e *Ver todos*; abrir o PDF pressupõe que foi impresso e o tira da lista. Registro em `documentos_gerados` (ver `services/documentosGerados.ts` e `firestore.rules`).

### Notificações push
Avisos no celular/computador mesmo com o app fechado (Firebase Cloud Messaging; service worker em `public/firebase-messaging-sw.js`, cliente em `services/notificacoesPush.ts`, envio em `server.ts`, `/api/notificacoes/evento`).
* **Eventos:** status **Inapto** lançado num concurso → todos os usuários (`{usuario} exarou laudo de inaptidão no {concurso}`); status **IDM** lançado → todos (`{usuario} exarou IDM no {concurso}`); **todas as IS de concurso de um dia finalizadas** → todos (`As IS do {concurso} de hoje foram finalizadas`); **não-Admin abre o app** → só o Admin (`{usuario} logado.`, a cada acesso: ao abrir o app e ao voltar a ele após 5 min em segundo plano). Quem realiza o evento não recebe o próprio aviso. *Meu perfil* tem o botão **Enviar notificação de teste** (mostra o erro do servidor, se houver). O servidor confere o evento no Firestore e evita repetição (`notificacoes_enviadas`).
* **Histórico e badge:** toda notificação fica guardada para cada destinatário em `usuarios/{uid}/notificacoes` (também para quem não ativou o push). O avatar mostra a quantidade de não lidas e o menu do avatar ganha o item **Notificações**; tocar num item (ou no push, cujo link traz `?notif=id`) marca como lida e abre a tela do aviso. O título do push é o tipo do aviso (Laudo de inaptidão, IDM, IS do dia finalizadas, Acesso ao app); o nome do app instalado é **JRS/HNRe App** (no iPhone aparece como "from JRS/HNRe App").
* **Ativação:** convite ao abrir o app (*Ativar* / *Agora não*, que adia 7 dias), por aparelho; status e ativação também em *Meu perfil*. No iPhone/iPad só funciona com o app adicionado à Tela de Início (iOS 16.4+). Tokens em `tokens_push/{token}` (apagado no logout).
* **Configuração:** gere a chave em *Console do Firebase → Configurações do projeto → Cloud Messaging → Certificados push da Web* e cadastre a chave pública como variável do repositório `FIREBASE_VAPID_KEY` (*Settings → Secrets and variables → Actions → Variables*); sem ela o convite não aparece. A service account do Cloud Run precisa do papel **Firebase Cloud Messaging API Admin** (ou *Firebase Admin*). Publique as regras: `firebase deploy --only firestore:rules`.

### 4. Perícia Menor com Leitura Inteligente IA (`/components/PericiaMenor.tsx`)
Registro e consulta das perícias menores dos militares de bordo, no mesmo padrão da página Pareceres.
* **Lista:** tabela (Firestore, coleção `periciasMenores`) com busca por inspecionado, NIP ou CID, filtros de situação (*Todas / Vigentes / Concluídas*) e de tipo de dispensa (*LTS / Restrições*). O detalhe abre em barra lateral e leva ao histórico do militar. Status dinâmico: **Vigente** enquanto hoje ≤ data de término; depois, **Concluída**.
* **Novo (barra lateral; bottom sheet no mobile):**
  * **Fotografar atestado:** a foto é recortada (`react-image-crop`) e enviada ao **Google Gemini 2.5 Flash** (Apps Script, ação `extrair_dados_atestado`), que extrai nome, data, tempo e CID para preencher o formulário. A foto é convertida em PDF (`jspdf`) e guardada no Firebase Storage.
  * **Dados do militar:** campo *Nome* com autocomplete por nome ou NIP (e cadastro rápido quando não encontra); *Serviço do HNRe* vem do cadastro do militar, com "Cadastrar Serviço" quando falta (só para a OM HNRe; nas demais o campo some e nada é gravado).
  * **Atestado:** data, tempo e CID (autocomplete com `public/cid.json`).
  * **Homologação:** tempo homologado (máx. 20 dias), dispensas em modal com caixas de seleção ("TODAS AS ATIVIDADES" é exclusiva) e VDF (caixa de seleção). O perito é o médico logado.
* **Término:** `dataTermino` = data do atestado + tempo homologado − 1, calculada ao gravar.
* **Histórico:** as perícias da antiga aba `Pericia_Menor` foram migradas (`scripts/migrar-pericias-menores.mjs`) e ligadas aos militares pelo NIP. A Guia de Encaminhamento (Google Docs) foi removida.

### 5. Roteiro JRS (`/components/RoteiroJRS.tsx`)
Trilha de capacitação em formato *accordion* (lista expansível) com aulas, normas e infográficos, abrindo vídeos e imagens em modais de visualização sobrepostos à tela. O material de formação (vídeos, infográficos e apresentações) tem páginas próprias (seção 8).

### 6. Normas e Legislação (`/components/DGPM406Guide.tsx`, `PortariaGuide.tsx` e `LawReference.tsx`)
* **DGPM-406 e Portaria:** leitura navegável das normas (a Portaria também tem página pública).
* **Legislação:** lista da coleção `legislacao` (Firestore) com o PDF de cada norma no Firebase Storage, aberto em modal de tela cheia; o Admin cadastra novas normas pela própria página.
* Documentos em Markdown são renderizados por `MarkdownDocPage.tsx`/`MarkdownContent.tsx`.

### 7. Início (painel de trabalho)
*Precisa de atenção* (pareceres atrasados, perícias vigentes, IS de hoje, concursos em andamento e do dia, IS de concurso atrasadas, senha temporária), *Últimos documentos gerados* (Secretaria), Próximas Inspeções, Pareceres não concluídos, Perícias Menores Vigentes, Acesso rápido (editável), **Próximas férias** (bloqueios da agenda com motivo FÉRIAS), Agenda de inspeções e Avisos.

### 8. Formação
**Casos Periciais**, **Vídeos** (YouTube), **Infográficos** (imagens no Storage), **Apresentações** (Google Slides, Canva ou GitHub Pages, abertas em tela cheia) e **Roteiro JRS**. Vídeos, infográficos e apresentações são cadastrados pelo Admin na própria página (coleções `videos`, `infograficos`, `apresentacoes`); quem abriu cada item fica registrado para o Admin (`visualizacoesExtras`).

### 9. Usuários e Perfil
* **Usuários (Admin):** cadastro, permissões por perfil (matriz `config/permissoes`), redefinir senha e **excluir usuário inativo** (servidor `/api/admin/excluir-usuario`). O Admin pode **Visualizar como** outro perfil.
* **Perfil:** contato, foto, senha e **Notificações** (status neste aparelho, ativar e enviar notificação de teste).

---

## 📱 Navegação

Menu lateral fixo (recolhível; drawer no celular) com as categorias:

1. **Trabalho:** Inspeções de Saúde, Inspecionados, Concursos, Perícia Menor, Pareceres e Mensagens.
2. **Consulta:** Doenças de Lei, Exames, Índices, DGPM-406, Portaria e Legislação.
3. **Formação:** Casos Periciais, Vídeos, Infográficos, Apresentações e Roteiro.
4. **Administração** (Admin): Usuários.

Cada tela tem URL própria (`HashRouter`, tabela em `config/routes.ts`). O menu do avatar traz Perfil, **Notificações** (com contador de não lidas) e Sair.

---

## 🎨 Identidade Visual e Padrões de Design (UI/UX)

A interface do usuário foi desenhada com estrita observância à Identidade Visual da Marinha do Brasil, focando em *"Soberania Institucional, Precisão Médica e Clareza Operacional"*:
* **Cores:** Azul Marinho Institucional (`#050F41`), Destaque Dourado (`#FAB932`), Verde Sucesso (`#079551`) e Superfícies Cinza-Gelo (`#F3F5F7`).
* **Design:** sistema de design único (ver `docs/auditoria-frontend.md`): Montserrat autohospedada em escala fixa (28/20/16/14/12), dois raios (8 controles · 14 cards), uma só sombra (sobreposições), ouro apenas como indicador/foco e verde apenas como estado. Layout com sidebar fixa de 240 px (recolhível), topbar com breadcrumb e busca global, e conteúdo em larguras `reading` 720 / `form` 640 / `data` 1200.

---

## 💻 Tecnologias e Dependências

* **Framework Web:** React 19 + TypeScript + Vite.
* **Estilização:** Tailwind CSS 3.4 compilado pelo Vite/PostCSS (`tailwind.config.js` com paleta fechada e `styles/tokens.css`); `scripts/verificar-ds.mjs` falha o build com classes fora do DS.
* **Navegação:** `react-router-dom` v7 com `HashRouter` (GitHub Pages) — cada tela e subnível tem URL própria.
* **Ícones:** Google Material Symbols (shim `components/ui/icons.tsx`).
* **Firebase:** Authentication, Firestore (dados operacionais; ver `docs/database.md`), Storage (PDFs e imagens) e **Cloud Messaging** (push); regras em `firestore.rules` e `storage.rules` (publicadas à parte).
* **Servidor (Cloud Run):** `server.ts` (Node + Express + Firebase Admin SDK) — login por NIP e por QR code, operações de Admin, notificações e Gemini; publicado por `.github/workflows/deploy-cloud-run.yml`.
* **Google Apps Script (projeto único):** geração de PDFs a partir de templates, gravação no Google Drive, e-mails para impressão, sincronização com o Google Agenda e leitura de documentos pelo Gemini (`apps-script/concursos/`, publicação manual — ver `docs/apps-script-deploy.md`). As antigas planilhas do Google Sheets não são mais usadas.
* **Inteligência Artificial:** Google Gemini para leitura de atestados, transcrição de mensagens administrativas e de exames de candidatos.
* **PWA:** `public/manifest.webmanifest` (app **JRS/HNRe App**) e service worker do push (`public/firebase-messaging-sw.js`).
* **Documentos locais:** `jspdf` (PDF do atestado), `pdf-lib` (junção de termos), `react-image-crop` (recorte de imagem), `qrcode` (instalação/login no celular).
* **Variáveis do repositório (build):** `API_BASE_URL` (URL do Cloud Run) e `FIREBASE_VAPID_KEY` (chave pública do push).

---

## 📁 Estrutura de Pastas e Arquivos

- `/` (Raiz)
  - `App.tsx` *(shell autenticado: sessão, permissões, avisos pós-login, notificações)*
  - `index.tsx` / `index.html` *(entrada; manifesto e ícones)*
  - `server.ts` *(API do Cloud Run)*
  - `firestore.rules` / `storage.rules` / `firebase.json`
  - `constants.ts`, `types.ts`, `vite.config.ts`, `tailwind.config.js`, `package.json`
- `apps-script/` *(projeto único: `concursos/CodeConcursos.gs` e `concursos/CodePrincipal.gs`; IDs em `projetos.json`)*
- `components/`
  - `Home.tsx`, `Inspecoes.tsx`, `Militares.tsx`, `ConcursosJRS.tsx`, `Pareceres.tsx`, `PericiaMenor.tsx`, `UsuariosManagement.tsx`, `Perfil.tsx` *(telas de trabalho)*
  - `DiseaseGuide.tsx`, `ExamesGuide.tsx`, `ConcursosGuide.tsx`, `DGPM406Guide.tsx`, `PortariaGuide.tsx`, `LawReference.tsx` *(consulta)*
  - `CasosPericiais.tsx`, `Videos.tsx`, `Infograficos.tsx`, `Apresentacoes.tsx`, `RoteiroJRS.tsx` *(formação)*
  - `NotificacoesConvite.tsx`, `NotificacoesPainel.tsx`, `ErroFatal.tsx`, `Raiz.tsx`
  - `concursos/` *(detalhe da IS, exames do candidato, triagem, calendário)*
  - `inspecoes/` *(agenda, agendamento, bloqueios, minutas)*
  - `militares/`, `pareceres/`, `periciaMenor/`, `publico/`, `sections/`
  - `shell/` *(sidebar, topbar, breadcrumb, busca, menu do usuário)* e `ui/` *(primitivos do design system)*
- `config/` *(rotas, navegação, permissões, endpoints)*
- `services/` *(Firestore, Storage, Drive/Apps Script, agenda, push, fila de impressão, auditoria)*
- `utils/` *(regras puras: datas, inspeções, minutas, exames, triagem, PWA)*
- `hooks/`, `context/`, `styles/`
- `public/` *(manifesto, service worker, ícones das notificações e catálogos JSON)*
- `scripts/` *(migrações para o Firebase e verificação do design system)*
- `docs/` *(arquitetura, banco de dados, design, auditoria, deploy do Apps Script)*
