// Ficheiro: components/Ferias.tsx
// Página FÉRIAS (menu lateral → Administração → "Férias"): férias e afastamentos (Férias, LTS, LIC Adm) dos usuários
// da JRS — Admin, user_medicos, user_medicos_mpi e user_secretaria veem; só o Admin cria, edita e apaga.
// Filtros no padrão da página Inspeções: período (Este semestre / Este ano — padrão; "×" limpa), tipo e status em
// caixas com contadores — ao abrir: todos os tipos e todos os status menos Gozada. Valem para as duas visões.
// Duas visões: Tabela (ordem crescente de início) e Timeline (Gantt centrado em hoje; escala padrão quadrimestral). Status automático
// (Gozada / Em gozo) e data fim calculada (utils/afastamentos.ts). Gravar gera bloqueio na agenda das IS para os
// médicos e evento no Google Agenda para todos (services/afastamentos.ts).
import React, { useEffect, useMemo, useState } from 'react';
import { Container, PageHeader } from './ui/Page';
import { Button } from './ui/Button';
import { Toast } from './ui/Toast';
import { ConfirmDialog } from './ui/Dialog';
import { EmptyState } from './ui/EmptyState';
import { StatusTag } from './ui/StatusTag';
import { MenuAcoes } from './ui/MenuAcoes';
import { Segmented } from './ui/Segmented';
import { FiltroCaixas } from './inspecoes/FiltroCaixas';
import { FiltroPeriodo } from './inspecoes/FiltroPeriodo';
import { Avatar } from './shell/UserMenu';
import { PdfFullscreenModal } from './PdfFullscreenModal';
import { AfastamentoForm } from './ferias/AfastamentoForm';
import { TimelineAfastamentos } from './ferias/TimelineAfastamentos';
import { useNav } from '../context/NavContext';
import { listUsuarios, type UsuarioRecord } from '../services/firestoreUsuarios';
import { observarAfastamentos, apagarAfastamento, urlArquivoAfastamento, type AfastamentoRecord } from '../services/afastamentos';
import {
  ESCALA_PADRAO, PERIODO_PADRAO, intervaloDoPeriodo, tocaPeriodo, type PeriodoFerias, PERFIS_JRS, STATUS_AFASTAMENTO, TIPOS_AFASTAMENTO, rotuloTipo, statusEfetivo,
  type EscalaTimeline, type StatusAfastamento, type TipoAfastamento,
} from '../utils/afastamentos';
import { dataBr, hojeISO } from '../utils/inspecoes';

type Visao = 'tabela' | 'timeline';

