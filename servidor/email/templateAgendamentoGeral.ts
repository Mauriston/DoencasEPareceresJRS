// Ficheiro: servidor/email/templateAgendamentoGeral.ts
// E-mail de AGENDAMENTO (e de reagendamento) de IS das finalidades que não são de Verificações e Términos nem de
// Benefícios (tipo 'agendamentoGeral'). Corpo simples, no padrão visual do NAC / Verificações
// (servidor/email/templateAgendamentoMoldura.ts): vocativo, uma frase com a finalidade, a data e a hora, saudação e
// assinaturas ("Por ordem de:" — 1ª dinâmica, Presidente). HTML puro, sem JavaScript (Zimbra).
// Placeholders (servidor/email/agendamentoIS.ts): {{vocativo}} {{inspecionado}} {{finalidade_is}} {{acao}}
// ("agendada" / "reagendada") {{data}} {{hora}} {{banner_url}} {{logo_rodape_url}} e a assinatura dinâmica.
import { abrirEmailJrs, FECHAR_EMAIL_JRS } from './templateAgendamentoMoldura';

export const TEMPLATE_AGENDAMENTO_GERAL = `${abrirEmailJrs('Agendamento de Inspeção de Saúde - JRS/HNRe')}
<p style="margin:0 0 20px;font-size:18px;color:#333333"><strong>{{vocativo}} {{inspecionado}},</strong></p>

<p style="margin:0 0 30px;font-size:17px;line-height:1.6;color:#333333;text-align:justify">Informo que a IS fim <strong style="color:#050f41">{{finalidade_is}}</strong> foi {{acao}} para <strong style="color:#050f41">{{data}}</strong> às <strong style="color:#050f41">{{hora}}</strong>, na JRS/HNRe.</p>
${FECHAR_EMAIL_JRS}`;
