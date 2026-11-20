# Retenção e descarte de dados

> **Status: VALIDADO** (prazos definidos pelo Presidente da JRS em 20/11/2026; validação pela Encarregada de Dados e pelo Comando considerada feita). Onde a coluna *Descarte* diz "nunca", o app não oferece exclusão e as regras do Firestore/Storage negam a exclusão pelo cliente.

## 1. Inventário e prazos

| Dado / documento | Onde está | Prazo | Descarte | Situação |
|---|---|---|---|---|
| IS de concurso (candidato, laudo, eventos de auditoria) | Firestore `concursos/…` | **Nunca apagar** | Nenhum. `firestore.rules` nega a exclusão de concursos e candidatos; o "Limpar IS" (Admin) só zera as colunas da IS, sem apagar documentos | validado · implementado |
| Exames entregues pelo candidato — **PDF** | Concursos novos: **só Firebase Storage** `concursos/{id}/candidatos/{matrícula}/exames/`. Anteriores: Drive (pasta do concurso) | **1 ano** após a última data de agendamento do concurso; sem nenhuma, após a data do encerramento manual (`encerradoEm`) | **Automático** (concursos no Storage): o agendador diário apaga o PDF (`servidor/concursos/retencaoExames.ts`); o registro fica com `pdfUrl` vazio e `pdfApagadoEm`. Concursos antigos no Drive: descarte manual na pasta | validado · implementado (Storage) |
| Exames entregues pelo candidato — **transcrição** | Firestore, subcoleção `exames` do candidato | **Nunca apagar** | Nenhum (`firestore.rules`: `delete` negado) | validado · implementado |
| Mensagens, termos e solicitações de parecer/exames em PDF (concursos) | Concursos novos: **só Firebase Storage** `concursos/{id}/mensagens/` e `concursos/{id}/candidatos/{matrícula}/`. Anteriores: Drive | **Nunca apagar** | Nenhum. Mudar o status, reagendar ou "Limpar IS" só desliga o PDF da IS; o arquivo fica. `storage.rules` nega troca e exclusão | validado · implementado |
| Pareceres médico-periciais (registro e PDF) | Firestore `pareceres` + **Firebase Storage** `pareceres/{id}.pdf` (os antigos ficaram no Drive) | **Nunca apagar** | Nenhum | validado · ver pendência 1 (seção 2) |
| Perícias menores (atestados, CID) | Firestore `periciasMenores` + **Firebase Storage** `periciasMenores/{id}.pdf` (as migradas, no Drive) | **Nunca apagar** | Nenhum | validado · ver pendência 1 (seção 2) |
| Fila de impressão (`documentos_gerados`) | Firestore | **5 min após aberto** ou **24 h após a criação**, aberto ou não (o que vier primeiro) | Exclusão do registro pela política de TTL do Firestore no campo `expiraEm` (`scripts/documentos/configurar-ttl-fila-impressao.sh`); a lista já esconde os vencidos. O PDF segue a regra do documento de origem | validado · implementado (TTL a ligar uma vez) |
| Auditoria (`eventos`, `auditoria_acoes`) | Firestore | **Nunca apagar** | Nenhum (`update`/`delete` negados) | validado · implementado |
| Cadastro de militares/dependentes | Firestore `militares` | Enquanto houver vínculo/necessidade; inativar antes de apagar | Exclusão pelo Admin (já auditada) | validado |
| Usuários do sistema | Firestore `usuarios` + Authentication | Enquanto ativo; inativar ao término do vínculo | Exclusão **apenas manual** pelo Admin | validado |
| Áudio das entrevistas gravadas da IS | Storage `entrevistas/{isId}/{entrevistaId}/` | **180 dias** após a entrevista (`DIAS_RETENCAO_AUDIO` em `config/entrevistas.ts`) | **Automático:** regra de ciclo de vida do bucket (`scripts/entrevistas/configurar-retencao.sh`); recuperável na lixeira do Storage por mais 30 dias. O app mostra a data em que o áudio será apagado | validado · implementado (ADR-014) |
| Transcrição e anamnese organizada da entrevista | Firestore `inspecoes/{isId}/entrevistas` | Seguem a IS (ficam com ela enquanto a IS existir) | Junto com a IS (Admin); só a junta (Admin e `user_medicos`) lê | validado |
| Consentimento do inspecionado para a gravação | Firestore, campo `consentimento` (`uid`, `nome` de quem registrou, `em`) da entrevista | Igual à transcrição (prova do consentimento enquanto houver dado gravado) | Junto com a entrevista | validado |
| Anexos do Chat entre usuários (PDF e imagens JPG/PNG/WEBP, até 10 MB) | Storage `conversas/{a_b}/…` + referência `anexo` na mensagem (`conversas/{a_b}/mensagens/{id}`) | **7 dias** após o envio (`DIAS_RETENCAO_ANEXO` em `utils/chat.ts`) | **Automático:** o agendador diário apaga o arquivo do Storage e tira a referência da mensagem, que fica com `anexoRemovido.motivo = 'expirado'` (o app mostra "Anexo expirado") — `servidor/chat/retencaoAnexos.ts`, chamado no job das 07h (`/api/agendador/aniversariantes`) e na rota própria `/api/agendador/chat-anexos` (mesmo `X-Agendador-Token`). O Admin também pode apagar anexos e mensagens a qualquer momento (moderação) | implementado |
| Texto das mensagens do Chat e presença (`presenca/{uid}`: só a hora da última atividade) | Firestore `conversas`, `presenca` | Enquanto a conversa existir | Mensagens: exclusão pelo Admin (moderação). Presença: sobrescrita a cada ~60 s | implementado · prazo do texto a definir |
| Imagens enviadas ao Gemini | Não armazenadas pelo app | Não retidas pelo app (transitam na requisição) | — | validado |

