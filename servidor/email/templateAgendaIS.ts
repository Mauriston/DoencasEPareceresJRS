// Ficheiro: servidor/email/templateAgendaIS.ts
// Template do e-mail "IS agendadas" do dia seguinte (JRS/HNRe → militares da JRS), criado no Claude Design
// (EmailAgendaJrs). HTML puro, sem JavaScript (Zimbra): estilos inline, tabelas, fonte Carlito → Calibri → Arial.
// Placeholders no estilo Mustache, preenchidos por servidor/email/agendaIS.ts:
//
//   {{vocativo}}           "Prezados Militares da JRS,"
//   {{data_extenso}}       DD/MM/AAAA
//   {{data_titulo}}        "13/11/2026 (SEXTA-FEIRA)"
//   {{#agendamentos}}…{{/agendamentos}}   por hora; cada item: {{hora}} {{nome}} {{om}} {{numero_is}} {{finalidade}} {{medico}}
//   {{^agendamentos}}…{{/agendamentos}}   linha "Não há Inspeções de Saúde agendadas" (o e-mail sai mesmo sem IS)
//   {{#tem_concursos}}…{{/tem_concursos}} bloco "INSPEÇÕES DE SAÚDE DE CONCURSOS" — só quando há candidatos no dia
//   {{#concursos}}…{{/concursos}}         cada item: {{concurso}} {{matricula}} {{candidato}}
//   {{fecho}}              "ATT/RPT,"
//   {{#mostrar_supervisor}}…{{/mostrar_supervisor}} · {{supervisor_nome}} {{supervisor_posto}} {{presidente_nome}} {{presidente_posto}}
//   {{banner_url}} · {{logo_rodape_url}} · {{app_imagem_url}} (brasão do HNRe, public/email/brasao-hnre-app.png)
//
// O bloco "APP JRS/HNRe" (Acessar o App · Add Google Agenda), os contatos e o endereço do rodapé são fixos.
export const TEMPLATE_AGENDA_IS = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agenda de Inspeções de Saúde - JRS/HNRe</title>
<style>body{margin:0;background:#f4f6f9;font-family:'Carlito','Calibri',Arial,sans-serif}a{color:#050F41}a:hover{color:#1c4587}@media screen and (max-width:600px){.mobile-padding{padding:20px !important}.stack-column{display:block !important;width:100% !important;margin-bottom:15px !important;text-align:center !important}.hide-mobile{display:none !important}.footer-text{text-align:center !important;padding-left:0 !important}}</style>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Carlito','Calibri',Arial,sans-serif">
<div style="padding:40px 0;background:#f4f6f9;font-family:'Carlito','Calibri',Arial,sans-serif">
<center style="width:100%;table-layout:fixed">
<div style="max-width:820px;margin:0 auto;box-shadow:0 4px 12px rgba(5,15,65,.08)">
<table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width:820px;margin:auto;background:#ffffff;width:100%;border-radius:8px;overflow:hidden;font-family:'Carlito','Calibri',Arial,sans-serif">
<tbody>
<tr><td style="padding:0;text-align:center;background:#050F41;width:100%"><img src="{{banner_url}}" width="820" style="width:100%;max-width:820px;height:auto;display:block;border:0" alt="Cabeçalho Hospital Naval de Recife - Junta Regular de Saúde"></td></tr>
<tr><td class="mobile-padding" style="background:#ffffff;padding:40px 50px 20px 50px;text-align:left;font-family:'Carlito','Calibri',Arial,sans-serif;font-size:16px;line-height:1.6;color:#050F41">

<p style="margin:0 0 25px 0;font-size:17px;font-weight:700">{{vocativo}}</p>

<p style="margin:0 0 25px 0;text-align:justify">INF as Inspeções de Saúde agendadas para <strong>{{data_extenso}}</strong>, conforme relação abaixo:</p>

<p style="color:#050F41;font-size:24px;font-weight:700;letter-spacing:.5px;margin:0 0 15px;border-bottom:2px solid #FAB932;padding-bottom:5px">INSPEÇÕES DE SAÚDE · {{data_titulo}}</p>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:0 0 30px 0;font-size:14px;line-height:1.35;color:#050F41">
<tbody>
<tr>
<td style="padding:0 10px 6px 0;border-bottom:2px solid #050F41;font-size:11px;font-weight:700;letter-spacing:.06em;color:#555555">HORA</td>
<td style="padding:0 10px 6px 0;border-bottom:2px solid #050F41;font-size:11px;font-weight:700;letter-spacing:.06em;color:#555555">INSPECIONADO</td>
<td style="padding:0 10px 6px 0;border-bottom:2px solid #050F41;font-size:11px;font-weight:700;letter-spacing:.06em;color:#555555">FINALIDADE</td>
<td style="padding:0 0 6px 0;border-bottom:2px solid #050F41;font-size:11px;font-weight:700;letter-spacing:.06em;color:#555555">MÉDICO</td>
</tr>
{{#agendamentos}}
<tr>
<td valign="top" width="56" style="width:56px;padding:11px 10px 11px 0;border-bottom:1px solid #e0e0e0;font-size:16px;font-weight:700;white-space:nowrap">{{hora}}</td>
<td valign="top" style="padding:11px 10px 11px 0;border-bottom:1px solid #e0e0e0">
<span style="display:block;font-weight:700;font-size:14px">{{nome}}</span>
<span style="display:block;font-size:12px;color:#555555">{{om}} · {{numero_is}}</span>
</td>
<td valign="top" style="padding:11px 10px 11px 0;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333">{{finalidade}}</td>
<td valign="top" style="padding:11px 0 11px 0;border-bottom:1px solid #e0e0e0;font-size:14px;font-weight:700;white-space:nowrap">{{medico}}</td>
</tr>
{{/agendamentos}}
{{^agendamentos}}
<tr><td colspan="4" style="padding:16px 0;border-bottom:1px solid #e0e0e0;font-size:15px;color:#555555;font-style:italic">Não há Inspeções de Saúde agendadas para esta data.</td></tr>
{{/agendamentos}}
</tbody>
</table>

{{#tem_concursos}}
<p style="color:#050F41;font-size:24px;font-weight:700;letter-spacing:.5px;margin:0 0 15px;border-bottom:2px solid #FAB932;padding-bottom:5px">INSPEÇÕES DE SAÚDE DE CONCURSOS</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:0 0 30px 0;font-size:14px;line-height:1.35;color:#050F41">
<tbody>
<tr>
<td style="padding:0 10px 6px 0;border-bottom:2px solid #050F41;font-size:11px;font-weight:700;letter-spacing:.06em;color:#555555">CONCURSO</td>
<td style="padding:0 10px 6px 0;border-bottom:2px solid #050F41;font-size:11px;font-weight:700;letter-spacing:.06em;color:#555555">MATRÍCULA</td>
<td style="padding:0 0 6px 0;border-bottom:2px solid #050F41;font-size:11px;font-weight:700;letter-spacing:.06em;color:#555555">CANDIDATO</td>
</tr>
{{#concursos}}
<tr>
<td valign="top" style="padding:11px 10px 11px 0;border-bottom:1px solid #e0e0e0;font-size:14px;font-weight:700;white-space:nowrap">{{concurso}}</td>
<td valign="top" style="padding:11px 10px 11px 0;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;white-space:nowrap">{{matricula}}</td>
<td valign="top" style="padding:11px 0 11px 0;border-bottom:1px solid #e0e0e0;font-size:14px;font-weight:700">{{candidato}}</td>
</tr>
{{/concursos}}
</tbody>
</table>
{{/tem_concursos}}

<div style="height:25px;line-height:25px;font-size:1px">&nbsp;</div>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:0 0 30px 0">
<tbody><tr><td style="background:#f4f6f9;border-left:4px solid #050F41;border-radius:4px;padding:22px 24px;color:#050F41">
<p style="margin:0 0 14px 0;font-size:20px;font-weight:700;letter-spacing:.5px;text-align:center">APP JRS/HNRe</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%">
<tbody><tr>
<td class="stack-column" width="120" valign="top" align="center" style="width:120px;padding:4px 20px 0 0"><img src="{{app_imagem_url}}" width="110" style="width:110px;max-width:110px;height:auto;display:inline-block;border:0" alt="Brasão do Hospital Naval de Recife"></td>
<td class="stack-column" valign="top" style="padding:0">
<p style="margin:0;font-size:15px;line-height:1.6;text-align:justify">Acesse o App JRS/HNRe para agendar as inspeções de saúde, gerar as guias dos exames de acordo com finalidade, gerar pedidos de pareceres com os quesitos padrão, verificar as planilhas de controle dos concursos e os termos gerados automaticamente.</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:28px 0 0 0"><tbody><tr><td align="center" width="50%" style="width:50%;text-align:center"><a href="https://mauriston.github.io/DoencasEPareceresJRS/" target="_blank" style="display:inline-block;background:#050F41;color:#ffffff;border:2px solid #050F41;padding:12px 22px;border-radius:4px;font-size:14px;line-height:1.2;font-weight:700;text-decoration:none;white-space:nowrap">Acessar o App JRS/HNRe</a></td><td align="center" width="50%" style="width:50%;text-align:center"><a href="https://calendar.google.com/calendar/r?cid=c_b103c034ba38b68e447b1ea6ab97b0da658878ebc7daa7535d612f9f7eaed762%40group.calendar.google.com" target="_blank" style="display:inline-block;background:#ffffff;color:#050F41;border:2px solid #050F41;padding:12px 22px;border-radius:4px;font-size:14px;line-height:1.2;font-weight:700;text-decoration:none;white-space:nowrap">Add Google Agenda</a></td></tr></tbody></table>

</td>
</tr></tbody>
</table>
</td></tr></tbody>
</table>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%">
<tbody><tr><td style="padding:25px 0 10px 0;color:#050F41">
<p style="margin:0 0 18px 0;font-size:16px;font-weight:700">{{fecho}}</p>
{{#mostrar_supervisor}}
<p style="margin:0;font-size:18px;font-weight:700">{{supervisor_nome}}</p>
<p style="margin:0;font-size:14px;font-weight:700;color:#555555">{{supervisor_posto}}</p>
<p style="margin:0 0 20px 0;font-size:14px;color:#555555">Supervisor</p>
{{/mostrar_supervisor}}
<p style="margin:0;font-size:18px;font-weight:700">{{presidente_nome}}</p>
<p style="margin:0;font-size:14px;font-weight:700;color:#555555">{{presidente_posto}}</p>
<p style="margin:0;font-size:14px;color:#555555">Presidente</p>
</td></tr></tbody>
</table>

</td></tr>
<tr><td class="mobile-padding" style="background:#e8e8e8;padding:20px 50px;width:100%">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%">
<tbody><tr>
<td class="stack-column" width="50%" align="center" valign="middle" style="padding-right:15px"><img src="{{logo_rodape_url}}" width="260" style="width:260px;max-width:100%;height:auto;display:inline-block;border:0" alt="Logo Marinha do Brasil"></td>
<td class="hide-mobile" width="1" style="border-left:1px solid #c4c4c4;font-size:1px;line-height:1px">&nbsp;</td>
<td class="stack-column footer-text" width="49%" align="left" valign="middle" style="padding-left:20px;font-family:'Carlito','Calibri',Arial,sans-serif;font-size:12px;line-height:1.5;color:#333333">
<strong style="color:#050F41;font-size:13px">Hospital Naval de Recife - Junta Regular de Saúde</strong><br>
📞 (81) 3036 - 9073 <span style="margin:0 5px;color:#999999">/</span> 📧 <a href="mailto:hnre.jrs@marinha.mil.br" style="color:#333333;text-decoration:underline">hnre.jrs@marinha.mil.br</a><br>
📍 Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE
</td>
</tr></tbody>
</table>
</td></tr>
</tbody>
</table>
</div>
</center>
</div>
</body>
</html>
`;
