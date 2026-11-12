// Ficheiro: components/inspecoes/EnviarResultadoDialog.tsx
// Confirmação do "Enviar resultado por e-mail" (IS com TIS assinado; Admin e Secretaria): mostra o resumo
// da IS e o destinatário (e-mail do cadastro do inspecionado). Sem e-mail no cadastro, pede o e-mail —
// que o servidor grava no cadastro ao enviar. Remetente "HNRe - Junta Regular de Saúde", cópia oculta
// para a caixa da JRS (servidor/email/resultadoIS.ts).
import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import { emailValido, enviarResultadoISPorEmail } from '../../services/emailResultadoIS';
import { separarRestricoes } from '../../utils/conclusaoIS';

interface Props {
  inspecao: InspecaoRecord;
  /** E-mail do cadastro do inspecionado ('' = sem e-mail cadastrado). */
  emailCadastrado: string;
  onClose: () => void;
  onEnviado: (msg: string, tom?: 'success' | 'error') => void;
}

const Linha: React.FC<{ rotulo: string; children: React.ReactNode }> = ({ rotulo, children }) => (
  <div className="flex gap-2 text-sm"><dt className="text-ink-3 shrink-0 w-28">{rotulo}</dt><dd className="text-ink min-w-0 break-words">{children}</dd></div>
);

export const EnviarResultadoDialog: React.FC<Props> = ({ inspecao, emailCadastrado, onClose, onEnviado }) => {
  const [email, setEmail] = useState('');
  const [erroEmail, setErroEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const restricoes = separarRestricoes(inspecao.restricoes || '');

  const enviar = async () => {
    if (!emailCadastrado && !emailValido(email)) { setErroEmail('Informe um e-mail válido.'); return; }
    setEnviando(true); setErro('');
    try {
      const r = await enviarResultadoISPorEmail(inspecao.id, emailCadastrado ? undefined : email);
      onEnviado(`Resultado da IS ${inspecao.is} enviado para ${r.para}.${r.emailSalvo ? ' E-mail salvo no cadastro do inspecionado.' : ''}`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar o e-mail.');
      setEnviando(false);
    }
  };

  return (
    <Dialog
      title={`Enviar resultado — IS ${inspecao.is}`}
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
        <dl className="space-y-1.5 rounded-xl border border-line bg-paper p-3">
          <Linha rotulo="Inspecionado">{inspecao.inspecionado}</Linha>
          <Linha rotulo="Finalidade">{inspecao.finalidade}</Linha>
          <Linha rotulo="Nº do TIS">{inspecao.tis || '—'}</Linha>
          <Linha rotulo="Laudo"><strong>{inspecao.laudo || '—'}</strong></Linha>
          {restricoes.length > 0 && <Linha rotulo="Restrições">{restricoes.join('; ')}</Linha>}
        </dl>

        {emailCadastrado ? (
          <p className="text-sm text-ink">Para: <strong className="break-all">{emailCadastrado}</strong></p>
        ) : (
          <Field label="E-mail do inspecionado" required error={erroEmail} help="O inspecionado não tem e-mail cadastrado. O e-mail informado será salvo no cadastro.">
            {a => <input {...a} type="email" value={email} autoComplete="off" autoFocus onChange={e => { setEmail(e.target.value); setErroEmail(''); }} onKeyDown={e => { if (e.key === 'Enter') void enviar(); }} />}
          </Field>
        )}

        <p className="text-xs text-ink-3">Remetente: HNRe - Junta Regular de Saúde · cópia oculta para hnre.jrs@marinha.mil.br.</p>
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