## 2. Rotinas e pendências

Exclusões automáticas em vigor:

- **Anexos do Chat:** 7 dias após o envio, pelo agendador diário (job das 07h e `/api/agendador/chat-anexos`). O texto da mensagem fica, com a indicação "Anexo expirado".
- **Áudio das entrevistas:** 180 dias (ciclo de vida do bucket; detalhes em 2.1).
- **PDF dos exames dos candidatos (concursos no Storage):** 1 ano após a data-base, pelo agendador diário (`/api/agendador/agenda-is`, que roda de domingo a quinta). A transcrição fica.
- **Fila de impressão:** TTL do Firestore em `expiraEm`. O Firestore apaga em até ~24 h depois do vencimento; a tela já não mostra o registro vencido.

Onde o PDF fica: a partir de 20/11/2026, os **concursos novos** (`armazenamento = 'storage'`, gravado na criação) guardam mensagens, termos, solicitações e exames **só no Firebase Storage**. Os concursos anteriores seguem no Drive. Pareceres e perícias menores já gravavam só no Storage.

Pendências:

1. **Exclusões que ainda existem no app** para dados marcados "nunca apagar": a exclusão de perícia menor pelo servidor (`/api/pericias-menores/excluir`, Admin ou perito, com justificativa) e o `delete` do Admin em `pareceres` e `periciasMenores` no `firestore.rules`. Elas não foram removidas porque servem para corrigir lançamentos errados. Falta decidir se saem.
2. **Impressão pelo Apps Script (sem a conta Google do servidor autorizada):** o caminho alternativo só lê PDFs do Drive. Os termos e solicitações dos concursos novos (no Storage) exigem a conta Google do servidor autorizada.
3. **PDF dos exames dos concursos antigos (Drive):** o descarte de 1 ano é manual.

### 2.1 Entrevistas gravadas da IS (ADR-014)

- **Consentimento:** a gravação só começa depois que o perito registra no app o consentimento do inspecionado (quem registrou e quando ficam no documento da entrevista).
- **Acesso:** só a junta (Admin e `user_medicos`) grava, lê e revisa; o áudio não tem leitura pelo app (`storage.rules`) — é ouvido pelo servidor, que confere o perfil.
- **Áudio:** apagado **180 dias** depois (ciclo de vida do bucket; lixeira de 30 dias). Os backups do Firestore não contêm áudio. Para as entrevistas gravadas antes de 20/11/2026, a data mostrada no app (`apagarApos`) ainda é a de 90 dias. O áudio, porém, só sai aos 180 dias, depois de rodar de novo `scripts/entrevistas/configurar-retencao.sh`.
- **Transcrição e anamnese:** ficam no Firestore e seguem a retenção da IS; nenhum PDF é gerado.
- **Processamento:** Speech-to-Text (Chirp 3) na região `us` e Gemini no Vertex AI — dados de saúde processados nos EUA, **aceito** pelo Presidente da JRS (08/11/2026).
- **IA:** o resultado é um rascunho; o app avisa "revisar antes de usar no laudo" e registra quem editou e quem revisou.

## 3. Princípios

- Lixeira antes de exclusão definitiva; backup (seção 18 do `database.md`) também precisa respeitar a retenção.
- Dados pessoais fora de logs (`utils/logSeguro.ts`) e mínimos nos prompts de IA (`utils/minimizacaoIA.ts`).
- Prazos validados (20/11/2026); qualquer mudança de prazo passa pelo Presidente da JRS e é registrada aqui.

## 4. Checklist de menor privilégio no Drive

- [ ] Pastas raiz (CONCURSOS, PARECERES, minutas) compartilhadas só com contas individuais/grupos nominais, nunca "qualquer pessoa com o link".
- [ ] Conta dona do Apps Script (`executeAs: USER_DEPLOYING`) separada do uso pessoal, com 2FA.
- [ ] Revisar periodicamente "Compartilhado com" das pastas e arquivos gerados (os arquivos herdam o acesso da pasta).
- [ ] O app abre PDFs por URL `/view`; quem não tem acesso à pasta não abre. Não "afrouxar" o compartilhamento para resolver erros de visualização.
- [ ] Revisar o web app (`ANYONE_ANONYMOUS` é necessário para o front chamar o script; a proteção é o `idToken` do Firebase exigido em cada ação — ver `exigirUsuarioFirebase`).
- [ ] Verificado no código em 31/10/2026: não há `setSharing`, `addViewer`/`addEditor` nem permissões públicas em `apps-script/` (a checagem do Drive em si é manual).
