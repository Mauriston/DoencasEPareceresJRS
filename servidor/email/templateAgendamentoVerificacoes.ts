// Ficheiro: servidor/email/templateAgendamentoVerificacoes.ts
// E-mail "AGENDAMENTO DE INSPEÇÃO DE SAÚDE" do grupo **Verificações e Términos** (VDF, Término de Incapacidade e
// de Restrições: orientações, RDM, laudos possíveis e recurso). Template enviado pelo Presidente da JRS (Zimbra),
// limpo e em HTML puro, sem JavaScript. Placeholders (servidor/email/agendamentoIS.ts): {{inspecionado}}
// {{finalidade_is}} {{data}} {{hora}} {{banner_url}} {{logo_rodape_url}} e a assinatura dinâmica
// ({{#mostrar_signatario}}…, servidor/email/comum.ts).
export const TEMPLATE_AGENDAMENTO_VERIFICACOES = `<!DOCTYPE html>
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
<tr><td style="background-color:#ffffff;padding:40px 50px 30px;text-align:left;font-family:'Carlito','Calibri',Arial,sans-serif;font-size:15px;line-height:1.6;color:#333333;width:100%">

<p style="margin:0 0 20px;font-size:18px;color:#333333"><strong>Prezado(a) Senhor(a),</strong></p>

<div style="background-color:#f4f6f9;border-left:4px solid #050f41;padding:20px;margin-bottom:30px;border-radius:4px">
<p style="margin:0 0 10px;font-size:18px;color:#050f41;font-weight:bold;text-transform:uppercase">📅 Confirmação de Agendamento de Inspeção de Saúde</p>
<ul style="margin:0;padding-left:20px;list-style-type:disc;line-height:1.6;font-size:17px">
<li style="margin-bottom:6px">Inspecionado: <span style="color:#050f41;font-weight:bold">{{inspecionado}}</span></li>
<li style="margin-bottom:6px"><span style="color:#050f41">Finalidade IS:</span> <span style="color:#050f41;font-weight:bold">{{finalidade_is}}</span></li>
<li style="margin-bottom:6px">Data: <span style="padding:2px 5px;font-weight:bold;color:#050f41">{{data}}</span></li>
<li style="margin-bottom:0">Hora: <strong style="color:#050f41">{{hora}}</strong></li>
</ul>
</div>

<div style="background-color:#f1f8e9;border-left:4px solid #2e7d32;padding:20px;margin-bottom:35px;border-radius:4px">
<p style="margin:0;text-align:justify;color:#2e7d32;font-weight:bold;font-size:17px;line-height:1.6">💡 A IS com Finalidade de <span style="color:#050f41">Verificação de Deficiência Funcional é perícia inicial,</span> eminentemente clínico-funcional, que visa esclarecer qual o grau de comprometimento de uma enfermidade qualquer sobre a capacidade laborativa do Militar da Ativa. Já a perícia que segue a um período de LTSP tem a finalidade de <span style="color:#050f41">Término de Incapacidade</span>, enquanto a perícia que segue um período de Restrições, <span style="color:#050f41">Término de Restrições.</span></p>
</div>

<h3 style="color:#050f41;font-size:18px;margin:35px 0 15px;border-bottom:2px solid #050f41;padding-bottom:5px;text-transform:uppercase">1. Orientações para o Dia da Inspeção de Saúde</h3>
<p style="margin:0 0 15px;font-weight:bold;color:#2e7d32;font-size:17px">Recomendamos ler atentamente todas as orientações para otimizar o trâmite pericial:</p>
<ul style="margin:0 0 30px;padding-left:20px;line-height:1.7;color:#333333;font-size:16px">
<li style="margin-bottom:8px;text-align:justify">Trazer documento de identidade original, além de todos os relatórios, atestados e exames que serão descritos posteriormente;</li>
<li style="margin-bottom:8px;text-align:justify">Traga o seu PMI ou Guia Sanitária além do seu Cartão de Vacinas;</li>
<li style="margin-bottom:8px;text-align:justify">Militares da ativa deverão estar obrigatoriamente fardados;</li>
<li style="margin-bottom:8px;text-align:justify">O atendimento é feito por ordem de chegada respeitando as prioridades previstas em lei; e</li>
<li style="margin-bottom:0;text-align:justify"><strong>Impossibilidade de presença:</strong> informar formalmente à secretaria com uma antecedência mínima de cinco dias úteis para o devido reagendamento.</li>
</ul>

<div style="background-color:#fff5f5;border-left:4px solid #c62828;padding:20px;margin:25px 0 35px;border-radius:4px">
<p style="margin:0 0 8px;font-size:17px;color:#c62828;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px">⚠️ Não comparecimento às IS agendadas x RDM</p>
<p style="margin:0 0 10px;font-size:14px;color:#666666;font-style:italic;text-align:left">Alínea <span style="text-decoration:underline">e</span> do item 2.3.3. da DGPM-406 9ª REV MOD 3:</p>
<div style="border-left:3px solid #ef9a9a;padding-left:15px;margin:10px 0 0;font-style:italic;color:#444444;text-align:justify;line-height:1.6;font-size:16px">"os inspecionados são responsáveis ainda pelo agendamento e comparecimento às JS na data marcada para realização de sua IS, podendo a inobservância de tal orientação ser caracterizada como <strong style="color:#c62828">contravenção disciplinar</strong>"</div>
</div>

<h3 style="color:#050f41;font-size:18px;margin:35px 0 15px;border-bottom:2px solid #050f41;padding-bottom:5px;text-transform:uppercase">2. Sobre as Finalidades VDF e Términos</h3>
<p style="margin:0 0 15px;text-align:justify;font-size:16px">Nessas IS de finalidades VDF ou Términos não existe lista de exames mínimos obrigatórios, eles dependem do seu problema de saúde atual:</p>
<ul style="margin:0 0 30px;padding-left:20px;line-height:1.7;color:#333333;font-size:16px">
<li style="margin-bottom:12px;text-align:justify"><strong>Traga todos os relatórios médicos, atestados e exames relacionados à sua condição atual:</strong>
<ul style="margin:8px 0 0;padding-left:20px;line-height:1.6;list-style-type:disc">
<li style="margin-bottom:8px;text-align:justify">Os pareceres especializados solicitados pelos médicos peritos, bem como <span style="color:#050f41;font-weight:bold">os relatórios e atestados prévios que você traga, sempre são considerados, <span style="color:#c62828">porém não obrigatoriamente acatados,</span> sobretudo em relação ao tempo de LTS / Restrições.</span> Isso independe das especialidades dos Médicos Peritos e da especialidade do seu Médico Assistente.</li>
<li style="margin-bottom:0;text-align:justify">Atestados e relatórios do seu médico assistente, bem como pareceres especializados solicitados, são opiniões puramente assistenciais. Os Médicos Peritos desta JRS têm a devida capacitação técnica pericial para avaliar a sua capacidade laboral além da competência legal e normativa para determinar afastamentos e/ou restrições, a partir da devida nomeação pela Administração Naval.</li>
</ul>
</li>
</ul>

<div style="background-color:#fffde7;border-left:4px solid #fab932;padding:20px;margin:25px 0 30px;border-radius:4px">
<p style="text-align:justify;margin:0 0 10px;line-height:1.6;font-style:italic;color:#333333;font-weight:bold;font-size:17px">"Os pareceres constituem opiniões do ponto de vista assistencial, <span style="color:#c62828">que podem ou não ser acatados pelos solicitantes,</span> sempre de forma justificada. Ao serem exarados, deverão ser assinados e expedidos aos solicitantes, no prazo máximo de sete dias úteis."</p>
<p style="margin:0;line-height:1.4;text-align:right;font-size:13px;color:#666666;font-weight:bold">Alínea b do item 2.3.31. da DGPM-406 9ª REV MOD 3</p>
</div>

<ul style="margin:0 0 30px;padding-left:20px;line-height:1.7;color:#333333;font-size:16px">
<li style="margin-bottom:12px;text-align:justify"><strong>Caso julguem necessário, os Médicos Peritos poderão solicitar exames complementares e pareceres especializados adicionais:</strong>
<ul style="margin:8px 0 0;padding-left:20px;line-height:1.6;list-style-type:disc">
<li style="margin-bottom:8px;text-align:justify"><span style="color:#050f41;font-weight:bold">Uma vez realizada a entrevista, a JRS tem o prazo de 20 dias para concluir a IS</span> e informar o resultado por mensagem para a sua OM, SDP e Órgão de Pessoal.</li>
<li style="margin-bottom:8px;text-align:justify">Nesse cenário, receberá uma Papeleta de Dispensa (Modelo DS-7) que poderá fornecer até 20 dias de dispensa domiciliar enquanto os exames e pareceres são prontificados.</li>
<li style="margin-bottom:0;text-align:justify">Caso os exames e pareceres solicitados não sejam providenciados nesse período, ao término dos 20 dias, a JRS concluirá a sua IS a partir das informações que obteve no momento da entrevista, mesmo que você não retorne presencialmente à JRS.</li>
</ul>
</li>
<li style="margin-bottom:0;text-align:justify"><strong style="color:#050f41">Caso você tenha um Atestado de Origem (AO) em aberto, as 3 vias devem estar anexadas na sua CR. Solicite uma cópia fiel do seu AO à Divisão de Pessoal e a deixe anexada no seu PMI.</strong> Sempre que vier às IS VDF ou de Términos, você deverá apresentar essa cópia para que a JRS faça a avaliação se já é o momento de fechar o AO.</li>
</ul>

<h3 style="color:#050f41;font-size:18px;margin:35px 0 15px;border-bottom:2px solid #050f41;padding-bottom:5px;text-transform:uppercase">3. Conclusões, Laudos e Recursos</h3>
<p style="margin:0 0 15px;text-align:justify;font-size:17px"><strong style="color:#000080">Na conclusão da IS VDF ou IS Término de Incapacidade</strong>, a JRS pode exarar os seguintes laudos:</p>
<ul style="margin:0 0 25px;padding-left:20px;line-height:1.7;color:#333333;font-size:15px">
<li style="margin-bottom:8px;text-align:justify"><span style="color:#050f41;font-weight:bold">"APTO PARA O SAM":</span> O militar se encontra em condições de higidez psicofísica suficientes para exercer as suas atividades;</li>
<li style="margin-bottom:8px;text-align:justify"><span style="color:#050f41;font-weight:bold">"APTO PARA O SAM COM RESTRIÇÕES":</span> O militar apresenta grau de deficiência funcional que implica no afastamento de algumas atividades laborativas ou operativas;</li>
<li style="margin-bottom:8px;text-align:justify"><span style="color:#050f41;font-weight:bold">"INCAPAZ TEMPORARIAMENTE PARA O SAM":</span> O militar necessita de afastamento total das suas atividades por apresentar doença considerada curável ou clinicamente controlável. O SDP publica portaria concedendo a Licença para Tratamento de Saúde Própria (LTSP);</li>
<li style="margin-bottom:8px;text-align:justify"><span style="color:#050f41;font-weight:bold">"CONTINUA INCAPAZ TEMPORARIAMENTE PARA O SAM":</span> Ocorre quando o Militar de Carreira cruza os 36 meses de LTSP sem apresentar critérios para Incapacidade Definitiva, ou seja, por uma doença que ainda pode ser curável ou controlada; e</li>
<li style="margin-bottom:0;text-align:justify"><span style="color:#050f41;font-weight:bold">"INCAPACIDADE DEFINITIVA PARA O SAM":</span> O militar apresenta uma doença irreversível que o impossibilita de exercer suas atividades, considerando idade, posto/graduação e atividades da rotina; é constatada a invalidez ou perspectiva de êxito legal em curto prazo.</li>
</ul>
<p style="margin:25px 0 15px;text-align:justify;font-size:16px"><strong style="color:#000080">Na conclusão da IS de Término de Restrições</strong>, a JRS pode exarar os seguintes laudos:</p>
<ul style="margin:0 0 25px;padding-left:20px;line-height:1.7;color:#333333">
<li style="margin-bottom:8px;text-align:justify"><span style="color:#050f41;font-weight:bold">"APTO PARA O SAM":</span> O militar se encontra em condições de higidez psicofísica suficientes para exercer as suas atividades; e</li>
<li style="margin-bottom:0;text-align:justify"><span style="color:#050f41;font-weight:bold">"APTO PARA O SAM COM RESTRIÇÕES":</span> O militar apresenta grau de deficiência funcional que implica no afastamento de algumas atividades laborativas ou operativas.</li>
</ul>
<ul style="margin:25px 0 30px;padding-left:20px;line-height:1.7;color:#333333">
<li style="margin-bottom:8px;text-align:justify"><strong style="color:#000080">Nas IS Término de Restrições, se houver necessidade de LTSP ou de incluir novas restrições, é necessária uma "IS FIM Fato Novo"</strong>;</li>
<li style="margin-bottom:8px;text-align:justify">Imediatamente após a conclusão da IS, o Sargenteante Geral da sua OM terá acesso ao Laudo da IS no que diz respeito à aptidão laboral e períodos de LTS / restrições. Informações protegidas por sigilo médico, como Diagnóstico e CID, não serão compartilhadas nos termos da LGPD. Além disso, em até 10 dias a sua OM receberá uma mensagem informando estes resultados; e</li>
<li style="margin-bottom:0;text-align:justify">Caso a JRS exare laudo de Incapacidade Temporária (LTSP) ou Incapacidade Parcial (Apto com restrições), a Divisão de Pessoal da sua OM deverá apresentá-lo para nova IS faltando até 10 dias para o término do período concedido:
<ul style="margin:8px 0 0;padding-left:20px;line-height:1.6;list-style-type:circle">
<li style="margin-bottom:6px;text-align:justify"><strong style="color:#c62828">O militar é responsável por comparecer à Secretaria da JRS ou agendar a IS em até 7 dias úteis a contar da data de apresentação pela Divisão de Pessoal.</strong></li>
<li style="margin-bottom:0;text-align:justify">Cabe ao Titular da OM, por intermédio dos Encarregados de Pessoal, o controle dos prazos e o atendimento das restrições exaradas pela JS, sem prejuízo da responsabilidade individual do militar no cumprimento dos prazos, agendamentos e comparecimento às IS agendadas.</li>
</ul>
</li>
</ul>

<div style="background-color:#fff5f5;border-left:4px solid #c62828;padding:20px;margin:25px 0 35px;border-radius:4px">
<p style="margin:0;font-size:17px;color:#333333;line-height:1.6;text-align:justify;font-weight:bold">Caso o requerente discorde do laudo, tem o direito de interpor recurso de 1ª instância à Junta Superior Distrital (JSD/COM3ºDN) através de requerimento junto ao SDP via Titular da sua OM <span style="color:#993300">em até 45 dias</span> a contar da data da conclusão da IS.</p>
</div>

<h3 style="color:#050f41;font-size:18px;margin:35px 0 15px;border-bottom:2px solid #050f41;padding-bottom:5px;text-transform:uppercase">4. Solicitação de Documentos Médico-Periciais</h3>
<p style="margin:0 0 25px;text-align:justify;font-size:16px"><strong>Uma cópia do Termo de Inspeção de Saúde poderá ser solicitada ao Centro de Perícias Médicas da Marinha (CPMM). Para facilitar e agilizar o trâmite, utilize os botões de acesso direto abaixo:</strong></p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:25px;margin-bottom:25px">
<tbody><tr>
<td width="33%" align="left" valign="top"><table align="left" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td align="center" style="border-radius:8px" bgcolor="#050f41"><a href="https://www.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/REQUERIMENTO.ods" target="_blank" style="font-size:13px;font-family:'Carlito','Calibri',Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:8px;padding:10px 16px;border:1px solid #050f41;display:inline-block;font-weight:bold">Baixar Requerimento (ODS)</a></td></tr></tbody></table></td>
<td width="34%" align="center" valign="top"><table align="center" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td align="center" style="border-radius:8px" bgcolor="#050f41"><a href="https://www.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/orientacoes%20carta%20de%20servico%20cpmm.pdf" target="_blank" style="font-size:13px;font-family:'Carlito','Calibri',Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:8px;padding:10px 16px;border:1px solid #050f41;display:inline-block;font-weight:bold">Ver Orientações (PDF)</a></td></tr></tbody></table></td>
<td width="33%" align="right" valign="top"><table align="right" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td align="center" style="border-radius:8px" bgcolor="#050f41"><a href="https://www.marinha.mil.br/cpmm/carta-usuario-cpmm" target="_blank" style="font-size:13px;font-family:'Carlito','Calibri',Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:8px;padding:10px 16px;border:1px solid #050f41;display:inline-block;font-weight:bold">Site Oficial do CPMM</a></td></tr></tbody></table></td>
</tr></tbody>
</table>
<div style="background-color:#f4f6f9;padding:15px 20px;border-radius:4px;margin:25px 0 35px;border-left:4px solid #cccccc">
<p style="margin:0 0 8px;font-size:14px;color:#555555">📧 <strong>E-mail para envio do requerimento:</strong> <a href="mailto:cpmm.secom@marinha.mil.br" style="color:#050f41;text-decoration:none;font-weight:bold">cpmm.secom@marinha.mil.br</a></p>
<p style="margin:0;font-size:14px;color:#555555">📞 <strong>Telefone de contato do CPMM:</strong> <strong style="color:#050f41">(21) 2126-5398</strong></p>
</div>

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
