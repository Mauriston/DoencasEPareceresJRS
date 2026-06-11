const SPREADSHEET_ID = "18gmc96AQq9h_atzk6_toZY9Nte_E4rnJ-rbsBqqU7x8";
const DRIVE_FOLDER_ID = "176YQTOOWXuE78Xul49XYpJsVNyu-eZFi";

function doGet(e) {
  if (!e) e = { parameter: {} };
  const action = e.parameter.action;

  try {
    if (action === "getLookups") {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      // Get ListasRef
      const listasRefSheet = ss.getSheetByName("ListasRef");
      const listasRefData = listasRefSheet.getDataRange().getValues();
      const headers = listasRefData[0];
      const finalidades = getColumnValues(
        listasRefData,
        headers.indexOf("FINALIDADE"),
      );
      const pg = getColumnValues(listasRefData, headers.indexOf("P/G"));
      const quadroOficiais = getColumnValues(
        listasRefData,
        headers.indexOf("QUADRO_OFICIAIS"),
      );
      const especialidadePracas = getColumnValues(
        listasRefData,
        headers.indexOf("ESPECIALIDADE_PRACAS"),
      );
      const especialidades = getColumnValues(
        listasRefData,
        headers.indexOf("ESPECIALIDADE"),
      );
      // Get OMs
      const omSheet = ss.getSheetByName("OM");
      const omData = omSheet.getDataRange().getValues();
      const omHeaders = omData[0];
      const oms = getColumnValues(omData, omHeaders.indexOf("OM"));

      // Get Peritos
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

    // NOVO ENDPOINT: Buscar Pareceres Gerados
    } else if (action === "getPareceresList") {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName("Pareceres");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({success: false, message: "Aba Pareceres não encontrada"})).setMimeType(ContentService.MimeType.JSON);
      }
      const data = sheet.getDataRange().getValues();
      const records = [];
      // Colunas: [0]Data, [1]Perito, [2]Finalidade, [3]Especialidade, [4]Inspecionado, [5]OM, [6]Link
      for (let i = 1; i < data.length; i++) {
        if (data[i][4]) { 
          let dataVal = data[i][0];
          // Tratamento para data
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
        JSON.stringify({success: true, data: records.reverse()}) // Reverse para listar os mais recentes primeiro
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
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. If we have to register a new militar
    if (payload.isNewMilitar) {
      const militaresSheet = ss.getSheetByName("Militares");
      const headers = militaresSheet
        .getRange(1, 1, 1, militaresSheet.getLastColumn())
        .getValues()[0];
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

    // 2. Generate PDF
    // Find Template ID
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
      throw new Error(
        "Template não encontrado para a especialidade: " +
          payload.especialidade,
      );
    const templateDoc = DriveApp.getFileById(templateId);
    if (!templateDoc) throw new Error("Arquivo de template não encontrado.");
    
    // Check/create Inspecionado subfolder
    const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    let subfolder = null;
    const folders = parentFolder.searchFolders(
      'title = "' + payload.inspecionado + '"',
    );
    if (folders.hasNext()) {
      subfolder = folders.next();
    } else {
      subfolder = parentFolder.createFolder(payload.inspecionado);
    }

    // Date formatting (ex: "1 de abril de 2026")
    const dateObj = new Date();
    const months = [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
    ];
    const formattedDate =
      dateObj.getDate() +
      " de " +
      months[dateObj.getMonth()] +
      " de " +
      dateObj.getFullYear();
    const shortDate = Utilities.formatDate(
      dateObj,
      Session.getScriptTimeZone(),
      "dd/MM/yyyy",
    );
    // Duplicate doc
    const newFileName =
      "Parecer - " + payload.inspecionado + " - " + payload.especialidade;
    const newFile = templateDoc.makeCopy(newFileName, subfolder);
    const newDoc = DocumentApp.openById(newFile.getId());
    const body = newDoc.getBody();
    // Replace Placeholders
    body.replaceText("{{DATA_HOJE}}", formattedDate);
    body.replaceText("{{INSPECIONADO}}", payload.inspecionado);
    body.replaceText("{{FINALIDADE}}", payload.finalidade);
    body.replaceText("{{HISTORICO}}", payload.historico || "");
    body.replaceText("{{NOME_PERITO}}", payload.nomePerito);
    body.replaceText("{{POSTO}}", payload.postoPerito);
    body.replaceText("{{CARGO}}", payload.cargoPerito);

    newDoc.saveAndClose();

    // Save as PDF
    const pdfBlob = newFile.getAs("application/pdf");
    const pdfFile = subfolder.createFile(pdfBlob);
    pdfFile.setName(newFileName + ".pdf");
    pdfFile.setDescription(payload.especialidade);

    // We already have the newFile (Google Doc) which can be downloaded as odt
    const odtUrl =
      "https://docs.google.com/document/d/" +
      newFile.getId() +
      "/export?format=odt";
    const odtBlob = UrlFetchApp.fetch(odtUrl, {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    }).getBlob();
    odtBlob.setName(newFileName + ".odt");

    // Clean up temporary doc
    newFile.setTrashed(true);
    
    // Register Parecer
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
max-width: 960px; height: auto; display: block; border: 0px;" alt="Cabe&ccedil;alho Hospital Naval de Recife - Junta Regular de Sa&uacute;de" dfsrc="https://i.imgur.com/Btu1CAG.png" src="https://i.imgur.com/Btu1CAG.png" /></td>
</tr>
<tr>
<td style="background-color: #ffffff;
padding: 40px 50px 30px; text-align: left; font-family: 'carlito' , 'calibri' , 'arial' , sans-serif; font-size: 15px; line-height: 1.6; color: #333333;
width: 100%;">
<p style="margin: 0px 0px 20px; font-size: 18px; color: #333333;"><strong>{{PERITO}},</strong></p>
<p style="margin: 0px 0px 20px; font-size: 15px; text-align: justify;
color: #333333;"><span style="font-size: 12pt;">Seguem em anexo os pedido de parecer gerado em PDF e edit&aacute;vel em .odt.</span></p>
<div style="background-color: #f4f6f9;
border-left: 4px solid #050f41; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
<p style="margin: 0px 0px 10px; font-size: 18px; color: #050f41; font-weight: bold;
text-transform: uppercase;">SOLICITA&Ccedil;&Atilde;O DE PARECER ESPECIALIZADO PERICIAL</p>
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
text-align: justify;"><span style="color: #ff0000;"><strong><span style="color: #993300;">LEMBRETE:</span> <span style="color: #993300;">Uma vez iniciada a entrevista, a JRS tem <span style="color: #ff0000;">20 dias corridos para concluir a IS.</span> Caso o parecer solicitado n&atilde;o seja prontificado, deveremos concluir a IS utilizando os dados dispon&iacute;veis at&eacute; o momento.</span></strong></span></p>
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
color: #666666; font-weight: normal;"><strong>Capit&atilde;o-Tenente (Md)</strong><br />Presidente</div>
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
line-height: 1.6; color: #555555; width: 64%;"><strong style="color: #333333;">Hospital Naval de Recife - Junta Regular de Sa&uacute;de</strong><br />(81) 3036 - 9073 <span style="margin: 0px 8px;">/</span> <a href="mailto:hnre.jrs@marinha.mil.br" style="color: #050f41;
text-decoration: none;" rel="noopener nofollow noopener noreferrer nofollow noopener noreferrer nofollow noopener noreferrer" target="_blank">hnre.jrs@marinha.mil.br</a><br />📍 Avenida Cruz Cabug&aacute; 1200, Santo Amaro, Recife/PE</td>
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
    
    // Send Email
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
    
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: err.toString(),
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}