// Ficheiro: components/scanner/ScannerDocumento.tsx
// Scanner de documentos em tela cheia, reutilizável (Perícia Menor, IS por foto, Exames de candidatos):
//   - câmera ao vivo (getUserMedia) com o contorno do documento detectado a cada ~120 ms pelo OpenCV.js num
//     Web Worker (utils/scanner/detector.ts) — amarelo procurando, verde estável;
//   - disparo automático quando o documento está grande, parado e nítido (utils/scanner/estabilidade.ts),
//     com botão de disparo manual e opção de desligar o automático;
//   - retificação da perspectiva + realce "Documento" (utils/filtroDocumento.ts) em cada página — na revisão,
//     "Realçada" ou "Original" (só recortada e endireitada);
//   - multipágina: cada foto vai para a revisão; a próxima página só começa pelo botão "Adicionar página"
//     (nunca dispara sozinho de uma página para a outra);
//   - revisão: reordenar, ajustar os 4 cantos (EditorCantos), refazer/excluir;
//   - fallback sem câmera (página sem HTTPS, permissão negada, PC sem câmera) ou sem o motor de detecção:
//     foto/arquivo pelo seletor do sistema, com os cantos detectados na imagem estática (ou a imagem inteira).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/Button';
import { EditorCantos } from './EditorCantos';
import { useEscapeEmpilhado } from '../../hooks/useEscapeEmpilhado';
import { aplicarFiltroDocumento } from '../../utils/filtroDocumento';
import { carregarImagem, detectar, encerrarDetector, imageDataParaDataUrl, iniciarDetector, pixelsDe, retificar } from '../../utils/scanner/detector';
import { CONFIG_PADRAO, ESTADO_INICIAL, MENSAGEM, avaliar, type EstadoEstabilidade, type Situacao } from '../../utils/scanner/estabilidade';
import { area, cantosPadrao, convexo, escalarCantos, type Cantos } from '../../utils/scanner/geometria';
import { imagensParaPdf } from '../../utils/imagensParaPdf';
import { ajustarAoLimite, recomprimirJpeg, type ResultadoLimite } from '../../utils/limitePdf';
import { LIMITE_PDF_MB, formatarTamanho } from '../../config/limitePdf';

export interface ScannerDocumentoProps {
  /** Título da barra superior. */
  titulo?: string;
  /** Aplica o filtro "Documento" (fundo branco, tinta escura). Padrão: true. */
  filtro?: boolean;
  /**
   * Páginas finais (JPEG data URL, na ordem) e o PDF já gerado e MEDIDO (≤ 10 MB — config/limitePdf.ts); se
   * precisou, as páginas vêm recomprimidas (utils/limitePdf.ts). Sem limite de quantidade de páginas.
   */
  onConcluir: (paginas: string[], pdf: Blob) => void;
  onCancelar: () => void;
}

interface Pagina {
  id: string;
  /** Foto original (lado maior ≤ LADO_ORIGINAL), para reajustar os cantos. */
  original: string;
  largura: number;
  altura: number;
  cantos: Cantos;
  /** Resultado retificado e com o realce "Documento". */
  final: string;
  /** Resultado retificado, sem realce (opção "Original" da revisão). */
  retificada: string;
  /** Cantos não detectados: imagem inteira, convém conferir. */
  semDeteccao?: boolean;
}

type Etapa = 'camera' | 'revisao' | 'ajuste' | 'sem-camera';

/** Lado maior do frame de análise (detecção ao vivo) e da foto guardada. */
const LADO_ANALISE = 480;
const LADO_ORIGINAL = 2400;
const INTERVALO_MS = 120;

const novoId = () => Math.random().toString(36).slice(2, 10);

