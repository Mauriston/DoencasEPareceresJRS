// Ficheiro: servidor/email/templateAgendamentoBeneficios.ts
// E-mail "AGENDAMENTO DE INSPEÇÃO DE SAÚDE" do grupo **Benefícios** (documentos das Doenças Previstas em Lei,
// Anexo V da DGPM-406). Template enviado pelo Presidente da JRS (Zimbra), limpo e em HTML puro, sem JavaScript.
// Placeholders (servidor/email/agendamentoIS.ts): {{inspecionado}} {{finalidade_is}} {{data}} {{hora}}
// {{banner_url}} {{logo_rodape_url}} e a assinatura dinâmica ({{#mostrar_signatario}}…, servidor/email/comum.ts).
export const TEMPLATE_AGENDAMENTO_BENEFICIOS = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agendamento de Inspeção de Saúde - JRS/HNRe</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Carlito','Calibri',Arial,sans-serif">
<center style="width:100%;table-layout:fixed">
<div style="max-width:960px;margin:0 auto">
<table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width:960px;margin:auto;background-color:#ffffff;font-family:'Carlito','Calibri',Arial,sans-serif;width:100%">
<tbody>
<tr><td style="padding:0;text-align:center;background-color:#050f41;width:100%"><img src="{{banner_url}}" width="960" style="width:100%;max-width:960px;height:auto;display:block;border:0" alt="Cabeçalho Hospital Naval de Recife - Junta Regular de Saúde"></td></tr>
<tr><td style="background-color:#ffffff;padding:40px 50px 30px;text-align:left;font-family:'Carlito','Calibri',Arial,sans-serif;font-size:16px;line-height:1.6;color:#333333;width:100%">

<p style="margin:0 0 20px;font-size:21px"><strong>Prezado(a) Senhor(a),</strong></p>

<div style="background-color:#f4f6f9;border-left:4px solid #050f41;padding:20px;margin-bottom:30px;border-radius:4px">
<p style="margin:0 0 10px;font-size:18px;color:#050f41;font-weight:bold;text-transform:uppercase">📅 Confirmação de Agendamento de Inspeção de Saúde</p>
<ul>
<li style="font-size:21px;color:#333333;line-height:1.5">Inspecionado: Sr(a). <span style="color:#050f41;font-weight:bold">{{inspecionado}}</span></li>
<li style="font-size:21px;color:#050f41;line-height:1.5">Finalidade IS: <span style="font-weight:bold">{{finalidade_is}}</span></li>
<li style="font-size:21px;color:#333333;line-height:1.5">Data: <span style="background-color:#fff6bd;padding:2px 5px;font-weight:bold">{{data}}</span></li>
<li style="font-size:21px;color:#333333;line-height:1.5">Hora: <strong style="background-color:#ffff99">{{hora}}</strong></li>
</ul>
</div>

<h3 style="color:#050f41;font-size:18px;margin:30px 0 15px;border-bottom:2px solid #050f41;padding-bottom:5px;text-transform:uppercase">1. Orientações Gerais sobre a Documentação</h3>
<p style="margin:0 0 15px;font-size:17px">Para a realização da Inspeção de Saúde (IS), os periciados deverão apresentar obrigatoriamente no dia agendado:</p>
<ul style="margin:0 0 20px;padding-left:20px;line-height:1.6;font-size:17px">
<li style="margin-bottom:10px;text-align:justify"><strong>Laudo ou Relatório Médico atualizado:</strong> deve conter explicitamente a data, nome completo do profissional, número do CRM, carimbo perfeitamente legível, assinatura e o código CID correspondente com a respectiva data do diagnóstico, além dos exames complementares realizados de acordo com a doença.</li>
<li style="margin-bottom:10px;text-align:justify"><strong>Formatos aceitos:</strong>
<ul style="margin:0 0 20px;padding-left:20px;line-height:1.6">
<li style="margin-bottom:10px;text-align:justify"><strong>DIGITAIS (Preferenciais)</strong>: Laudos/relatórios médicos digitais com assinatura eletrônica ou digital certificada;</li>
<li style="margin-bottom:10px;text-align:justify"><strong>MANUSCRITOS</strong>: Laudos/relatórios médicos manuscritos são aceitos, porém a grafia do médico emitente deve ser clara e legível de modo a permitir a compreensão das informações.</li>
</ul>
</li>
</ul>

