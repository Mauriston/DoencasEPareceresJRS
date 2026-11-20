// Ficheiro: components/ficha/inspecoes/documentos/tipos.ts
// Contrato dos formulários dos documentos da IS (um componente por tipo nesta pasta; registro.tsx os junta).
import type React from 'react';
import type { InspecaoRecord } from '../../../../services/firestoreInspecoes';
import type { TipoDocumentoIS } from '../../../../utils/documentosIS';

/** O que a Ficha sabe além da IS (para regras e valores padrão dos formulários). */
export interface ContextoDocumentoFicha {
  perfil: string | undefined;
  om?: string;
  vinculo?: string;
}

/** Props de TODO formulário de documento. Ao enviar, o fluxo comum pergunta pelo e-mail e chama o servidor. */
export interface PropsFormularioDocumentoIS {
  is: InspecaoRecord;
  contexto: ContextoDocumentoFicha;
  /** Servidor gerando: desabilite o botão (DialogFormularioDocumento já faz). */
  enviando: boolean;
  /** Dados do formulário → body.dados do servidor (o gerador do tipo valida). */
  onEnviar: (dados: Record<string, unknown>) => void;
  onCancelar: () => void;
}

export interface DefinicaoDocumentoIS {
  tipo: TipoDocumentoIS;
  rotulo: string;
  icone: string;
  /** Aparece no menu? (perfil + regra global de IS finalizada). */
  visivel: (perfil: string | undefined, is: InspecaoRecord) => boolean;
  /** null = habilitado; senão a dica (por que está desabilitado). */
  indisponivel: (is: InspecaoRecord, ctx: ContextoDocumentoFicha) => string | null;
  Formulario: React.FC<PropsFormularioDocumentoIS>;
}
