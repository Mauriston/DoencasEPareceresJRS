// Ficheiro: components/ferias/TimelineAfastamentos.tsx
// Visão Timeline (Gantt) da página Férias: uma linha por férias/afastamento, com o usuário em "avatar card" (foto +
// login) à esquerda e, à direita, a barra horizontal ao longo dos meses do ano escolhido, com o tipo dentro. Fundo da
// linha pelo grupo (JRS = Admin + user_medicos; MPI; Secretaria). Passar o mouse (ou focar) na barra abre o tooltip
// com os demais dados. Linha vertical em hoje.
import React, { useMemo, useState } from 'react';
import { Avatar } from '../shell/UserMenu';
import { StatusTag } from '../ui/StatusTag';
import type { AfastamentoRecord } from '../../services/afastamentos';
import {
  GRUPOS_AFASTAMENTO, STATUS_AFASTAMENTO, grupoDoPerfil, janelaDeMeses, posicaoNaJanela, rotuloTipo, statusEfetivo,
  type GrupoAfastamento, type TipoAfastamento,
} from '../../utils/afastamentos';
import { dataBr } from '../../utils/inspecoes';

const FUNDO_GRUPO: Record<GrupoAfastamento, string> = { jrs: 'bg-blue-50', mpi: 'bg-green-50', secretaria: 'bg-gold-50' };
const MARCA_GRUPO: Record<GrupoAfastamento, string> = { jrs: 'bg-blue-500', mpi: 'bg-green-600', secretaria: 'bg-gold-400' };
const BARRA_TIPO: Record<TipoAfastamento, string> = { ferias: 'bg-navy text-white', lts: 'bg-wine text-white', lic_adm: 'bg-gold-400 text-navy' };

interface Props {
  afastamentos: AfastamentoRecord[];
  fotos: Map<string, string>;
  ano: number;
  onAno: (ano: number) => void;
  hoje: string;
  onAbrir?: (a: AfastamentoRecord) => void;
}

