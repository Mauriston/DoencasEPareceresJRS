// Ficheiro: components/painel/SecaoInspecoes.tsx
// Seção "Inspeções de Saúde" do Painel: abertas, finalizadas, tempo até o TIS, atrasadas e faltas no período,
// a série de 12 meses, as etapas das IS em curso, as finalidades e a tabela por perito. Médicos começam nas
// próprias IS e o MPI nas do MPI, com alternância para o total.
import React, { useMemo, useState } from 'react';
import {
  aplicarRecorteIS, emCursoPorEtapa, porFinalidade, porPerito, recorteInicialIS, resumoIS, serieMensalIS, variacao,
  type ISPainel, type JanelaPainel, type RecorteIS,
} from '../../utils/painel';
import { Segmented } from '../ui/Segmented';
import { GradePainel } from '../ui/Grade';
import { GraficoLinhas, type SerieGrafico } from './graficos';
import { AcaoTexto, baixarCsv, Bloco, CabecalhoSecao, fmtDias, fmtNum, fmtPct, KpiDelta, Legenda, LinhaKpis, ListaBarras, SemDados } from './partes';
import { destaqueDaJanela } from './periodo';

const LISTA = '/inspecoes';

const SERIES: SerieGrafico[] = [
  { nome: 'Abertas', traco: 'stroke-navy', preenchimento: 'fill-navy' },
  { nome: 'Finalizadas', traco: 'stroke-blue-400', preenchimento: 'fill-blue-400', tracejada: true },
];

const ROTULO_RECORTE: Record<RecorteIS, string> = { todas: 'JRS + MPI · todos os peritos', minhas: 'Minhas IS', mpi: 'Só MPI' };

interface Props { lista: ISPainel[]; janela: JanelaPainel; hoje: string; uid: string; perfil: string; desktop: boolean }

