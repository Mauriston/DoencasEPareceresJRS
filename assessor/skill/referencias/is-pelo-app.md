# Redigir IS a partir do banco do app JRS ("Redija a IS 1254539")

Vale quando a sessão é o **Claude Code ligado ao repositório `DoencasEPareceresJRS`** no ambiente em nuvem
**jrs-firebase** (há `GOOGLE_APPLICATION_CREDENTIALS` ou `FIREBASE_SA_B64` no ambiente). Fora desse contexto
(claude.ai, sem credencial), o script falha com "SEM CREDENCIAL": siga o fluxo normal, pedindo os dados no chat.

## 1. Buscar os dados (somente leitura)

```bash
node <dir-da-skill>/scripts/buscar-is.mjs 1254539 > "$SCRATCH/is-1254539.md"
```

- Grave a saída em arquivo no scratchpad e leia com Read; **não** a despeje no chat.
- O script nunca escreve no Firestore. Na primeira execução instala `firebase-admin` em `~/.cache/jrs-buscar-is` (~30 s).
- Códigos de saída: 3 = sem credencial; 4 = IS não existe em `inspecoes/` (confira o número com o Presidente).
- `--json` devolve o mesmo conteúdo em JSON, se precisar filtrar com `jq`.

## 2. O que vem e como usar

| Seção | Origem no app | Uso na redação |
|---|---|---|
| Inspeção de Saúde | `inspecoes/{is}` | `finalidade`/`finalidades` (roteamento e `formas-conclusao.json`), `grupoFinalidade`, `amp`, `cid`/`cidCodigo`, `observacoes`, `restricoes`, `dataAbertura`, `dataEntrevista`, `status` |
| Laudo já registrado | `laudo` / `laudosFinalidades` | Laudo votado/sugerido pelo perito no app. Use como ponto de partida, mas valide contra `laudosPermitidos`; se divergir da norma, **aponte antes dos blocos**. |
| Inspecionado | `militares/{inspecionadoId}` | `pgq` (sigla posto-quadro → `corpos-quadros-mb.json`), `temporario` (vínculo Carreira × Temporário), `rm1`/`refo` (inativo), `sexo`, `om` |
| PDFs transcritos | `inspecoes/{is}/exames` | Exames, atestados, relatórios e pareceres **já transcritos na íntegra pela IA do app** (`itens[].texto`, `valores[]` dos laboratoriais, `data`, `emissor`). São a fonte dos achados da ENTREVISTA/EXAME CLÍNICO e da justificativa da CONCLUSÃO. |
| Entrevistas | `inspecoes/{is}/entrevistas` | Anamnese organizada a partir do áudio gravado (quando houver). |
| Histórico | outras `inspecoes` do mesmo inspecionado | Incapacidade anterior, data de início, prorrogações, restrições — essencial em Verificação/Término/VDF. |

## 3. Regras deste modo

- **Não transcreva os PDFs no chat.** A "Transcrição automática de anexos" do SKILL.md **não se aplica** aos documentos
  que vieram do app — eles já estão transcritos lá. Cite-os pelo título, data e emissor (ex.: "relatório psiquiátrico de 06NOV2026").
- **Entrevista prévia só para o que faltar.** Preencha vínculo, posto/graduação, CID, finalidade, incapacidade anterior e
  datas com os dados do app; pergunte apenas o que não constar (tipicamente **idade** — a ficha não tem data de
  nascimento — e, às vezes, tipo de serviço SMV/SMI ou rotina de trabalho). Dado do app × dado do comando em conflito: pergunte.
- **Documento com `⚠️ TEXTO POSSIVELMENTE INCOMPLETO`**: avise o Presidente e não invente o trecho faltante.
- **Privacidade:** os dados reais ficam no arquivo local. No chat e nos blocos `txt`, não reproduza NIP, nome completo,
  CPF nem nomes de arquivo com o nome do inspecionado; refira-se a "o inspecionado" e à sigla do posto (como no TIS).
- Depois disso, siga o **fluxo principal** do SKILL.md (roteamento → texto-fonte → três blocos → auto-revisão).
