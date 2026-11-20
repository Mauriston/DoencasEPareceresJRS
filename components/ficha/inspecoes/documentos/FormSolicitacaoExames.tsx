// Ficheiro: components/ficha/inspecoes/documentos/FormSolicitacaoExames.tsx
// Formulário da "Solicitação de Exames": um exame por linha (servidor/documentos/is/solicitacaoExames.ts monta o PDF
// no modelo das guias de exames, em duas colunas).
import React, { useState } from 'react';
import { DialogFormularioDocumento } from './DialogFormularioDocumento';
import { Field } from '../../../ui/Field';
import type { PropsFormularioDocumentoIS } from './tipos';

export const FormSolicitacaoExames: React.FC<PropsFormularioDocumentoIS> = ({ enviando, onEnviar, onCancelar }) => {
  const [exames, setExames] = useState('');
  const linhas = exames.split('\n').map(l => l.trim()).filter(Boolean);
  return (
    <DialogFormularioDocumento
      titulo="Solicitação de Exames" icone="lab_profile" enviando={enviando} invalido={!linhas.length}
      onCancelar={onCancelar} onGerar={() => onEnviar({ exames })}
    >
      <Field label="Exames" required help={`Um exame por linha${linhas.length ? ` · ${linhas.length} exame${linhas.length === 1 ? '' : 's'}` : ''}.`}>
        {a => (
          <textarea
            {...a} rows={10} value={exames} autoFocus disabled={enviando}
            placeholder={'Hemograma completo\nGlicemia de jejum\nEletrocardiograma'}
            onChange={e => setExames(e.target.value)}
          />
        )}
      </Field>
    </DialogFormularioDocumento>
  );
};
