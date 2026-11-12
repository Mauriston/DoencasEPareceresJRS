// Ficheiro: servidor/email/teste.ts
// E-mails de TESTE (Configurações → Testes de e-mail; só Admin): monta cada e-mail automático com dados fictícios
// gerados ALEATORIAMENTE a cada envio (nomes, NIP, IS, datas, finalidades, laudos, quantidade de linhas), pelos mesmos templates e funções do envio real, e envia só para os destinatários de teste de
// config/emails (`testes.para` e `testes.cc`; padrão: o Presidente da JRS), sem CCO. Assunto com "[TESTE]".
// Não lê nem grava IS, candidatos, cadastros ou Storage. Rota POST /api/email/teste { tipo }.
import type { Firestore } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';
import { enviarEmail } from '../google/impressao';
import { htmlParaPdf } from '../documentos/gerarPdf';
import { assinaturaDe, lerConfigEmails, juntarEmails } from './comum';
import { montarEmailResultado } from './resultadoIS';
import { montarEmailAgenda } from './agendaIS';
import { montarEmailAgendamento } from './agendamentoIS';
import { montarEmailFaltas } from './faltasHNRe';
import { montarEmailInaptos } from './inaptosConcurso';
import { montarEmailNac } from './nac';
import { assinaturaSupervisor } from './comum';
import type { TipoEmail } from '../../config/emails';

export const TIPOS_TESTE: TipoEmail[] = ['resultadoIS', 'agendaIS', 'agendamentoIS', 'faltasHNRe', 'inaptosConcurso', 'nac'];

// ---------------------------------------------------------------- Dados fictícios aleatórios

/** Gerador de números (0 ≤ x < 1); os testes passam um com semente para ficar determinístico. */
export type Aleatorio = () => number;

const NOMES = ['CARLOS', 'ANA', 'JOAO', 'MARIA', 'PAULO', 'JULIANA', 'RAFAEL', 'FERNANDA', 'BRUNO', 'PATRICIA', 'DIEGO', 'CAMILA', 'LUCAS', 'LETICIA', 'MARCOS', 'BEATRIZ', 'THIAGO', 'RENATA', 'VICTOR', 'INGRIDE'];
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
const CONCURSOS = ['CP-C-FSD-FN-TI/2027', 'CPAEAM/2027', 'CP-CAP/2027', 'CPA-QC-CA/2027'];
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
  return { int, um, varios, nome, nip, pessoa, numeroIs, dia, hora, matricula, perito: () => um(PERITOS), om: () => um(OMS), finalidade: () => um(FINALIDADES_VT), laudo: () => um(LAUDOS), concurso: () => um(CONCURSOS), restricoes: (n: number) => varios(RESTRICOES, n) };
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
    case 'agendamentoIS': {
      const p = f.pessoa();
      return montarEmailAgendamento({
        is: f.numeroIs(), inspecionado: p.inspecionado, finalidade: f.finalidade(), grupoFinalidade: 'Verificações e Términos', dataEntrevista: `${f.dia(1, 10)}T${f.hora()}`,
      }, assinatura);
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
  const r = montarEmailTeste(tipo, await assinaturaDe(db, uid, config), config) as { assunto: string; html: string; texto: string; htmlAnexo?: string; anexoNome?: string };
  const anexo = r.htmlAnexo ? { nome: r.anexoNome || 'ANEXO_TESTE.pdf', bytes: await htmlParaPdf(r.htmlAnexo) } : undefined;
  await enviarEmail(db, {
    para: para.join(', '), cc: cc.length ? cc.join(', ') : undefined, responderPara: config.responderPara,
    assunto: `[TESTE] ${r.assunto}`, html: r.html, texto: `*** E-MAIL DE TESTE — dados fictícios ***\n\n${r.texto}`,
    nomeRemetente: tipo === 'resultadoIS' ? 'JRS-HNRe' : 'JRS/HNRe', anexo,
  });
  return { tipo, para, cc };
};
