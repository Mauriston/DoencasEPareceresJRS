// Ficheiro: components/inspecoes/EnviarAgendamentoDialog.tsx
// E-mail "AGENDAMENTO DE INSPEÇÃO DE SAÚDE" ao inspecionado (finalidades dos grupos Benefícios e Verificações e
// Términos — servidor/email/agendamentoIS.ts). Abre de dois jeitos:
//  - "agendamento": logo depois de agendar/reagendar a IS, perguntando se envia (Enviar · Agora não);
//  - "menu": pelo item "Enviar e-mail de agendamento" do menu ⋮ (Admin e Secretaria).
// Mostra o resumo do agendamento e o destinatário (e-mail do cadastro); sem e-mail no cadastro, pede o e-mail,
// que o servidor grava no cadastro ao enviar. Cópia para a caixa da JRS e o médico da IS.
import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import { enviarAgendamentoISPorEmail } from '../../services/emailAgendamentoIS';
import { emailValido } from '../../services/emailResultadoIS';
import { dataHoraDoAgendamento, modeloDoGrupo } from '../../utils/emailAgendamentoIS';

interface Props {
  inspecao: InspecaoRecord;
  /** E-mail do cadastro do inspecionado ('' = sem e-mail cadastrado). */
  emailCadastrado: string;
  origem: 'agendamento' | 'menu';
  onClose: () => void;
  onEnviado: (msg: string, tom?: 'success' | 'error') => void;
}

const Linha: React.FC<{ rotulo: string; children: React.ReactNode }> = ({ rotulo, children }) => (
  <div className="flex gap-2 text-sm"><dt className="text-ink-3 shrink-0 w-28">{rotulo}</dt><dd className="text-ink min-w-0 break-words">{children}</dd></div>
);

export const EnviarAgendamentoDialog: React.FC<Props> = ({ inspecao, emailCadastrado, origem, onClose, onEnviado }) => {
  const [email, setEmail] = useState('');
  const [erroEmail, setErroEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { data, hora } = dataHoraDoAgendamento(inspecao.dataEntrevista);
  const beneficios = modeloDoGrupo(inspecao.grupoFinalidade) === 'beneficios';

  const enviar = async () => {
    if (!emailCadastrado && !emailValido(email)) { setErroEmail('Informe um e-mail válido.'); return; }
    setEnviando(true); setErro('');
    try {
      const r = await enviarAgendamentoISPorEmail(inspecao.id, emailCadastrado ? undefined : email);
      onEnviado(`E-mail de agendamento da IS ${inspecao.is} enviado para ${r.para}.${r.emailSalvo ? ' E-mail salvo no cadastro do inspecionado.' : ''}`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar o e-mail.');
      setEnviando(false);
    }
  };

  return (
    <Dialog
      title={origem === 'agendamento' ? 'Enviar e-mail de agendamento?' : `E-mail de agendamento — IS ${inspecao.is}`}
      icon="forward_to_inbox"
      size="md"
      onClose={() => { if (!enviando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={enviando}>{origem === 'agendamento' ? 'Agora não' : 'Cancelar'}</Button>
          <Button icon="send" loading={enviando} onClick={enviar}>Enviar e-mail</Button>
        </>
      )}
    >
      <div className="space-y-4">
        {origem === 'agendamento' && (
          <p className="text-sm text-ink">IS {inspecao.is} agendada. Enviar ao inspecionado a confirmação do agendamento{beneficios ? ', com a lista de documentos exigidos para Benefícios' : ', com as orientações de VDF e Términos'}?</p>
        )}
        <dl className="space-y-1.5 rounded-xl border border-line bg-paper p-3">
          <Linha rotulo="Inspecionado">{inspecao.inspecionado}</Linha>
          <Linha rotulo="Finalidade">{inspecao.finalidade}</Linha>
          <Linha rotulo="Data e hora"><strong>{data} às {hora}</strong></Linha>
          <Linha rotulo="Médico">{inspecao.peritoNome || '—'}</Linha>
        </dl>

        {emailCadastrado ? (
          <p className="text-sm text-ink">Para: <strong className="break-all">{emailCadastrado}</strong></p>
        ) : (
          <Field label="E-mail do inspecionado" required error={erroEmail} help="O inspecionado não tem e-mail cadastrado. O e-mail informado será salvo no cadastro.">
            {a => <input {...a} type="email" value={email} autoComplete="off" autoFocus onChange={e => { setEmail(e.target.value); setErroEmail(''); }} onKeyDown={e => { if (e.key === 'Enter') void enviar(); }} />}
          </Field>
        )}

        <p className="text-xs text-ink-3">Remetente: JRS/HNRe · cópia para a caixa da JRS e o e-mail institucional do médico da IS.</p>
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
