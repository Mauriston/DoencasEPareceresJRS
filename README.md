# Guia Médico Naval - JRS / HNRe

Este projeto é uma aplicação web progressiva (PWA - interface responsiva mobile-first) desenvolvida para auxiliar a Junta Regular de Saúde (JRS) do Hospital Naval de Recife (HNRe) no seu cotidiano pericial. A ferramenta unifica o acesso rápido a normativas, trilhas de estudo e automatiza a geração de documentos periciais utilizando **Inteligência Artificial e Visão Computacional**.

---

## 🚀 Funcionalidades Principais

A aplicação funciona como um canivete suíço digital para os Peritos Médicos, com menus intuitivos que filtram lógicas periciais, dados normativos e emitem relatórios na nuvem.

### 1. Doenças de Lei (`/components/DiseaseGuide.tsx`)
Esta página serve como um "Livro de Bolso" de acesso instantâneo ao rol de doenças previstas nas legislações que garantem isenções ou amparam reformas.
* **Lógica Envolvida:** Utiliza um fluxo de dados baseado em JSON local estático (`/constants.ts`). Expõe uma lista expansível permitindo pesquisa livre em tempo real (`onChange` do campo de busca filtra o nome das patologias e critérios).
* **Funcionalidade:** Exibe componentes retráteis internos detalhando os Critérios Diagnósticos, Exames Subsidiários e Documentação exigida para reconhecimento incontestável da doença na esfera civil-militar. Inclui também uma **Calculadora de CDR (Clinical Dementia Rating)** integrada.

### 2. Concursos e Avaliações (`/components/ConcursosGuide.tsx` e `ExamesGuide.tsx`)
Projetada para os momentos atarefados de inspeção admissional e de rotina.
* **Funcionalidade:** Filtra, a partir de objetos rígidos, os índices incapacitantes. Detalha ponto-a-ponto todos os quadros médicos, medidas antropométricas e acuidade visual que eliminam um candidato nos certames e concursos da Marinha do Brasil. Adicionalmente, mapeia os exames mandatórios exigidos por tipo de finalidade/engajamento.

### 3. Pareceres (`/components/Pareceres.tsx`)
Pedidos de parecer médico por especialidade, com acompanhamento do andamento de cada um.
* **Lista:** tabela (Firestore, coleção `pareceres`) com busca por inspecionado/NIP, filtro por especialidade e situação *Solicitado / Atrasado (20 dias ou mais) / Concluído*; o detalhe abre em barra lateral (bottom sheet no mobile).
* **Novo parecer:** o militar é escolhido por autocomplete na base `militares`, com a finalidade da IS e os quesitos sugeridos por especialidade (editáveis; modelos mantidos pelo Admin em `quesitosParecer`).
* **Output:** um Apps Script preenche o template do Google Docs, o PDF é guardado no Google Drive e o pedido é registrado no Firestore.

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

### 5. Roteiro JRS e Material de Estudo (`/components/RoteiroJRS.tsx` e `Estudo.tsx`)
Ambiente de capacitação contínua e trilhas de aprendizagem.
* **Funcionalidade:** O *Roteiro JRS* apresenta uma trilha em formato *Accordion* (lista expansível) com aulas, normas e infográficos, abrindo vídeos do YouTube e imagens do Imgur em modais de visualização rica sobrepostos à tela. O *Material de Estudo* divide o conhecimento em 3 abas limpas: Aulas, Vídeos e Livros (Artigos).

### 6. Normas do HNRe e Legislação (`/components/HNReGuide.tsx`)
Leitor nativo de normativas e diretrizes locais.
* **Funcionalidade:** Renderiza de forma inteligente textos complexos em Markdown (como o Regimento Interno e Ordem Interna da JRS), aplicando negrito automático em Artigos e Incisos, com botões flutuantes (FABs) de atalho para download dos PDFs oficiais.

---

## 📱 Panorama dos Menus Inferiores (Bottom Nav)

A navegação ocorre em substituição de rotas através do Hook `currentView` no componente central `App.tsx`, garantindo fluidez *Single Page Application*. A barra divide-se em 5 blocos:

1. **Benefícios** (*Ícone Estetoscópio*): Acesso a `Doenças de Lei`, verificação de `Finalidades` da perícia, e à `Portaria` do ministério da defesa (foco em direitos do inativo/ativo).
2. **Avaliações** (*Ícone Prancheta*): Link direto aos vereditos dos critérios eliminatórios para `Concursos` e `Exames` obrigatórios.
3. **Documentos** (*Ícone Arquivo*): Módulo de geração de `Pareceres` automatizados, e formulário inteligente de `Perícia Menor`.
4. **Normas** (*Ícone Martelo*): Agrupa o baluarte da MB (`DGPM-406`), a aba de normas internas (`HNRe`) e a `Legislação` pura.
5. **Extras** (*Ícone Widgets*): Congrega utilidades como `Casos` interativos, ambiente de `Estudo`, `Infográficos`, `Resumos` e a trilha do `Roteiro JRS`.

---

## 🎨 Identidade Visual e Padrões de Design (UI/UX)

