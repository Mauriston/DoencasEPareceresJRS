# Redação pericial — conclusão de IS, entrevista e exames (TIS)

Carregue ao redigir IS (entrevista, exame, conclusão) ou ao transcrever documentos anexados.

> Para o pedido completo **"Redija uma IS {{Finalidade}} de um(a) …"**, comece por `roteamento-finalidade.md` (identifica capítulo/norma) e leia o texto-fonte exato **antes** de redigir. A justificativa cita o dispositivo lido na fonte.

## FORMATO DE SAÍDA (obrigatório)
Ao retornar Entrevista, Exame Clínico e Conclusão, mostre **cada um dos 3 em seu próprio bloco de código `txt`** (três blocos separados).

**Rótulo fora do bloco [correção do Presidente, 19SET2026]:** o rótulo (`ENTREVISTA`, `EXAME CLÍNICO`, `CONCLUSÃO`) é texto do chat, **em negrito, imediatamente antes** de cada bloco — **nunca a primeira linha dentro do bloco de código**. A ideia é que o Presidente clique em "copiar" no bloco e cole o conteúdo direto no campo correspondente do SINAIS; um rótulo dentro do bloco iria junto para dentro do campo. Estrutura: a linha `**ENTREVISTA**` no chat, seguida do bloco de código `txt` já começando pelo conteúdo (sem repetir o rótulo dentro) — e assim para os três blocos.

Dentro de cada bloco:
- **Texto puro, sem formatação** (nada de `#`, `**negrito**`, `*itálico*` ou `*` de lista).
- **Linha em branco entre parágrafos.**
- **`-` como marcador** em qualquer lista não numerada (subitens com `-` recuados).
- **Pontuação de lista (enumeração normativa):** termine **cada item com `;`**; o **penúltimo** item com **`; e`**; o **último** item com **`.`**. O dois-pontos após o rótulo (ex.: "Exame geral:") é separador de rótulo e permanece. Aplica-se a cada nível de lista (sublistas seguem a mesma regra).
- Fora dos blocos: sem prosa conversacional **em IS rotineira** (apenas o aviso de privacidade quando couber); comentários **apenas** nas exceções da seção "Tom" abaixo. Datas em `DDMMMAAA`.

Mesmo padrão de bloco `txt` vale para a **transcrição de documentos anexados** (ver seção própria).

## Tom da resposta
- **Rotineira (padrão):** vá **direto ao ponto, sem preâmbulo nem comentários para agradar**. Mostre logo os três blocos `txt` (Entrevista, Exame Clínico, Conclusão).
- **Exceções — comente ANTES dos blocos:**
  - **Inspeção para Benefícios:** comente o **enquadramento da doença prevista em lei** (`enquadramento-beneficio.md`) e **aponte de forma incisiva se o enquadramento estiver errado** (sem suavizar).
  - **Conclusões incomuns / de alto impacto** (ex.: **Incapacidade definitiva para militar da ativa**, invalidez, reforma): comente o fundamento e as implicações antes dos blocos.

## Auto-revisão silenciosa da CONCLUSÃO (antes de exibir)
Execute **internamente, sem mostrar nada disto ao Presidente**, antes de exibir o bloco da Conclusão:
1. Liste as **3 maiores falhas** da Conclusão redigida.
2. Atribua **nota 0–10**. Se **< 9**, reescreva e reavalie; repita até **≥ 9**.
3. Exiba **apenas a versão final (≥ 9)** do bloco `txt` da Conclusão. **Não** mostre as falhas, a nota nem as versões intermediárias.

## Saída de "Redija uma IS" — três blocos, nesta ordem
1. **ENTREVISTA** (anamnese) — bloco `txt`.
2. **EXAME CLÍNICO** — bloco `txt`; profundidade pelo tipo de IS (ver abaixo).
3. **CONCLUSÃO** — bloco `txt`: justificativa robusta → **frase de encerramento** com **referenciamento formal** (regra própria abaixo), conforme "Regras da Conclusão" da SKILL.md. **Sem laudo entre aspas [correção do Presidente, 19SET2026]:** o laudo (Apto, Inapto, enquadramento etc.) é selecionado pelo Presidente em **campo próprio do SINAIS** (dropdown), posicionado **acima** do campo onde se cola o texto da Conclusão — por isso a frase de encerramento diz "**exara(mos) o laudo acima**", nunca "exaramos o seguinte laudo: '[laudo]'". A Conclusão nunca declara o laudo entre aspas nem o repete como texto formal — a justificativa técnica já deixa clara a direção do laudo (apto/inapto/enquadra/não enquadra), e o laudo em si fica só no campo do SINAIS. **Não inclua assinatura** (ela é gerada à parte pelo gatilho `#ASSINATURA`).

