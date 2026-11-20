// Ficheiro: components/ficha/exames/PainelCriarDocumentos.tsx
// Ficha do inspecionado › abas Exames e Atestados e Laudos — estado "Criar novo" (?criar=<aba>&is=<isId>, aberto
// pelo botão "Enviar PDF" da aba IS; só com IS NÃO finalizada — utils/examesFicha.ts → isParaCriar).
// Campo de upload de PDF: clicar e escolher, arrastar OU colar (Ctrl+V de arquivo em qualquer ponto da página
// enquanto o painel está aberto — evento paste com clipboardData.files). Um ou mais arquivos; cada PDF é
// processado sozinho, em fila: a IA lê e identifica o documento (a mesma leitura de services/examesIS.ts, com os
// exames mínimos da finalidade da IS para enquadrar e a aba como classificação), o PDF vai para o Storage e o
// registro para o Firestore À MEDIDA que fica pronto — o histórico da aba mostra cada um sem esperar os demais.
// Progresso por arquivo; um PDF que falha fica na lista com o motivo e "Tentar de novo".
// Telas grandes: no painel principal (CascaFormulario "inline"); no celular, bottom sheet (Drawer).
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { StatusTag } from '../../ui/StatusTag';
import { CascaFormulario, type CascaForm } from '../CascaFormulario';
import { gravarExameIS, lerExameComIA } from '../../../services/examesIS';
import { BotaoDigitalizar } from '../../scanner/BotaoDigitalizar';
import { LIMITE_PDF_BYTES, LIMITE_PDF_MB } from '../../../config/limitePdf';
import { CLASSE_DA_ABA, nomeDoItem, pdfsDaLista, type AbaDocumentoFicha } from '../../../utils/examesFicha';

type Etapa = 'na_fila' | 'lendo' | 'enviando' | 'pronto' | 'erro';
interface Envio { id: string; arquivo: File; etapa: Etapa; resumo: string; erro: string; exameId?: string }

interface Props {
  aba: AbaDocumentoFicha;
  is: { id: string; is: number; finalidade?: string };
  /** Exames mínimos da finalidade (utils/examesFicha.ts → examesMinimosDaIS); vazio nos Atestados e Laudos. */
  examesMinimos: string[];
  /** Exames mínimos já recebidos nesta IS (marcados na lista). */
  recebidos: ReadonlyArray<string>;
  usuario: { uid: string; usuario: string };
  casca: CascaForm;
  /** Sai do "Criar novo" (a aba volta ao registro mais recente). */
  onClose: () => void;
  /** Abre um registro gravado (id do histórico: "{isId}:{exameId}"). */
  onAbrir: (registroId: string) => void;
}

const TEXTO: Record<AbaDocumentoFicha, { titulo: string; icone: string; campo: string }> = {
  exames: { titulo: 'Enviar exames', icone: 'lab_profile', campo: 'Laudos e resultados de exames' },
  atestados: { titulo: 'Enviar atestados e laudos', icone: 'note_alt', campo: 'Atestados, relatórios e laudos médicos' },
};
const ROTULO_ETAPA: Record<Etapa, string> = { na_fila: 'Na fila', lendo: 'Lendo com a IA…', enviando: 'Salvando…', pronto: '', erro: '' };
const ICONE_ETAPA: Record<Etapa, string> = { na_fila: 'schedule', lendo: 'progress_activity', enviando: 'cloud_upload', pronto: 'check_circle', erro: 'error' };

let seq = 0;

