// Ficheiro: components/periciaMenor/ExcluirPericiaDialog.tsx
// Confirmação da exclusão de uma perícia menor. Admin: só confirma. Perito responsável (ou quem registrou):
// campo "Justificativa" obrigatório, com no mínimo 10 caracteres (utils/exclusaoPericia.ts), guardado no
// registro da exclusão pelo servidor (services/firestorePericiasMenores.ts → excluirPericiaMenor).
import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { excluirPericiaMenor, dataBR, type PericiaMenorRecord } from '../../services/firestorePericiasMenores';
import { MIN_JUSTIFICATIVA_EXCLUSAO, erroJustificativaExclusao } from '../../utils/exclusaoPericia';
import { extrairNomeInspecionado } from '../../utils/format';

interface Props {
  pericia: PericiaMenorRecord;
  perfil: string;
  /** "perícia menor" ou "atestado" (perfil User Médicos Geral). */
  termo: string;
  onClose: () => void;
  onExcluida: (msg: string) => void;
}

export const ExcluirPericiaDialog: React.FC<Props> = ({ pericia, perfil, termo, onClose, onExcluida }) => {
  const ehAdmin = perfil === 'admin';
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const nome = extrairNomeInspecionado(pericia.inspecionado);
  const restante = Math.max(0, MIN_JUSTIFICATIVA_EXCLUSAO - justificativa.trim().length);

  const excluir = async () => {
    const e = erroJustificativaExclusao(justificativa, perfil);
    if (e) { setErro(e); return; }
    setExcluindo(true); setErro('');
    try {
      await excluirPericiaMenor(pericia, justificativa);
      onExcluida(`${termo.charAt(0).toUpperCase()}${termo.slice(1)} de ${nome} (${dataBR(pericia.dataAtestado)}) excluíd${termo === 'atestado' ? 'o' : 'a'}.`);
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível excluir.');
      setExcluindo(false);
    }
  };

  return (
    <Dialog
      title={`Excluir ${termo}?`} icon="warning" size="sm"
      onClose={() => { if (!excluindo) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={excluindo}>Cancelar</Button>
          <Button variant="destructive" icon="delete" loading={excluindo} onClick={() => { void excluir(); }}>Excluir</Button>
        </>
      )}
    >
      <div className="space-y-3">
        <p className="text-sm text-ink">
          {nome} · atestado de {dataBR(pericia.dataAtestado)}. O registro e o PDF do atestado serão apagados. Esta ação não pode ser desfeita.
        </p>
        {!ehAdmin && (
          <Field label="Justificativa" required error={erro || undefined}
            help={restante > 0 ? `Mínimo de ${MIN_JUSTIFICATIVA_EXCLUSAO} caracteres (faltam ${restante}).` : undefined}>
            {a => (
              <textarea {...a} value={justificativa} autoFocus maxLength={2000}
                onChange={e => { setJustificativa(e.target.value); setErro(''); }} className={`${a.className} min-h-[96px]`} />
            )}
          </Field>
        )}
        {ehAdmin && erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
