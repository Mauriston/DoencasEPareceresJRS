// Ficheiro: components/concursos/ExamesCandidato.tsx
// Exames que o candidato de concurso entrega em PDF:
//  - `EnviarExamesModal`: escolhe o PDF (e o candidato, quando não vem definido),
//    manda para a pasta do candidato no Drive como EXAMES_NOME_DO_CANDIDATO.pdf,
//    recebe a transcrição feita pelo Gemini e grava no Firestore;
//  - `ExamesTranscritosModal`: tela cheia com os exames transcritos, cada bloco
//    (e cada analito dos exames compostos) com o seu botão de copiar.
// Em telas pequenas os dois viram bottom sheet, como no resto do app.
import React, { useEffect, useMemo, useState } from 'react';
import { Autocomplete, type OpcaoAutocomplete } from '../ui/Autocomplete';
import { SheetArrastavel } from '../ui/SheetArrastavel';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useEscapeEmpilhado } from '../../hooks/useEscapeEmpilhado';
import {
  listarCandidatos, listarExamesCandidato, salvarExamesCandidato,
  type CandidatoRecord, type ConcursoRecord, type ExamesEnvioRecord,
} from '../../services/firestoreConcursos';
import { anoDoConcurso, enviarExamesCandidatoParaDrive, urlDownload, urlVisualizacao, LIMITE_PDF_EXAMES_MB, type PastaConcurso } from '../../services/driveConcursos';
import {
  ehExameBlocoUnico, ehExameDeValores, linhaEmissor, textoCopiaExame, textoItem,
  type ExameCandidato, type ExamesExtraidos,
} from '../../utils/examesCandidato';

/** Candidato a quem os exames pertencem, com o concurso de onde sai a pasta no Drive. */
export interface AlvoExames {
  concursoId: string;
  concursoNome: string;
  concursoAno: number;
  candidatoId: string;
  candidatoNome: string;
}

const copiar = async (texto: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
};

/** Botão de copiar que confirma na própria etiqueta por alguns segundos. */
const BotaoCopiar: React.FC<{ texto: string; rotulo?: string; titulo: string; className?: string }> = ({ texto, rotulo, titulo, className = '' }) => {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = window.setTimeout(() => setCopiado(false), 1800);
    return () => window.clearTimeout(t);
  }, [copiado]);
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={async () => { if (await copiar(texto)) setCopiado(true); }}
      className={`shrink-0 inline-flex items-center gap-1 min-h-[36px] px-2 rounded-lg text-xs font-bold transition-colors ${copiado ? 'bg-green-50 text-green-800' : 'text-navy hover:bg-thead'} ${className}`}
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{copiado ? 'check' : 'content_copy'}</span>
      {rotulo && <span>{copiado ? 'Copiado' : rotulo}</span>}
    </button>
  );
};

// =========================================================================
// ENVIAR EXAMES (PDF)
// =========================================================================

interface EnviarExamesModalProps {
  /** Candidato já conhecido (menu ⋮ da linha do candidato): sem campo de busca. */
  alvo?: AlvoExames | null;
  /**
   * Concursos onde procurar o candidato quando `alvo` não vem — o campo de
   * autocomplete lista os candidatos destes concursos (quem chama manda apenas
   * os concursos em andamento).
   */
  concursos?: ConcursoRecord[];
  onClose: () => void;
  /** Avisa quem chamou que o candidato mudou (para atualizar a tabela sem recarregar). */
  onEnviado?: (candidato: CandidatoRecord) => void;
  /** Nome de quem enviou, gravado no registro do envio. */
  usuarioNome?: string;
}

type EtapaEnvio = 'select' | 'enviando' | 'concluido';

