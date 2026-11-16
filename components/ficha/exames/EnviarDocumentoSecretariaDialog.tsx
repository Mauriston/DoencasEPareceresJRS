// Ficheiro: components/ficha/exames/EnviarDocumentoSecretariaDialog.tsx
// "Zimbra SEC-JRS" (Ficha › Exames / Atestados e Laudos): escolhe os membros da SEC-JRS (user_secretaria ativos com
// e-mail institucional; a caixa mostra o `usuario`, nunca o e-mail — como o EnviarGuiasDialog com
// destino='secretaria') e envia o PDF do documento para impressão (services/emailDocumentoIS.ts).
import React, { useEffect, useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { enviarDocumentoSecretaria, listarUsuariosSecretaria, type UsuarioSecretaria } from '../../../services/emailDocumentoIS';
import { erroEscolhaSecretaria } from '../../../utils/examesFicha';

interface Props {
  isId: string;
  numeroIs: number;
  exameId: string;
  /** Nome do documento (cabeçalho do dialog). */
  documento: string;
  onClose: () => void;
  onEnviado: (msg: string) => void;
}

export const EnviarDocumentoSecretariaDialog: React.FC<Props> = ({ isId, numeroIs, exameId, documento, onClose, onEnviado }) => {
  const [secretaria, setSecretaria] = useState<UsuarioSecretaria[] | null>(null);
  const [erroLista, setErroLista] = useState('');
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    listarUsuariosSecretaria()
      .then(l => { if (vivo) setSecretaria(l); })
      .catch((e: any) => { if (vivo) setErroLista(e?.message || 'Não foi possível carregar a SEC-JRS.'); });
    return () => { vivo = false; };
  }, []);

  const alternar = (uid: string) => { setErro(''); setMarcados(m => { const n = new Set(m); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; }); };

  const enviar = async () => {
    const uids = [...marcados];
    const e = erroEscolhaSecretaria(uids);
    if (e) { setErro(e); return; }
    setEnviando(true); setErro('');
    try {
      const r = await enviarDocumentoSecretaria({ isId, exameId, secretariaUids: uids });
      const n = r.paraSecretaria.length || uids.length;
      onEnviado(`PDF enviado à SEC-JRS (${n} destinatário${n !== 1 ? 's' : ''}) para impressão.`);
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível enviar o PDF.');
      setEnviando(false);
    }
  };

  return (
    <Dialog
      title={`PDF à SEC-JRS — IS ${numeroIs}`} icon="forward_to_inbox" size="md" travado={enviando}
      onClose={() => { if (!enviando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button icon="send" loading={enviando} onClick={enviar}>Enviar</Button>
        </>
      )}
    >
      <div className="space-y-3">
        <p className="text-sm text-ink break-words"><strong className="text-navy">{documento}</strong> · para impressão</p>
        <p className="text-sm font-semibold text-ink">Escolha os membros da SEC-JRS:</p>
        {erroLista ? <p role="alert" className="py-2 text-sm font-semibold text-wine">{erroLista}</p>
          : secretaria === null ? <p role="status" className="py-2 text-sm text-ink-3">Carregando a SEC-JRS…</p>
            : secretaria.length === 0 ? <p className="py-2 text-sm text-ink-3">Nenhum membro da SEC-JRS com e-mail institucional.</p>
              : (
                <fieldset className="grid grid-cols-1 sm:grid-cols-2 -mx-3">
                  <legend className="sr-only">Membros da SEC-JRS</legend>
                  {secretaria.map(u => (
                    <label key={u.uid} className="flex items-center gap-3 px-3 min-h-[44px] cursor-pointer rounded-lg hover:bg-thead">
                      <input type="checkbox" className="w-5 h-5 shrink-0 accent-navy" checked={marcados.has(u.uid)} onChange={() => alternar(u.uid)} />
                      <span className="text-sm font-semibold text-ink break-words">{u.usuario}</span>
                    </label>
                  ))}
                </fieldset>
              )}
        <p className="text-xs text-ink-3">Anexo: o PDF do documento. Remetente e resposta: você.</p>
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
