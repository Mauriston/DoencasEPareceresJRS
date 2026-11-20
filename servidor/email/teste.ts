// Ficheiro: servidor/email/teste.ts
// E-mails de TESTE (Administração → E-mails automáticos → "Enviar teste"; só Admin): monta cada e-mail automático com dados fictícios
// gerados ALEATORIAMENTE a cada envio (nomes, NIP, IS, datas, finalidades, laudos, quantidade de linhas), pelos mesmos templates e funções do envio real, e envia só para os destinatários de teste de
// config/emails (`testes.para` e `testes.cc`; padrão: o Presidente da JRS), sem CCO. Assunto com "[TESTE]".
// Não lê nem grava IS, candidatos, cadastros ou Storage. Rota POST /api/email/teste { tipo }.
// Todos os tipos de config/emails (TIPOS_EMAIL). Nos que têm variantes, o gerador sorteia uma por envio: abertura
// (exames / agendamento / Benefícios), agendamentos (agendamento / reagendamento) e resultado de Benefícios (os três
// modelos). As guias (ao inspecionado e à SEC-JRS) levam um PDF de guias fictício gerado pelo mesmo documento do
// envio real (servidor/documentos/guiasExames/documento.ts → htmlParaPdf). Remetente = o do envio real.
import type { Firestore } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';
import { enviarEmail } from '../google/impressao';
import { htmlParaPdf } from '../documentos/gerarPdf';
import { assinaturaDe, lerConfigEmails, juntarEmails } from './comum';
import { montarEmailResultado } from './resultadoIS';
import { montarEmailAgenda } from './agendaIS';
import { montarEmailAgendamento } from './agendamentoIS';
import { DADOS_FICTICIOS_GUIAS, REMETENTE_FICTICIO_GUIAS, montarEmailGuiasInspecionadoFicticio, montarEmailGuiasSecretariaFicticio, type RemetenteGuias } from './guiasIS';
import { montarEmailAberturaFicticio } from './aberturaIS';
import { DADOS_FICTICIOS_DOCUMENTO, montarEmailDocumentoSecretaria } from './documentoIS';
import { montarEmailResultadoBeneficios } from './resultadoBeneficios';
import { htmlGuiasExames } from '../documentos/guiasExames/documento';
import { paginasDasGuias } from '../../utils/guiasExames';
import { MODELOS_RESULTADO_BENEFICIOS } from '../../utils/emailResultadoBeneficios';
import type { VarianteAbertura } from '../../utils/emailAberturaIS';
import type { VarianteAgendamento } from '../../utils/emailAgendamentoIS';
import { GRUPO_BENEFICIOS, GRUPO_VERIFICACOES } from '../../utils/inspecoes';
import { montarEmailFaltas } from './faltasHNRe';
import { montarEmailInaptos } from './inaptosConcurso';
import { montarEmailNac } from './nac';
import { assinaturaSupervisor } from './comum';
import { TIPOS_EMAIL, mesclarConfigEmails, type TipoEmail } from '../../config/emails';
import { montarEmailFeedbackRecebido, montarEmailFeedbackSolucionado } from '../feedback/feedback';
import { TIPOS_FEEDBACK, dataHoraRecife } from '../../utils/feedback';

/** Todos os e-mails automáticos têm teste (mesma ordem da lista em Administração → E-mails automáticos). */
export const TIPOS_TESTE: TipoEmail[] = TIPOS_EMAIL.map(t => t.tipo);

/** Nome do remetente de cada e-mail, igual ao do envio real (guiasSecretaria: quem enviou — no teste, o signatário ou o fictício). */
export const REMETENTE_TESTE: Record<Exclude<TipoEmail, 'guiasSecretaria' | 'documentoSecretaria'>, string> = {
  resultadoIS: 'JRS-HNRe', agendamentoIS: 'JRS-HNRe', agendamentoGeral: 'JRS-HNRe', agendamentoBeneficios: 'JRS-HNRe',
  aberturaIS: 'JRS-HNRe', guiasInspecionado: 'JRS-HNRe', resultadoBeneficios: 'JRS-HNRe',
  agendaIS: 'JRS/HNRe', faltasHNRe: 'JRS/HNRe', inaptosConcurso: 'JRS/HNRe', nac: 'JRS/HNRe',
  feedbackRecebido: 'JRS/HNRe', feedbackSolucionado: 'JRS/HNRe',
};

