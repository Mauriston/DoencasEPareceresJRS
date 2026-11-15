// Ficheiro: components/inspecoes/guias/EnviarAberturaDialog.tsx
// Confirmação do e-mail "ABERTURA DE IS FIM {finalidade}" ao inspecionado, logo depois de abrir a IS (toda IS;
// só Admin e Secretaria — inspecoes.enviarEmails). Mostra o resumo e o prazo (item 2.1.2, alíneas b e c, da
// DGPM-406); sem e-mail no cadastro, pede o e-mail, que o servidor grava no cadastro. Enviar / Cancelar.
import React, { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import { enviarAberturaISPorEmail } from '../../../services/emailAberturaIS';
import { emailValido } from '../../../services/emailResultadoIS';
import { prazoAberturaIS } from '../../../utils/guiasExamesIS';
import { dataBr } from '../../../utils/inspecoes';

interface Props {
  inspecao: Pick<InspecaoRecord, 'id' | 'is' | 'inspecionado' | 'finalidade' | 'grupoFinalidade' | 'dataAbertura'>;
  /** E-mail do cadastro ('' = sem e-mail). */
  emailCadastrado: string;
  /** A finalidade tem exames mínimos (prazo para buscar as guias). */
  comExamesMinimos: boolean;
  onClose: () => void;
  /** `para`: e-mail usado (o informado passa a valer para os próximos envios). */
  onEnviado: (msg: string, para: string) => void;
}

const Linha: React.FC<{ rotulo: string; children: React.ReactNode }> = ({ rotulo, children }) => (
  <div className="flex gap-2 text-sm"><dt className="text-ink-3 shrink-0 w-24">{rotulo}</dt><dd className="text-ink min-w-0 break-words">{children}</dd></div>
);

export const EnviarAberturaDialog: React.FC<Props> = ({ inspecao, emailCadastrado, comExamesMinimos, onClose, onEnviado }) => {
  const [email, setEmail] = useState('');
  const [erroEmail, setErroEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!emailCadastrado && !emailValido(email)) { setErroEmail('Informe um e-mail válido.'); return; }
    setEnviando(true); setErro('');
    try {
      const r = await enviarAberturaISPorEmail(inspecao.id, emailCadastrado ? undefined : email);
      onEnviado(`E-mail de abertura da IS ${inspecao.is} enviado para ${r.para}.${r.emailSalvo ? ' E-mail salvo no cadastro do inspecionado.' : ''}`, r.para);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar o e-mail.');
      setEnviando(false);
    }
  };

  return (
    <Dialog
      title="Enviar e-mail de abertura?"
      icon="forward_to_inbox"
      size="md"
      onClose={() => { if (!enviando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button icon="send" loading={enviando} onClick={enviar}>Enviar e-mail</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="text-sm text-ink">IS {inspecao.is} aberta. Avisar o inspecionado da abertura e do prazo?</p>
        <dl className="space-y-1.5 rounded-xl border border-line bg-paper p-3">
          <Linha rotulo="Inspecionado">{inspecao.inspecionado}</Linha>
          <Linha rotulo="Finalidade">{inspecao.finalidade}</Linha>
          <Linha rotulo="Abertura">{dataBr(inspecao.dataAbertura)}</Linha>
          <Linha rotulo="Prazo"><strong>{prazoAberturaIS({ grupoFinalidade: inspecao.grupoFinalidade, comExamesMinimos, dataAbertura: inspecao.dataAbertura })}</strong></Linha>
        </dl>

        {emailCadastrado ? (
          <p className="text-sm text-ink">Para: <strong className="break-all">{emailCadastrado}</strong></p>
        ) : (
          <Field label="E-mail do inspecionado" required error={erroEmail} help="O inspecionado não tem e-mail cadastrado. O e-mail informado será salvo no cadastro.">
            {a => <input {...a} type="email" value={email} autoComplete="off" autoFocus onChange={e => { setEmail(e.target.value); setErroEmail(''); }} onKeyDown={e => { if (e.key === 'Enter') void enviar(); }} />}
          </Field>
        )}

        <p className="text-xs text-ink-3">Remetente: JRS-HNRe · cópia para a SEC-JRS (e a OM, quando HNRe ou EAMPE).</p>
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
