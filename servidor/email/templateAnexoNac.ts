// Ficheiro: servidor/email/templateAnexoNac.ts
// Anexo em PDF (A4 paisagem) do e-mail ao NAC (Claude Design: "Anexo IS NAC - JRS"): aviso de acesso restrito,
// cabeçalho HNRe/JRS, tabela paginada (utils/emailNac.ts: paginarNac — 9 linhas por página, "Página n de N" quando
// há mais de uma) e a assinatura do Presidente na última página. Gerado pelo Chromium sem rede: fonte, aviso,
// assinatura e logo entram como data: URI (servidor/email/recursosAnexo.ts). Aqui {{nome}} é "POSTO NIP NOME".
export const TEMPLATE_ANEXO_NAC = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>IS VDF e Términos - NAC - JRS/HNRe</title>
<style>
@font-face{font-family:'Montserrat';font-weight:100 900;src:url({{fonte_montserrat}}) format('woff2')}
@page{size:A4 landscape;margin:0}
html,body{margin:0;padding:0}
body{font-family:'Carlito','Calibri',Arial,sans-serif;color:#050F41;-webkit-print-color-adjust:exact;print-color-adjust:exact}
section.page{width:297mm;overflow:hidden;break-after:page}
section.page:last-of-type{break-after:auto}
tr{break-inside:avoid}
</style>
</head>
<body>{{#paginas}}
<section class="page" style="height:210mm;display:flex;flex-direction:column;padding:4mm 12mm 0 12mm;box-sizing:border-box;font-family:'Carlito','Calibri',Arial,sans-serif;color:#050F41;background:#ffffff">
<div style="text-align:center;margin:0 0 12px 0"><img src="{{aviso}}" style="width:340px;max-width:100%;height:auto;display:inline-block;border:0" alt="INFORMAÇÃO PESSOAL – ACESSO RESTRITO"></div>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;margin:0 0 22px 0;border-bottom:3px solid #050F41">
<tbody><tr>
<td valign="middle" align="center" style="padding:0 0 20px 0;text-align:center;color:#050F41">
<p style="margin:0;font-family:'Montserrat',Arial,sans-serif;font-size:21px;font-weight:800;letter-spacing:.08em">HOSPITAL NAVAL DE RECIFE</p>
<p style="margin:2px 0 0 0;font-family:'Montserrat',Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:.08em;color:#1c4587">JUNTA REGULAR DE SAÚDE</p>
</td>
</tr></tbody>
</table>

<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:6px 0 10px;border-bottom:2px solid #FAB932;padding-bottom:4px">
<p style="color:#050F41;font-size:20px;font-weight:700;letter-spacing:.5px;margin:0">INSPEÇÕES DE SAÚDE - NAC · {{periodo_inicio}} A {{periodo_fim}}</p>
{{#multi}}<p style="margin:0;font-size:12px;color:#555555;white-space:nowrap">Página {{num}} de {{total}}</p>{{/multi}}
</div>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;margin:0;font-size:13px;line-height:1.35;color:#050F41">
<thead>
<tr>
<th align="left" style="padding:0 10px 5px 0;border-bottom:2px solid #050F41;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#555555">DATA</th>
<th align="left" style="padding:0 10px 5px 0;border-bottom:2px solid #050F41;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#555555">INSPECIONADO</th>
<th align="left" style="padding:0 10px 5px 0;border-bottom:2px solid #050F41;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#555555">FINALIDADE</th>
<th align="left" style="padding:0 0 5px 0;border-bottom:2px solid #050F41;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#555555">LAUDO</th>
</tr>
</thead>
<tbody>
{{#linhas}}
<tr>
<td valign="top" style="width:80px;padding:8px 10px 8px 0;border-bottom:1px solid #e0e0e0;font-size:15px;font-weight:700;white-space:nowrap">{{data}}</td>
<td valign="top" style="padding:8px 10px 8px 0;border-bottom:1px solid #e0e0e0;font-weight:700"><span style="display:block">{{nome}}</span><span style="display:block;font-size:12px;font-weight:400;color:#555555">{{om}} · IS {{numero_is}}</span></td>
<td valign="top" style="padding:8px 10px 8px 0;border-bottom:1px solid #e0e0e0;color:#333333">{{finalidade}}</td>
<td valign="top" style="padding:8px 0 8px 0;border-bottom:1px solid #e0e0e0;font-weight:700">{{laudo}}</td>
</tr>
{{/linhas}}
</tbody>
</table>

<div style="margin-top:auto;padding-top:12px">
{{#ultima}}
<div style="padding:0 0 4px 0;text-align:left">
<img src="{{assinatura_presidente}}" style="width:230px;height:auto;display:block;border:0" alt="Mauriston Renan Martins Silva · Capitão-Tenente (Md) · Presidente">
</div>
{{/ultima}}

<div style="margin:0 -12mm 0 -12mm">
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
</div>
</section>
{{/paginas}}
</body>
</html>
`;
