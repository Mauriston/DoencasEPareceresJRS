# Tabela CID-10 (consulta de código → nome da doença)

`referencias/cid10.json` é a tabela oficial da CID-10 (nomenclatura DATASUS, 14.233 códigos — categorias de 3 caracteres e subcategorias de 4). Cada entrada tem a forma:

```json
"F410": {"descricao": "Transtorno de Pânico [Ansiedade Paroxística Episódica]", "abrev": "F41.0 Transt panico [ansied paroxist episodica]"}
```

## Quando usar

Sempre que o Presidente (ou um anexo/planilha tratado como *dado de entrada*, nunca como fonte normativa) fornecer um **código CID** e você precisar do **nome da doença** para: redigir a Entrevista/Exame Clínico/Conclusão de uma IS, decidir se é caso psiquiátrico (código inicia em **F** → Exame Psíquico Detalhado, ver `redacao-pericial.md`), ou enquadrar um benefício (`enquadramento-beneficio.md` + `doencas-de-lei.json`).

## Como consultar

**Não leia o arquivo inteiro** — ele é grande. Localize o código com `grep` (o código é a chave, sem ponto: `M849`, não `M84.9`; use `-A2` para trazer `descricao` e `abrev` juntos):

```
grep -A2 '"M849"' referencias/cid10.json
```

Para buscar por nome/palavra-chave quando só se sabe (parte d)o nome da doença (ex.: achar o código de "cardiopatia") — **use sempre `-i`** (a tabela mistura maiúsculas na descrição completa e minúsculas na abreviada; sem `-i` você perde ocorrências):

```
grep -i -B1 'cardiopatia' referencias/cid10.json
```

**Atenção — nomenclatura DATASUS ≠ termo popular/sinônimo clínico.** A busca por palavra-chave só encontra o registro se a **string oficial DATASUS** aparecer nele; um sinônimo ou termo latino/popular pode não bater com nada, ou pior, bater com um registro **vizinho e clinicamente diferente**. Exemplo real: buscar `"cor pulmonale"` retorna apenas I26.0/I26.9 ("Embolia Pulmonar Com/Sem Menção de Cor Pulmonale Agudo" — quadro agudo), mas o *cor pulmonale crônico* que o Presidente provavelmente quer está registrado como **I27.9 "Cardiopatia Pulmonar Não Especificada"**, sem a frase "cor pulmonale" em lugar nenhum do registro. Se a busca por palavra-chave não retornar nada, ou retornar algo que parece de outra categoria/prefixo do que o esperado, **não presuma que a tabela "não tem" o código**: refine pelo prefixo numérico do capítulo/categoria que você já conhece clinicamente (ex.: `grep -n '"I27'` para listar todo o bloco I27.0–I27.9) e **confira cada subcategoria manualmente** antes de responder ao Presidente.

## Precedência e limites (não é fonte normativa)

Esta tabela é **nomenclatura/dado de entrada** (exceção de identificação de doença por CID, ver "Proibições" na SKILL.md) — **não é fonte Nível 1 nem Nível 2**. Ela substitui a necessidade de busca na web (`WebSearch`) apenas para obter o **nome oficial da doença a partir do código**; não a cite como base normativa de um laudo.

Se precisar de **semiologia, quadro clínico detalhado ou critérios diagnósticos** além do nome (ex.: para compor um Exame Clínico "compatível com o CID" com achados específicos), a tabela não basta — consulte então a Exceção 2 (busca controlada em fontes médicas de alta reputação) como já previsto na SKILL.md.

Se o código não constar na tabela (ex.: código digitado errado, ou revisão CID diferente), informe a divergência ao Presidente em vez de supor — não invente descrição.
