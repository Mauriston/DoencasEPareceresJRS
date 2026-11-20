// Ficheiro: components/ficha/inspecoes/documentos/FormPapeletaDispensa.tsx
// Formulário da "Papeleta de Dispensa": quantidade de dias (1–30) e data do documento (padrão hoje).
// Gerador: servidor/documentos/is/papeletaDispensa.ts (assina quem gerou; rubrica se Admin).
import React, { useState } from 'react';
import { DialogFormularioDocumento } from './DialogFormularioDocumento';
import { Field } from '../../../ui/Field';
import { CampoDataBr } from '../../../ui/CampoDataBr';
import type { PropsFormularioDocumentoIS } from './tipos';

const hojeIso = () => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return p.slice(0, 10);
};

export const FormPapeletaDispensa: React.FC<PropsFormularioDocumentoIS> = ({ is, enviando, onEnviar, onCancelar }) => {
  const [dias, setDias] = useState('');
  const [data, setData] = useState(hojeIso);
  const n = Number(dias);
  const diasOk = Number.isInteger(n) && n >= 1 && n <= 30;
  const invalido = !diasOk || !data;
  return (
    <DialogFormularioDocumento
      titulo="Papeleta de Dispensa" icone="description" enviando={enviando} invalido={invalido}
      onCancelar={onCancelar} onGerar={() => onEnviar({ dias: n, data })}
    >
      <p className="text-sm text-ink-3">IS nº {is.is} — {is.finalidade}</p>
      <Field label="Dias de dispensa" required help="De 1 a 30 dias (DGPM-406: até 20, prorrogáveis por mais 10)."
        error={dias && !diasOk ? 'Informe de 1 a 30 dias.' : undefined}>
        {aria => (
          <input {...aria} type="number" inputMode="numeric" min={1} max={30} step={1} value={dias} autoFocus
            onChange={e => setDias(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        )}
      </Field>
      <Field label="Data do documento" required>
        {aria => <CampoDataBr id={aria.id} aria-label="Data do documento" value={data} onChange={setData} />}
      </Field>
    </DialogFormularioDocumento>
  );
};
