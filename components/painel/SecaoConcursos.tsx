// Ficheiro: components/painel/SecaoConcursos.tsx
// Seção "Concursos" do Painel: concursos em andamento, candidatos finalizados e as taxas de faltas, inaptos e
// IDM no período; andamento de cada concurso em curso (aptos/inaptos/faltas/IDM — cores de estado) e os
// concursos com mais inaptos. Cada concurso abre a planilha dele.
import React, { useMemo } from 'react';
import { andamentoPorConcurso, concursosComMaisInaptos, resumoConcursos, variacao, type ConcursoPainel, type JanelaPainel } from '../../utils/painel';
import { concursoPath } from '../../config/routes';
import { Link } from 'react-router-dom';
import { GradePainel } from '../ui/Grade';
import { BarraSegmentada, Bloco, CabecalhoSecao, fmtNum, fmtPct, KpiDelta, Legenda, LinhaKpis, ListaBarras, SemDados } from './partes';

const LISTA = '/concursos';

const PARTES = [
  { nome: 'Aptos', chave: 'aptos', classe: 'bg-green' },
  { nome: 'Inaptos', chave: 'inaptos', classe: 'bg-wine' },
  { nome: 'Faltas', chave: 'faltas', classe: 'bg-gold' },
  { nome: 'IDM', chave: 'idm', classe: 'bg-ink-3' },
] as const;

interface Props { concursos: ConcursoPainel[]; janela: JanelaPainel; desktop: boolean }

export const SecaoConcursos: React.FC<Props> = ({ concursos, janela, desktop }) => {
  const r = useMemo(() => resumoConcursos(concursos, janela), [concursos, janela]);
  const andamento = useMemo(() => andamentoPorConcurso(concursos), [concursos]);
  const inaptos = useMemo(() => concursosComMaisInaptos(concursos, janela), [concursos, janela]);
  const vs = `vs. ${janela.rotuloAnterior}`;
  const umSo = r.emAndamento.length === 1 ? r.emAndamento[0] : null;

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoSecao id="painel-concursos" icone="fact_check" titulo="Concursos" subtitulo="Andamento dos concursos e resultados do período"
        recorte={janela.rotulo} abrir={{ rotulo: 'Abrir Concursos', to: LISTA }} />
      <LinhaKpis>
        <KpiDelta label="Em andamento" value={fmtNum(r.emAndamento.length)} hint={r.emAndamento.map(c => c.nome).join(' e ') || 'nenhum'} to={umSo ? concursoPath(umSo.id) : LISTA} />
        <KpiDelta label="Candidatos finalizados" value={fmtNum(r.finalizados.atual)} variacao={variacao(r.finalizados.atual, r.finalizados.anterior)} vs={vs} to={LISTA} />
        <KpiDelta label="Faltas" value={fmtPct(r.faltas.atual)} variacao={variacao(r.faltas.atual, r.faltas.anterior, 'pp', 'menor-melhor')} vs={vs} hint="dos finalizados" to={LISTA} />
        <KpiDelta label="Inaptos" value={fmtPct(r.inaptos.atual)} variacao={variacao(r.inaptos.atual, r.inaptos.anterior, 'pp')} vs={vs} hint="dos finalizados" to={LISTA} />
        <KpiDelta label="IDM" value={fmtPct(r.idm.atual)} variacao={variacao(r.idm.atual, r.idm.anterior, 'pp', 'menor-melhor')} vs={vs} hint="insuficiência documental" to={LISTA} soDesktop />
      </LinhaKpis>
      <GradePainel
        rotuloApoio="Concursos com mais inaptos"
        principal={(
          <Bloco titulo="Andamento por concurso">
            {andamento.length ? (
              <div className="flex flex-col gap-4">
                {andamento.map(c => (
                  <Link key={c.id} to={concursoPath(c.id)} className="flex flex-col gap-1.5 rounded -mx-1 px-1 py-1 hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
                    <span className="flex justify-between gap-3 text-sm">
                      <strong className="text-navy truncate" title={c.nome}>{c.nome}</strong>
                      <span className="text-ink-3 tabular-nums shrink-0">{fmtNum(c.finalizados)} de {fmtNum(c.total)}</span>
                    </span>
                    <BarraSegmentada rotulo={`${c.nome}: ${c.finalizados} de ${c.total} finalizados`} total={c.total} partes={PARTES.map(p => ({ nome: p.nome, valor: c[p.chave], classe: p.classe }))} />
                  </Link>
                ))}
                <Legenda itens={PARTES.map(p => ({ nome: p.nome, classe: p.classe, forma: 'bloco' as const }))} />
              </div>
            ) : <SemDados texto="Nenhum concurso em andamento." />}
          </Bloco>
        )}
        apoio={(
          <Bloco titulo={desktop ? 'Concursos com mais inaptos no período' : 'Mais inaptos'}>
            <ListaBarras itens={inaptos.map(i => ({ ...i, to: concursoPath(i.chave) }))} limite={desktop ? 5 : 3} />
          </Bloco>
        )}
      />
    </div>
  );
};
