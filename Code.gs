const SPREADSHEET_ID = "18gmc96AQq9h_atzk6_toZY9Nte_E4rnJ-rbsBqqU7x8";
const EXTRAS_SPREADSHEET_ID = "1vWl2ANgGDYLa5vTtCTUrjitDnuqz8IA3qGhD1Ha9C6Q";
const DRIVE_FOLDER_ID = "176YQTOOWXuE78Xul49XYpJsVNyu-eZFi";

function doGet(e) {
  if (!e) e = { parameter: {} };
  const action = e.parameter.action;

  try {
    if (action === "getLookups") {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const listasRefSheet = ss.getSheetByName("ListasRef");
      const listasRefData = listasRefSheet.getDataRange().getValues();
      const headers = listasRefData[0];
      
      const finalidades = getColumnValues(listasRefData, headers.indexOf("FINALIDADE"));
      const pg = getColumnValues(listasRefData, headers.indexOf("P/G"));
      const quadroOficiais = getColumnValues(listasRefData, headers.indexOf("QUADRO_OFICIAIS"));
      const especialidadePracas = getColumnValues(listasRefData, headers.indexOf("ESPECIALIDADE_PRACAS"));
      const especialidades = getColumnValues(listasRefData, headers.indexOf("ESPECIALIDADE"));
      const dispensas = getColumnValues(listasRefData, headers.indexOf("DISPENSAS"));

      const omSheet = ss.getSheetByName("OM");
      const omData = omSheet.getDataRange().getValues();
      const omHeaders = omData[0];
      const oms = getColumnValues(omData, omHeaders.indexOf("OM"));

      const peritosSheet = ss.getSheetByName("Perito");
      const peritosData = peritosSheet.getDataRange().getValues();
      let peritos = [];
      for (let i = 1; i < peritosData.length; i++) {
        if (peritosData[i][0]) {
          peritos.push({
            PERITO: peritosData[i][0],
            NOME_PERITO: peritosData[i][1],
            POSTO: peritosData[i][2],
            CARGO: peritosData[i][3],
            EMAIL: peritosData[i][4],
          });
        }
      }

      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          data: {
            FINALIDADES: finalidades,
            PG: pg,
            QUADRO_OFICIAIS: quadroOficiais,
            ESPECIALIDADE_PRACAS: especialidadePracas,
            ESPECIALIDADES: especialidades,
            DISPENSAS: dispensas,
            OM: oms,
            PERITOS: peritos,
          },
        }),
      ).setMimeType(ContentService.MimeType.JSON);

    } else if (action === "getMilitaresList") {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const militaresSheet = ss.getSheetByName("Militares");
      const militaresData = militaresSheet.getDataRange().getValues();
      const headers = militaresData[0];
      const nipIdx = headers.indexOf("NIP");
      const nomeIdx = headers.indexOf("NOME_COMPLETO");
      
      const militares = [];
      if (nipIdx !== -1 && nomeIdx !== -1) {
        for (let i = 1; i < militaresData.length; i++) {
          const n = String(militaresData[i][nomeIdx] || "").trim();
          const nip = String(militaresData[i][nipIdx] || "").trim();
          if (n && nip) {
            militares.push({
              nome: n,
              nip: nip
            });
          }
        }
      }
      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          data: militares,
        }),
      ).setMimeType(ContentService.MimeType.JSON);

    } else if (action === "getTemplatesDocumentos") {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName("Templates_Documentos");
      if (!sheet) {
          return ContentService.createTextOutput(JSON.stringify({success: false, message: "Aba Templates_Documentos não encontrada"})).setMimeType(ContentService.MimeType.JSON);
      }
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      const templates = [];
      for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
          const tpl = {};
          headers.forEach((h, col) => {
            tpl[h] = data[i][col];
          });
          templates.push(tpl);
        }
      }

      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          data: templates,
        }),
      ).setMimeType(ContentService.MimeType.JSON);

    } else if (action === "getPareceresList") {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName("Pareceres");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({success: false, message: "Aba Pareceres não encontrada"})).setMimeType(ContentService.MimeType.JSON);
      }
      const data = sheet.getDataRange().getValues();
      const records = [];
      for (let i = 1; i < data.length; i++) {
        if (data[i][4]) { 
          let dataVal = data[i][0];
          if (dataVal instanceof Date) {
            const day = String(dataVal.getDate()).padStart(2, '0');
            const month = String(dataVal.getMonth() + 1).padStart(2, '0');
            const year = dataVal.getFullYear();
            dataVal = `${day}/${month}/${year}`;
          }
          records.push({
            data: String(dataVal),
            especialidade: String(data[i][3]),
            inspecionado: String(data[i][4]),
            link: String(data[i][6])
          });
        }
      }
      return ContentService.createTextOutput(
        JSON.stringify({success: true, data: records.reverse()})
      ).setMimeType(ContentService.MimeType.JSON);

    } else if (action === "getPericiaMenorList") {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName("Pericia_Menor");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({success: false, message: "Aba Pericia_Menor não encontrada"})).setMimeType(ContentService.MimeType.JSON);
      }
      const data = sheet.getDataRange().getValues();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const records = [];
      for (let i = 1; i < data.length; i++) {
        if (!data[i][1]) continue;
        let dataAtestado = data[i][6];
        let dataAtestadoStr = '';
        if (dataAtestado instanceof Date) {
          dataAtestadoStr = String(dataAtestado.getDate()).padStart(2, '0') + '/' +
                            String(dataAtestado.getMonth() + 1).padStart(2, '0') + '/' +
                            dataAtestado.getFullYear();
        } else {
          dataAtestadoStr = String(dataAtestado || '');
        }
        let dataTermino = data[i][9];
        let vigente = false;
        let concluido = false;
        if (dataTermino instanceof Date) {
          const dt = new Date(dataTermino);
          dt.setHours(0, 0, 0, 0);
          vigente = dt >= today;
          concluido = dt < today;
        }
        records.push({
          inspecionado: String(data[i][1]),
          om: String(data[i][2] || ''),
          cid: String(data[i][4]),
          dispensas: String(data[i][5] || ''),
          dataAtestado: dataAtestadoStr,
          dataAtestadoTs: dataAtestado instanceof Date ? dataAtestado.getTime() : 0,
          tempoAtestado: String(data[i][7] || ''),
          vigente: vigente,
          concluido: concluido,
          vdf: data[i][10] === true || String(data[i][10]).toUpperCase() === 'TRUE' || String(data[i][10]).toUpperCase() === 'VERDADEIRO',
          link: String(data[i][12] || '')
        });
      }
      return ContentService.createTextOutput(
        JSON.stringify({success: true, data: records.reverse()})
      ).setMimeType(ContentService.MimeType.JSON);

    } else if (action === "getExtras") {
      const ss = SpreadsheetApp.openById(EXTRAS_SPREADSHEET_ID);
      const sheet = ss.getSheets()[0];
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
      }
      const headers = data[0];
      const formatIdx   = headers.indexOf("FORMATO") !== -1 ? headers.indexOf("FORMATO") : 0;
      const titleIdx    = headers.indexOf("TITULO")  !== -1 ? headers.indexOf("TITULO")  : 1;
      const descIdx     = headers.indexOf("DESCRICAO") !== -1 ? headers.indexOf("DESCRICAO") : 2;
      const linkIdx     = headers.indexOf("LINK")    !== -1 ? headers.indexOf("LINK")    : 3;
      const imageIdx    = headers.indexOf("IMAGEM")  !== -1 ? headers.indexOf("IMAGEM")  : 4;
      const extras = [];
      for (let i = 1; i < data.length; i++) {
        const rawFormat = String(data[i][formatIdx] || "").trim();
        if (!rawFormat) continue;
        extras.push({
          format:      rawFormat,
          title:       String(data[i][titleIdx]  || "").trim(),
          description: String(data[i][descIdx]   || "").trim(),
          link:        String(data[i][linkIdx]    || "").trim(),
          imageUrl:    String(data[i][imageIdx]   || "").trim() || null,
        });
      }
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, data: extras })
      ).setMimeType(ContentService.MimeType.JSON);

    } else if (action === "getMilitar") {
      const nip = e.parameter.nip;
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const militaresSheet = ss.getSheetByName("Militares");
      const militaresData = militaresSheet.getDataRange().getValues();
      const headers = militaresData[0];
      const nipIdx = headers.indexOf("NIP");
      for (let i = 1; i < militaresData.length; i++) {
        const checkNip = String(militaresData[i][nipIdx]).replace(/\D/g, "");
        const searchedNip = String(nip).replace(/\D/g, "");
        if (checkNip === searchedNip && checkNip !== "") {
          const militar = {};
          headers.forEach((h, col) => {
            militar[h] = militaresData[i][col];
          });
          return ContentService.createTextOutput(
            JSON.stringify({
              success: true,
              data: militar,
            }),
          ).setMimeType(ContentService.MimeType.JSON);
        }
      }

      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          message: "NIP não encontrado",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: err.toString(),
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function getColumnValues(data, colIndex) {
  if (colIndex === -1) return [];
  const vals = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][colIndex]) vals.push(data[i][colIndex]);
  }
  return vals;
}

