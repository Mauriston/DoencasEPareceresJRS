# Enquadramento de benefício — doenças previstas em lei

Use ao redigir **IS para concessão de benefício** que dependa de "doença especificada em lei" (isenção de IR, pensões, reforma por doença grave, etc.). Procedimento determinístico de enquadramento, ancorado na **Portaria GM-MD nº 3.551/2021**.

## Base de dados local
`referencias/doencas-de-lei.json` — 17 doenças previstas em lei extraídas da Portaria 3.551/2021. **Leia/consulte via Read/Grep** (não dependa de rede).
- **Fonte:** transcrição local da Portaria GM-MD nº 3.551/2021 (`referencias/portaria-3551-2021/`) e tabela `doencas-de-lei.json` derivada dela. Para revalidar, compare com o texto publicado no Diário Oficial da União.

**Texto-fonte local — `referencias/portaria-3551-2021/` [correção do Presidente, 19SET2026]:** transcrição integral do Anexo da Portaria GM-MD nº 3.551/2021, dividida por arquivo:
- `00-preliminares.md` — Cap. I (finalidade/aplicação/fundamentação), Cap. II (conceitos de incapacidade × invalidez, quadro sinóptico legal doença × lei, revisão de laudo) e Cap. IV (disposições finais). **Leia sempre que precisar dos conceitos de incapacidade/invalidez** que fundamentam qualquer enquadramento, mesmo que a doença específica não esteja aqui.
- `01-alienacao-mental.md` a `17-fibrose-cistica.md` — um arquivo por doença (Cap. III), com quadro clínico completo, achados de exames complementares e — quando existirem — tabelas de gravidade/limiares numéricos por subdiagnóstico. Nome do arquivo já indica a doença (ex.: `02-cardiopatia-grave.md`).

Use esses arquivos **antes** de recorrer a fontes externas quando precisar de **texto vinculante literal** (definição legal completa, limiar numérico, tabela de gravidade) que vá além do que a `doencas-de-lei.json` resume — são bem mais detalhados que a JSON em vários pontos (ex.: classes funcionais NYHA e limiares ecocardiográficos/hemodinâmicos por tipo de cardiopatia em Cardiopatia Grave; tabela de graus de comprometimento visual em Cegueira). **Consulte via Read/Grep**, do mesmo modo que `cid10.json`/`cid10.md`.
- **Ressalva de fidelidade:** são transcrições (conversão PDF→Markdown) ainda não conferidas linha a linha contra o original publicado no DOU — tabelas e limiares numéricos são o ponto de maior risco de erro de conversão. Quando o dado for **numericamente decisivo** para o enquadramento (ex.: um limiar que decide entre enquadrar ou não), **confirme o valor no texto publicado no Diário Oficial da União** antes de citá-lo no laudo — mesma cautela já aplicada a qualquer tabela da DGPM-406.

**Anexo U (Doenças Previstas em Lei) e Anexo V (Documentação Médica exigida) da DGPM-406 — texto-fonte local:** `referencias/dgpm-406/anexos/anexo-u.md` (quadro por Lei/Decreto: Estatuto dos Militares, RJU, Isenção de IR, Pensões Militares, Pensão Especial) e `referencias/dgpm-406/anexos/anexo-v.md` (documentação médica recomendada por doença, para orientar o Presidente sobre o que exigir do inspecionado/pensionista). Use-os junto com a Portaria 3.551 — ela dá o critério clínico de enquadramento; os Anexos U/V dão o enquadramento legal-militar específico (qual lei ampara qual benefício) e a checklist documental.

### Schema
Objeto `{ "<Doença>": { definicao, documentos[], diagnosticos{} } }`:
- **`definicao`** — definição legal da doença (texto da norma).
- **`documentos`** — documentação médica exigida/recomendada para o enquadramento.
- **`diagnosticos`** — objeto `subdiagnóstico → [critérios de gravidade]`. A chave **`Geral`** vale para a doença como um todo; demais chaves são **subdiagnósticos** com critérios próprios. **Os critérios mudam conforme o subdiagnóstico.**

### Doenças cobertas (17)
Alienação Mental · Cardiopatia Grave · Cegueira · Contaminação por Radiação · Doença de Parkinson · Esclerose Múltipla · Espondilite Anquilosante · Estados Avançados de Doença de Paget · Fibrose Cística · Hanseníase · Hepatopatia Grave · Nefropatia Grave · Neoplasia Maligna · Paralisia Irreversível e Incapacitante · Pênfigo · SIDA/AIDS · Tuberculose Ativa.

## CoT de enquadramento (executar na redação de benefício)
1. **Identificar a doença** do caso e mapear ao nome exato no JSON. Se o quadro do periciado **não** corresponder a nenhuma das 17 doenças → não há doença especificada em lei (laudo negativo quanto ao benefício); registre isso.
2. **Selecionar o subdiagnóstico** aplicável dentro de `diagnosticos`. Se houver subdiagnóstico específico (ex.: SIDA/AIDS → "Categoria C"; Nefropatia → "Estágio 5"; Hepatopatia → "Child-Pugh"), use os critérios **dele**; senão, use `Geral`.
3. **Confrontar os dados do caso** (achados, exames, estágio/categoria) contra **cada critério de gravidade** da lista do subdiagnóstico. O enquadramento positivo exige atendimento aos critérios na forma da norma.
4. **Checar documentação** (`documentos`): aponte o que comprova o enquadramento e o que está **faltando** (sem documento fidedigno, o Cap. 9 veda enquadramento retrospectivo por dado subjetivo).
5. **Redigir a justificativa** mostrando o confronto critério-a-critério (como no Exemplo 4: Categoria clínica + Grupo laboratorial → classe → enquadra/não enquadra), citando a Portaria 3.551/2021 e, quando o critério legal estiver em lei federal, a Lei (que prevalece).
6. **Frase de encerramento** ("Diante do exposto, esta Junta Regular exara o laudo acima nos termos de…", ver "O laudo acima" na SKILL.md [correção do Presidente, 19SET2026]) citando a Portaria 3.551/2021 + dispositivo da DGPM-406 (Cap. 9 / Anexo U) — **sem laudo entre aspas**: o enquadramento (enquadra/não enquadra) é escolhido no campo próprio do SINAIS, acima do campo da Conclusão. Sem assinatura no bloco — gerada à parte pelo gatilho `#ASSINATURA` (ver `redacao-pericial.md`).

> **Limites:** o JSON é instrumento de apoio ao enquadramento; o **texto vinculante** é a Portaria 3.551/2021 — disponível localmente em `referencias/portaria-3551-2021/` (por doença) para citação literal, com o texto publicado no Diário Oficial da União como árbitro final em caso de dúvida numérica (ver ressalva de fidelidade acima). Não invente critérios ausentes do JSON/Portaria/transcrição. CID que inicia por **F** ou quadro psiquiátrico (ex.: Alienação Mental) → inclua exame psiquiátrico detalhado.
