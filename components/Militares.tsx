// Ficheiro: components/Militares.tsx
// Cadastro de militares da ativa e servidores civis (coleção "militares").
// Página exclusiva do Admin: busca, edição dos dados, ativar/inativar para o
// appweb e "Cadastrar novo" (formulário em cascata com OM e quadros da MB).
import React, { useEffect, useMemo, useState } from 'react';
import { Container, PageHeader } from './ui/Page';
import { Button } from './ui/Button';
import { Segmented } from './ui/Segmented';
import { Dialog } from './ui/Dialog';
import { Field, controlClass } from './ui/Field';
import { ChoiceGroup } from './ui/ChoiceGroup';
import { StatusTag } from './ui/StatusTag';
import { EmptyState } from './ui/EmptyState';
import { Toast } from './ui/Toast';
import { Autocomplete, type OpcaoAutocomplete } from './ui/Autocomplete';
import { MilitarCadastroForm } from './militares/MilitarCadastroForm';
import { observarMilitares, atualizarMilitar, type MilitarRecord } from '../services/firestoreMilitares';
import { carregarOms, carregarCorposQuadros, normalizarBusca, montarInspecionado, type OrganizacaoMilitar, type CorposQuadros } from '../utils/corposQuadros';
import { formatNip } from '../utils/format';

type Filtro = 'todos' | 'ativos' | 'inativos';
type ColunaOrdem = 'nome' | 'pgq' | 'om';

