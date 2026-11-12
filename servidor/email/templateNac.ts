// Ficheiro: servidor/email/templateNac.ts
// Template do e-mail "INSPEÇÕES DE SAÚDE VDF E TÉRMINOS" ao NAC (Claude Design: EmailNacJrs). HTML puro, sem JavaScript
// (Zimbra). Placeholders (servidor/email/nac.ts): {{saudacao}}, {{periodo_inicio}}, {{periodo_fim}},
// {{#itens}} {{data}} {{nome_completo}} (só o nome) {{om}} {{numero_is}} {{finalidade}} {{laudo}} {{/itens}}, {{fecho}},
// assinatura dinâmica ({{#mostrar_signatario}}…, {{presidente_nome}}, {{presidente_posto}} — servidor/email/comum.ts),
// {{banner_url}}, {{aviso_url}} (aviso de acesso restrito, public/email/) e {{logo_rodape_url}}.
export const TEMPLATE_NAC = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Inspeções de Saúde VDF e Términos - NAC - JRS/HNRe</title>
<style>body{margin:0;background:#f4f6f9;font-family:'Carlito','Calibri',Arial,sans-serif}a{color:#050F41}a:hover{color:#1c4587}@media screen and (max-width:600px){.mobile-padding{padding:20px !important}.stack-column{display:block !important;width:100% !important;margin-bottom:15px !important;text-align:center !important}.hide-mobile{display:none !important}.footer-text{text-align:center !important;padding-left:0 !important}}</style>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Carlito','Calibri',Arial,sans-serif">
<div style="padding:40px 0;background:#f4f6f9;font-family:'Carlito','Calibri',Arial,sans-serif">
<center style="width:100%;table-layout:fixed">
<div style="max-width:820px;margin:0 auto;box-shadow:0 4px 12px rgba(5,15,65,.08)">
<table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width:820px;margin:auto;background:#ffffff;width:100%;border-radius:8px;overflow:hidden;font-family:'Carlito','Calibri',Arial,sans-serif">
<tbody>
<tr><td style="padding:0;text-align:center;background:#050F41;width:100%"><img src="{{banner_url}}" width="820" style="width:100%;max-width:820px;height:auto;display:block;border:0" alt="Cabeçalho Hospital Naval de Recife - Junta Regular de Saúde"></td></tr>
<tr><td class="mobile-padding" style="background:#ffffff;padding:20px 50px 20px 50px;text-align:left;font-family:'Carlito','Calibri',Arial,sans-serif;font-size:16px;line-height:1.6;color:#050F41">

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:0 0 30px 0"><tbody><tr><td align="center" style="text-align:center"><img src="{{aviso_url}}" width="378" style="width:378px;max-width:100%;height:auto;display:inline-block;border:0" alt="INFORMAÇÃO PESSOAL – ACESSO RESTRITO · Art. 5º, Inciso X, CF/1988 · Art. 31 da Lei nº 12.527/2011 · Art. 55 ao 62 do Dec nº 7.724/2012"></td></tr></tbody></table>

<p style="margin:0 0 25px 0;font-size:17px;font-weight:700">{{saudacao}}</p>

<p style="margin:0 0 25px 0;text-align:justify"><strong>PTC</strong> lista de militares submetidos a IS de Verificações e Términos referente ao período entre <strong>{{periodo_inicio}}</strong> a <strong>{{periodo_fim}}</strong>.</p>

<p style="color:#050F41;font-size:24px;font-weight:700;letter-spacing:.5px;margin:0 0 15px;border-bottom:2px solid #FAB932;padding-bottom:5px">INSPEÇÕES DE SAÚDE - NAC</p>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:0 0 30px 0;font-size:14px;line-height:1.35;color:#050F41">
<tbody>
<tr>
<td style="padding:0 10px 6px 0;border-bottom:2px solid #050F41;font-size:11px;font-weight:700;letter-spacing:.06em;color:#555555">DATA</td>
<td style="padding:0 10px 6px 0;border-bottom:2px solid #050F41;font-size:11px;font-weight:700;letter-spacing:.06em;color:#555555">INSPECIONADO</td>
<td style="padding:0 10px 6px 0;border-bottom:2px solid #050F41;font-size:11px;font-weight:700;letter-spacing:.06em;color:#555555">FINALIDADE</td>
<td style="padding:0 0 6px 0;border-bottom:2px solid #050F41;font-size:11px;font-weight:700;letter-spacing:.06em;color:#555555">LAUDO</td>
</tr>
{{#itens}}
<tr>
<td valign="top" width="86" style="width:86px;padding:11px 10px 11px 0;border-bottom:1px solid #e0e0e0;font-size:15px;font-weight:700;white-space:nowrap">{{data}}</td>
<td valign="top" style="padding:11px 10px 11px 0;border-bottom:1px solid #e0e0e0">
<span style="display:block;font-weight:700;font-size:14px">{{nome_completo}}</span>
<span style="display:block;font-size:12px;color:#555555">{{om}} · {{numero_is}}</span>
</td>
<td valign="top" style="padding:11px 10px 11px 0;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333">{{finalidade}}</td>
<td valign="top" style="padding:11px 0 11px 0;border-bottom:1px solid #e0e0e0;font-size:14px;font-weight:700">{{laudo}}</td>
</tr>
{{/itens}}
</tbody>
</table>

<p style="margin:0 0 25px 0;text-align:justify">À disposição para quaisquer esclarecimentos adicionais.</p>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%">
<tbody><tr><td style="padding:25px 0 10px 0;color:#050F41">
<p style="margin:0 0 18px 0;font-size:16px;font-weight:700">{{fecho}}</p>
{{#mostrar_signatario}}
<p style="margin:0 0 8px 0;font-size:14px;font-style:italic;color:#555555">Por ordem de:</p>
<p style="margin:0;font-size:18px;font-weight:700">{{signatario_nome}}</p>
<p style="margin:0;font-size:14px;font-weight:700;color:#555555">{{signatario_posto}}</p>
<p style="margin:0 0 20px 0;font-size:14px;color:#555555">{{signatario_cargo}}</p>
{{/mostrar_signatario}}
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
