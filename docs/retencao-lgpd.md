# Retenção e descarte de dados (proposta)

> **Status: PROPOSTA.** Todos os prazos abaixo são sugestões técnicas, **a validar pela Encarregada de Dados (LGPD) e pelo Comando**, e devem ser confrontados com a legislação de arquivos/prontuário aplicável e as normas internas (ex.: DGPM-406, normas de gestão documental da MB). Nada aqui foi aprovado nem implementado como rotina automática de exclusão.

## 1. Inventário e prazos propostos

| Dado / documento | Onde está | Prazo proposto | Descarte proposto | Validação |
|---|---|---|---|---|
| IS de concurso (candidato, laudo, eventos de auditoria) | Firestore `concursos/…` | Até o fim do prazo de recurso/validade do certame + prazo a definir | "Limpar IS" (Admin) após o encerramento; PDFs para a lixeira do Drive | a validar pela Encarregada/Comando |
| Exames entregues pelo candidato (PDF + transcrição) | Drive (pasta do concurso) + subcoleção `exames` | Idem IS de concurso | Lixeira do Drive e exclusão da subcoleção | a validar pela Encarregada/Comando |
| Mensagens/termos/solicitações de parecer em PDF | Drive | Conforme gestão documental da OM | Lixeira do Drive, depois exclusão definitiva | a validar pela Encarregada/Comando |
| Pareceres médico-periciais (registro e PDF) | Firestore `pareceres` + Drive | Prazo de arquivo médico-pericial (a definir) | Arquivar; não apagar sem norma | a validar pela Encarregada/Comando |
| Perícias menores (atestados, CID) | Firestore `periciasMenores` + Storage/Drive | A definir (sugestão: tempo do atestado + prazo de recurso) | Exclusão do PDF; manter só dados agregados/anonimizados | a validar pela Encarregada/Comando |
| Fila de impressão (`documentos_gerados`) | Firestore | 30 dias após `aberto = true` (sugestão) | Exclusão do registro (o PDF segue a regra do documento de origem) | a validar pela Encarregada/Comando |
| Auditoria (`eventos`, `auditoria_acoes`) | Firestore | 5 anos (sugestão) | Exclusão em lote por Admin | a validar pela Encarregada/Comando |
| Cadastro de militares/dependentes | Firestore `militares` | Enquanto houver vínculo/necessidade; inativar antes de apagar | Exclusão pelo Admin (já auditada) | a validar pela Encarregada/Comando |
| Usuários do sistema | Firestore `usuarios` + Authentication | Enquanto ativo; inativar ao término do vínculo | Exclusão após prazo a definir | a validar pela Encarregada/Comando |
| Áudio das entrevistas gravadas da IS | Storage `entrevistas/{isId}/{entrevistaId}/` | **90 dias** após a entrevista (decisão do Presidente da JRS, 08/11/2026; `DIAS_RETENCAO_AUDIO` em `config/entrevistas.ts`) | **Automático:** regra de ciclo de vida do bucket (`scripts/entrevistas/configurar-retencao.sh`); recuperável na lixeira do Storage por mais 30 dias. O app mostra a data em que o áudio será apagado | **implementado** (ADR-014) |
| Transcrição e anamnese organizada da entrevista | Firestore `inspecoes/{isId}/entrevistas` | Seguem a IS (ficam com ela enquanto a IS existir) | Junto com a IS (Admin); só a junta (Admin e `user_medicos`) lê | a validar pela Encarregada/Comando |
| Consentimento do inspecionado para a gravação | Firestore, campo `consentimento` (`uid`, `nome` de quem registrou, `em`) da entrevista | Igual à transcrição (prova do consentimento enquanto houver dado gravado) | Junto com a entrevista | a validar pela Encarregada/Comando |
| Imagens enviadas ao Gemini | Não armazenadas pelo app | Não retidas pelo app (transitam na requisição) | — | confirmar com a Encarregada a política do provedor |

## 2. Rotina simples (não ativada)

Não há exclusão automática, **salvo o áudio das entrevistas gravadas** (90 dias, abaixo). Para tornar a política executável sem risco, a sugestão é, **após a aprovação dos prazos**:

1. Gravar nos documentos uma data de descarte prevista (`descarteEm`, `AAAA-MM-DD`, ver `utils/dados.ts: dataCivilISO`) no momento do encerramento do concurso/arquivamento do parecer;
2. Uma tela de Admin lista os registros com `descarteEm` vencido, para **revisão humana** e exclusão manual (Drive: lixeira; depois exclusão definitiva);
3. A exclusão fica registrada em `auditoria_acoes` (sem dados pessoais).

Pendente: aprovação dos prazos, o campo `descarteEm` e a tela de Admin.

### 2.1 Entrevistas gravadas da IS (ADR-014)

- **Consentimento:** a gravação só começa depois que o perito registra no app o consentimento do inspecionado (quem registrou e quando ficam no documento da entrevista).
- **Acesso:** só a junta (Admin e `user_medicos`) grava, lê e revisa; o áudio não tem leitura pelo app (`storage.rules`) — é ouvido pelo servidor, que confere o perfil.
- **Áudio:** apagado **90 dias** depois (ciclo de vida do bucket; lixeira de 30 dias). Os backups do Firestore não contêm áudio.
- **Transcrição e anamnese:** ficam no Firestore e seguem a retenção da IS; nenhum PDF é gerado.
- **Processamento:** Speech-to-Text (Chirp 3) na região `us` e Gemini no Vertex AI — dados de saúde processados nos EUA, **aceito** pelo Presidente da JRS (08/11/2026); a confirmar com a Encarregada de Dados.
- **IA:** o resultado é um rascunho; o app avisa "revisar antes de usar no laudo" e registra quem editou e quem revisou.

## 3. Princípios

- Lixeira antes de exclusão definitiva; backup (seção 18 do `database.md`) também precisa respeitar a retenção.
- Dados pessoais fora de logs (`utils/logSeguro.ts`) e mínimos nos prompts de IA (`utils/minimizacaoIA.ts`).
- Esta proposta não substitui a revisão formal de conformidade com a LGPD, que é humana e **ainda não foi feita**.

## 4. Checklist de menor privilégio no Drive

- [ ] Pastas raiz (CONCURSOS, PARECERES, minutas) compartilhadas só com contas individuais/grupos nominais, nunca "qualquer pessoa com o link".
- [ ] Conta dona do Apps Script (`executeAs: USER_DEPLOYING`) separada do uso pessoal, com 2FA.
- [ ] Revisar periodicamente "Compartilhado com" das pastas e arquivos gerados (os arquivos herdam o acesso da pasta).
- [ ] O app abre PDFs por URL `/view`; quem não tem acesso à pasta não abre. Não "afrouxar" o compartilhamento para resolver erros de visualização.
- [ ] Revisar o web app (`ANYONE_ANONYMOUS` é necessário para o front chamar o script; a proteção é o `idToken` do Firebase exigido em cada ação — ver `exigirUsuarioFirebase`).
- [ ] Verificado no código em 31/10/2026: não há `setSharing`, `addViewer`/`addEditor` nem permissões públicas em `apps-script/` (a checagem do Drive em si é manual).
