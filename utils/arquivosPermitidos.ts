// Ficheiro: utils/arquivosPermitidos.ts
// Caminhos do Firebase Storage que o servidor pode repassar (POST /api/arquivos/baixar, server.ts):
// as mesmas pastas que storage.rules libera para leitura de usuário autenticado (perfil/ é pública).
// Qualquer outro caminho, ou com "..", barra inicial ou caractere de controle, é recusado.
export const PASTAS_ARQUIVOS = ['perfil/', 'pareceres/', 'periciasMenores/', 'concursos/', 'legislacao/', 'infograficos/', 'dgpm406/'] as const;

export const caminhoArquivoValido = (c: unknown): c is string =>
  typeof c === 'string' && c.length > 0 && c.length <= 512 && !c.includes('..') && !c.startsWith('/')
  && !/[\u0000-\u001f]/.test(c) && PASTAS_ARQUIVOS.some(p => c.startsWith(p));
