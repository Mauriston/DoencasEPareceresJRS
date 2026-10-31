// Script de migração ÚNICA: importa para o Firestore (projeto jrs-app-web,
// coleção "concursos") os dados reais do concurso CPAEAM/2026, hoje na
// planilha "TEMPLATE CONCURSOS" (abas "candidatos", "candidatosDataBase" e
// "mensagens"), extraídos em 29/09/2026 pelo próprio usuário (export CSV).
//
// Usa o Admin SDK (não o SDK cliente) com a service account já disponível
// nesta sessão (GOOGLE_APPLICATION_CREDENTIALS), então ignora
// firestore.rules — não precisa de nenhuma sessão de usuário logado.
//
// Uso (uma única vez): npx tsx scripts/migrar-concurso-cpaeam-2026.ts
// Este script pode ser apagado com segurança depois de rodado (não é usado
// pelo app).
import fs from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { calcularDiasUteis, formatarChaveData, NOMES_DIAS_SEMANA } from '../utils/concursosUtils';

const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// --- Dados extraídos da aba "candidatos" (id, nome) em 29/09/2026 ---
const NOMES: [string, string][] = [
  ['108842-0', 'ADILSON HENRIQUE ARAÚJO SILVA'], ['111493-1', 'AFONSO FARIAS SILVA DE SANTANA'],
  ['114134-0', 'AILLA DE ANDRADE VASCONCELOS'], ['103350-9', 'ALAN BRITO DE ARAUJO'],
  ['111494-0', 'ALONSO FARIAS SILVA DE SANTANA'], ['110638-4', 'ÁLVARO QUEIROZ DOS SANTOS'],
  ['101938-7', 'ALYSSON CARLOS SOUZA DA SILVA'], ['113847-4', 'ANGELO ACAIS TOMÉ DE LIMA'],
  ['102559-2', 'AQUILES ARTHUR DA SILVA LIMA'], ['114600-1', 'ARTHUR REIS DA CRUZ'],
  ['113167-8', 'ASAFE SANTOS DA CUNHA'], ['109397-4', 'BENJAMIM RAMOS DE FIGUEIRÔA'],
  ['108589-4', 'BRENO ALEXANDRE CAMPOS ALVES'], ['115377-0', 'CARLOS EDUARDO VIEIRA BARBOSA DA SILVA'],
  ['101477-0', 'CARLOS HENRIQUE SILVA DE MELO'], ['116737-1', 'CLAYSON HENRIQUE SOARES DE OLIVEIRA GOMES'],
  ['103261-0', 'DANIEL FRANCISCO BRITO BARROS'], ['105309-1', 'DANIEL VALÕES DE LIMA BRITO'],
  ['101353-2', 'DARLAN VICENTE FERREIRA DOS SANTOS'], ['116599-0', 'DAVI DE OLIVEIRA LIMA SANTOS'],
  ['101888-6', 'DAVI PAULINO DE OLIVEIRA SILVA'], ['116196-5', 'DEIVYSON MENDES XAVIER'],
  ['106056-6', 'DIOGO GONCALVES DE SOUZA'], ['103076-2', 'EDEZIO VINICIUS DA SILVA PIRES'],
  ['116504-2', 'ELIAN NINO JORGE'], ['100736-0', 'EMANUEL SANTANA DE FARIAS'],
  ['109806-2', 'ESDRAS DA SILVA BATISTA'], ['109441-6', 'EVELLY ALECXANDRA DA SILVA'],
  ['105594-3', 'FÁBIO DIEGO DA SILVA SANTOS'], ['101566-9', 'FERNANDO MARCELO DA SILVA'],
  ['115756-0', 'GABRIEL ARAUJO DA SILVA'], ['108194-9', 'GABRIEL BARBOSA FERREIRA DE OLIVEIRA SILVA'],
  ['106655-4', 'GABRIEL DOMINGOS DOS SANTOS SILVA'], ['115484-5', 'GABRIEL FERNANDO DE ARAÚJO ALMEIDA'],
  ['101058-5', 'GABRIEL LUIZ MARINHO DA SILVA'], ['113745-5', 'GABRIEL TAVARES SORRENTINO FLORES'],
  ['100342-2', 'GLAUCIO COELHO FREIRE'], ['103836-9', 'GUILHERME DUTRA DE BARROS TAVARES'],
  ['112649-0', 'GUILHERME VICENTE DE SANTANA'], ['102998-0', 'GUSTAVO CARVALHO PINTO'],
  ['102346-6', 'HEITOR HENRIQUE DE OLIVEIRA LIMA ARAÚJO'], ['111961-0', 'HUMBERTO PEREIRA DE AQUINO FILHO'],
  ['116642-4', 'ISAAC GABRIEL CORREIA'], ['100593-8', 'ISAQUE SIQUEIRA DOS SANTOS'],
  ['116521-0', 'IVAN RODRIGUES MONTEIRO FILHO'], ['116467-2', 'JHON ISAC DE MENEZES SILVA'],
  ['112355-5', 'JOANA CAROLINE AGRA FERREIRA'], ['114058-2', 'JOAO HENRIQUE FELIX DO NASCIMENTO'],
  ['109366-7', 'JOÃO LUCAS FERNANDES DE ANDRADE'], ['108871-0', 'JOÃO VICTOR RIBEIRO ASSIS FERREIRA'],
  ['102938-2', 'JOÃO VITOR DO NASCIMENTO SANTOS'], ['101961-9', 'JOAO VITOR PEREIRA BEZERRA'],
  ['111474-7', 'JONAS EMANOEL SILVA DE ALMEIDA'], ['100927-7', 'JOSÉ CRISTIANO ALBUQUERQUE DA COSTA'],
  ['103729-4', 'JOSÉ KAUÃ GABRIEL DO NASCIMENTO CABRAL'], ['108137-5', 'JOSÉ MIGUEL DA SILVA NETO'],
  ['100199-6', 'JOSÉ MIGUEL NASCIMENTO CORREIA'], ['104097-9', 'JÚLIA NERI DO NASCIMENTO'],
  ['114315-0', 'KAUÃ GENIVAL FERREIRA DA SILVA'], ['107743-0', 'KAUAN FELIPE MAXIMO DE SOUZA'],
  ['116065-5', 'KAUAN VICTOR SOARES PEREIRA COSTA'], ['102823-2', 'KEIVISSON WESTHER DA SILVA FERREIRA'],
  ['106594-9', 'LARYSSA RAYANE GOMES DE SOUZA'], ['102522-6', 'LETICIA MONIQUE TELES RODRIGUES GOMES'],
  ['100808-0', 'LINCOLN NASCIMENTO DA COSTA SILVA'], ['110669-1', 'LUAN ANTÔNIO DO NASCIMENTO'],
  ['105878-1', 'LUAN PIERRE LOPES DA SILVA'], ['116240-7', 'LUAN VICTOR GOMES NASCIMENTO'],
  ['106715-1', 'LUCAS GABRIEL MENDES DA SILVA'], ['101248-4', 'LUIS FELIPE DA SILVA'],
  ['101691-0', 'LUIZ GUSTAVO BARBOSA DA SILVA'], ['115029-7', 'LUIZ GUSTAVO DOS SANTOS BERNARDO'],
  ['103725-1', 'LUNNA DAYA GALDINO SANTOS'], ['114832-2', 'MARCUS VINÍCIUS DE JESUS SANTANA'],
  ['101818-1', 'MARIO ROBERTO RODRIGUES DO NASCIMENTO'], ['108236-0', 'MATHEUS FERNANDO MARQUES DE OLIVEIRA SANTOS'],
  ['115603-1', 'MIGUEL VASCONCELOS ALEXANDRE DE FREITAS'], ['106148-9', 'NÍCOLAS CLAY NASCIMENTO SANTOS'],
  ['105494-0', 'NÍCOLAS TENÓRIO DOS SANTOS DE LIMA'], ['113017-3', 'PAULO HENRIQUE VALENTIM SANTOS'],
  ['110019-3', 'PEDRO HENRIQUE DOURADO BORBA OLIVEIRA'], ['115128-1', 'PEDRO HENRIQUE SOARES DE SANTANA'],
  ['115085-2', 'PIETRO GOMES DE OLIVEIRA'], ['113072-0', 'PLINIO ARRUDA DO NASCIMENTO'],
  ['103465-9', 'RAFAEL BEZERRA DA SILVA JUNIOR'], ['116203-6', 'RAFAEL SOARES LIMA'],
  ['100438-8', 'RANNYA MARTINS LEMOS DA SILVA'], ['112717-7', 'RICARDO CESAR FELIX RODRIGUES'],
  ['113437-7', 'ROGERIO LUIZ FARIAS DA SILVA FILHO'], ['110464-5', 'SÉRGIO VICTOR GOMES DA SILVA'],
  ['107979-3', 'SOPHIA KELLEN CAVALCANTI SILVA'], ['108845-4', 'THEIVISSON RICARDO PATROCINO DOS SANTOS'],
  ['100623-6', 'THIAGO JOSÉ OLIVEIRA DA SILVA'], ['105178-2', 'THIAGO KAUÃ VASCONCELOS CASTELO BRANCO DE ARAUJO'],
  ['107373-8', 'THIAGO VINICIUS SOARES DOS SANTOS'], ['106156-9', 'VICTOR CÉSAR SANTANA DA ROCHA'],
  ['104969-0', 'WAGNER GUILHERME DE LIMA CABRAL'], ['110750-4', 'YASMEEN VITORIA DA CONCEICAO SEVERO'],
];

