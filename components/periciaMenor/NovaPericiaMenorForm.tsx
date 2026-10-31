// Ficheiro: components/periciaMenor/NovaPericiaMenorForm.tsx
// "Nova perícia menor": barra lateral à direita (desktop) ou bottom sheet (mobile). Começa pela
// leitura do atestado fotografado (Gemini preenche nome, data, tempo e CID) e segue por militar
// (autocomplete na base por nome ou NIP, com cadastro rápido), serviço do HNRe (vem do cadastro
// do militar), dados do atestado (CID por autocomplete) e homologação (tempo, dispensas, VDF).
// Ao registrar: a foto vira PDF no Storage e a perícia é gravada no Firestore; o perito é o
// médico logado e a data de término é calculada (data do atestado + tempo homologado - 1).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Autocomplete, type OpcaoAutocomplete } from '../ui/Autocomplete';
import { MilitarCadastroForm } from '../militares/MilitarCadastroForm';
import { RecorteAtestado } from './RecorteAtestado';
import { DispensasModal } from './DispensasModal';
import { ServicoMilitarForm } from './ServicoMilitarForm';
import { useNav } from '../../context/NavContext';
import { extrairDadosAtestado } from '../../services/atestadoIA';
import { observarMilitares, type MilitarRecord } from '../../services/firestoreMilitares';
import { enviarPdfPericiaMenor, novoIdPericiaMenor, registrarPericiaMenor } from '../../services/firestorePericiasMenores';
import { carregarCid, normalizarBusca, omEhHnre, type CidItem } from '../../utils/corposQuadros';
import { imagemParaPdf } from '../../utils/imagemParaPdf';
import { formatNip } from '../../utils/format';

interface Props {
  onClose: () => void;
  onRegistrado: (nome: string) => void;
}

type Erros = Record<string, string>;

const MAX_HOMOLOGACAO = 20;

const soDigitos = (v: string, max?: number): string => {
  const n = v.replace(/\D/g, '');
  if (!n) return '';
  let num = parseInt(n, 10);
  if (max && num > max) num = max;
  return String(Math.max(num, 1));
};
const comUnidade = (v: string): string => (v ? `${v} dia${Number(v) > 1 ? 's' : ''}` : v);

const rotuloCid = (c: CidItem) => `${c.SUBCAT} - ${c.DESCRICAO}`;

