// Script de manutenção ÚNICO, reutilizável: SUBSTITUI por completo a
// subcoleção "candidatos" de um concurso já existente no Firestore (apaga
// todos os documentos atuais e grava os do CSV do zero), a partir de um CSV
// no mesmo formato aceito por migrar-concurso-generico.ts (aba
// "candidatosDataBase" + coluna de nome em qualquer posição).
//
// Usado quando os dados de um concurso já migrado ficaram desatualizados ou
// alterados por testes — NÃO cria um concurso novo, NÃO mexe em "mensagens"
// nem "agendamentos", NÃO altera o "status" do concurso.
//
// Uso: npx tsx scripts/sobrescrever-candidatos-concurso.ts "<nome do concurso>" <caminho-csv>
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

async function sobrescrever() {
  const nomeConcurso = process.argv[2];
  const caminhoCsv = process.argv[3];

  if (!nomeConcurso || !caminhoCsv) {
    throw new Error('Uso: npx tsx scripts/sobrescrever-candidatos-concurso.ts "<nome do concurso>" <caminho-csv>');
  }

  const snapConcursos = await db.collection('concursos').where('nome', '==', nomeConcurso).get();
  if (snapConcursos.empty) {
    throw new Error(`Nenhum concurso encontrado com nome "${nomeConcurso}".`);
  }
  if (snapConcursos.size > 1) {
    throw new Error(`Mais de um concurso encontrado com nome "${nomeConcurso}" (${snapConcursos.docs.map(d => d.id).join(', ')}). Apague o duplicado ou ajuste o script para usar o id diretamente.`);
  }
  const concursoRef = snapConcursos.docs[0].ref;

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

  // Apaga todos os candidatos atuais (em lotes de 400, limite de 500 por batch).
  const candidatosAtuais = await concursoRef.collection('candidatos').listDocuments();
  for (let i = 0; i < candidatosAtuais.length; i += 400) {
    const lote = db.batch();
    candidatosAtuais.slice(i, i + 400).forEach(ref => lote.delete(ref));
    await lote.commit();
  }

  // Grava os candidatos do CSV (em lotes de 400).
  for (let i = 0; i < linhasDados.length; i += 400) {
    const lote = db.batch();
    linhasDados.slice(i, i + 400).forEach(linha => {
      const id = campo(linha, col.id);
      lote.set(concursoRef.collection('candidatos').doc(id), {
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
    await lote.commit();
  }

  await concursoRef.update({ totalCandidatos: linhasDados.length });

  console.log(`Concurso "${nomeConcurso}" (${concursoRef.id}): ${candidatosAtuais.length} candidato(s) apagado(s), ${linhasDados.length} candidato(s) gravado(s) a partir do CSV.`);
}

sobrescrever().catch(err => {
  console.error('Falha ao sobrescrever candidatos:', err);
  process.exit(1);
});
