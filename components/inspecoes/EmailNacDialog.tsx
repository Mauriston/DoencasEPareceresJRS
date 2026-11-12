// Ficheiro: components/inspecoes/EmailNacDialog.tsx
// Escolha das IS a enviar ao NAC (finalizadas de Verificações e Términos ainda sem e-mail): lista de seleção múltipla,
// todas marcadas de início, com "Marcar todas / Desmarcar todas" e o período (laudo mais antigo → mais recente)
// das marcadas. Envia "INSPEÇÕES DE SAÚDE VDF E TÉRMINOS" com o anexo em PDF (servidor/email/nac.ts).
import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import { enviarEmailNac } from '../../services/emailNac';
import { dataBrNac, periodoNac } from '../../utils/emailNac';

interface Props {
  /** IS pendentes (utils/emailNac.ts: pendentesNac), da mais antiga para a mais recente. */
  pendentes: InspecaoRecord[];
  onClose: () => void;
  onEnviado: (msg: string, tom?: 'success' | 'error') => void;
}

export const EmailNacDialog: React.FC<Props> = ({ pendentes, onClose, onEnviado }) => {
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set(pendentes.map(i => i.id)));
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const todas = pendentes.length > 0 && pendentes.every(i => marcadas.has(i.id));
  const escolhidas = pendentes.filter(i => marcadas.has(i.id));
  const periodo = periodoNac(escolhidas.map(i => i.dataLaudo));

  const alternar = (id: string) => setMarcadas(m => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const alternarTodas = () => setMarcadas(todas ? new Set() : new Set(pendentes.map(i => i.id)));

  const enviar = async () => {
    if (!escolhidas.length) { setErro('Marque ao menos uma IS.'); return; }
    setEnviando(true); setErro('');
    try {
      const r = await enviarEmailNac(escolhidas.map(i => i.id));
      onEnviado(`E-mail ao NAC enviado com ${r.enviados} IS (${r.periodo.inicio} a ${r.periodo.fim}).`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar o e-mail.');
      setEnviando(false);
    }
  };

  return (
    <Dialog
      title="E-mail ao NAC"
      icon="assignment_turned_in"
      size="md"
      onClose={() => { if (!enviando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button icon="send" loading={enviando} disabled={!escolhidas.length} onClick={enviar}>
            {escolhidas.length ? `Enviar (${escolhidas.length})` : 'Enviar'}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-3">Envia à encarregada do NAC (Núcleo de Avaliação e Controle), com cópia para os militares do NAC e a JRS, as IS finalizadas de Verificações e Términos ainda não enviadas, com o anexo em PDF.</p>

        {pendentes.length === 0 ? (
          <p className="text-sm text-ink-3">Nenhuma IS pendente de envio ao NAC.</p>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-semibold text-ink-3">
                {escolhidas.length} de {pendentes.length} marcada{pendentes.length !== 1 ? 's' : ''}
                {escolhidas.length > 0 && periodo.inicio ? ` · período ${periodo.inicio} a ${periodo.fim}` : ''}
              </p>
              <button type="button" onClick={alternarTodas} className="min-h-[44px] px-2 text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">
                {todas ? 'Desmarcar todas' : 'Marcar todas'}
              </button>
            </div>
            <ul className="max-h-72 overflow-y-auto rounded-xl border border-line divide-y divide-line">
              {pendentes.map(i => (
                <li key={i.id}>
                  <label className="flex items-start gap-3 px-3 py-2 min-h-[44px] cursor-pointer hover:bg-thead">
                    <input type="checkbox" className="w-5 h-5 mt-0.5 shrink-0 accent-navy" checked={marcadas.has(i.id)} onChange={() => alternar(i.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink break-words">{i.inspecionado}</span>
                      <span className="block text-xs text-ink-3">IS {i.is} · laudo {dataBrNac(i.dataLaudo) || '—'} · {i.finalidade}</span>
                      {i.laudo && <span className="block text-xs text-ink-2 break-words">{i.laudo}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};
