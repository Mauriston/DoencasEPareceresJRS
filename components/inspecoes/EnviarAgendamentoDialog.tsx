// Ficheiro: components/inspecoes/EnviarAgendamentoDialog.tsx
// Confirmação do e-mail de agendamento ao inspecionado (TODOS os grupos — servidor/email/agendamentoIS.ts, rota
// POST /api/email/agendamento-is): Verificações e Términos → modelo de VDF e Términos; Benefícios → modelo de
// Benefícios; demais → modelo geral (utils/confirmacaoAgendamentoIS.ts). Nada sai sem "Enviar".
// Abre de dois jeitos (Admin e Secretaria):
//  - "agendamento": logo depois de agendar/reagendar a IS (fila da página Inspeções de Saúde);
//  - "menu": pela pendência "E-mails de agendamento" do menu "Enviar e-mail" ou pelo detalhe da IS.
// Já houve e-mail para outra data (ou a IS está Reagendada): o dialog diz "E-mail de reagendamento" e o servidor
// manda a variante de reagendamento. Sem e-mail no cadastro, pede o e-mail (o servidor grava no cadastro).
import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import { enviarAgendamentoISPorEmail } from '../../services/emailAgendamentoIS';
import { emailValido } from '../../services/emailResultadoIS';
import { dataHoraDoAgendamento } from '../../utils/emailAgendamentoIS';
import {
  ROTULO_MODELO_AGENDAMENTO, ehReagendamentoEmail, rotuloCopiasPorOM, tipoEmailAgendamentoDoGrupo,
} from '../../utils/confirmacaoAgendamentoIS';

interface Props {
  inspecao: InspecaoRecord;
  /** E-mail do cadastro do inspecionado ('' = sem e-mail cadastrado). */
  emailCadastrado: string;
  /** OM do inspecionado (cópias pela OM). */
  om?: string;
  origem: 'agendamento' | 'menu';
  onClose: () => void;
  onEnviado: (msg: string, tom?: 'success' | 'error') => void;
}

const Linha: React.FC<{ rotulo: string; children: React.ReactNode }> = ({ rotulo, children }) => (
  <div className="flex gap-2 text-sm"><dt className="text-ink-3 shrink-0 w-28">{rotulo}</dt><dd className="text-ink min-w-0 break-words">{children}</dd></div>
);

export const EnviarAgendamentoDialog: React.FC<Props> = ({ inspecao, emailCadastrado, om, origem, onClose, onEnviado }) => {
  const [email, setEmail] = useState('');
  const [erroEmail, setErroEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { data, hora } = dataHoraDoAgendamento(inspecao.dataEntrevista);
  const tipo = tipoEmailAgendamentoDoGrupo(inspecao.grupoFinalidade);
  const reagendamento = ehReagendamentoEmail(inspecao);
  const nome = reagendamento ? 'E-mail de reagendamento' : 'E-mail de agendamento';
  const copiasOM = rotuloCopiasPorOM(tipo, om);

  const enviar = async () => {
    if (!emailCadastrado && !emailValido(email)) { setErroEmail('Informe um e-mail válido.'); return; }
    setEnviando(true); setErro('');
    try {
      const r = await enviarAgendamentoISPorEmail(inspecao.id, emailCadastrado ? undefined : email);
      onEnviado(`${nome} da IS ${inspecao.is} enviado para ${r.para}.${r.emailSalvo ? ' E-mail salvo no cadastro do inspecionado.' : ''}`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar o e-mail.');
      setEnviando(false);
    }
  };

  return (
    <Dialog
      title={`${nome} — IS ${inspecao.is}`}
      icon={reagendamento ? 'event_repeat' : 'forward_to_inbox'}
      size="md"
      onClose={() => { if (!enviando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button icon="send" loading={enviando} onClick={enviar}>Enviar</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="text-sm text-ink">
          {origem === 'agendamento' ? `IS ${inspecao.is} ${reagendamento ? 'reagendada' : 'agendada'}. ` : ''}
          Enviar ao inspecionado a {reagendamento ? 'nova data da IS' : 'confirmação do agendamento'}?
        </p>
        <dl className="space-y-1.5 rounded-xl border border-line bg-paper p-3">
          <Linha rotulo="Inspecionado">{inspecao.inspecionado}</Linha>
          <Linha rotulo="Finalidade">{inspecao.finalidade}</Linha>
          <Linha rotulo={reagendamento ? 'Nova data' : 'Data e hora'}><strong>{data} às {hora}</strong></Linha>
          <Linha rotulo="Médico">{inspecao.peritoNome || '—'}</Linha>
          <Linha rotulo="Modelo">{ROTULO_MODELO_AGENDAMENTO[tipo]}{reagendamento ? ' · reagendamento' : ''}</Linha>
        </dl>

        {emailCadastrado ? (
          <p className="text-sm text-ink">Para: <strong className="break-all">{emailCadastrado}</strong></p>
        ) : (
          <Field label="E-mail do inspecionado" required error={erroEmail} help="Sem e-mail no cadastro. O e-mail informado será salvo no cadastro.">
            {a => <input {...a} type="email" value={email} autoComplete="off" autoFocus onChange={e => { setEmail(e.target.value); setErroEmail(''); }} onKeyDown={e => { if (e.key === 'Enter') void enviar(); }} />}
          </Field>
        )}

        <p className="text-xs text-ink-3 break-words">
          Remetente: JRS-HNRe · cópia para a Secretaria da JRS{copiasOM ? ` e ${copiasOM}` : ''}.
        </p>
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
