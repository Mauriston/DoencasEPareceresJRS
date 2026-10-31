/**
 * GeminiService.gs
 */

function chamarGemini(url, requisicao) {
  var esperas = [2000, 4000];
  for (var tentativa = 0; ; tentativa++) {
    var resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(requisicao),
      muteHttpExceptions: true
    });
    var codigo = resp.getResponseCode();
    if ((codigo === 429 || codigo === 500 || codigo === 503) && tentativa < esperas.length) {
      Utilities.sleep(esperas[tentativa]);
      continue;
    }
    var json;
    try { json = JSON.parse(resp.getContentText()); } catch (e) { throw new Error('Resposta inválida da API Gemini (HTTP ' + codigo + ').'); }
    if (codigo === 429) throw new Error('Limite de uso da IA (Gemini) atingido. Tente novamente em alguns minutos.');
    if (codigo === 500 || codigo === 503) throw new Error('A IA (Gemini) está indisponível no momento. Tente novamente em alguns minutos.');
    if (json.error) throw new Error('Erro na API Gemini: ' + json.error.message);
    return json;
  }
}

var PROMPT_EXAMES_CANDIDATO = [
  'Você transcreve, na íntegra, os exames de um candidato de concurso da Marinha do Brasil a partir de um PDF (em geral escaneado), para a Inspeção de Saúde da Junta Regular de Saúde.',
  'Responda estritamente em JSON válido, com exatamente estas chaves de primeiro nível: "paciente", "exames" e "observacoes".',
  '',
  'REGRAS GERAIS',
  '- Transcreva TODOS os laudos do documento: um objeto do array "exames" por exame ou por grupo de exames (ver AGRUPAMENTO).',
  '- Despreze textos fúteis de cabeçalho e de rodapé: numeração de páginas ("Página 1 de 4"), endereço, telefone, e-mail, site e redes sociais da clínica ou do laboratório, código de barras, protocolo de conferência na internet, avisos do tipo "laudo sem valor sem assinatura" e afins.',
  '- NÃO transcreva a Folha de Anamnese Dirigida (Anexo W / DS-8), em geral a primeira página.',
  '- Transcreva em texto puro: sem markdown, sem negrito, sem tabelas e sem numerar as listas do laudo. Preserve as quebras de linha e as linhas em branco do original.',
  '- Não invente dados: use string vazia (ou lista vazia) quando a informação não estiver no documento.',
  '',
  'CAMPOS DE CADA EXAME',
  '- "categoria": exatamente uma destas: "hemograma", "eas", "bioquimica", "betaHcg", "vdrl", "antiHiv", "imagem", "colpocitologia", "ecg", "toxicologico", "outro".',
  '- "nome": título do bloco em MAIÚSCULAS e sem acentos (ex.: "HEMOGRAMA COMPLETO", "EAS", "BIOQUIMICA", "BETA-HCG", "VDRL", "ANTI-HIV 1+2 (QUIMIOLUMINESCENCIA)", "RADIOGRAFIA DE TORAX", "USG DE MAMAS", "USG TRANSVAGINAL", "COLPOCITOLOGIA ONCOTICA", "ELETROCARDIOGRAMA", "EXAME TOXICOLOGICO").',
  '- "paciente": nome do paciente como consta naquele laudo.',
  '- "emissor": nome do profissional que assina o laudo, com o título (Dr., Dra., Biomed., Farm. etc.).',
  '- "conselho": conselho de classe e número (ex.: "CRM-PE 20674", "CRBio-5 012345", "CRF-PE 7890"); acrescente o RQE quando houver.',
  '- "data": data do laudo em DD/MM/AAAA.',
  '- "itens": lista de { "nome": "...", "valor": "..." } — só para "hemograma", "eas" e "bioquimica"; nos demais, lista vazia.',
  '- "resultado": resultado curto — só para "betaHcg", "vdrl" e "antiHiv" (ex.: "Nao reagente", "Negativo", "Inferior a 1,20 mUI/mL"); nos demais, string vazia.',
  '- "texto": o laudo na íntegra — para "imagem", "colpocitologia", "ecg", "toxicologico" e "outro"; nos exames de valores, string vazia.',
  '',
  'VALORES (hemograma, EAS e bioquímica)',
  '- Cada analito é um item separado, com APENAS o valor, SEM unidade de medida e sem o valor de referência.',
  '- Plaquetas em milhares (209, nunca 209.000).',
  '- Hemograma: hemácias, hemoglobina, hematócrito, VCM, HCM, CHCM, RDW, leucócitos, basófilos, eosinófilos, mielócitos, metamielócitos, bastões, segmentados, linfócitos, monócitos e plaquetas. Mielócitos, metamielócitos e bastões que não constem do laudo entram com valor "0".',
  '- EAS (urina): densidade, pH, proteínas, glicose, corpos cetônicos, hemoglobina, nitrito, urobilinogênio, bilirrubinas, leucócitos, hemácias, células epiteliais, cilindros, cristais, muco e flora bacteriana.',
  '- Bioquímica: glicemia de jejum, ureia, creatinina, colesterol total e frações (HDL, LDL, VLDL), triglicerídeos, TGO e TGP.',
  '',
  'AGRUPAMENTO',
  '- Hemograma, EAS e bioquímica formam UM ÚNICO objeto cada, com todos os seus analitos em "itens".',
  '- Se o mesmo analito aparecer em laudos de datas diferentes, use o valor MAIS RECENTE; e use "emissor", "conselho" e "data" do laudo mais recente do grupo.',
  '- Beta-HCG, VDRL e anti-HIV são objetos próprios, um para cada, com o "resultado". No anti-HIV, informe o método no "nome".',
  '- Exames de imagem (radiografia de tórax, USG de mamas, USG transvaginal ou pélvica), colpocitologia oncótica, eletrocardiograma e exame toxicológico: um objeto por exame, com o laudo em "texto".',
  '- Exame toxicológico: inclua no "texto" o número do laudo, o material, o comprimento da amostra, a janela de detecção, o método, a data da coleta e o resultado por classe de substância.',
  '- Qualquer exame fora dessa relação entra com categoria "outro" e o laudo integral em "texto".',
  '',
  'OUTRAS CHAVES',
  '- "paciente": objeto { "nome": "NOME COMPLETO EM MAIÚSCULAS", "dataNascimento": "DD/MM/AAAA", "cpf": "", "identidade": "" } com o nome e a data de nascimento do candidato. Minimização de dados: deixe "cpf" e "identidade" SEMPRE vazios, mesmo que constem no documento.',
  '- "observacoes": lista de avisos curtos para conferência humana — valores fora da referência do laboratório, carimbo ou registro pouco legível (diga a leitura feita), páginas faltando, divergência de nome ou de data de nascimento entre os laudos. Lista vazia se não houver.',
].join('\n');

function extrairExamesComGemini(pdfBase64, mimeType) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada nas propriedades do projeto Apps Script.');

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODELO_GEMINI + ':generateContent?key=' + apiKey;
  var requisicao = {
    contents: [{
      parts: [
        { text: PROMPT_EXAMES_CANDIDATO },
        { inline_data: { mime_type: mimeType || 'application/pdf', data: pdfBase64 } }
      ]
    }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 65536 }
  };
  var json;
  try {
    json = chamarGemini(url, requisicao);
  } catch (erroFetch) {
    if (/Timeout|tempo/i.test(erroFetch.message)) {
      throw new Error('A leitura dos exames não terminou em tempo (' + erroFetch.message + '). Divida os exames em dois PDFs e envie um por vez.');
    }
    throw erroFetch;
  }

  var candidato = json.candidates && json.candidates[0];
  if (candidato && candidato.finishReason === 'MAX_TOKENS') {
    throw new Error('A transcrição ficou longa demais e foi cortada. Envie os exames em dois PDFs menores.');
  }
  try {
    return JSON.parse(candidato.content.parts[0].text);
  } catch (e) {
    throw new Error('O Gemini não conseguiu estruturar os exames. Confira se o PDF está legível.');
  }
}
