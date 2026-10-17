// Ficheiro: components/Militares.tsx
// Cadastro de militares da ativa e servidores civis (coleção "militares").
// Página exclusiva do Admin: busca, edição dos dados, ativar/inativar para o
// appweb e "Cadastrar novo" (formulário em cascata com OM e quadros da MB).
import React, { useEffect, useMemo, useState } from 'react';
import { Container, PageHeader } from './ui/Page';
import { Button } from './ui/Button';
import { Segmented } from './ui/Segmented';
import { Dialog, ConfirmDialog } from './ui/Dialog';
import { Field, controlClass } from './ui/Field';
import { ChoiceGroup } from './ui/ChoiceGroup';
import { StatusTag } from './ui/StatusTag';
import { EmptyState } from './ui/EmptyState';
import { Toast } from './ui/Toast';
import { Autocomplete, type OpcaoAutocomplete } from './ui/Autocomplete';
import { MenuAcoes } from './ui/MenuAcoes';
import { MilitarCadastroForm } from './militares/MilitarCadastroForm';
import { MilitarDetalhe } from './militares/MilitarDetalhe';
import { InformacoesAdicionais, adicionaisDoMilitar, adicionaisParaPatch, validarAdicionais, type Adicionais } from './militares/InformacoesAdicionais';
import { enviarFotoMilitar } from '../services/militarFoto';
import { observarMilitares, atualizarMilitar, atualizarMilitaresEmLote, apagarMilitar, type MilitarRecord } from '../services/firestoreMilitares';
import { carregarOms, carregarCorposQuadros, normalizarBusca, montarInspecionado, separarPosto, ehOficialMedico, omEhHnre, type OrganizacaoMilitar, type CorposQuadros, type PostoInfo } from '../utils/corposQuadros';
import { formatNip } from '../utils/format';

type Filtro = 'todos' | 'ativos' | 'inativos';
type ColunaOrdem = 'nome' | 'pgq' | 'om';

/** Posição hierárquica do posto/graduação dentro do P/G/Q (ex.: "CT (Md)" → CT; "CB-RM2-EF" → CB). Desconhecidos vão para o fim. */
const posicaoHierarquica = (pgq: string, postos: CorposQuadros['postos'] | undefined): number => {
  const sep = postos ? separarPosto(pgq, postos) : null;
  return sep && postos ? postos[sep.posto].ordem : 999;
};
const PAGINA = 100;