interface LinhaDataBase {
  id: string; dataAgendamento: string; status: string; finalizado: boolean; recurso: boolean;
  dataLaudo: string; laudo: string; termoRecursoUrl: string;
}

// --- Dados extraídos da aba "candidatosDataBase" em 29/09/2026 ---
const DATABASE: LinhaDataBase[] = [
  { id: '108842-0', dataAgendamento: '2026-08-04', status: 'INAPTO', finalizado: true, recurso: true, dataLaudo: '20/09/2026', laudo: 'Inapto para Ingresso', termoRecursoUrl: 'https://drive.google.com/file/d/1EyzRbzy9I8iI1FMq0_63WG14k5_qcyma/view?usp=drivesdk' },
  { id: '111493-1', dataAgendamento: '2026-08-04', status: 'INAPTO', finalizado: true, recurso: true, dataLaudo: '16/09/2026', laudo: 'Inapto para Ingresso', termoRecursoUrl: 'https://drive.google.com/file/d/1msjU4ZGbKE7Cv0ieIsmzN3NlaA1ElBbO/view?usp=drivesdk' },
  { id: '114134-0', dataAgendamento: '2026-08-04', status: 'INAPTO', finalizado: true, recurso: true, dataLaudo: '20/09/2026', laudo: 'Inapto para Ingresso', termoRecursoUrl: 'https://drive.google.com/file/d/1SxALtPRsNInHKWJ3EDE2vnkLtFkHkc4R/view?usp=drivesdk' },
  { id: '103350-9', dataAgendamento: '2026-08-05', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '20/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '111494-0', dataAgendamento: '2026-09-02', status: 'INAPTO', finalizado: true, recurso: true, dataLaudo: '20/09/2026', laudo: 'Inapto para Ingresso', termoRecursoUrl: 'https://drive.google.com/file/d/1KmHIKcHKB_DYi_2b4lT9Ep8mCLsOl7Zy/view?usp=drivesdk' },
  { id: '110638-4', dataAgendamento: '2026-08-04', status: 'INAPTO', finalizado: true, recurso: true, dataLaudo: '27/09/2026', laudo: 'Inapto para Ingresso', termoRecursoUrl: 'https://drive.google.com/file/d/1b0ipnns79bqEQEZl1mUjVblgThyuvpnI/view?usp=drivesdk' },
  { id: '101938-7', dataAgendamento: '2026-08-04', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '20/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '113847-4', dataAgendamento: '2026-08-04', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '20/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '102559-2', dataAgendamento: '2026-08-04', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '16/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '114600-1', dataAgendamento: '2026-08-04', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '16/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '113167-8', dataAgendamento: '2026-08-05', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '27/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '109397-4', dataAgendamento: '2026-08-05', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '108589-4', dataAgendamento: '2026-08-05', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '115377-0', dataAgendamento: '2026-08-05', status: 'INSUF DOCUMENTAL', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por Insuficiência Documental Médica', termoRecursoUrl: '' },
  { id: '101477-0', dataAgendamento: '2026-08-05', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '116737-1', dataAgendamento: '2026-08-05', status: 'INAPTO', finalizado: true, recurso: true, dataLaudo: '19/09/2026', laudo: 'Inapto para Ingresso', termoRecursoUrl: 'https://drive.google.com/file/d/1A0sfcBROR8bMV7aOIPaHzQXPSqKi2Qns/view?usp=drivesdk' },
  { id: '103261-0', dataAgendamento: '2026-08-05', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '105309-1', dataAgendamento: '2026-08-05', status: 'INSUF DOCUMENTAL', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por Insuficiência Documental Médica', termoRecursoUrl: '' },
  { id: '101353-2', dataAgendamento: '2026-08-05', status: 'INAPTO', finalizado: true, recurso: true, dataLaudo: '19/09/2026', laudo: 'Inapto para Ingresso', termoRecursoUrl: 'https://drive.google.com/file/d/1l__SrENS7Cr1w7oUCGg7eA8VNlLLkY5d/view?usp=drivesdk' },
  { id: '116599-0', dataAgendamento: '2026-08-05', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '101888-6', dataAgendamento: '2026-08-11', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '116196-5', dataAgendamento: '2026-08-11', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '106056-6', dataAgendamento: '2026-08-11', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '103076-2', dataAgendamento: '2026-08-11', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '116504-2', dataAgendamento: '2026-08-11', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '100736-0', dataAgendamento: '2026-08-11', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '109806-2', dataAgendamento: '2026-08-11', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '109441-6', dataAgendamento: '2026-08-11', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '105594-3', dataAgendamento: '2026-08-11', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '101566-9', dataAgendamento: '2026-08-11', status: 'INSUF DOCUMENTAL', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por Insuficiência Documental Médica', termoRecursoUrl: '' },
  { id: '115756-0', dataAgendamento: '2026-08-12', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '108194-9', dataAgendamento: '2026-08-12', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '106655-4', dataAgendamento: '2026-08-12', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '115484-5', dataAgendamento: '2026-08-12', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '101058-5', dataAgendamento: '2026-08-12', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '113745-5', dataAgendamento: '2026-08-12', status: 'INAPTO', finalizado: true, recurso: true, dataLaudo: '19/09/2026', laudo: 'Inapto para Ingresso', termoRecursoUrl: 'https://drive.google.com/file/d/1sqmb5bGi045WFYDMKRxA-K75DZKiSpsh/view?usp=drivesdk' },
  { id: '100342-2', dataAgendamento: '2026-08-12', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '103836-9', dataAgendamento: '2026-08-12', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '112649-0', dataAgendamento: '2026-08-12', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '102998-0', dataAgendamento: '2026-08-12', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '102346-6', dataAgendamento: '2026-08-18', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '111961-0', dataAgendamento: '2026-08-18', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '116642-4', dataAgendamento: '2026-08-18', status: 'INSUF DOCUMENTAL', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por Insuficiência Documental Médica', termoRecursoUrl: '' },
  { id: '100593-8', dataAgendamento: '2026-08-18', status: 'INSUF DOCUMENTAL', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por Insuficiência Documental Médica', termoRecursoUrl: '' },
  { id: '116521-0', dataAgendamento: '2026-08-18', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '116467-2', dataAgendamento: '2026-08-18', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '112355-5', dataAgendamento: '2026-08-18', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '114058-2', dataAgendamento: '2026-08-18', status: 'INAPTO', finalizado: true, recurso: true, dataLaudo: '19/09/2026', laudo: 'Inapto para Ingresso', termoRecursoUrl: 'https://drive.google.com/file/d/1Vm-hDapCNy0Xgc2mDcbl3AgahZuZRO8t/view?usp=drivesdk' },
  { id: '109366-7', dataAgendamento: '2026-08-18', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '108871-0', dataAgendamento: '2026-08-18', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '102938-2', dataAgendamento: '2026-08-19', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '101961-9', dataAgendamento: '2026-08-19', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '111474-7', dataAgendamento: '2026-08-19', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '100927-7', dataAgendamento: '2026-08-19', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '103729-4', dataAgendamento: '2026-08-19', status: 'INSUF DOCUMENTAL', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por Insuficiência Documental Médica', termoRecursoUrl: '' },
  { id: '108137-5', dataAgendamento: '2026-08-19', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '100199-6', dataAgendamento: '2026-08-19', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '104097-9', dataAgendamento: '2026-08-19', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '114315-0', dataAgendamento: '2026-08-19', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '107743-0', dataAgendamento: '2026-08-19', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '116065-5', dataAgendamento: '2026-08-25', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '102823-2', dataAgendamento: '2026-08-25', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '106594-9', dataAgendamento: '2026-08-25', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '102522-6', dataAgendamento: '2026-08-25', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '100808-0', dataAgendamento: '2026-08-25', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '110669-1', dataAgendamento: '2026-08-25', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '105878-1', dataAgendamento: '2026-08-25', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '116240-7', dataAgendamento: '2026-08-25', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '106715-1', dataAgendamento: '2026-08-25', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '101248-4', dataAgendamento: '2026-08-25', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '101691-0', dataAgendamento: '2026-08-26', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '115029-7', dataAgendamento: '2026-08-26', status: 'INSUF DOCUMENTAL', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por Insuficiência Documental Médica', termoRecursoUrl: '' },
  { id: '103725-1', dataAgendamento: '2026-08-26', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '114832-2', dataAgendamento: '2026-08-26', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '101818-1', dataAgendamento: '2026-08-26', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '108236-0', dataAgendamento: '2026-08-26', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '115603-1', dataAgendamento: '2026-08-26', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '106148-9', dataAgendamento: '2026-08-26', status: 'INSUF DOCUMENTAL', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por Insuficiência Documental Médica', termoRecursoUrl: '' },
  { id: '105494-0', dataAgendamento: '2026-08-26', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '113017-3', dataAgendamento: '2026-08-26', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '110019-3', dataAgendamento: '2026-09-01', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '115128-1', dataAgendamento: '2026-09-01', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '115085-2', dataAgendamento: '2026-09-01', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '113072-0', dataAgendamento: '2026-09-01', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '103465-9', dataAgendamento: '2026-09-01', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '116203-6', dataAgendamento: '2026-09-01', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '100438-8', dataAgendamento: '2026-09-01', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '112717-7', dataAgendamento: '2026-09-01', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '113437-7', dataAgendamento: '2026-09-01', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '110464-5', dataAgendamento: '2026-09-01', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '107979-3', dataAgendamento: '2026-09-02', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '108845-4', dataAgendamento: '2026-09-02', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '100623-6', dataAgendamento: '2026-09-02', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '105178-2', dataAgendamento: '2026-09-02', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '107373-8', dataAgendamento: '2026-09-02', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
  { id: '106156-9', dataAgendamento: '2026-09-02', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '104969-0', dataAgendamento: '2026-09-02', status: 'APTO', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'Apto para Ingresso', termoRecursoUrl: '' },
  { id: '110750-4', dataAgendamento: '2026-09-02', status: 'FALTOU', finalizado: true, recurso: false, dataLaudo: '19/09/2026', laudo: 'IS não concluída por não comparecimento', termoRecursoUrl: '' },
];

const MENSAGEM_TEXTO = `ACD eventos 22 e 23 do calendário de eventos previsto no respectivo Edital, fim CPR Evento Complementar (EVC) de Inspeção de Saúde (IS), CNS PSB:
UNO - realizar IS (JRS) e fechamento da IS, inclusive em grau de recurso (JSD), dos candidatos abaixo relacionados, aprovados e classificados no Concurso em lide, nos períodos 03AGO a

14SET2026 (JRS) e 10AGO a 24SET2026 (JSD):
${NOMES.map(([id, nome]) => `- ${id} ${nome}`).join('\n')}
DOIS – INF por MSG, até 20JUL distribuição dos Candidatos por horário/data do EVT para divulgação no sítio desta Escola;
TRÊS - INF imediatamente, em caso de candidato INAPTO por essa JRS, para a caixa postal (Zimbra) eampe.concursos@marinha.mil.br, fim subsidiar eventual solicitação de IS em Grau de Recurso, com tempo hábil para conclusão na JSD; e
QUATRO - INF por MSG, resultado da IS, até 14SET (JRS) e até 24SET (JSD) BT`;

async function migrar() {
  const nomesPorId = new Map(NOMES);
  if (nomesPorId.size !== DATABASE.length) {
    throw new Error(`Contagem inconsistente: ${nomesPorId.size} nomes vs ${DATABASE.length} linhas de dados.`);
  }

  const concursoRef = db.collection('concursos').doc();
  const batch = db.batch();

  batch.set(concursoRef, {
    nome: 'CPAEAM/2026',
    status: 'encerrado', // todos os 98 candidatos já estão finalizados
    dataHoraMensagemInicial: 'P141721Z/JUL/2026',
    assuntoMensagemInicial: 'CPAEAM/2026 - Inspeção de Saúde (IS).',
    periodoInicioISO: '2026-08-03',
    periodoFimISO: '2026-09-14',
    totalCandidatos: DATABASE.length,
    criadoEm: new Date('2026-07-14T00:00:00'),
  });

  DATABASE.forEach(linha => {
    const nome = nomesPorId.get(linha.id);
    if (!nome) throw new Error(`Candidato "${linha.id}" não encontrado na lista de nomes.`);
    batch.set(concursoRef.collection('candidatos').doc(linha.id), {
      nome,
      dataAgendamento: linha.dataAgendamento,
      status: linha.status,
      observacoes: '',
      finalizado: linha.finalizado,
      recurso: linha.recurso,
      dataLaudo: linha.dataLaudo,
      laudo: linha.laudo,
      numTIS: '',
      termoRecursoUrl: linha.termoRecursoUrl,
    });
  });

  batch.set(concursoRef.collection('mensagens').doc(), {
    dataHora: 'P141721Z/JUL/2026',
    fileUrl: 'https://drive.google.com/file/d/1ilV4xotWOy99Uwhz8y6gg3dk5ahpqibD/view?usp=drivesdk',
    proposito: 'Apresentação e IS',
    sender: 'EAMRCF Para: HOSRCF',
    recipient: 'HOSRCF',
    info: 'HOSNAT, TERDIS',
    subject: 'CPAEAM/2026 - Inspeção de Saúde (IS).',
    texto: MENSAGEM_TEXTO,
  });

  const diasUteis = calcularDiasUteis(new Date(2026, 7, 3), new Date(2026, 8, 14));
  diasUteis.forEach(d => {
    batch.set(concursoRef.collection('agendamentos').doc(formatarChaveData(d)), {
      diaSemana: NOMES_DIAS_SEMANA[d.getDay()],
    });
  });

  await batch.commit();
  console.log(`Concurso CPAEAM/2026 migrado com sucesso: ${concursoRef.id} (${DATABASE.length} candidatos, ${diasUteis.length} dias úteis no calendário).`);
  console.log('Observação: os links de Termo de Recurso continuam apontando para o Google Drive original (7 PDFs) — não foram re-hospedados no Firebase Storage nesta migração.');
}

migrar().catch(err => {
  console.error('Falha na migração:', err);
  process.exit(1);
});