A interface do usuário foi desenhada com estrita observância à Identidade Visual da Marinha do Brasil, focando em *"Soberania Institucional, Precisão Médica e Clareza Operacional"*:
* **Cores:** Azul Marinho Institucional (`#050F41`), Destaque Dourado (`#FAB932`), Verde Sucesso (`#079551`) e Superfícies Cinza-Gelo (`#F3F5F7`).
* **Design:** sistema de design único (ver `docs/auditoria-frontend.md`): Montserrat autohospedada em escala fixa (28/20/16/14/12), dois raios (8 controles · 14 cards), uma só sombra (sobreposições), ouro apenas como indicador/foco e verde apenas como estado. Layout com sidebar fixa de 240 px (recolhível), topbar com breadcrumb e busca global, e conteúdo em larguras `reading` 720 / `form` 640 / `data` 1200.

---

## 💻 Tecnologias e Dependências

* **Framework Web:** React 19 + TypeScript + Vite.
* **Estilização:** Tailwind CSS 3.4 compilado pelo Vite/PostCSS (`tailwind.config.js` com paleta fechada e `styles/tokens.css`).
* **Navegação:** `react-router-dom` v7 com `HashRouter` (GitHub Pages) — cada tela e subnível tem URL própria.
* **Ícones:** Google Material Symbols (shim `components/ui/icons.tsx`).
* **Processamento de Imagens:** `react-image-crop` para interações de recorte na web, manipulado com a API Canvas nativa do HTML5.
* **Exportação Local:** `jspdf` para geração de relatórios instantâneos.
* **Dados e Arquivos (Firebase):** Authentication, Firestore (`militares`, `pareceres`, `periciasMenores`, `legislacao`, `quesitosParecer`, `concursos`, entre outras) e Storage (PDFs); regras em `firestore.rules` e `storage.rules`.
* **Backend Autônomo (Google Apps Script):** Geração de PDFs a partir de templates, leitura de atestados pelo Gemini e listas de apoio (planilhas), com Google Docs para *templates* e GmailApp para e-mails.
* **Inteligência Artificial:** Integração via REST API com o modelo **Google Gemini 2.5 Flash** para leitura de documentos via Visão Computacional (OCR) estruturado em JSON.

---

## 📁 Estrutura de Pastas e Arquivos

Abaixo encontra-se a arquitetura atualizada de ficheiros e diretórios no repositório deste projeto:

- `/` (Raiz)
  - `App.tsx` *(Componente de Roteamento Principal e Navigation Layout)*
  - `apps-script/` *(Código dos projetos Google Apps Script: `principal/Code.gs` e `concursos/CodeConcursos.gs`/`CodePrincipal.gs`; publicados colando no editor do Apps Script — ver `docs/apps-script-deploy.md`)*
  - `scripts/` *(Cargas e migrações para o Firebase, ex.: `migrar-pericias-menores.mjs`)*
  - `constants.ts` *(Banco de Dados Estático)*
  - `index.html` *(Index da aplicação PWA)*
  - `index.tsx` *(Arquivo de montagem React / Entry point)*
  - `types.ts` *(Tipagens TypeScript TS do ecossistema)*
  - `vite.config.ts`, `tsconfig.json`, `package.json`, `cleanup.js` *(Configurações)*

- `/services`
  - `extrasService.ts` *(Serviços, extração de URLs e parsing de planilhas)*
  - `firebaseAuth.ts` *(Integrações de autenticação e permissões)*
  - `firestoreMilitares.ts` / `firestorePareceres.ts` / `firestorePericiasMenores.ts` *(Coleções do Firestore; status e data de término da Perícia Menor)*
  - `atestadoIA.ts` *(Leitura do atestado pelo Gemini via Apps Script)*

- `/components` (Árvore de Componentes Renderizados)
  - `Aulas.tsx` / `Videos.tsx`
  - `ConcursosGuide.tsx` / `ExamesGuide.tsx` / `FinalidadesGuide.tsx`
  - `DGPM406Guide.tsx` / `HNReGuide.tsx`
  - `RegimentoHNRe.tsx` / `OrdemInternaJRS.tsx` *(Renderizadores nativos Markdown)*
  - `DiseaseGuide.tsx` / `CasosPericiais.tsx` / `Estudo.tsx` / `RoteiroJRS.tsx`
  - `Header.tsx` / `Footer.tsx`
  - `Infograficos.tsx` / `Resumos.tsx` / `Artigos.tsx`
  - `LawReference.tsx` / `PortariaGuide.tsx`
  - `Pareceres.tsx` / `PericiaMenor.tsx` / `PericiaMenorDetalhe.tsx`
  - `pareceres/` / `periciaMenor/` *(Formulários em barra lateral, detalhes e modais de cada página)*
  - `ArtigoPericiaMedica.tsx`, `ArtigoPerfilPerito.tsx`, etc. *(Sub-páginas de artigos)*

- `/components/sections`
  - Seções de componentes modulares de doenças (Ex: `AlienacaoMentalSection.tsx`, `CardiopatiaGraveSection.tsx`, etc.)

- `/components/resumos-dgpm`
  - Leitor interativo da normativa 406 (com páginas próprias para os Capítulos: `Capitulo1.tsx`, `Capitulo2.tsx`, etc.)
