# Guia Médico Naval - JRS / HNRe

Este projeto é uma aplicação web progressiva (PWA - interface responsiva mobile-first) desenvolvida para auxiliar a Junta Regular de Saúde (JRS) do Hospital Naval de Recife (HNRe) no seu cotidiano pericial, unificando acesso rápido a normativas e facilitando a geração de documentos.

## 🎯 Funcionalidades Principais

A aplicação funciona como um canivete suíço digital para os Peritos Médicos, com menus intuitivos que filtram lógicas periciais, dados normativos e emitem relatórios em nuvem.

### 1. Doenças de Lei (`/components/DiseaseGuide.tsx`)
Esta página serve como um "Livro de Bolso" de acesso instantâneo ao rol de doenças previstas nas legislações que garantem isenções ou amparam reformas.
* **Lógica Envolvida**: A página usa um fluxo de dados baseado JSON local estático provindo de `/constants.ts`. Ela expõe uma lista (em formato de "Accordion" ou "Cards") permitindo pesquisa livre em tempo real (`onChange` do campo de busca filtra nome das patologias).
* **Funcionalidade**: Ela exibe abas e componentes retráteis internos detalhando os Critérios Diagnósticos, Exames Subsidiários e Documentação exigida (conforme previstos na **DGPM-406**) para reconhecimento incontestável da doença na esfera civil-militar.

### 2. Concursos (`/components/ConcursosGuide.tsx`)
Projetada para os momentos atarefados de inspeção admissional.
* **Lógica Envolvida**: A tela filtra, a partir de objetos rígidos definidos, os índices incapacitantes.
* **Funcionalidade**: Dividido em blocos lógicos como "Oftalmologia", "Ortopedia", "Odontologia", entre outros, detalha ponto-a-ponto todos os quadros médicos e medidas antropométricas ou acuidade analítica que eliminam um candidato nos certames e concursos da Marinha do Brasil, consolidado nos apêndices da normatização. 

### 3. Exames (`/components/ExamesGuide.tsx`)
Página essencial de consulta aos perfis bioquímicos, cardiológicos e de imagem previstos e suas validades de aceitação.
* **Lógica Envolvida**: Semelhante à de Doenças e Concursos, serve como painel de dados.
* **Funcionalidade**: Mostra o rol dos exames mandatórios exigidos por tipo de finalidade / engajamento, permitindo que a junta saúde cheque rapidamente se um militar, candidato, ou RM2 detém os pacotes laboratoriais, as sorologias corretas ou traçados complementares no prazo de validade estipulado.

### 4. Geração de Pareceres Periciais (`/components/Pareceres.tsx`)
Um verdadeiro sistema interativo Fullstack Integrado.
* **Dinâmica / Lógica**: O front-end React coleta a identificação do perito, a Finalidade, e a Especialidade. O sistema de formulário implementa autocompletar e mascara para o NIP (Número de Identificação Pessoal do Militar). O pulo do gato encontra-se na comunicação com um serviço Google Apps Script (GAS) deployado como API Rest.
  * O aplicativo (sob o gancho `searchNip`) tenta buscar o número preenchido numa planilha-banco-de-dados (`Militares`).
  * Emcontrando o NIP, retorna read-only, evitando erros de digitação de nomes.
  * Se NÃO encontra, exibe inputs e logicamente sugere e preenche prefixos (se CC/CT de RM2, Oficial, Carreira, etc) para compor a string de "Inspecionado".
  * Um endpoint `POST` salva na nuvem.
* **Output / Funcionalidade**: Ao submeter o botão dourado, o macro na web copia o template nativo do Google DOCs específico por Especialidade selecionado, injeta a data, histórico médico e as tags textuais com replace exatos. Logo depois converte em PDF, arquiva na pasta de subdiretório do drive do Inspecionado (ou cria uma caso não exista) e manda PDF/ODT via anexo pro email institucional do próprio perito. Tudo isso enquanto uma modal de `Loading` trava os cliques do cirurgião. O histórico do que foi feito e os links diretos para PDFs também alimentam a planilha como um diário em Cloud. 

## 🗺️ Panorama dos Menus Inferiores (Bottom Nav)
Para fins de eficiência em dispositivos móveis, a navegação ocorre em substituição de rotas através do `currentView` hookeado no componente central `App.tsx` que troca os subcomponentes montados na área de visualização principal. A Barra se divide em 5 blocos visuais de ações em grupo:

