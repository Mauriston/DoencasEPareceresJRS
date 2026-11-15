// Ficheiro: servidor/email/templateGuiasIS.ts
// Templates dos e-mails das GUIAS DE EXAMES (servidor/email/guiasIS.ts), no mesmo padrão visual do e-mail ao NAC
// (servidor/email/templateNac.ts): banner no topo, corpo branco, rodapé cinza com a logo da MB e os contatos —
// sem o cabeçalho "INFORMAÇÃO PESSOAL". HTML puro (tabelas e estilos inline, sem JavaScript) para o Zimbra.
// As peças comuns (moldura, assinaturas e rodapé) também servem ao e-mail de abertura (templateAberturaIS.ts).
//
// Placeholders:
//  - comuns: {{titulo}} {{banner_url}} {{logo_rodape_url}} {{fecho}};
//  - ao inspecionado: {{vocativo}} {{finalidade}} {{#exames_linhas}} {{#primeira}}{{tipo}} {{rowspan}}{{/primeira}} {{exame}} {{/exames_linhas}}
//    e a assinatura dinâmica ({{#mostrar_signatario}}…, {{presidente_nome}}, {{presidente_posto}} — servidor/email/comum.ts);
//  - à SEC-JRS: {{finalidade}} {{inspecionado}} e só a assinatura de quem enviou ({{remetente_nome}} {{remetente_posto}} {{remetente_cargo}}).

const FONTE = "'Carlito','Calibri',Arial,sans-serif";

/** Início do documento: fundo cinza-claro, cartão branco de 820 px e o banner. */
export const MOLDURA_INICIO = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{titulo}}</title>
<style>body{margin:0;background:#f4f6f9;font-family:${FONTE}}a{color:#050F41}@media screen and (max-width:600px){.mobile-padding{padding:20px !important}.stack-column{display:block !important;width:100% !important;margin-bottom:15px !important;text-align:center !important;padding:0 !important}.hide-mobile{display:none !important}}</style>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:${FONTE}">
<div style="padding:40px 0;background:#f4f6f9;font-family:${FONTE}">
<center style="width:100%;table-layout:fixed">
<div style="max-width:820px;margin:0 auto;box-shadow:0 4px 12px rgba(5,15,65,.08)">
<table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width:820px;margin:auto;background:#ffffff;width:100%;border-radius:8px;overflow:hidden;font-family:${FONTE}">
<tbody>
<tr><td style="padding:0;text-align:center;background:#050F41;width:100%"><img src="{{banner_url}}" width="820" style="width:100%;max-width:820px;height:auto;display:block;border:0" alt="Cabeçalho Hospital Naval de Recife - Junta Regular de Saúde"></td></tr>
<tr><td class="mobile-padding" style="background:#ffffff;padding:40px 50px 20px 50px;text-align:left;font-family:${FONTE};font-size:16px;line-height:1.6;color:#050F41">
`;

/** Fecho ("ATT/RPT,") + assinatura dinâmica: "Por ordem de:" quem disparou (quando há) e o Presidente. */
export const ASSINATURA_DUPLA = `
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
`;

/** Fim do corpo, rodapé cinza (logo da MB e contatos da JRS) e fechamento do documento. */
export const MOLDURA_FIM = `
</td></tr>
<tr><td class="mobile-padding" style="background:#e8e8e8;padding:20px 50px;width:100%">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%">
<tbody><tr>
<td class="stack-column" width="50%" align="center" valign="middle" style="padding-right:15px"><img src="{{logo_rodape_url}}" width="260" style="width:260px;max-width:100%;height:auto;display:inline-block;border:0" alt="Logo Marinha do Brasil"></td>
<td class="hide-mobile" width="1" style="border-left:1px solid #c4c4c4;font-size:1px;line-height:1px">&nbsp;</td>
<td class="stack-column" width="49%" align="left" valign="middle" style="padding-left:20px;font-family:${FONTE};font-size:12px;line-height:1.5;color:#333333">
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

/** "GUIA DOS EXAMES PARA INSPEÇÃO DE SAÚDE" ao inspecionado (tipo guiasInspecionado). */
export const TEMPLATE_GUIAS_INSPECIONADO = `${MOLDURA_INICIO}
<p style="margin:0 0 25px 0;font-size:17px;font-weight:700">{{vocativo}},</p>

<p style="margin:0 0 20px 0;text-align:justify">participo em anexo as guias dos exames necessários para a realização da IS fim <strong>{{finalidade}}</strong>, a saber:</p>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:0 0 30px 0;font-size:15px;line-height:1.4;color:#050F41;border-collapse:collapse">
<tbody>
<tr>
<td width="200" style="width:200px;padding:0 12px 6px 0;border-bottom:2px solid #050F41;font-size:11px;font-weight:700;letter-spacing:.06em;color:#555555">TIPO</td>
<td style="padding:0 0 6px 0;border-bottom:2px solid #050F41;font-size:11px;font-weight:700;letter-spacing:.06em;color:#555555">EXAME</td>
</tr>
{{#exames_linhas}}
<tr>
{{#primeira}}
<td valign="top" rowspan="{{rowspan}}" width="200" style="width:200px;padding:10px 12px 10px 0;border-bottom:1px solid #e0e0e0;font-weight:700">{{tipo}}</td>
{{/primeira}}
<td valign="top" style="padding:10px 0;border-bottom:1px solid #e0e0e0;color:#333333">{{exame}}</td>
</tr>
{{/exames_linhas}}
</tbody>
</table>
${ASSINATURA_DUPLA}${MOLDURA_FIM}`;

/** "EXAMES DE {inspecionado}" à SEC-JRS (tipo guiasSecretaria): só o texto e a assinatura de quem enviou. */
export const TEMPLATE_GUIAS_SECRETARIA = `${MOLDURA_INICIO}
<p style="margin:0 0 25px 0;text-align:justify">Seguem as guias dos exames da IS fim <strong>{{finalidade}}</strong> de <strong>{{inspecionado}}</strong>.</p>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%">
<tbody><tr><td style="padding:15px 0 10px 0;color:#050F41">
<p style="margin:0 0 18px 0;font-size:16px;font-weight:700">{{fecho}}</p>
<p style="margin:0;font-size:18px;font-weight:700">{{remetente_nome}}</p>
{{#remetente_posto}}
<p style="margin:0;font-size:14px;font-weight:700;color:#555555">{{remetente_posto}}</p>
{{/remetente_posto}}
{{#remetente_cargo}}
<p style="margin:0;font-size:14px;color:#555555">{{remetente_cargo}}</p>
{{/remetente_cargo}}
</td></tr></tbody>
</table>
${MOLDURA_FIM}`;
