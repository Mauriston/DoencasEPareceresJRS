/**
 * PericiaMenorController.gs
 */

function extrairDadosAtestado(payload) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Aviso: GEMINI_API_KEY não configurada nas propriedades do Google Apps Script.");

  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
  
  const requestBody = {
    "contents": [{
      "parts": [
        {
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

  const jsonResponse = chamarGemini(url, requestBody);

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
