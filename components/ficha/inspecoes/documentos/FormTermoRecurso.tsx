// Ficheiro: components/ficha/inspecoes/documentos/FormTermoRecurso.tsx
// Formulário do "Termo de Recurso": sem campos (data do laudo e nº da IS vêm da IS; assina sempre o Presidente com
// rubrica). Gerador: servidor/documentos/is/termoRecurso.ts.
import React from 'react';
import { DialogFormularioDocumento } from './DialogFormularioDocumento';
import type { PropsFormularioDocumentoIS } from './tipos';

const dataBr = (iso: string | undefined) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

export const FormTermoRecurso: React.FC<PropsFormularioDocumentoIS> = ({ is, enviando, onEnviar, onCancelar }) => {
  const dataLaudo = dataBr(is.dataLaudo);
  return (
    <DialogFormularioDocumento titulo="Termo de Recurso" icone="gavel" enviando={enviando} onCancelar={onCancelar} onGerar={() => onEnviar({})}>
      <p className="text-sm text-ink-2">Gerar o Termo de Recurso da IS nº <b>{is.is}</b> ({is.finalidade}).</p>
      <p className="text-sm text-ink-3">
        Laudo exarado em: <b>{dataLaudo || 'sem data de laudo na IS'}</b>. Assinado pelo Presidente da JRS, com rubrica.
      </p>
    </DialogFormularioDocumento>
  );
};
