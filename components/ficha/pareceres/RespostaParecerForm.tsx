// Ficheiro: components/ficha/pareceres/RespostaParecerForm.tsx
// "Resposta de Parecer" (Ficha do inspecionado › Pareceres, ?criar=resposta&is=<isId>): painel "Criar novo" com
// o envio do PDF da resposta (clique, arrastar e soltar ou colar com Ctrl+V), a escolha do pedido de parecer
// pendente daquela IS (quando há mais de um) e o envio: a IA transcreve a resposta, o PDF vai para o Storage e a
// resposta fica gravada no pedido, que passa a CONCLUÍDO (services/respostaParecer.ts). No painel principal em
// telas grandes; no celular, bottom sheet (CascaFormulario).
import React, { useEffect, useRef, useState } from 'react';
import { CascaFormulario, type CascaForm } from '../CascaFormulario';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { EmptyState } from '../../ui/EmptyState';
import { AcoesRodape, submeterFormulario } from '../../ui/AcoesRodape';
import { ehPdf, gravarRespostaParecer, lerRespostaComIA } from '../../../services/respostaParecer';
import { BotaoDigitalizar } from '../../scanner/BotaoDigitalizar';
import { LIMITE_PDF_MB, erroTamanhoPdf, formatarTamanho } from '../../../config/limitePdf';
import type { ParecerRecord } from '../../../services/firestorePareceres';

const ID_FORM = 'form-resposta-parecer';
const dataDe = (p: ParecerRecord) => p.criadoEm?.toDate?.().toLocaleDateString('pt-BR') ?? 'agora';

interface Props {
  casca: CascaForm;
  /** Pedidos sem resposta (da IS do link; sem IS, os do inspecionado), do mais antigo para o mais recente. */
  pendentes: ParecerRecord[];
  /** Pedido já escolhido (ex.: "Enviar resposta" no painel de um pedido). */
  inicialId?: string | null;
  /** Número da IS do link (só para o texto). */
  is?: number | null;
  usuario: { uid: string; usuario: string; nome: string };
  onClose: () => void;
  onEnviada: (pedido: ParecerRecord) => void;
}

