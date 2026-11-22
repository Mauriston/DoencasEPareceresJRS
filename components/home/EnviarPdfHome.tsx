// Ficheiro: components/home/EnviarPdfHome.tsx
// Início (Secretaria) › "Enviar PDF ▾": Exames · Atestados e Laudos. O item abre um modal com o envio de PDF (escolher,
// arrastar) ou a digitalização (BotaoDigitalizar, no celular). Cada PDF é processado em fila: a IA identifica o nome do
// inspecionado, o app procura uma IS aberta ou em andamento dele (utils/enviarPdfHome.ts), a IA lê o documento e o
// registro vai para a IS (a mesma gravação da Ficha). Sem IS ativa: pergunta se abre uma IS (abre o formulário de
// Inspeções de Saúde) ou aborta o envio.
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Dialog, ConfirmDialog } from '../ui/Dialog';
import { MenuAcoes } from '../ui/MenuAcoes';
import { BotaoDigitalizar } from '../scanner/BotaoDigitalizar';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { gravarExameIS, identificarInspecionadoNoPdf, lerExameComIA } from '../../services/examesIS';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import type { MilitarRecord } from '../../services/firestoreMilitares';
import { examesMinimosDaIS, CLASSE_DA_ABA, nomeDoItem, pdfsDaLista } from '../../utils/examesFicha';
import { DESTINOS_PDF_HOME, isAtivaDoInspecionado, mensagemSemIS, militarPeloNome, type DestinoPdfHome } from '../../utils/enviarPdfHome';

type Etapa = 'na_fila' | 'identificando' | 'lendo' | 'pronto' | 'erro' | 'abortado';
interface Envio { id: string; arquivo: File; etapa: Etapa; resumo: string; erro: string }
const ICONE: Record<Etapa, string> = { na_fila: 'schedule', identificando: 'progress_activity', lendo: 'progress_activity', pronto: 'check_circle', erro: 'error', abortado: 'cancel' };
const ROTULO: Record<Etapa, string> = { na_fila: 'Na fila', identificando: 'Identificando o inspecionado…', lendo: 'Lendo com a IA…', pronto: '', erro: '', abortado: 'Não enviado' };

