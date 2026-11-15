// Ficheiro: servidor/email/templateAgendamentoMoldura.ts
// Moldura comum dos e-mails ao inspecionado no padrão visual do NAC / Verificações e Términos
// (servidor/email/templateNac.ts e templateAgendamentoVerificacoes.ts): banner no topo, corpo branco, bloco de
// assinaturas ("Respeitosamente / Atenciosamente," + "Por ordem de:" com a 1ª assinatura dinâmica e o Presidente)
// e rodapé cinza com o logo da MB e os contatos. Sem a imagem "INFORMAÇÃO PESSOAL". HTML puro (tabelas e estilos
// inline, sem JavaScript) para o Zimbra. Usada pelos modelos de agendamento (geral e Benefícios) e de resultado de
// Benefícios. Placeholders: {{banner_url}} {{logo_rodape_url}} e os da assinatura (servidor/email/comum.ts).

/** Abre o documento até o início do corpo branco. `titulo` = <title> (texto fixo, sem placeholders). */
export const abrirEmailJrs = (titulo: string): string => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Carlito','Calibri',Arial,sans-serif">
<center style="width:100%;table-layout:fixed">
<div style="max-width:960px;margin:0 auto">
<table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width:960px;margin:auto;background-color:#ffffff;font-family:'Carlito','Calibri',Arial,sans-serif;width:100%">
<tbody>
<tr><td style="padding:0;text-align:center;background-color:#050f41;width:100%"><img src="{{banner_url}}" width="960" style="width:100%;max-width:960px;height:auto;display:block;border:0" alt="Cabeçalho Hospital Naval de Recife - Junta Regular de Saúde"></td></tr>
<tr><td style="background-color:#ffffff;padding:40px 50px 30px;text-align:left;font-family:'Carlito','Calibri',Arial,sans-serif;font-size:15px;line-height:1.6;color:#333333;width:100%">
`;

/** Assinaturas (1ª dinâmica + Presidente), rodapé cinza e fechamento do documento. */
export const FECHAR_EMAIL_JRS = `
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

/** Botões de acesso direto ao CPMM e caixa com e-mail e telefone (padrão do resultado de não enquadramento). */
export const BOTOES_CPMM = `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:25px;margin-bottom:25px">
<tbody><tr>
<td width="33%" align="left" valign="top"><table align="left" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td align="center" style="border-radius:8px" bgcolor="#050f41"><a href="https://www.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/REQUERIMENTO.ods" target="_blank" style="font-size:13px;font-family:'Carlito','Calibri',Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:8px;padding:10px 16px;border:1px solid #050f41;display:inline-block;font-weight:bold">Baixar Requerimento (ODS)</a></td></tr></tbody></table></td>
<td width="34%" align="center" valign="top"><table align="center" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td align="center" style="border-radius:8px" bgcolor="#050f41"><a href="https://www.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/orientacoes%20carta%20de%20servico%20cpmm.pdf" target="_blank" style="font-size:13px;font-family:'Carlito','Calibri',Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:8px;padding:10px 16px;border:1px solid #050f41;display:inline-block;font-weight:bold">Ver Orientações (PDF)</a></td></tr></tbody></table></td>
<td width="33%" align="right" valign="top"><table align="right" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td align="center" style="border-radius:8px" bgcolor="#050f41"><a href="https://www.marinha.mil.br/cpmm/carta-usuario-cpmm" target="_blank" style="font-size:13px;font-family:'Carlito','Calibri',Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:8px;padding:10px 16px;border:1px solid #050f41;display:inline-block;font-weight:bold">Site Oficial do CPMM</a></td></tr></tbody></table></td>
</tr></tbody>
</table>
<div style="background-color:#f4f6f9;padding:15px 20px;border-radius:4px;margin:25px 0 35px;border-left:4px solid #cccccc">
<p style="margin:0 0 8px;font-size:14px;color:#555555">📧 <strong>E-mail para envio do requerimento:</strong> <a href="mailto:cpmm.secom@marinha.mil.br" style="color:#050f41;text-decoration:none;font-weight:bold">cpmm.secom@marinha.mil.br</a></p>
<p style="margin:0;font-size:14px;color:#555555">📞 <strong>Telefone de contacto do CPMM:</strong> <strong style="color:#050f41">(21) 2126-5398</strong></p>
</div>`;

/** Título de seção numerada (h3 azul com filete). */
export const h3 = (texto: string): string =>
  `<h3 style="color:#050f41;font-size:18px;margin:35px 0 15px;border-bottom:2px solid #050f41;padding-bottom:5px;text-transform:uppercase">${texto}</h3>`;