// ---------------------------------------------------------------- Dados fictícios aleatórios

/** Gerador de números (0 ≤ x < 1); os testes passam um com semente para ficar determinístico. */
export type Aleatorio = () => number;

const NOMES = ['CARLOS', 'ANA', 'JOAO', 'MARIA', 'PAULO', 'JULIANA', 'RAFAEL', 'FERNANDA', 'BRUNO', 'PATRICIA', 'DIEGO', 'CAMILA', 'LUCAS', 'LETICIA', 'MARCOS', 'BEATRIZ', 'THIAGO', 'RENATA', 'VICTOR', 'INGRIDE'];
const FEMININOS = new Set(['ANA', 'MARIA', 'JULIANA', 'FERNANDA', 'PATRICIA', 'CAMILA', 'LETICIA', 'BEATRIZ', 'RENATA', 'INGRIDE']);
const MEIOS = ['ANTONIO', 'LUIZ', 'AMANDA', 'HENRIQUE', 'CRISTINA', 'EDUARDO', 'GOMES', 'ALVES', 'RIBEIRO', 'FERREIRA', 'DE SOUZA', 'DA COSTA'];
const SOBRENOMES = ['SILVA', 'SANTOS', 'OLIVEIRA', 'PEREIRA', 'LIMA', 'CARVALHO', 'MELO', 'BARBOSA', 'CAVALCANTI', 'ARAUJO', 'NASCIMENTO', 'MONTEIRO', 'ALBUQUERQUE', 'LEAO'];
const POSTOS = ['MN-SE', 'CB-EL', 'CB-MO', '3SG-PT', '3SG-EP', '2SG-ES', '2SG-CO', '1SG-HN', 'SO-EF', '1T (T)', 'CT (Md)'];
const OMS = ['HNRe', 'EAMPE', 'CPPE', 'CPPB', 'Com3ºDN', 'BNN', 'CEFAN', 'CPAL'];
const FINALIDADES_VT = ['Verificação de Deficiência Funcional', 'Término de Restrições', 'Término de Incapacidade', 'VDF - Fato Novo'];
const LAUDOS = [
  'Apto para o SAM', 'Apto para o SAM com restrições por 30 dias', 'Apto para o SAM com restrições por 90 dias',
  'Incapaz temporariamente para o SAM, necessitando de 30 dias de LTS', 'Incapaz temporariamente para o SAM, necessitando de 60 dias de LTS',
];
const RESTRICOES = ['Serviço Noturno', 'Carregar peso', 'Serviço Armado', 'Formatura', 'Marchas', 'Embarque', 'Esforços físicos intensos e extenuantes'];
const FINALIDADES_GERAIS = ['Controle anual de praça de máquinas', 'Controle Periódico de Saúde', 'Serviço com explosivos', 'Localidade Deficiente em Assistência Sanitária', 'Reengajamento para o SMV'];
const FINALIDADES_BENEFICIOS = ['Pensão militar para beneficiário inválido', 'Isenção de Imposto de Renda', 'Auxílio-invalidez', 'Reforma de militar RM1', 'Dependência de familiar'];
const SITUACOES_BENEFICIOS = ['PENS-CMG', 'PENS-SO', 'DEP-CT', 'SO-RM1', '1SG-RM1', 'CMG-RM1'];
const VARIANTES_ABERTURA: VarianteAbertura[] = ['exames', 'agendamento', 'beneficios'];
const VARIANTES_AGENDAMENTO: VarianteAgendamento[] = ['agendamento', 'reagendamento'];
const CONCURSOS = ['CP-C-FSD-FN-TI/2027', 'CPAEAM/2027', 'CP-CAP/2027', 'CPA-QC-CA/2027'];
const PAGINAS_FEEDBACK = ['Inspeções de Saúde', 'Perícia Menor', 'Pareceres', 'Ficha do inspecionado', 'Escala de Serviço'];
const RELATOS_FEEDBACK = [
  'Ao salvar a conclusão da IS, a tela fica carregando e não confirma o registro.',
  'No celular, o botão de enviar o atestado fica escondido atrás do teclado.',
  'O filtro por período não mostra as perícias do mês anterior.',
];
const PERITOS = ['CT MAURISTON', 'CT JÚLIO CÉSAR', '1T MÔNICA VIRGÍNIA', '2T CASSUNDÉ'];

