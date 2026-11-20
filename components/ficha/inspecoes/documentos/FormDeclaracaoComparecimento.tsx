// Ficheiro: components/ficha/inspecoes/documentos/FormDeclaracaoComparecimento.tsx
// Formulário da "Declaração de Comparecimento": data (padrão: data da entrevista), hora de chegada (padrão: hora agendada)
// e hora de saída (padrão: hora agendada + 2 h). PDF: servidor/documentos/is/declaracaoComparecimento.ts.
import React, { useState } from 'react';
import { DialogFormularioDocumento } from './DialogFormularioDocumento';
import { Field } from '../../../ui/Field';
import { CampoDataBr } from '../../../ui/CampoDataBr';
import type { PropsFormularioDocumentoIS } from './tipos';

const hojeIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Valores padrão a partir de dataEntrevista (AAAA-MM-DDThh:mm). */
const padroes = (dataEntrevista: string | undefined) => {
  const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}))?/.exec(dataEntrevista || '');
  if (!m) return { data: hojeIso(), horaChegada: '', horaSaida: '' };
  if (!m[2]) return { data: m[1], horaChegada: '', horaSaida: '' };
  const saida = Math.min(Number(m[2]) + 2, 23);
  return { data: m[1], horaChegada: `${m[2]}:${m[3]}`, horaSaida: `${String(saida).padStart(2, '0')}:${m[3]}` };
};

export const FormDeclaracaoComparecimento: React.FC<PropsFormularioDocumentoIS> = ({ is, enviando, onEnviar, onCancelar }) => {
  const [v, setV] = useState(() => padroes(is.dataEntrevista));
  const ordemErrada = !!v.horaChegada && !!v.horaSaida && v.horaSaida <= v.horaChegada;
  const invalido = !v.data || !v.horaChegada || !v.horaSaida || ordemErrada;
  return (
    <DialogFormularioDocumento
      titulo="Declaração de Comparecimento" icone="how_to_reg" enviando={enviando} invalido={invalido}
      onCancelar={onCancelar} onGerar={() => onEnviar({ ...v })}
    >
      <Field label="Data" required>
        {a => <CampoDataBr id={a.id} aria-label="Data" value={v.data} onChange={data => setV(s => ({ ...s, data }))} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hora de chegada" required>
          {a => <input {...a} type="time" value={v.horaChegada} disabled={enviando} className={`${a.className} tabular-nums`}
            onChange={e => setV(s => ({ ...s, horaChegada: e.target.value }))} />}
        </Field>
        <Field label="Hora de saída" required error={ordemErrada ? 'Deve ser depois da chegada.' : undefined}>
          {a => <input {...a} type="time" value={v.horaSaida} disabled={enviando} className={`${a.className} tabular-nums`}
            onChange={e => setV(s => ({ ...s, horaSaida: e.target.value }))} />}
        </Field>
      </div>
    </DialogFormularioDocumento>
  );
};
