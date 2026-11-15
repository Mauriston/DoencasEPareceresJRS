// Ficheiro: servidor/email/templateAberturaIS.ts
// Template do e-mail "ABERTURA DE IS FIM {finalidade} - {inspecionado}" ao inspecionado (servidor/email/aberturaIS.ts),
// no padrão visual do e-mail ao NAC (banner, corpo branco, rodapé cinza; sem "INFORMAÇÃO PESSOAL"). HTML puro
// (tabelas e estilos inline, sem JavaScript) para o Zimbra. Textos das três variantes em utils/emailAberturaIS.ts.
// Placeholders: {{titulo}} {{vocativo}} {{abertura}} {{titulo_prazo}} {{prazo_texto}} {{arquivamento}}
// {{citacao_233e}} {{destaque}} {{fecho}}, assinatura dinâmica (servidor/email/comum.ts), {{banner_url}} {{logo_rodape_url}}.
import { ASSINATURA_DUPLA, MOLDURA_FIM, MOLDURA_INICIO } from './templateGuiasIS';

export const TEMPLATE_ABERTURA_IS = `${MOLDURA_INICIO}
<p style="margin:0 0 25px 0;font-size:17px;font-weight:700">{{vocativo}},</p>

<p style="margin:0 0 25px 0;text-align:justify">{{abertura}}</p>

<div style="background-color:#f4f6f9;border-left:4px solid #050F41;padding:20px;margin:0 0 25px 0;border-radius:4px">
<p style="margin:0 0 10px 0;font-size:17px;color:#050F41;font-weight:700;text-transform:uppercase">📅 {{titulo_prazo}}</p>
<p style="margin:0;text-align:justify;font-size:16px;color:#333333">{{prazo_texto}}</p>
</div>

<p style="margin:0 0 20px 0;text-align:justify;color:#333333">{{arquivamento}}</p>

<div style="border-left:3px solid #9aa1b5;padding-left:15px;margin:0 0 6px 0;font-style:italic;color:#444444;text-align:justify;line-height:1.6;font-size:15px">"{{citacao_233e}}"</div>
<p style="margin:0 0 30px 0;text-align:right;font-size:13px;color:#666666;font-weight:700">Alínea e do item 2.3.3 da DGPM-406 9ª Rev</p>

<div style="background-color:#fff5f5;border-left:4px solid #c62828;padding:20px;margin:0 0 30px 0;border-radius:4px">
<p style="margin:0 0 8px 0;font-size:17px;color:#c62828;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">⚠️ Atenção</p>
<p style="margin:0;font-size:16px;color:#333333;line-height:1.6;text-align:justify;font-weight:700">{{destaque}}</p>
</div>
${ASSINATURA_DUPLA}${MOLDURA_FIM}`;