export const PainelCriarDocumentos: React.FC<Props> = ({ aba, is, examesMinimos, recebidos, usuario, casca, onClose, onAbrir }) => {
  const [envios, setEnviosEstado] = useState<Envio[]>([]);
  const [rodando, setRodando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [aviso, setAviso] = useState('');
  const input = useRef<HTMLInputElement>(null);
  // A fila anda sozinha: arquivos escolhidos (ou "Tentar de novo") durante um envio entram nela.
  const enviosRef = useRef<Envio[]>([]);
  const rodandoRef = useRef(false);
  const setEnvios = (f: (l: Envio[]) => Envio[]) => { enviosRef.current = f(enviosRef.current); setEnviosEstado(enviosRef.current); };
  const mudar = (id: string, patch: Partial<Envio>) => setEnvios(l => l.map(e => (e.id === id ? { ...e, ...patch } : e)));
  const classe = CLASSE_DA_ABA[aba];
  const t = TEXTO[aba];

  const enviarUm = async (e: Envio) => {
    try {
      mudar(e.id, { etapa: 'lendo', erro: '' });
      const leitura = await lerExameComIA(e.arquivo, { examesMinimos: aba === 'exames' ? examesMinimos : [], classeEsperada: classe });
      mudar(e.id, { etapa: 'enviando' });
      const exameId = await gravarExameIS(is.id, e.arquivo, leitura, usuario);
      mudar(e.id, { etapa: 'pronto', exameId, resumo: leitura.itens.map(nomeDoItem).join(' · ') });
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

  const adicionar = (lista: ArrayLike<File> | null | undefined) => {
    const { pdfs: todos, ignorados } = pdfsDaLista(lista);
    // Limite único de 10 MB por PDF (config/limitePdf.ts): os maiores ficam de fora, com aviso.
    const grandes = todos.filter(f => f.size >= LIMITE_PDF_BYTES);
    const pdfs = todos.filter(f => f.size < LIMITE_PDF_BYTES);
    setAviso([
      ignorados.length ? `Ignorado${ignorados.length > 1 ? 's' : ''} (não é PDF): ${ignorados.map(f => f.name || 'arquivo colado').join(', ')}.` : '',
      grandes.length ? `Acima de ${LIMITE_PDF_MB} MB (divida o PDF ou digitalize): ${grandes.map(f => f.name || 'arquivo colado').join(', ')}.` : '',
    ].filter(Boolean).join(' '));
    if (!pdfs.length) return;
    setEnvios(l => [...l, ...pdfs.map(arquivo => ({ id: `d${++seq}`, arquivo, etapa: 'na_fila' as Etapa, resumo: '', erro: '' }))]);
    void rodarFila();
  };
  const adicionarRef = useRef(adicionar);
  adicionarRef.current = adicionar;

  // Colar (Ctrl+V) arquivos em qualquer ponto da página enquanto o painel está aberto. Texto colado em campos
  // segue normal: só tratamos o evento quando ele traz arquivos.
  useEffect(() => {
    const aoColar = (ev: ClipboardEvent) => {
      const arquivos = ev.clipboardData?.files;
      if (!arquivos || arquivos.length === 0) return;
      ev.preventDefault();
      adicionarRef.current(arquivos);
    };
    document.addEventListener('paste', aoColar);
    return () => document.removeEventListener('paste', aoColar);
  }, []);

  const tentarDeNovo = (e: Envio) => { mudar(e.id, { etapa: 'na_fila', erro: '' }); void rodarFila(); };
  const prontos = envios.filter(e => e.etapa === 'pronto').length;
  const recebidosSet = new Set(recebidos);

  const rodape = (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
      <Button variant={envios.length ? 'primary' : 'secondary'} icon={envios.length ? 'check' : undefined} onClick={onClose} disabled={rodando}>
        {envios.length ? 'Concluir' : 'Cancelar'}
      </Button>
    </div>
  );

  return (
    <CascaFormulario casca={casca} title={`${t.titulo} · IS ${is.is}`} icon={t.icone} onClose={() => { if (!rodando) onClose(); }} footer={rodape}>
      <div className="space-y-4">
        {is.finalidade && <p className="text-xs text-ink-3">{is.finalidade}</p>}
        <div
          role="button" tabIndex={0} aria-describedby="ficha-upload-dica"
          onClick={() => input.current?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={e => { e.preventDefault(); setArrastando(false); adicionar(e.dataTransfer.files); }}
          className={`w-full border-2 border-dashed rounded-xl py-8 px-4 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue ${arrastando ? 'border-navy bg-thead text-navy' : 'border-line text-ink-3 hover:border-navy hover:text-navy bg-paper/50'}`}
        >
          <span className="material-symbols-outlined text-[36px]" aria-hidden="true">upload_file</span>
          <span className="text-sm font-semibold">{t.campo} em PDF</span>
          <span id="ficha-upload-dica" className="text-xs opacity-70">Clique para escolher, arraste ou cole (Ctrl+V) · um ou mais · até {LIMITE_PDF_MB} MB cada</span>
        </div>
        <input ref={input} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={e => { adicionar(e.target.files); e.target.value = ''; }} />
        <BotaoDigitalizar fullWidth nomeBase={aba === 'exames' ? 'exames' : 'atestado'} titulo={`Digitalizar · ${t.campo}`} onPdf={f => adicionar([f])} />
        {aviso && <p role="alert" className="text-xs font-semibold text-wine">{aviso}</p>}

        {envios.length > 0 && (
          <section aria-label="Arquivos enviados" className="space-y-2">
            <p className="text-xs text-ink-3" aria-live="polite">{prontos} de {envios.length} pronto{envios.length !== 1 ? 's' : ''}{rodando ? ' · processando um por vez' : ''}</p>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {envios.map(e => (
                <li key={e.id} className="flex items-start gap-3 px-3 py-2 min-h-[44px]">
                  <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${e.etapa === 'pronto' ? 'text-green-700' : e.etapa === 'erro' ? 'text-wine' : 'text-ink-3'} ${e.etapa === 'lendo' ? 'animate-spin' : ''}`} aria-hidden="true">
                    {ICONE_ETAPA[e.etapa]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink truncate">{e.arquivo.name || 'PDF colado'}</span>
                    {e.etapa === 'pronto' && <span className="block text-xs text-ink-3 break-words">{e.resumo}</span>}
                    {e.etapa === 'erro' && <span className="block text-xs font-semibold text-wine" role="alert">{e.erro}</span>}
                    {ROTULO_ETAPA[e.etapa] && <span className="block text-xs text-ink-3">{ROTULO_ETAPA[e.etapa]}</span>}
                  </span>
                  {e.etapa === 'pronto' && e.exameId && (
                    <IconButton icon="visibility" label="Abrir o registro" variant="secondary" onClick={() => onAbrir(`${is.id}:${e.exameId}`)} />
                  )}
                  {e.etapa === 'erro' && <IconButton icon="refresh" label="Tentar de novo" variant="secondary" onClick={() => tentarDeNovo(e)} />}
                </li>
              ))}
            </ul>
          </section>
        )}

        {aba === 'exames' && examesMinimos.length > 0 && (
          <section aria-label="Exames mínimos da finalidade" className="space-y-2">
            <p className="text-xs font-semibold text-ink-3">Exames mínimos da finalidade (a IA tenta enquadrar cada PDF; outros exames também são aceitos)</p>
            <ul className="flex flex-wrap gap-1.5">
              {examesMinimos.map(n => (
                <li key={n}><StatusTag tone={recebidosSet.has(n) ? 'success' : 'muted'} dot={false}>{recebidosSet.has(n) ? '✓ ' : ''}{n}</StatusTag></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </CascaFormulario>
  );
};
