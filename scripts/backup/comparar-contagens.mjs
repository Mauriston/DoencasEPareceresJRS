// Ficheiro: scripts/backup/comparar-contagens.mjs
// Compara a contagem de documentos das coleções principais entre a produção ("(default)") e um banco
// restaurado de backup. Uso: node scripts/backup/comparar-contagens.mjs <projeto> <bancoRestaurado> [snapshotISO]
// Reprova (código 1) se uma coleção ESSENCIAL (usuários, inspecionados, concursos) que tem dados na
// produção vier vazia no restaurado. Nas demais, vazio no backup é só aviso (a coleção pode ter sido criada
// depois do snapshot, como a escalaSpa). Mais documentos no backup que na produção também é aviso
// (exclusões depois do snapshot). Usa as credenciais padrão (GOOGLE_APPLICATION_CREDENTIALS).
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const [projeto = 'jrs-app-web', destino = 'restauracao-teste', snapshot = ''] = process.argv.slice(2);
const COLECOES = [
  'usuarios', 'militares', 'inspecoes', 'bloqueiosAgenda', 'pareceres', 'periciasMenores', 'escalaSpa',
  'concursos', 'legislacao', 'videos', 'infograficos', 'apresentacoes', 'documentos_gerados', 'quesitosParecer',
];

const ESSENCIAIS = new Set(['usuarios', 'militares', 'concursos']);

const app = initializeApp({ credential: applicationDefault(), projectId: projeto });
const prod = getFirestore(app);
const rest = getFirestore(app, destino);
const contar = async (db, col) => (await db.collection(col).count().get()).data().count;

let reprovado = false;
const linhas = [];
for (const col of COLECOES) {
  const [p, r] = await Promise.all([contar(prod, col), contar(rest, col)]);
  let situacao = 'ok';
  if (p > 0 && r === 0 && ESSENCIAIS.has(col)) { situacao = 'REPROVADO: vazia no backup'; reprovado = true; }
  else if (p > 0 && r === 0) situacao = 'aviso: vazia no backup (criada depois do snapshot?)';
  else if (r > p) situacao = 'aviso: backup com mais documentos (exclusões depois do snapshot?)';
  else if (p > r) situacao = `ok (+${p - r} criados depois do snapshot)`;
  linhas.push({ coleção: col, produção: p, restaurado: r, situação: situacao });
}
console.log(`Snapshot do backup: ${snapshot || '(não informado)'}`);
console.table(linhas);
console.log(reprovado ? 'RESULTADO: REPROVADO' : 'RESULTADO: APROVADO — a restauração recupera os dados.');
process.exit(reprovado ? 1 : 0);
