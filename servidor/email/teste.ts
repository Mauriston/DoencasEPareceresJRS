// Ficheiro: servidor/email/teste.ts
// E-mails de TESTE (Configurações → Testes de e-mail; só Admin): monta cada e-mail automático com dados de exemplo
// fictícios, pelos mesmos templates e funções do envio real, e envia só para os destinatários de teste de
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

/** Data AAAA-MM-DD somada de `dias` a partir de hoje (exemplos com datas plausíveis). */
const dia = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

/** Monta o e-mail de teste do tipo (exportada para os testes): assunto, html, texto e, se houver, o anexo. */
export const montarEmailTeste = (tipo: TipoEmail, assinatura: Parameters<typeof montarEmailResultado>[2], config = undefined as undefined | Awaited<ReturnType<typeof lerConfigEmails>>) => {
  switch (tipo) {
    case 'resultadoIS':
      return montarEmailResultado({
        is: 1245271, finalidade: 'FIM VDF Fato Novo', inspecionado: '2SG-CO 07.3644.15 PAULO ANDRE DIAS DOS SANTOS', tis: '026.000.57079',
        dataLaudo: dia(-1), laudo: 'Apto para o SAM com restrições por 90 dias.', restricoes: 'Serviço Noturno; Carregar peso; Serviço Armado',
      }, 'EAMPE', assinatura);
    case 'agendaIS': {
      const r = montarEmailAgenda({
        data: dia(1),
        agendamentos: [
          { hora: '13:00', nome: '3SG-PT 07.3836.57 CARLOS ANTONIO PEREIRA DA SILVA', nome_completo: 'CARLOS ANTONIO PEREIRA DA SILVA', om: 'HNRe', numero_is: '1253621', finalidade: 'Verificação de Deficiência Funcional', medico: 'CT MAURISTON' },
          { hora: '13:40', nome: 'CB-EL 08.0299.97 VICTOR GOMES DE SOUZA LEAO', nome_completo: 'VICTOR GOMES DE SOUZA LEAO', om: 'EAMPE', numero_is: '1252891', finalidade: 'Término de Restrições', medico: 'CT MAURISTON' },
        ],
        concursos: [{ concurso: 'CP-C-FSD-FN-TI/2027', matricula: '65599-8', candidato: 'DAYVID RUAN DA SILVA OLIVEIRA' }],
      }, config ? assinaturaSupervisor(config) : assinaturaSupervisor());
      return { ...r, anexoNome: 'IS_AGENDADAS_TESTE.pdf' };
    }
    case 'agendamentoIS':
      return montarEmailAgendamento({
        is: 1253621, inspecionado: '3SG-PT 07.3836.57 CARLOS ANTONIO PEREIRA DA SILVA', finalidade: 'Verificação de Deficiência Funcional',
        grupoFinalidade: 'Verificações e Términos', dataEntrevista: `${dia(3)}T13:40`,
      }, assinatura);
    case 'faltasHNRe':
      return montarEmailFaltas([
        { numero_is: '1234813', dataEntrevista: `${dia(-2)}T08:00`, inspecionado: 'CT (Md) 13.0450.24 MAURISTON RENAN MARTINS SILVA', nomeGuerra: 'MAURISTON', finalidade: 'Verificação de Deficiência Funcional' },
        { numero_is: '1234814', dataEntrevista: `${dia(-1)}T10:50`, inspecionado: '3SG-PT 07.3836.57 CARLOS ANTONIO PEREIRA DA SILVA', finalidade: 'Término de Restrições' },
      ], assinatura, config?.saudacaoFaltasHNRe);
    case 'inaptosConcurso':
      return montarEmailInaptos('CP-C-FSD-FN-TI/2027', [
        { matricula: '65599-8', candidato: 'DAYVID RUAN DA SILVA OLIVEIRA', dataAgendamento: dia(-3) },
        { matricula: '63143-5', candidato: 'ERIVALDO ALVES DA SILVA JUNIOR', dataAgendamento: dia(-3) },
      ], assinatura);
    case 'nac': {
      const r = montarEmailNac([
        { dataLaudo: dia(-9), inspecionado: '3SG-PT 07.3836.57 CARLOS ANTONIO PEREIRA DA SILVA', om: 'HNRe', numero_is: '1253621', finalidade: 'Verificação de Deficiência Funcional', laudo: 'Incapaz temporariamente para o SAM, necessitando de 30 dias de LTS' },
        { dataLaudo: dia(-5), inspecionado: '2SG-ES 10.1229.74 INGRIDE AMANDA RIBEIRO DOS SANTOS', om: 'HNRe', numero_is: '1252680', finalidade: 'Término de Restrições', laudo: 'Apto para o SAM' },
        { dataLaudo: dia(-1), inspecionado: '3SG-EP 12.0374.60 JOAO PAULO FERREIRA MELO', om: 'EAMPE', numero_is: '1252674', finalidade: 'Término de Restrições', laudo: 'Apto para o SAM com restrições por 30 dias' },
      ], assinatura, config?.saudacaoNac);
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
