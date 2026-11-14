// Ficheiro: components/painel/SecaoUso.tsx
// Seção "Uso do app" do Painel (só Admin): usuários ativos, acessos às páginas, ações registradas, página mais
// usada e quem está sem acesso há 30 dias; acessos e ações por dia (28 dias), páginas mais acessadas, quem mais
// acessa, ações por tipo, ações por usuário e tipo e uso por perfil. Só contagens (coleção uso_diario,
// services/usoDiario.ts) — nada de conteúdo.
import React, { useMemo } from 'react';
import { resumoUso, variacao, type JanelaPainel, type UsoDia, type UsuarioUso } from '../../utils/painel';
import { PAGE_DEFS, ROLES } from '../../config/permissions';
import { GradePainel } from '../ui/Grade';
import { GraficoLinhas, MapaCalor, type SerieGrafico } from './graficos';
import { AcaoTexto, baixarCsv, Bloco, CabecalhoSecao, fmtNum, fmtPct, fmtQuando, KpiDelta, Legenda, LinhaKpis, ListaBarras, SemDados } from './partes';

const SERIES: SerieGrafico[] = [
  { nome: 'Acessos', traco: 'stroke-navy', preenchimento: 'fill-navy' },
  { nome: 'Ações', traco: 'stroke-blue-400', preenchimento: 'fill-blue-400', tracejada: true },
];

const ROTULO_PAGINA: Record<string, string> = { home: 'Início', painel: 'Painel', perfil: 'Perfil', usuarios: 'Usuários', configuracoes: 'Configurações', 'dgpm406-anexos': 'DGPM-406 (anexos)' };
export const rotuloPagina = (id: string): string => ROTULO_PAGINA[id] ?? PAGE_DEFS.find(p => p.id === id)?.label ?? id;
export const rotuloPerfil = (perfil: string): string =>
  perfil === 'admin' ? 'Admin' : (ROLES.find(r => r.id === perfil)?.label.replace(/^User /, '') ?? perfil);

interface Props { dias: UsoDia[]; usuarios: UsuarioUso[]; janela: JanelaPainel; hoje: string; desktop: boolean }