<p style="margin:20px 0 15px;color:#d9381e;font-weight:bold;font-size:17px">⚠️ ATENÇÃO AO ENCERRAMENTO DA IS POR INSUFICIÊNCIA DOCUMENTAL:</p>
<p style="margin:0 0 25px;background-color:#fff5f5;border:1px solid #f8d7da;padding:15px;color:#333333;border-radius:4px;text-align:justify;font-size:17px">A apresentação completa e adequada dos documentos solicitados é essencial para a correta avaliação pericial. <strong>A não apresentação ou a entrega incompleta dos documentos poderá comprometer a realização da perícia ou ensejar a conclusão imediata da inspeção por INSUFICIÊNCIA DOCUMENTAL.</strong><br><br>Neste cenário, quando estiver de posse da documentação médica necessária, o Inspecionado ou seu representante legal deverá reiniciar a solicitação da Inspeção de Saúde para Benefício junto à OM responsável (CPPE, CPPB, CPAL, SVPM, CPesFN...).</p>

<h3 style="color:#050f41;font-size:18px;margin:35px 0 15px;border-bottom:2px solid #050f41;padding-bottom:5px;text-transform:uppercase">2. Documentos Médicos Específicos por Doença (Previstas em Lei)</h3>
<p style="margin:0 0 15px;font-size:15px;color:#555555">Lista de documentos médicos mínimos exigidos prevista no <strong><a href="https://assets.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/doencas_graves_0.pdf" target="_blank" style="color:#050f41">Anexo V</a></strong> da DGPM-406 9ª Rev MOD 3</p>
<table border="0" cellpadding="12" cellspacing="0" width="100%" style="width:100%;border:1px solid #dddddd;font-size:14px;line-height:1.5;border-collapse:collapse;margin-bottom:35px">
<thead>
<tr style="background-color:#050f41;color:#ffffff">
<th width="30%" align="left" style="border:1px solid #dddddd;font-weight:bold">Doença Prevista em Lei</th>
<th width="70%" align="left" style="border:1px solid #dddddd;font-weight:bold">Documentação médica e Exames Complementares Obrigatórios</th>
</tr>
</thead>
<tbody>
<tr style="background-color:#ffffff"><td valign="top" style="border:1px solid #dddddd"><strong>Alienação Mental</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Relatório médico detalhado <strong>(Psiquiatra, Neurologista ou Geriatra)</strong> constando diagnóstico, data do diagnóstico, CID X e data do início do acompanhamento;</li>
<li style="margin-bottom:4px">Exame clínico (mental) do início do acompanhamento e sua respectiva evolução;</li>
<li style="margin-bottom:4px">Tratamento realizado e respostas terapêuticas obtidas;</li>
<li style="margin-bottom:4px"><strong>Nos casos de Demência:</strong> inclusão da Classificação pela Escala de Avaliação Clínica de Demência (CDR) inicial e evolutiva; e</li>
<li style="margin-bottom:0">Apresentação obrigatória de laudos de exame de imagem do Sistema Nervoso Central (Tomografia Computadorizada ou Ressonância Magnética).</li>
</ul></td></tr>
<tr style="background-color:#f9f9f9"><td valign="top" style="border:1px solid #dddddd"><strong>Cardiopatia Grave</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Ecocardiograma, cintilografia e teste ergométrico (todos os exames realizados há menos de 6 meses);</li>
<li style="margin-bottom:0">Relatório médico detalhado com diagnóstico, CID X, data em que foi estabelecido formalmente o diagnóstico e tratamentos realizados.</li>
</ul></td></tr>
<tr style="background-color:#ffffff"><td valign="top" style="border:1px solid #dddddd"><strong>Cegueira</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Exame completo de acuidade visual com e sem correção em ambos os olhos;</li>
<li style="margin-bottom:0">Relatório médico descritivo com indicação do CID X e data do diagnóstico de cegueira ou de visão monocular.</li>
</ul></td></tr>
<tr style="background-color:#f9f9f9"><td valign="top" style="border:1px solid #dddddd"><strong>Espondilite Anquilosante</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Relatório médico detalhado com indicação do CID X e data precisa do diagnóstico;</li>
<li style="margin-bottom:4px">Exames de suporte complementares realizados acompanhados dos laudos de imagem;</li>
<li style="margin-bottom:0">Resultado laboratorial do marcador genético HLA-B27.</li>
</ul></td></tr>
<tr style="background-color:#ffffff"><td valign="top" style="border:1px solid #dddddd"><strong>Mal de Paget<br><span style="font-size:12px;color:#666666;font-weight:normal">(Estados Avançados)</span></strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Exames complementares de Radiografia, dosagem de fosfatase alcalina, hidroxiprolina urinária e tomografia;</li>
<li style="margin-bottom:4px">Exame de Ressonância magnética (caso haja indicação clínica específica);</li>
<li style="margin-bottom:4px">Realização de biópsia óssea (para casos suspeitos) e cintilografia óssea;</li>
<li style="margin-bottom:0">Relatório médico assistente constando o código CID e a data definitiva do diagnóstico.</li>
</ul></td></tr>
<tr style="background-color:#f9f9f9"><td valign="top" style="border:1px solid #dddddd"><strong>Hanseníase</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Relatório médico descritivo contendo o diagnóstico, código CID X e data do diagnóstico;</li>
<li style="margin-bottom:4px">Detalhamento sobre a persistência de sinais de atividade mesmo após o término do tratamento;</li>
<li style="margin-bottom:4px">Histórico ou evidência de episódios de recidiva da doença;</li>
<li style="margin-bottom:4px">Ocorrência de surtos reacionais frequentes;</li>
<li style="margin-bottom:0">Existência de sequelas crônicas com expressiva e comprovada repercussão funcional.</li>
</ul></td></tr>
<tr style="background-color:#ffffff"><td valign="top" style="border:1px solid #dddddd"><strong>Doença de Parkinson</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Relatório médico estruturado contendo o código CID X e a respectiva data do diagnóstico;</li>
<li style="margin-bottom:4px">Exame clínico neurológico detalhado realizado recentemente;</li>
<li style="margin-bottom:0">Especificação completa e atualizada do esquema de tratamento em curso.</li>
</ul></td></tr>
<tr style="background-color:#f9f9f9"><td valign="top" style="border:1px solid #dddddd"><strong>Nefropatia Grave</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Relatório médico clínico com diagnóstico e indicação expressa do código CID X;</li>
<li style="margin-bottom:4px">Data precisa do início do tratamento dialítico (se aplicável);</li>
<li style="margin-bottom:4px">Medida laboratorial recente da filtração glomerular e níveis séricos de creatinina;</li>
<li style="margin-bottom:0">Informação documental comprovando a data em que a filtração decresceu para valores abaixo de 30 ml/min e a creatinina superou 6,1 mg/dL.</li>
</ul></td></tr>
<tr style="background-color:#ffffff"><td valign="top" style="border:1px solid #dddddd"><strong>Neoplasia Maligna<br><span style="font-size:12px;color:#666666;font-weight:normal">(Câncer)</span></strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px"><strong>Laudo Histopatológico/Anatomopatológico oficial (biópsia) ou estudo Imunohistoquímico indispensável;</strong></li>
<li style="margin-bottom:0">Relatório do médico assistente com CID X detalhando o estadiamento clínico (TNM), localização tumoral primária, tratamentos realizados e a resposta clínica obtida.</li>
</ul></td></tr>
<tr style="background-color:#f9f9f9"><td valign="top" style="border:1px solid #dddddd"><strong>Paralisia Irreversível e Incapacitante</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Relatório médico especializado <strong>(Neurologista, Neurocirurgião ou Geriatra)</strong> com diagnóstico e CID X;</li>
<li style="margin-bottom:4px">Descrição detalhada das lesões motoras identificadas e data de estabelecimento do diagnóstico;</li>
<li style="margin-bottom:4px">Descrição detalhada de atos cirúrgicos prévios (se aplicável ao caso);</li>
<li style="margin-bottom:0">Laudos de exames complementares de imagem ou funcionais realizados (eletroneuromiografia e ressonância magnética).</li>
</ul></td></tr>
<tr style="background-color:#ffffff"><td valign="top" style="border:1px solid #dddddd"><strong>Pênfigo</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Exame histológico de suporte (Citodiagnóstico de Tzanck) e exame de imunofluorescência direta;</li>
<li style="margin-bottom:4px">Relatório médico clínico com diagnóstico assertivo e código CID X;</li>
<li style="margin-bottom:4px">Data precisa de início do diagnóstico;</li>
<li style="margin-bottom:0">Descrição exaustiva dos tratamentos ministrados e do quadro clínico dermatológico apresentado atualmente.</li>
</ul></td></tr>
<tr style="background-color:#f9f9f9"><td valign="top" style="border:1px solid #dddddd"><strong>SIDA / AIDS</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Apresentação obrigatória de exame laboratorial de contagem com resultado de CD4 &lt; 200 células/mm³;</li>
<li style="margin-bottom:0">Relatório assinado pelo médico infectologista contendo o diagnóstico, CID X e descrição minuciosa do exame clínico atual.</li>
</ul></td></tr>
<tr style="background-color:#ffffff"><td valign="top" style="border:1px solid #dddddd"><strong>Tuberculose Ativa</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Relatório médico detalhado contendo o diagnóstico e o respectivo código CID X;</li>
<li style="margin-bottom:4px">Data inicial identificada do diagnóstico;</li>
<li style="margin-bottom:0">Detalhes do esquema terapêutico realizado, indicação da data de término (programada ou já efetivada) e descrição clínica atualizada.</li>
</ul></td></tr>
<tr style="background-color:#f9f9f9"><td valign="top" style="border:1px solid #dddddd"><strong>Hepatopatia Grave</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Relatório emitido por médico gastroenterologista ou hepatologista com diagnóstico e CID X;</li>
<li style="margin-bottom:4px">Data do diagnóstico e a terapêutica medicamentosa em execução;</li>
<li style="margin-bottom:4px">Classificação do escore de gravidade prognóstica de Child-Turcotte-Pugh;</li>
<li style="margin-bottom:0">Informação clara e expressa sobre a presença ativa de quadros de ascite ou de encefalopatia hepática recorrente.</li>
</ul></td></tr>
<tr style="background-color:#ffffff"><td valign="top" style="border:1px solid #dddddd"><strong>Esclerose Múltipla</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Relatório médico de especialidade neurológica com diagnóstico fechado e CID X;</li>
<li style="margin-bottom:4px">Data inicial do diagnóstico acompanhada de descrição clínica do padrão de surtos;</li>
<li style="margin-bottom:0">Apresentação dos laudos e imagens de exames de Ressonância Magnética (cerebral e/ou medular).</li>
</ul></td></tr>
<tr style="background-color:#f9f9f9"><td valign="top" style="border:1px solid #dddddd"><strong>Fibrose Cística</strong></td><td style="border:1px solid #dddddd;text-align:justify"><ul style="margin:0;padding-left:18px;line-height:1.4">
<li style="margin-bottom:4px">Relatório médico de suporte associado a dois testes do suor com resultados positivos (&gt;60 mEq/l) obtidos em momentos cronológicos distintos;</li>
<li style="margin-bottom:0">Se estiverem disponíveis na rotina: radiografia de campos pleuropulmonares, cultura de escarro (evidenciando <i>Pseudomonas aeruginosa</i>), ultrassonografia do abdome total, dosagens de enzimas hepáticas e pancreáticas.</li>
</ul></td></tr>
</tbody>
</table>

