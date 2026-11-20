// Ficheiro: servidor/documentos/is/registro.ts
// Registro dos geradores dos documentos da IS: um arquivo por tipo nesta pasta. Para um novo tipo, crie o arquivo
// exportando `gerador` (GeradorDocumentoIS) e acrescente aqui (e em utils/documentosIS.ts → TIPOS_DOCUMENTO_IS).
import type { GeradorDocumentoIS, TipoDocumentoIS } from './tipos';
import { gerador as solicitacaoExames } from './solicitacaoExames';
import { gerador as declaracaoComparecimento } from './declaracaoComparecimento';
import { gerador as termoRecurso } from './termoRecurso';
import { gerador as papeletaDispensa } from './papeletaDispensa';
import { gerador as laudoPericial } from './laudoPericial';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GERADORES_DOCUMENTO_IS: Record<TipoDocumentoIS, GeradorDocumentoIS<any>> = {
  solicitacaoExames, declaracaoComparecimento, termoRecurso, papeletaDispensa, laudoPericial,
};

export const geradorDoTipo = (tipo: TipoDocumentoIS) => GERADORES_DOCUMENTO_IS[tipo];
