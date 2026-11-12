// Ficheiro: servidor/email/templateResultadoIS.ts
// Template do e-mail "Resultado de Inspeção de Saúde" (JRS/HNRe), criado no Claude Design (versão Zimbra).
// HTML puro, sem JavaScript (o Zimbra da Marinha não executa scripts): estilos inline, tabelas e a fonte
// Carlito → Calibri → Arial. Placeholders no estilo Mustache, preenchidos por servidor/email/resultadoIS.ts:
//
//   {{vocativo}}              "Prezado(a) Senhor(a),"
//   {{inspecionado}}          "2SG-CO 07.3644.15 PAULO ANDRE DIAS DOS SANTOS (EAMPE)" (com a OM entre parênteses)
//   {{finalidade_is}}         "FIM VDF Fato Novo" (no parágrafo de abertura e no quadro)
//   {{numero_is}}             "1245271"
//   {{numero_tis}}            "026.000.57079"
//   {{data_conclusao}}        data naval DDMMMAAAA, ex.: "30OUT2026"
//   {{laudo}}                 sem aspas (o template já as inclui)
//   {{#tem_restricoes}}…{{/tem_restricoes}}   bloco das restrições (só quando há restrições)
//   {{#restricoes}}{{item}}{{/restricoes}}    itens já pontuados: "X;" … penúltimo "Y; e" … último "Z."
//   {{instancia_recurso}}     "Junta Superior Distrital (JSD/COM3ºDN)"
//   {{prazo_recurso_dias}}    45
//   {{#mostrar_signatario}}…{{/mostrar_signatario}}   1ª assinatura = quem enviou ("Por ordem de:"); some para o Admin
//   {{signatario_nome}} · {{signatario_posto}} · {{signatario_cargo}} · {{presidente_nome}} · {{presidente_posto}} (servidor/email/comum.ts)
//   {{banner_url}}            URL pública absoluta do banner do cabeçalho
//   {{logo_rodape_url}}       URL pública absoluta da logo MB para fundo claro (public/email/, 780×113, exibida a 260 px)
//
// Links do CPMM, contatos e endereço do rodapé são fixos. Todo valor é escapado para HTML na renderização.
export const TEMPLATE_RESULTADO_IS = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Resultado de Inspeção de Saúde - JRS/HNRe</title>
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

