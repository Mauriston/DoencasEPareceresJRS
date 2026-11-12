// Ficheiro: servidor/email/templateFaltasHNRe.ts
// Template do e-mail "COMUNICAÇÃO DE FALTAS A INSPEÇÕES DE SAÚDE" (JRS/HNRe → Divisão de Pessoal do HNRe), a partir
// do modelo da JRS no Zimbra. HTML puro, sem JavaScript: tabelas e estilos inline, fonte Carlito → Calibri → Arial.
// Placeholders no estilo Mustache, preenchidos por servidor/email/faltasHNRe.ts:
//
//   {{#faltas}}…{{/faltas}}   uma linha por IS (zebra em {{fundo}}): {{numero_is}} {{data}} (naval, ex.: 20MAI2026)
//                              {{militar_antes}}<b>{{militar_guerra}}</b>{{militar_depois}} (nome de guerra em negrito) {{finalidade}}
//   {{#mostrar_signatario}}…{{/mostrar_signatario}}   1ª assinatura = quem enviou ("Por ordem de:"); some para o Admin
//   {{signatario_nome}} · {{signatario_posto}} · {{signatario_cargo}} · {{presidente_nome}} · {{presidente_posto}} (servidor/email/comum.ts)
//   {{banner_url}} · {{logo_rodape_url}}
//
// O vocativo (Encarregada da Divisão de Pessoal), o texto, o quadro da alínea e do item 2.3.3 e o rodapé são fixos.
export const TEMPLATE_FALTAS_HNRE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Comunicação de faltas a Inspeções de Saúde - JRS/HNRe</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Carlito','Calibri',Arial,sans-serif">
<center style="width:100%;table-layout:fixed">
<div style="max-width:960px;margin:0 auto">
<table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width:960px;margin:auto;background-color:#ffffff;font-family:'Carlito','Calibri',Arial,sans-serif;width:100%">
<tbody>
<tr><td style="padding:0;text-align:center;background-color:#050f41;width:100%"><img src="{{banner_url}}" width="960" style="width:100%;max-width:960px;height:auto;display:block;border:0" alt="Cabeçalho Hospital Naval de Recife - Junta Regular de Saúde"></td></tr>
<tr>
<td style="background-color:#ffffff;padding:40px 50px 10px;text-align:left;font-family:'Carlito','Calibri',Arial,sans-serif;font-size:16px;line-height:1.6;color:#333333;width:100%">
<p style="margin:0 0 20px;font-size:18px"><strong>&emsp;&emsp;Prezada CT (S) Luciana Madruga e demais Militares da Divisão de Pessoal,</strong></p>
<p style="margin:0 0 25px;text-align:justify">&emsp;&emsp;<span style="font-size:13pt">Em atenção à alínea <span style="text-decoration:underline">a</span> do item 2.3.3 da DGPM-406 9ª REV MOD 3 e no intuito de contribuir na faina dessa Divisão de Pessoal sobre controle dos prazos periciais e de certificação do efetivo comparecimento da Tripulação às IS formalmente agendadas, <strong>PTC lista de Militares que faltaram às IS agendadas para as medidas administrativas no que couber:</strong></span></p>
<table border="0" cellpadding="8" cellspacing="0" width="100%" style="width:100%;border:1px solid #dddddd;font-size:13px;line-height:1.4;border-collapse:collapse;margin:25px 0">
<thead>
<tr style="background-color:#050f41;color:#ffffff">
<th width="10%" align="center" style="border:1px solid #dddddd;font-weight:bold;padding:10px 5px;text-align:center;font-size:10pt">IS</th>
<th width="15%" align="center" style="border:1px solid #dddddd;font-weight:bold;padding:10px 8px;text-align:center;font-size:10pt">DATA</th>
<th width="58%" align="left" style="border:1px solid #dddddd;font-weight:bold;padding:10px 8px;font-size:10pt">MILITAR</th>
<th width="17%" align="center" style="border:1px solid #dddddd;font-weight:bold;padding:10px 5px;text-align:center;font-size:10pt">FINALIDADE</th>
</tr>
</thead>
<tbody>
{{#faltas}}
<tr style="background-color:{{fundo}}">
<td align="center" style="border:1px solid #dddddd;text-align:center;font-size:11pt">{{numero_is}}</td>
<td align="center" style="border:1px solid #dddddd;text-align:center;font-size:11pt">{{data}}</td>
<td style="border:1px solid #dddddd;font-size:11pt">{{militar_antes}}<b>{{militar_guerra}}</b>{{militar_depois}}</td>
<td align="center" style="border:1px solid #dddddd;text-align:center;font-size:10pt">{{finalidade}}</td>
</tr>
{{/faltas}}
</tbody>
</table>
<div style="background-color:#fff5f5;border-left:4px solid #c62828;padding:20px;margin:25px 0 30px;border-radius:4px;font-family:'Carlito','Calibri',Arial,sans-serif">
<p style="margin:0 0 10px;font-size:14pt;color:#c62828;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px">⚠️ NÃO COMPARECIMENTO ÀS IS AGENDADAS x RDM</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.5;text-align:right;color:#808080">(Alínea <span style="text-decoration:underline">e</span> do item 2.3.3. da DGPM-406 9ª REV MOD 3):</p>
<div style="border-left:3px solid #ef9a9a;padding-left:15px;margin:12px 0 0;font-style:italic;color:#444444;text-align:justify;line-height:1.6;font-size:14pt"><strong>"os inspecionados são responsáveis ainda pelo agendamento e comparecimento às JS na data marcada para realização de sua IS, podendo a inobservância de tal orientação ser caracterizada como <span style="color:#ff0000">contravenção disciplinar</span>"</strong></div>
</div>
<p style="margin:25px 0 30px;text-align:justify;font-size:13pt">&emsp;&emsp;&emsp;À disposição para quaisquer esclarecimentos adicionais.</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #eeeeee">
<tbody>
<tr>
<td style="padding-top:20px;font-family:'Carlito','Calibri',Arial,sans-serif;color:#333333">
<p style="font-size:15px;margin:0 0 15px;color:#333333">Respeitosamente / Atenciosamente,</p>
{{#mostrar_signatario}}
<p style="font-size:15px;margin:0 0 5px;color:#666666;font-style:italic">Por ordem de:</p>
<div style="font-size:18px;font-weight:bold;color:#050f41;margin:0 0 2px">{{signatario_nome}}</div>
<div style="font-size:14px;line-height:1.3;color:#666666;font-weight:normal;margin-bottom:25px"><strong>{{signatario_posto}}</strong><br>{{signatario_cargo}}</div>
{{/mostrar_signatario}}
<div style="font-size:18px;font-weight:bold;color:#050f41;margin:0 0 2px">{{presidente_nome}}</div>
<div style="font-size:14px;line-height:1.3;color:#666666;font-weight:normal"><strong>{{presidente_posto}}</strong><br>Presidente</div>
<div style="height:35px;line-height:35px;font-size:1px">&nbsp;</div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td style="background-color:#ececec;padding:15px 20px;border-top:1px solid #eeeeee;width:100%">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%">
<tbody>
<tr>
<td width="50%" align="center" valign="middle" style="padding-right:15px"><img src="{{logo_rodape_url}}" width="300" style="width:300px;max-width:100%;height:auto;display:inline-block;border:0" alt="Logo Marinha do Brasil"></td>
<td width="1" style="border-left:1px solid #cccccc;font-size:1px;line-height:1px">&nbsp;</td>
<td width="49%" align="left" valign="middle" style="padding-left:20px;font-family:'Carlito','Calibri',Arial,sans-serif;font-size:14px;line-height:1.6;color:#555555"><strong style="color:#333333">Hospital Naval de Recife - Junta Regular de Saúde</strong><br>📞 (81) 3036 - 9073 <span style="margin:0 8px">/</span> 📧 <a href="mailto:hnre.jrs@marinha.mil.br" style="color:#050f41;text-decoration:none">hnre.jrs@marinha.mil.br</a><br>📍 Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<table border="0" cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td height="30">&nbsp;</td></tr></tbody></table>
</div>
</center>
</body>
</html>`;
