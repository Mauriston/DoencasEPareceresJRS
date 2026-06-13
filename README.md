# Guia Médico Naval - JRS / HNRe

Este projeto é uma aplicação web progressiva (PWA - interface responsiva mobile-first) desenvolvida para auxiliar a Junta Regular de Saúde (JRS) do Hospital Naval de Recife (HNRe) no seu cotidiano pericial, unificando o acesso rápido a normativas, trilhas de estudo e facilitando a geração de documentos.

---

## 🚀 Funcionalidades Principais

A aplicação funciona como um canivete suíço digital para os Peritos Médicos, com menus intuitivos que filtram lógicas periciais, dados normativos e emitem relatórios em nuvem.

### 1. Doenças de Lei (`/components/DiseaseGuide.tsx`)
Esta página serve como um "Livro de Bolso" de acesso instantâneo ao rol de doenças previstas nas legislações que garantem isenções ou amparam reformas.
* **Lógica Envolvida:** Utiliza um fluxo de dados baseado em JSON local estático (`/constants.ts`). Expõe uma lista expansível permitindo pesquisa livre em tempo real (`onChange` do campo de busca filtra o nome das patologias e critérios).
* **Funcionalidade:** Exibe componentes retráteis internos detalhando os Critérios Diagnósticos, Exames Subsidiários e Documentação exigida para reconhecimento incontestável da doença na esfera civil-militar. Inclui também uma **Calculadora de CDR (Clinical Dementia Rating)** integrada.

### 2. Concursos e Avaliações (`/components/ConcursosGuide.tsx` e `ExamesGuide.tsx`)
Projetada para os momentos atarefados de inspeção admissional e de rotina.
* **Funcionalidade:** Filtra, a partir de objetos rígidos, os índices incapacitantes. Detalha ponto-a-ponto todos os quadros médicos, medidas antropométricas e acuidade visual que eliminam um candidato nos certames e concursos da Marinha do Brasil. Adicionalmente, mapeia os exames mandatários exigidos por tipo de finalidade/engajamento.

### 3. Geração de Pareceres Periciais (`/components/Pareceres.tsx`)
Um verdadeiro sistema interativo Fullstack Integrado.
* **Dinâmica / Lógica:** O front-end React coleta a identificação do perito, a Finalidade e a Especialidade, aplicando autocompletar via NIP. O sistema comunica-se com um serviço Google Apps Script (GAS) implementado como API Rest.
* **Output:** O macro na web copia o template nativo do Google Docs específico, injeta os dados (data, histórico, tags textuais), converte em PDF, arquiva na nuvem e envia as cópias originais para o e-mail institucional do perito, mantendo um log centralizado.

### 4. Roteiro JRS e Material de Estudo (`/components/RoteiroJRS.tsx` e `Estudo.tsx`)
Ambiente de capacitação contínua e trilhas de aprendizagem.
* **Funcionalidade:** O *Roteiro JRS* apresenta uma trilha em formato *Accordion* (lista expansível) com aulas, normas e infográficos, abrindo vídeos do YouTube e imagens do Imgur em modais de visualização rica sobrepostos à tela. O *Material de Estudo* divide o conhecimento em 3 abas limpas: Aulas, Vídeos e Livros (Artigos).

### 5. Normas do HNRe e Legislação (`/components/HNReGuide.tsx`)
Leitor nativo de normativas e diretrizes locais.
* **Funcionalidade:** Renderiza de forma inteligente textos complexos em Markdown (como o Regimento Interno e Ordem Interna da JRS), aplicando negrito automático em Artigos e Incisos, com botões flutuantes (FABs) de atalho para download dos PDFs oficiais.

---

## 📱 Panorama dos Menus Inferiores (Bottom Nav)

A navegação ocorre em substituição de rotas através do Hook `currentView` no componente central `App.tsx`, garantindo fluidez *Single Page Application*. A barra divide-se em 5 blocos:

