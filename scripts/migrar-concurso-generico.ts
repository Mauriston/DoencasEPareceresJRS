// Script de migração ÚNICA, reutilizável: importa para o Firestore (projeto
// jrs-app-web, coleção "concursos") um concurso já ENCERRADO a partir de um
// CSV no formato da aba "candidatosDataBase" da planilha "TEMPLATE
// CONCURSOS" (com uma coluna extra de nome do candidato, em qualquer
// posição — as colunas são identificadas pelo cabeçalho, não pela ordem).
//
// Ao contrário de scripts/migrar-concurso-cpaeam-2026.ts, não grava
// "mensagens" nem "agendamentos" (concurso já encerrado, sem necessidade de
// reagendar ninguém).
//
// Uso: npx tsx scripts/migrar-concurso-generico.ts "<nome do concurso>" <caminho-csv> [status]
//   status (opcional): em_breve | em_andamento | encerrado (padrão: encerrado)
//
// Usa o Admin SDK com a service account já disponível nesta sessão
// (GOOGLE_APPLICATION_CREDENTIALS), então ignora firestore.rules.
import fs from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

/** Parser de CSV tolerante a campos entre aspas (com vírgulas/quebras de linha internas). */
function parseCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let dentroAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else dentroAspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroAspas = true;
    } else if (c === ',') {
      linha.push(campo);
      campo = '';
    } else if (c === '\r') {
      // ignora
    } else if (c === '\n') {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter(l => l.some(v => v.trim() !== ''));
}

const normalizar = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function migrar() {
  const nomeConcurso = process.argv[2];
  const caminhoCsv = process.argv[3];
  const status = process.argv[4] || 'encerrado';

  if (!nomeConcurso || !caminhoCsv) {
    throw new Error('Uso: npx tsx scripts/migrar-concurso-generico.ts "<nome do concurso>" <caminho-csv> [status]');
  }
  if (!['em_breve', 'em_andamento', 'encerrado'].includes(status)) {
    throw new Error('"status" deve ser em_breve, em_andamento ou encerrado.');
  }

  const texto = fs.readFileSync(caminhoCsv, 'utf8');
  const linhas = parseCsv(texto);
  const cabecalho = linhas[0].map(normalizar);

  const idx = (nomes: string[]): number => {
    for (const n of nomes) {
      const i = cabecalho.indexOf(normalizar(n));
      if (i !== -1) return i;
    }
    return -1;
  };

  const col = {
    id: idx(['id']),
    nome: idx(['candidato', 'nome']),
    dataAgendamento: idx(['dataAgendamento']),
    status: idx(['status']),
    observacoes: idx(['observacoes']),
    finalizado: idx(['finalizado']),
    recurso: idx(['recurso']),
    dataLaudo: idx(['dataLaudo']),
    laudo: idx(['Laudo']),
    numTIS: idx(['nºTIS', 'nTIS', 'numTIS']),
    termoRecursoUrl: idx(['termoRecursoUrl']),
  };

  if (col.id === -1 || col.nome === -1) {
    throw new Error('O CSV precisa ter ao menos as colunas "id" e "candidato" (ou "nome").');
  }

  const linhasDados = linhas.slice(1).filter(l => (l[col.id] || '').trim());
  if (linhasDados.length === 0) {
    throw new Error('Nenhuma linha de candidato encontrada no CSV.');
  }

  const campo = (linha: string[], indice: number): string => (indice !== -1 ? (linha[indice] || '').trim() : '');
  const campoBooleano = (linha: string[], indice: number): boolean =>
    indice !== -1 && campo(linha, indice).toUpperCase() === 'TRUE';

  // Datas vêm em formatos diferentes conforme a planilha de origem
  // (algumas usam AAAA-MM-DD também em dataLaudo, quando o padrão do app é
  // dataAgendamento em ISO e dataLaudo em DD/MM/AAAA) — normaliza os dois
  // sentidos para manter consistência com o resto do app.
  const paraISO = (valor: string): string => {
    if (!valor) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
    const m = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return valor;
  };
  const paraBR = (valor: string): string => {
    if (!valor) return '';
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(valor)) return valor;
    const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return valor;
  };

  const concursoRef = db.collection('concursos').doc();
  const batch = db.batch();

  batch.set(concursoRef, {
    nome: nomeConcurso,
    status,
    dataHoraMensagemInicial: '',
    assuntoMensagemInicial: '',
    periodoInicioISO: '',
    periodoFimISO: '',
    totalCandidatos: linhasDados.length,
    criadoEm: new Date(),
  });

  linhasDados.forEach(linha => {
    const id = campo(linha, col.id);
    batch.set(concursoRef.collection('candidatos').doc(id), {
      nome: campo(linha, col.nome),
      dataAgendamento: paraISO(campo(linha, col.dataAgendamento)),
      status: campo(linha, col.status),
      observacoes: campo(linha, col.observacoes),
      finalizado: campoBooleano(linha, col.finalizado),
      recurso: campoBooleano(linha, col.recurso),
      dataLaudo: paraBR(campo(linha, col.dataLaudo)),
      laudo: campo(linha, col.laudo),
      numTIS: campo(linha, col.numTIS),
      termoRecursoUrl: campo(linha, col.termoRecursoUrl),
    });
  });

  await batch.commit();
  console.log(`Concurso "${nomeConcurso}" migrado com sucesso: ${concursoRef.id} (${linhasDados.length} candidatos, status=${status}).`);
}

migrar().catch(err => {
  console.error('Falha na migração:', err);
  process.exit(1);
});
