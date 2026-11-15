// Ficheiro: servidor/email/templateAgendamentoBeneficios.ts
// E-mail de AGENDAMENTO (e de reagendamento) de IS do grupo **Benefícios** (tipo 'agendamentoBeneficios'). Corpo do
// template enviado pelo Presidente da JRS (.especificacao/templates/agendamento-beneficios.html: documentação geral,
// documentos por doença prevista em lei — Anexo V da DGPM-406 — e orientações para o dia da IS), limpo do HTML do
// Zimbra e no padrão visual do NAC / Verificações (servidor/email/templateAgendamentoMoldura.ts). O texto depois do
// bloco de identificação NÃO muda; a assinatura fixa do Supervisor deu lugar à dinâmica. HTML puro, sem JavaScript.
// Placeholders (servidor/email/agendamentoIS.ts): {{inspecionado}} {{finalidade_is}} {{data}} {{hora}}
// {{acao_titulo}} ("Agendamento" / "Reagendamento") {{banner_url}} {{logo_rodape_url}} e a assinatura dinâmica.
import { abrirEmailJrs, FECHAR_EMAIL_JRS, h3 } from './templateAgendamentoMoldura';

const LI = 'margin-bottom:10px;text-align:justify';
const TD = 'border:1px solid #dddddd';
const UL_TAB = 'margin:0;padding-left:18px;line-height:1.4';

/** Uma linha da tabela "Doença Prevista em Lei" × documentação. */
const doenca = (i: number, nome: string, itens: string[]): string => `<tr style="background-color:${i % 2 ? '#f9f9f9' : '#ffffff'}">
<td valign="top" style="${TD}"><strong>${nome}</strong></td>
<td style="${TD};text-align:justify">
<ul style="${UL_TAB}">
${itens.map((t, j) => `<li style="margin-bottom:${j === itens.length - 1 ? '0' : '4px'}">${t}</li>`).join('\n')}
</ul>
</td>
</tr>`;

