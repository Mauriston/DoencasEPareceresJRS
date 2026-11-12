// Ficheiro: servidor/email/templateAnexoAgendaIS.ts
// Anexo em PDF do e-mail "IS agendadas" (A4 paisagem), criado no Claude Design ("Anexo Agenda IS - JRS").
// Gerado no servidor pelo Chromium (servidor/documentos/gerarPdf.ts, sem rede): a fonte Montserrat e a logo
// do rodapé entram como data: URI ({{fonte_montserrat}}, {{logo_rodape}}). Mesmos placeholders do e-mail
// ({{data_titulo}}, {{#agendamentos}}…, {{#tem_concursos}}…, {{#concursos}}…); a página dos concursos só
// existe quando há candidatos no dia.
export const TEMPLATE_ANEXO_AGENDA_IS = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>IS agendadas em {{data_extenso}} - JRS/HNRe</title>
<style>
@font-face{font-family:'Montserrat';font-weight:100 900;src:url({{fonte_montserrat}}) format('woff2')}
@page{size:A4 landscape;margin:0}
html,body{margin:0;padding:0}
body{font-family:'Carlito','Calibri',Arial,sans-serif;color:#050F41;-webkit-print-color-adjust:exact;print-color-adjust:exact}
section.page{width:297mm;break-after:page}
section.page:last-of-type{break-after:auto}
tr{break-inside:avoid}
</style>
</head>
<body><section class="page" style="min-height:210mm;display:flex;flex-direction:column;padding:12mm 12mm 0 12mm;box-sizing:border-box;font-family:'Carlito','Calibri',Arial,sans-serif;color:#050F41;background:#ffffff">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;margin:0 0 22px 0;border-bottom:3px solid #050F41">
<tbody><tr>
<td valign="middle" align="center" style="padding:0 0 20px 0;text-align:center;color:#050F41">
<p style="margin:0;font-family:'Montserrat',Arial,sans-serif;font-size:21px;font-weight:800;letter-spacing:.08em">HOSPITAL NAVAL DE RECIFE</p>
<p style="margin:2px 0 0 0;font-family:'Montserrat',Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:.08em;color:#1c4587">JUNTA REGULAR DE SAÚDE</p>
</td>
</tr></tbody>
</table>

<p style="color:#050F41;font-size:20px;font-weight:700;letter-spacing:.5px;margin:14px 0 10px;border-bottom:2px solid #FAB932;padding-bottom:4px">INSPEÇÕES DE SAÚDE · {{data_titulo}}</p>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;margin:0;font-size:13px;line-height:1.35;color:#050F41">
<thead>
<tr>
<th align="left" style="padding:0 10px 5px 0;border-bottom:2px solid #050F41;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#555555">HORA</th>
<th align="left" style="padding:0 10px 5px 0;border-bottom:2px solid #050F41;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#555555">IS</th>
<th align="left" style="padding:0 10px 5px 0;border-bottom:2px solid #050F41;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#555555">INSPECIONADO</th>
<th align="left" style="padding:0 10px 5px 0;border-bottom:2px solid #050F41;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#555555">FINALIDADE</th>
<th align="left" style="padding:0 0 5px 0;border-bottom:2px solid #050F41;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#555555">MÉDICO</th>
</tr>
</thead>
<tbody>
{{#agendamentos}}
<tr>
<td valign="top" style="width:52px;padding:8px 10px 8px 0;border-bottom:1px solid #e0e0e0;font-size:15px;font-weight:700;white-space:nowrap">{{hora}}</td>
<td valign="top" style="padding:8px 10px 8px 0;border-bottom:1px solid #e0e0e0;color:#555555;white-space:nowrap">{{numero_is}}</td>
<td valign="top" style="padding:8px 10px 8px 0;border-bottom:1px solid #e0e0e0;font-weight:700">{{nome}} <span style="font-weight:400;color:#555555">· {{om}}</span></td>
<td valign="top" style="padding:8px 10px 8px 0;border-bottom:1px solid #e0e0e0;color:#333333">{{finalidade}}</td>
<td valign="top" style="padding:8px 0 8px 0;border-bottom:1px solid #e0e0e0;font-weight:700;white-space:nowrap">{{medico}}</td>
</tr>
{{/agendamentos}}
{{^agendamentos}}
<tr><td colspan="5" style="padding:12px 0;border-bottom:1px solid #e0e0e0;font-size:14px;color:#555555;font-style:italic">Não há Inspeções de Saúde agendadas para esta data.</td></tr>
{{/agendamentos}}
</tbody>
</table>

<div style="margin:auto -12mm 0 -12mm;padding-top:14px">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;background:#e8e8e8">
<tbody><tr>
<td valign="middle" style="width:50%;padding:12px 20px;text-align:right"><img src="{{logo_rodape}}" style="height:30px;width:auto;display:inline-block;border:0" alt="Marinha do Brasil"></td>
<td style="width:1px;border-left:1px solid #c4c4c4;font-size:1px;line-height:1px">&nbsp;</td>
<td valign="middle" style="padding:12px 20px;font-size:11px;line-height:1.45;color:#333333">
<strong style="color:#050F41;font-size:12px">Hospital Naval de Recife - Junta Regular de Saúde</strong><br>
📞 (81) 3036 - 9073 <span style="margin:0 5px;color:#999999">/</span> 📧 hnre.jrs@marinha.mil.br<br>
📍 Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE
</td>
</tr></tbody>
</table>
</div>
</section>
{{#tem_concursos}}
<section class="page" style="min-height:210mm;display:flex;flex-direction:column;padding:12mm 12mm 0 12mm;box-sizing:border-box;font-family:'Carlito','Calibri',Arial,sans-serif;color:#050F41;background:#ffffff">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;margin:0 0 22px 0;border-bottom:3px solid #050F41">
<tbody><tr>
<td valign="middle" align="center" style="padding:0 0 20px 0;text-align:center;color:#050F41">
<p style="margin:0;font-family:'Montserrat',Arial,sans-serif;font-size:21px;font-weight:800;letter-spacing:.08em">HOSPITAL NAVAL DE RECIFE</p>
<p style="margin:2px 0 0 0;font-family:'Montserrat',Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:.08em;color:#1c4587">JUNTA REGULAR DE SAÚDE</p>
</td>
</tr></tbody>
</table>
<p style="color:#050F41;font-size:20px;font-weight:700;letter-spacing:.5px;margin:14px 0 10px;border-bottom:2px solid #FAB932;padding-bottom:4px">INSPEÇÕES DE SAÚDE DE CONCURSOS · {{data_titulo}}</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;margin:0;font-size:13px;line-height:1.35;color:#050F41">
<thead>
<tr>
<th align="left" style="padding:0 10px 5px 0;border-bottom:2px solid #050F41;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#555555">CONCURSO</th>
<th align="left" style="padding:0 10px 5px 0;border-bottom:2px solid #050F41;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#555555">MATRÍCULA</th>
<th align="left" style="padding:0 0 5px 0;border-bottom:2px solid #050F41;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#555555">CANDIDATO</th>
</tr>
</thead>
<tbody>
{{#concursos}}
<tr>
<td valign="top" style="padding:8px 10px 8px 0;border-bottom:1px solid #e0e0e0;font-weight:700;white-space:nowrap">{{concurso}}</td>
<td valign="top" style="padding:8px 10px 8px 0;border-bottom:1px solid #e0e0e0;color:#333333;white-space:nowrap">{{matricula}}</td>
<td valign="top" style="padding:8px 0 8px 0;border-bottom:1px solid #e0e0e0;font-weight:700">{{candidato}}</td>
</tr>
{{/concursos}}
</tbody>
</table>
<div style="margin:auto -12mm 0 -12mm;padding-top:14px">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;background:#e8e8e8">
<tbody><tr>
<td valign="middle" style="width:50%;padding:12px 20px;text-align:right"><img src="{{logo_rodape}}" style="height:30px;width:auto;display:inline-block;border:0" alt="Marinha do Brasil"></td>
<td style="width:1px;border-left:1px solid #c4c4c4;font-size:1px;line-height:1px">&nbsp;</td>
<td valign="middle" style="padding:12px 20px;font-size:11px;line-height:1.45;color:#333333">
<strong style="color:#050F41;font-size:12px">Hospital Naval de Recife - Junta Regular de Saúde</strong><br>
📞 (81) 3036 - 9073 <span style="margin:0 5px;color:#999999">/</span> 📧 hnre.jrs@marinha.mil.br<br>
📍 Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE
</td>
</tr></tbody>
</table>
</div>
</section>
{{/tem_concursos}}
</body>
</html>
`;