<h3 style="color:#050f41;font-size:18px;margin:35px 0 15px;border-bottom:2px solid #050f41;padding-bottom:5px;text-transform:uppercase">3. Orientações para o Dia da Inspeção de Saúde</h3>
<p style="margin:0 0 15px;color:#2e7d32;font-weight:bold">💡 Recomendamos ler atentamente todas as orientações para otimizar o trâmite pericial:</p>
<ul style="margin:0 0 30px;padding-left:20px;line-height:1.7;color:#333333">
<li style="margin-bottom:8px"><span style="color:#2e7d32;font-weight:bold">Comparecer com 30 minutos de antecedência;</span></li>
<li style="margin-bottom:8px">Trazer documento de identidade original, além de todos os laudos/relatórios/exames descritos na seção anterior;</li>
<li style="margin-bottom:8px">Não é necessário autenticar as cópias dos laudos dos exames em cartório;</li>
<li style="margin-bottom:8px">Todos os documentos originais apresentados para conferência serão integralmente devolvidos ao fim da inspeção;</li>
<li style="margin-bottom:8px">Caso o periciado seja curatelado, é obrigatório trazer também o termo ou documento de curatela;</li>
<li style="margin-bottom:8px"><strong>Impossibilidade de presença:</strong> informar formalmente à secretaria com uma antecedência mínima de cinco dias úteis para o devido reagendamento;</li>
<li style="margin-bottom:8px"><strong>Localização:</strong> A Inspeção de Saúde ocorrerá na <strong>Junta Regular de Saúde do Hospital Naval de Recife</strong> (JRS/HNRe);</li>
<li style="margin-bottom:8px"><strong>Endereço:</strong> Avenida Cruz Cabugá 1200, Santo Amaro, Recife-PE. CEP: 50040-000; <strong><a href="https://maps.app.goo.gl/PL26ws4934FDGdUz6" target="_blank" style="color:#050f41">Como chegar?</a></strong></li>
<li style="margin-bottom:8px"><strong>Estacionamento:</strong> Há estacionamento disponível para os Inspecionados e acompanhantes com acesso direto à Junta Regular (Estacionamento do Ambulatório).</li>
</ul>