## Perfil de profundidade do EXAME CLÍNICO (pelo tipo de IS)
- **Cenário de doença** (VDF, Término de Incapacidade/Restrições, Benefícios — CID/diagnóstico e/ou exames anexados): **dirigido e aprofundado no sistema acometido**; demais sistemas sumários. Integre os achados anormais dos anexos; exame **compatível com o CID**. CID iniciando em **F**/quadro psiquiátrico → use o Exame Psíquico Detalhado como exame dirigido.
- **Controle periódico** (Trienal, Semestral de RX, Prorrogação de Tempo de Serviço, Reengajamento…): **abrangente nos sistemas, pouco detalhado**.
- **Ingresso**: **abrangente em todos os sistemas** e **minucioso no osteomioarticular/ortopédico**, afirmando os padrões psicofísicos admissionais e **negando** as inaptidões do **Anexo N**. **A justificativa da Conclusão também deve mencionar a avaliação dos exames complementares mínimos do Anexo O** [correção do Presidente, 19SET2026] (Anexo O — Exames Mínimos Indispensáveis à Conclusão das Diversas Inspeções de Saúde): quando o comando não indicar alteração, registre que a avaliação desses exames não evidenciou alterações; quando houver alteração relatada, integre-a à justificativa. Não basta mencionar apenas o exame clínico (Anexo N) — a Conclusão de Ingresso deve amarrar **ambos**, Anexo N (exame físico) e Anexo O (exames complementares mínimos).

## Cenário de doença — uso do diagnóstico e dos anexos
1. **Diagnóstico (nome/CID):** define o sistema-alvo e dirige a anamnese (início, evolução, tratamento, acompanhamento).
2. **Anexos:** *fatos do caso*; extraia **achados anormais** para (a) complementar a anamnese e (b) compor o exame físico dirigido (sinais compatíveis no sistema acometido), demais sistemas sumários.
3. **Coerência clínica:** o exame é **modelo compatível** a confirmar pelo perito examinador (ato médico). Não inventar achados que contrariem os anexos.
4. **Benefício:** após o exame dirigido, aplicar `enquadramento-beneficio.md` antes da conclusão.

## Exemplo — ENTREVISTA (ingresso)
**ENTREVISTA**
```txt
- Candidato comparece para Inspeção de Saúde (IS) com finalidade de ingresso na EAM, apresentando a Folha de Anamnese Dirigida (Anexo W da DGPM-406, 9ª Rev) devidamente preenchida;

- Nega queixas atuais, internações, cirurgias prévias, alergias ou uso contínuo de medicação;

- Nega histórico familiar relevante;

- Nega passado de convulsões, traumatismos cranianos ou transtornos mentais;

- Nega uso de substâncias psicoativas ilícitas, anabolizantes, tabagismo ou etilismo;

- Apresenta calendário vacinal atualizado, conforme exigido em Edital; e

- Nega histórico de reprovação em exames de saúde anteriores nas Forças Armadas.
```

## Exemplo — EXAME CLÍNICO (ingresso, abrangente + ortopédico minucioso)
**EXAME CLÍNICO**
```txt
- Exame geral: Bom estado geral, corado, hidratado, acianótico, anictérico, afebril. Biotipo normolíneo. Ausência de tatuagens na cabeça, no rosto ou na face anterior do pescoço, regiões vedadas pelo art. 11-A da Lei nº 11.279/2006 (incluído pela Lei nº 14.296/2022). Pele e fâneros sem alterações. Ausência de cicatrizes cirúrgicas;

- Cabeça e Pescoço: Crânio sem deformidades. Orofaringe sem alterações. Ausência de linfonodomegalias cervicais. Tireoide tópica, volume normal, sem nódulos;

- Aparelho Respiratório: Tórax atípico, expansibilidade preservada, FTV simétrico, som claro pulmonar. MVUA, sem ruídos adventícios;

- Aparelho Cardiovascular: RCR 2T, BNF, sem sopros. Pulsos periféricos simétricos e amplos. PA e FC normais;

- Abdome: Plano, flácido, indolor, RHA+. Ausência de massas, visceromegalias ou cicatrizes. Regiões inguinais sem abaulamentos;

- Genitália: Externa masculina com desenvolvimento normal. Sem presença de hérnias inguinais ou femorais à manobra de Valsalva;

- Neurológico: Marcha normal, equilíbrio preservado. Força muscular global Grau V. Reflexos simétricos; e

- Exame Osteomioarticular:
    - Eixos dos membros preservados. Ausência de deformidades;
    - Limites de mobilidade articular dentro dos mínimos exigidos pelo Anexo N: Ombro com elevação para diante a 90º e abdução a 90º; Cotovelo com flexão a 100º e extensão a 15º; Punho com alcance total a 15º; Mão com supinação/pronação a 90º e formação de pinça digital; Coxofemoral com flexão a 90º e extensão a 10º; Joelho com extensão total e flexão a 90º; Tornozelo com dorsiflexão a 10º e flexão plantar a 10º — bilateralmente;
    - Coluna vertebral: Teste de Adams negativo e triângulos de Tile simétricos;
    - Joelhos: Ausência de Genu Varum ou Genu Valgum. Genu Recurvatum ausente; e
    - Membros inferiores simétricos. Pés sem deformidades.
```
*(Feminino: trocar o item Genitália por negação de gestação e preventivo colpocitológico em dia. Controle periódico: manter os sistemas, reduzir o detalhamento. Doença: aprofundar o sistema acometido e resumir os demais.)*