const DOENCAS: [string, string[]][] = [
  ['Alienação Mental', [
    'Relatório médico detalhado <strong>(Psiquiatra, Neurologista ou Geriatra)</strong> constando diagnóstico, data do diagnóstico, CID X e data do início do acompanhamento;',
    'Exame clínico (mental) do início do acompanhamento e sua respetiva evolução;',
    'Tratamento realizado e respostas terapêuticas obtidas;',
    '<strong>Nos casos de Demência:</strong> inclusão da Classificação pela Escala de Avaliação Clínica de Demência (CDR) inicial e evolutiva; e',
    'Apresentação obrigatória de laudos de exame de imagem do Sistema Nervoso Central (Tomografia Computadorizada ou Ressonância Magnética).',
  ]],
  ['Cardiopatia Grave', [
    'Ecocardiograma, cintilografia e teste ergométrico (todos os exames realizados há menos de 6 meses);',
    'Relatório médico detalhado com diagnóstico, CID X, data em que foi estabelecido formalmente o diagnóstico e tratamentos realizados.',
  ]],
  ['Cegueira', [
    'Exame completo de acuidade visual com e sem correção em ambos os olhos;',
    'Relatório médico descritivo com indicação do CID X e data do diagnóstico de cegueira ou de visão monocular.',
  ]],
  ['Espondilite Anquilosante', [
    'Relatório médico detalhado com indicação do CID X e data precisa do diagnóstico;',
    'Exames de suporte complementares realizados acompanhados dos laudos de imagem;',
    'Resultado laboratorial do marcador genético HLA-B27.',
  ]],
  ['Mal de Paget<br><span style="font-size:12px;color:#666666;font-weight:normal">(Estados Avançados)</span>', [
    'Exames complementares de Radiografia, dosagem de fosfatase alcalina, hidroxiprolina urinária e tomografia;',
    'Exame de Ressonância magnética (caso haja indicação clínica específica);',
    'Realização de biópsia óssea (para casos suspeitos) e cintilografia óssea;',
    'Relatório médico assistente constando o código CID e a data definitiva do diagnóstico.',
  ]],
  ['Hanseníase', [
    'Relatório médico descritivo contendo o diagnóstico, código CID X e data do diagnóstico;',
    'Detalhamento sobre a persistência de sinais de atividade mesmo após o término do tratamento;',
    'Histórico ou evidência de episódios de recidiva da doença;',
    'Ocorrência de surtos reacionais frequentes;',
    'Existência de sequelas crónicas com expressiva e comprovada repercussão funcional.',
  ]],
  ['Doença de Parkinson', [
    'Relatório médico estruturado contendo o código CID X e a respetiva data do diagnóstico;',
    'Exame clínico neurológico detalhado realizado recentemente;',
    'Especificação completa e atualizada do esquema de tratamento em curso.',
  ]],
  ['Nefropatia Grave', [
    'Relatório médico clínico com diagnóstico e indicação expressa do código CID X;',
    'Data precisa do início do tratamento dialítico (se aplicável);',
    'Medida laboratorial recente da filtração glomerular e níveis séricos de creatinina;',
    'Informação documental comprovando a data em que a filtração decresceu para valores abaixo de 30 ml/min e a creatinina superou 6,1 mg/dL.',
  ]],
  ['Neoplasia Maligna<br><span style="font-size:12px;color:#666666;font-weight:normal">(Câncer)</span>', [
    '<strong>Laudo Histopatológico/Anatomopatológico oficial (biópsia) ou estudo Imunohistoquímico indispensável;</strong>',
    'Relatório do médico assistente com CID X detalhando o estadiamento clínico (TNM), localização tumoral primária, tratamentos realizados e a resposta clínica obtida.',
  ]],
  ['Paralisia Irreversível e Incapacitante', [
    'Relatório médico especializado <strong>(Neurologista, Neurocirurgião ou Geriatra)</strong> com diagnóstico e CID X;',
    'Descrição detalhada das lesões motoras identificadas e data de estabelecimento do diagnóstico;',
    'Descrição detalhada de atos cirúrgicos prévios (se aplicável ao caso);',
    'Laudos de exames complementares de imagem ou funcionais realizados (eletroneuromiografia e ressonância magnética).',
  ]],
  ['Pênfigo', [
    'Exame histológico de suporte (Citodiagnóstico de Tzanck) e exame de imunofluorescência direta;',
    'Relatório médico clínico com diagnóstico assertivo e código CID X;',
    'Data precisa de início do diagnóstico;',
    'Descrição exaustiva dos tratamentos ministrados e do quadro clínico dermatológico apresentado atualmente.',
  ]],
  ['SIDA / AIDS', [
    'Apresentação obrigatória de exame laboratorial de contagem com resultado de CD4 &lt; 200 células/mm³;',
    'Relatório assinado pelo médico infeciologista contendo o diagnóstico, CID X e descrição minuciosa do exame clínico atual.',
  ]],
  ['Tuberculose Ativa', [
    'Relatório médico detalhado contendo o diagnóstico e o respetivo código CID X;',
    'Data inicial identificada do diagnóstico;',
    'Detalhes do esquema terapêutico realizado, indicação da data de término (programada ou já efetivada) e descrição clínica atualizada.',
  ]],
  ['Hepatopatia Grave', [
    'Relatório emitido por médico gastroenterologista ou hepatologista com diagnóstico e CID X;',
    'Data do diagnóstico e a terapêutica medicamentosa em execução;',
    'Classificação do score de gravidade prognóstica de Child-Turcotte-Pugh;',
    'Informação clara e expressa sobre a presença ativa de quadros de ascite ou de encefalopatia hepática recorrente.',
  ]],
  ['Esclerose Múltipla', [
    'Relatório médico de especialidade neurológica com diagnóstico fechado e CID X;',
    'Data inicial do diagnóstico acompanhada de descrição clínica do padrão de surtos;',
    'Apresentação dos laudos e imagens de exames de Ressonância Magnética (cerebral e/ou medular).',
  ]],
  ['Fibrose Cística', [
    'Relatório médico de suporte associado a dois testes do suor com resultados positivos (&gt;60 mEq/l) obtidos em momentos cronológicos distintos;',
    'Se estiverem disponíveis na rotina: radiografia de campos pleuro-pulmonares, cultura de escarro (evidenciando <i>Pseudomonas aeruginosa</i>), ultrassonografia do abdómen total, dosagens de enzimas hepáticas e pancreáticas.',
  ]],
];

