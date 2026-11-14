// Ficheiro: components/administracao/PerfisPermissoes.tsx
// Administração › Perfis e permissões (auditoria v3, 8b/8c — U2): um perfil por vez, páginas agrupadas por
// área com as funções de cada página logo abaixo (desligar a página desliga e trava as funções), interruptores,
// etiqueta "alterado" no que mudou, impacto ("afeta N usuários") e a barra de salvar comum com "Revisar e
// salvar". A matriz antiga fica como "Comparar perfis" (só leitura). "Ver o app como este perfil" usa o
// "ver como" do Admin que já existe (NavContext.setVerComo). Cada gravação vai para o Registro de alterações.
import React, { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Dialog } from '../ui/Dialog';
import { StatusTag } from '../ui/StatusTag';
import { Toast } from '../ui/Toast';
import { NavContext } from '../../context/NavContext';
import { Interruptor } from './Interruptor';
import { BarraSalvar, type LinhaDiferenca } from './BarraSalvar';
import { useAvisoSaida } from './useAvisoSaida';
import { NoCorpo } from './NoCorpo';
import { ROLES, PAGE_DEFS, FEATURE_DEFS, getFeaturePermissions, getPagePermissions, savePermissions, type Role } from '../../config/permissions';
import { registrarAcaoSensivel } from '../../services/auditoriaAcoes';
import type { UsuarioRecord } from '../../services/firestoreUsuarios';
import {
  AREAS, PERFIL_DESCRICAO, alternarFuncao, alternarPagina, contagemPerfil, diferencasPermissoes, linhaDiferenca,
  paginaLigada, partirRotulo, plural, resumoPermissoes, rotuloPerfil, type Matriz,
} from '../../utils/administracao';

const lerMatriz = (): Matriz => ({ pages: getPagePermissions(), features: getFeaturePermissions() });