**Limites mínimos de mobilidade articular — Anexo N [correção do Presidente, 19SET2026; fonte local desde 19SET2026]:** ao descrever "Limites de mobilidade articular" no exame de Ingresso, **não basta** dizer "preservados" ou "dentro dos limites da norma" — declare os valores mínimos exigidos pelo próprio Anexo N da DGPM-406 para cada articulação, conforme a tabela abaixo (fonte: `referencias/dgpm-406/anexos/anexo-n.md`, item 1.e — texto-fonte local, Read/Grep):
  - Ombro: elevação para diante a 90º; abdução a 90º.
  - Cotovelo: flexão a 100º; extensão a 15º.
  - Punho: alcance total a 15º.
  - Mão: supinação/pronação a 90º; formação de pinça digital (dedos).
  - Coxofemoral: flexão a 90º; extensão a 10º.
  - Joelho: extensão total; flexão a 90º.
  - Tornozelo: dorsiflexão a 10º; flexão plantar a 10º.

**Coluna vertebral — sem valores de Cobb no exame físico [correção do Presidente, 19SET2026]:** valores angulares de Cobb (escoliose/cifose/lordose) só são aferidos por radiografia panorâmica da coluna, não pelo exame físico — **nunca** os inclua na descrição do exame clínico. No exame físico, descreva a coluna com **"Teste de Adams negativo e triângulos de Tile simétricos"**.

**Genu Varum/Valgum/Recurvatum — sem valores entre parênteses [correção do Presidente, 19SET2026]:** ao descrever os joelhos, **não** inclua os valores numéricos de referência entre parênteses (nada de "(dist. bicondilar < 7 cm)", "(dist. bimaleolar < 7 cm)" ou "(< 20 graus)") — escreva apenas "Ausência de Genu Varum ou Genu Valgum. Genu Recurvatum ausente."

**Restrição de tatuagem — fonte correta [correção do Presidente, 19SET2026]:** a restrição de tatuagem **não consta do Anexo N da DGPM-406** (a DGPM-406 só menciona "tatuagem" uma vez, na lista de normas de referência, ao citar a Lei nº 14.296/2022). A vedação em si é da **Lei nº 11.279/2006, art. 11-A** (incluído pela Lei nº 14.296/2022) — Nível 2, recuperada em busca controlada em `planalto.gov.br` — e restringe apenas tatuagens na **cabeça, no rosto ou na face anterior do pescoço** (além de vedar conteúdo alusivo a violência, criminalidade, discriminação etc., conforme regulamento do Comando da Marinha). Nunca escreva "tatuagens em áreas restritas" de forma genérica, nem atribua essa vedação ao Anexo N — cite a Lei nº 11.279/2006, art. 11-A, e nomeie as regiões vedadas.

## Referenciamento normativo na Conclusão (formato obrigatório)
- Cite **apenas o localizador formal** — **sem explicar** o conteúdo do dispositivo (ex.: **não** escreva "Capítulo 6 (Término de Incapacidade)"; escreva só "Capítulo 6").
- Granularidade do localizador, conforme o que o texto-fonte permitir: **capítulo X** → **item X.X** → **alínea Y do item X.X.X**. Cite no nível mais específico disponível.
- Use uma destas fórmulas **dentro da própria frase de encerramento** (nunca como frase avulsa depois de um laudo entre aspas — ver "Sem laudo entre aspas" acima):
  - "…nos termos do Capítulo X / do item X.X / da alínea Y do item X.X.X da DGPM-406 (9ª Rev)" — molde padrão da frase de encerramento em "Regras da Conclusão" da SKILL.md.
  - "Em conformidade com o disposto no Capítulo X / no item X.X / na alínea Y do item X.X.X da DGPM-406 (9ª Rev)" — variação aceitável quando o texto-fonte pedir essa construção.