export const TEMPLATE_AGENDAMENTO_BENEFICIOS = `${abrirEmailJrs('Agendamento de Inspeção de Saúde (Benefícios) - JRS/HNRe')}
<p style="margin:0 0 20px;font-size:18px;color:#333333"><strong>Prezado(a) Senhor(a),</strong></p>

<div style="background-color:#f4f6f9;border-left:4px solid #050f41;padding:20px;margin-bottom:30px;border-radius:4px">
<p style="margin:0 0 10px;font-size:18px;color:#050f41;font-weight:bold;text-transform:uppercase">📅 Confirmação de {{acao_titulo}} de Inspeção de Saúde</p>
<ul style="margin:0;padding-left:20px;list-style-type:disc;line-height:1.6;font-size:17px">
<li style="margin-bottom:6px">Inspecionado: Sr(a). <span style="color:#050f41;font-weight:bold">{{inspecionado}}</span></li>
<li style="margin-bottom:6px"><span style="color:#050f41">Finalidade IS:</span> <span style="color:#050f41;font-weight:bold">{{finalidade_is}}</span></li>
<li style="margin-bottom:6px">Data: <span style="padding:2px 5px;font-weight:bold;color:#050f41">{{data}}</span></li>
<li style="margin-bottom:0">Hora: <strong style="color:#050f41">{{hora}}h</strong></li>
</ul>
</div>

${h3('1. Orientações Gerais sobre a Documentação')}
<p style="margin:0 0 15px;font-size:16px">Para a realização da Inspeção de Saúde (IS), os periciados deverão apresentar obrigatoriamente no dia agendado:</p>
<ul style="margin:0 0 20px;padding-left:20px;line-height:1.6;font-size:16px">
<li style="${LI}"><strong>Laudo ou Relatório Médico atualizado:</strong> deve conter explicitamente a data, nome completo do profissional, número do CRM, carimbo perfeitamente legível, assinatura e o código CID correspondente com a respetiva data do diagnóstico, além dos exames complementares realizados de acordo com a doença.</li>
<li style="${LI}"><strong>Formatos aceitos:</strong>
<ul style="margin:8px 0 0;padding-left:20px;line-height:1.6">
<li style="${LI}"><strong>DIGITAIS (Preferenciais)</strong>: Laudos/relatórios médicos digitais com assinatura eletrónica ou digital certificada</li>
<li style="${LI}"><strong>MANUSCRITOS</strong>: Laudos/relatórios médicos manuscritos são aceitos, porém a grafia do médico emitente deve ser clara e legível de modo a permitir a compreensão das informações.</li>
</ul>
</li>
</ul>

<p style="margin:25px 0 15px;color:#d9381e;font-weight:bold;font-size:16px">⚠️ ATENÇÃO AO ENCERRAMENTO DA IS POR INSUFICIÊNCIA DOCUMENTAL:</p>
<div style="margin:0 0 25px;background-color:#fff5f5;border:1px solid #f8d7da;padding:15px;color:#333333;border-radius:4px;text-align:justify;font-size:16px">
<p style="margin:0 0 15px">A apresentação completa e adequada dos documentos solicitados é essencial para a correta avaliação pericial. <strong>A não apresentação ou a entrega incompleta dos documentos poderá comprometer a realização da perícia ou ensejar a conclusão imediata da inspeção por INSUFICIÊNCIA DOCUMENTAL.</strong></p>
<p style="margin:0">Neste cenário, quando estiver de posse da documentação médica necessária, o Inspecionado ou seu representante legal deverá reiniciar a solicitação da Inspeção de Saúde para Benefício junto à OM responsável (CPPE, CPPB, CPAL, SVPM, CPesFN...).</p>
</div>

${h3('2. Documentos Médicos Específicos por Doença (Previstas em Lei)')}
<p style="margin:0 0 15px;font-size:15px;color:#555555">Lista de documentos médicos mínimos exigidos prevista no <strong><a href="https://assets.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/doencas_graves_0.pdf" target="_blank" style="color:#050f41">Anexo V</a></strong> da DGPM-406 9ª Rev MOD 3</p>
<table border="0" cellpadding="12" cellspacing="0" width="100%" style="width:100%;border:1px solid #dddddd;font-size:14px;line-height:1.5;border-collapse:collapse;margin-bottom:35px;color:#333333">
<thead>
<tr style="background-color:#050f41;color:#ffffff">
<th width="30%" align="left" style="${TD};font-weight:bold">Doença Prevista em Lei</th>
<th width="70%" align="left" style="${TD};font-weight:bold">Documentação médica e Exames Complementares Obrigatórios</th>
</tr>
</thead>
<tbody>
${DOENCAS.map(([nome, itens], i) => doenca(i, nome, itens)).join('\n')}
</tbody>
</table>

${h3('3. Orientações para o Dia da inspeção de saúde')}
<p style="margin:0 0 15px;color:#2e7d32;font-weight:bold;font-size:17px">💡 Recomendamos ler atentamente todas as orientações para otimizar o trâmite pericial:</p>
<ul style="margin:0 0 30px;padding-left:20px;line-height:1.7;color:#333333;font-size:16px">
<li style="margin-bottom:8px"><span style="color:#2e7d32;font-weight:bold">Comparecer com 30 minutos de antecedência;</span></li>
<li style="margin-bottom:8px">Trazer documento de identidade original, além de todos os laudos/relatórios/exames descritos na secção anterior;</li>
<li style="margin-bottom:8px">Não é necessário autenticar as cópias dos laudos dos exames em cartório;</li>
<li style="margin-bottom:8px">Todos os documentos originais apresentados para conferência serão integralmente devolvidos ao fim da inspeção;</li>
<li style="margin-bottom:8px">Caso o periciado seja curatelado, é obrigatório trazer também o termo ou documento de curatela;</li>
<li style="margin-bottom:8px"><strong>Impossibilidade de presença:</strong> informar formalmente à secretaria com uma antecedência mínima de cinco dias úteis para o devido reagendamento;</li>
<li style="margin-bottom:8px"><strong>Localização:</strong> A Inspeção de Saúde ocorrerá na <strong>Junta Regular de Saúde do Hospital Naval de Recife</strong> (JRS/HNRe)</li>
<li style="margin-bottom:8px"><strong>Endereço:</strong> Avenida Cruz Cabugá 1200, Santo Amaro, Recife-PE. CEP:50040-000 ; <strong><a href="https://maps.app.goo.gl/PL26ws4934FDGdUz6" target="_blank" style="color:#050f41">Como chegar?</a></strong></li>
<li style="margin-bottom:0"><strong>Estacionamento: </strong>Há estacionamento disponível para os Inspecionados e acompanhantes com acesso direto à Junta Regular (Estacionamento do Ambulatório).</li>
</ul>
${FECHAR_EMAIL_JRS}`;
