// Ficheiro: utils/mensagensIS.ts
// Regras puras do "Minutar MSG" da IS concluída (Ficha do inspecionado › Inspeções de Saúde) e da aba Mensagens:
//  - a minuta reaproveita a de resultado da página Inspeções de Saúde (utils/minutasIS.ts → camposResultadoDaIS),
//    com o remetente "HNRe" quando o modelo não traz DE;
//  - PARA/INFO "[preencher…]" (a tabela do Anexo M não decidiu sozinha) pedem a sugestão da IA (services/destinatariosIA.ts);
//  - a mensagem registrada (coleção mensagensIS; services/mensagensIS.ts) guarda os campos em texto, só leitura.
// Testadas em utils/__tests__/mensagensIS.test.ts.
import { camposResultadoDaIS, type ISParaMinuta, type MinutaCampos } from './minutasIS';

/** Remetente padrão das mensagens de resultado da JRS. */
export const REMETENTE_MSG_IS = 'HNRe';

/** Campos da minuta (DE, PARA, INFO, ASSUNTO, TEXTO), todos como texto. */
export interface CamposMsgIS { de: string; para: string; info: string; assunto: string; texto: string }

/** Minuta de resultado da IS em campos, com DE preenchido. */
export const camposMinutaMsgIS = (is: ISParaMinuta, extras: { om?: string; feminino?: boolean; vinculo?: string } = {}): CamposMsgIS =>
  normalizarCampos(camposResultadoDaIS(is, extras));

export const normalizarCampos = (c: MinutaCampos): CamposMsgIS => ({
  de: (c.de ?? '').trim() || REMETENTE_MSG_IS, para: c.para ?? '', info: c.info ?? '', assunto: c.assunto ?? '', texto: c.texto ?? '',
});

/** PARA ou INFO ainda com "[preencher…]": vale pedir a sugestão da IA. */
export const faltaDestinatario = (c: Pick<CamposMsgIS, 'para' | 'info'>): boolean => /\[preencher\b/i.test(`${c.para} ${c.info}`);

/** Linhas "rótulo: valor" da minuta em texto corrido (modal só leitura); INFO vazio sai. */
export const linhasMinuta = (c: CamposMsgIS): { rotulo: string; valor: string }[] => [
  { rotulo: 'DE', valor: c.de },
  { rotulo: 'PARA', valor: c.para },
  ...(c.info.trim() ? [{ rotulo: 'INFO', valor: c.info }] : []),
  { rotulo: 'ASSUNTO', valor: c.assunto },
  { rotulo: 'TEXTO', valor: c.texto },
];

/** "Minutar MSG": só com a IS concluída (TIS assinado). */
export const podeMinutarMsg = (is: { status?: string }): boolean => is.status === 'tis_assinado';