1. **Benefícios** (*Ícone Estetoscópio*): Acesso a `Doenças de Lei`, verificação de `Finalidades` da perícia, e à `Portaria` do ministério da defesa (foco em direitos do inativo/ativo).
2. **Avaliações** (*Ícone Prancheta*): Link direto aos vereditos dos critérios eliminatórios para `Concursos` e `Exames` obrigatórios.
3. **Documentos** (*Ícone Arquivo*): Módulo de geração de `Pareceres` automatizados e consulta de `Templates`.
4. **Normas** (*Ícone Martelo*): Agrupa o baluarte da MB (`DGPM-406`), a aba de normas internas (`HNRe`) e a `Legislação` pura.
5. **Extras** (*Ícone Widgets*): Congrega utilidades como `Casos` interativos, ambiente de `Estudo`, `Infográficos`, `Resumos` e a trilha do `Roteiro JRS`.

---

## 🎨 Identidade Visual e Padrões de Design (UI/UX)

A interface do usuário foi desenhada com estrita observância à Identidade Visual da Marinha do Brasil, focando em *"Soberania Institucional, Precisão Médica e Clareza Operacional"*:
* **Cores:** Azul Marinho Institucional (`#050F41`), Destaque Dourado (`#FAB932`), Verde Sucesso (`#079551`) e Superfícies Cinza-Gelo (`#F3F5F7`).
* **Design:** Layout mobile-first, componentes em formato "Cards" arredondados (`rounded-2xl`), sombras suaves, divisores discretos (`divide-y`) e ícones minimalistas da biblioteca Lucide React.

---

## 💻 Tecnologias e Dependências

* **Framework Web:** React 19 + TypeScript + Vite.
* **Estilização:** CSS utilitário com Tailwind CSS.
* **Ícones:** Lucide React e Google Material Symbols.
* **Exportação Local:** `jspdf` para geração de relatórios instantâneos.
* **Backend Autônomo (Google Apps Script):** Orquestração no `Code.gs` utilizando Google Sheets como base de dados relacional, Google Docs para manipulação de *templates* e GmailApp para envio seguro de e-mails.

---

## 📁 Estrutura de Pastas e Arquivos

Abaixo encontra-se a arquitetura atualizada de ficheiros e diretórios no repositório deste projeto:

- `/` (Raiz)
  - `App.tsx` *(Componente de Roteamento Principal e Navigation Layout)*
  - `Code.gs` *(Script do Backend em GAS)*
  - `constants.ts` *(Banco de Dados Estático)*
  - `index.html` *(Index da aplicação PWA)*
  - `index.tsx` *(Arquivo de montagem React / Entry point)*
  - `types.ts` *(Tipagens TypeScript TS do ecossistema)*
  - `vite.config.ts`, `tsconfig.json`, `package.json`, `cleanup.js` *(Configurações)*

- `/services`
  - `extrasService.ts` *(Serviços, extração de URLs e parsing de planilhas)*
  - `firebaseAuth.ts` *(Integrações de autenticação e permissões)*

- `/components` (Árvore de Componentes Renderizados)
  - `Aulas.tsx` / `Videos.tsx`
  - `ConcursosGuide.tsx` / `ExamesGuide.tsx` / `FinalidadesGuide.tsx`
  - `DGPM406Guide.tsx` / `HNReGuide.tsx`
  - `RegimentoHNRe.tsx` / `OrdemInternaJRS.tsx` *(Renderizadores nativos Markdown)*
  - `DiseaseGuide.tsx` / `CasosPericiais.tsx` / `Estudo.tsx` / `RoteiroJRS.tsx`
  - `Header.tsx` / `Footer.tsx`
  - `Infograficos.tsx` / `Resumos.tsx` / `Artigos.tsx`
  - `LawReference.tsx` / `PortariaGuide.tsx`
  - `Pareceres.tsx` / `TemplatesGuide.tsx`
  - `ArtigoPericiaMedica.tsx`, `ArtigoPerfilPerito.tsx`, etc. *(Sub-páginas de artigos)*

- `/components/sections`
  - Seções de componentes modulares de doenças (Ex: `AlienacaoMentalSection.tsx`, `CardiopatiaGraveSection.tsx`, etc.)

- `/components/resumos-dgpm`
  - Leitor interativo da normativa 406 (com páginas próprias para os Capítulos: `Capitulo1.tsx`, `Capitulo2.tsx`, etc.)
