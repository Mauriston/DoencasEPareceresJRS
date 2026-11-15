// Ficheiro: components/inspecoes/emails/EnviarResultadoBeneficiosDialog.tsx
// Confirmação do e-mail de resultado de Benefícios ("RESULTADO DE IS FIM …"; Admin e Secretaria). Ao abrir, a IA
// (services/resultadoBeneficiosIA.ts) lê o laudo/conclusão da IS e o tipo do inspecionado no cadastro e sugere o
// modelo — Não enquadramento · Enquadramento de militar inativo · Enquadramento de não militar — com uma
// justificativa curta. O usuário confere, pode trocar o modelo e só então envia (Enviar · Cancelar). Sem e-mail
// no cadastro, pede o e-mail (o servidor grava no cadastro). Rota: POST /api/email/resultado-beneficios.
import React, { useEffect, useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import type { MilitarRecord } from '../../../services/firestoreMilitares';
import { emailValido } from '../../../services/emailResultadoIS';
import { enviarResultadoBeneficiosPorEmail } from '../../../services/emailResultadoBeneficios';
import { sugerirModeloResultadoBeneficios, type SugestaoModeloBeneficios } from '../../../services/resultadoBeneficiosIA';
import {
  MODELOS_RESULTADO_BENEFICIOS, ROTULO_MODELO_RESULTADO_BENEFICIOS, type ModeloResultadoBeneficios,
} from '../../../utils/resultadoBeneficiosIS';

interface Props {
  inspecao: InspecaoRecord;
  /** Cadastro do inspecionado (tipo: militar × dependente/pensionista/servidor civil). */
  militar?: MilitarRecord;
  /** E-mail do cadastro do inspecionado ('' = sem e-mail cadastrado). */
  emailCadastrado: string;
  onClose: () => void;
  onEnviado: (msg: string, tom?: 'success' | 'error') => void;
}

const Linha: React.FC<{ rotulo: string; children: React.ReactNode }> = ({ rotulo, children }) => (
  <div className="flex gap-2 text-sm"><dt className="text-ink-3 shrink-0 w-28">{rotulo}</dt><dd className="text-ink min-w-0 break-words">{children}</dd></div>
);

export const EnviarResultadoBeneficiosDialog: React.FC<Props> = ({ inspecao, militar, emailCadastrado, onClose, onEnviado }) => {
  const [modelo, setModelo] = useState<ModeloResultadoBeneficios | ''>('');
  const [sugestao, setSugestao] = useState<SugestaoModeloBeneficios | null>(null);
  const [analisando, setAnalisando] = useState(true);
  const [erroIA, setErroIA] = useState('');
  const [erroModelo, setErroModelo] = useState('');
  const [email, setEmail] = useState('');
  const [erroEmail, setErroEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    sugerirModeloResultadoBeneficios(inspecao, militar)
      .then(s => { if (!vivo) return; setSugestao(s); setModelo(m => m || s.modelo); })
      .catch((e: Error) => { if (vivo) setErroIA(e?.message || 'A IA não sugeriu um modelo. Escolha o modelo.'); })
      .finally(() => { if (vivo) setAnalisando(false); });
    return () => { vivo = false; };
  }, [inspecao.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const enviar = async () => {
    if (!modelo) { setErroModelo('Escolha o modelo.'); return; }
    if (!emailCadastrado && !emailValido(email)) { setErroEmail('Informe um e-mail válido.'); return; }
    setEnviando(true); setErro('');
    try {
      const r = await enviarResultadoBeneficiosPorEmail(inspecao.id, modelo, emailCadastrado ? undefined : email);
      onEnviado(`Resultado da IS ${inspecao.is} enviado para ${r.para}.${r.emailSalvo ? ' E-mail salvo no cadastro do inspecionado.' : ''}`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar o e-mail.');
      setEnviando(false);
    }
  };

  return (
    <Dialog
      title={`Resultado (Benefícios) — IS ${inspecao.is}`}
      icon="mark_email_unread"
      size="md"
      onClose={() => { if (!enviando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button icon="send" loading={enviando} disabled={!modelo} onClick={enviar}>Enviar</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <dl className="space-y-1.5 rounded-xl border border-line bg-paper p-3">
          <Linha rotulo="Inspecionado">{inspecao.inspecionado}</Linha>
          <Linha rotulo="Finalidade">{inspecao.finalidade}</Linha>
          <Linha rotulo="Nº do TIS">{inspecao.tis || '—'}</Linha>
          <Linha rotulo="Laudo"><span className="whitespace-pre-line">{inspecao.laudo || '—'}</span></Linha>
        </dl>

        <div role="status" aria-live="polite" className="flex items-start gap-2 text-sm">
          <span className="material-symbols-outlined text-[20px] text-navy shrink-0" aria-hidden="true">{analisando ? 'hourglass_top' : 'auto_awesome'}</span>
          {analisando ? <span className="text-ink-3">Analisando o laudo…</span>
            : sugestao ? (
              <span className="min-w-0 text-ink">
                Sugestão da IA: <strong>{ROTULO_MODELO_RESULTADO_BENEFICIOS[sugestao.modelo]}</strong>
                {sugestao.justificativa && <span className="block text-xs text-ink-3">{sugestao.justificativa}</span>}
              </span>
            ) : <span className="text-wine font-semibold">{erroIA}</span>}
        </div>

        <ChoiceGroup<ModeloResultadoBeneficios>
          label="Modelo" required error={erroModelo} value={modelo}
          onChange={m => { setModelo(m); setErroModelo(''); }}
          options={MODELOS_RESULTADO_BENEFICIOS.map(m => ({ value: m, label: ROTULO_MODELO_RESULTADO_BENEFICIOS[m] }))}
        />

        {emailCadastrado ? (
          <p className="text-sm text-ink">Para: <strong className="break-all">{emailCadastrado}</strong></p>
        ) : (
          <Field label="E-mail do inspecionado" required error={erroEmail} help="Sem e-mail no cadastro. O e-mail informado será salvo no cadastro.">
            {a => <input {...a} type="email" value={email} autoComplete="off" onChange={e => { setEmail(e.target.value); setErroEmail(''); }} onKeyDown={e => { if (e.key === 'Enter') void enviar(); }} />}
          </Field>
        )}

        <p className="text-xs text-ink-3">Remetente: JRS-HNRe · cópia para a Secretaria da JRS.</p>
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