export const NovaPericiaMenorForm: React.FC<Props> = ({ onClose, onRegistrado }) => {
  const nav = useNav();
  const usuario = nav?.authUser;

  const [militares, setMilitares] = useState<MilitarRecord[]>([]);
  const [cids, setCids] = useState<CidItem[]>([]);

  const [militarId, setMilitarId] = useState('');
  const [militarTexto, setMilitarTexto] = useState('');
  const [cadastrando, setCadastrando] = useState(false);
  const [recemCadastradoId, setRecemCadastradoId] = useState('');
  const [editandoServico, setEditandoServico] = useState(false);

  const [dataAtestado, setDataAtestado] = useState('');
  const [tempoAtestado, setTempoAtestado] = useState('');
  const [cid, setCid] = useState<CidItem | null>(null);
  const [cidTexto, setCidTexto] = useState('');

  const [tempoHomologado, setTempoHomologado] = useState('');
  const [dispensas, setDispensas] = useState<string[]>([]);
  const [escolhendoDispensas, setEscolhendoDispensas] = useState(false);
  const [vdf, setVdf] = useState(false);

  const [imagemBruta, setImagemBruta] = useState('');
  const [imagemRecortada, setImagemRecortada] = useState('');
  const [extraindo, setExtraindo] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  const limpar = (k: string) => setErros(e => (e[k] ? { ...e, [k]: '' } : e));

  useEffect(() => observarMilitares(setMilitares), []);
  useEffect(() => { carregarCid().then(setCids).catch(() => setCids([])); }, []);
  const militar = militares.find(m => m.id === militarId) ?? null;
  // O Serviço do HNRe só existe para militares da OM HNRe; para as demais OMs o campo some e nada é gravado.
  const servicoAplicavel = !!militar && omEhHnre(militar.om);
  const selecionarMilitar = (m: MilitarRecord) => { setMilitarId(m.id); setMilitarTexto(m.inspecionado); limpar('militar'); };

  // Militar recém-cadastrado: assim que aparece na lista, já vem preenchido.
  useEffect(() => {
    if (!recemCadastradoId) return;
    const m = militares.find(x => x.id === recemCadastradoId);
    if (m) { selecionarMilitar(m); setRecemCadastradoId(''); }
  }, [recemCadastradoId, militares]); // eslint-disable-line react-hooks/exhaustive-deps

  const opcoesMilitar: OpcaoAutocomplete[] = useMemo(() => militares.map(m => ({
    chave: m.id, principal: m.nome, secundaria: `${m.pgq} · ${formatNip(m.nip)} · ${m.om}`,
    busca: normalizarBusca(`${m.inspecionado} ${m.om} ${m.id}`), // m.id = NIP só com dígitos: dá para buscar sem os pontos
  })), [militares]);
  const opcoesCid: OpcaoAutocomplete[] = useMemo(() => cids.map(c => ({
    chave: c.SUBCAT, principal: c.DESCRABREV, secundaria: c.DESCRICAO, busca: normalizarBusca(`${c.SUBCAT} ${c.DESCRABREV} ${c.DESCRICAO}`),
  })), [cids]);

  // "Cadastrar novo militar" só aparece quando a busca não encontra ninguém.
  const buscaSemResultado = useMemo(() => {
    if (militar || !militarTexto.trim()) return false;
    const termos = normalizarBusca(militarTexto).split(/\s+/).filter(Boolean);
    return !opcoesMilitar.some(o => termos.every(t => (o.busca ?? '').includes(t)));
  }, [militar, militarTexto, opcoesMilitar]);

  // ---- Leitura do atestado (foto → recorte → Gemini) ----
  const aoEscolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const leitor = new FileReader();
    leitor.onload = () => setImagemBruta(String(leitor.result || ''));
    leitor.readAsDataURL(f);
  };

  const extrairDados = async () => {
    if (!imagemRecortada) return;
    setExtraindo(true);
    setErros(e => ({ ...e, geral: '' }));
    try {
      const dados = await extrairDadosAtestado(imagemRecortada.split(',')[1]);
      if (dados.dataAtestado) { setDataAtestado(String(dados.dataAtestado)); limpar('dataAtestado'); }
      if (dados.tempoAtestado) { setTempoAtestado(soDigitos(String(dados.tempoAtestado))); limpar('tempoAtestado'); }
      if (dados.cid) {
        const codigo = String(dados.cid).toLowerCase().replace(/[^a-z0-9]/g, '');
        const achado = cids.find(c => c.SUBCAT.toLowerCase() === codigo) ?? cids.find(c => c.SUBCAT.toLowerCase().startsWith(codigo));
        if (achado) { setCid(achado); setCidTexto(rotuloCid(achado)); limpar('cid'); } else { setCid(null); setCidTexto(String(dados.cid)); }
      }
      if (dados.nomeMilitar) {
        const termos = normalizarBusca(String(dados.nomeMilitar)).split(/\s+/).filter(Boolean);
        const achados = militares.filter(m => { const alvo = normalizarBusca(m.inspecionado); return termos.every(t => alvo.includes(t)); });
        if (achados.length === 1) selecionarMilitar(achados[0]);
        else { setMilitarId(''); setMilitarTexto(String(dados.nomeMilitar)); }
      }
    } catch (err: any) {
      setErros(e => ({ ...e, geral: err?.message || 'Não foi possível ler o atestado.' }));
    } finally {
      setExtraindo(false);
    }
  };

  // ---- Envio ----
  const validar = (): Erros => {
    const e: Erros = {};
    if (!militar) e.militar = 'Escolha o militar na lista.';
    if (!dataAtestado) e.dataAtestado = 'Informe a data do atestado.';
    if (!soDigitos(tempoAtestado)) e.tempoAtestado = 'Informe o tempo do atestado.';
    if (!cid) e.cid = 'Escolha o CID na lista.';
    if (!soDigitos(tempoHomologado)) e.tempoHomologado = 'Informe o tempo homologado.';
    if (dispensas.length === 0) e.dispensas = 'Selecione ao menos uma dispensa.';
    return e;
  };

  const registrar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const novos = validar();
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#form-nova-pericia [aria-invalid="true"]')?.focus());
      return;
    }
    if (!militar || !cid || !usuario) return;
    setSalvando(true);
    try {
      const id = novoIdPericiaMenor();
      const pdfUrl = imagemRecortada ? await enviarPdfPericiaMenor(id, await imagemParaPdf(imagemRecortada)) : '';
      await registrarPericiaMenor(id, {
        militarId: militar.id, inspecionado: militar.inspecionado, om: militar.om,
        ...(servicoAplicavel && militar.servico_label ? { servico: militar.servico_label } : {}),
        cid: rotuloCid(cid), dispensas, dataAtestado, tempoAtestado: Number(soDigitos(tempoAtestado)), tempoHomologado: Number(soDigitos(tempoHomologado)),
        vdf, peritoUsuario: usuario.usuario, peritoNome: usuario.nome, peritoUid: usuario.uid, pdfUrl,
      });
      onRegistrado(militar.nome);
    } catch (err: any) {
      setErros({ geral: err?.message || 'Não foi possível registrar a perícia menor.' });
      setSalvando(false);
    }
  };

  const resumoDispensas = dispensas.length === 0 ? 'Selecione as dispensas…' : dispensas.join(', ');
  const secao = 'font-heading font-bold text-navy text-base';

  return (
    <>
      <Drawer
        title="Nova perícia menor"
        icon="personal_injury"
        onClose={() => { if (!salvando) onClose(); }}
        footer={(
          <>
            <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
            <Button type="submit" form="form-nova-pericia" icon="check" loading={salvando}>Registrar</Button>
          </>
        )}
      >
        <form id="form-nova-pericia" onSubmit={registrar} noValidate className="space-y-6">
          {erros.geral && <p role="alert" className="text-sm font-semibold text-wine">{erros.geral}</p>}

          <section className="space-y-2" aria-labelledby="pm-ia">
            <h3 id="pm-ia" className={secao}>Fotografar atestado</h3>
            <p className="text-xs text-ink-3">Fotografe o atestado para preencher militar, data, tempo e CID automaticamente. Opcional; a foto é guardada em PDF.</p>
            <input type="file" accept="image/*" capture="environment" ref={arquivo} onChange={aoEscolherArquivo} className="hidden" />
            {!imagemRecortada ? (
              <Button variant="secondary" icon="photo_camera" onClick={() => arquivo.current?.click()}>Fotografar atestado</Button>
            ) : (
              <div className="flex items-center gap-3">
                <img src={imagemRecortada} alt="Atestado recortado" className="w-16 h-16 rounded-lg object-cover border border-line shrink-0" />
                <div className="flex flex-wrap gap-2">
                  <Button icon="auto_awesome" loading={extraindo} onClick={extrairDados}>{extraindo ? 'Analisando…' : 'Extrair dados'}</Button>
                  <Button variant="secondary" disabled={extraindo} onClick={() => setImagemRecortada('')}>Refazer</Button>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4" aria-labelledby="pm-militar">
            <h3 id="pm-militar" className={secao}>Dados do militar</h3>
            <div>
              <Autocomplete
                label="Nome" required error={erros.militar}
                placeholder="Digite o nome ou o NIP do militar"
                valor={militarTexto} opcoes={opcoesMilitar}
                onDigitar={t => { setMilitarTexto(t); setMilitarId(''); limpar('militar'); }}
                onSelecionar={o => { const m = militares.find(x => x.id === o.chave); if (m) selecionarMilitar(m); }}
              />
              {buscaSemResultado && (
                <button type="button" onClick={() => setCadastrando(true)} className="mt-1 min-h-[44px] inline-flex items-center gap-1 text-sm font-bold text-navy underline underline-offset-2 hover:text-navy-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_add</span>
                  Militar não encontrado? Cadastrar novo militar
                </button>
              )}
            </div>
            {servicoAplicavel && (
              <div>
                <Field label="Serviço do HNRe">
                  {a => <input {...a} type="text" readOnly disabled value={militar?.servico_label || ''} placeholder="Sem serviço cadastrado" />}
                </Field>
                {!militar?.servico_label && (
                  <button type="button" onClick={() => setEditandoServico(true)} className="mt-1 min-h-[44px] inline-flex items-center gap-1 text-sm font-bold text-navy underline underline-offset-2 hover:text-navy-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">apartment</span>
                    Cadastrar Serviço
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="space-y-4" aria-labelledby="pm-atestado">
            <h3 id="pm-atestado" className={secao}>Dados do atestado</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Data do atestado" required error={erros.dataAtestado}>
                {a => <input {...a} type="date" value={dataAtestado} onChange={e => { setDataAtestado(e.target.value); limpar('dataAtestado'); }} />}
              </Field>
              <Field label="Tempo do atestado" required error={erros.tempoAtestado}>
                {a => (
                  <input {...a} type="text" inputMode="numeric" placeholder="Dias" value={tempoAtestado}
                    onChange={e => { setTempoAtestado(soDigitos(e.target.value)); limpar('tempoAtestado'); }}
                    onBlur={() => setTempoAtestado(t => comUnidade(soDigitos(t)))}
                    onFocus={() => setTempoAtestado(t => soDigitos(t))} />
                )}
              </Field>
            </div>
            <Autocomplete
              label="CID" required error={erros.cid} placeholder="Digite o código ou a descrição do CID"
              valor={cidTexto} opcoes={opcoesCid}
              onDigitar={t => { setCidTexto(t); setCid(null); limpar('cid'); }}
              onSelecionar={o => { const c = cids.find(x => x.SUBCAT === o.chave); if (c) { setCid(c); setCidTexto(rotuloCid(c)); limpar('cid'); } }}
            />
          </section>

          <section className="space-y-4" aria-labelledby="pm-homolog">
            <h3 id="pm-homolog" className={secao}>Homologação</h3>
            <Field label="Tempo homologado" required error={erros.tempoHomologado} help={`Máximo de ${MAX_HOMOLOGACAO} dias.`}>
              {a => (
                <input {...a} type="text" inputMode="numeric" placeholder="Dias" value={tempoHomologado}
                  onChange={e => { setTempoHomologado(soDigitos(e.target.value, MAX_HOMOLOGACAO)); limpar('tempoHomologado'); }}
                  onBlur={() => setTempoHomologado(t => comUnidade(soDigitos(t, MAX_HOMOLOGACAO)))}
                  onFocus={() => setTempoHomologado(t => soDigitos(t, MAX_HOMOLOGACAO))} />
              )}
            </Field>
            <Field label="Dispensas" required error={erros.dispensas}>
              {a => (
                <button
                  id={a.id} type="button" onClick={() => setEscolhendoDispensas(true)} aria-haspopup="dialog"
                  aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']}
                  className={`${a.className} flex items-center justify-between gap-2 text-left`}
                >
                  <span className={`truncate ${dispensas.length > 0 ? 'text-navy font-semibold' : 'text-ink-4'}`}>{resumoDispensas}</span>
                  <span className="material-symbols-outlined text-[20px] text-ink-3 shrink-0" aria-hidden="true">checklist</span>
                </button>
              )}
            </Field>
            <label className="flex items-center gap-3 min-h-[44px] cursor-pointer text-sm font-semibold text-ink">
              <input type="checkbox" className="w-5 h-5 accent-navy" checked={vdf} onChange={e => setVdf(e.target.checked)} />
              VDF
            </label>
          </section>
        </form>
      </Drawer>

      {imagemBruta && (
        <RecorteAtestado
          imagem={imagemBruta}
          onCancelar={() => setImagemBruta('')}
          onConfirmar={url => { setImagemRecortada(url); setImagemBruta(''); }}
        />
      )}
      {escolhendoDispensas && (
        <DispensasModal
          inicial={dispensas}
          onCancelar={() => setEscolhendoDispensas(false)}
          onConfirmar={lista => { setDispensas(lista); limpar('dispensas'); setEscolhendoDispensas(false); }}
        />
      )}
      {cadastrando && (
        <MilitarCadastroForm
          onClose={() => setCadastrando(false)}
          onCriado={(_nome, id) => { setCadastrando(false); setRecemCadastradoId(id); }}
        />
      )}
      {editandoServico && militar && (
        <ServicoMilitarForm militar={militar} onClose={() => setEditandoServico(false)} onSalvo={() => setEditandoServico(false)} />
      )}
    </>
  );
};