export const RespostaParecerForm: React.FC<Props> = ({ casca, pendentes: pendentesAoVivo, inicialId, is, usuario, onClose, onEnviada }) => {
  // Durante o envio a lista fica congelada: gravada a resposta, o pedido sai dos pendentes antes de o painel fechar.
  const [congelados, setCongelados] = useState<ParecerRecord[] | null>(null);
  const pendentes = congelados ?? pendentesAoVivo;
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [pedidoId, setPedidoId] = useState(() => (inicialId && pendentes.some(p => p.id === inicialId) ? inicialId : pendentes.length === 1 ? pendentes[0].id : ''));
  const [etapa, setEtapa] = useState<'' | 'lendo' | 'salvando'>('');
  const [erro, setErro] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const ocupado = etapa !== '';

  // A lista chega depois (ou muda): com um pedido só, já vem escolhido.
  useEffect(() => {
    if (pedidoId && pendentes.some(p => p.id === pedidoId)) return;
    setPedidoId(inicialId && pendentes.some(p => p.id === inicialId) ? inicialId : pendentes.length === 1 ? pendentes[0].id : '');
  }, [pendentes, inicialId]); // eslint-disable-line react-hooks/exhaustive-deps

  const escolher = (lista: File[]) => {
    if (ocupado || !lista.length) return;
    const pdf = lista.find(ehPdf);
    if (!pdf) { setErro('Envie a resposta em PDF.'); return; }
    const e = erroTamanhoPdf(pdf.size, pdf.name || 'O PDF');
    if (e) { setErro(e); return; }
    setArquivo(pdf); setErro('');
  };

  // Ctrl+V com um PDF copiado (ex.: do explorador de arquivos).
  useEffect(() => {
    const aoColar = (e: ClipboardEvent) => {
      const arquivos = Array.from(e.clipboardData?.files ?? []);
      if (!arquivos.length) return;
      e.preventDefault();
      escolher(arquivos);
    };
    window.addEventListener('paste', aoColar);
    return () => window.removeEventListener('paste', aoColar);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const pedido = pendentes.find(p => p.id === pedidoId);
    if (!arquivo) { setErro('Escolha o PDF da resposta.'); return; }
    if (!pedido) { setErro('Escolha o pedido de parecer respondido.'); return; }
    setErro('');
    setCongelados(pendentes);
    try {
      setEtapa('lendo');
      const leitura = await lerRespostaComIA(arquivo);
      setEtapa('salvando');
      await gravarRespostaParecer(pedido, arquivo, leitura, usuario);
      onEnviada(pedido);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar a resposta.');
      setEtapa('');
      setCongelados(null);
    }
  };

  const rotuloEnvio = etapa === 'lendo' ? 'Lendo com IA…' : etapa === 'salvando' ? 'Salvando…' : 'Enviar resposta';

  return (
    <CascaFormulario
      casca={casca} title="Resposta de Parecer" icon="upload_file" onClose={() => { if (!ocupado) onClose(); }}
      footer={pendentes.length ? (
        <>
          <Button variant="secondary" className="max-md:hidden" onClick={onClose} disabled={ocupado}>Cancelar</Button>
          <AcoesRodape acoes={[{ id: 'salvar', rotulo: rotuloEnvio, icone: 'send', onClick: () => submeterFormulario(ID_FORM), loading: ocupado, disabled: !arquivo || !pedidoId }]} />
        </>
      ) : <Button variant="secondary" onClick={onClose}>Fechar</Button>}
    >
      {pendentes.length === 0 ? (
        <EmptyState icon="assignment_turned_in" title="Nenhum pedido de parecer pendente"
          description={is ? `A IS ${is} não tem pedido de parecer aguardando resposta. Gere o pedido antes de enviar a resposta.` : 'Não há pedido de parecer aguardando resposta.'} />
      ) : (
        <form id={ID_FORM} onSubmit={enviar} noValidate className="space-y-5">
          {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}

          {pendentes.length > 1 ? (
            <fieldset>
              <legend className="block text-xs font-semibold text-ink-3 mb-1">Pedido respondido<span className="text-wine ml-0.5" aria-hidden="true">*</span></legend>
              <div className="rounded-lg border border-line divide-y divide-line">
                {pendentes.map(p => (
                  <label key={p.id} className="flex items-start gap-3 px-3 py-2.5 min-h-[44px] cursor-pointer hover:bg-thead">
                    <input type="radio" name="pedido" value={p.id} checked={pedidoId === p.id} disabled={ocupado}
                      onChange={() => { setPedidoId(p.id); setErro(''); }} className="mt-1 accent-navy" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-navy">Parecer de {p.especialidade}</span>
                      <span className="block text-xs text-ink-3">{[p.is ? `IS ${p.is}` : '', `solicitado em ${dataDe(p)}`, p.finalidade].filter(Boolean).join(' · ')}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <p className="text-sm text-ink">
              Resposta ao <strong className="text-navy">Parecer de {pendentes[0].especialidade}</strong>
              <span className="text-ink-3"> · {[pendentes[0].is ? `IS ${pendentes[0].is}` : '', `solicitado em ${dataDe(pendentes[0])}`].filter(Boolean).join(' · ')}</span>
            </p>
          )}

          <div>
            <span className="block text-xs font-semibold text-ink-3 mb-1">PDF da resposta<span className="text-wine ml-0.5" aria-hidden="true">*</span></span>
            {arquivo ? (
              <div className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 min-h-[44px]">
                <span className="material-symbols-outlined text-[22px] text-navy shrink-0" aria-hidden="true">picture_as_pdf</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink truncate">{arquivo.name || 'resposta.pdf'}</span>
                  <span className="block text-xs text-ink-3">{formatarTamanho(arquivo.size)}</span>
                </span>
                <IconButton icon="close" label="Trocar o PDF" variant="ghost" onClick={() => setArquivo(null)} disabled={ocupado} />
              </div>
            ) : (
              <button
                type="button" onClick={() => input.current?.click()} disabled={ocupado}
                onDragOver={e => { e.preventDefault(); setArrastando(true); }}
                onDragLeave={() => setArrastando(false)}
                onDrop={e => { e.preventDefault(); setArrastando(false); escolher(Array.from(e.dataTransfer.files)); }}
                className={`w-full border-2 border-dashed rounded-xl py-8 flex flex-col items-center justify-center gap-1 transition-colors bg-paper/50 ${arrastando ? 'border-navy text-navy' : 'border-line text-ink-3 hover:border-navy hover:text-navy'}`}
              >
                <span className="material-symbols-outlined text-[32px]" aria-hidden="true">upload_file</span>
                <span className="text-sm font-semibold">Selecionar, arrastar ou colar (Ctrl+V) o PDF</span>
                <span className="text-xs opacity-60">Um PDF · até {LIMITE_PDF_MB} MB</span>
              </button>
            )}
            <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => { escolher(Array.from(e.target.files || [])); e.target.value = ''; }} />
            {!arquivo && <BotaoDigitalizar className="mt-2" fullWidth disabled={ocupado} nomeBase="resposta-parecer" titulo="Digitalizar a resposta do parecer" onPdf={f => escolher([f])} />}
            <p className="mt-1 text-xs text-ink-3">A IA transcreve a resposta; o pedido passa a Concluído.</p>
          </div>
        </form>
      )}
    </CascaFormulario>
  );
};
