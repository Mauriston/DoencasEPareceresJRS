// Ficheiro: components/pareceres/NovoParecerForm.tsx
// "Novo parecer": barra lateral à direita (desktop) ou bottom sheet (mobile). Escolhe o
// militar (autocomplete na base do Firebase, texto = INSPECIONADO), a especialidade
// (modelos de quesitos), a finalidade (mesmo menu de Exames mínimos), o histórico e os
// quesitos — pré-preenchidos pela especialidade e editáveis. Ao gerar: preenche o
// template do Google Docs (Apps Script), envia o PDF ao Storage e registra o pedido
// no Firestore.
import React, { useEffect, useMemo, useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Autocomplete, type OpcaoAutocomplete } from '../ui/Autocomplete';
import { carregarFinalidadesIS, filtrarFinalidadesPorVinculo, type GrupoFinalidadeIS, type VinculoFinalidade } from '../../utils/corposQuadros';
import { FinalidadeDropdown, type GrupoFinalidadeExtra } from '../ExamesGuide';
import { MilitarCadastroForm } from '../militares/MilitarCadastroForm';
import { QuesitosEditor } from './QuesitosEditor';
import { useNav } from '../../context/NavContext';
import { observarMilitares, type MilitarRecord } from '../../services/firestoreMilitares';
import { observarQuesitos, type QuesitosEspecialidade } from '../../services/firestoreQuesitos';
import { novoIdParecer, registrarParecer, type ParecerRecord } from '../../services/firestorePareceres';
import { gerarPdfPedidoParecer, enviarPdfParecer } from '../../services/firebaseStoragePareceres';
import { normalizarBusca } from '../../utils/corposQuadros';
import { formatNip } from '../../utils/format';

interface Props {
  /** Pedido a duplicar: militar, especialidade, finalidade, histórico e quesitos vêm preenchidos. */
  inicial?: ParecerRecord | null;
  onClose: () => void;
  onGerado: (nome: string, pdfUrl: string) => void;
}

type Erros = Record<string, string>;

const vinculoDoMilitar = (m: MilitarRecord): VinculoFinalidade => (m.temporario ? 'Temporário' : (m.rm1 || m.refo) ? 'Inativo' : 'Carreira');

