// Ficheiro: servidor/documentos/is/declaracaoComparecimento.ts
// Declaração de Comparecimento da IS: modelo das guias de exames (paginaModeloGuias, em solicitacaoExames.ts) com o
// título "DECLARAÇÃO DE COMPARECIMENTO" e o texto da declaração no lugar dos exames. Assina quem gerou (rubrica se Admin).
// Formulário: data (AAAA-MM-DD), horaChegada e horaSaida (hh:mm).
// Ajustes (config/documentosIS → declaracaoComparecimento): titulo; corpo com {{INSPECIONADO}}, {{DATA}},
// {{HORA_CHEGADA}} e {{HORA_SAIDA}} — e também os marcadores da tela de ajustes (utils/ajustesDocumentosIS.ts):
// {{nome}} {{postoGraduacao}} {{nip}} {{om}} {{data}} {{horaInicio}} {{horaFim}} {{is}} {{finalidade}}; observacao (rodapé).
import { PERFIS_DOCUMENTO_IS, ROTULO_DOCUMENTO_IS } from '../../../utils/documentosIS';
import { esc, nomeSemPostoNip } from './comum';
import { ajusteTexto, paginaModeloGuias } from './solicitacaoExames';
import { ErroDocumentoIS, type GeradorDocumentoIS } from './tipos';

export const TITULO_DECLARACAO_COMPARECIMENTO = 'DECLARAÇÃO DE COMPARECIMENTO';
export const CORPO_DECLARACAO_COMPARECIMENTO = 'Declaro para os devidos fins e a quem possa interessar que o {{INSPECIONADO}} esteve nesta '
  + 'Junta Regular em {{DATA}} das {{HORA_CHEGADA}} às {{HORA_SAIDA}} para atividades relacionadas à Inspeção de Saúde.';

interface Dados { data: string; horaChegada: string; horaSaida: string }

const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dataBr = (iso: string) => iso.replace(RE_DATA, '$3/$2/$1');
const horaBr = (h: string) => h.replace(':', 'h');

export const gerador: GeradorDocumentoIS<Dados> = {
  tipo: 'declaracaoComparecimento',
  titulo: ROTULO_DOCUMENTO_IS.declaracaoComparecimento,
  perfis: PERFIS_DOCUMENTO_IS.declaracaoComparecimento,
  assinante: 'gerador',
  validar: dados => {
    const data = String(dados.data ?? '').trim();
    const horaChegada = String(dados.horaChegada ?? '').trim();
    const horaSaida = String(dados.horaSaida ?? '').trim();
    if (!RE_DATA.test(data) || Number.isNaN(Date.parse(`${data}T00:00:00Z`))) throw new ErroDocumentoIS(400, 'Informe a data do comparecimento.');
    if (!RE_HORA.test(horaChegada)) throw new ErroDocumentoIS(400, 'Informe a hora de chegada (hh:mm).');
    if (!RE_HORA.test(horaSaida)) throw new ErroDocumentoIS(400, 'Informe a hora de saída (hh:mm).');
    if (horaSaida <= horaChegada) throw new ErroDocumentoIS(400, 'A hora de saída deve ser depois da hora de chegada.');
    return { data, horaChegada, horaSaida };
  },
  dadosTeste: ctx => {
    const h = 7 + Math.floor(Math.random() * 6);
    const m = Math.random() < 0.5 ? '00' : '30';
    const p = (n: number) => String(n).padStart(2, '0');
    return { data: ctx.agora.toISOString().slice(0, 10), horaChegada: `${p(h)}:${m}`, horaSaida: `${p(h + 2)}:${m}` };
  },
  resumo: d => `${dataBr(d.data)}, ${horaBr(d.horaChegada)}–${horaBr(d.horaSaida)}`,
  gerarHtml: (d, ctx) => {
    const titulo = ajusteTexto(ctx.ajustes, 'titulo', TITULO_DECLARACAO_COMPARECIMENTO);
    const modelo = ajusteTexto(ctx.ajustes, 'corpo', CORPO_DECLARACAO_COMPARECIMENTO);
    const insp = String(ctx.is.inspecionado || '');
    const nip = /\d{2}\.?\d{4}\.?\d{2}/.exec(insp)?.[0] ?? '';
    const valores: Record<string, string> = {
      INSPECIONADO: `<b>${esc(insp)}</b>`,
      DATA: esc(dataBr(d.data)), HORA_CHEGADA: esc(horaBr(d.horaChegada)), HORA_SAIDA: esc(horaBr(d.horaSaida)),
      nome: `<b>${esc(nomeSemPostoNip(insp))}</b>`, postoGraduacao: esc(nip ? insp.slice(0, insp.indexOf(nip)).trim() : ''), nip: esc(nip),
      om: esc(ctx.militar?.om ?? ''), data: esc(dataBr(d.data)), horaInicio: esc(horaBr(d.horaChegada)), horaFim: esc(horaBr(d.horaSaida)),
      is: esc(ctx.is.is), finalidade: esc(ctx.is.finalidade),
    };
    const obs = ajusteTexto(ctx.ajustes, 'observacao', '');
    // Escapa o modelo e só depois troca os marcadores (o nome vai em negrito).
    const corpo = esc(modelo).replace(/\{\{\s*([A-Za-z_]+)\s*\}\}/g, (m, k: string) => valores[k] ?? m);
    return paginaModeloGuias(titulo, `<p class="p texto-guia">${corpo}</p>${obs ? `<p class="p obs-guia">${esc(obs)}</p>` : ''}`, ctx, `${ROTULO_DOCUMENTO_IS.declaracaoComparecimento} - IS ${ctx.is.is}`);
  },
};