export const Militares: React.FC = () => {
  const [lista, setLista] = useState<MilitarRecord[] | null>(null);
  const [erroCarga, setErroCarga] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('ativos');
  const [busca, setBusca] = useState('');
  const [limite, setLimite] = useState(PAGINA);
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<MilitarRecord | null>(null);
  const [detalhe, setDetalhe] = useState<MilitarRecord | null>(null);
  const [apagando, setApagando] = useState<MilitarRecord | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [oms, setOms] = useState<OrganizacaoMilitar[]>([]);
  const [postos, setPostos] = useState<CorposQuadros['postos']>();
  const [soHnre, setSoHnre] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [lote, setLote] = useState(false);
  const [ordem, setOrdem] = useState<{ col: ColunaOrdem; dir: 'asc' | 'desc' }>({ col: 'nome', dir: 'asc' });

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), 4000); };

  useEffect(() => observarMilitares(setLista, e => setErroCarga(e.message || 'Não foi possível carregar os militares.')), []);
  useEffect(() => { carregarOms().then(setOms).catch(() => { /* sem lista, a edição mantém a OM atual */ }); }, []);
  useEffect(() => { carregarCorposQuadros().then(d => setPostos(d.postos)).catch(() => { /* sem hierarquia, P/G/Q fica no fim */ }); }, []);
  useEffect(() => { setLimite(PAGINA); }, [filtro, busca, soHnre, ordem]);
  // A seleção vale só para o que está listado: mudou o filtro/busca, recomeça.
  useEffect(() => { setSelecionados(new Set()); }, [filtro, busca, soHnre]);

  const ordenarPor = (col: ColunaOrdem) => setOrdem(o => (o.col === col ? { col, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));

  const totais = useMemo(() => ({
    todos: lista?.length ?? 0,
    ativos: lista?.filter(m => m.ativo).length ?? 0,
    inativos: lista?.filter(m => !m.ativo).length ?? 0,
  }), [lista]);

  const filtrada = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    return (lista ?? [])
      .filter(m => (filtro === 'todos' ? true : filtro === 'ativos' ? m.ativo : !m.ativo))
      .filter(m => (soHnre ? m.om.trim().toUpperCase() === 'HNRE' : true))
      .filter(m => { const alvo = normalizarBusca(`${m.inspecionado} ${m.om} ${m.email}`); return termos.every(t => alvo.includes(t)); })
      .sort((a, b) => {
        const porNome = a.nome.localeCompare(b.nome, 'pt-BR');
        let cmp = 0;
        if (ordem.col === 'nome') cmp = porNome;
        else if (ordem.col === 'om') cmp = a.om.localeCompare(b.om, 'pt-BR', { sensitivity: 'base' }) || porNome;
        else cmp = posicaoHierarquica(a.pgq, postos) - posicaoHierarquica(b.pgq, postos) || a.pgq.localeCompare(b.pgq, 'pt-BR') || porNome;
        return ordem.dir === 'asc' ? cmp : -cmp;
      });
  }, [lista, filtro, busca, soHnre, ordem, postos]);

  const alternarAtivo = async (m: MilitarRecord) => {
    try {
      await atualizarMilitar(m.id, { ativo: !m.ativo });
      avisar(`${m.nome} agora está ${m.ativo ? 'inativo' : 'ativo'}.`);
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível alterar o status.', 'error');
    }
  };

  const confirmarApagar = async () => {
    const m = apagando;
    if (!m) return;
    setApagando(null);
    try {
      await apagarMilitar(m.id);
      avisar(`${m.nome} apagado.`);
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível apagar o cadastro.', 'error');
    }
  };

  const itensDe = (m: MilitarRecord) => [
    { rotulo: 'Detalhes', icone: 'badge', onClick: () => setDetalhe(m) },
    { rotulo: 'Editar', icone: 'edit', onClick: () => setEditando(m) },
    { rotulo: 'Apagar', icone: 'delete', perigo: true, onClick: () => setApagando(m) },
  ];

  const visiveis = filtrada.slice(0, limite);
  const escolhidos = useMemo(() => filtrada.filter(m => selecionados.has(m.id)), [filtrada, selecionados]);
  const todosMarcados = filtrada.length > 0 && escolhidos.length === filtrada.length;
  const alternarSelecao = (id: string) => setSelecionados(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const alternarTodos = () => setSelecionados(todosMarcados ? new Set() : new Set(filtrada.map(m => m.id)));
  const iconeOrdem = (c: ColunaOrdem) => (ordem.col === c ? (ordem.dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more');
  const ariaSort = (c: ColunaOrdem) => (ordem.col === c ? (ordem.dir === 'asc' ? 'ascending' as const : 'descending' as const) : 'none' as const);

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Container size="data" className="py-6 md:py-8 pb-10 space-y-4">
        <PageHeader
          title="Militares"
          description="Cadastro de militares da ativa e servidores civis. Edite os dados e defina quem está ativo no appweb."
          actions={<Button icon="person_add" onClick={() => setNovo(true)}>Cadastrar novo</Button>}
        />

        <div className="bg-white rounded-xl border border-line p-4 space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3 pointer-events-none" aria-hidden="true">search</span>
            <input type="search" aria-label="Buscar militar" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, NIP, posto, OM ou e-mail…" className={`${controlClass} pl-10`} autoComplete="off" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              ariaLabel="Situação do cadastro"
              className="overflow-x-auto"
              value={filtro}
              onChange={setFiltro}
              options={[
                { value: 'ativos', label: 'Ativos', badge: totais.ativos, badgeTone: 'neutro' },
                { value: 'inativos', label: 'Inativos', badge: totais.inativos, badgeTone: 'neutro' },
                { value: 'todos', label: 'Todos', badge: totais.todos, badgeTone: 'neutro' },
              ]}
            />
            <Button variant={soHnre ? 'primary' : 'secondary'} icon="local_hospital" aria-pressed={soHnre} onClick={() => setSoHnre(v => !v)}>Somente HNRe</Button>
          </div>
          <div className="flex items-center gap-2">
            <select aria-label="Ordenar por" value={ordem.col} onChange={e => setOrdem(o => ({ ...o, col: e.target.value as ColunaOrdem }))} className={`${controlClass} w-auto`}>
              <option value="nome">Ordenar: Nome</option>
              <option value="pgq">Ordenar: P/G/Q</option>
              <option value="om">Ordenar: OM</option>
            </select>
            <Button variant="secondary" icon={ordem.dir === 'asc' ? 'arrow_upward' : 'arrow_downward'} aria-label={ordem.dir === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'} onClick={() => setOrdem(o => ({ ...o, dir: o.dir === 'asc' ? 'desc' : 'asc' }))} />
          </div>
        </div>

        {escolhidos.length > 0 && (
          <div role="region" aria-label="Ações em lote" className="sticky top-2 z-10 bg-navy text-white rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-lg">
            <span className="text-sm font-bold" role="status">{escolhidos.length} selecionado{escolhidos.length !== 1 ? 's' : ''}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" icon="military_tech" onClick={() => setLote(true)}>Alterar posto (promoção)</Button>
              <Button variant="ghost" icon="close" className="!text-white hover:!bg-white/10" onClick={() => setSelecionados(new Set())}>Limpar</Button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-line overflow-clip">
          {erroCarga ? (
            <p role="alert" className="p-6 text-sm font-semibold text-wine">{erroCarga}</p>
          ) : lista === null ? (
            <p className="p-10 text-center text-sm text-ink-3" role="status">Carregando militares…</p>
          ) : filtrada.length === 0 ? (
            <EmptyState icon="military_tech" title="Nenhum militar encontrado" description="Ajuste a busca ou o filtro de situação." />
          ) : (
            <>
              {/* Mobile: duas linhas por militar */}
              <label className="md:hidden flex items-center gap-2 px-4 py-1 border-b border-line text-xs font-semibold text-ink-3 min-h-[44px]">
                <input type="checkbox" checked={todosMarcados} onChange={alternarTodos} className="w-5 h-5 accent-navy" />
                Selecionar todos ({filtrada.length})
              </label>
              <ul className="md:hidden divide-y divide-line">
                {visiveis.map(m => (
                  <li key={m.id} className={`px-4 py-3 ${selecionados.has(m.id) ? 'bg-thead' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <label className="shrink-0 -ml-2 w-11 h-11 flex items-center justify-center"><input type="checkbox" checked={selecionados.has(m.id)} onChange={() => alternarSelecao(m.id)} aria-label={`Selecionar ${m.nome}`} className="w-5 h-5 accent-navy" /></label>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-navy break-words">{m.nome}</p>
                        <p className="text-xs text-ink-3">{m.pgq} · {formatNip(m.nip)}</p>
                      </div>
                      <button type="button" onClick={() => alternarAtivo(m)} aria-label={`${m.ativo ? 'Inativar' : 'Ativar'} ${m.nome}`} className="shrink-0 min-h-[44px] flex items-center">
                        <StatusTag tone={m.ativo ? 'success' : 'muted'}>{m.ativo ? 'Ativo' : 'Inativo'}</StatusTag>
                      </button>
                      <div className="shrink-0 -mr-2"><MenuAcoes rotulo={`Ações para ${m.nome}`} itens={itensDe(m)} /></div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-thead text-ink-3 text-xs border-b border-line">
                    <tr>
                      <th scope="col" className="pl-4 pr-0 py-3 w-10">
                        <input type="checkbox" checked={todosMarcados} onChange={alternarTodos} aria-label={`Selecionar todos os ${filtrada.length} militares da lista`} title="Selecionar todos da lista" className="w-5 h-5 accent-navy align-middle" />
                      </th>
                      <th scope="col" aria-sort={ariaSort('nome')} className="px-4 py-3 text-left font-semibold">
                        <button type="button" onClick={() => ordenarPor('nome')} className="inline-flex items-center gap-1 min-h-[44px] font-semibold">Nome<span className="material-symbols-outlined text-[16px]" aria-hidden="true">{iconeOrdem('nome')}</span></button>
                      </th>
                                            <th scope="col" aria-sort={ariaSort('pgq')} className="px-4 py-3 text-left font-semibold">
                        <button type="button" onClick={() => ordenarPor('pgq')} className="inline-flex items-center gap-1 min-h-[44px] font-semibold">P/G/Q<span className="material-symbols-outlined text-[16px]" aria-hidden="true">{iconeOrdem('pgq')}</span></button>
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold">NIP</th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
                      <th scope="col" className="pr-2 py-3 w-14 text-right font-semibold"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visiveis.map(m => (
                      <tr key={m.id} className={`hover:bg-thead transition-colors ${selecionados.has(m.id) ? 'bg-thead' : ''} ${m.ativo ? '' : 'text-ink-3'}`}>
                        <td className="pl-4 pr-0 py-2"><input type="checkbox" checked={selecionados.has(m.id)} onChange={() => alternarSelecao(m.id)} aria-label={`Selecionar ${m.nome}`} className="w-5 h-5 accent-navy align-middle" /></td>
                        <td className="px-4 py-2 font-semibold text-navy">{m.nome}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{m.pgq}</td>
                        <td className="px-4 py-2 font-mono whitespace-nowrap">{formatNip(m.nip)}</td>
                        <td className="px-4 py-2">
                          <button type="button" onClick={() => alternarAtivo(m)} title={m.ativo ? 'Clique para inativar' : 'Clique para ativar'} aria-label={`${m.ativo ? 'Inativar' : 'Ativar'} ${m.nome}`} className="min-h-[44px] flex items-center">
                            <StatusTag tone={m.ativo ? 'success' : 'muted'}>{m.ativo ? 'Ativo' : 'Inativo'}</StatusTag>
                          </button>
                        </td>
                        <td className="pr-2 py-1 text-right"><MenuAcoes rotulo={`Ações para ${m.nome}`} itens={itensDe(m)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-line flex items-center justify-between gap-3 text-xs text-ink-3" role="status">
                <span>{visiveis.length} de {filtrada.length} militar{filtrada.length !== 1 ? 'es' : ''}</span>
                {filtrada.length > visiveis.length && <Button variant="secondary" onClick={() => setLimite(l => l + PAGINA)}>Mostrar mais</Button>}
              </div>
            </>
          )}
        </div>
      </Container>

      {apagando && (
        <ConfirmDialog
          title="Apagar militar"
          message={<>Apagar definitivamente o cadastro de <strong>{apagando.nome}</strong> ({apagando.pgq})? Esta ação não pode ser desfeita. Se a intenção é só tirar o acesso ao appweb, use <strong>Inativar</strong>.</>}
          confirmLabel="Apagar"
          destructive
          onConfirm={confirmarApagar}
          onCancel={() => setApagando(null)}
        />
      )}
      {novo && <MilitarCadastroForm onClose={() => setNovo(false)} onCriado={nome => { setNovo(false); avisar(`${nome} cadastrado.`); }} />}
      {lote && postos && <PromocaoEmLote militares={escolhidos} postos={postos} onClose={() => setLote(false)} onAplicado={n => { setLote(false); setSelecionados(new Set()); avisar(`Posto atualizado em ${n} militar${n !== 1 ? 'es' : ''}.`); }} onErro={m => avisar(m, 'error')} />}
      {detalhe && <MilitarDetalhe militar={detalhe} onClose={() => setDetalhe(null)} onEditar={() => { setEditando(detalhe); setDetalhe(null); }} />}
      {editando && <MilitarEdicao militar={editando} oms={oms} onClose={() => setEditando(null)} onSalvo={nome => { setEditando(null); avisar(`Dados de ${nome} atualizados.`); }} />}
    </div>
  );
};

// ---------------------------------------------------------------------------

const MilitarEdicao: React.FC<{ militar: MilitarRecord; oms: OrganizacaoMilitar[]; onClose: () => void; onSalvo: (nome: string) => void }> = ({ militar, oms, onClose, onSalvo }) => {
  const [nome, setNome] = useState(militar.nome);
  const [nip, setNip] = useState(formatNip(militar.nip));
  const [pgq, setPgq] = useState(militar.pgq);
  const [email, setEmail] = useState(militar.email);
  const [temporario, setTemporario] = useState<'Carreira' | 'Temporário'>(militar.temporario ? 'Temporário' : 'Carreira');
  const [ativo, setAtivo] = useState<'Ativo' | 'Inativo'>(militar.ativo ? 'Ativo' : 'Inativo');
  const [omTexto, setOmTexto] = useState(militar.om);
  const [omSigla, setOmSigla] = useState(militar.om);
  const [adicionais, setAdicionais] = useState<Adicionais>(() => adicionaisDoMilitar(militar));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const hnre = omEhHnre(omSigla);
  const medico = hnre && ehOficialMedico(pgq);

  const opcoesOm: OpcaoAutocomplete[] = useMemo(() => oms.map(o => ({ chave: `${o.sigla}|${o.nome}`, principal: o.sigla, secundaria: o.nome, busca: o.busca })), [oms]);

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Informe o nome completo.';
    if (nip.length !== 10) e.nip = 'O NIP tem o formato 00.0000.00.';
    if (!pgq.trim()) e.pgq = 'Informe o posto/graduação/quadro.';
    if (!omSigla) e.om = 'Escolha a OM na lista.';
    if (hnre) Object.assign(e, validarAdicionais(adicionais, medico));
    setErros(e);
    if (Object.keys(e).length > 0) return;
    setSalvando(true);
    try {
      const nomeFinal = nome.trim().toUpperCase();
      const pgqFinal = pgq.trim();
      const extras = hnre ? adicionaisParaPatch(adicionais, medico) : {};
      if (medico && adicionais.fotoNova) extras.fotoUrl = await enviarFotoMilitar(militar.id, adicionais.fotoNova);
      await atualizarMilitar(militar.id, {
        ...extras,
        nome: nomeFinal, nip, pgq: pgqFinal, om: omSigla, email: email.trim().toLowerCase(),
        temporario: temporario === 'Temporário', ativo: ativo === 'Ativo',
        inspecionado: montarInspecionado(pgqFinal, nip, nomeFinal),
      });
      onSalvo(nomeFinal);
    } catch (err: any) {
      setErros({ geral: err?.message || 'Não foi possível salvar.' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog
      title={`Editar — ${militar.nome}`}
      icon="edit"
      size="lg"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-editar-militar" icon="save" loading={salvando}>Salvar alterações</Button>
        </>
      )}
    >
      <form id="form-editar-militar" onSubmit={salvar} noValidate className="space-y-4">
        {erros.geral && <p role="alert" className="text-sm font-semibold text-wine">{erros.geral}</p>}
        <Field label="Nome completo" required error={erros.nome}>
          {a => <input {...a} type="text" value={nome} onChange={e => setNome(e.target.value.toUpperCase())} className={`${a.className} uppercase`} autoComplete="off" />}
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Posto/Graduação/Quadro" required error={erros.pgq} help='Ex.: "CT (Md)", "1SG-EF".'>
            {a => <input {...a} type="text" value={pgq} onChange={e => setPgq(e.target.value)} autoComplete="off" />}
          </Field>
          <Field label="NIP" required error={erros.nip}>
            {a => <input {...a} type="text" inputMode="numeric" value={nip} onChange={e => setNip(formatNip(e.target.value))} maxLength={10} className={`${a.className} font-mono`} />}
          </Field>
        </div>
        <Autocomplete
          label="OM" required error={erros.om}
          valor={omTexto} opcoes={opcoesOm}
          onDigitar={t => { setOmTexto(t); setOmSigla(t === militar.om ? militar.om : ''); }}
          onSelecionar={o => { setOmTexto(`${o.principal} — ${o.secundaria}`); setOmSigla(o.principal); }}
        />
        <Field label="E-mail">
          {a => <input {...a} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" />}
        </Field>
        <ChoiceGroup<'Carreira' | 'Temporário'> label="Vínculo" value={temporario} onChange={setTemporario} options={[{ value: 'Carreira', label: 'Carreira' }, { value: 'Temporário', label: 'Temporário' }]} />
        {hnre && <InformacoesAdicionais valor={adicionais} onChange={setAdicionais} medico={medico} erros={erros} />}
        <ChoiceGroup<'Ativo' | 'Inativo'> label="Situação no appweb" value={ativo} onChange={setAtivo} options={[{ value: 'Ativo', label: 'Ativo' }, { value: 'Inativo', label: 'Inativo' }]} />
      </form>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------

/** Troca o posto/graduação dos militares selecionados, preservando quadro/especialidade, e regrava o INSPECIONADO. */
const PromocaoEmLote: React.FC<{ militares: MilitarRecord[]; postos: CorposQuadros['postos']; onClose: () => void; onAplicado: (n: number) => void; onErro: (msg: string) => void }> = ({ militares, postos, onClose, onAplicado, onErro }) => {
  const [novoPosto, setNovoPosto] = useState('');
  const [salvando, setSalvando] = useState(false);

  const opcoes = useMemo(() => (Object.entries(postos) as [string, PostoInfo][]).sort((a, b) => a[1].ordem - b[1].ordem).map(([sigla, info]) => ({ sigla, ...info })), [postos]);

  const plano = useMemo(() => {
    if (!novoPosto) return { aplicar: [], iguais: 0, semPosto: [] as MilitarRecord[] };
    const aplicar: { m: MilitarRecord; pgq: string }[] = [];
    const semPosto: MilitarRecord[] = [];
    let iguais = 0;
    militares.forEach(m => {
      const sep = separarPosto(m.pgq, postos);
      if (!sep) { semPosto.push(m); return; }
      if (sep.posto === novoPosto) { iguais++; return; }
      aplicar.push({ m, pgq: `${novoPosto}${sep.resto}` });
    });
    return { aplicar, iguais, semPosto };
  }, [novoPosto, militares, postos]);

  const aplicar = async () => {
    setSalvando(true);
    try {
      await atualizarMilitaresEmLote(plano.aplicar.map(({ m, pgq }) => ({ id: m.id, patch: { pgq, inspecionado: montarInspecionado(pgq, m.nip, m.nome) } })));
      onAplicado(plano.aplicar.length);
    } catch (e: any) {
      onErro(e?.message || 'Não foi possível aplicar a alteração em lote.');
      setSalvando(false);
    }
  };

  return (
    <Dialog
      title="Alterar posto em lote"
      icon="military_tech"
      size="lg"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button icon="check" loading={salvando} disabled={plano.aplicar.length === 0} onClick={aplicar}>
            {plano.aplicar.length > 0 ? `Aplicar a ${plano.aplicar.length} militar${plano.aplicar.length !== 1 ? 'es' : ''}` : 'Aplicar'}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <p>Novo posto/graduação para os <strong>{militares.length}</strong> militares selecionados. O quadro e a especialidade de cada um são mantidos; o INSPECIONADO é recalculado.</p>
        <Field label="Novo posto/graduação" required>
          {a => (
            <select {...a} value={novoPosto} onChange={e => setNovoPosto(e.target.value)} className={`${a.className}`}>
              <option value="">Escolha…</option>
              {['Oficial', 'Praça', 'Servidor Civil'].map(cat => (
                <optgroup key={cat} label={cat}>
                  {opcoes.filter(o => o.categoria === cat).map(o => <option key={o.sigla} value={o.sigla}>{o.sigla} — {o.nome}</option>)}
                </optgroup>
              ))}
            </select>
          )}
        </Field>
        {novoPosto && (
          <>
            {plano.aplicar.length > 0 && (
              <div className="border border-line rounded-lg max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-thead text-ink-3 sticky top-0"><tr><th scope="col" className="px-3 py-2 text-left font-semibold">Militar</th><th scope="col" className="px-3 py-2 text-left font-semibold">Antes</th><th scope="col" className="px-3 py-2 text-left font-semibold">Depois</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {plano.aplicar.map(({ m, pgq }) => (
                      <tr key={m.id}><td className="px-3 py-1.5 font-semibold text-navy">{m.nome}</td><td className="px-3 py-1.5 whitespace-nowrap">{m.pgq}</td><td className="px-3 py-1.5 whitespace-nowrap font-bold">{pgq}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {plano.iguais > 0 && <p className="text-xs text-ink-3">{plano.iguais} já {plano.iguais !== 1 ? 'estão' : 'está'} com este posto e {plano.iguais !== 1 ? 'serão ignorados' : 'será ignorado'}.</p>}
            {plano.semPosto.length > 0 && <p role="alert" className="text-xs font-semibold text-wine">Não foi possível identificar o posto de {plano.semPosto.map(m => m.nome).join(', ')}; edite {plano.semPosto.length !== 1 ? 'esses cadastros' : 'esse cadastro'} individualmente.</p>}
            {plano.aplicar.length === 0 && <p className="text-xs text-ink-3">Nenhuma alteração a aplicar.</p>}
          </>
        )}
      </div>
    </Dialog>
  );
};