export const TimelineAfastamentos: React.FC<Props> = ({ afastamentos, fotos, ano, onAno, hoje, onAbrir }) => {
  const janela = useMemo(() => janelaDeMeses(`${ano}-01-01`, `${ano}-12-31`), [ano]);
  const [dica, setDica] = useState<{ a: AfastamentoRecord; x: number; y: number } | null>(null);
  const ordemGrupo: GrupoAfastamento[] = ['jrs', 'mpi', 'secretaria'];
  const linhas = useMemo(() => afastamentos
    .filter(a => posicaoNaJanela(janela, a.dataInicio, a.dataFim))
    .sort((x, y) => ordemGrupo.indexOf(grupoDoPerfil(x.perfil)) - ordemGrupo.indexOf(grupoDoPerfil(y.perfil)) || x.dataInicio.localeCompare(y.dataInicio)),
  [afastamentos, janela]); // eslint-disable-line react-hooks/exhaustive-deps
  const hojeNaJanela = posicaoNaJanela(janela, hoje, hoje);

  const mostrar = (a: AfastamentoRecord, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setDica({ a, x: Math.min(r.left + r.width / 2, window.innerWidth - 170), y: r.bottom + 8 });
  };

  return (
    <div className="bg-white rounded-xl border border-line overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onAno(ano - 1)} aria-label="Ano anterior" className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-navy hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
            <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
          </button>
          <span className="text-h2 font-bold text-navy tabular-nums min-w-[4rem] text-center">{ano}</span>
          <button type="button" onClick={() => onAno(ano + 1)} aria-label="Próximo ano" className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-navy hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
            <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3" aria-label="Legenda">
          {GRUPOS_AFASTAMENTO.map(g => (
            <span key={g.id} className="inline-flex items-center gap-1.5"><span className={`w-3 h-3 rounded-sm ${FUNDO_GRUPO[g.id]} border border-line`} aria-hidden="true" />{g.rotulo}</span>
          ))}
          <span className="w-px h-4 bg-line" aria-hidden="true" />
          {(['ferias', 'lts', 'lic_adm'] as TipoAfastamento[]).map(t => (
            <span key={t} className="inline-flex items-center gap-1.5"><span className={`w-3 h-3 rounded-sm ${BARRA_TIPO[t]}`} aria-hidden="true" />{rotuloTipo(t)}</span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Cabeçalho dos meses */}
          <div className="flex border-b border-line bg-thead">
            <div className="w-56 shrink-0 px-4 py-2 text-xs font-bold text-ink-3">USUÁRIO</div>
            <div className="flex-1 flex">
              {janela.meses.map(m => (
                <div key={m.chave} style={{ width: `${(m.dias / (janela.meses.reduce((s, x) => s + x.dias, 0))) * 100}%` }} className="py-2 text-center text-xs font-bold text-ink-3 border-l border-line">{m.rotulo}</div>
              ))}
            </div>
          </div>

          {linhas.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-3 text-center">Nenhuma férias ou afastamento em {ano} com os filtros escolhidos.</p>
          ) : linhas.map(a => {
            const grupo = grupoDoPerfil(a.perfil);
            const pos = posicaoNaJanela(janela, a.dataInicio, a.dataFim)!;
            const st = STATUS_AFASTAMENTO.find(s => s.id === statusEfetivo(a, hoje))!;
            return (
              <div key={a.id} className={`flex items-stretch border-b border-line last:border-b-0 ${FUNDO_GRUPO[grupo]}`}>
                <div className="w-56 shrink-0 flex items-center gap-2 px-3 py-2">
                  <span className={`w-1 self-stretch rounded-full ${MARCA_GRUPO[grupo]}`} aria-hidden="true" />
                  <Avatar nome={a.usuario} imageProfile={fotos.get(a.usuarioUid)} size={32} tone="light" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-navy truncate">{a.usuario}</span>
                    <span className="block text-xs text-ink-3">{GRUPOS_AFASTAMENTO.find(g => g.id === grupo)!.rotulo}</span>
                  </span>
                </div>
                <div className="relative flex-1 min-h-[52px]">
                  {/* Grade dos meses */}
                  <div className="absolute inset-0 flex" aria-hidden="true">
                    {janela.meses.map(m => <div key={m.chave} style={{ width: `${(m.dias / (janela.meses.reduce((s, x) => s + x.dias, 0))) * 100}%` }} className="border-l border-line/70" />)}
                  </div>
                  {hojeNaJanela && <div className="absolute top-0 bottom-0 w-0.5 bg-gold-400" style={{ left: `${hojeNaJanela.esquerda}%` }} aria-hidden="true" />}
                  <button
                    type="button"
                    onClick={() => onAbrir?.(a)}
                    onMouseEnter={e => mostrar(a, e.currentTarget)} onMouseLeave={() => setDica(null)}
                    onFocus={e => mostrar(a, e.currentTarget)} onBlur={() => setDica(null)}
                    aria-label={`${a.usuario}: ${rotuloTipo(a.tipo)} de ${dataBr(a.dataInicio)} a ${dataBr(a.dataFim)} (${a.duracaoDias} dias), ${st.rotulo}`}
                    style={{ left: `${pos.esquerda}%`, width: `max(${pos.largura}%, 6px)` }}
                    className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-md px-2 text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis text-left shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${BARRA_TIPO[a.tipo]} ${st.id === 'gozada' ? 'opacity-60' : ''}`}
                  >
                    {rotuloTipo(a.tipo)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {dica && (
        <div role="tooltip" style={{ position: 'fixed', left: dica.x, top: dica.y, transform: 'translateX(-50%)' }} className="z-dialog w-80 max-w-[90vw] rounded-xl border border-line bg-white shadow-xl p-3 pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
            <Avatar nome={dica.a.usuario} imageProfile={fotos.get(dica.a.usuarioUid)} size={36} tone="light" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-navy truncate">{dica.a.usuario}</p>
              <p className="text-xs text-ink-3">{GRUPOS_AFASTAMENTO.find(g => g.id === grupoDoPerfil(dica.a.perfil))!.rotulo}</p>
            </div>
            <StatusTag tone={STATUS_AFASTAMENTO.find(s => s.id === statusEfetivo(dica.a, hoje))!.tom} className="ml-auto shrink-0">{STATUS_AFASTAMENTO.find(s => s.id === statusEfetivo(dica.a, hoje))!.rotulo}</StatusTag>
          </div>
          <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-ink-3">Tipo</dt><dd className="font-semibold text-ink">{rotuloTipo(dica.a.tipo)}</dd>
            <dt className="text-ink-3">Período</dt><dd className="font-semibold text-ink">{dataBr(dica.a.dataInicio)} a {dataBr(dica.a.dataFim)}</dd>
            <dt className="text-ink-3">Duração</dt><dd className="font-semibold text-ink">{dica.a.duracaoDias} dia{dica.a.duracaoDias !== 1 ? 's' : ''}</dd>
            {dica.a.referencia && <><dt className="text-ink-3">Referência</dt><dd className="font-semibold text-ink">{dica.a.referencia}</dd></>}
            {dica.a.motivo && <><dt className="text-ink-3">Motivo</dt><dd className="font-semibold text-ink">{dica.a.motivo}</dd></>}
            <dt className="text-ink-3">Arquivos</dt><dd className="font-semibold text-ink">{dica.a.arquivos?.length || 0}</dd>
          </dl>
        </div>
      )}
    </div>
  );
};
