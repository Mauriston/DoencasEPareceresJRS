// Ficheiro: components/ferias/TimelineAfastamentos.tsx
// Visão Timeline (Gantt) da página Férias: uma linha por férias/afastamento, com o usuário em "avatar card" (foto +
// login) à esquerda e, à direita, a barra horizontal ao longo dos meses, com o tipo dentro. A janela é sempre
// centrada em hoje, com a escala escolhida (bimestral, quadrimestral — padrão —, semestral ou anual). Fundo da
// linha pelo grupo (JRS = Admin + user_medicos; MPI; Secretaria). Passar o mouse (ou focar) na barra abre o tooltip
// com os demais dados. Linha vertical em hoje.
import React, { useMemo, useState } from 'react';
import { Avatar } from '../shell/UserMenu';
import { StatusTag } from '../ui/StatusTag';
import { Segmented } from '../ui/Segmented';
import type { AfastamentoRecord } from '../../services/afastamentos';
import {
  ESCALAS_TIMELINE, GRUPOS_AFASTAMENTO, STATUS_AFASTAMENTO, grupoDoPerfil, janelaCentrada, posicaoNaJanela, rotuloTipo, statusEfetivo,
  type EscalaTimeline, type GrupoAfastamento, type TipoAfastamento,
} from '../../utils/afastamentos';
import { dataBr } from '../../utils/inspecoes';

const FUNDO_GRUPO: Record<GrupoAfastamento, string> = { jrs: 'bg-blue-50', mpi: 'bg-green-50', secretaria: 'bg-gold-50' };
const MARCA_GRUPO: Record<GrupoAfastamento, string> = { jrs: 'bg-blue-500', mpi: 'bg-green-600', secretaria: 'bg-gold-400' };
const BARRA_TIPO: Record<TipoAfastamento, string> = { ferias: 'bg-navy text-white', lts: 'bg-wine text-white', lic_adm: 'bg-gold-400 text-navy' };

interface Props {
  afastamentos: AfastamentoRecord[];
  fotos: Map<string, string>;
  escala: EscalaTimeline;
  onEscala: (e: EscalaTimeline) => void;
  hoje: string;
  onAbrir?: (a: AfastamentoRecord) => void;
}

export const TimelineAfastamentos: React.FC<Props> = ({ afastamentos, fotos, escala, onEscala, hoje, onAbrir }) => {
  const lado = ESCALAS_TIMELINE.find(e => e.id === escala)!.mesesCadaLado;
  const janela = useMemo(() => janelaCentrada(hoje, lado), [hoje, lado]);
  const totalDias = janela.meses.reduce((s, x) => s + x.dias, 0);
  const [dica, setDica] = useState<{ a: AfastamentoRecord; x: number; y: number } | null>(null);
  const ordemGrupo: GrupoAfastamento[] = ['jrs', 'mpi', 'secretaria'];
  // Um bloco por usuário (linhas contíguas, um só card à esquerda): blocos por grupo e pelo primeiro início;
  // dentro do bloco, os afastamentos em ordem de início.
  const blocos = useMemo(() => {
    const porUsuario = new Map<string, AfastamentoRecord[]>();
    afastamentos.filter(a => posicaoNaJanela(janela, a.dataInicio, a.dataFim)).forEach(a => {
      const l = porUsuario.get(a.usuarioUid) ?? [];
      l.push(a); porUsuario.set(a.usuarioUid, l);
    });
    return [...porUsuario.values()]
      .map(l => l.sort((x, y) => x.dataInicio.localeCompare(y.dataInicio)))
      .sort((x, y) => ordemGrupo.indexOf(grupoDoPerfil(x[0].perfil)) - ordemGrupo.indexOf(grupoDoPerfil(y[0].perfil))
        || x[0].dataInicio.localeCompare(y[0].dataInicio) || x[0].usuario.localeCompare(y[0].usuario, 'pt-BR'));
  }, [afastamentos, janela]); // eslint-disable-line react-hooks/exhaustive-deps
  const hojeNaJanela = posicaoNaJanela(janela, hoje, hoje);

  const mostrar = (a: AfastamentoRecord, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setDica({ a, x: Math.min(r.left + r.width / 2, window.innerWidth - 170), y: r.bottom + 8 });
  };

  return (
    <div className="bg-white rounded-xl border border-line overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line">
        <Segmented<EscalaTimeline>
          ariaLabel="Escala da timeline"
          value={escala}
          onChange={onEscala}
          options={ESCALAS_TIMELINE.map(e => ({ value: e.id, label: e.rotulo }))}
        />
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
            <div className="w-64 shrink-0 px-4 py-2 text-xs font-bold text-ink-3">USUÁRIO</div>
            <div className="flex-1 flex">
              {janela.meses.map(m => (
                <div key={m.chave} style={{ width: `${(m.dias / totalDias) * 100}%` }} className="py-2 text-center text-xs font-bold text-ink-3 border-l border-line overflow-hidden whitespace-nowrap">{m.rotulo}</div>
              ))}
            </div>
          </div>

          {blocos.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-3 text-center">Nenhuma férias ou afastamento neste período com os filtros escolhidos.</p>
          ) : blocos.map(bloco => {
            const u = bloco[0];
            const grupo = grupoDoPerfil(u.perfil);
            return (
              <div key={u.usuarioUid} className={`flex items-stretch border-b border-line last:border-b-0 ${FUNDO_GRUPO[grupo]}`}>
                {/* Card do usuário: uma vez só, ocupando a altura de todas as linhas dele */}
                <div className="w-64 shrink-0 flex items-center gap-2 px-3 py-2">
                  <span className={`w-1 self-stretch rounded-full ${MARCA_GRUPO[grupo]}`} aria-hidden="true" />
                  <Avatar nome={u.usuario} imageProfile={fotos.get(u.usuarioUid)} size={32} tone="light" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-navy truncate">{u.usuario}</span>
                    <span className="block text-xs text-ink-3">{GRUPOS_AFASTAMENTO.find(g => g.id === grupo)!.rotulo}{bloco.length > 1 ? ` · ${bloco.length} afastamentos` : ''}</span>
                  </span>
                </div>
                <div className="flex-1 flex flex-col">
                  {bloco.map(a => {
                    const pos = posicaoNaJanela(janela, a.dataInicio, a.dataFim)!;
                    const st = STATUS_AFASTAMENTO.find(x => x.id === statusEfetivo(a, hoje))!;
                    return (
                      <div key={a.id} className="relative flex-1 min-h-[52px] border-b border-line/50 last:border-b-0">
                        {/* Grade dos meses */}
                        <div className="absolute inset-0 flex" aria-hidden="true">
                          {janela.meses.map(m => <div key={m.chave} style={{ width: `${(m.dias / totalDias) * 100}%` }} className="border-l border-line/70" />)}
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
                    );
                  })}
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
