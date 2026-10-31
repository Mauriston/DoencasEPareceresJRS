/**
 * MensagemController.gs
 */

function gerarMinutaMensagem(payload) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada nas propriedades do script.");

  const MINUTA_PROMPT = `# OBJETIVO

Você é um assistente especializado em gerar minutas de mensagens de conclusão de Inspeção de Saúde (IS) da Marinha do Brasil a partir da análise direta de imagens anexadas.

Você NÃO receberá planilhas. Extraia as informações exclusivamente das imagens fornecidas.

---

# ENTRADA

Serão fornecidas uma ou mais Inspeções de Saúde. Cada IS será composta SEMPRE por 2 imagens:

## Imagem 1 — Dados da inspeção
Extrair: Nome, NIP, Sexo, Situação, Posto, Corpo, Especialidade, Quadro, OM, Junta, Finalidade, Data do Laudo, TIS, Código DS-1A.

## Imagem 2 — Resultado da inspeção
Extrair: Laudo, Restrições, Tempo (das restrições, quando houver).

---

# REGRAS DE EXTRAÇÃO
1. Ler diretamente o texto presente nas imagens.
2. Não solicitar confirmação dos dados.
3. Não inventar informações ausentes.
4. Se algum campo estiver ilegível, informar exatamente qual campo não pôde ser identificado.
5. Preservar integralmente o texto do laudo encontrado na imagem — não corrigir, resumir ou reescrever.
6. Quando o campo OM for "HNRE" (em qualquer variação de maiúsculas/minúsculas), escrever na minuta sempre como "HNRe".
7. O campo Junta aparece logo no início da primeira imagem e identifica a junta médica responsável. Valores possíveis: "JRS/HNRe", "MPI/HNRe CASSUNDÉ" ou "MPI/HNRe MAURISTON". Nas minutas, escrever SEMPRE com a grafia "HNRe" (nunca "HNRE"), independentemente de como apareça na imagem.

---

# NORMALIZAÇÃO DE DATAS
Converter a Data do Laudo para DDMMMAAAA.
Exemplos: 2026-06-18 → 18JUN2026 | 2025-10-15 → 15OUT2025
Meses: JAN FEV MAR ABR MAI JUN JUL AGO SET OUT NOV DEZ

---

# MAPEAMENTO DE DESTINATÁRIOS (PARA e INFO)
Usando a Finalidade e o início do Laudo (ignorando período de restrições para fins de mapeamento), determine PARA e INFO conforme o JSON:

[{"FINALIDADE":"Benefícios (Dependentes de Militares da ativa)","RESULTADO":"Any","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Cursos e Estágios","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Cursos e Estágios","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Demissão a pedido / Ex offício","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Demissão a pedido / Ex offício","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Engajamento ou Reengajamento","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Engajamento ou Reengajamento","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Fins de Justiça (Inclui MP e APM)","RESULTADO":"Any","PARA":"OM do militar","INFO":"ComDN"},
{"FINALIDADE":"Junta de Saúde de Recurso (JSR)","RESULTADO":"Any","PARA":"OM do militar","INFO":"CPESFN, DPMM, DSM"},
{"FINALIDADE":"Licença para Tratamento de Saúde Pessoal (LTSP)","RESULTADO":"Any","PARA":"OM do militar","INFO":"DSM"},
{"FINALIDADE":"Matrícula em Cursos ou Estágios","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Matrícula em Cursos ou Estágios","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Missão no Exterior (Igual a 6 meses)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Missão no Exterior (Igual a 6 meses)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Missão no Exterior (Maior que 6 meses)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Missão no Exterior (Maior que 6 meses)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Movimentação (Com mudança de sede)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Movimentação (Com mudança de sede)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Movimentação (Sem mudança de sede)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Movimentação (Sem mudança de sede)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Navegação (Missões no mar)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Navegação (Missões no mar)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Para Permanência e Trânsito (PPT)","RESULTADO":"Any","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Passagem para a Inatividade","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Passagem para a Inatividade","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Prática de Educação Física e Esportes (TAF)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Prática de Educação Física e Esportes (TAF)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Promoção (Acesso na hierarquia)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Promoção (Acesso na hierarquia)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Revisão de IS","RESULTADO":"Any","PARA":"OM do militar","INFO":"DSM"},
{"FINALIDADE":"Término de LTSP","RESULTADO":"Apto (Qualquer variação)","PARA":"OM do militar","INFO":"DSM"},
{"FINALIDADE":"Término de LTSP","RESULTADO":"Inapto (Qualquer variação)","PARA":"OM do militar","INFO":"DSM"}]

A regra de cruzamento funciona assim:
- Compare a FINALIDADE extraída com a coluna FINALIDADE.
- Compare o início do Laudo (ex: se é Apto, Inapto, etc) com a coluna RESULTADO. "Any" significa que qualquer laudo para aquela finalidade tem o mesmo destinatário.
- Substitua a expressão "OM do militar" pelo valor extraído no campo OM.
- A saída PARA deve ser exata. A saída INFO também, podendo ficar em branco.

---

# GERAÇÃO DO ASSUNTO
O ASSUNTO da mensagem será sempre:
"INSPECAO DE SAUDE"

---

# FORMATAÇÃO DO TEXTO DA MENSAGEM
A mensagem gerada (campo TEXTO) deve seguir rigorosamente o padrão abaixo, sem markdown de negrito e usando tabulações adequadas:

A(O) [JUNTA MEDICA] EM SESSAO DE [DATA DO LAUDO - DDMMMAAAA], EXAROU O SEGUINTE PARECER NO TERMO DE INSEPCAO DE SAUDE NR [TIS]:
NIP: [NIP]
POSTO/GRAD: [POSTO] [CORPO] [QUADRO] [ESPECIALIDADE]
NOME: [NOME DO MILITAR]
OM: [OM]
FINALIDADE: [FINALIDADE DA IS]
PARECER: [TEXTO DO LAUDO] [RESTRIÇÕES, SE HOUVER]
CODIGO DO DIAGNOSTICO: [CODIGO DS-1A, SE HOUVER]

Se houver restrições e tempo de restrição, eles devem aparecer logo após o texto do Laudo na linha "PARECER".
Se não houver Código do Diagnóstico, a respectiva linha deve ser ocultada.

---

# REGRAS DE SAÍDA FINAL
A sua resposta DEVE conter a seguinte estrutura para cada IS analisada:

PARA: [DESTINATÁRIO PARA CALCULADO]
INFO: [DESTINATÁRIOS INFO CALCULADOS]
ASSUNTO: INSPECAO DE SAUDE
TEXTO:
[INSERIR O TEXTO FORMATADO AQUI]

Caso haja mais de uma IS no mesmo envio (mais de um par de imagens), separe a minuta de cada uma por três traços ("---").`

  var parts = [{ text: MINUTA_PROMPT }];
  for (var imgIdx = 0; imgIdx < payload.images.length; imgIdx++) {
    parts.push({
      inline_data: {
        mime_type: payload.images[imgIdx].mimeType || 'image/jpeg',
        data: payload.images[imgIdx].data
      }
    });
  }

  const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
  const geminiBody = { contents: [{ parts: parts }] };
  const geminiJson = chamarGemini(geminiUrl, geminiBody);

  const minuta = geminiJson.candidates[0].content.parts[0].text;

  const minutaFolder = DriveApp.getFolderById('1q_Pw_mbjYKvyJvBr-PGmV9pK7YiBZOKv');
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
  const docTitle = "Minuta IS - " + dateStr;
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();
  body.setText(minuta);
  doc.saveAndClose();
  const docFile = DriveApp.getFileById(doc.getId());
  minutaFolder.addFile(docFile);
  DriveApp.getRootFolder().removeFile(docFile);

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    minuta: minuta,
    docUrl: doc.getUrl()
  })).setMimeType(ContentService.MimeType.JSON);
}