/** Retifica e realça uma página a partir da foto original e dos cantos. */
const processar = async (original: string, largura: number, altura: number, cantos: Cantos, filtro: boolean): Promise<{ final: string; retificada: string }> => {
  const img = await carregarImagem(original);
  const { dados } = pixelsDe(img, largura, altura);
  let saida: string;
  try {
    saida = imageDataParaDataUrl(await retificar(dados, cantos));
  } catch {
    saida = original; // sem o motor: segue com a foto inteira
  }
  if (!filtro) return { final: saida, retificada: saida };
  try { return { final: await aplicarFiltroDocumento(saida), retificada: saida }; } catch { return { final: saida, retificada: saida }; }
};

/** Lê um arquivo de imagem como data URL. */
const lerArquivo = (f: File) => new Promise<string>((ok, erro) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result || ''));
  r.onerror = () => erro(new Error('Não foi possível ler o arquivo.'));
  r.readAsDataURL(f);
});

export const ScannerDocumento: React.FC<ScannerDocumentoProps> = ({
  titulo = 'Digitalizar documento', filtro = true, onConcluir, onCancelar,
}) => {
  const [etapa, setEtapa] = useState<Etapa>('camera');
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [ajustando, setAjustando] = useState<{ indice: number; cantos: Cantos } | null>(null);
  const [motor, setMotor] = useState<'carregando' | 'pronto' | 'falhou'>('carregando');
  const [ocupado, setOcupado] = useState('');
  const [erroCamera, setErroCamera] = useState('');
  /** Revisão: páginas realçadas (padrão) ou como fotografadas, só recortadas e endireitadas. */
  const [realce, setRealce] = useState(true);
  // Tamanho do PDF: gerado e MEDIDO a cada mudança das páginas (com recompressão automática se passar de 10 MB).
  const [medida, setMedida] = useState<ResultadoLimite | null>(null);
  const [medindo, setMedindo] = useState(false);
  const [erroMedida, setErroMedida] = useState('');
  useEffect(() => {
    if (!paginas.length) { setMedida(null); return; }
    let vivo = true;
    setMedindo(true);
    setErroMedida('');
    ajustarAoLimite(paginas.map(p => (realce ? p.final : p.retificada)), { gerarPdf: imagensParaPdf, recomprimir: recomprimirJpeg })
      .then(r => { if (vivo) setMedida(r); })
      .catch(e => { if (vivo) { setMedida(null); setErroMedida(e?.message || 'Não foi possível gerar o PDF.'); } })
      .finally(() => { if (vivo) setMedindo(false); });
    return () => { vivo = false; };
  }, [paginas, realce]);
  const excede = !!medida?.excede;
  const arquivo = useRef<HTMLInputElement>(null);

  // Motor de detecção: carrega ao abrir, libera ao fechar.
  useEffect(() => {
    let vivo = true;
    iniciarDetector().then(() => vivo && setMotor('pronto')).catch(() => vivo && setMotor('falhou'));
    return () => { vivo = false; encerrarDetector(); };
  }, []);

  // Esc fecha só o scanner (camada mais alta); no ajuste de cantos, volta para a revisão.
  useEscapeEmpilhado(() => {
    if (etapa === 'ajuste') { setAjustando(null); setEtapa('revisao'); } else onCancelar();
  });

  const adicionar = useCallback((p: Pagina) => {
    setPaginas(ps => [...ps, p]);
  }, []);

  /** Foto capturada da câmera (já em ImageData de resolução cheia) com os cantos na mesma escala. */
  const aoCapturar = useCallback(async (foto: ImageData, cantos: Cantos | null) => {
    setOcupado('Processando a página…');
    try {
      const original = imageDataParaDataUrl(foto, 0.9);
      const c = cantos && convexo(cantos) ? cantos : cantosPadrao(foto.width, foto.height, 0);
      const r = await processar(original, foto.width, foto.height, c, filtro);
      adicionar({ id: novoId(), original, largura: foto.width, altura: foto.height, cantos: c, ...r, semDeteccao: !cantos });
      setEtapa('revisao'); // a próxima página só começa pelo botão "Adicionar página"
    } finally {
      setOcupado('');
    }
  }, [adicionar, filtro]);

  /** Imagens escolhidas no seletor do sistema (galeria/arquivos/câmera nativa). */
  const aoEscolherArquivos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []) as File[];
    e.target.value = '';
    if (!files.length) return;
    setOcupado(files.length > 1 ? `Processando ${files.length} imagens…` : 'Processando a imagem…');
    try {
      for (const f of files) {
        const url = await lerArquivo(f);
        const img = await carregarImagem(url);
        const { dados, escala } = pixelsDe(img, img.naturalWidth, img.naturalHeight, LADO_ORIGINAL);
        const original = escala < 1 ? imageDataParaDataUrl(dados, 0.9) : url;
        let cantos: Cantos | null = null;
        if (motor === 'pronto') {
          try {
            const pequeno = pixelsDe(img, img.naturalWidth, img.naturalHeight, LADO_ANALISE * 2);
            const d = await detectar(pequeno.dados);
            if (d.cantos && convexo(d.cantos) && area(d.cantos) / (pequeno.dados.width * pequeno.dados.height) >= 0.15) {
              cantos = escalarCantos(d.cantos, dados.width / pequeno.dados.width, dados.height / pequeno.dados.height);
            }
          } catch { /* sem detecção: imagem inteira */ }
        }
        const c = cantos ?? cantosPadrao(dados.width, dados.height, 0);
        const r = await processar(original, dados.width, dados.height, c, filtro);
        adicionar({ id: novoId(), original, largura: dados.width, altura: dados.height, cantos: c, ...r, semDeteccao: !cantos });
      }
      setEtapa('revisao');
    } catch (err: any) {
      setErroCamera(err?.message || 'Não foi possível processar a imagem.');
    } finally {
      setOcupado('');
    }
  };

  const confirmarAjuste = async () => {
    if (!ajustando) return;
    const p = paginas[ajustando.indice];
    if (!p) return;
    setOcupado('Reprocessando a página…');
    try {
      const r = await processar(p.original, p.largura, p.altura, ajustando.cantos, filtro);
      setPaginas(ps => ps.map((x, i) => (i === ajustando.indice ? { ...x, cantos: ajustando.cantos, ...r, semDeteccao: false } : x)));
      setAjustando(null);
      setEtapa('revisao');
    } finally {
      setOcupado('');
    }
  };

  const mover = (i: number, d: -1 | 1) => setPaginas(ps => {
    const j = i + d;
    if (j < 0 || j >= ps.length) return ps;
    const n = [...ps];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  const excluir = (i: number) => setPaginas(ps => {
    const n = ps.filter((_, k) => k !== i);
    if (!n.length) setEtapa('camera');
    return n;
  });

  const inputArquivo = (
    <input
      ref={arquivo} type="file" accept="image/*" multiple
      className="hidden" onChange={e => { void aoEscolherArquivos(e); }} data-testid="scanner-arquivo"
    />
  );

  // Portal no <body>: o scanner é tela cheia mesmo aberto de dentro de gavetas/sheets com transform.
  return createPortal(
    <div className="fixed inset-0 z-dialog bg-black flex flex-col text-white animate-fade-in" role="dialog" aria-modal="true" aria-label={titulo}>
      {inputArquivo}
      <div className="px-4 py-3 flex items-center justify-between gap-2 shrink-0 border-b border-white/20">
        <h2 className="font-bold text-sm flex items-center gap-2 text-white min-w-0">
          <span className="material-symbols-outlined text-gold text-[20px]" aria-hidden="true">document_scanner</span>
          <span className="truncate">{etapa === 'ajuste' ? 'Ajustar cantos' : titulo}</span>
          {paginas.length > 0 && <span className="text-xs font-normal text-white/70 shrink-0">· {paginas.length} pág.</span>}
        </h2>
        <button
          type="button" onClick={onCancelar} aria-label="Fechar o scanner"
          className="w-11 h-11 -mr-2 inline-flex items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">close</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 relative">
        {etapa === 'camera' && (
          <CameraScanner
            motorPronto={motor === 'pronto'}
            motorCarregando={motor === 'carregando'}
            pausado={!!ocupado}
            paginas={paginas}
            podeConcluir={paginas.length > 0}
            onCapturar={aoCapturar}
            onSemCamera={msg => { setErroCamera(msg); setEtapa('sem-camera'); }}
            onArquivo={() => arquivo.current?.click()}
            onConcluir={() => setEtapa('revisao')}
          />
        )}

        {etapa === 'sem-camera' && (
          <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
            <span className="material-symbols-outlined text-[48px] text-gold" aria-hidden="true">no_photography</span>
            <p className="text-sm text-white/80 max-w-sm">{erroCamera || 'A câmera não está disponível neste navegador.'} Fotografe ou escolha a imagem pelo seletor do aparelho — os cantos do documento são detectados na foto.</p>
            <Button icon="add_a_photo" onClick={() => arquivo.current?.click()}>Fotografar ou escolher imagem</Button>
            {paginas.length > 0 && <Button variant="secondary" onClick={() => setEtapa('revisao')}>Ver páginas ({paginas.length})</Button>}
          </div>
        )}

        {etapa === 'revisao' && (
          <div className="h-full overflow-auto p-4">
            {filtro && (
              <div className="flex justify-center mb-3" role="group" aria-label="Aparência das páginas">
                {([[true, 'Realçada'], [false, 'Original']] as const).map(([v, rotulo]) => (
                  <button
                    key={rotulo} type="button" aria-pressed={realce === v} onClick={() => setRealce(v)}
                    className={`h-11 px-4 text-sm font-bold border border-white/40 first:rounded-l-lg last:rounded-r-lg ${realce === v ? 'bg-white text-navy' : 'text-white hover:bg-white/10'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold`}
                  >{rotulo}</button>
                ))}
              </div>
            )}
            <ol className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto" aria-label="Páginas digitalizadas">
              {paginas.map((p, i) => (
                <li key={p.id} className="rounded-xl bg-white/5 border border-white/20 overflow-hidden flex flex-col">
                  <div className="relative bg-white">
                    <img src={realce ? p.final : p.retificada} alt={`Página ${i + 1}`} className="w-full max-h-[55vh] object-contain" />
                    <span className="absolute top-2 left-2 bg-navy text-white text-xs font-bold px-2 py-0.5 rounded">{i + 1}</span>
                  </div>
                  {p.semDeteccao && <p className="text-xs text-gold px-3 pt-2">Bordas não detectadas — confira e ajuste os cantos se precisar.</p>}
                  <div className="flex items-center justify-between gap-1 p-2">
                    <div className="flex gap-1">
                      <BotaoIcone icone="crop_free" rotulo={`Ajustar cantos da página ${i + 1}`} onClick={() => { setAjustando({ indice: i, cantos: p.cantos }); setEtapa('ajuste'); }} />
                      {paginas.length > 1 && <BotaoIcone icone="arrow_upward" rotulo={`Mover página ${i + 1} para antes`} disabled={i === 0} onClick={() => mover(i, -1)} />}
                      {paginas.length > 1 && <BotaoIcone icone="arrow_downward" rotulo={`Mover página ${i + 1} para depois`} disabled={i === paginas.length - 1} onClick={() => mover(i, 1)} />}
                    </div>
                    <BotaoIcone icone="delete" rotulo={`Excluir página ${i + 1}`} onClick={() => excluir(i)} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {etapa === 'ajuste' && ajustando && paginas[ajustando.indice] && (
          <div className="h-full p-3">
            <EditorCantos
              imagem={paginas[ajustando.indice].original}
              largura={paginas[ajustando.indice].largura}
              altura={paginas[ajustando.indice].altura}
              cantos={ajustando.cantos}
              onAlterar={c => setAjustando(a => (a ? { ...a, cantos: c } : a))}
            />
          </div>
        )}

        {ocupado && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-2 text-sm font-bold" role="status">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
            {ocupado}
          </div>
        )}
      </div>

      {etapa === 'revisao' && (
        <div className="p-4 pb-8 shrink-0 border-t border-white/20 flex flex-wrap gap-2 justify-center">
          <p role="status" aria-live="polite" className={`w-full text-center text-xs ${excede || erroMedida ? 'font-semibold text-gold' : 'text-white/70'}`}>
            {medindo || !medida
              ? (erroMedida || `${paginas.length} página${paginas.length !== 1 ? 's' : ''} · calculando o tamanho do PDF…`)
              : excede
                ? `${paginas.length} páginas · ${formatarTamanho(medida.bytes)} — acima do limite de ${LIMITE_PDF_MB} MB mesmo comprimido. Exclua página(s) ou divida em dois envios.`
                : `${paginas.length} página${paginas.length !== 1 ? 's' : ''} · ${formatarTamanho(medida.bytes)} de ${LIMITE_PDF_MB} MB${medida.nivel > 0 ? ' (comprimido)' : ''}`}
          </p>
          <Button variant="secondary" icon="add_a_photo" disabled={excede || medindo} onClick={() => setEtapa(erroCamera ? 'sem-camera' : 'camera')}>
            Adicionar página
          </Button>
          <Button icon="check" disabled={!paginas.length || !!ocupado || medindo || excede || !medida} onClick={() => { if (medida) onConcluir(medida.paginas, medida.pdf); }}>
            {paginas.length > 1 ? `Usar ${paginas.length} páginas` : 'Usar digitalização'}
          </Button>
        </div>
      )}
      {etapa === 'ajuste' && ajustando && (
        <div className="p-4 pb-8 shrink-0 border-t border-white/20 flex flex-wrap gap-2 justify-center">
          <Button variant="secondary" onClick={() => { setAjustando(null); setEtapa('revisao'); }}>Cancelar</Button>
          <Button
            variant="secondary" icon="fit_screen"
            onClick={() => { const p = paginas[ajustando.indice]; setAjustando({ ...ajustando, cantos: cantosPadrao(p.largura, p.altura, 0) }); }}
          >Imagem inteira</Button>
          <Button icon="check" disabled={!convexo(ajustando.cantos) || !!ocupado} onClick={() => { void confirmarAjuste(); }}>Aplicar</Button>
        </div>
      )}
    </div>,
    document.body,
  );
};

const BotaoIcone: React.FC<{ icone: string; rotulo: string; onClick: () => void; disabled?: boolean }> = ({ icone, rotulo, onClick, disabled }) => (
  <button
    type="button" onClick={onClick} disabled={disabled} aria-label={rotulo} title={rotulo}
    className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-white hover:bg-white/10 disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
  >
    <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{icone}</span>
  </button>
);

// ---- Câmera ao vivo ----

interface CameraProps {
  motorPronto: boolean;
  motorCarregando: boolean;
  pausado: boolean;
  paginas: Pagina[];
  podeConcluir: boolean;
  onCapturar: (foto: ImageData, cantos: Cantos | null) => Promise<void>;
  onSemCamera: (mensagem: string) => void;
  onArquivo: () => void;
  onConcluir: () => void;
}

const mensagemErroCamera = (e: any): string => {
  const nome = e?.name || '';
  if (nome === 'NotAllowedError' || nome === 'SecurityError') return 'A permissão da câmera foi negada.';
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') return 'Nenhuma câmera encontrada neste aparelho.';
  if (nome === 'NotReadableError') return 'A câmera está em uso por outro aplicativo.';
  return 'Não foi possível abrir a câmera.';
};

const CameraScanner: React.FC<CameraProps> = ({ motorPronto, motorCarregando, pausado, paginas, podeConcluir, onCapturar, onSemCamera, onArquivo, onConcluir }) => {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const estado = useRef<EstadoEstabilidade>(ESTADO_INICIAL);
  const ultimosCantos = useRef<Cantos | null>(null);
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [cantos, setCantos] = useState<Cantos | null>(null);
  const [situacao, setSituacao] = useState<Situacao>('procurando');
  const [progresso, setProgresso] = useState(0);
  const [automatico, setAutomatico] = useState(true);
  const [lanterna, setLanterna] = useState<boolean | null>(null);
  const [flash, setFlash] = useState(false);
  const capturando = useRef(false);

  // Abre a câmera traseira; sem getUserMedia (sem HTTPS, navegador antigo) vai para o fallback.
  useEffect(() => {
    let vivo = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      onSemCamera(window.isSecureContext ? 'Este navegador não dá acesso à câmera.' : 'A câmera só funciona em conexão segura (HTTPS).');
      return;
    }
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    }).then(s => {
      if (!vivo) { s.getTracks().forEach(t => t.stop()); return; }
      stream.current = s;
      const v = video.current;
      if (!v) return;
      v.srcObject = s;
      v.onloadedmetadata = () => { setDim({ w: v.videoWidth, h: v.videoHeight }); void v.play().catch(() => undefined); };
      const trilha = s.getVideoTracks()[0];
      const cap = (trilha as any)?.getCapabilities?.();
      if (cap && 'torch' in cap) setLanterna(false);
    }).catch(e => { if (vivo) onSemCamera(mensagemErroCamera(e)); });
    return () => {
      vivo = false;
      stream.current?.getTracks().forEach(t => t.stop());
      stream.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alternarLanterna = async () => {
    const trilha = stream.current?.getVideoTracks()[0];
    if (!trilha || lanterna === null) return;
    try {
      await trilha.applyConstraints({ advanced: [{ torch: !lanterna } as any] });
      setLanterna(!lanterna);
    } catch { setLanterna(null); }
  };

  const capturar = useCallback(async (c: Cantos | null) => {
    const v = video.current;
    if (!v || !v.videoWidth || capturando.current) return;
    capturando.current = true;
    try {
      const { dados, escala } = pixelsDe(v, v.videoWidth, v.videoHeight, LADO_ORIGINAL);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 180);
      navigator.vibrate?.(40);
      await onCapturar(dados, c ? escalarCantos(c, escala) : null);
    } finally {
      capturando.current = false;
    }
  }, [onCapturar]);

  // Laço de detecção: um frame reduzido a cada INTERVALO_MS, sem empilhar (espera a resposta do worker).
  useEffect(() => {
    if (!motorPronto || !dim || pausado) return;
    let vivo = true;
    let timer = 0;
    const passo = async () => {
      const v = video.current;
      if (!vivo || !v || v.readyState < 2) { timer = window.setTimeout(passo, INTERVALO_MS); return; }
      try {
        const { dados, escala } = pixelsDe(v, v.videoWidth, v.videoHeight, LADO_ANALISE);
        const d = await detectar(dados);
        if (!vivo) return;
        const av = avaliar(estado.current, d.cantos, d.nitidez, dados.width, dados.height, CONFIG_PADRAO);
        estado.current = av.estado;
        const emVideo = d.cantos ? escalarCantos(d.cantos, 1 / escala) : null;
        ultimosCantos.current = emVideo && av.situacao !== 'aproxime' ? emVideo : null;
        setCantos(emVideo);
        setSituacao(av.situacao);
        setProgresso(av.progresso);
        if (av.situacao === 'capturar' && automatico && emVideo) await capturar(emVideo);
      } catch { /* frame perdido: segue */ }
      if (vivo) timer = window.setTimeout(passo, INTERVALO_MS);
    };
    timer = window.setTimeout(passo, INTERVALO_MS);
    return () => { vivo = false; window.clearTimeout(timer); };
  }, [motorPronto, dim, pausado, automatico, capturar]);

  const estavel = situacao === 'segure' || situacao === 'capturar';
  const texto = !motorPronto
    ? (motorCarregando ? 'Preparando a detecção automática…' : 'Detecção automática indisponível — use o botão para fotografar.')
    : !automatico && situacao !== 'procurando' && situacao !== 'aproxime' ? 'Toque no botão para fotografar' : MENSAGEM[situacao];
  const raio = 34;
  const circ = 2 * Math.PI * raio;

  return (
    <div className="h-full flex flex-col">
      <div className="relative flex-1 min-h-0 bg-black">
        <video ref={video} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-contain" aria-label="Visualização da câmera" />
        {dim && cantos && (
          <svg viewBox={`0 0 ${dim.w} ${dim.h}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            <polygon
              points={cantos.map(p => `${p.x},${p.y}`).join(' ')}
              strokeWidth={Math.max(dim.w, dim.h) / 220}
              strokeLinejoin="round"
              className={estavel ? 'stroke-green fill-green/20' : 'stroke-gold fill-gold/10'}
            />
          </svg>
        )}
        <p role="status" aria-live="polite" className="absolute top-3 left-1/2 -translate-x-1/2 max-w-[90%] text-center text-sm font-bold bg-black/70 rounded-full px-4 py-1.5">
          {texto}
        </p>
        {flash && <div className="absolute inset-0 bg-white/80" aria-hidden="true" />}
        {paginas.length > 0 && (
          <ol className="absolute bottom-2 left-2 right-2 flex gap-2 overflow-x-auto" aria-label="Páginas já digitalizadas">
            {paginas.map((p, i) => (
              <li key={p.id} className="relative shrink-0">
                <img src={p.final} alt={`Página ${i + 1}`} className="h-16 w-12 object-cover rounded border-2 border-white bg-white" />
                <span className="absolute -top-1 -left-1 bg-navy text-white text-xs font-bold px-1 rounded">{i + 1}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="shrink-0 px-4 pt-4 pb-8 grid grid-cols-3 items-center">
        <div className="flex gap-1 justify-start">
          <BotaoIcone icone="photo_library" rotulo="Escolher imagem da galeria ou dos arquivos" onClick={onArquivo} />
          {lanterna !== null && <BotaoIcone icone={lanterna ? 'flashlight_off' : 'flashlight_on'} rotulo={lanterna ? 'Desligar lanterna' : 'Ligar lanterna'} onClick={() => { void alternarLanterna(); }} />}
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => { void capturar(ultimosCantos.current); }}
            disabled={!dim || pausado}
            aria-label="Fotografar agora"
            className="relative w-20 h-20 rounded-full inline-flex items-center justify-center disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
              <circle cx="40" cy="40" r={raio} fill="none" strokeWidth="4" className="stroke-white/40" />
              {automatico && motorPronto && (
                <circle cx="40" cy="40" r={raio} fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-green transition-[stroke-dashoffset] motion-reduce:transition-none"
                  strokeDasharray={circ} strokeDashoffset={circ * (1 - progresso)} />
              )}
            </svg>
            <span className="w-14 h-14 rounded-full bg-white" aria-hidden="true" />
          </button>
        </div>
        <div className="flex gap-1 justify-end items-center">
          {motorPronto && (
            <button
              type="button" onClick={() => setAutomatico(a => !a)} aria-pressed={automatico}
              className={`h-11 px-3 rounded-lg text-xs font-bold border ${automatico ? 'border-green text-green' : 'border-white/40 text-white/70'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold`}
            >
              AUTO
            </button>
          )}
          {podeConcluir && (
            <button
              type="button" onClick={onConcluir} aria-label={`Concluir com ${paginas.length} página${paginas.length > 1 ? 's' : ''}`}
              className="h-11 px-3 rounded-lg text-xs font-bold bg-gold text-navy inline-flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check</span>{paginas.length}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
