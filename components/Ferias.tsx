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
import { Card } from './ui/Card';
import { IconButton } from './ui/IconButton';
import { Toast } from './ui/Toast';
import { ConfirmDialog } from './ui/Dialog';
import { EmptyState } from './ui/EmptyState';
import { StatusTag } from './ui/StatusTag';
import { MenuAcoes } from './ui/MenuAcoes';
import { AbasSublinhadas } from './periciaMenor/partes';
import { FiltroCaixas } from './inspecoes/FiltroCaixas';
import { FiltroPeriodo } from './inspecoes/FiltroPeriodo';
import { Avatar } from './shell/UserMenu';
import { abrirPdf } from '../services/abrirPdf';
import { AfastamentoForm } from './ferias/AfastamentoForm';
import { TimelineAfastamentos } from './ferias/TimelineAfastamentos';
import { useNav } from '../context/NavContext';
import { listUsuarios, type UsuarioRecord } from '../services/firestoreUsuarios';
import { notificarAcao } from '../services/notificacoesPush';
import { observarAfastamentos, apagarAfastamento, urlArquivoAfastamento, type AfastamentoRecord } from '../services/afastamentos';
import {
  ESCALA_PADRAO, PERIODO_PADRAO, intervaloDoPeriodo, tocaPeriodo, type PeriodoFerias, PERFIS_JRS, STATUS_AFASTAMENTO, TIPOS_AFASTAMENTO, rotuloTipo, statusEfetivo, TOM_TIPO,
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
    try { await abrirPdf(() => urlArquivoAfastamento(a)); } catch { avisar('Não foi possível abrir o arquivo.', 'error'); }
  };
  const confirmarApagar = async () => {
    if (!apagando) return;
    const a = apagando; setApagando(null);
    try { await apagarAfastamento(a); notificarAcao('afastamento.apagado'); avisar(`Afastamento de ${a.usuario} apagado (bloqueio e evento removidos).`); }
    catch (e: any) { avisar(e?.message || 'Não foi possível apagar.', 'error'); }
  };

  const referencia = (a: AfastamentoRecord): string =>
    a.tipo === 'ferias' ? (a.referencia ? `Ano: ${a.referencia}` : '—') : a.tipo === 'lic_adm' ? (a.motivo || '—') : '—';

  // Definição única das células (tabela no desktop e cartão no celular — auditoria v3, M10).
  const statusDe = (a: AfastamentoRecord) => STATUS_AFASTAMENTO.find(s => s.id === statusEfetivo(a, hoje))!;
  const celula = {
    usuario: (a: AfastamentoRecord) => (
      <span className="flex items-center gap-2 min-w-0">
        <Avatar nome={a.usuario} imageProfile={fotos.get(a.usuarioUid)} size={32} tone="light" />
        <span className="min-w-0 font-bold text-navy truncate">{a.usuario}</span>
      </span>
    ),
    tipo: (a: AfastamentoRecord) => <StatusTag tone={TOM_TIPO[a.tipo]}>{rotuloTipo(a.tipo)}</StatusTag>,
    periodo: (a: AfastamentoRecord) => `${dataBr(a.dataInicio)} a ${dataBr(a.dataFim)}`,
    status: (a: AfastamentoRecord) => { const st = statusDe(a); return <StatusTag tone={st.tom}>{st.rotulo}</StatusTag>; },
    arquivos: (a: AfastamentoRecord) => (a.arquivos?.length ? (
      <span className="flex flex-wrap gap-1">
        {a.arquivos.map(f => (
          <IconButton key={f.caminho} icon={f.tipo === 'application/pdf' ? 'picture_as_pdf' : 'image'} label={`Abrir ${f.nome}`} variant="ghost" size="sm" className="!text-wine" onClick={() => abrirArquivo(f)} />
        ))}
      </span>
    ) : <span className="text-ink-4">—</span>),
    acoes: (a: AfastamentoRecord) => (
      <MenuAcoes rotulo={`Ações do afastamento de ${a.usuario}`} size="sm" itens={[
        { rotulo: 'Editar', icone: 'edit', onClick: () => setForm({ atual: a }) },
        { rotulo: 'Apagar', icone: 'delete', perigo: true, onClick: () => setApagando(a) },
      ]} />
    ),
  };
  const colunas: { id: string; titulo: string; celula: (a: AfastamentoRecord) => React.ReactNode; alinhar?: 'direita'; oculto?: boolean; classe?: string }[] = [
    { id: 'usuario', titulo: 'Usuário', celula: celula.usuario },
    { id: 'tipo', titulo: 'Tipo', celula: celula.tipo },
    { id: 'periodo', titulo: 'Período', celula: celula.periodo, classe: 'tabular-nums whitespace-nowrap' },
    { id: 'dias', titulo: 'Dias', celula: a => a.duracaoDias, alinhar: 'direita', classe: 'tabular-nums' },
    { id: 'status', titulo: 'Status', celula: celula.status },
    { id: 'referencia', titulo: 'Referência / motivo', celula: referencia, classe: 'text-ink' },
    { id: 'arquivos', titulo: 'Arquivos', celula: celula.arquivos },
    ...(ehAdmin ? [{ id: 'acoes', titulo: 'Ações', celula: celula.acoes, alinhar: 'direita' as const, oculto: true }] : []),
  ];

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Container size="data" className={`pt-0 md:pt-8 ${ehAdmin ? 'pb-28 md:pb-10' : 'pb-10'} flex flex-col gap-4 md:gap-6`}>
        <PageHeader
          title="Férias"
          description="Férias e afastamentos (Férias, LTS e LIC Adm) dos usuários da JRS."
          fab={ehAdmin ? { icon: 'add', label: 'Registrar afastamento', onClick: () => setForm({}) } : undefined}
        />

        {/* Abas sublinhadas (as da Inspeções de Saúde): no celular coladas na topbar, de borda a borda. */}
        <AbasSublinhadas<Visao>
          rotulo="Visualização" idBase="ferias-visao" ativa={visao} onChange={setVisao}
          className="-mx-4 px-2 md:mx-0 md:px-0 bg-white md:bg-transparent"
          abas={[{ id: 'tabela', rotulo: 'Tabela' }, { id: 'timeline', rotulo: 'Timeline' }]}
        />

        <Card padding="sm" className="flex flex-wrap items-center gap-4">
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
        </Card>

        {erroCarga && <p role="alert" className="text-sm font-semibold text-wine">{erroCarga}</p>}
        {lista === null && !erroCarga && <p className="text-sm text-ink-3">Carregando…</p>}

        {lista !== null && visao === 'timeline' && (
          <TimelineAfastamentos afastamentos={filtrados} fotos={fotos} escala={escala} onEscala={setEscala} hoje={hoje} onAbrir={ehAdmin ? a => setForm({ atual: a }) : undefined} />
        )}

        {lista !== null && visao === 'tabela' && (ordenados.length === 0 ? (
          <EmptyState icon="beach_access" title="Nenhuma férias ou afastamento" description={lista.length ? 'Nada com os filtros escolhidos.' : (ehAdmin ? 'Registre em "Registrar afastamento".' : 'Nada registrado ainda.')} />
        ) : (
          <>
            {/* Desktop: tabela. As células vêm de COLUNAS (definição única, auditoria v3 M10),
                as mesmas que montam o cartão do celular abaixo. */}
            <Card padding="none" className="hidden md:block">
              <table className="w-full text-sm">
                <caption className="sr-only">Férias e afastamentos</caption>
                <thead className="bg-thead text-left text-xs font-bold text-ink-3">
                  <tr>
                    {colunas.map(c => (
                      <th key={c.id} scope="col" className={`${c.id === 'usuario' ? 'px-4' : 'px-3'} py-3 ${c.alinhar === 'direita' ? 'text-right' : ''}`}>
                        {c.oculto ? <span className="sr-only">{c.titulo}</span> : c.titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ordenados.map(a => (
                    <tr key={a.id} className="hover:bg-thead">
                      {colunas.map(c => (
                        <td key={c.id} className={`${c.id === 'usuario' ? 'px-4' : 'px-3'} py-2 ${c.alinhar === 'direita' ? 'text-right' : ''} ${c.classe ?? ''}`}>{c.celula(a)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Celular: cartões com as mesmas células. */}
            <ul className="md:hidden space-y-4">
              {ordenados.map(a => (
                <li key={a.id}>
                  <Card padding="sm" className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">{celula.usuario(a)}</div>
                        <span className="shrink-0">{celula.status(a)}</span>
                      </div>
                      <p className="flex items-center gap-2 text-sm text-ink">{celula.tipo(a)}{a.duracaoDias} {a.duracaoDias === 1 ? 'dia' : 'dias'}</p>
                      <p className="text-xs text-ink-3 tabular-nums">{celula.periodo(a)}{referencia(a) !== '—' ? ` · ${referencia(a)}` : ''}</p>
                      {!!a.arquivos?.length && celula.arquivos(a)}
                    </div>
                    {ehAdmin && celula.acoes(a)}
                  </Card>
                </li>
              ))}
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
