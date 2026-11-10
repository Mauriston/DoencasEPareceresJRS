// Ficheiro: components/inspecoes/exames/EnviarExamesISDialog.tsx
// "Exames" no detalhe da IS: escolhe um ou mais PDFs; cada um é lido pela IA (que identifica o documento
// e transcreve o laudo) e, lido, vai para o Storage/Firestore (services/examesIS.ts). Um PDF que falha
// fica na lista com o motivo e "Tentar de novo"; os demais seguem.
import React, { useRef, useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { gravarExameIS, lerExameComIA, MAX_PDF_EXAME_MB } from '../../../services/examesIS';
import { ROTULO_TIPO } from '../../../utils/examesIS';

type Etapa = 'na_fila' | 'lendo' | 'enviando' | 'pronto' | 'erro';
interface Envio { id: string; arquivo: File; etapa: Etapa; resumo: string; erro: string }

interface Props {
  isId: string;
  usuario: { uid: string; usuario: string };
  onClose: () => void;
}

let seq = 0;

export const EnviarExamesISDialog: React.FC<Props> = ({ isId, usuario, onClose }) => {
  const [envios, setEnviosEstado] = useState<Envio[]>([]);
  const [rodando, setRodando] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // A fila anda sozinha: arquivos escolhidos (ou "Tentar de novo") durante um envio entram nela.
  const enviosRef = useRef<Envio[]>([]);
  const rodandoRef = useRef(false);
  const setEnvios = (f: (l: Envio[]) => Envio[]) => { enviosRef.current = f(enviosRef.current); setEnviosEstado(enviosRef.current); };
  const mudar = (id: string, patch: Partial<Envio>) => setEnvios(l => l.map(e => (e.id === id ? { ...e, ...patch } : e)));

  const enviarUm = async (e: Envio) => {
    try {
      if (e.arquivo.type !== 'application/pdf' && !/\.pdf$/i.test(e.arquivo.name)) throw new Error('Não é PDF.');
      mudar(e.id, { etapa: 'lendo', erro: '' });
      const leitura = await lerExameComIA(e.arquivo);
      mudar(e.id, { etapa: 'enviando' });
      await gravarExameIS(isId, e.arquivo, leitura, usuario);
      mudar(e.id, { etapa: 'pronto', resumo: leitura.itens.map(i => i.titulo || ROTULO_TIPO[i.tipo]).join(' · ') });
    } catch (err: any) {
      mudar(e.id, { etapa: 'erro', erro: err?.message || 'Não foi possível enviar.' });
    }
  };

  const rodarFila = async () => {
    if (rodandoRef.current) return;
    rodandoRef.current = true; setRodando(true);
    let proximo: Envio | undefined;
    while ((proximo = enviosRef.current.find(e => e.etapa === 'na_fila'))) await enviarUm(proximo);
    rodandoRef.current = false; setRodando(false);
  };

  const adicionar = (arquivos: File[]) => {
    if (!arquivos.length) return;
    setEnvios(l => [...l, ...arquivos.map(arquivo => ({ id: `e${++seq}`, arquivo, etapa: 'na_fila' as Etapa, resumo: '', erro: '' }))]);
    void rodarFila();
  };

  const tentarDeNovo = (e: Envio) => { mudar(e.id, { etapa: 'na_fila', erro: '' }); void rodarFila(); };

  const rotulo: Record<Etapa, string> = { na_fila: 'Na fila', lendo: 'Lendo…', enviando: 'Enviando…', pronto: '', erro: '' };

  return (
    <Dialog
      title="Enviar exames" icon="upload_file" size="md" onClose={() => { if (!rodando) onClose(); }} travado={rodando}
      footer={(
        <>
          <Button onClick={onClose} disabled={rodando}>Concluir</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <button
          type="button" onClick={() => input.current?.click()}
          className="w-full border-2 border-dashed border-line rounded-xl py-6 flex flex-col items-center justify-center gap-1 text-ink-3 hover:border-navy hover:text-navy transition-colors bg-paper/50"
        >
          <span className="material-symbols-outlined text-[32px]" aria-hidden="true">upload_file</span>
          <span className="text-sm font-semibold">Selecionar PDFs</span>
          <span className="text-xs opacity-60">Um ou mais · até {MAX_PDF_EXAME_MB} MB cada</span>
        </button>
        <input ref={input} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={e => { adicionar(Array.from(e.target.files || [])); e.target.value = ''; }} />

        {envios.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line" aria-live="polite">
            {envios.map(e => (
              <li key={e.id} className="flex items-start gap-3 px-3 py-2 min-h-[44px]">
                <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${e.etapa === 'pronto' ? 'text-green-700' : e.etapa === 'erro' ? 'text-wine' : 'text-ink-3'}`} aria-hidden="true">
                  {e.etapa === 'pronto' ? 'check_circle' : e.etapa === 'erro' ? 'error' : e.etapa === 'na_fila' ? 'schedule' : 'progress_activity'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink truncate">{e.arquivo.name}</span>
                  {e.etapa === 'pronto' && <span className="block text-xs text-ink-3">{e.resumo}</span>}
                  {e.etapa === 'erro' && <span className="block text-xs font-semibold text-wine" role="alert">{e.erro}</span>}
                  {rotulo[e.etapa] && <span className="block text-xs text-ink-3">{rotulo[e.etapa]}</span>}
                </span>
                {e.etapa === 'erro' && <IconButton icon="refresh" label="Tentar de novo" variant="secondary" onClick={() => tentarDeNovo(e)} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
};