1. **Benefícios** (Ícone Estetoscópio): Um modal do tipo "FAB expansivo" que dá atalho às páginas de `Doenças de Lei`, verificação de leis para `Finalidades` da perícia, e a indexação da `Portaria` do ministério da defesa. Assuntos focados aos direitos e benéfices diretos no trato com o inativo/ativo.
2. **Concursos** (Ícone Prancheta Check): Link direto aos vereditos dos critérios eliminatórios p/ admissão e reengajamentos (`/components/ConcursosGuide.tsx`).
3. **Exames** (Ícone Exames Laboratoriais): Acesso direto ao rol dos exames mandatórios estipulados para verificação da saúde com validade na junta médica.
4. **DGPM-406** (Ícone Âncora): O baluarte da MB; se expande nos Anexos, Capítulos e em Resumos, entregando versão digital otimizada da enciclopédia central médica da força.
5. **Extras** (Ícone Widgets): Congrega utilidades em um menu colapsado, contendo a navegação para: `Infográficos` didáticos, `Leis` complementares avulsas civil-militares, `Aulas`, videoteca interativa (`Vídeos`), e o sistema gerador de laudos automatizados `Pareceres`.

## 🎨 Identidade Visual e Padrões de Design (UI/UX)
A interface do usuário foi desenhada com estrita observância à Identidade Visual da Marinha do Brasil, focando em *"Soberania Institucional, Precisão Médica e Clareza Operacional"*:
* **Cores**: Azul Marinho Institucional (`#050F41`), Destaque Dourado (`#B8860B`) e Superfíces Cinza-Gelo leves p/ mitigar cansaço (`#FBF9F8`).
* **Botões & Modais**: Contornos sutis com drop-shadow brandos, animações hover/active e ícones limpos em fio. Layouts em formato mobile "Cards".

## ⚙️ Tecnologias e Dependências
* **Framework Web**: React 19 + TypeScript + Vite.
* **Componentes**: CSS utilitário com Tailwind CSS. 
* **Backend Autônomo (Google Apps Script)**: Todo script de persistência e orquestração drive está isolçado no `Code.gs`, consumindo Planilhas (Sheets) como Banco de Dados relacional, Google Docs e Drive para sistema de arquivos baseados em templates placeholders e GmailApp para envio de cópias originais ao médico.

## 📂 Estrutura de Pastas e Arquivos

Abaixo encontra-se a arquitetura de arquivos e pastas no repositório deste projeto:

- `/` (Raiz)
  - `App.tsx` (Componente de Roteamento Principal e Navigation Layout)
  - `Code.gs` (Script do Backend em GAS)
  - `constants.ts` (Banco de Dados Estático)
  - `index.html` (Index da aplicação PWA)
  - `index.tsx` (Arquivo de montagem React / Entry point)
  - `types.ts` (Tipagens TypeScript TS do ecossistema)
  - `vite.config.ts`, `tsconfig.json`, `package.json`, `cleanup.js` (Configuração)
  
- `/services`
  - `extrasService.ts` (Serviços e APIs extras)

- `/components` (Árvore de Componentes Renderizados)
  - `Aulas.tsx`
  - `ConcursosGuide.tsx`
  - `DGPM406AnexosGuide.tsx`
  - `DGPM406Guide.tsx`
  - `DiseaseGuide.tsx`
  - `ExamesGuide.tsx`
  - `FinalidadesGuide.tsx`
  - `Footer.tsx`
  - `Header.tsx`
  - `Infograficos.tsx`
  - `LawReference.tsx`
  - `Pareceres.tsx`
  - `PortariaGuide.tsx`
  - `Resumos.tsx`
  - `Videos.tsx`

- `/components/sections` (Subseções de componentes modulares de doenças)
  - `AlienacaoMentalSection.tsx`
  - `CardiopatiaGraveSection.tsx`
  - `CegueiraSection.tsx`
  - `HepatopatiaRadiacaoSection.tsx`
  - `IntroSection.tsx`
  - `OtherDiseasesSection.tsx`

- `/components/resumos-dgpm` (Leitor interativo interconectado da normativa 406)
  - `/components` (Componentes exclusivos internos do reader)
    - `HierarchyNode.tsx`, `Icon.tsx`, `InfoCard.tsx`, `Modal.tsx`, `Section.tsx`
  - `/pages` (Subpáginas para cada capítulo oficial resumido)
    - `Capitulo1.tsx`, `Capitulo2.tsx`, `Capitulo3.tsx`, `Capitulo4.tsx`, `Capitulo6.tsx`
    - `Capitulo7.tsx`, `Capitulo8.tsx`, `Capitulo9.tsx`, `Capitulo10.tsx`, `Capitulo11.tsx`, `Capitulo13.tsx`, `Capitulo17.tsx`
