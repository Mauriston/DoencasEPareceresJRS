// Ficheiro: servidor/email/templateInaptosConcurso.ts
// Template do e-mail "{concurso} - Candidatos Inaptos" (JRS/HNRe → Divisão de Apoio aos Concursos da EAMPE).
// HTML puro, sem JavaScript (Zimbra): tabelas e estilos inline, fonte Carlito → Calibri → Arial.
// Placeholders (Mustache, preenchidos por servidor/email/inaptosConcurso.ts):
//   {{nome_concurso}}                       nome do concurso (texto e assunto)
//   {{#candidatos}}…{{/candidatos}}         cada item: {{matricula}} {{candidato}} {{data_is}} (dd/mm/aaaa) {{fundo}} (zebra)
//   {{#mostrar_signatario}}…{{/mostrar_signatario}} · {{signatario_nome}} {{signatario_posto}} {{signatario_cargo}}
//   {{presidente_nome}} {{presidente_posto}} (servidor/email/comum.ts)
//   {{banner_url}} · {{logo_rodape_url}}
export const TEMPLATE_INAPTOS_CONCURSO = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Candidatos Inaptos - JRS/HNRe</title>
</head>
<body style="margin:0;padding:0;background:#ffffff">
<center style="width:100%;table-layout:fixed">
<div style="max-width:960px;margin:0 auto">
<table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width:960px;margin:auto;background-color:#ffffff;font-family:'Carlito','Calibri',Arial,sans-serif;width:100%">
<tbody>
<tr><td style="padding:0;text-align:center;background-color:#050f41;width:100%"><img src="{{banner_url}}" width="960" style="width:100%;max-width:960px;height:auto;display:block;border:0" alt="Cabeçalho Hospital Naval de Recife - Junta Regular de Saúde"></td></tr>
<tr><td style="background-color:#ffffff;padding:40px 50px 10px;text-align:left;font-family:'Carlito','Calibri',Arial,sans-serif;font-size:16px;line-height:1.6;color:#333333;width:100%">

<p style="margin:0 0 20px 0;font-size:18px"><strong>&emsp;&emsp;&emsp;Prezados Militares da Divisão de Apoio aos Concursos da EAMPE,</strong></p>

<p style="margin:0 0 25px 0;text-align:justify;font-size:13pt">&emsp;&emsp;&emsp;Em atenção ao disposto no calendário de eventos do {{nome_concurso}} e visando dar celeridade em eventuais solicitações de recursos administrativos à JSD/COM3ºDN, INF que os candidatos abaixo relacionados foram considerados <span style="color:#993300"><strong>"INAPTOS PARA INGRESSO NO {{nome_concurso}}"</strong></span>:</p>

<table border="0" cellpadding="8" cellspacing="0" width="100%" style="width:100%;border:1px solid #dddddd;font-size:13px;line-height:1.4;border-collapse:collapse;margin:25px 0">
<thead>
<tr style="background-color:#050f41;color:#ffffff">
<th width="14%" align="center" style="border:1px solid #dddddd;font-weight:bold;padding:10px 5px;text-align:center;font-size:10pt">MATRÍCULA</th>
<th width="56%" align="center" style="border:1px solid #dddddd;font-weight:bold;padding:10px 8px;text-align:center;font-size:10pt">NOME</th>
<th width="16%" align="center" style="border:1px solid #dddddd;font-weight:bold;padding:10px 5px;text-align:center;font-size:10pt">DATA IS</th>
<th width="14%" align="center" style="border:1px solid #dddddd;font-weight:bold;padding:10px 5px;text-align:center;font-size:10pt">ANEXO T</th>
</tr>
</thead>
<tbody>
{{#candidatos}}
<tr style="background-color:{{fundo}}">
<td align="center" style="border:1px solid #dddddd;font-size:12pt;text-align:center;white-space:nowrap">{{matricula}}</td>
<td style="border:1px solid #dddddd;font-size:12pt">{{candidato}}</td>
<td align="center" style="border:1px solid #dddddd;font-size:10pt;text-align:center;white-space:nowrap">{{data_is}}</td>
<td align="center" style="border:1px solid #dddddd;font-size:12pt;text-align:center">Sim</td>
</tr>
{{/candidatos}}
</tbody>
</table>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:25px 0 30px 0">
<tbody><tr><td style="background-color:#fff2cc;border-left:4px solid #fab932;padding:20px;border-radius:4px;font-family:'Carlito','Calibri',Arial,sans-serif">
<p style="margin:0 0 10px 0;font-size:13pt;color:#050f41;font-weight:bold;text-transform:uppercase;letter-spacing:.5px">⚖️ SOBRE O CONHECIMENTO DE RECURSO</p>
<p style="margin:0;font-size:13pt;color:#333333;line-height:1.6;text-align:justify"><strong>TODOS os candidatos acima</strong> receberam as explicações da Inaptidão na IS diretamente de um dos Membros desta JRS, bem como <strong>tomaram ciência do direito de requerer recurso</strong> de 1ª instância junto à JSD/COM3ºDN e preencheram o Termo de Conhecimento de Recurso constante no Anexo <span style="text-decoration:underline">T</span> da DGPM-406 9ª REV MOD 3.</p>
</td></tr></tbody>
</table>

<p style="margin:25px 0 30px 0;font-size:13pt">&emsp;&emsp;&emsp;À disposição para quaisquer esclarecimentos adicionais.</p>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-top:1px solid #eeeeee">
<tbody><tr><td style="padding:20px 0 20px 0;font-family:'Carlito','Calibri',Arial,sans-serif;color:#333333">
<p style="font-size:15px;margin:0 0 15px 0;color:#333333">Respeitosamente / Atenciosamente,</p>
{{#mostrar_signatario}}
<p style="font-size:15px;margin:0 0 5px 0;color:#666666;font-style:italic">Por ordem de:</p>
<p style="font-size:18px;font-weight:bold;color:#050f41;margin:0 0 2px 0">{{signatario_nome}}</p>
<p style="font-size:14px;line-height:1.3;color:#666666;margin:0 0 25px 0"><strong>{{signatario_posto}}</strong><br>{{signatario_cargo}}</p>
{{/mostrar_signatario}}
<p style="font-size:18px;font-weight:bold;color:#050f41;margin:0 0 2px 0">{{presidente_nome}}</p>
<p style="font-size:14px;line-height:1.3;color:#666666;margin:0"><strong>{{presidente_posto}}</strong><br>Presidente</p>
</td></tr></tbody>
</table>

</td></tr>
<tr><td style="background-color:#ececec;padding:15px 20px;border-top:1px solid #eeeeee;width:100%">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%">
<tbody><tr>
<td width="48%" align="center" valign="middle" style="padding-right:15px"><img src="{{logo_rodape_url}}" width="300" style="width:300px;max-width:100%;height:auto;display:inline-block;border:0" alt="Logo Marinha do Brasil"></td>
<td width="1" style="border-left:1px solid #cccccc;font-size:1px;line-height:1px">&nbsp;</td>
<td width="51%" align="left" valign="middle" style="padding-left:20px;font-family:'Carlito','Calibri',Arial,sans-serif;font-size:14px;line-height:1.6;color:#555555">
<strong style="color:#333333">Hospital Naval de Recife - Junta Regular de Saúde</strong><br>
📞 (81) 3036 - 9073 <span style="margin:0 8px">/</span> 📧 <a href="mailto:hnre.jrs@marinha.mil.br" style="color:#050f41;text-decoration:none">hnre.jrs@marinha.mil.br</a><br>
📍 Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE
</td>
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
