// Ficheiro: components/inspecoes/guias/EnviarGuiasDialog.tsx
// Envio das guias de exames por e-mail (Zimbra, servidor/email/guiasIS.ts) — o mesmo dialog depois de abrir a IS
// (`perguntar`: começa com "Enviar guias por e-mail?" Sim / Não) e no botão "Enviar/Reenviar por e-mail" do
// detalhe. Caixas "Zimbra para o inspecionado" (sem e-mail no cadastro, pede o e-mail, salvo no cadastro pelo
// servidor) e "Zimbra para a SEC-JRS" (abre as caixas dos user_secretaria, rótulo = usuário, nunca o e-mail).
// Só Admin e Secretaria (inspecoes.enviarEmails).
// `destino` (Ficha › Guias, botão "Enviar por email" ▾): já escolhe o destinatário e mostra só ele.
import React, { useEffect, useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import { enviarGuiasPorEmail, listarUsuariosSecretaria, type UsuarioSecretaria } from '../../../services/emailGuiasIS';
import { emailValido } from '../../../services/emailResultadoIS';
import { erroEscolhaEnvioGuias, mensagemEnvioGuias } from '../../../utils/guiasExamesIS';

interface Props {
  inspecao: Pick<InspecaoRecord, 'id' | 'is' | 'inspecionado'>;
  /** E-mail do cadastro ('' = sem e-mail). */
  emailCadastrado: string;
  /** Começa perguntando "Enviar guias por e-mail?" (fluxo da abertura da IS). */
  perguntar?: boolean;
  /** Destinatário já escolhido (o dialog mostra só ele): 'inspecionado' ou 'secretaria'. */
  destino?: 'inspecionado' | 'secretaria';
  onClose: () => void;
  onEnviado: (msg: string) => void;
}

/** Caixa de seleção de 44 px (padrão dos dialogs de envio). */
const Caixa: React.FC<{ checked: boolean; onChange: () => void; children: React.ReactNode; destaque?: boolean }> = ({ checked, onChange, children, destaque }) => (
  <label className="flex items-center gap-3 px-3 min-h-[44px] cursor-pointer rounded-lg hover:bg-thead">
    <input type="checkbox" className="w-5 h-5 shrink-0 accent-navy" checked={checked} onChange={onChange} />
    <span className={`text-sm ${destaque ? 'font-bold text-navy' : 'font-semibold text-ink'} break-words`}>{children}</span>
  </label>
);

export const EnviarGuiasDialog: React.FC<Props> = ({ inspecao, emailCadastrado, perguntar = false, destino, onClose, onEnviado }) => {
  const [etapa, setEtapa] = useState<'pergunta' | 'escolha'>(perguntar ? 'pergunta' : 'escolha');
  const [paraInspecionado, setParaInspecionado] = useState(destino === 'inspecionado');
  const [paraSecretaria, setParaSecretaria] = useState(destino === 'secretaria');
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [email, setEmail] = useState('');
  const [secretaria, setSecretaria] = useState<UsuarioSecretaria[] | null>(null);
  const [erroLista, setErroLista] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Lista da SEC-JRS só quando a caixa é marcada.
  useEffect(() => {
    if (!paraSecretaria || secretaria) return;
    let vivo = true;
    setErroLista('');
    listarUsuariosSecretaria()
      .then(l => { if (vivo) setSecretaria(l); })
      .catch((e: any) => { if (vivo) setErroLista(e?.message || 'Não foi possível carregar a SEC-JRS.'); });
    return () => { vivo = false; };
  }, [paraSecretaria, secretaria]);

  const alternar = (uid: string) => setMarcados(m => { const n = new Set(m); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });

  const enviar = async () => {
    const escolha = { inspecionado: paraInspecionado, secretaria: paraSecretaria, secretariaUids: paraSecretaria ? [...marcados] : [], email };
    const e = erroEscolhaEnvioGuias(escolha, emailCadastrado, emailValido);
    if (e) { setErro(e); return; }
    setEnviando(true); setErro('');
    try {
      const r = await enviarGuiasPorEmail({
        isId: inspecao.id, inspecionado: paraInspecionado, secretariaUids: escolha.secretariaUids,
        ...(paraInspecionado && !emailCadastrado ? { email } : {}),
      });
      onEnviado(mensagemEnvioGuias(inspecao.is, r));
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível enviar as guias.');
      setEnviando(false);
    }
  };

  if (etapa === 'pergunta') {
    return (
      <Dialog
        title="Enviar guias por e-mail?"
        icon="forward_to_inbox"
        size="sm"
        onClose={onClose}
        footer={(
          <>
            <Button variant="secondary" onClick={onClose}>Não</Button>
            <Button icon="check" onClick={() => setEtapa('escolha')}>Sim</Button>
          </>
        )}
      >
        <p className="text-sm text-ink">As guias dos exames da IS {inspecao.is} foram geradas. Enviar pelo Zimbra ao inspecionado e/ou à SEC-JRS?</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      title={destino === 'inspecionado' ? `Guias ao inspecionado — IS ${inspecao.is}` : destino === 'secretaria' ? `Guias à SEC-JRS — IS ${inspecao.is}` : `Guias por e-mail — IS ${inspecao.is}`}
      icon="forward_to_inbox"
      size="md"
      onClose={() => { if (!enviando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button icon="send" loading={enviando} onClick={enviar}>Enviar</Button>
        </>
      )}
    >
      <div className="space-y-3">
        <p className="text-sm text-ink break-words">{inspecao.inspecionado}</p>
        <fieldset className="space-y-1">
          <legend className="sr-only">Para quem enviar</legend>
          {destino === 'secretaria' && <p className="px-3 text-sm font-semibold text-ink">Escolha os membros da SEC-JRS:</p>}
          {!destino && <Caixa checked={paraInspecionado} onChange={() => { setParaInspecionado(v => !v); setErro(''); }} destaque>Zimbra para o inspecionado</Caixa>}
          {paraInspecionado && (
            <div className={`${destino ? 'px-3' : 'pl-11 pr-3'} pb-2 animate-fade-in`}>
              {emailCadastrado
                ? <p className="text-xs text-ink-3">Para: <strong className="text-ink break-all">{emailCadastrado}</strong> · a entrega das guias fica registrada.</p>
                : (
                  <Field label="E-mail do inspecionado" required help="Sem e-mail no cadastro. Será salvo no cadastro.">
                    {a => <input {...a} type="email" value={email} autoComplete="off" autoFocus onChange={e => { setEmail(e.target.value); setErro(''); }} />}
                  </Field>
                )}
            </div>
          )}
          {!destino && <Caixa checked={paraSecretaria} onChange={() => { setParaSecretaria(v => !v); setErro(''); }} destaque>Zimbra para a SEC-JRS</Caixa>}
          {paraSecretaria && (
            <div className={`${destino ? '' : 'pl-8'} animate-fade-in`}>
              {erroLista ? <p role="alert" className="px-3 py-2 text-sm font-semibold text-wine">{erroLista}</p>
                : secretaria === null ? <p role="status" className="px-3 py-2 text-sm text-ink-3">Carregando a SEC-JRS…</p>
                  : secretaria.length === 0 ? <p className="px-3 py-2 text-sm text-ink-3">Nenhum membro da SEC-JRS com e-mail institucional.</p>
                    : (
                      <fieldset className="grid grid-cols-1 sm:grid-cols-2">
                        <legend className="sr-only">Membros da SEC-JRS</legend>
                        {secretaria.map(u => (
                          <Caixa key={u.uid} checked={marcados.has(u.uid)} onChange={() => { alternar(u.uid); setErro(''); }}>{u.usuario}</Caixa>
                        ))}
                      </fieldset>
                    )}
            </div>
          )}
        </fieldset>
        <p className="text-xs text-ink-3">Anexo: guias em PDF.</p>
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