export const SecaoUso: React.FC<Props> = ({ dias, usuarios, janela, hoje, desktop }) => {
  const r = useMemo(() => resumoUso(dias, usuarios, janela, hoje), [dias, usuarios, janela, hoje]);
  const vs = `vs. ${janela.rotuloAnterior}`;
  const semMedicao = dias.length === 0;

  const exportar = () => baixarCsv(`uso-do-app-${janela.atual.inicio}-${janela.atual.fim}.csv`,
    ['Usuário', 'Perfil', 'Acessos', 'Ações', ...r.tipos.map(t => r.acoesPorTipo.find(a => a.chave === t)?.rotulo ?? t), 'Último acesso'],
    r.usuarios.map(u => [u.usuario, rotuloPerfil(u.perfil), u.acessos, u.acoes, ...r.tipos.map(t => u.porTipo[t] ?? 0), u.ultimo ? new Date(u.ultimo).toLocaleString('pt-BR') : '']));

  const topUsuarios = r.usuarios.slice(0, desktop ? 8 : 4);
  return (
    <div className="flex flex-col gap-4">
      <CabecalhoSecao
        id="painel-uso" icone="monitoring" titulo="Uso do app" subtitulo="Quem usa, quanto e para quê — só contagens, sem conteúdo"
        extra={(
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-thead text-xs font-bold text-ink-3">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">lock</span>só Admin
          </span>
        )}
      />
      {semMedicao && (
        <p className="text-sm text-ink-3 bg-thead rounded-lg px-4 py-3">
          A medição de uso começou agora: os números aparecem conforme a equipe navega. Guardamos 12 meses.
        </p>
      )}
      <LinhaKpis>
        <KpiDelta label={desktop ? 'Usuários ativos no período' : 'Usuários ativos'} value={`${fmtNum(r.ativos.atual)}${desktop ? '' : `/${fmtNum(r.ativos.total)}`}`}
          variacao={variacao(r.ativos.atual, r.ativos.anterior, 'abs')} vs={vs} hint={desktop ? `de ${fmtNum(r.ativos.total)} · ${fmtNum(r.ativos.hoje)} ativos hoje` : undefined} />
        <KpiDelta label={desktop ? 'Acessos às páginas' : 'Acessos'} value={fmtNum(r.acessos.atual)} variacao={variacao(r.acessos.atual, r.acessos.anterior)} vs={vs}
          hint={r.acessos.porDia != null ? `≈ ${fmtNum(r.acessos.porDia)} por dia` : undefined} />
        <KpiDelta label={desktop ? 'Ações registradas' : 'Ações'} value={fmtNum(r.acoes.atual)} variacao={variacao(r.acoes.atual, r.acoes.anterior)} vs={vs}
          hint="cadastros, agendamentos, e-mails…" />
        <KpiDelta label={desktop ? 'Sem acesso há 30 dias' : 'Inativos 30 d'} value={fmtNum(r.semAcesso30)} hint={r.semAcesso30 === 1 ? 'usuário ativo' : 'usuários ativos'} to="/usuarios" />
        <KpiDelta label="Mais usado" value={r.maisUsado ? rotuloPagina(r.maisUsado.pagina) : '—'} hint={r.maisUsado ? `${fmtPct(r.maisUsado.pct)} dos acessos` : undefined} soDesktop />
      </LinhaKpis>
      <GradePainel
        rotuloApoio="Páginas mais acessadas"
        principal={(
          <Bloco titulo={desktop ? 'Acessos e ações por dia (últimos 28 dias)' : 'Últimos 28 dias'} acoes={<Legenda itens={[{ nome: 'Acessos', classe: 'bg-navy' }, { nome: 'Ações', classe: 'bg-blue-400', forma: 'tracejada' }]} />}>
            <GraficoLinhas titulo="Acessos e ações por dia, últimos 28 dias" pontos={r.serie28} series={SERIES} cadaRotulo={4} altura={desktop ? 180 : 150} />
          </Bloco>
        )}
        apoio={desktop ? (
          <Bloco titulo="Páginas mais acessadas">
            <ListaBarras itens={r.paginas.map(p => ({ ...p, rotulo: rotuloPagina(p.chave) }))} limite={6} />
          </Bloco>
        ) : (
          <Bloco titulo="Quem mais acessa">
            <ListaBarras numerada itens={topUsuarios.map(u => ({ chave: u.uid, rotulo: u.usuario, valor: u.acessos, detalhe: `${rotuloPerfil(u.perfil)} · ${fmtNum(u.acoes)} ações` }))} limite={4} />
          </Bloco>
        )}
      />
      <div className="@container">
        <div className="grid grid-cols-1 @split:grid-cols-12 gap-6 items-start">
          {desktop && (
            <Bloco className="@split:col-span-7" titulo="Quem mais acessa" acoes={r.usuarios.length > 0 && <AcaoTexto icone="download" onClick={exportar}>Exportar CSV</AcaoTexto>}>
              {topUsuarios.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-ink-3 border-b border-line">
                        <th scope="col" className="text-left font-semibold py-2">Usuário</th>
                        <th scope="col" className="text-left font-semibold py-2">Perfil</th>
                        <th scope="col" className="text-right font-semibold py-2">Acessos</th>
                        <th scope="col" className="text-right font-semibold py-2">Ações</th>
                        <th scope="col" className="text-right font-semibold py-2">Último acesso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topUsuarios.map(u => (
                        <tr key={u.uid} className="border-b border-line last:border-0">
                          <td className="py-2 text-ink">{u.usuario}</td>
                          <td className="py-2 text-ink-3">{rotuloPerfil(u.perfil)}</td>
                          <td className="py-2 text-right font-bold text-navy tabular-nums">{fmtNum(u.acessos)}</td>
                          <td className="py-2 text-right tabular-nums">{fmtNum(u.acoes)}</td>
                          <td className="py-2 text-right text-ink-3">{fmtQuando(u.ultimo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <SemDados />}
            </Bloco>
          )}
          <Bloco className="@split:col-span-5" titulo="Ações por tipo">
            <ListaBarras itens={r.acoesPorTipo.map(a => ({ ...a, alerta: a.chave === 'exclusao' }))} limite={desktop ? 8 : 3} />
          </Bloco>
        </div>
      </div>
      {desktop && (
        <div className="@container">
          <div className="grid grid-cols-1 @split:grid-cols-12 gap-6 items-start">
            <Bloco className="@split:col-span-7" titulo="Ações por usuário e tipo">
              {r.tipos.length && topUsuarios.length ? (
                <MapaCalor titulo="Ações por usuário e tipo no período" colunas={r.tipos.map(t => r.acoesPorTipo.find(a => a.chave === t)?.rotulo ?? t)}
                  linhas={topUsuarios.map(u => ({ chave: u.uid, rotulo: u.usuario, valores: r.tipos.map(t => u.porTipo[t] ?? 0) }))} />
              ) : <SemDados />}
            </Bloco>
            <Bloco className="@split:col-span-5" titulo="Uso por perfil">
              <ListaBarras itens={r.porPerfil.map(p => ({ ...p, rotulo: rotuloPerfil(p.chave) }))} limite={6} />
            </Bloco>
          </div>
        </div>
      )}
    </div>
  );
};
