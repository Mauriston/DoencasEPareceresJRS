// Ficheiro: components/inspecoes/conclusao/LaudoAssistidoIS.tsx
// Alertas de validação do campo Laudo da Conclusão da IS (formas de conclusão da DGPM-406 —
// data/formasConclusaoIS.json). O texto digitado, colado do SINAIS (Ctrl+V) ou lido dos prints é conferido pelas
// regras de utils/validacaoLaudo.ts com o contexto da IS (utils/contextoLaudo.ts: cadastro + histórico de IS do
// inspecionado). Só mostra os achados (erro/alerta + fonte); nada é reescrito.
import React, { useEffect, useMemo, useState } from 'react';
import { observarMilitar, type MilitarRecord } from '../../../services/firestoreMilitares';
import { observarInspecoesDoInspecionado, type InspecaoRecord } from '../../../services/firestoreInspecoes';
import { derivarContexto, type ContextoLaudo } from '../../../utils/contextoLaudo';
import { carregarFormasConclusao, validarLaudo, type AchadoLaudo, type FormasConclusao } from '../../../utils/validacaoLaudo';

interface Props {
  isNumero: number;
  inspecionadoId: string;
  finalidade: string;
  dataAbertura?: string;
  dataEntrevista?: string;
  laudo: string;
  restricoes?: string;
}

const Achado: React.FC<{ a: AchadoLaudo }> = ({ a }) => (
  <li className={`flex gap-2 text-xs rounded px-2 py-1.5 ${a.severidade === 'erro' ? 'bg-wine/10 text-wine' : 'bg-gold/20 text-ink'}`}>
    <span className="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">{a.severidade === 'erro' ? 'error' : 'warning'}</span>
    <span>{a.mensagem}{a.fonte ? <span className="text-ink-3"> (DGPM-406, {a.fonte})</span> : null}</span>
  </li>
);

export const LaudoAssistidoIS: React.FC<Props> = ({ isNumero, inspecionadoId, finalidade, dataAbertura, dataEntrevista, laudo, restricoes }) => {
  const [formas, setFormas] = useState<FormasConclusao | null>(null);
  const [militar, setMilitar] = useState<MilitarRecord | null | undefined>(undefined);
  const [historico, setHistorico] = useState<InspecaoRecord[]>([]);
  useEffect(() => { carregarFormasConclusao().then(setFormas).catch(() => setFormas(null)); }, []);
  useEffect(() => (inspecionadoId ? observarMilitar(inspecionadoId, setMilitar, () => setMilitar(null)) : undefined), [inspecionadoId]);
  useEffect(() => (inspecionadoId ? observarInspecoesDoInspecionado(inspecionadoId, setHistorico, () => setHistorico([])) : undefined), [inspecionadoId]);
  const contexto = useMemo<ContextoLaudo | null>(() => (militar === undefined ? null
    : derivarContexto(militar, historico, { is: isNumero, dataAbertura, dataEntrevista })), [militar, historico, isNumero, dataAbertura, dataEntrevista]);
  const resultado = useMemo(() => (formas && contexto ? validarLaudo(formas, { finalidade, laudo, restricoes, contexto }) : null), [formas, contexto, finalidade, laudo, restricoes]);

  if (!formas || !resultado?.regra || !laudo.trim() || !resultado.achados.length) return null;
  return (
    <div className="space-y-1" aria-live="polite">
      <ul className="space-y-1">{resultado.achados.map(a => <Achado key={a.id} a={a} />)}</ul>
      {resultado.parecido && <p className="text-xs text-ink-3">Modelo mais próximo: “{formas.laudos[resultado.parecido].modelo}”</p>}
    </div>
  );
};