export const EnviarExamesModal: React.FC<EnviarExamesModalProps> = ({ alvo = null, concursos = [], onClose, onEnviado, usuarioNome }) => {
  const isDesktop = useIsDesktop();
  const [etapa, setEtapa] = useState<EtapaEnvio>('select');
  const [file, setFile] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ nomeArquivo: string; url: string; extraidos: ExamesExtraidos | null; erroExtracao: string } | null>(null);

  // Busca do candidato (só quando o alvo não vem definido).
  const [busca, setBusca] = useState('');
  const [escolhido, setEscolhido] = useState<AlvoExames | null>(null);
  const [opcoes, setOpcoes] = useState<AlvoExames[]>([]);
  const [carregandoCandidatos, setCarregandoCandidatos] = useState(false);
  const precisaEscolher = !alvo;
  const destino = alvo ?? escolhido;

  // Trava o Esc enquanto o PDF está subindo: a transcrição leva minutos e sair no
  // meio deixaria o PDF no Drive sem registro no Firestore.
  const travado = etapa === 'enviando';
  useEscapeEmpilhado(onClose, !travado);

  const concursosKey = concursos.map(c => c.id).join(',');
  useEffect(() => {
    if (!precisaEscolher || concursos.length === 0) return;
    let ativo = true;
    setCarregandoCandidatos(true);
    Promise.all(concursos.map(async c => {
      const lista = await listarCandidatos(c.id);
      return lista.map((cand): AlvoExames => ({
        concursoId: c.id,
        concursoNome: c.nome,
        concursoAno: anoDoConcurso(c.criadoEm),
        candidatoId: cand.id,
        candidatoNome: cand.nome,
      }));
    }))
      .then(listas => {
        if (!ativo) return;
        setOpcoes(listas.flat().sort((a, b) => a.candidatoNome.localeCompare(b.candidatoNome, 'pt-BR', { sensitivity: 'base' })));
      })
      .catch(() => { if (ativo) setErro('Não foi possível carregar os candidatos dos concursos em andamento.'); })
      .finally(() => { if (ativo) setCarregandoCandidatos(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precisaEscolher, concursosKey]);

  const opcoesAutocomplete: OpcaoAutocomplete[] = useMemo(() => opcoes.map(o => ({
    chave: `${o.concursoId}:${o.candidatoId}`,
    principal: o.candidatoNome,
    secundaria: `${o.candidatoId} · ${o.concursoNome}`,
  })), [opcoes]);

  const handleEnviar = async () => {
    if (!file || !destino) return;
    setErro(null);
    setEtapa('enviando');
    try {
      const pasta: PastaConcurso = { nome: destino.concursoNome, ano: destino.concursoAno };
      const envio = await enviarExamesCandidatoParaDrive({
        pasta,
        candidatoId: destino.candidatoId,
        candidatoNome: destino.candidatoNome,
        file,
      });
      // O PDF já está no Drive: o registro é gravado mesmo quando a leitura falha,
      // para o link não se perder (o usuário reenvia só a transcrição depois).
      const candidato = await salvarExamesCandidato(destino.concursoId, destino.candidatoId, {
        pdfUrl: envio.url,
        nomeArquivo: envio.nomeArquivo,
        extraidos: envio.dados,
        criadoPorNome: usuarioNome,
      });
      setResultado({ nomeArquivo: envio.nomeArquivo, url: envio.url, extraidos: envio.dados, erroExtracao: envio.erroExtracao });
      onEnviado?.(candidato);
      setEtapa('concluido');
    } catch (e: any) {
      setErro(e?.message || 'Erro ao enviar os exames.');
      setEtapa('select');
    }
  };

  const corpo = (
    <div className="space-y-4">
      {erro && <div className="bg-wine-50 border border-wine-200 rounded-xl p-3 text-sm text-wine-700 font-semibold">{erro}</div>}

      {etapa === 'select' && (
        <>
          {precisaEscolher && (
            <Autocomplete
              label="Candidato"
              required
              placeholder={carregandoCandidatos ? 'Carregando candidatos...' : 'Digite o nome do candidato'}
              disabled={carregandoCandidatos}
              help={escolhido ? `${escolhido.candidatoId} · ${escolhido.concursoNome}` : undefined}
              valor={busca}
              onDigitar={texto => { setBusca(texto); setEscolhido(null); }}
              opcoes={opcoesAutocomplete}
              onSelecionar={o => {
                const achado = opcoes.find(x => `${x.concursoId}:${x.candidatoId}` === o.chave) || null;
                setEscolhido(achado);
                setBusca(achado?.candidatoNome || '');
              }}
            />
          )}

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink-5 rounded-xl p-6 cursor-pointer hover:border-navy transition-colors">
            <span className="material-symbols-outlined text-[32px] text-ink-3" aria-hidden="true">lab_profile</span>
            <span className="text-sm font-bold text-ink text-center break-all">{file ? file.name : 'Clique para selecionar o PDF dos exames'}</span>
            <span className="text-xs text-ink-3">Máx. {LIMITE_PDF_EXAMES_MB} MB — acima disso, divida em dois PDFs</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
        </>
      )}

      {etapa === 'enviando' && (
        <div className="text-center py-8 text-ink-3 space-y-2">
          <span className="material-symbols-outlined animate-spin text-[32px] text-navy" aria-hidden="true">progress_activity</span>
          <p className="text-sm font-semibold">Salvando no Drive e transcrevendo os exames...</p>
          <p className="text-xs">Um PDF escaneado com muitos laudos pode levar alguns minutos. Não feche esta janela.</p>
        </div>
      )}

      {etapa === 'concluido' && resultado && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
            <p className="text-sm font-bold text-green-800">PDF salvo no Drive.</p>
            <p className="text-xs text-green-800 font-mono break-all">{resultado.nomeArquivo}</p>
          </div>
          {resultado.erroExtracao ? (
            <div className="bg-wine-50 border border-wine-200 rounded-xl p-3 text-sm text-wine-700">
              <p className="font-bold">Os exames não foram transcritos.</p>
              <p className="mt-1">{resultado.erroExtracao}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-3">
              <strong className="text-navy">{resultado.extraidos?.exames.length ?? 0} exame(s)</strong> transcrito(s).
              Use o botão de exames na linha do candidato para ler e copiar cada um.
            </p>
          )}
          {(resultado.extraidos?.observacoes.length ?? 0) > 0 && (
            <div className="bg-gold/10 border border-gold/40 rounded-xl p-3">
              <p className="text-xs font-bold text-navy uppercase tracking-wider mb-1">Confira</p>
              <ul className="list-disc pl-4 space-y-0.5 text-sm text-ink">
                {resultado.extraidos!.observacoes.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}
          <a href={urlVisualizacao(resultado.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-[44px] text-sm font-bold text-blue-700 underline underline-offset-2 hover:text-navy">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">open_in_new</span>
            Abrir o PDF no Drive
          </a>
        </>
      )}
    </div>
  );

  const acoes = etapa === 'concluido' ? (
    <button type="button" onClick={onClose} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm">Concluir</button>
  ) : (
    <>
      <button type="button" disabled={travado} onClick={onClose} className="px-4 py-2.5 rounded-lg border border-line text-sm font-bold text-ink hover:bg-thead transition-colors disabled:opacity-50">Cancelar</button>
      <button type="button" disabled={!file || !destino || travado} onClick={handleEnviar} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
        {travado ? 'Enviando...' : 'Enviar e transcrever'}
      </button>
    </>
  );

  const titulo = 'Enviar Exames do Candidato';
  const subtitulo = destino ? `${destino.candidatoNome} · ${destino.concursoNome}` : 'Escolha o candidato e o PDF';

  if (!isDesktop) {
    return (
      <div className="fixed inset-0 z-dialog flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/50 animate-backdrop-in" onClick={() => { if (!travado) onClose(); }} />
        <SheetArrastavel onClose={onClose} ativo={!travado} className="relative bg-canvas rounded-t-3xl shadow-2xl flex flex-col animate-sheet-up" style={{ maxHeight: '92dvh' }}>
          <div className="pt-2.5 pb-1 flex justify-center shrink-0">
            <span className="w-10 h-1.5 rounded-full bg-ink-5" />
          </div>
          <div className="px-5 py-3 flex items-center justify-between gap-3 shrink-0 border-b border-line/70">
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-base text-navy truncate">{titulo}</h3>
              <p className="text-xs text-ink-3 truncate">{subtitulo}</p>
            </div>
            {!travado && (
              <button type="button" onClick={onClose} aria-label="Fechar" className="text-ink-3 hover:text-navy p-1.5 rounded-lg hover:bg-line/60 transition-colors shrink-0">
                <span className="material-symbols-outlined text-[24px]" aria-hidden="true">close</span>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-5 pb-8">{corpo}</div>
          <div className="px-5 py-3 border-t border-line flex flex-col-reverse gap-2 shrink-0 bg-white">{acoes}</div>
        </SheetArrastavel>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onMouseDown={e => { if (e.target === e.currentTarget && !travado) onClose(); }}
    >
      <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-4 py-3 bg-navy text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[20px] text-gold shrink-0" aria-hidden="true">lab_profile</span>
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-base truncate">{titulo}</h3>
              <p className="text-xs text-white/70 truncate">{subtitulo}</p>
            </div>
          </div>
          {!travado && (
            <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
            </button>
          )}
        </div>
        <div className="p-5 overflow-y-auto flex-1">{corpo}</div>
        <div className="px-5 py-3 border-t border-line flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">{acoes}</div>
      </div>
    </div>
  );
};

// =========================================================================
// EXAMES TRANSCRITOS (tela cheia)
// =========================================================================

/** Um bloco de exame: título, identificação, conteúdo e os botões de copiar. */
const BlocoExame: React.FC<{ exame: ExameCandidato }> = ({ exame }) => {
  const emissor = linhaEmissor(exame);
  // O "#" vai no texto copiado (ver textoCopiaExame), não no título do card.
  const identificacao = [exame.paciente, exame.data].filter(Boolean).join(' · ');

  return (
    <section className="bg-white border border-line rounded-xl overflow-hidden">
      <header className="px-4 py-3 bg-thead border-b border-line flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-navy break-words">{exame.nome}</h3>
          {identificacao && <p className="text-xs text-ink-3 truncate">{identificacao}</p>}
        </div>
        <BotaoCopiar texto={textoCopiaExame(exame)} rotulo="Copiar bloco" titulo={`Copiar o bloco inteiro de ${exame.nome}`} className="bg-white border border-line" />
      </header>

      <div className="p-4 space-y-3">
        {ehExameDeValores(exame.categoria) && exame.itens.length > 0 && (
          // Cada analito é copiado separadamente ("Hemoglobina: 15,4"), sem unidade de medida.
          // Duas colunas a partir de sm: um hemograma com 16 analitos ocupa 8 linhas, não 16.
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {exame.itens.map((item, i) => (
              <li key={`${item.nome}-${i}`} className="flex items-center gap-2 py-1 border-b border-line/70">
                <span className="min-w-0 flex-1 text-sm text-ink truncate" title={item.nome}>{item.nome}</span>
                <span className="text-sm font-bold text-navy font-mono">{item.valor}</span>
                <BotaoCopiar texto={textoItem(item)} titulo={`Copiar ${item.nome}`} />
              </li>
            ))}
          </ul>
        )}

        {ehExameBlocoUnico(exame.categoria) && exame.resultado && (
          // Resultado e emissor são copiados juntos (o botão do bloco já faz isso).
          <pre className="text-sm text-ink whitespace-pre-wrap break-words font-sans leading-relaxed">{[exame.resultado, emissor].filter(Boolean).join('\n\n')}</pre>
        )}

        {!ehExameDeValores(exame.categoria) && !ehExameBlocoUnico(exame.categoria) && exame.texto && (
          // Laudos longos (toxicológico, USG) rolam dentro do próprio card, para não
          // esticar a coluna e desalinhar o grid.
          <pre className="text-sm text-ink whitespace-pre-wrap break-words font-sans leading-relaxed max-h-80 overflow-y-auto overscroll-contain pr-1">{exame.texto}</pre>
        )}

        {emissor && !ehExameBlocoUnico(exame.categoria) && (
          <div className="flex items-center gap-2 pt-2 border-t border-line/70">
            <span className="min-w-0 flex-1 text-xs text-ink-3 break-words">{emissor}</span>
            <BotaoCopiar texto={emissor} titulo="Copiar o emissor com o registro e a data" />
          </div>
        )}
      </div>
    </section>
  );
};

interface ExamesTranscritosModalProps {
  concursoId: string;
  concursoNome: string;
  candidatoId: string;
  candidatoNome: string;
  onClose: () => void;
}

export const ExamesTranscritosModal: React.FC<ExamesTranscritosModalProps> = ({ concursoId, concursoNome, candidatoId, candidatoNome, onClose }) => {
  const [envios, setEnvios] = useState<ExamesEnvioRecord[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEscapeEmpilhado(onClose, true);

  useEffect(() => {
    let ativo = true;
    listarExamesCandidato(concursoId, candidatoId)
      .then(lista => { if (ativo) setEnvios(lista); })
      .catch((e: any) => { if (ativo) setErro(e?.message || 'Erro ao carregar os exames transcritos.'); });
    return () => { ativo = false; };
  }, [concursoId, candidatoId]);

  // Um candidato pode ter entregue os exames em mais de um PDF: a tela junta
  // todos os envios, na ordem em que foram feitos.
  const exames = useMemo(
    () => (envios ?? []).flatMap((envio, iEnvio) => envio.exames.map((exame, i) => ({ exame, chave: `${iEnvio}-${i}-${exame.nome}` }))),
    [envios],
  );
  const observacoes = useMemo(() => (envios ?? []).flatMap(e => e.observacoes), [envios]);
  const textoTudo = useMemo(() => exames.map(({ exame }) => textoCopiaExame(exame)).join('\n\n\n'), [exames]);
  const pdfs = useMemo(() => (envios ?? []).filter(e => e.pdfUrl), [envios]);

  return (
    <div className="fixed inset-0 z-dialog bg-canvas flex flex-col animate-fade-in">
      <div className="px-4 py-3 bg-navy text-white flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[20px] text-gold shrink-0" aria-hidden="true">lab_profile</span>
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-base truncate">{candidatoNome}</h2>
            <p className="text-xs text-white/70 truncate">Exames transcritos · {concursoNome}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px] p-4 space-y-4">
          {erro && <div className="bg-wine-50 border border-wine-200 rounded-xl p-3 text-sm text-wine-700 font-semibold">{erro}</div>}

          {envios === null && !erro && (
            <div className="text-center py-10 text-ink-3 space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-navy" aria-hidden="true">progress_activity</span>
              <p className="text-sm font-semibold">Carregando os exames...</p>
            </div>
          )}

          {envios !== null && exames.length === 0 && !erro && (
            <p className="text-sm text-ink-3">Nenhum exame transcrito para este candidato.</p>
          )}

          {observacoes.length > 0 && (
            <div className="bg-gold/10 border border-gold/40 rounded-xl p-3">
              <p className="text-xs font-bold text-navy uppercase tracking-wider mb-1">Confira no PDF</p>
              <ul className="list-disc pl-4 space-y-0.5 text-sm text-ink">
                {observacoes.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}

          {(exames.length > 0 || pdfs.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {exames.length > 0 && <p className="text-sm text-ink-3 mr-auto">{exames.length} exame(s) transcrito(s).</p>}
              {/* Um botão por PDF enviado — o candidato pode ter entregue os exames em mais de um. */}
              {pdfs.map((envio, i) => (
                <a
                  key={envio.id}
                  href={urlDownload(envio.pdfUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-bold bg-navy text-white border border-navy hover:bg-navy-hover transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">download</span>
                  {pdfs.length === 1 ? 'Download Exames PDF' : `Download PDF ${i + 1}`}
                </a>
              ))}
              {exames.length > 0 && (
                <BotaoCopiar texto={textoTudo} rotulo="Copiar todos" titulo="Copiar todos os exames" className="min-h-[44px] px-3 bg-white border border-line" />
              )}
            </div>
          )}

          {/* Duas colunas a partir de lg: aproveita a largura do desktop e corta pela metade a rolagem. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {exames.map(({ exame, chave }) => <BlocoExame key={chave} exame={exame} />)}
          </div>
        </div>
      </div>
    </div>
  );
};