/** Fábrica de dados fictícios a partir de um gerador (aleatório por padrão). */
export const ficticios = (rnd: Aleatorio = Math.random) => {
  const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
  const um = <T>(l: readonly T[]): T => l[int(0, l.length - 1)];
  const varios = <T>(l: readonly T[], n: number): T[] => [...l].sort(() => rnd() - 0.5).slice(0, n);
  const d2 = (n: number) => String(n).padStart(2, '0');
  const nome = () => `${um(NOMES)} ${um(MEIOS)} ${um(SOBRENOMES)}${rnd() < 0.5 ? ` ${um(SOBRENOMES)}` : ''}`;
  const nip = () => `${d2(int(1, 25))}.${String(int(0, 9999)).padStart(4, '0')}.${d2(int(0, 99))}`;
  const pessoa = () => { const n = nome(); return { nome: n, inspecionado: `${um(POSTOS)} ${nip()} ${n}` }; };
  const numeroIs = () => String(int(1_200_000, 1_299_999));
  const dia = (deMin: number, deMax: number) => new Date(Date.now() + int(deMin, deMax) * 86_400_000).toISOString().slice(0, 10);
  const hora = () => `${d2(um([7, 8, 9, 10, 13, 14, 15, 16]))}:${um(['00', '20', '40'])}`;
  const matricula = () => `${int(60_000, 69_999)}-${int(0, 9)}`;
  /** Sexo coerente com o primeiro nome fictício (vocativo "Prezado"/"Prezada"). */
  const sexoDe = (nomeCompleto: string): 'Masculino' | 'Feminino' => (FEMININOS.has(nomeCompleto.split(' ')[0]) ? 'Feminino' : 'Masculino');
  return { int, um, varios, nome, nip, pessoa, numeroIs, dia, hora, matricula, sexoDe, perito: () => um(PERITOS), om: () => um(OMS), finalidade: () => um(FINALIDADES_VT), laudo: () => um(LAUDOS), concurso: () => um(CONCURSOS), restricoes: (n: number) => varios(RESTRICOES, n) };
};

/** HTML do PDF de guias fictício (as guias de DADOS_FICTICIOS_GUIAS), anexado aos testes dos e-mails das guias. */
export const htmlGuiasFicticias = (config?: Awaited<ReturnType<typeof lerConfigEmails>>): string => htmlGuiasExames({
  numeroIS: DADOS_FICTICIOS_GUIAS.numeroIs, inspecionado: DADOS_FICTICIOS_GUIAS.inspecionado, finalidade: DADOS_FICTICIOS_GUIAS.finalidade,
  paginas: paginasDasGuias(DADOS_FICTICIOS_GUIAS.grupos),
  presidenteNome: (config ?? mesclarConfigEmails(undefined)).assinatura.presidenteNome,
  presidentePosto: (config ?? mesclarConfigEmails(undefined)).assinatura.presidentePosto,
});

const presidenteTeste = (config?: Awaited<ReturnType<typeof lerConfigEmails>>) => {
  const c = config ?? mesclarConfigEmails(undefined);
  return { nome: c.assinatura.presidenteNome, posto: c.assinatura.presidentePosto };
};