export const PerfisPermissoes: React.FC<{ usuarios: UsuarioRecord[] }> = ({ usuarios }) => {
  const nav = useContext(NavContext);
  const navigate = useNavigate();
  const [salvo, setSalvo] = useState<Matriz>(lerMatriz);
  const [rascunho, setRascunho] = useState<Matriz>(lerMatriz);
  const [role, setRole] = useState<Role>(ROLES[0].id);
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const [comparando, setComparando] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const usuariosPorPerfil = useMemo(() => {
    const r: Record<string, number> = {};
    usuarios.filter(u => u.ativo).forEach(u => { r[u.perfil] = (r[u.perfil] || 0) + 1; });
    return r;
  }, [usuarios]);
  const difs = useMemo(() => diferencasPermissoes(salvo, rascunho), [salvo, rascunho]);
  const alterados = useMemo(() => new Set(difs.map(d => `${d.role}|${d.id}`)), [difs]);
  const descartar = () => setRascunho(salvo);
  const aviso = useAvisoSaida(difs.length > 0, descartar);

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4500); };

  const salvar = async () => {
    setSalvando(true);
    try {
      await savePermissions(rascunho.pages, rascunho.features);
      void registrarAcaoSensivel('permissoes.alterar', 'permissoes', difs.map(linhaDiferenca));
      setSalvo(rascunho);
      avisar('Permissões salvas. Valem na hora para todos os usuários dos perfis alterados.');
      return true;
    } catch {
      avisar('Não foi possível salvar as permissões. Tente novamente.', 'error');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const linhas: LinhaDiferenca[] = difs.map(d => ({
    rotulo: `${rotuloPerfil(d.role)} · ${d.rotulo}`,
    antes: d.depois ? 'Desligado' : 'Ligado',
    depois: d.depois ? 'Ligado' : 'Desligado',
  }));

  const verComo = () => { nav?.setVerComo(role); navigate('/'); };
  const tagAlterado = <StatusTag tone="attention">alterado</StatusTag>;
  const nUsuarios = usuariosPorPerfil[role] || 0;

  return (
    <div>
      <NoCorpo><Toast message={toast?.msg ?? null} tone={toast?.tone} /></NoCorpo>
      {aviso}

      {/* Seletor de perfil: um por vez, com o resumo de cada um. */}
      <fieldset className="mb-4">
        <legend className="text-xs font-semibold text-ink-3 mb-2">Perfis</legend>
        <div className="@container">
          <div role="radiogroup" aria-label="Perfil" className="grid gap-2 grid-cols-1 @md:grid-cols-2 @[52rem]:grid-cols-4">
            {ROLES.map(r => {
              const c = contagemPerfil(rascunho, r.id);
              const ativo = r.id === role;
              const temAlteracao = difs.some(d => d.role === r.id);
              return (
                <button
                  key={r.id} type="button" role="radio" aria-checked={ativo} onClick={() => setRole(r.id)}
                  className={`text-left rounded-xl border px-3 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${ativo ? 'border-navy bg-thead' : 'border-line bg-white hover:border-navy'}`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`text-sm ${ativo ? 'font-bold text-navy' : 'font-semibold text-ink'}`}>{r.label.replace(/^User /, '')}</span>
                    {temAlteracao && <span className="w-2 h-2 rounded-full bg-gold" aria-label="com alterações" />}
                  </span>
                  <span className="block text-xs text-ink-3 tabular-nums">{plural(c.paginas, 'página', 'páginas')} · {plural(c.funcoes, 'função', 'funções')} · {plural(usuariosPorPerfil[r.id] || 0, 'usuário', 'usuários')}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-ink-3 mt-2">Admin: acesso total, não editável.</p>
      </fieldset>

      <Card
        as="section"
        titleAs="h2"
        title={rotuloPerfil(role)}
        actions={(
          <>
            <Button size="sm" variant="ghost" icon="visibility" onClick={verComo} title="Navega pelo app com as permissões salvas deste perfil; volte pelo menu do avatar.">Ver o app como este perfil</Button>
            <Button size="sm" variant="secondary" icon="table_view" onClick={() => setComparando(true)}>Comparar perfis</Button>
          </>
        )}
      >
        <p className="text-sm text-ink-3 -mt-2 mb-4">{plural(nUsuarios, 'usuário ativo', 'usuários ativos')} · {PERFIL_DESCRICAO[role]}</p>
        <div className="space-y-6">
          {AREAS.map(area => (
            <div key={area.id}>
              <h3 className="text-h3 font-bold text-navy mb-1">{area.rotulo}</h3>
              <ul className="divide-y divide-line border-y border-line">
                {area.paginas.map(p => {
                  const ligada = paginaLigada(rascunho, p.id, role);
                  const nomeId = `pg-${role}-${p.id}`;
                  const ligadas = p.funcoes.filter(f => !!rascunho.features[f.id]?.[role]).length;
                  const temFuncoes = p.funcoes.length > 0 && !p.derivada;
                  const aberta = abertas[p.id] ?? false;
                  const paginaAlterada = alterados.has(`${role}|${p.id}`) || (p.derivada && p.funcoes.some(f => alterados.has(`${role}|${f.id}`)));
                  const funcoesAlteradas = p.funcoes.some(f => alterados.has(`${role}|${f.id}`));
                  return (
                    <li key={p.id}>
                      <div className="flex items-center gap-3 py-2.5 min-h-[44px]">
                        <Interruptor ligado={ligada} rotuloId={nomeId} onAlternar={l => setRascunho(m => alternarPagina(m, p.id, role, l))} />
                        <span className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                          <span id={nomeId} className="font-bold text-navy">{p.rotulo}</span>
                          {paginaAlterada && tagAlterado}
                          {!paginaAlterada && funcoesAlteradas && !aberta && tagAlterado}
                        </span>
                        {temFuncoes && (
                          <button
                            type="button" onClick={() => setAbertas(a => ({ ...a, [p.id]: !aberta }))} aria-expanded={aberta}
                            className="shrink-0 inline-flex items-center gap-1 min-h-[40px] px-2 rounded-lg text-xs text-ink-3 hover:bg-thead hover:text-navy tabular-nums"
                          >
                            {ligadas} de {plural(p.funcoes.length, 'função', 'funções')}
                            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{aberta ? 'expand_less' : 'expand_more'}</span>
                          </button>
                        )}
                        {p.derivada && <span className="shrink-0 text-xs text-ink-3 tabular-nums">{ligadas} de {p.funcoes.length} abas</span>}
                      </div>
                      {((temFuncoes && aberta) || p.derivada) && (
                        <ul className="pb-2">
                          {p.funcoes.map(f => {
                            const fid = `fn-${role}-${f.id}`;
                            const travada = !p.derivada && !ligada;
                            return (
                              <li key={f.id} className="flex items-start gap-3 py-1.5 pl-[52px]">
                                <Interruptor
                                  ligado={!!rascunho.features[f.id]?.[role]} rotuloId={fid} disabled={travada}
                                  dica={travada ? 'Ligue a página para liberar as funções dela.' : undefined}
                                  onAlternar={l => setRascunho(m => alternarFuncao(m, f.id, role, l))}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-2">
                                    <span id={fid} className="text-sm text-ink">{f.rotulo}</span>
                                    {alterados.has(`${role}|${f.id}`) && tagAlterado}
                                  </span>
                                  {f.ajuda && <span className="block text-xs text-ink-3">{f.ajuda}</span>}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <BarraSalvar
        resumo={resumoPermissoes(difs, usuariosPorPerfil)}
        diferencas={linhas}
        onDescartar={descartar}
        onSalvar={salvar}
        salvando={salvando}
        aviso="As permissões valem na hora: quem estiver com o app aberto vê o menu e os botões mudarem."
      />

      {comparando && (
        <NoCorpo>
          <Dialog title="Comparar perfis" icon="table_view" size="xl" onClose={() => setComparando(false)} footer={<Button variant="secondary" onClick={() => setComparando(false)}>Fechar</Button>}>
            <CompararPerfis matriz={rascunho} />
          </Dialog>
        </NoCorpo>
      )}
    </div>
  );
};

/** A matriz completa (perfis × páginas e funções), só leitura — a antiga tabela de checkboxes. */
const CompararPerfis: React.FC<{ matriz: Matriz }> = ({ matriz }) => {
  const marca = (v: boolean) => (v
    ? <span className="material-symbols-outlined text-[20px] text-navy" aria-label="Sim">check</span>
    : <span className="text-ink-4" aria-label="Não">—</span>);
  const grupos = [...new Set(FEATURE_DEFS.map(f => f.group))];
  const cabecalho = (primeira: string) => (
    <thead className="bg-thead text-xs font-semibold text-ink-3">
      <tr>
        <th scope="col" className="px-3 py-2 text-left">{primeira}</th>
        {ROLES.map(r => <th key={r.id} scope="col" className="px-3 py-2 text-center whitespace-nowrap">{r.label.replace(/^User /, '')}</th>)}
      </tr>
    </thead>
  );
  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-3">Inclui as alterações ainda não salvas. Admin: acesso total.</p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          {cabecalho('Página')}
          <tbody className="divide-y divide-line">
            {PAGE_DEFS.map(p => (
              <tr key={p.id}>
                <th scope="row" className="px-3 py-1.5 text-left font-semibold text-navy">{p.label}</th>
                {ROLES.map(r => <td key={r.id} className="px-3 py-1.5 text-center">{marca(paginaLigada(matriz, p.id, r.id))}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {grupos.map(g => (
        <div key={g} className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            {cabecalho(`Funções — ${g}`)}
            <tbody className="divide-y divide-line">
              {FEATURE_DEFS.filter(f => f.group === g).map(f => (
                <tr key={f.id}>
                  <th scope="row" className="px-3 py-1.5 text-left font-normal text-ink" title={f.label}>{partirRotulo(f.label).rotulo}</th>
                  {ROLES.map(r => <td key={r.id} className="px-3 py-1.5 text-center">{marca(!!matriz.features[f.id]?.[r.id])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};