var PROMPT_MENSAGEM_CONCURSO = [
  'Você lê mensagens administrativas navais (SIGAD-MB) em PDF sobre concursos/processos seletivos e extrai os dados.',
  'Responda estritamente em JSON válido, com exatamente estas chaves:',
  '- "dataHora": o código Data-Hora (DTG) da mensagem, formato <R|P><DDHHMM>Z/<MÊS>/<ANO>, ex.: "R181644Z/SET/2026".',
  '- "remetente": o conteúdo do campo "De:" (ex.: "HOSRCF").',
  '- "destinatario": o conteúdo do campo "Para:".',
  '- "info": o conteúdo do campo "Info:" (string vazia se não houver).',
  '- "assunto": o conteúdo do campo "Assunto:".',
  '- "texto": a transcrição fiel e completa do corpo da mensagem (campo "Texto:"), sem cabeçalho de página nem rodapé; preserve os parágrafos com quebras de linha.',
  '- "nomeConcurso": o identificador curto do concurso no assunto, no formato SIGLA/ANO (ex.: "CP-CAP/2026"); se não houver, use o assunto inteiro.',
  '- "mensagemDeAgendamento": true se os candidatos aparecem agrupados por data de comparecimento/agendamento (uma data por grupo); false se é só uma lista de apresentação.',
  '- "periodoJRS": objeto { "inicio": "AAAA-MM-DD", "fim": "AAAA-MM-DD" } com o período em que a JRS fará as inspeções (trecho como "03AGO a 14SET2026 (JRS)"), ou null se não constar.',
  '- "candidatos": lista, na ordem da mensagem, de objetos { "matricula": "000000-0", "nome": "NOME COMPLETO EM MAIÚSCULAS", "dataAgendamento": "AAAA-MM-DD" }. A matrícula tem 5 a 7 dígitos, hífen e um dígito verificador. "dataAgendamento" só se a mensagem agendar o candidato numa data; senão, string vazia. Não inclua militares que não sejam candidatos.',
  'Não invente dados: use string vazia (ou null/lista vazia) quando a informação não estiver no documento.'
].join('\n');

function apiExtrairMensagemConcurso(corpo) {
  exigirUsuarioFirebase(corpo);
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada nas propriedades do projeto Apps Script.');
  if (!corpo.pdfBase64) throw new Error('"pdfBase64" é obrigatório.');

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODELO_GEMINI + ':generateContent?key=' + apiKey;
  var requisicao = {
    contents: [{
      parts: [
        { text: PROMPT_MENSAGEM_CONCURSO },
        { inline_data: { mime_type: corpo.mimeType || 'application/pdf', data: corpo.pdfBase64 } }
      ]
    }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 }
  };
  var json = chamarGemini(url, requisicao);

  try {
    var texto = json.candidates[0].content.parts[0].text;
    return JSON.parse(texto);
  } catch (e) {
    throw new Error('O Gemini não conseguiu estruturar os dados da mensagem. Confira se o PDF está legível.');
  }
}

function apiSalvarMensagemPdf(corpo) {
  exigirUsuarioFirebase(corpo);
  var pastas = garantirEstruturaConcurso(corpo.ano, corpo.nomeConcurso);
  var original = limparNomeDrive(corpo.nomeArquivo).replace(/\.pdf$/i, '') || 'mensagem';
  var arquivo = criarPdfNaPasta(pastas.mensagens, Date.now() + '_' + original + '.pdf', corpo.pdfBase64);
  return { fileId: arquivo.getId(), url: urlVisualizacaoDrive(arquivo.getId()) };
}