export const NovoParecerForm: React.FC<Props> = ({ inicial, onClose, onGerado }) => {
  const nav = useNav();
  const usuario = nav?.authUser;

  const [militares, setMilitares] = useState<MilitarRecord[]>([]);
  const [modelos, setModelos] = useState<QuesitosEspecialidade[]>([]);
  const [militar, setMilitar] = useState<MilitarRecord | null>(null);
  const [militarTexto, setMilitarTexto] = useState('');
  const [especialidadeId, setEspecialidadeId] = useState('');
  const [finalidade, setFinalidade] = useState(inicial?.finalidade ?? '');
  const [historico, setHistorico] = useState(inicial?.historico ?? '');
  const [quesitos, setQuesitos] = useState<string[]>(inicial?.quesitos ?? []);
  const [editandoQuesitos, setEditandoQuesitos] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);
  const [recemCadastradoId, setRecemCadastradoId] = useState(inicial?.militarId ?? '');
  const [erros, setErros] = useState<Erros>({});
  const [gerando, setGerando] = useState(false);
  const [finalidadesIS, setFinalidadesIS] = useState<GrupoFinalidadeIS[]>([]);
  const [verTodasFinalidades, setVerTodasFinalidades] = useState(false);

  useEffect(() => observarMilitares(setMilitares), []);
  useEffect(() => observarQuesitos(setModelos), []);
  useEffect(() => { carregarFinalidadesIS().then(setFinalidadesIS).catch(() => setFinalidadesIS([])); }, []);

  // Finalidades de acordo com o vínculo do inspecionado (public/finalidadesIS.json); sem militar escolhido, todas.
  const vinculoFiltro = militar && !verTodasFinalidades ? vinculoDoMilitar(militar) : '';
  const gruposFinalidade: GrupoFinalidadeExtra[] = useMemo(
    () => filtrarFinalidadesPorVinculo(finalidadesIS, vinculoFiltro).map(g => ({ nome: g.grupo, finalidades: g.finalidades.map(f => f.nome) })),
    [finalidadesIS, vinculoFiltro],
  );

  // Militar recém-cadastrado: assim que aparece na lista, já vem preenchido.
  useEffect(() => {
    if (!recemCadastradoId) return;
    const m = militares.find(x => x.id === recemCadastradoId);
    if (m) { setMilitar(m); setMilitarTexto(m.inspecionado); setRecemCadastradoId(''); limpar('militar'); }
  }, [recemCadastradoId, militares]);

  const limpar = (k: string) => setErros(e => (e[k] ? { ...e, [k]: '' } : e));

  const opcoesMilitar: OpcaoAutocomplete[] = useMemo(() => militares.map(m => ({
    chave: m.id, principal: m.nome, secundaria: `${m.pgq} · ${formatNip(m.nip)} · ${m.om}`,
    busca: normalizarBusca(`${m.inspecionado} ${m.om} ${m.id}`), // m.id = NIP só com dígitos: dá para buscar sem os pontos
  })), [militares]);

  // Duplicar: seleciona a especialidade do pedido original quando os modelos chegam (os quesitos já vêm do original).
  useEffect(() => {
    if (!inicial || especialidadeId) return;
    const m = modelos.find(x => x.especialidade === inicial.especialidade);
    if (m) setEspecialidadeId(m.id);
  }, [inicial, modelos, especialidadeId]);

  const modelo = modelos.find(m => m.id === especialidadeId);

  const escolherEspecialidade = (id: string) => {
    setEspecialidadeId(id);
    setQuesitos(modelos.find(m => m.id === id)?.quesitos.slice() ?? []);
    limpar('especialidade'); limpar('quesitos');
  };

  const validar = (): Erros => {
    const e: Erros = {};
    if (!militar) e.militar = 'Escolha o militar na lista.';
    if (!modelo) e.especialidade = 'Selecione a especialidade.';
    if (!finalidade) e.finalidade = 'Selecione a finalidade.';
    if (!historico.trim()) e.historico = 'Informe o histórico.';
    if (modelo && quesitos.filter(q => q.trim()).length === 0) e.quesitos = 'Inclua ao menos um quesito.';
    return e;
  };

  const gerar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const novos = validar();
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#form-novo-parecer [aria-invalid="true"]')?.focus());
      return;
    }
    if (!militar || !modelo || !usuario) return;
    setGerando(true);
    try {
      const lista = quesitos.map(q => q.trim()).filter(Boolean);
      const pdfBase64 = await gerarPdfPedidoParecer({
        inspecionado: militar.inspecionado, especialidade: modelo.especialidade, finalidade, historico: historico.trim(), quesitos: lista,
        nomeUsuario: usuario.nome, postoGraduacao: usuario.postoGraduacao || '', cargo: usuario.cargo || '', crmPe: usuario.crmPe || '',
      });
      const id = novoIdParecer();
      const pdfUrl = await enviarPdfParecer(id, pdfBase64);
      await registrarParecer(id, {
        militarId: militar.id, inspecionado: militar.inspecionado, especialidade: modelo.especialidade, finalidade,
        historico: historico.trim(), quesitos: lista, pdfUrl,
        solicitanteUid: usuario.uid, solicitanteNome: usuario.nome, solicitanteUsuario: usuario.usuario, solicitantePosto: usuario.postoGraduacao || '',
      });
      onGerado(militar.nome, pdfUrl);
    } catch (err: any) {
      setErros({ geral: err?.message || 'Não foi possível gerar o pedido de parecer.' });
      setGerando(false);
    }
  };

  return (
    <>
      <Drawer
        title="Novo parecer"
        icon="assignment_add"
        onClose={() => { if (!gerando) onClose(); }}
        footer={(
          <>
            <Button variant="secondary" onClick={onClose} disabled={gerando}>Cancelar</Button>
            <Button type="submit" form="form-novo-parecer" icon="picture_as_pdf" loading={gerando}>Gerar pedido</Button>
          </>
        )}
      >
        <form id="form-novo-parecer" onSubmit={gerar} noValidate className="space-y-4">
          {erros.geral && <p role="alert" className="text-sm font-semibold text-wine">{erros.geral}</p>}

          <div>
            <Autocomplete
              label="Nome" required error={erros.militar}
              placeholder="Digite o nome ou o NIP do militar"
              valor={militarTexto} opcoes={opcoesMilitar}
              onDigitar={t => { setMilitarTexto(t); setMilitar(null); limpar('militar'); }}
              onSelecionar={o => { const m = militares.find(x => x.id === o.chave); if (m) { setMilitar(m); setMilitarTexto(m.inspecionado); limpar('militar'); } }}
            />
            <button type="button" onClick={() => setCadastrando(true)} className="mt-1 min-h-[44px] inline-flex items-center gap-1 text-sm font-bold text-navy underline underline-offset-2 hover:text-navy-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_add</span>
              Militar não cadastrado? Cadastrar novo militar
            </button>
          </div>

          <Field label="Especialidade" required error={erros.especialidade}>
            {a => (
              <select {...a} value={especialidadeId} onChange={e => escolherEspecialidade(e.target.value)}>
                <option value="">Selecione…</option>
                {modelos.map(m => <option key={m.id} value={m.id}>{m.especialidade}</option>)}
              </select>
            )}
          </Field>

          <div>
            <label htmlFor="finalidade-select" className="block text-xs font-semibold text-ink-3 mb-1">Finalidade<span className="text-wine ml-0.5" aria-hidden="true">*</span></label>
            <FinalidadeDropdown value={finalidade} onChange={v => { setFinalidade(v); limpar('finalidade'); }} placeholder="Selecione a finalidade da IS" gruposProprios={gruposFinalidade} erro={!!erros.finalidade} />
            {militar && (
              <p className="mt-1 text-xs text-ink-3">
                {verTodasFinalidades ? 'Mostrando todas as finalidades.' : `Finalidades disponíveis para o vínculo ${vinculoDoMilitar(militar)}.`}{' '}
                <button type="button" onClick={() => setVerTodasFinalidades(v => !v)} className="font-semibold text-navy underline min-h-[24px]">
                  {verTodasFinalidades ? 'Filtrar pelo vínculo' : 'Ver todas'}
                </button>
              </p>
            )}
            {erros.finalidade && <p role="alert" className="mt-1 text-xs font-semibold text-wine">{erros.finalidade}</p>}
          </div>

          <Field label="Histórico" required error={erros.historico}>
            {a => <textarea {...a} value={historico} onChange={e => { setHistorico(e.target.value); limpar('historico'); }} placeholder="Militar em LTS há xx dias pelo CID X00.0…" className={`${a.className} min-h-[100px]`} />}
          </Field>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="block text-xs font-semibold text-ink-3">Quesitos<span className="text-wine ml-0.5" aria-hidden="true">*</span></span>
              <button
                type="button" onClick={() => setEditandoQuesitos(true)} disabled={!modelo}
                aria-label="Editar quesitos" title="Editar quesitos"
                className="w-11 h-11 -my-2 -mr-2 inline-flex items-center justify-center rounded-lg text-navy hover:bg-thead disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">edit</span>
              </button>
            </div>
            {quesitos.length > 0 ? (
              <ol aria-invalid={erros.quesitos ? true : undefined} className="list-decimal pl-5 space-y-1.5 text-sm text-ink bg-thead border border-line rounded-lg py-3 pr-3 max-h-64 overflow-y-auto">
                {quesitos.map((q, i) => <li key={i} className="whitespace-pre-line break-words">{q}</li>)}
              </ol>
            ) : (
              <p className="text-sm text-ink-3 bg-thead border border-line rounded-lg p-3">Escolha a especialidade para carregar os quesitos sugeridos.</p>
            )}
            {erros.quesitos && <p role="alert" className="mt-1 text-xs font-semibold text-wine">{erros.quesitos}</p>}
            <p className="mt-1 text-xs text-ink-3">São sugestões: use o lápis para alterar, incluir ou remover quesitos neste pedido.</p>
          </div>
        </form>
      </Drawer>

      {editandoQuesitos && modelo && (
        <QuesitosEditor
          titulo={`Quesitos — ${modelo.especialidade}`}
          inicial={quesitos}
          modelo={modelo.quesitos}
          onCancelar={() => setEditandoQuesitos(false)}
          onSalvar={lista => { setQuesitos(lista); limpar('quesitos'); setEditandoQuesitos(false); }}
        />
      )}
      {cadastrando && (
        <MilitarCadastroForm
          onClose={() => setCadastrando(false)}
          onCriado={(_nome, id) => { setCadastrando(false); setRecemCadastradoId(id); }}
        />
      )}
    </>
  );
};
