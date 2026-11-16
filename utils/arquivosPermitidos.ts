// Ficheiro: utils/arquivosPermitidos.ts
// Caminhos do Firebase Storage que o servidor pode repassar (POST /api/arquivos/baixar, server.ts):
// as mesmas pastas que storage.rules libera para leitura de usuário autenticado (perfil/ é pública).
// Qualquer outro caminho, ou com "..", barra inicial ou caractere de controle, é recusado.
// NUNCA inclua `entrevistas/` (áudio das entrevistas gravadas da IS): só a junta ouve, pelo
// servidor (/api/entrevistas/ouvir), que confere o perfil — este repasse vale para qualquer usuário ativo.
export const PASTAS_ARQUIVOS = ['perfil/', 'pareceres/', 'periciasMenores/', 'concursos/', 'legislacao/', 'infograficos/', 'dgpm406/'] as const;

const caminhoSeguro = (c: unknown): c is string =>
  typeof c === 'string' && c.length > 0 && c.length <= 512 && !c.includes('..') && !c.startsWith('/')
  && !/[\u0000-\u001f]/.test(c);

export const caminhoArquivoValido = (c: unknown): c is string =>
  caminhoSeguro(c) && PASTAS_ARQUIVOS.some(p => c.startsWith(p));

/**
 * PDFs da IS que só a EQUIPE lê (storage.rules: admin, user_medicos, user_medicos_mpi, user_secretaria):
 * guias de exames (inspecoes/{isId}/guias/…) e exames enviados (inspecoes/{isId}/exames/…). O servidor
 * confere o perfil antes de repassar (Ficha › Guias desenha as páginas a partir destes bytes).
 */
export const caminhoArquivoEquipe = (c: unknown): c is string =>
  caminhoSeguro(c) && /^inspecoes\/[^/]+\/(guias|exames)\/[^/]+$/.test(c);