<div style="height:25px;line-height:25px;font-size:1px">&nbsp;</div>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-top:1px solid #eeeeee">
<tbody><tr><td style="padding-top:20px;font-family:'Carlito','Calibri',Arial,sans-serif;color:#333333">
<p style="font-size:15px;margin:0 0 15px;color:#333333">Respeitosamente / Atenciosamente,</p>
{{#mostrar_signatario}}
<p style="font-size:15px;margin:0 0 5px;color:#666666;font-style:italic">Por ordem de:</p>
<div style="font-size:18px;font-weight:bold;color:#050f41;margin:0 0 2px">{{signatario_nome}}</div>
<div style="font-size:14px;line-height:1.3;color:#666666;margin-bottom:25px"><strong>{{signatario_posto}}</strong><br>{{signatario_cargo}}</div>
{{/mostrar_signatario}}
<div style="font-size:18px;font-weight:bold;color:#050f41;margin:0 0 2px">{{presidente_nome}}</div>
<div style="font-size:14px;line-height:1.3;color:#666666"><strong>{{presidente_posto}}</strong><br>Presidente</div>
<div style="height:35px;line-height:35px;font-size:1px">&nbsp;</div>
</td></tr></tbody>
</table>

</td></tr>
<tr><td style="background-color:#ececec;padding:15px 20px;border-top:1px solid #eeeeee;width:100%">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%">
<tbody><tr>
<td width="50%" align="center" valign="middle" style="padding-right:15px"><img src="{{logo_rodape_url}}" width="260" style="width:260px;max-width:100%;height:auto;display:inline-block;border:0" alt="Logo Marinha do Brasil"></td>
<td width="1" style="border-left:1px solid #cccccc;font-size:1px;line-height:1px">&nbsp;</td>
<td width="49%" align="left" valign="middle" style="padding-left:20px;font-family:'Carlito','Calibri',Arial,sans-serif;font-size:14px;line-height:1.6;color:#555555"><strong style="color:#333333">Hospital Naval de Recife - Junta Regular de Saúde</strong><br>📞 (81) 3036 - 9073 <span style="margin:0 8px">/</span> 📧 <a href="mailto:hnre.jrs@marinha.mil.br" style="color:#050f41;text-decoration:none">hnre.jrs@marinha.mil.br</a><br>📍 Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE</td>
</tr></tbody>
</table>
</td></tr>
</tbody>
</table>
<table border="0" cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td height="30">&nbsp;</td></tr></tbody></table>
</div>
</center>
</body>
</html>`;