<p style="margin:0 0 25px 0;text-align:justify">Após reunião em plenário da JRS/HNRe, INF o resultado da <strong>IS {{finalidade_is}}</strong>, conforme dados abaixo:</p>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:0 0 30px 0">
<tbody><tr><td style="background:#f4f6f9;border-left:4px solid #050F41;border-radius:4px;padding:22px 24px;color:#050F41">
<p style="margin: 0 0 14px 0; font-size: 24px; line-height: 1.2; font-weight: 800; letter-spacing: .5px">RESULTADO DA INSPEÇÃO DE SAÚDE</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;font-size:15px;line-height:1.5;color:#050F41">
<tbody>
<tr><td style="padding:0 0 8px 20px"><strong>Inspecionado:</strong> {{inspecionado}}</td></tr>
<tr><td style="padding:0 0 8px 20px"><strong>Finalidade IS:</strong> {{finalidade_is}}</td></tr>
<tr><td style="padding:0 0 8px 20px"><strong>Nº da IS:</strong> {{numero_is}}</td></tr>
<tr><td style="padding:0 0 8px 20px"><strong>Nº do TIS:</strong> {{numero_tis}}</td></tr>
<tr><td style="padding:0 0 8px 20px"><strong>Data de conclusão:</strong> <span style="background:#050F41;color:#ffffff;padding:2px 8px;border-radius:4px;font-weight:700;font-size:14px;letter-spacing:.5px">{{data_conclusao}}</span></td></tr>
<tr><td style="padding:0 0 8px 20px"><strong>Laudo: "{{laudo}}"</strong></td></tr>
</tbody>
</table>
{{#tem_restricoes}}
<p style="margin:0 0 4px 20px;font-size:15px;font-weight:700">Restrições:</p>
<ul style="margin:0 0 0 20px;padding-left:22px;list-style-type:circle;font-size:15px;line-height:1.6;color:#050F41">
{{#restricoes}}
<li style="margin-bottom:4px">{{item}}</li>
{{/restricoes}}
</ul>
{{/tem_restricoes}}
</td></tr></tbody>
</table>

<p style="color:#050F41;font-size:24px;font-weight:700;letter-spacing:.5px;margin:0 0 15px;border-bottom:2px solid #FAB932;padding-bottom:5px">1. ORIENTAÇÕES PARA INTERPOSIÇÃO DE RECURSOS</p>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:0 0 30px 0">
<tbody><tr><td style="background:#fff5f5;border-left:4px solid #c62828;border-radius:4px;padding:20px 22px;font-size:15px;line-height:1.6;color:#050F41;text-align:justify">
Caso discorde do laudo, tem o direito de interpor recurso de 1ª instância à <strong>{{instancia_recurso}}</strong> mediante requerimento dirigido ao Titular do SDP (COM3ºDN), por intermédio do Titular de sua OM, <strong style="color:#c62828">em até {{prazo_recurso_dias}} dias</strong> a contar da data deste comunicado.
</td></tr></tbody>
</table>

<p style="color:#050F41;font-size:24px;font-weight:700;letter-spacing:.5px;margin:0 0 15px;border-bottom:2px solid #FAB932;padding-bottom:5px">2. SOLICITAÇÃO DE DOCUMENTOS MÉDICO-PERICIAIS</p>

<p style="margin:0 0 25px;text-align:justify;font-size:15px">Caso deseje obter o Termo de Inspeção de Saúde (TIS) referente a IS realizada, poderá ser feita <strong>solicitação ao Centro de Perícias Médicas da Marinha (CPMM)</strong> utilizando os botões de acesso direto abaixo:</p>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:0 0 25px 0">
<tbody><tr>
<td class="stack-column" align="center" width="33%" style="padding:5px"><a href="https://www.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/REQUERIMENTO.ods" style="display:inline-block;background:#050F41;color:#ffffff;border:2px solid #050F41;padding:12px 14px;border-radius:4px;font-size:14px;line-height:1.2;white-space:nowrap;font-weight:700;text-decoration:none">Baixar Requerimento</a></td>
<td class="stack-column" align="center" width="34%" style="padding:5px"><a href="https://www.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/orientacoes%20carta%20de%20servico%20cpmm.pdf" style="display:inline-block;background:#ffffff;color:#050F41;border:2px solid #050F41;padding:12px 14px;border-radius:4px;font-size:14px;line-height:1.2;white-space:nowrap;font-weight:700;text-decoration:none">Ver Orientações</a></td>
<td class="stack-column" align="center" width="33%" style="padding:5px"><a href="https://www.marinha.mil.br/cpmm/carta-usuario-cpmm" style="display:inline-block;background:#ffffff;color:#050F41;border:2px solid #050F41;padding:12px 14px;border-radius:4px;font-size:14px;line-height:1.2;white-space:nowrap;font-weight:700;text-decoration:none">Site Oficial do CPMM</a></td>
</tr></tbody>
</table>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:0 0 30px 0">
<tbody><tr><td style="background:#f4f6f9;border-left:4px solid #d0d5e0;border-radius:4px;padding:18px 22px;font-size:14px;line-height:1.8;color:#050F41">
📧 <strong>E-mail para envio do requerimento:</strong> <a href="mailto:cpmm.secom@marinha.mil.br" style="color:#050F41;font-weight:700">cpmm.secom@marinha.mil.br</a><br>
📞 <strong>Telefone de contato do CPMM: (21) 2126-5398</strong>
</td></tr></tbody>
</table>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-top:1px solid #e0e0e0">
<tbody><tr><td style="padding:25px 0 10px 0;color:#050F41">
<p style="margin:0 0 18px 0;font-size:16px;font-weight:700">Respeitosamente,</p>
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