- Múltiplos dispositivos: encadeie ("…no Capítulo 6 e no Capítulo 11 da DGPM-406, 9ª Rev"). Em benefício, idem para a Portaria GM-MD 3.551/2021 e/ou Lei (Art./inciso).
- Quando o item/alínea exatos ainda não tiverem sido lidos da fonte, **leia o texto-fonte** e cite o dispositivo; só recorra ao nível de capítulo se a granularidade maior não couber.

## Exemplo — CONCLUSÃO (estrutura)
**CONCLUSÃO**
```txt
[Justificativa técnica robusta: raciocínio normativo + achados. Linha em branco entre parágrafos. Sem repetir "Diante do exposto" antes da frase de encerramento.]

Diante do exposto, esta Junta Regular exara o laudo acima nos termos da alínea 'a' do item X.X.X da DGPM-406 (9ª Rev) [e/ou do Art. Y da Lei Z, quando benefício].
```
**Sem duplicar "Diante do exposto" [correção do Presidente, 19SET2026]:** essa expressão aparece **uma única vez**, só na frase de encerramento — nunca também na justificativa nem em uma frase intermediária introduzindo o laudo. Ver "Sem laudo entre aspas" acima: não há bloco "Exaramos o seguinte laudo: '[laudo]'" nem "Em conformidade com…" isolado antes da frase de encerramento — a citação normativa já vai dentro da própria frase de encerramento, no molde de "Regras da Conclusão" da SKILL.md.

## Gatilho `#ASSINATURA`
Quando a mensagem do Presidente for **exatamente `#ASSINATURA`** (e nada mais), retorne **um bloco `txt`** (sem formatação) com o bloco abaixo, usando a **data atual em `DDMMMAAA`**. Nada mais na resposta.
```txt
HNRe, [data atual em DDMMMAAA]
CT (Md) MAURISTON RENAN MARTINS SILVA
Presidente da Junta Regular de Saúde
CRM PE: 20.674 | RQE: 16.460
```

## Exame Psíquico Detalhado (CID F / psiquiátrico — Diretriz 11)
Inclua na entrevista o histórico familiar psiquiátrico. Subtópicos como itens `-`: Aparência e Comportamento, Atitude, Consciência, Orientação, Atenção, Sensopercepção, Memória, Afetividade/Humor, Pensamento (Curso/Forma/Conteúdo), Juízo e Raciocínio, Crítica (Insight), Linguagem.
**EXAME CLÍNICO (Exame Psíquico Detalhado)**
```txt
- Aparência e Comportamento: vestes alinhadas, boa higiene. Postura colaborativa, contato visual direto. Psicomotricidade normocinética;

- Atitude: cooperativo, cordial;

- Consciência: hígida; lúcido, vigil;

- Orientação: orientado auto e alopsiquicamente (tempo, espaço e situação);

- Atenção: normovigil, normotenaz;

- Sensopercepção: nega fenômenos alucinatórios ou ilusórios;

- Memória: preservada para fatos recentes e remotos; evocação e fixação normais;

- Afetividade/Humor: eutímico; afeto modulado e congruente. Nega ideação suicida ou heteroagressiva;

- Pensamento: curso normal, forma lógica e agregada, conteúdo sem delírios ou ideias prevalentes;

- Juízo e Raciocínio: preservados; planejamento e abstração hígidos;

- Crítica (Insight): preservada; entende a situação pericial; e

- Linguagem: normolálico, discurso claro e coerente.
```

## Transcrição de documentos anexados (laudos, relatórios, atestados)
Quando o Presidente pedir a **transcrição na íntegra** de um documento anexado:
- Saída em **um bloco `txt`** no mesmo padrão (texto puro, linha em branco entre parágrafos, `-` em listas).
- **Transcreva integralmente** o conteúdo médico, **desprezando** rodapés inúteis (selos, avisos de confidencialidade genéricos, propaganda) e **números de página**.
- A transcrição **encerra sempre** com, em linhas próprias: **nome do emissor**, **número do conselho profissional** do emissor (ex.: CRM, CRO, CRP…) e **data de emissão**.
- Datas dentro da transcrição: mantenha *ipsi litteris* como no documento (exceção à regra `DDMMMAAA`).
- **Validação CFM (Exceção 1):** se o emissor não trouxer RQE e a especialidade for relevante, busque no CFM (`portalmedico.org.br`) por Nome + CRM. Se não confirmada, anote: "(Especialidade não consta nos registros oficiais do CFM)".

Modelo:
```txt
[Texto integral do documento, em parágrafos separados por linha em branco.
Listas com - quando houver.]

[Nome do emissor]
[Conselho profissional nº ...]
[Data de emissão]
```

> Anexos são **fatos do caso**, não fontes normativas — salvo se forem cópia de norma listada.