/** Posição hierárquica do posto/graduação dentro do P/G/Q (ex.: "CT (Md)" → CT; "CB-RM2-EF" → CB). Desconhecidos vão para o fim. */
const posicaoHierarquica = (pgq: string, postos: CorposQuadros['postos'] | undefined): number => {
  if (!postos) return 999;
  const texto = pgq.trim().toUpperCase();
  let melhor = '';
  for (const sigla of Object.keys(postos)) {
    const u = sigla.toUpperCase();
    if ((texto === u || /^[\s(-]/.test(texto.slice(u.length))) && texto.startsWith(u) && u.length > melhor.length) melhor = sigla;
  }
  return melhor ? postos[melhor].ordem : 999;
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
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [oms, setOms] = useState<OrganizacaoMilitar[]>([]);
  const [postos, setPostos] = useState<CorposQuadros['postos']>();
  const [soHnre, setSoHnre] = useState(false);
  const [ordem, setOrdem] = useState<{ col: ColunaOrdem; dir: 'asc' | 'desc' }>({ col: 'nome', dir: 'asc' });

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), 4000); };

  useEffect(() => observarMilitares(setLista, e => setErroCarga(e.message || 'Não foi possível carregar os militares.')), []);
  useEffect(() => { carregarOms().then(setOms).catch(() => { /* sem lista, a edição mantém a OM atual */ }); }, []);
  useEffect(() => { carregarCorposQuadros().then(d => setPostos(d.postos)).catch(() => { /* sem hierarquia, P/G/Q fica no fim */ }); }, []);
  useEffect(() => { setLimite(PAGINA); }, [filtro, busca, soHnre, ordem]);

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

  const visiveis = filtrada.slice(0, limite);
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
          <div className="flex items-center gap-2 md:hidden">
            <select aria-label="Ordenar por" value={ordem.col} onChange={e => setOrdem(o => ({ ...o, col: e.target.value as ColunaOrdem }))} className={`${controlClass} w-auto`}>
              <option value="nome">Ordenar: Nome</option>
              <option value="pgq">Ordenar: P/G/Q</option>
              <option value="om">Ordenar: OM</option>
            </select>
            <Button variant="secondary" icon={ordem.dir === 'asc' ? 'arrow_upward' : 'arrow_downward'} aria-label={ordem.dir === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'} onClick={() => setOrdem(o => ({ ...o, dir: o.dir === 'asc' ? 'desc' : 'asc' }))} />
          </div>
        </div>

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
              <ul className="md:hidden divide-y divide-line">
                {visiveis.map(m => (
                  <li key={m.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-navy break-words">{m.nome}</p>
                        <p className="text-xs text-ink-3">{m.pgq} · {formatNip(m.nip)} · {m.om}</p>
                      </div>
                      <button type="button" onClick={() => alternarAtivo(m)} aria-label={`${m.ativo ? 'Inativar' : 'Ativar'} ${m.nome}`} className="shrink-0 min-h-[44px] flex items-center">
                        <StatusTag tone={m.ativo ? 'success' : 'muted'}>{m.ativo ? 'Ativo' : 'Inativo'}</StatusTag>
                      </button>
                    </div>
                    <div className="mt-1"><Button variant="ghost" icon="edit" onClick={() => setEditando(m)}>Editar</Button></div>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-thead text-ink-3 text-xs border-b border-line">
                    <tr>
                                            <th scope="col" aria-sort={ariaSort('nome')} className="px-4 py-3 text-left font-semibold">
                        <button type="button" onClick={() => ordenarPor('nome')} className="inline-flex items-center gap-1 min-h-[44px] font-semibold">Nome<span className="material-symbols-outlined text-[16px]" aria-hidden="true">{iconeOrdem('nome')}</span></button>
                      </th>
                                            <th scope="col" aria-sort={ariaSort('pgq')} className="px-4 py-3 text-left font-semibold">
                        <button type="button" onClick={() => ordenarPor('pgq')} className="inline-flex items-center gap-1 min-h-[44px] font-semibold">P/G/Q<span className="material-symbols-outlined text-[16px]" aria-hidden="true">{iconeOrdem('pgq')}</span></button>
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold">NIP</th>
                                            <th scope="col" aria-sort={ariaSort('om')} className="px-4 py-3 text-left font-semibold">
                        <button type="button" onClick={() => ordenarPor('om')} className="inline-flex items-center gap-1 min-h-[44px] font-semibold">OM<span className="material-symbols-outlined text-[16px]" aria-hidden="true">{iconeOrdem('om')}</span></button>
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold">Vínculo</th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold">E-mail</th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visiveis.map(m => (
                      <tr key={m.id} className={`hover:bg-thead transition-colors ${m.ativo ? '' : 'text-ink-3'}`}>
                        <td className="px-4 py-2 font-semibold text-navy">{m.nome}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{m.pgq}</td>
                        <td className="px-4 py-2 font-mono whitespace-nowrap">{formatNip(m.nip)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{m.om}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{m.temporario ? 'Temporário' : 'Carreira'}</td>
                        <td className="px-4 py-2 max-w-[220px] truncate" title={m.email}>{m.email || '—'}</td>
                        <td className="px-4 py-2">
                          <button type="button" onClick={() => alternarAtivo(m)} title={m.ativo ? 'Clique para inativar' : 'Clique para ativar'} aria-label={`${m.ativo ? 'Inativar' : 'Ativar'} ${m.nome}`} className="min-h-[44px] flex items-center">
                            <StatusTag tone={m.ativo ? 'success' : 'muted'}>{m.ativo ? 'Ativo' : 'Inativo'}</StatusTag>
                          </button>
                        </td>
                        <td className="px-4 py-1 text-right">
                          <Button variant="ghost" icon="edit" onClick={() => setEditando(m)}>Editar</Button>
                        </td>
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

      {novo && <MilitarCadastroForm onClose={() => setNovo(false)} onCriado={nome => { setNovo(false); avisar(`${nome} cadastrado.`); }} />}
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
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const opcoesOm: OpcaoAutocomplete[] = useMemo(() => oms.map(o => ({ chave: `${o.sigla}|${o.nome}`, principal: o.sigla, secundaria: o.nome, busca: o.busca })), [oms]);

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Informe o nome completo.';
    if (nip.length !== 10) e.nip = 'O NIP tem o formato 00.0000.00.';
    if (!pgq.trim()) e.pgq = 'Informe o posto/graduação/quadro.';
    if (!omSigla) e.om = 'Escolha a OM na lista.';
    setErros(e);
    if (Object.keys(e).length > 0) return;
    setSalvando(true);
    try {
      const nomeFinal = nome.trim().toUpperCase();
      const pgqFinal = pgq.trim();
      await atualizarMilitar(militar.id, {
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
          label="OM" required error={erros.om} help="Busque pela sigla ou pelo nome. Só a sigla é gravada."
          valor={omTexto} opcoes={opcoesOm}
          onDigitar={t => { setOmTexto(t); setOmSigla(t === militar.om ? militar.om : ''); }}
          onSelecionar={o => { setOmTexto(`${o.principal} — ${o.secundaria}`); setOmSigla(o.principal); }}
        />
        <Field label="E-mail">
          {a => <input {...a} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" />}
        </Field>
        <ChoiceGroup<'Carreira' | 'Temporário'> label="Vínculo" value={temporario} onChange={setTemporario} options={[{ value: 'Carreira', label: 'Carreira' }, { value: 'Temporário', label: 'Temporário' }]} />
        <ChoiceGroup<'Ativo' | 'Inativo'> label="Situação no appweb" value={ativo} onChange={setAtivo} options={[{ value: 'Ativo', label: 'Ativo' }, { value: 'Inativo', label: 'Inativo' }]} />
      </form>
    </Dialog>
  );
};
