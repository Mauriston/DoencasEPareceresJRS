/**
 * CodePrincipal.gs — ações vindas do antigo projeto "principal" (Code.gs), agora neste projeto único.
 *
 * POST (doPostPrincipal, chamado por doPost de CodeConcursos.gs): extrair_dados_atestado (Perícia Menor)
 * e gerarMinutaMensagem (página Mensagens). As respostas mantêm o formato antigo ({ success, data | message }).
 *
 * A planilha principal (abas ListasRef, OM, Perito, Militares, Templates, Pareceres, Pericia_Menor,
 * Usuarios) e a de conteúdos extras deixaram de ser usadas: os dados estão no Firestore. As ações GET
 * que as liam (getLookups, getMilitaresList, getMilitar, getPericiaMenorList, getExtras) e o cadastro
 * de militar na planilha foram removidos.
 */
function doPostPrincipal(e) {
  if (!e) e = { postData: { contents: "{}" } };
  
  try {
    const payload = JSON.parse(e.postData.contents);

    // ==========================================
    // LÓGICA: EXTRAIR DADOS COM O GEMINI 2.5
    // ==========================================
    if (payload.action === "extrair_dados_atestado") {
      const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
      if (!apiKey) throw new Error("Aviso: GEMINI_API_KEY não configurada nas propriedades do Google Apps Script.");

      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
      
      const requestBody = {
        "contents": [{
          "parts": [
            {
              // Documentação: Atualização no Prompt para buscar também o nome do Militar.
              "text": "Extraia os seguintes 4 dados da imagem do atestado médico:\n1) nomeMilitar (o nome completo do paciente)\n2) dataAtestado (no formato YYYY-MM-DD)\n3) tempoAtestado (apenas o número de dias)\n4) cid (apenas o código principal, ex: M54.5).\nResponda estritamente num formato JSON válido com as chaves exatas 'nomeMilitar', 'dataAtestado', 'tempoAtestado', 'cid'."
            },
            {
              "inline_data": {
                "mime_type": "image/jpeg",
                "data": payload.base64Image
              }
            }
          ]
        }],
        "generationConfig": {
          "responseMimeType": "application/json"
        }
      };

      const options = {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(requestBody),
        "muteHttpExceptions": true
      };

      const response = UrlFetchApp.fetch(url, options);
      const jsonResponse = JSON.parse(response.getContentText());

      if (jsonResponse.error) {
         throw new Error("Erro na API Gemini: " + jsonResponse.error.message);
      }

      try {
        const geminiText = jsonResponse.candidates[0].content.parts[0].text;
        const extractedData = JSON.parse(geminiText); 
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: extractedData
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (parseError) {
        throw new Error("O Gemini não conseguiu estruturar os dados. Tente uma foto mais clara.");
      }
    }

    // ==========================================
    // LÓGICA: GERAÇÃO DE MINUTA DE MENSAGEM IS
    // ==========================================
    if (payload.action === "gerarMinutaMensagem") {
      const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
      if (!apiKey) throw new Error("GEMINI_API_KEY não configurada nas propriedades do script.");

      const MINUTA_PROMPT = "# OBJETIVO\n\nVocê é um assistente especializado em gerar minutas de mensagens de conclusão de Inspeção de Saúde (IS) da Marinha do Brasil a partir da análise direta de imagens anexadas.\n\nVocê NÃO receberá planilhas. Extraia as informações exclusivamente das imagens fornecidas.\n\n---\n\n# ENTRADA\n\nSerão fornecidas uma ou mais Inspeções de Saúde. Cada IS será composta SEMPRE por 2 imagens:\n\n## Imagem 1 — Dados da inspeção\nExtrair: Nome, NIP, Sexo, Situação, Posto, Corpo, Especialidade, Quadro, OM, Junta, Finalidade, Data do Laudo, TIS, Código DS-1A.\n\n## Imagem 2 — Resultado da inspeção\nExtrair: Laudo, Restrições, Tempo (das restrições, quando houver).\n\n---\n\n# REGRAS DE EXTRAÇÃO\n1. Ler diretamente o texto presente nas imagens.\n2. Não solicitar confirmação dos dados.\n3. Não inventar informações ausentes.\n4. Se algum campo estiver ilegível, informar exatamente qual campo não pôde ser identificado.\n5. Preservar integralmente o texto do laudo encontrado na imagem — não corrigir, resumir ou reescrever.\n6. Quando o campo OM for \"HNRE\" (em qualquer variação de maiúsculas/minúsculas), escrever na minuta sempre como \"HNRe\".\n7. O campo Junta aparece logo no início da primeira imagem e identifica a junta médica responsável. Valores possíveis: \"JRS/HNRe\", \"MPI/HNRe CASSUNDÉ\" ou \"MPI/HNRe MAURISTON\". Nas minutas, escrever SEMPRE com a grafia \"HNRe\" (nunca \"HNRE\"), independentemente de como apareça na imagem.\n\n---\n\n# NORMALIZAÇÃO DE DATAS\nConverter a Data do Laudo para DDMMMAAAA.\nExemplos: 2026-06-18 → 18JUN2026 | 2025-10-15 → 15OUT2025\nMeses: JAN FEV MAR ABR MAI JUN JUL AGO SET OUT NOV DEZ\n\n---\n\n# MAPEAMENTO DE DESTINATÁRIOS (PARA e INFO)\nUsando a Finalidade e o início do Laudo (ignorando período de restrições para fins de mapeamento), determine PARA e INFO conforme o JSON:\n\n[{\"FINALIDADE\":\"Benefícios (Dependentes de Militares da ativa)\",\"RESULTADO\":\"Any\",\"PARA\":\"OM do militar\",\"INFO\":\"—\"},{\"FINALIDADE\":\"Benefícios (Dependentes de Militares inativos)\",\"RESULTADO\":\"Any\",\"PARA\":\"CPesFN ou SVPM ou OMAC\",\"INFO\":\"—\"},{\"FINALIDADE\":\"Benefícios (Militares inativos)\",\"RESULTADO\":\"Any\",\"PARA\":\"DPM ou CPesFN\",\"INFO\":\"SVPM\"},{\"FINALIDADE\":\"Benefícios (Pensionistas, ex-combatentes e seus Dependentes)\",\"RESULTADO\":\"Any\",\"PARA\":\"SVPM\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Benefícios (Servidores Civis e seus dependentes)\",\"RESULTADO\":\"Any\",\"PARA\":\"DPM-BSB\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Controle Trienal\",\"RESULTADO\":\"Any\",\"PARA\":\"Órgão de Pessoal\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Deixar o SAM\",\"RESULTADO\":\"Any\",\"PARA\":\"Órgão de Pessoal\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Deixar o SMI\",\"RESULTADO\":\"Any\",\"PARA\":\"DN\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Deixar o SMV\",\"RESULTADO\":\"Any\",\"PARA\":\"DN\",\"INFO\":\"DPM + OM de Origem\"},{\"FINALIDADE\":\"Deixar o SPG\",\"RESULTADO\":\"Any\",\"PARA\":\"Órgão de Pessoal\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Licença para tratamento de saúde de pessoa da família\",\"RESULTADO\":\"Any\",\"PARA\":\"SDP\",\"INFO\":\"Órgão de Pessoal* + OM de Origem\"},{\"FINALIDADE\":\"Localidade Deficiente em Assistência Sanitária\",\"RESULTADO\":\"Any\",\"PARA\":\"Órgão de Pessoal\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Missão no Exterior\",\"RESULTADO\":\"Any\",\"PARA\":\"Órgão de Pessoal\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Prorrogação de Tempo de Serviço\",\"RESULTADO\":\"Any\",\"PARA\":\"DN\",\"INFO\":\"DPM + OM de Origem\"},{\"FINALIDADE\":\"Reengajamento\",\"RESULTADO\":\"Any\",\"PARA\":\"Órgão de Pessoal\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Revisão de Reforma por incapacidade definitiva ou invalidez\",\"RESULTADO\":\"Any\",\"PARA\":\"DPM ou CPesFN\",\"INFO\":\"SVPM\"},{\"FINALIDADE\":\"Semestral de RX, substâncias radioativas e Terapia Antineoplásica\",\"RESULTADO\":\"Any\",\"PARA\":\"DSM\",\"INFO\":\"Órgão de Pessoal* + OM de Origem\"},{\"FINALIDADE\":\"Tarefa por Tempo Certo\",\"RESULTADO\":\"Any\",\"PARA\":\"OM de Origem\",\"INFO\":\"—\"},{\"FINALIDADE\":\"Término de Incapacidade\",\"RESULTADO\":\"Apto para o SAM\",\"PARA\":\"Órgão de Pessoal\",\"INFO\":\"SDP + OM de Origem\"},{\"FINALIDADE\":\"Término de Incapacidade\",\"RESULTADO\":\"Apto para o SAM com restrições\",\"PARA\":\"Órgão de Pessoal\",\"INFO\":\"SDP + OM de Origem\"},{\"FINALIDADE\":\"Término de Incapacidade\",\"RESULTADO\":\"Apto para o SMV\",\"PARA\":\"DN\",\"INFO\":\"DPM + OM de Origem\"},{\"FINALIDADE\":\"Término de Incapacidade\",\"RESULTADO\":\"Apto para o SMV com restrições\",\"PARA\":\"DN\",\"INFO\":\"DPM + OM de Origem\"},{\"FINALIDADE\":\"Término de Incapacidade\",\"RESULTADO\":\"Incapaz definitivamente para o SAM\",\"PARA\":\"Órgão de Pessoal\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Término de Incapacidade\",\"RESULTADO\":\"Incapaz temporariamente para o SMV\",\"PARA\":\"DN\",\"INFO\":\"DPM + OM de Origem\"},{\"FINALIDADE\":\"Término de Restrições\",\"RESULTADO\":\"Apto para o SMV\",\"PARA\":\"DN\",\"INFO\":\"DPM + OM de Origem\"},{\"FINALIDADE\":\"Término de Restrições\",\"RESULTADO\":\"Apto para o SMV com restrições\",\"PARA\":\"DN\",\"INFO\":\"DPM + OM de Origem\"},{\"FINALIDADE\":\"Verificação de Deficiência Funcional\",\"RESULTADO\":\"Apto para o SAM com restrições\",\"PARA\":\"Órgão de Pessoal\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Verificação de Deficiência Funcional\",\"RESULTADO\":\"Incapaz definitivamente para a especialidade\",\"PARA\":\"Órgão de Pessoal\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Verificação de Deficiência Funcional\",\"RESULTADO\":\"Incapaz definitivamente para o SAM\",\"PARA\":\"Órgão de Pessoal\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Verificação de Deficiência Funcional\",\"RESULTADO\":\"Incapaz definitivamente para o SPG\",\"PARA\":\"Órgão de Pessoal\",\"INFO\":\"OM de Origem\"},{\"FINALIDADE\":\"Verificação de Deficiência Funcional\",\"RESULTADO\":\"Incapaz temporariamente para o SAM\",\"PARA\":\"SDP\",\"INFO\":\"Órgão de Pessoal* + OM de Origem\"},{\"FINALIDADE\":\"Verificação de Deficiência Funcional\",\"RESULTADO\":\"Incapaz temporariamente para o SMV\",\"PARA\":\"DN\",\"INFO\":\"DPM + OM de Origem\"},{\"FINALIDADE\":\"Verificação de Deficiência Funcional\",\"RESULTADO\":\"Incapaz temporariamente para o SPG\",\"PARA\":\"OM de Origem\",\"INFO\":\"—\"}]\n\nQuando o laudo contiver \"com restrições por X dias/meses\", desconsidere o período para o mapeamento PARA/INFO, mas inclua o período completo na minuta.\n\nQuando uma mesma IS contiver mais de uma Finalidade ou mais de um Laudo, NÃO gere minutas separadas. Unifique em uma única minuta, concatenando as Finalidades com \" / \" e os respectivos Laudos com \" / \". Exemplo: Finalidade → \"DEIXAR O SMV / REENGAJAMENTO PARA SMV\"; Laudo → \"Apto para deixar o SMV / Apto para o SMV\".\n\n---\n\n# ESTABELECIMENTO DO INSPECIONADO\n\nUsando Situação, Posto, Corpo, Quadro, Especialidade, NIP e Nome:\n\n1. Ativo vs inativo via campo Situação.\n2. Temporário se Corpo = CPRM ou CORM.\n3. Posto → PostoAbrev e Oficial/Praça: CMG/CF/CC/CT/1T/2T=Oficial | GM/SO/1SG/2SG/3SG/CB/MN/MN-RC/SD/GR/AL/SCNS=Praça.\n4. NIP mascarado no formato 00.0000.00.\n\nFormato do INSPECIONADO:\n- Oficial ativo: PostoAbrev (Quadro) NIP Nome\n- Oficial ativo temporário: PostoAbrev (RM2-Quadro) NIP Nome\n- Praça ativo: PostoAbrev-Especialidade NIP Nome\n- Praça ativo temporário: PostoAbrev-RM2-Especialidade NIP Nome\n- Servidor Civil ou MN-RC: PostoAbrev NIP Nome\n\n---\n\n# AGRUPAMENTO\nAgrupar múltiplas IS em uma única minuta SOMENTE quando Finalidade, PARA e INFO forem idênticos. Caso contrário, gerar minutas separadas.\n\n---\n\n# TEMPLATE — IS ÚNICA\n\nPARA: [PARA]\n\nINFO: [INFO]\n\nASSUNTO: INSPEÇÃO DE SAÚDE FIM [FINALIDADE] - [INSPECIONADO] ([OM])\n\nALFA - PTC que a [Junta] concluiu em [DATA] a IS FIM [FINALIDADE] atinente ao [INSPECIONADO] ([OM]) e exarou o seguinte laudo: \"[LAUDO]\". ACD TIS nº [TIS]; e\n\nBRAVO - O REF TIS (modelo DS-1A) pode ser verificado digitalmente por meio do acesso ao sítio https://sinais.dsm.mb/tisonline, informando o código de validação [DS1A] e selecionando a opção \"Download do TIS\" BT\n\n---\n\n# TEMPLATE — MÚLTIPLAS IS (mesmo PARA e INFO)\n\nPARA: [PARA]\n\nINFO: [INFO]\n\nASSUNTO: INSPEÇÕES DE SAÚDE FIM [FINALIDADE]\n\nALFA - PTC [Junta] concluiu as IS FIM [FINALIDADE] atinentes aos militares abaixo relacionados:\n\nUNO - em [DATA1]: [INSPECIONADO1] ([OM1]) e exarou o seguinte laudo: \"[LAUDO1]\". ACD TIS nº [TIS1] e Código DS-1A [DS1A1];\n\nDOIS - em [DATA2]: [INSPECIONADO2] ([OM2]) e exarou o seguinte laudo: \"[LAUDO2]\". ACD TIS nº [TIS2] e Código DS-1A [DS1A2];\n\nBRAVO - Os REF TIS (modelo DS-1A) podem ser verificados digitalmente por meio do acesso ao sítio https://sinais.dsm.mb/tisonline, informando o respectivo Código DS-1A e selecionando a opção \"Download do TIS\" BT\n\n---\n\n# CONCORDÂNCIA DE GÊNERO\n\nQuando o Sexo do inspecionado for Feminino, aplique as seguintes substituições em TODO o texto da minuta EXCETO dentro do laudo (conteúdo entre aspas após \"exarou o seguinte laudo:\"):\n\n- \"atinente ao\" → \"atinente à\"\n- \"ao [INSPECIONADO]\" → \"à [INSPECIONADO]\" (preposição antes do nome/posto)\n- \"o militar\" / \"o inspecionado\" → \"a militar\" / \"a inspecionada\"\n- \"aos militares\" → \"às militares\" (se todas forem femininas no agrupamento)\n\nRegra geral: ajuste artigos, preposições e pronomes para o feminino em todo texto gerado fora das aspas do laudo. Não altere siglas, abreviações de posto ou o texto literal do laudo.\n\n---\n\n# VALIDAÇÕES\nAntes de gerar, confirme todos os campos obrigatórios: Nome, Posto, Situação, Quadro (se oficial), Especialidade (se praça), NIP, OM, Junta, Finalidade, Data, TIS, Código DS-1A, Laudo. Se algum faltar: \"Não foi possível identificar o campo: [CAMPO]\". Não exibir raciocínio interno. Retornar apenas a minuta final.";

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
      const geminiOptions = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(geminiBody),
        muteHttpExceptions: true
      };

      const geminiResp = UrlFetchApp.fetch(geminiUrl, geminiOptions);
      const geminiJson = JSON.parse(geminiResp.getContentText());

      if (geminiJson.error) throw new Error("Erro na API Gemini: " + geminiJson.error.message);

      const minuta = geminiJson.candidates[0].content.parts[0].text;

      // Salvar no Google Drive como Google Doc
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

    throw new Error("Ação não reconhecida.");

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: err.toString(),
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