/** Monta o e-mail de teste do tipo com dados fictícios aleatórios (exportada para os testes): assunto, html, texto e, se houver, o anexo. */
export const montarEmailTeste = (tipo: TipoEmail, assinatura: Parameters<typeof montarEmailResultado>[2], config = undefined as undefined | Awaited<ReturnType<typeof lerConfigEmails>>, rnd: Aleatorio = Math.random) => {
  const f = ficticios(rnd);
  const lista = <T>(min: number, max: number, gerar: () => T): T[] => Array.from({ length: f.int(min, max) }, gerar);
  switch (tipo) {
    case 'resultadoIS': {
      const p = f.pessoa();
      const laudo = f.laudo();
      return montarEmailResultado({
        is: f.numeroIs(), finalidade: f.finalidade(), inspecionado: p.inspecionado, tis: `026.000.${f.int(10_000, 99_999)}`,
        dataLaudo: f.dia(-5, -1), laudo, restricoes: /restri/i.test(laudo) ? f.restricoes(f.int(1, 4)).join('; ') : '',
      }, f.om(), assinatura);
    }
    case 'agendaIS': {
      const agendamentos = lista(0, 6, () => { const p = f.pessoa(); return { hora: f.hora(), nome: p.inspecionado, nome_completo: p.nome, om: f.om(), numero_is: f.numeroIs(), finalidade: f.finalidade(), medico: f.perito() }; })
        .sort((a, b) => a.hora.localeCompare(b.hora));
      const concurso = f.concurso();
      const concursos = rnd() < 0.5 ? lista(1, 4, () => ({ concurso, matricula: f.matricula(), candidato: f.nome() })) : [];
      const r = montarEmailAgenda({ data: f.dia(1, 1), agendamentos, concursos }, config ? assinaturaSupervisor(config) : assinaturaSupervisor());
      return { ...r, anexoNome: 'IS_AGENDADAS_TESTE.pdf' };
    }
    case 'agendamentoIS':
    case 'agendamentoGeral':
    case 'agendamentoBeneficios': {
      // O modelo sai do grupo da finalidade (utils/emailAgendamentoIS.ts → tipoEmailAgendamento).
      const p = f.pessoa();
      const variante = f.um(VARIANTES_AGENDAMENTO);
      const beneficios = tipo === 'agendamentoBeneficios';
      const inspecionado = beneficios ? `${f.um(SITUACOES_BENEFICIOS)} ${f.nip()} ${p.nome}` : p.inspecionado;
      const grupoFinalidade = tipo === 'agendamentoIS' ? GRUPO_VERIFICACOES : beneficios ? GRUPO_BENEFICIOS : 'Controle Periódico';
      const finalidade = tipo === 'agendamentoIS' ? f.finalidade() : f.um(beneficios ? FINALIDADES_BENEFICIOS : FINALIDADES_GERAIS);
      return montarEmailAgendamento({
        is: f.numeroIs(), inspecionado, finalidade, grupoFinalidade, dataEntrevista: `${f.dia(1, 10)}T${f.hora()}`,
      }, assinatura, variante, { sexo: f.sexoDe(p.nome), nome: p.nome });
    }
    case 'aberturaIS':
      return montarEmailAberturaFicticio(f.um(VARIANTES_ABERTURA), assinatura);
    case 'guiasInspecionado':
      return { ...montarEmailGuiasInspecionadoFicticio(assinatura), htmlAnexo: htmlGuiasFicticias(config) };
    case 'guiasSecretaria': {
      // Remetente real = quem enviou; no teste, o signatário (se houver) ou o fictício.
      const remetente: RemetenteGuias = assinatura.mostrar_signatario
        ? { nome: String(assinatura.signatario_nome), posto: String(assinatura.signatario_posto || ''), cargo: String(assinatura.signatario_cargo || '') }
        : REMETENTE_FICTICIO_GUIAS;
      return { ...montarEmailGuiasSecretariaFicticio(remetente), htmlAnexo: htmlGuiasFicticias(config), nomeRemetente: remetente.nome };
    }
    case 'documentoSecretaria': {
      // Mesmo remetente do teste das guias à SEC-JRS; o anexo de teste é o das guias fictícias.
      const remetente: RemetenteGuias = assinatura.mostrar_signatario
        ? { nome: String(assinatura.signatario_nome), posto: String(assinatura.signatario_posto || ''), cargo: String(assinatura.signatario_cargo || '') }
        : REMETENTE_FICTICIO_GUIAS;
      const p = f.pessoa();
      return {
        ...montarEmailDocumentoSecretaria({ ...DADOS_FICTICIOS_DOCUMENTO, numeroIs: f.numeroIs(), inspecionado: p.inspecionado }, remetente),
        htmlAnexo: htmlGuiasFicticias(config), nomeRemetente: remetente.nome,
      };
    }
    case 'resultadoBeneficios': {
      const nome = f.nome();
      return montarEmailResultadoBeneficios({
        is: f.numeroIs(), inspecionado: `${f.um(SITUACOES_BENEFICIOS)} ${f.nip()} ${nome}`, finalidade: f.um(FINALIDADES_BENEFICIOS),
        tis: `026.000.${f.int(10_000, 99_999)}`, dataLaudo: f.dia(-5, -1),
      }, f.um(MODELOS_RESULTADO_BENEFICIOS), assinatura, nome);
    }
    case 'faltasHNRe':
      return montarEmailFaltas(lista(1, 5, () => {
        const p = f.pessoa();
        return { numero_is: f.numeroIs(), dataEntrevista: `${f.dia(-10, -1)}T${f.hora()}`, inspecionado: p.inspecionado, nomeGuerra: p.nome.split(' ')[0], finalidade: f.finalidade() };
      }).sort((a, b) => a.dataEntrevista.localeCompare(b.dataEntrevista)), assinatura, config?.saudacaoFaltasHNRe);
    case 'inaptosConcurso':
      return montarEmailInaptos(f.concurso(), lista(1, 5, () => ({ matricula: f.matricula(), candidato: f.nome(), dataAgendamento: f.dia(-10, -1) })), assinatura);
    case 'nac': {
      const r = montarEmailNac(lista(2, 14, () => {
        const p = f.pessoa();
        return { dataLaudo: f.dia(-20, -1), inspecionado: p.inspecionado, nomeCompleto: p.nome, om: f.om(), numero_is: f.numeroIs(), finalidade: f.finalidade(), laudo: f.laudo() };
      }), assinatura, config?.saudacaoNac);
      return { ...r, anexoNome: r.arquivo };
    }
    case 'feedbackRecebido': {
      // Feedback: só a assinatura do Presidente (como no envio real), com o tipo sorteado.
      const presidente = presidenteTeste(config);
      return montarEmailFeedbackRecebido(`${f.um(POSTOS)} ${f.nome().split(' ')[0]}`, f.um(TIPOS_FEEDBACK).value, presidente);
    }
    case 'feedbackSolucionado': {
      const presidente = presidenteTeste(config);
      return montarEmailFeedbackSolucionado(`${f.um(POSTOS)} ${f.nome().split(' ')[0]}`, {
        pagina: f.um(PAGINAS_FEEDBACK), registradoEm: dataHoraRecife(new Date(Date.now() - f.int(1, 20) * 86_400_000)), texto: f.um(RELATOS_FEEDBACK),
      }, presidente);
    }
    default:
      throw new ErroContaGoogle('falha', 'Tipo de e-mail de teste desconhecido.');
  }
};

