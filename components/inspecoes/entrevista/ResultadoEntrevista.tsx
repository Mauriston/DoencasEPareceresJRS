// Ficheiro: components/inspecoes/entrevista/ResultadoEntrevista.tsx
// Resultado de uma entrevista gravada da IS (Dialog largo no computador, tela cheia no celular):
// cabeçalho (participantes, finalidade, duração, situação), progresso enquanto o servidor
// transcreve/organiza, erro com "Tentar novamente" e, pronta, a confirmação dos falantes, a
// anamnese organizada (editável), a transcrição íntegra, o áudio, "Copiar" e "Marcar como revisada".
// O documento vem ao vivo do pai (observarEntrevistas): toda gravação aqui reaparece pelo snapshot.
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/Button';
import { StatusTag } from '../../ui/StatusTag';
import { Segmented } from '../../ui/Segmented';
import { Toast } from '../../ui/Toast';
import { ResultadoPainel } from './ResultadoPainel';
import { ResultadoFalantes } from './ResultadoFalantes';
import { ResultadoAnamnese } from './ResultadoAnamnese';
import { ResultadoAnamneseEdicao } from './ResultadoAnamneseEdicao';
import { ResultadoTranscricao } from './ResultadoTranscricao';
import { ResultadoAudio } from './ResultadoAudio';
import { useNav } from '../../../context/NavContext';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { atualizarEntrevista, consultarSituacao, ouvirAudio, reorganizarEntrevista } from '../../../services/entrevistasIS';
import { ROTULO_PAPEL, type AnamneseEntrevista, type EntrevistaRecord, type QuemQuando } from '../../../config/entrevistas';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import { hojeISO } from '../../../utils/inspecoes';
import {
  AVISO_IA, anamneseEfetiva, dataHoraEntrevista, formatarDuracao, rotuloSituacao, textoAnamnese, tomSituacao,
} from '../../../utils/entrevistas';

interface Props {
  is: InspecaoRecord;
  entrevista: EntrevistaRecord;
  onClose: () => void;
}

type Aba = 'anamnese' | 'transcricao';

const ETAPAS: { id: EntrevistaRecord['situacao']; rotulo: string }[] = [
  { id: 'aguardando_envio', rotulo: 'Envio do áudio' },
  { id: 'transcrevendo', rotulo: 'Transcrição com separação de falantes' },
  { id: 'organizando', rotulo: 'Organização da anamnese' },
];

const msgErro = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