export const SecaoInspecoes: React.FC<Props> = ({ lista, janela, hoje, uid, perfil, desktop }) => {
  const inicial = recorteInicialIS(perfil);
  const [recorte, setRecorte] = useState<RecorteIS>(inicial);
  const dados = useMemo(() => aplicarRecorteIS(lista, recorte, uid), [lista, recorte, uid]);
  const r = useMemo(() => resumoIS(dados, janela, hoje), [dados, janela, hoje]);
  const serie = useMemo(() => serieMensalIS(dados, hoje), [dados, hoje]);
  const etapas = useMemo(() => emCursoPorEtapa(dados, hoje), [dados, hoje]);
  const finalidades = useMemo(() => porFinalidade(dados, janela), [dados, janela]);
  const peritos = useMemo(() => porPerito(dados, janela), [dados, janela]);
  const vs = `vs. ${janela.rotuloAnterior}`;
  const pctFinalizadas = r.abertas.atual ? Math.round((r.finalizadas.atual / r.abertas.atual) * 100) : null;

  const exportar = () => baixarCsv(`peritos-${janela.atual.inicio}-${janela.atual.fim}.csv`, ['Perito', 'AMP', 'Realizadas', 'Tempo médio até o TIS (dias)', 'Faltas (%)'],
    peritos.map(p => [p.nome, p.amp, p.realizadas, p.tempoMedio == null ? '' : Math.round(p.tempoMedio), p.faltas ?? '']));

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoSecao
        id="painel-inspecoes" icone="event_available" titulo="Inspeções de Saúde" subtitulo="Abertas, finalizadas e prazos no período"
        recorte={ROTULO_RECORTE[recorte]}
        extra={inicial !== 'todas' && (
          <Segmented ariaLabel="Recorte das inspeções" value={recorte} onChange={setRecorte}
            options={[{ value: inicial, label: inicial === 'minhas' ? 'Minhas' : 'Só MPI' }, { value: 'todas', label: 'Todas' }]} />
        )}
        abrir={{ rotulo: 'Abrir Inspeções', to: LISTA }}
      />
      <LinhaKpis>
        <KpiDelta label="Abertas no período" value={fmtNum(r.abertas.atual)} variacao={variacao(r.abertas.atual, r.abertas.anterior)} vs={vs} to={LISTA} />
        <KpiDelta label="Finalizadas (TIS assinado)" value={fmtNum(r.finalizadas.atual)} variacao={variacao(r.finalizadas.atual, r.finalizadas.anterior, 'pct', 'maior-melhor')} vs={vs}
          hint={pctFinalizadas != null ? `${pctFinalizadas}% das abertas` : undefined} to={LISTA} />
        <KpiDelta label="Tempo médio até o TIS" value={fmtDias(r.tempoMedio.atual)} variacao={variacao(r.tempoMedio.atual, r.tempoMedio.anterior, 'abs', 'menor-melhor', 'dias')} vs={vs}
          hint="abertura → TIS assinado" to={LISTA} />
        <KpiDelta label="Atrasadas agora" value={fmtNum(r.atrasadas)} hint={r.atrasadas30 ? `${r.atrasadas30} há mais de 30 dias` : 'sem agendamento no prazo'} to={LISTA} />
        <KpiDelta label="Faltas" value={fmtPct(r.faltas.atual)} variacao={variacao(r.faltas.atual, r.faltas.anterior, 'pp', 'menor-melhor')} vs={vs}
          hint="das entrevistas agendadas" to={LISTA} soDesktop />
      </LinhaKpis>
      <GradePainel
        rotuloApoio="IS em curso"
        principal={(
          <Bloco titulo="Abertas × finalizadas por mês" acoes={<Legenda itens={[{ nome: 'Abertas', classe: 'bg-navy' }, { nome: 'Finalizadas', classe: 'bg-blue-400', forma: 'tracejada' }]} />}>
            <GraficoLinhas titulo="Inspeções abertas e finalizadas por mês, últimos 12 meses" pontos={serie} series={SERIES} destaque={destaqueDaJanela(serie, janela)} />
          </Bloco>
        )}
        apoio={(
          <Bloco titulo={desktop ? 'Onde estão as IS em curso' : 'Em curso'}>
            {etapas.length ? <ListaBarras itens={etapas.map(e => ({ ...e, to: LISTA }))} limite={desktop ? 9 : 3} rotuloVerTodas="Ver detalhes" /> : <SemDados texto="Nenhuma IS em curso." />}
          </Bloco>
        )}
      />
      {desktop && (
        <div className="@container">
          <div className="grid grid-cols-1 @split:grid-cols-12 gap-6 items-start">
            <Bloco className="@split:col-span-5 @split:order-2" titulo="Por finalidade">
              <ListaBarras itens={finalidades.map(f => ({ ...f, to: LISTA }))} limite={6} />
            </Bloco>
            <Bloco className="@split:col-span-7 @split:order-1" titulo="Por perito" acoes={peritos.length > 0 && <AcaoTexto icone="download" onClick={exportar}>Exportar CSV</AcaoTexto>}>
              {peritos.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-ink-3 border-b border-line">
                        <th scope="col" className="text-left font-semibold py-2">Perito</th>
                        <th scope="col" className="text-right font-semibold py-2">Realizadas</th>
                        <th scope="col" className="text-right font-semibold py-2">Tempo médio</th>
                        <th scope="col" className="text-right font-semibold py-2">Faltas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {peritos.map(p => (
                        <tr key={p.uid} className="border-b border-line last:border-0">
                          <td className="py-2 text-ink">{p.nome}{p.amp === 'MPI' && <span className="text-ink-3"> · MPI</span>}</td>
                          <td className="py-2 text-right font-bold text-navy tabular-nums">{fmtNum(p.realizadas)}</td>
                          <td className="py-2 text-right tabular-nums">{p.tempoMedio == null ? '—' : `${Math.round(p.tempoMedio)} d`}</td>
                          <td className="py-2 text-right tabular-nums">{fmtPct(p.faltas)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <SemDados />}
            </Bloco>
          </div>
        </div>
      )}
    </div>
  );
};
