// Ficheiro: components/inspecoes/entrevista/ResultadoAnamnese.tsx
// Leitura da anamnese organizada (a efetiva: editada pelo perito ou a original da IA), nas
// seções da anamnese médico-pericial. Os tempos (cronologia e citações) levam ao trecho do áudio.
import React from 'react';
import type { AnamneseEntrevista } from '../../../config/entrevistas';
import { ROTULO_FONTE, formatarTempo, nomeDoFalante, normalizarAnamnese, TITULO_CONDUTA_PERITO, tituloSecaoFinalidade } from '../../../utils/entrevistas';

interface Props {
  anamnese: AnamneseEntrevista;
  finalidade: string;
  mapaFalantes?: Record<string, string>;
  /** Presente quando há áudio para tocar: os tempos viram botões. */
  onOuvir?: (seg: number) => void;
}

const Secao: React.FC<{ titulo: string; vazio: boolean; children: React.ReactNode }> = ({ titulo, vazio, children }) => (
  <section className="space-y-1.5">
    <h4 className="text-xs font-bold uppercase tracking-wide text-ink-3">{titulo}</h4>
    {vazio ? <p className="text-sm text-ink-4">Não referido.</p> : children}
  </section>
);

const Lista: React.FC<{ itens: string[] }> = ({ itens }) => (
  <ul className="list-disc pl-5 space-y-1 text-sm text-ink">{itens.map((t, i) => <li key={i}>{t}</li>)}</ul>
);

const Tempo: React.FC<{ seg?: number; onOuvir?: (seg: number) => void }> = ({ seg, onOuvir }) => {
  if (typeof seg !== 'number') return null;
  const t = formatarTempo(seg);
  return onOuvir
    ? <button type="button" onClick={() => onOuvir(seg)} className="font-mono text-xs font-bold text-navy underline min-h-[24px]" aria-label={`Ouvir a partir de ${t}`}>{t}</button>
    : <span className="font-mono text-xs text-ink-3">{t}</span>;
};

export const ResultadoAnamnese: React.FC<Props> = ({ anamnese, finalidade, mapaFalantes, onOuvir }) => {
  const a = normalizarAnamnese(anamnese);
  return (
    <div className="space-y-5">
      <Secao titulo="Resumo executivo" vazio={!a.resumoExecutivo}><p className="text-sm text-ink whitespace-pre-line">{a.resumoExecutivo}</p></Secao>
      <Secao titulo="Queixa principal" vazio={!a.queixaPrincipal}><p className="text-sm text-ink whitespace-pre-line">{a.queixaPrincipal}</p></Secao>
      <Secao titulo="Alegações do inspecionado" vazio={!a.alegacoesInspecionado.length}><Lista itens={a.alegacoesInspecionado} /></Secao>
      <Secao titulo="História em ordem cronológica" vazio={!a.historiaCronologica.length}>
        <ol className="space-y-2">
          {a.historiaCronologica.map((i, k) => (
            <li key={k} className="rounded-lg border border-line p-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
                <span className="font-bold text-navy">{i.quando || 'Não referido'}</span>
                <span aria-hidden="true">·</span>
                <span>{ROTULO_FONTE[i.fonte] ?? i.fonte}</span>
                {typeof i.tempoSeg === 'number' && <><span aria-hidden="true">·</span><Tempo seg={i.tempoSeg} onOuvir={onOuvir} /></>}
              </div>
              <p className="text-sm text-ink mt-1">{i.evento}</p>
            </li>
          ))}
        </ol>
      </Secao>
      <Secao titulo="Antecedentes" vazio={!a.antecedentes.length}><Lista itens={a.antecedentes} /></Secao>
      <Secao titulo="Medicações" vazio={!a.medicacoes.length}><Lista itens={a.medicacoes} /></Secao>
      <Secao titulo="Tratamentos" vazio={!a.tratamentos.length}><Lista itens={a.tratamentos} /></Secao>
      <Secao titulo="Exames citados" vazio={!a.examesCitados.length}><Lista itens={a.examesCitados} /></Secao>
      <Secao titulo="Repercussão funcional" vazio={!a.repercussaoFuncional}><p className="text-sm text-ink whitespace-pre-line">{a.repercussaoFuncional}</p></Secao>
      <Secao titulo={tituloSecaoFinalidade(a, finalidade)} vazio={!a.secaoFinalidade.texto}><p className="text-sm text-ink whitespace-pre-line">{a.secaoFinalidade.texto}</p></Secao>
      <Secao titulo={TITULO_CONDUTA_PERITO} vazio={!a.condutaPerito.length}><Lista itens={a.condutaPerito} /></Secao>
      <Secao titulo="Pontos a esclarecer" vazio={!a.pontosAEsclarecer.length}><Lista itens={a.pontosAEsclarecer} /></Secao>
      <Secao titulo="Citações literais" vazio={!a.citacoes.length}>
        <ul className="space-y-2">
          {a.citacoes.map((c, k) => (
            <li key={k} className="border-l-2 border-gold pl-3">
              <p className="text-sm text-ink italic">“{c.texto}”</p>
              <p className="text-xs text-ink-3 flex items-center gap-2">{nomeDoFalante(c.falante, mapaFalantes)} <Tempo seg={c.tempoSeg} onOuvir={onOuvir} /></p>
            </li>
          ))}
        </ul>
      </Secao>
    </div>
  );
};