interface Props {
  inspecoes: InspecaoRecord[];
  militares: MilitarRecord[];
  usuario: { uid: string; usuario: string };
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

let seq = 0;

export const EnviarPdfHome: React.FC<Props> = ({ inspecoes, militares, usuario, onAviso }) => {
  const navegar = useNavigate();
  const isDesktop = useIsDesktop();
  const [destino, setDestino] = useState<DestinoPdfHome | null>(null);
  const [envios, setEnviosEstado] = useState<Envio[]>([]);
  const [rodando, setRodando] = useState(false);
  const [semIS, setSemIS] = useState<{ nome: string; militarId: string | null } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const enviosRef = useRef<Envio[]>([]);
  const rodandoRef = useRef(false);
  const decisao = useRef<((abrir: boolean) => void) | null>(null);
  // O que a fila enxerga é sempre o mais recente (a IS pode ser aberta/atualizada durante o envio).
  const inspecoesRef = useRef(inspecoes); inspecoesRef.current = inspecoes;
  const setEnvios = (f: (l: Envio[]) => Envio[]) => { enviosRef.current = f(enviosRef.current); setEnviosEstado(enviosRef.current); };
  const mudar = (id: string, patch: Partial<Envio>) => setEnvios(l => l.map(e => (e.id === id ? { ...e, ...patch } : e)));

  const fechar = () => { if (rodando) return; setDestino(null); setEnvios(() => []); };

  const perguntarAbrirIS = (nome: string) => new Promise<boolean>(resolve => {
    decisao.current = resolve;
    setSemIS({ nome, militarId: militarPeloNome(nome, militares)?.id ?? null });
  });
  const responder = (abrir: boolean) => {
    const militarId = semIS?.militarId;
    setSemIS(null);
    decisao.current?.(abrir); decisao.current = null;
    if (abrir) { setDestino(null); setEnvios(() => []); navegar(`/inspecoes?novo=manual${militarId ? `&inspecionado=${encodeURIComponent(militarId)}` : ''}`); }
  };

  /** Devolve false quando o envio deve ser abortado (sem IS e o usuário não quer abrir uma). */
  const enviarUm = async (e: Envio, d: DestinoPdfHome): Promise<boolean> => {
    try {
      mudar(e.id, { etapa: 'identificando', erro: '' });
      const nome = await identificarInspecionadoNoPdf(e.arquivo);
      if (!nome) throw new Error('A IA não identificou o nome do inspecionado no PDF.');
      const is = isAtivaDoInspecionado<InspecaoRecord>(nome, inspecoesRef.current);
      if (!is) { mudar(e.id, { etapa: 'abortado', erro: '' }); await perguntarAbrirIS(nome); return false; }
      mudar(e.id, { etapa: 'lendo' });
      const leitura = await lerExameComIA(e.arquivo, { examesMinimos: d === 'exames' ? examesMinimosDaIS(is) : [], classeEsperada: CLASSE_DA_ABA[d] });
      await gravarExameIS(is.id, e.arquivo, leitura, usuario);
      mudar(e.id, { etapa: 'pronto', resumo: `IS ${is.is} · ${leitura.itens.map(nomeDoItem).join(' · ')}` });
    } catch (err: any) {
      mudar(e.id, { etapa: 'erro', erro: err?.message || 'Não foi possível enviar.' });
    }
    return true;
  };

  const rodarFila = async (d: DestinoPdfHome) => {
    if (rodandoRef.current) return;
    rodandoRef.current = true; setRodando(true);
    let proximo: Envio | undefined;
    let abortou = false;
    while (!abortou && (proximo = enviosRef.current.find(x => x.etapa === 'na_fila'))) abortou = !(await enviarUm(proximo, d));
    if (abortou) setEnvios(l => l.map(x => (x.etapa === 'na_fila' ? { ...x, etapa: 'abortado' as const } : x)));
    else if (enviosRef.current.length && enviosRef.current.every(x => x.etapa === 'pronto')) onAviso('PDF enviado e vinculado à IS.');
    rodandoRef.current = false; setRodando(false);
  };

  const adicionar = (lista: FileList | File[] | null) => {
    if (!destino) return;
    const { pdfs, ignorados } = pdfsDaLista(lista);
    if (ignorados.length) onAviso('Só arquivos PDF são aceitos.', 'error');
    if (!pdfs.length) return;
    setEnvios(l => [...l, ...pdfs.map(arquivo => ({ id: `e${++seq}`, arquivo, etapa: 'na_fila' as const, resumo: '', erro: '' }))]);
    void rodarFila(destino);
  };

  const t = destino ? DESTINOS_PDF_HOME[destino] : null;
  return (
    <>
      <MenuAcoes
        rotulo="Enviar PDF" botao={{ texto: 'Enviar PDF', icone: 'upload_file' }}
        itens={(Object.keys(DESTINOS_PDF_HOME) as DestinoPdfHome[]).map(k => ({ rotulo: DESTINOS_PDF_HOME[k].rotulo, icone: DESTINOS_PDF_HOME[k].icone, onClick: () => { setEnvios(() => []); setDestino(k); } }))}
      />
      {destino && t && (
        <Dialog
          title={`Enviar PDF — ${t.rotulo}`} icon="upload_file" size="md" travado={rodando} onClose={fechar}
          footer={<Button variant="secondary" onClick={fechar} disabled={rodando}>Fechar</Button>}
        >
          <div className="space-y-3">
            <p className="text-sm text-ink-3">{t.campo}. A IA identifica o inspecionado e vincula o PDF à IS aberta ou em andamento dele.</p>
            <div
              role="button" tabIndex={0} aria-label="Escolher PDFs"
              onClick={() => input.current?.click()}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); adicionar(e.dataTransfer.files); }}
              className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line p-6 text-center cursor-pointer hover:bg-thead"
            >
              <span className="material-symbols-outlined text-navy" aria-hidden>upload_file</span>
              <span className="text-sm font-semibold text-ink">Toque para escolher ou arraste os PDFs</span>
            </div>
            <input ref={input} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={e => { adicionar(e.target.files); e.target.value = ''; }} />
            {!isDesktop && <BotaoDigitalizar fullWidth nomeBase={destino === 'exames' ? 'exames' : 'atestado'} titulo={`Digitalizar · ${t.campo}`} onPdf={f => adicionar([f])} />}
            {envios.length > 0 && (
              <ul className="divide-y divide-line">
                {envios.map(e => (
                  <li key={e.id} className="flex items-start gap-2 py-2">
                    <span className={`material-symbols-outlined text-[20px] ${e.etapa === 'erro' ? 'text-wine' : e.etapa === 'pronto' ? 'text-success' : 'text-ink-3'}`} aria-hidden>{ICONE[e.etapa]}</span>
                    <span className="min-w-0 text-sm">
                      <span className="block font-semibold text-ink break-words">{e.arquivo.name}</span>
                      <span className={`block text-xs break-words ${e.etapa === 'erro' ? 'text-wine' : 'text-ink-3'}`}>{e.erro || e.resumo || ROTULO[e.etapa]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Dialog>
      )}
      {semIS && (
        <ConfirmDialog
          title="Sem IS aberta" message={mensagemSemIS(semIS.nome)} confirmLabel="Abrir IS" cancelLabel="Cancelar envio"
          onConfirm={() => responder(true)} onCancel={() => responder(false)}
        />
      )}
    </>
  );
};
