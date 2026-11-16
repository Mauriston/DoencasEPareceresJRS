// Ficheiro: components/ficha/transcricoes/PainelTranscricoes.tsx
// Ficha do inspecionado › aba Transcrições: painel principal. É AQUI que a entrevista é gravada e revisada
// (o "Gravar entrevista" da aba Inspeções de Saúde traz o usuário para cá — ?aba=transcricoes&reg=is:<id>&gravar=1):
//   - item "IS a gravar" (IS Agendada/Reagendada): a gravação no próprio painel (FluxoGravacaoEntrevista
//     casca="inline") no aparelho com microfone; no computador, "Enviar para o meu celular" (push que abre a gravação);
//   - item "Entrevista": o resultado (ResultadoEntrevista casca="inline": andamento, erro, anamnese e transcrição);
//     gravação não enviada: aviso e "Reenviar" (o fluxo oferece as gravações guardadas neste aparelho).
// Enquanto aberto, avança o processamento da entrevista em andamento da IS (useAcompanharEntrevista).
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CascaPainelFicha } from '../CascaPainelFicha';
import { Button } from '../../ui/Button';
import { FluxoGravacaoEntrevista } from '../../inspecoes/entrevista/FluxoGravacaoEntrevista';
import { EnviarParaCelularDialog } from '../../inspecoes/entrevista/EnviarParaCelularDialog';
import { ResultadoEntrevista } from '../../inspecoes/entrevista/ResultadoEntrevista';
import { fasesDeEntrevista } from '../../inspecoes/InspecaoDetalhe';
import { useAcompanharEntrevista } from '../../../services/entrevistasIS';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import type { EntrevistaDaFicha } from '../useEntrevistasDasIS';
import { podeGravarNoDispositivo } from '../../../utils/dispositivo';
import { entrevistaEmAndamento, naoEnviada } from '../../../utils/entrevistas';
import { dataHoraBr } from '../../../utils/inspecoes';

interface Props {
  is: InspecaoRecord;
  /** Entrevista aberta (null = item "IS a gravar"). */
  entrevista: EntrevistaDaFicha | null;
  /** Todas as entrevistas desta IS (para acompanhar a que está em andamento). */
  entrevistasDaIS: EntrevistaDaFicha[];
  /** Gravação pedida (?gravar=1). */
  gravar: boolean;
  onGravar: (ativo: boolean) => void;
  /** Gravação enviada: abre a entrevista no painel. */
  onConcluido: (entrevistaId: string) => void;
}

export const PainelTranscricoes: React.FC<Props> = ({ is, entrevista, entrevistasDaIS, gravar, onGravar, onConcluido }) => {
  useAcompanharEntrevista(is.id, entrevistaEmAndamento(entrevistasDaIS));
  const noAparelho = podeGravarNoDispositivo();
  const podeIniciar = fasesDeEntrevista(is);
  const [celular, setCelular] = useState(false);

  // Pedido de gravação num computador sem microfone: "Enviar para o meu celular".
  useEffect(() => {
    if (gravar && !noAparelho) { setCelular(true); onGravar(false); }
  }, [gravar, noAparelho]); // eslint-disable-line react-hooks/exhaustive-deps

  if (gravar && noAparelho) {
    return <FluxoGravacaoEntrevista casca="inline" is={is} onClose={() => onGravar(false)} onConcluido={onConcluido} />;
  }

  const acaoGravar = podeIniciar
    ? [{ id: 'gravar', rotulo: entrevista ? 'Gravar nova entrevista' : 'Gravar entrevista', icone: 'mic', onClick: () => onGravar(true) }]
    : [];
  const dialogCelular = celular && createPortal(<EnviarParaCelularDialog isId={is.id} onClose={() => setCelular(false)} />, document.body);

  if (entrevista && !naoEnviada(entrevista)) {
    return (
      <>
        <ResultadoEntrevista casca="inline" is={is} entrevista={entrevista} onClose={() => { /* inline */ }}
          rodape={podeIniciar ? <Button icon="mic" onClick={() => onGravar(true)}>Gravar nova entrevista</Button> : undefined} />
        {dialogCelular}
      </>
    );
  }

  return (
    <CascaPainelFicha
      titulo={`Entrevista · IS ${is.is}`} icone="mic"
      subtitulo={[is.finalidade, is.dataEntrevista ? `entrevista em ${dataHoraBr(is.dataEntrevista)}` : '', is.peritoNome].filter(Boolean).join(' · ')}
      acoes={entrevista
        ? (noAparelho ? [{ id: 'reenviar', rotulo: 'Reenviar gravação', icone: 'cloud_upload', onClick: () => onGravar(true) }] : [])
        : acaoGravar}
    >
      {entrevista ? (
        <p className="flex items-start gap-2 text-sm text-ink">
          <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">cloud_off</span>
          A gravação foi criada mas o áudio não foi enviado. {noAparelho ? 'Se ela ficou guardada neste aparelho, reenvie.' : 'Reenvie pelo celular em que foi gravada.'}
        </p>
      ) : (
        <p className="text-sm text-ink">
          {podeIniciar
            ? <>Nenhuma entrevista gravada nesta IS. {noAparelho ? 'Toque em "Gravar entrevista" para preparar e gravar aqui.' : 'Neste computador, "Gravar entrevista" envia a gravação para o seu celular.'}</>
            : 'A gravação fica disponível com a IS Agendada ou Reagendada.'}
        </p>
      )}
      {dialogCelular}
    </CascaPainelFicha>
  );
};