export const ResultadoEntrevista: React.FC<Props> = ({ is, entrevista: e, onClose }) => {
  const authUser = useNav()?.authUser;
  const isDesktop = useIsDesktop();
  const quem = (): QuemQuando => ({ uid: authUser?.uid || '', nome: authUser?.usuario || authUser?.nome || '', em: new Date() });

  const [aba, setAba] = useState<Aba>('anamnese');
  const [editando, setEditando] = useState(false);
  const [revendoFalantes, setRevendoFalantes] = useState(false);
  const [ofertaReorganizar, setOfertaReorganizar] = useState(false);
  const [ocupado, setOcupado] = useState<'' | 'falantes' | 'edicao' | 'revisada' | 'reorganizar' | 'tentar'>('');
  const [aviso, setAviso] = useState<{ msg: string; tom: 'success' | 'error' } | null>(null);

  // Áudio: carregado sob demanda (blob: URL), revogado ao fechar.
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioCarregando, setAudioCarregando] = useState(false);
  const [audioErro, setAudioErro] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const irPara = useRef<number | null>(null);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 3500);
    return () => window.clearTimeout(t);
  }, [aviso]);
  // Assim que o <audio> existe, vai ao trecho pedido antes do carregamento.
  useEffect(() => {
    const el = audioRef.current;
    if (!audioUrl || !el || irPara.current === null) return;
    el.currentTime = irPara.current;
    irPara.current = null;
    el.play().catch(() => { /* o navegador pode exigir um toque no play */ });
  }, [audioUrl]);

  const apagarApos = e.audio?.apagarApos;
  const audioApagado = !!apagarApos && apagarApos <= hojeISO();
  const temAudio = !!e.audio && !audioApagado;

  const carregarAudio = async () => {
    setAudioCarregando(true);
    setAudioErro('');
    try {
      const blob = await ouvirAudio(e.isId || is.id, e.id);
      setAudioUrl(URL.createObjectURL(blob));
    } catch (err) {
      irPara.current = null;
      setAudioErro(msgErro(err, 'Não foi possível carregar o áudio.'));
    } finally {
      setAudioCarregando(false);
    }
  };

  const ouvir = (seg: number) => {
    const el = audioRef.current;
    if (audioUrl && el) {
      el.currentTime = seg;
      el.play().catch(() => undefined);
      return;
    }
    irPara.current = seg;
    if (!audioCarregando) void carregarAudio();
  };

  const executar = async (tipo: typeof ocupado, acao: () => Promise<unknown>, ok?: string) => {
    setOcupado(tipo);
    try {
      await acao();
      if (ok) setAviso({ msg: ok, tom: 'success' });
      return true;
    } catch (err) {
      setAviso({ msg: msgErro(err, 'Não foi possível concluir. Tente de novo.'), tom: 'error' });
      return false;
    } finally {
      setOcupado('');
    }
  };

  const isId = e.isId || is.id;
  const confirmarFalantes = async (mapa: Record<string, string>) => {
    const ok = await executar('falantes', () => atualizarEntrevista(isId, e.id, { mapaFalantes: mapa, falantesConfirmados: true }), 'Falantes confirmados.');
    if (ok) { setRevendoFalantes(false); setOfertaReorganizar(true); }
  };
  const reorganizar = async () => {
    const ok = await executar('reorganizar', () => reorganizarEntrevista(isId, e.id), 'Reorganizando a anamnese com os nomes confirmados.');
    if (ok) setOfertaReorganizar(false);
  };
  const tentarNovamente = () =>
    executar('tentar', () => (e.transcricao?.length ? reorganizarEntrevista(isId, e.id) : consultarSituacao(isId, e.id)), 'Processamento retomado.');
  const salvarEdicao = async (a: AnamneseEntrevista) => {
    const ok = await executar('edicao', () => atualizarEntrevista(isId, e.id, { anamneseEditada: a, editadoPor: quem() }), 'Anamnese salva.');
    if (ok) setEditando(false);
  };
  const marcarRevisada = () => executar('revisada', () => atualizarEntrevista(isId, e.id, { revisada: quem() }), 'Entrevista marcada como revisada.');

  const anamnese = anamneseEfetiva(e);
  const copiar = async () => {
    if (!anamnese) return;
    const cabecalho = `ANAMNESE — IS ${is.is}${e.finalidade ? ` — ${e.finalidade}` : ''}\nEntrevista de ${dataHoraEntrevista(e.criadoPor?.em)}`;
    try {
      await navigator.clipboard.writeText(textoAnamnese(anamnese, { finalidade: e.finalidade, mapaFalantes: e.mapaFalantes, cabecalho }));
      setAviso({ msg: 'Anamnese copiada.', tom: 'success' });
    } catch {
      setAviso({ msg: 'O navegador não permitiu copiar. Selecione o texto e copie manualmente.', tom: 'error' });
    }
  };

  const pronta = e.situacao === 'pronta';
  const mostrarFalantes = pronta && !editando && (!e.falantesConfirmados || revendoFalantes) && (e.transcricao?.length ?? 0) > 0;
  const etapaAtual = ETAPAS.findIndex(x => x.id === e.situacao);

  return (
    <ResultadoPainel
      title={`Entrevista — IS ${is.is}`}
      icon="record_voice_over"
      onClose={onClose}
      footer={(
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
          <p role="note" className="text-xs font-semibold text-gold-ink flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">warning</span>
            {AVISO_IA}
          </p>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      )}
    >
      <Toast message={aviso?.msg ?? null} tone={aviso?.tom} />
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusTag tone={tomSituacao(e.situacao)}>{rotuloSituacao(e.situacao)}</StatusTag>
            {e.revisada && <StatusTag tone="success" title={`Revisada por ${e.revisada.nome} em ${dataHoraEntrevista(e.revisada.em)}`}>Revisada</StatusTag>}
            {e.anamneseEditada && <StatusTag tone="navyOutline">Editada</StatusTag>}
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <dt className="text-xs font-semibold text-ink-3">Participantes</dt>
              <dd className="text-sm text-ink">
                <ul>{e.participantes.map(p => <li key={p.nome}>{p.nome} <span className="text-ink-3">({ROTULO_PAPEL[p.papel] ?? p.papel})</span></li>)}</ul>
              </dd>
            </div>
            <div className="space-y-2">
              <div><dt className="text-xs font-semibold text-ink-3">Finalidade</dt><dd className="text-sm text-ink">{e.finalidade || is.finalidade}</dd></div>
              <div>
                <dt className="text-xs font-semibold text-ink-3">Gravada</dt>
                <dd className="text-sm text-ink">
                  {dataHoraEntrevista(e.criadoPor?.em) || '—'}{e.criadoPor?.nome ? ` por ${e.criadoPor.nome}` : ''}
                  {e.audio?.duracaoSeg ? ` · ${formatarDuracao(e.audio.duracaoSeg)}` : ''}
                </dd>
              </div>
            </div>
          </dl>
          {e.revisada && <p className="text-xs text-ink-3">Revisada por {e.revisada.nome}{dataHoraEntrevista(e.revisada.em) ? ` em ${dataHoraEntrevista(e.revisada.em)}` : ''}.</p>}
        </div>

        {/* Em andamento */}
        {(e.situacao === 'aguardando_envio' || e.situacao === 'transcrevendo' || e.situacao === 'organizando') && (
          <section aria-live="polite" className="rounded-xl border border-line bg-paper p-4 space-y-3">
            <p className="font-bold text-navy flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] animate-spin" aria-hidden="true">progress_activity</span>
              {e.situacao === 'aguardando_envio' ? 'Aguardando o envio do áudio…' : e.situacao === 'transcrevendo' ? 'Transcrevendo…' : 'Organizando…'}
            </p>
            <ol className="space-y-1.5">
              {ETAPAS.map((et, i) => {
                const feita = i < etapaAtual;
                const atual = i === etapaAtual;
                return (
                  <li key={et.id} className={`flex items-center gap-2 text-sm ${atual ? 'font-bold text-navy' : feita ? 'text-ink' : 'text-ink-4'}`}>
                    <span className={`material-symbols-outlined text-[18px] ${feita ? 'text-green' : ''}`} aria-hidden="true">{feita ? 'check_circle' : atual ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
                    {et.rotulo}{feita ? ' — concluída' : atual ? ' — em andamento' : ''}
                  </li>
                );
              })}
            </ol>
            <p className="text-xs text-ink-3">
              {e.situacao === 'aguardando_envio'
                ? 'O celular que gravou ainda está enviando o áudio. Se a gravação foi interrompida e o envio não aconteceu, grave a entrevista de novo.'
                : e.situacao === 'transcrevendo'
                  ? 'O servidor está transcrevendo o áudio e separando as vozes (Speech-to-Text). Leva alguns minutos — em geral menos que a metade da duração da entrevista.'
                  : 'A transcrição está pronta; a IA está organizando a anamnese médico-pericial. Costuma levar menos de um minuto.'}
              {' '}O andamento é conferido enquanto o detalhe da IS estiver aberto; pode fechar esta janela e voltar depois.
            </p>
          </section>
        )}

        {/* Erro */}
        {e.situacao === 'erro' && (
          <section role="alert" className="rounded-xl border border-wine/30 bg-wine/10 p-4 space-y-2">
            <p className="font-bold text-wine flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">error</span>
              Não foi possível concluir o processamento.
            </p>
            <p className="text-sm text-ink">{e.erro || 'Erro desconhecido.'}</p>
            <p className="text-xs text-ink-3">{e.transcricao?.length ? 'A transcrição está salva; tentar de novo refaz só a organização da anamnese.' : 'Tentar de novo consulta o servidor e retoma a transcrição.'}</p>
            <Button icon="refresh" loading={ocupado === 'tentar'} onClick={tentarNovamente}>Tentar novamente</Button>
          </section>
        )}

        {/* Áudio (também útil enquanto processa ou com erro) */}
        {e.audio && (
          <ResultadoAudio url={audioUrl} carregando={audioCarregando} erro={audioErro} apagarApos={apagarApos} apagado={audioApagado} onCarregar={carregarAudio} audioRef={audioRef} />
        )}

        {/* Pronta */}
        {pronta && (
          <>
            {mostrarFalantes && (
              <ResultadoFalantes
                entrevista={e}
                salvando={ocupado === 'falantes'}
                onConfirmar={confirmarFalantes}
                onCancelar={revendoFalantes ? () => setRevendoFalantes(false) : undefined}
                onOuvir={temAudio ? ouvir : undefined}
              />
            )}
            {ofertaReorganizar && !mostrarFalantes && (
              <section className="rounded-xl border border-line bg-paper p-4 space-y-2">
                <p className="text-sm text-ink">Os nomes confirmados já aparecem na transcrição e nas citações. Quer que a IA reorganize a anamnese usando esses nomes?</p>
                {e.anamneseEditada && <p className="text-xs text-ink-3">A edição feita à mão continua valendo na tela até ser editada de novo; a nova organização fica salva como original.</p>}
                <div className="flex flex-wrap gap-2">
                  <Button icon="auto_awesome" loading={ocupado === 'reorganizar'} onClick={reorganizar}>Reorganizar com os nomes confirmados</Button>
                  <Button variant="ghost" onClick={() => setOfertaReorganizar(false)}>Agora não</Button>
                </div>
              </section>
            )}

            {editando && anamnese ? (
              <ResultadoAnamneseEdicao
                inicial={anamnese}
                finalidade={e.finalidade}
                mapaFalantes={e.mapaFalantes}
                salvando={ocupado === 'edicao'}
                onSalvar={salvarEdicao}
                onCancelar={() => setEditando(false)}
              />
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {anamnese && <Button variant="secondary" icon="edit" onClick={() => { setAba('anamnese'); setEditando(true); }}>Editar</Button>}
                  {anamnese && <Button variant="secondary" icon="content_copy" onClick={copiar}>Copiar</Button>}
                  {!e.revisada && <Button icon="task_alt" loading={ocupado === 'revisada'} onClick={marcarRevisada}>Marcar como revisada</Button>}
                  {e.falantesConfirmados && !revendoFalantes && (e.transcricao?.length ?? 0) > 0 && (
                    <Button variant="ghost" icon="group" onClick={() => setRevendoFalantes(true)}>Rever falantes</Button>
                  )}
                </div>
                {e.anamneseEditada && e.editadoPor && (
                  <p className="text-xs text-ink-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit_note</span>
                    Editada por {e.editadoPor.nome}{dataHoraEntrevista(e.editadoPor.em) ? ` em ${dataHoraEntrevista(e.editadoPor.em)}` : ''}.
                  </p>
                )}

                <Segmented<Aba>
                  ariaLabel="Conteúdo da entrevista"
                  value={aba}
                  onChange={setAba}
                  fullWidth
                  options={[
                    { value: 'anamnese', label: isDesktop ? 'Anamnese organizada' : 'Anamnese' },
                    { value: 'transcricao', label: isDesktop ? 'Transcrição íntegra' : 'Transcrição' },
                  ]}
                />
                {aba === 'anamnese' ? (
                  anamnese
                    ? <ResultadoAnamnese anamnese={anamnese} finalidade={e.finalidade} mapaFalantes={e.mapaFalantes} onOuvir={temAudio ? ouvir : undefined} />
                    : <p className="text-sm text-ink-3">A anamnese ainda não foi organizada.</p>
                ) : (
                  <ResultadoTranscricao falas={e.transcricao} mapaFalantes={e.mapaFalantes} onOuvir={temAudio ? ouvir : undefined} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </ResultadoPainel>
  );
};