function doPost(e) {
  if (!e) e = { postData: { contents: "{}" } };
  
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

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
    // LÓGICA: IMPRESSÃO
    // ==========================================
    if (payload.action === "imprimir") {
      const pdfFile = DriveApp.getFileById(payload.pdfId);
      const pdfBlob = pdfFile.getBlob();
      const htmlBody = `<div data-marker="__QUOTED_TEXT__">
<div style="font-family: 'tahoma' , 'new york' , 'times' , serif; font-size: 14pt; color: #000000;">
<div style="font-family: 'tahoma' , 'new york' , 'times' , serif; font-size: 14pt; color: #000000;">
<div id="3623555f-eed2-48ad-80af-6e6ccd41f893">
<div style="font-family: 'tahoma' , 'new york' , 'times' , serif; font-size: 14pt; color: #000000;">
<div id="3623555f-eed2-48ad-80af-6e6ccd41f893"><br /><center style="width: 100%; table-layout: fixed;">
<div style="max-width: 960px; margin: 0 auto;">
<table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width: 960px; margin: auto; background-color: #ffffff; font-family: 'carlito' , 'calibri' , 'arial' , sans-serif; width: 100%;">
<tbody>
<tr>
<td style="padding: 0px; text-align: center; background-color: #050f41; width: 100%;"><img width="100%" style="width: 100%; max-width: 960px; height: auto; display: block; border: 0;"
alt="Cabeçalho Hospital Naval de Recife - Junta Regular de Saúde" dfsrc="https://i.imgur.com/Btu1CAG.png" src="https://i.imgur.com/Btu1CAG.png" /></td>
</tr>
<tr>
<td style="background-color: #ffffff; padding: 40px 50px 10px; text-align: left; font-family: 'carlito' , 'calibri' , 'arial' , sans-serif; font-size: 18px; line-height: 1.5; color: #333333; width: 100%;">
<p style="margin: 0 0 25px 0;"><strong>Sub,</strong></p>
<p style="margin: 0 0 25px 0;"><span style="color: #000080; background-color: #ffff99;"><strong>Por favor imprimir colorido o pedido de parecer anexo.&nbsp;</strong></span></p>
<div style="height: 55px;"></div>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #eeeeee; padding-top: 20px;">
<tbody>
<tr>
<td style="font-family: 'carlito' , 'calibri' , 'arial' , sans-serif; color: #333333;">
<div style="font-size: 15px; margin-bottom: 5px; color: #333333;">Respeitosamente,</div>
<div style="font-size: 18px; font-weight: bold; color: #050f41;
margin: 0;"><span style="font-size: 16pt;">JRS/HNRe AI</span></div>
<div style="height: 20px;"></div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody>
<tr>
<td height="30"></td>
</tr>
</tbody>
</table>
</div>
</center></div>
</div>
</div>
</div>
</div>
</div>`;
      
      MailApp.sendEmail({
        to: "giorginis@marinha.mil.br",
        subject: "PARA IMPRIMIR",
        body: "Por favor imprimir colorido o pedido de parecer anexo.",
        htmlBody: htmlBody,
        name: "JRS/HNRe AI",
        attachments: [pdfBlob]
      });
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
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

    // ==========================================
    // LÓGICA COMUM: REGISTRO DE NOVO MILITAR
    // ==========================================
    if (payload.action !== "imprimir" && payload.isNewMilitar) {
      const militaresSheet = ss.getSheetByName("Militares");
      const headers = militaresSheet.getRange(1, 1, 1, militaresSheet.getLastColumn()).getValues()[0];
      const newRow = new Array(headers.length).fill("");

      const setVal = (colName, value) => {
        const idx = headers.indexOf(colName);
        if (idx !== -1) newRow[idx] = value;
      };

      setVal("SITUAÇÃO", payload.situacao || "");
      setVal("OM", payload.om || "");
      setVal("P/G/Q", payload.pgq || "");
      setVal("NIP", payload.nip || "");
      setVal("NOME_COMPLETO", payload.nomeMilitar || "");

      militaresSheet.appendRow(newRow);
    }

    // ==========================================
    // LÓGICA 2: GERAÇÃO DA PERÍCIA MENOR
    // ==========================================
    if (payload.action === "gerar_pericia_menor") {
      
      let templateId = "";
      if (payload.perito && payload.perito.includes("MAURISTON")) {
        templateId = "130zzSeDRw2nso-QgfwIjOzbyet67Uvy1FQzL-V5X6do";
      } else if (payload.perito && (payload.perito.includes("JÚLIO") || payload.perito.includes("JULIO"))) {
        templateId = "1qLXEBSNV1DpeChqKm-i_4uVFlvClZ6YmpE2W3KxyRRI";
      } else {
        throw new Error("Template não encontrado para o perito selecionado: " + payload.perito);
      }

      const templateDoc = DriveApp.getFileById(templateId);

      const pmenorFolderId = "18_322EHraGIhfWXzh8ZgOFpnIw884Ox6";
      const parentFolder = DriveApp.getFolderById(pmenorFolderId);
      let subfolder = null;
      
      const folders = parentFolder.searchFolders('title = "' + payload.inspecionado + '"');
      if (folders.hasNext()) {
        subfolder = folders.next();
      } else {
        subfolder = parentFolder.createFolder(payload.inspecionado);
      }

      const dateObj = new Date();
      const shortDate = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
      const dataHojeBr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "dd/MM/yyyy");
      
      let dataAtestadoBr = payload.dataAtestado;
      if (dataAtestadoBr && dataAtestadoBr.includes("-")) {
        const parts = dataAtestadoBr.split("-");
        dataAtestadoBr = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }

      const newFileName = "Perícia Menor - " + payload.inspecionado + " - " + dataHojeBr.replace(/\//g, ".");
      const newFile = templateDoc.makeCopy(newFileName, subfolder);
      const newDoc = DocumentApp.openById(newFile.getId());
      const body = newDoc.getBody();

      body.replaceText("{{INSPECIONADO}}", payload.inspecionado);
      body.replaceText("{{SERVICO}}", payload.servico);
      body.replaceText("{{DISPENSAS}}", payload.dispensas);
      body.replaceText("{{TEMPO_EXTENSO}}", payload.tempoExtenso);
      body.replaceText("{{TEMPO_HOMOLOG}}", payload.tempoHomolog.toString());
      body.replaceText("{{DATA_ATESTADO}}", dataAtestadoBr);
      body.replaceText("{{DATA_HOJE}}", dataHojeBr);
      
      let vdfText = payload.vdf ?
        "Encaminhar para VDF:    ( X ) Sim \t (   ) Não" :
        "Encaminhar para VDF:    (   ) Sim \t ( X ) Não";
        
      body.replaceText("{{VDF}}", vdfText);

      if (payload.vdf) {
        let searchResult = body.findText("Encaminhar para VDF.*Sim");
        if (searchResult) {
          let textElement = searchResult.getElement().asText();
          let start = searchResult.getStartOffset();
          let end = searchResult.getEndOffsetInclusive();
          
          textElement.setBold(start, end, true);
          textElement.setBackgroundColor(start, end, "#FFFF00");
        }
      }

      if (payload.base64Image) {
        body.appendPageBreak(); 
        const decodedImg = Utilities.base64Decode(payload.base64Image);
        const blobImg = Utilities.newBlob(decodedImg, 'image/jpeg', 'atestado.jpg');
        
        const imgElement = body.appendImage(blobImg);
        const pageWidth = newDoc.getBody().getPageWidth() - newDoc.getBody().getMarginLeft() - newDoc.getBody().getMarginRight();
        const imgWidth = imgElement.getWidth();
        const imgHeight = imgElement.getHeight();
        const ratio = pageWidth / imgWidth;
        
        imgElement.setWidth(pageWidth);
        imgElement.setHeight(imgHeight * ratio);
      }

      newDoc.saveAndClose();

      const pdfBlob = newFile.getAs("application/pdf");
      const pdfFile = subfolder.createFile(pdfBlob);
      pdfFile.setName(newFileName + ".pdf");

      newFile.setTrashed(true);

      const periciaSheet = ss.getSheetByName("Pericia_Menor");
      if (!periciaSheet) throw new Error("Aba 'Pericia_Menor' não encontrada no Sheets.");

      periciaSheet.appendRow([
        shortDate,
        payload.inspecionado,
        payload.om,
        payload.servico,
        payload.cid,
        payload.dispensas,
        payload.dataAtestado,
        payload.tempoAtestado,
        payload.tempoHomolog,
        "",
        payload.vdf,
        payload.perito,
        pdfFile.getUrl()
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        pdfUrl: pdfFile.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ==========================================
    // LÓGICA 3: PARECERES REGULARES
    // ==========================================
    if (payload.action === undefined && payload.especialidade) {
      
      const templatesSheet = ss.getSheetByName("Templates");
      const templatesData = templatesSheet.getDataRange().getValues();
      let templateId = null;
      for (let i = 1; i < templatesData.length; i++) {
        if (templatesData[i][0] === payload.especialidade) {
          templateId = templatesData[i][1];
          break;
        }
      }
      if (!templateId)
        throw new Error("Template não encontrado para a especialidade: " + payload.especialidade);
        
      const templateDoc = DriveApp.getFileById(templateId);
      if (!templateDoc) throw new Error("Arquivo de template não encontrado.");
      
      const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      let subfolder = null;
      const folders = parentFolder.searchFolders('title = "' + payload.inspecionado + '"');
      if (folders.hasNext()) {
        subfolder = folders.next();
      } else {
        subfolder = parentFolder.createFolder(payload.inspecionado);
      }

      const dateObj = new Date();
      const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      const formattedDate = dateObj.getDate() + " de " + months[dateObj.getMonth()] + " de " + dateObj.getFullYear();
      const shortDate = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "dd/MM/yyyy");
      
      const newFileName = "Parecer - " + payload.inspecionado + " - " + payload.especialidade;
      const newFile = templateDoc.makeCopy(newFileName, subfolder);
      const newDoc = DocumentApp.openById(newFile.getId());
      const body = newDoc.getBody();
      
      body.replaceText("{{DATA_HOJE}}", formattedDate);
      body.replaceText("{{INSPECIONADO}}", payload.inspecionado);
      body.replaceText("{{FINALIDADE}}", payload.finalidade);
      body.replaceText("{{HISTORICO}}", payload.historico || "");
      body.replaceText("{{NOME_PERITO}}", payload.nomePerito);
      body.replaceText("{{POSTO}}", payload.postoPerito);
      body.replaceText("{{CARGO}}", payload.cargoPerito);

      newDoc.saveAndClose();

      const pdfBlob = newFile.getAs("application/pdf");
      const pdfFile = subfolder.createFile(pdfBlob);
      pdfFile.setName(newFileName + ".pdf");
      pdfFile.setDescription(payload.especialidade);

      const odtUrl = "https://docs.google.com/document/d/" + newFile.getId() + "/export?format=odt";
      const odtBlob = UrlFetchApp.fetch(odtUrl, {
        headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      }).getBlob();
      odtBlob.setName(newFileName + ".odt");

      newFile.setTrashed(true);
      
      const pareceresSheet = ss.getSheetByName("Pareceres");
      pareceresSheet.appendRow([
        shortDate,
        payload.peritoIdentifier,
        payload.finalidade,
        payload.especialidade,
        payload.inspecionado,
        payload.om,
        pdfFile.getUrl(),
      ]);
      
      const monthNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
      const dayStr = String(dateObj.getDate()).padStart(2, '0');
      const monthStr = monthNames[dateObj.getMonth()];
      const yearStr = String(dateObj.getFullYear());
      const dataHojeBr = dayStr + monthStr + yearStr;
      
      let htmlTemplate = `<div data-marker="__QUOTED_TEXT__">
<div style="font-family: 'tahoma' , 'new york' , 'times' , serif; font-size: 14pt; color: #000000;">
<div style="font-family: 'tahoma' , 'new york' , 'times' , serif; font-size: 14pt; color: #000000;">
<div style="font-family: 'tahoma' , 'new york' , 'times' , serif; font-size: 14pt; color: #000000;">
<div style="font-family: 'carlito' , 'calibri' , 'arial' , sans-serif; font-size: 15px; color: #333333; line-height: 1.6;">
<div id="3623555f-eed2-48ad-80af-6e6ccd41f893"><center style="width: 100%; table-layout: fixed;">
<div style="max-width: 960px; margin: 0px auto;">
<table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width: 960px; margin: auto; background-color: #ffffff; font-family: 'carlito' , 'calibri' , 'arial' , sans-serif; width: 100%;">
<tbody>
<tr>
<td style="padding: 0px; text-align: center; background-color: #050f41; width: 100%;"><img width="100%" style="width: 100%; 
max-width: 960px; height: auto; display: block; border: 0px;" alt="Cabeçalho Hospital Naval de Recife - Junta Regular de Saúde" dfsrc="https://i.imgur.com/Btu1CAG.png" src="https://i.imgur.com/Btu1CAG.png" /></td>
</tr>
<tr>
<td style="background-color: #ffffff;
padding: 40px 50px 30px; text-align: left; font-family: 'carlito' , 'calibri' , 'arial' , sans-serif; font-size: 15px; line-height: 1.6; color: #333333;
width: 100%;">
<p style="margin: 0px 0px 20px; font-size: 18px; color: #333333;"><strong>{{PERITO}},</strong></p>
<p style="margin: 0px 0px 20px; font-size: 15px; text-align: justify;
color: #333333;"><span style="font-size: 12pt;">Seguem em anexo os pedido de parecer gerado em PDF e editável em .odt.</span></p>
<div style="background-color: #f4f6f9;
border-left: 4px solid #050f41; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
<p style="margin: 0px 0px 10px; font-size: 18px; color: #050f41; font-weight: bold;
text-transform: uppercase;">SOLICITAÇÃO DE PARECER ESPECIALIZADO PERICIAL</p>
<ul style="margin: 0px; padding-left: 20px; list-style-type: disc;
line-height: 1.6;">
<li style="margin-bottom: 6px;"><span style="font-size: 12pt;">Inspecionado: <span style="color: #050f41; font-weight: bold;">{{INSPECIONADO}}</span></span></li>
<li style="margin-bottom: 6px;"><span style="font-size: 12pt;"><span style="color: #050f41;">Finalidade IS:</span> <span style="color: #050f41;
font-weight: bold;">{{FINALIDADE}}</span></span></li>
<li style="margin-bottom: 6px;"><span style="font-size: 12pt;"><span style="color: #050f41;">Especialidade:</span> <span style="font-weight: bold;
color: #050f41;">{{ESPECIALIDADE}}</span></span></li>
<li style="margin-bottom: 6px;"><span style="font-size: 12pt;">Data: <span style="padding: 2px 5px; font-weight: bold; color: #333333;">{{DATA_HOJE}}</span></span></li>
</ul>
</div>
<div style="background-color: #fff5f5; border: 1px solid #f8d7da;
padding: 20px; margin-bottom: 35px; border-radius: 4px;">
<p style="margin: 0px; font-size: 15px; color: #333333; line-height: 1.6;
text-align: justify;"><span style="color: #ff0000;"><strong><span style="color: #993300;">LEMBRETE:</span> <span style="color: #993300;">Uma vez iniciada a entrevista, a JRS tem <span style="color: #ff0000;">20 dias corridos para concluir a IS.</span> Caso o parecer solicitado não seja prontificado, deveremos concluir a IS utilizando os dados disponíveis até o momento.</span></strong></span></p>
</div>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #eeeeee;
padding-top: 20px;">
<tbody>
<tr>
<td style="font-family: 'carlito' , 'calibri' , 'arial' , sans-serif; color: #333333;">
<p style="font-size: 15px; margin: 0px 0px 15px;
color: #333333;">Atenciosamente,</p>
<div style="font-size: 18px; font-weight: bold; color: #050f41; margin: 0px 0px 2px;">Mauriston Renan Martins Silva</div>
<div style="font-size: 14px; line-height: 1.3;
color: #666666; font-weight: normal;"><strong>Capitão-Tenente (Md)</strong><br />Presidente</div>
<div style="height: 35px;"></div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td style="background-color: #ececec; padding: 15px 20px; border-top: 1px solid #eeeeee;
width: 100%;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%;">
<tbody>
<tr>
<td width="35%" align="center" valign="middle" style="padding-right: 15px; width: 50.4348%;"><img width="140" style="width: 358px; max-width: 100%;
height: 102px; display: inline-block; border: 0px;" alt="Logo Marinha do Brasil" dfsrc="https://i.imgur.com/5JKaEFU.png" src="https://i.imgur.com/5JKaEFU.png" /></td>
<td width="1" style="border-left: 1px solid #cccccc; font-size: 1px;
line-height: 1px; width: 6.63044%;">&nbsp;</td>
<td width="65%" align="left" valign="middle" style="padding-left: 20px; font-family: 'carlito' , 'calibri' , 'arial' , sans-serif; font-size: 14px;
line-height: 1.6; color: #555555; width: 64%;"><strong style="color: #333333;">Hospital Naval de Recife - Junta Regular de Saúde</strong><br />(81) 3036 - 9073 <span style="margin: 0px 8px;">/</span> <a href="mailto:hnre.jrs@marinha.mil.br" style="color: #050f41;
text-decoration: none;" rel="noopener nofollow noopener noreferrer nofollow noopener noreferrer nofollow noopener noreferrer" target="_blank">hnre.jrs@marinha.mil.br</a><br />📍 Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table border="0" cellpadding="0" cellspacing="0" width="100%">
<tbody>
<tr>
<td height="30">&nbsp;</td>
</tr>
</tbody>
</table>
</div>
</center></div>
</div>
</div>
</div>
</div>
</div>`;

      htmlTemplate = htmlTemplate.replace("{{PERITO}}", payload.peritoIdentifier || "Perito");
      htmlTemplate = htmlTemplate.replace("{{INSPECIONADO}}", payload.inspecionado || "");
      htmlTemplate = htmlTemplate.replace("{{FINALIDADE}}", payload.finalidade || "");
      htmlTemplate = htmlTemplate.replace("{{ESPECIALIDADE}}", payload.especialidade || "");
      htmlTemplate = htmlTemplate.replace("{{DATA_HOJE}}", dataHojeBr);

      const subject = "Parecer " + payload.especialidade + " " + payload.inspecionado;
      const fallbackBody = "Em anexo o parecer gerado (" + payload.especialidade + ").";
      
      MailApp.sendEmail({
        to: payload.emailPerito,
        subject: subject,
        body: fallbackBody,
        htmlBody: htmlTemplate,
        name: "JRS/HNRe AI",
        attachments: [pdfBlob, odtBlob]
      });
      
      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          pdfUrl: pdfFile.getUrl(),
          pdfFileId: pdfFile.getId(),
        }),
      ).setMimeType(ContentService.MimeType.JSON);
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