/** Envia o e-mail de teste `tipo` aos destinatários de teste (sem CCO). Devolve os destinatários. */
export const enviarEmailTeste = async (db: Firestore, tipoBruto: unknown, uid: string): Promise<{ tipo: TipoEmail; para: string[]; cc: string[] }> => {
  const tipo = String(tipoBruto || '') as TipoEmail;
  if (!TIPOS_TESTE.includes(tipo)) throw new ErroContaGoogle('falha', 'Tipo de e-mail de teste desconhecido.');
  const config = await lerConfigEmails(db);
  const para = juntarEmails([config.testes.para]);
  if (!para.length) throw new ErroContaGoogle('falha', 'Configure o destinatário dos e-mails de teste.');
  const cc = juntarEmails([config.testes.cc], para);
  const r = montarEmailTeste(tipo, await assinaturaDe(db, uid, config), config) as { assunto: string; html: string; texto: string; htmlAnexo?: string; anexoNome?: string; nomeRemetente?: string };
  const anexo = r.htmlAnexo ? { nome: r.anexoNome || 'ANEXO_TESTE.pdf', bytes: await htmlParaPdf(r.htmlAnexo) } : undefined;
  await enviarEmail(db, {
    para: para.join(', '), cc: cc.length ? cc.join(', ') : undefined, responderPara: config.responderPara,
    assunto: `[TESTE] ${r.assunto}`, html: r.html, texto: `*** E-MAIL DE TESTE — dados fictícios ***\n\n${r.texto}`,
    nomeRemetente: r.nomeRemetente || REMETENTE_TESTE[tipo as Exclude<TipoEmail, 'guiasSecretaria' | 'documentoSecretaria'>] || 'JRS-HNRe', anexo,
  });
  return { tipo, para, cc };
};