export const Ferias: React.FC = () => {
  const { authUser: usuario } = useNav();
  const ehAdmin = usuario?.perfil === 'admin';
  const hoje = hojeISO();

  const [lista, setLista] = useState<AfastamentoRecord[] | null>(null);
  const [erroCarga, setErroCarga] = useState('');
  const [usuarios, setUsuarios] = useState<UsuarioRecord[]>([]);
  const [visao, setVisao] = useState<Visao>('tabela');
  const [escala, setEscala] = useState<EscalaTimeline>(ESCALA_PADRAO);
  const [fPeriodo, setFPeriodo] = useState<PeriodoFerias | ''>(PERIODO_PADRAO);
  // Filtro inicial (sempre que a página abre): todos os tipos e todos os status menos Gozada.
  const [fTipos, setFTipos] = useState<TipoAfastamento[]>(() => TIPOS_AFASTAMENTO.map(t => t.id));
  const [fStatus, setFStatus] = useState<StatusAfastamento[]>(() => STATUS_AFASTAMENTO.map(st => st.id).filter(id => id !== 'gozada'));
  const [form, setForm] = useState<{ atual?: AfastamentoRecord } | null>(null);
  const [apagando, setApagando] = useState<AfastamentoRecord | null>(null);
  // Documento aberto em tela cheia (PDF ou imagem).
  const [documento, setDocumento] = useState<{ titulo: string; url: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  useEffect(() => observarAfastamentos(setLista, () => setErroCarga('Não foi possível carregar as férias e afastamentos.')), []);
  useEffect(() => { listUsuarios().then(l => setUsuarios(l.filter(u => u.ativo && PERFIS_JRS.includes(u.perfil)))).catch(() => setUsuarios([])); }, []);

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4500); };
  const fotos = useMemo(() => new Map(usuarios.map(u => [u.id, u.imageProfile || ''])), [usuarios]);

  // Filtros no padrão da página Inspeções: nenhuma caixa marcada = nada aparece. Contadores de cada opção sobre os
  // demais filtros (o de Tipo conta com período + status; o de Status, com período + tipo).
  const intervalo = useMemo(() => (fPeriodo ? intervaloDoPeriodo(fPeriodo, hoje) : null), [fPeriodo, hoje]);
  const noPeriodo = useMemo(() => (lista ?? []).filter(a => !intervalo || tocaPeriodo(a, intervalo)), [lista, intervalo]);
  const contTipos = useMemo(() => {
    const c: Partial<Record<TipoAfastamento, number>> = {};
    noPeriodo.filter(a => fStatus.includes(statusEfetivo(a, hoje))).forEach(a => { c[a.tipo] = (c[a.tipo] ?? 0) + 1; });
    return c;
  }, [noPeriodo, fStatus, hoje]);
  const contStatus = useMemo(() => {
    const c: Partial<Record<StatusAfastamento, number>> = {};
    noPeriodo.filter(a => fTipos.includes(a.tipo)).forEach(a => { const st = statusEfetivo(a, hoje); c[st] = (c[st] ?? 0) + 1; });
    return c;
  }, [noPeriodo, fTipos, hoje]);
  const filtrados = useMemo(() => noPeriodo.filter(a => fTipos.includes(a.tipo) && fStatus.includes(statusEfetivo(a, hoje))), [noPeriodo, fTipos, fStatus, hoje]);
  // Tabela: ordem crescente da data de início.
  const ordenados = useMemo(() => [...filtrados].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio) || a.usuario.localeCompare(b.usuario, 'pt-BR')), [filtrados]);

  const abrirArquivo = async (a: AfastamentoRecord['arquivos'][number]) => {
    try { setDocumento({ titulo: a.nome, url: await urlArquivoAfastamento(a) }); } catch { avisar('Não foi possível abrir o arquivo.', 'error'); }
  };
  const confirmarApagar = async () => {
    if (!apagando) return;
    const a = apagando; setApagando(null);
    try { await apagarAfastamento(a); avisar(`Afastamento de ${a.usuario} apagado (bloqueio e evento removidos).`); }
    catch (e: any) { avisar(e?.message || 'Não foi possível apagar.', 'error'); }
  };

  const referencia = (a: AfastamentoRecord): string =>
    a.tipo === 'ferias' ? (a.referencia ? `Ano: ${a.referencia}` : '—') : a.tipo === 'lic_adm' ? (a.motivo || '—') : '—';

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Container size="data" className="py-6 md:py-8 pb-10 space-y-4">
        <PageHeader
          title="Férias"
          description="Férias e afastamentos (Férias, LTS e LIC Adm) dos usuários da JRS."
          actions={ehAdmin ? <Button icon="add" onClick={() => setForm({})}>Nova férias / afastamento</Button> : undefined}
        />

        <div className="bg-white rounded-xl border border-line p-3 flex flex-wrap items-center gap-3">
          <FiltroPeriodo
            value={fPeriodo ? { id: fPeriodo } : null} onChange={v => setFPeriodo(v.id as PeriodoFerias)} onLimpar={() => setFPeriodo('')}
            opcoes={['semestre', 'ano']} className="flex-1 min-w-[11rem] sm:flex-none sm:w-56"
          />
          <FiltroCaixas<TipoAfastamento>
            nome="Tipo" icone="category" rotuloTodas="Todos" rotuloNenhum="Nenhum" resumoVarios={n => `${n} tipos`}
            opcoes={TIPOS_AFASTAMENTO.map(t => ({ id: t.id, rotulo: t.curto }))} value={fTipos} onChange={setFTipos} contadores={contTipos}
            className="flex-1 min-w-[9rem] sm:flex-none sm:w-48"
          />
          <FiltroCaixas<StatusAfastamento>
            nome="Status" icone="filter_list" rotuloTodas="Todos" rotuloNenhum="Nenhum" resumoVarios={n => `${n} status`}
            opcoes={STATUS_AFASTAMENTO} value={fStatus} onChange={setFStatus} contadores={contStatus}
            className="flex-1 min-w-[9rem] sm:flex-none sm:w-52"
          />
          <div className="ml-auto">
            <Segmented<Visao>
              ariaLabel="Visualização"
              value={visao}
              onChange={setVisao}
              options={[{ value: 'tabela', label: 'Tabela', icon: 'table_rows' }, { value: 'timeline', label: 'Timeline', icon: 'view_timeline' }]}
            />
          </div>
        </div>

        {erroCarga && <p role="alert" className="text-sm font-semibold text-wine">{erroCarga}</p>}
        {lista === null && !erroCarga && <p className="text-sm text-ink-3">Carregando…</p>}

        {lista !== null && visao === 'timeline' && (
          <TimelineAfastamentos afastamentos={filtrados} fotos={fotos} escala={escala} onEscala={setEscala} hoje={hoje} onAbrir={ehAdmin ? a => setForm({ atual: a }) : undefined} />
        )}

        {lista !== null && visao === 'tabela' && (ordenados.length === 0 ? (
          <EmptyState icon="beach_access" title="Nenhuma férias ou afastamento" description={lista.length ? 'Nada com os filtros escolhidos.' : (ehAdmin ? 'Registre em "Nova férias / afastamento".' : 'Nada registrado ainda.')} />
        ) : (
          <>
            {/* Desktop: tabela */}
            <div className="hidden md:block bg-white rounded-xl border border-line overflow-clip">
              <table className="w-full text-sm">
                <caption className="sr-only">Férias e afastamentos</caption>
                <thead className="bg-thead text-left text-xs font-bold text-ink-3">
                  <tr>
                    <th scope="col" className="px-4 py-3">USUÁRIO</th>
                    <th scope="col" className="px-3 py-3">TIPO</th>
                    <th scope="col" className="px-3 py-3">PERÍODO</th>
                    <th scope="col" className="px-3 py-3 text-right">DIAS</th>
                    <th scope="col" className="px-3 py-3">STATUS</th>
                    <th scope="col" className="px-3 py-3">REFERÊNCIA / MOTIVO</th>
                    <th scope="col" className="px-3 py-3">ARQUIVOS</th>
                    {ehAdmin && <th scope="col" className="px-3 py-3"><span className="sr-only">Ações</span></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ordenados.map(a => {
                    const st = STATUS_AFASTAMENTO.find(s => s.id === statusEfetivo(a, hoje))!;
                    return (
                      <tr key={a.id} className="hover:bg-thead">
                        <td className="px-4 py-2">
                          <span className="flex items-center gap-2 min-w-0">
                            <Avatar nome={a.usuario} imageProfile={fotos.get(a.usuarioUid)} size={32} tone="light" />
                            <span className="min-w-0 font-bold text-navy truncate">{a.usuario}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold text-ink">{rotuloTipo(a.tipo)}</td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">{dataBr(a.dataInicio)} a {dataBr(a.dataFim)}</td>
                        <td className="px-3 py-2 tabular-nums text-right">{a.duracaoDias}</td>
                        <td className="px-3 py-2"><StatusTag tone={st.tom}>{st.rotulo}</StatusTag></td>
                        <td className="px-3 py-2 text-ink-2">{referencia(a)}</td>
                        <td className="px-3 py-2">
                          {a.arquivos?.length ? (
                            <span className="flex flex-wrap gap-1">
                              {a.arquivos.map(f => (
                                <button key={f.caminho} type="button" onClick={() => abrirArquivo(f)} title={f.nome} aria-label={`Abrir ${f.nome}`} className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-wine hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
                                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{f.tipo === 'application/pdf' ? 'picture_as_pdf' : 'image'}</span>
                                </button>
                              ))}
                            </span>
                          ) : <span className="text-ink-4">—</span>}
                        </td>
                        {ehAdmin && (
                          <td className="px-3 py-2 text-right">
                            <MenuAcoes rotulo={`Ações do afastamento de ${a.usuario}`} itens={[
                              { rotulo: 'Editar', icone: 'edit', onClick: () => setForm({ atual: a }) },
                              { rotulo: 'Apagar', icone: 'delete', perigo: true, onClick: () => setApagando(a) },
                            ]} />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Celular: cartões */}
            <ul className="md:hidden space-y-2">
              {ordenados.map(a => {
                const st = STATUS_AFASTAMENTO.find(s => s.id === statusEfetivo(a, hoje))!;
                return (
                  <li key={a.id} className="bg-white rounded-xl border border-line p-3 flex items-start gap-3">
                    <Avatar nome={a.usuario} imageProfile={fotos.get(a.usuarioUid)} size={36} tone="light" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-navy truncate flex-1">{a.usuario}</p>
                        <StatusTag tone={st.tom} className="shrink-0">{st.rotulo}</StatusTag>
                      </div>
                      <p className="text-sm text-ink">{rotuloTipo(a.tipo)} · {a.duracaoDias} dia{a.duracaoDias !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-ink-3 tabular-nums">{dataBr(a.dataInicio)} a {dataBr(a.dataFim)}{a.tipo === 'ferias' && a.referencia ? ` · Ano: ${a.referencia}` : ''}{a.motivo ? ` · ${a.motivo}` : ''}</p>
                      {!!a.arquivos?.length && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {a.arquivos.map(f => <button key={f.caminho} type="button" onClick={() => abrirArquivo(f)} className="min-h-[44px] text-xs font-bold text-blue underline underline-offset-2 truncate max-w-full">{f.nome}</button>)}
                        </div>
                      )}
                    </div>
                    {ehAdmin && (
                      <MenuAcoes rotulo={`Ações do afastamento de ${a.usuario}`} itens={[
                        { rotulo: 'Editar', icone: 'edit', onClick: () => setForm({ atual: a }) },
                        { rotulo: 'Apagar', icone: 'delete', perigo: true, onClick: () => setApagando(a) },
                      ]} />
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ))}
      </Container>

      {form && ehAdmin && usuario && (
        <AfastamentoForm
          usuarios={usuarios} atual={form.atual} hoje={hoje} autor={usuario.uid}
          onClose={() => setForm(null)}
          onSalvo={(msg, tom) => { setForm(null); avisar(msg, tom); }}
        />
      )}
      {documento && <PdfFullscreenModal title={documento.titulo} url={documento.url} onClose={() => setDocumento(null)} />}
      {apagando && (
        <ConfirmDialog
          title="Apagar férias / afastamento"
          message={<>Apagar o afastamento de <strong>{apagando.usuario}</strong> ({rotuloTipo(apagando.tipo)}, {dataBr(apagando.dataInicio)} a {dataBr(apagando.dataFim)})? O bloqueio da agenda, o evento do Google Agenda e os arquivos também são removidos.</>}
          confirmLabel="Apagar" destructive onConfirm={confirmarApagar} onCancel={() => setApagando(null)}
        />
      )}
    </div>
  );
};
