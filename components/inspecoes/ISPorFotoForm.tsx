// Ficheiro: components/inspecoes/ISPorFotoForm.tsx
// "IS por foto" (página Inspeções de Saúde, botão da câmera ao lado de "Abrir IS"): cria ou atualiza IS
// em lote a partir de prints do SINAIS lidos pela IA (Firebase AI Logic, services/sinaisIA.ts).
//  1. Fotos: um só campo, quantas forem precisas, de uma ou mais IS, em qualquer ordem (enviar, fotografar
//     ou colar com Ctrl+V). A IA diz de que tela é cada foto (IS ou conclusão) e as fotos são agrupadas
//     pelo nº da IS (utils/importacaoIS.ts). Só a conclusão: atualiza a IS já cadastrada com aquele nº.
//  2. Inspecionado pelo NIP: achado na base, ou cadastrado com a foto da tela da IS — direto quando o
//     print traz tudo, ou no cadastro já preenchido para completar (MilitarCadastroForm).
//  3. Conferir: um cartão por IS (status no topo; abre para editar finalidade, datas, perito/horário e a
//     conclusão). "Gravar" grava as que estão prontas; as com pendência ficam abertas.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { AcoesRodape } from '../ui/AcoesRodape';
import { Field } from '../ui/Field';
import { StatusTag } from '../ui/StatusTag';
import { AvatarRadioGroup } from '../ui/AvatarRadioGroup';
import { MultiSelectCombobox } from '../ui/MultiSelectCombobox';
import { MilitarCadastroForm } from '../militares/MilitarCadastroForm';
import { SeletorHorario, estadoDoSlot } from './SeletorHorario';
import { CampoFinalidadeIS, opcaoAvatarDoPerito, useFinalidadesIS, type FinalidadeEscolhida } from './InspecaoForm';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { arquivoParaBase64IA } from '../../services/geminiAI';
import { lerPrintDoSinais } from '../../services/sinaisIA';
import { criarMilitar, type MilitarRecord } from '../../services/firestoreMilitares';
import { importarInspecao, type AmpIS, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { peritosDoAmp, type PeritoIS } from '../../services/peritosIS';
import { carregarCorposQuadros, carregarFinalidadesIS, carregarOms, carregarRestricoesIS } from '../../utils/corposQuadros';
import { preencherInspecionadoDoSinais, militarDoPreenchimento } from '../../utils/inspecionadoSinais';
import {
  agruparPrints, proporImportacao, statusDaConclusao, statusDosDados,
  type DadosISSinais, type LeituraPrint, type PropostaImportacao,
} from '../../utils/importacaoIS';
import { mostraRestricoes, opcoesDeRestricoes, separarRestricoes, juntarRestricoes } from '../../utils/conclusaoIS';
import {
  hojeISO, ocupadosDe, duracaoDoGrupo, peritoAtendeNoTurno, turnoDoSlot, STATUS_IS,
  type BloqueioAgenda, type ConfigAgenda, type StatusIS,
} from '../../utils/inspecoes';

interface Props {
  militares: MilitarRecord[];
  peritos: PeritoIS[];
  config: ConfigAgenda;
  bloqueios: BloqueioAgenda[];
  inspecoes: InspecaoRecord[];
  usuario: { uid: string; usuario: string; perfil: string };
  /** Quem pode cadastrar o inspecionado que não está na base (permissão militares.cadastrar). */
  podeCadastrarInspecionado: boolean;
  onClose: () => void;
  /** Cada IS gravada (com `reservada`, o horário foi reservado: sincronizar o Google Agenda). */
  onGravada: (is: InspecaoRecord, criada: boolean, reservada: boolean) => void;
  /** Todas gravadas: fecha o painel. `unica` é a IS quando só havia uma (abre o detalhe). */
  onConcluido: (gravadas: number, unica: InspecaoRecord | null) => void;
}

interface Foto { id: string; arquivo: File; url: string }

interface Campos {
  finalidade: string; dataAbertura: string; data: string; hora: string; peritoUid: string;
  laudo: string; dataLaudo: string; restricoes: string; tis: string; ds1a: string;
}

interface Item {
  numero: string;
  proposta: PropostaImportacao | null;
  erro: string;
  fotos: Foto[];
  /** Tela da IS lida (para cadastrar o inspecionado). */
  dados?: DadosISSinais;
  fotoDados?: Foto;
  militarId: string;
  militarNovo: boolean;
  campos: Campos;
  aberto: boolean;
  gravada: boolean;
  erroGravar: string;
}

type Erros = Record<string, string>;

/** Status em que a entrevista ainda vai acontecer: só aí o horário é reservado (e precisa estar livre). */
const STATUS_DE_AGENDA: StatusIS[] = ['agendada', 'reagendada'];
const LEITURAS_SIMULTANEAS = 3;

let seq = 0;
const novaFoto = (arquivo: File): Foto => ({ id: `f${++seq}`, arquivo, url: URL.createObjectURL(arquivo) });

/** Status que a IS terá com os campos conferidos. */
const statusDoItem = (it: Item, atual: InspecaoRecord | null): StatusIS => {
  const c = it.campos;
  const tis = c.tis.trim() || atual?.tis || '';
  const ds1a = tis ? c.ds1a.trim() || atual?.ds1a || '' : '';
  if (it.proposta?.temConclusao && c.laudo.trim()) return statusDaConclusao({ laudo: c.laudo.trim(), tis, ds1a }, atual?.status);
  return statusDosDados(c.data ? `${c.data}T${c.hora || '00:00'}` : '', atual ?? undefined);
};

/** Mapa de leituras assíncronas com no máximo `n` ao mesmo tempo. */
const emLotes = async <T, R>(lista: T[], n: number, fn: (x: T) => Promise<R>, aoTerminar: () => void): Promise<R[]> => {
  const res: R[] = new Array(lista.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, lista.length) }, async () => {
    while (i < lista.length) { const k = i++; res[k] = await fn(lista[k]); aoTerminar(); }
  }));
  return res;
};

export const ISPorFotoForm: React.FC<Props> = ({ militares, peritos, config, bloqueios, inspecoes, usuario, podeCadastrarInspecionado, onClose, onGravada, onConcluido }) => {
  const isDesktop = useIsDesktop();
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [lendo, setLendo] = useState<{ feitas: number; total: number } | null>(null);
  const [erroLeitura, setErroLeitura] = useState('');
  const [itens, setItens] = useState<Item[] | null>(null);
  const [naoReconhecidas, setNaoReconhecidas] = useState<Foto[]>([]);
  const [opcoesRestricoes, setOpcoesRestricoes] = useState<string[]>([]);
  const [cadastrando, setCadastrando] = useState<string | null>(null);
  const [errosPorItem, setErrosPorItem] = useState<Record<string, Erros>>({});
  const [gravando, setGravando] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { gruposMenu, achar } = useFinalidadesIS();

  const fotosRef = useRef(fotos);
  fotosRef.current = fotos;
  useEffect(() => () => fotosRef.current.forEach(f => URL.revokeObjectURL(f.url)), []);

  const adicionar = (arquivos: File[]) => {
    const imagens = arquivos.filter(f => f.type.startsWith('image/'));
    if (imagens.length) { setFotos(fs => [...fs, ...imagens.map(novaFoto)]); setErroLeitura(''); }
  };
  const remover = (id: string) => setFotos(fs => { const f = fs.find(x => x.id === id); if (f) URL.revokeObjectURL(f.url); return fs.filter(x => x.id !== id); });

  // Ctrl+V com imagem(ns): entram na lista (só antes de ler e com o cadastro do inspecionado fechado).
  useEffect(() => {
    if (itens || cadastrando) return;
    const aoColar = (e: ClipboardEvent) => {
      const imgs = Array.from(e.clipboardData?.items ?? []).filter(i => i.type.startsWith('image/')).map(i => i.getAsFile()).filter((f): f is File => !!f);
      if (!imgs.length) return;
      e.preventDefault();
      adicionar(imgs);
    };
    window.addEventListener('paste', aoColar);
    return () => window.removeEventListener('paste', aoColar);
  }, [itens, cadastrando]);

  const atualDe = (numero: string) => inspecoes.find(i => i.id === numero) ?? null;
  const ampDe = (it: Item, achada: FinalidadeEscolhida | null): AmpIS | '' => it.proposta?.amp || achada?.amp || '';

  // ---- 1. Ler as fotos ----
  const ler = async () => {
    if (!fotos.length) return;
    setLendo({ feitas: 0, total: fotos.length }); setErroLeitura('');
    try {
      const [grupos, restr] = await Promise.all([
        carregarFinalidadesIS(),
        carregarRestricoesIS().then(opcoesDeRestricoes).catch(() => [] as string[]),
      ]);
      const lidos = await emLotes(fotos, LEITURAS_SIMULTANEAS, async (f: Foto): Promise<{ leitura: LeituraPrint; origem: Foto }> => {
        try { return { leitura: await lerPrintDoSinais(await arquivoParaBase64IA(f.arquivo), f.arquivo.type || 'image/png'), origem: f }; }
        catch (e) { if (/Limite|App Check|indisponível/.test(String((e as Error)?.message))) throw e; return { leitura: {} as LeituraPrint, origem: f }; }
      }, () => setLendo(l => (l ? { ...l, feitas: l.feitas + 1 } : l)));
      const { grupos: porIs, naoReconhecidas: semIs } = agruparPrints<Foto>(lidos);

      // Inspecionados que não estão na base: cadastra com a tela da IS (uma vez por NIP).
      const criados = new Map<string, string>();
      let referencias: Awaited<ReturnType<typeof carregarRefs>> | null = null;
      const novos: Item[] = [];
      for (const g of porIs) {
        const atual = atualDe(g.numero);
        const { proposta, erro } = proporImportacao(g.dados?.leitura, g.conclusao?.leitura, grupos, restr, atual);
        const fotosDoItem = [g.dados?.origem, g.conclusao?.origem, ...g.repetidas].filter((f): f is Foto => !!f);
        const item: Item = {
          numero: g.numero, proposta, erro, fotos: fotosDoItem, dados: g.dados?.leitura, fotoDados: g.dados?.origem,
          militarId: '', militarNovo: false, aberto: false, gravada: false, erroGravar: '',
          campos: { finalidade: '', dataAbertura: '', data: '', hora: '', peritoUid: '', laudo: '', dataLaudo: '', restricoes: '', tis: '', ds1a: '' },
        };
        if (proposta) {
          const nip = proposta.nip || atual?.inspecionadoId || '';
          const achado = militares.find(m => m.id === nip);
          if (achado) item.militarId = achado.id;
          else if (criados.has(nip)) { item.militarId = criados.get(nip)!; item.militarNovo = true; }
          else if (!g.dados) item.erro = `IS ${g.numero}: inspecionado não encontrado. Envie também a foto da tela da IS.`;
          else if (!podeCadastrarInspecionado) item.erro = `IS ${g.numero}: inspecionado (NIP ${nip}) não cadastrado.`;
          else {
            referencias ??= await carregarRefs();
            const preenchido = preencherInspecionadoDoSinais(g.dados.leitura, referencias.cq, referencias.oms);
            if (preenchido.tipo !== 'militar') item.erro = `IS ${g.numero}: o inspecionado é ${preenchido.tipo === 'dependente' ? 'um dependente' : 'pensionista'}; cadastre-o em Inspecionados (Dep/Pens.).`;
            else {
              const novo = militarDoPreenchimento(preenchido, referencias.cq);
              if (novo && nip.length === 8) { item.militarId = await criarMilitar(novo); item.militarNovo = true; criados.set(nip, item.militarId); }
            }
          }
          item.campos = camposIniciais(proposta, atual);
        }
        novos.push(item);
      }
      const prontos = novos.map(it => ({ ...it, aberto: !it.erro && precisaConferir(it) }));
      setOpcoesRestricoes(restr);
      setNaoReconhecidas(semIs);
      setItens(prontos);
      if (!porIs.length) setErroLeitura('Nenhuma foto foi reconhecida como tela de IS do SINAIS.');
    } catch (e: any) {
      setErroLeitura(e?.message || 'Não foi possível ler as fotos.');
    } finally {
      setLendo(null);
    }
  };

  const carregarRefs = async () => { const [cq, oms] = await Promise.all([carregarCorposQuadros(), carregarOms()]); return { cq, oms }; };

  /** Campos iniciais: o que as fotos trazem, completado com o que a IS cadastrada já tem. */
  const camposIniciais = (p: PropostaImportacao, atual: InspecaoRecord | null): Campos => {
    const dataAtual = atual?.dataEntrevista?.slice(0, 10) ?? '';
    const data = p.dataAgendamento || dataAtual;
    const hora = data && data === dataAtual ? atual!.dataEntrevista.slice(11, 16) : data && data < hojeISO() ? '08:00' : '';
    const amp = p.amp || (achar(p.finalidade)?.amp ?? '');
    const doAmp = amp ? peritosDoAmp(peritos, amp) : [];
    const peritoUid = (atual?.peritoUid && doAmp.some(x => x.uid === atual.peritoUid) ? atual.peritoUid : '') || (doAmp.some(x => x.uid === usuario.uid) ? usuario.uid : '');
    return {
      finalidade: p.finalidade || atual?.finalidade || '', dataAbertura: p.dataAbertura || atual?.dataAbertura || '',
      data, hora, peritoUid,
      laudo: p.laudo, dataLaudo: p.dataLaudo || (p.laudo ? atual?.dataLaudo || '' : ''), restricoes: p.restricoes, tis: p.tis, ds1a: p.ds1a,
    };
  };

  // ---- 2. Conferir ----
  const ocupadosSem = (numero: string) => ocupadosDe(inspecoes.filter(i => i.id !== numero));

  const validar = (it: Item): Erros => {
    const e: Erros = {};
    if (it.erro || !it.proposta) return e;
    const c = it.campos;
    const achada = achar(c.finalidade);
    const amp = ampDe(it, achada);
    const perito = peritos.find(p => p.uid === c.peritoUid);
    if (!militares.some(m => m.id === it.militarId)) e.militar = it.militarId ? 'Carregando o inspecionado…' : 'Cadastre o inspecionado.';
    if (!achada) e.finalidade = 'Selecione a finalidade.';
    if (!c.dataAbertura) e.dataAbertura = 'Informe a data de abertura.';
    if (c.data && !c.hora) e.hora = 'Escolha o horário da entrevista.';
    if (c.data && (!perito || (amp && !peritosDoAmp(peritos, amp).some(p => p.uid === perito.uid)))) e.perito = 'Escolha o perito.';
    const status = statusDoItem(it, atualDe(it.numero));
    if (c.data && c.data >= hojeISO() && STATUS_DE_AGENDA.includes(status) && perito && c.hora) {
      const duracao = duracaoDoGrupo(achada?.grupo);
      const t = turnoDoSlot(c.hora);
      const estado = estadoDoSlot(perito.uid, c.data, c.hora, !!t && peritoAtendeNoTurno(config, perito.uid, c.data, t), bloqueios, ocupadosSem(it.numero), duracao);
      if (estado !== 'livre') e.hora = estado === 'ocupado' ? `${perito.usuario} já tem IS neste horário.` : estado === 'bloqueado' ? 'Esse horário está bloqueado.' : estado === 'nao_cabe' ? `A entrevista (${duracao} min) não cabe no turno a partir deste horário.` : `${perito.usuario} não atende neste turno.`;
    }
    return e;
  };
  const precisaConferir = (it: Item) => Object.keys(validar(it)).length > 0 || (it.proposta?.avisos.length ?? 0) > 0;

  const mudar = (numero: string, patch: Partial<Item>) => setItens(l => l?.map(it => (it.numero === numero ? { ...it, ...patch } : it)) ?? l);
  const mudarCampos = (numero: string, patch: Partial<Campos>, campo?: string) => {
    setItens(l => l?.map(it => (it.numero === numero ? { ...it, campos: { ...it.campos, ...patch } } : it)) ?? l);
    if (campo) setErrosPorItem(m => (m[numero]?.[campo] ? { ...m, [numero]: { ...m[numero], [campo]: '' } } : m));
  };

  // ---- 3. Gravar ----
  const pendentes = (itens ?? []).filter(it => !it.erro && it.proposta && !it.gravada);
  const gravar = async () => {
    if (!itens) return;
    const errosNovos: Record<string, Erros> = {};
    const prontos = pendentes.filter(it => { const e = validar(it); if (Object.keys(e).length) { errosNovos[it.numero] = e; return false; } return true; });
    setErrosPorItem(errosNovos);
    if (Object.keys(errosNovos).length) setItens(l => l?.map(it => (errosNovos[it.numero] ? { ...it, aberto: true } : it)) ?? l);
    if (!prontos.length) return;
    setGravando(true);
    let gravadas = 0;
    let ultima: InspecaoRecord | null = null;
    for (const it of prontos) {
      const c = it.campos;
      const atual = atualDe(it.numero);
      const achada = achar(c.finalidade)!;
      const amp = ampDe(it, achada) as AmpIS;
      const perito = peritos.find(p => p.uid === c.peritoUid);
      const militar = militares.find(m => m.id === it.militarId)!;
      const status = statusDoItem(it, atual);
      const reservar = !!c.data && c.data >= hojeISO() && STATUS_DE_AGENDA.includes(status);
      const conclusao = !!it.proposta!.temConclusao && !!c.laudo.trim();
      try {
        const salva = await importarInspecao(it.numero, {
          dataAbertura: c.dataAbertura, dataEntrevista: c.data && c.hora ? `${c.data}T${c.hora}` : '',
          finalidade: achada.finalidade, grupoFinalidade: achada.grupo, amp,
          peritoUid: perito?.uid ?? '', peritoNome: perito?.usuario ?? '', peritoGmail: perito?.gmail ?? '',
          inspecionadoId: militar.id, inspecionado: militar.inspecionado,
          laudo: conclusao ? c.laudo.trim() : '', dataLaudo: conclusao ? c.dataLaudo || hojeISO() : '',
          restricoes: conclusao && mostraRestricoes({ grupoFinalidade: achada.grupo }) ? juntarRestricoes(separarRestricoes(c.restricoes)) : '',
          tis: conclusao ? c.tis.trim() : '', ds1a: conclusao && c.tis.trim() ? c.ds1a.trim().toUpperCase() : '',
          status, criadoPor: usuario.usuario,
        }, atual, reservar);
        gravadas++; ultima = salva;
        mudar(it.numero, { gravada: true, aberto: false, erroGravar: '' });
        onGravada(salva, !atual, reservar);
      } catch (err: any) {
        mudar(it.numero, { erroGravar: err?.message || 'Não foi possível gravar.', aberto: true });
      }
    }
    setGravando(false);
    // Tudo gravado e nada com erro no lote: fecha (com uma IS só, o detalhe dela abre).
    const semPendencia = gravadas === pendentes.length && itens.every(it => !it.erro && it.proposta) && naoReconhecidas.length === 0;
    if (semPendencia) {
      const total = itens.filter(it => it.gravada).length + gravadas;
      onConcluido(total, itens.length === 1 ? ultima : null);
    }
  };

  const conferindo = !!itens;
  const lerRotulo = lendo ? `Lendo ${lendo.feitas} de ${lendo.total}…` : 'Ler fotos';
  const qtdProntas = pendentes.length;
  const itemCadastro = itens?.find(it => it.numero === cadastrando);

  return (
    <>
      <Drawer
        title="IS por foto"
        icon="photo_camera"
        onClose={() => { if (!gravando && !lendo) onClose(); }}
        footer={(
          <>
            <Button variant="secondary" className="max-md:hidden" onClick={onClose} disabled={gravando || !!lendo}>{conferindo ? 'Fechar' : 'Cancelar'}</Button>
            {conferindo
              ? (qtdProntas > 0 && <AcoesRodape acoes={[{ id: 'gravar', rotulo: qtdProntas === 1 ? 'Gravar IS' : `Gravar ${qtdProntas} IS`, icone: 'save', onClick: () => void gravar(), loading: gravando }]} />)
              : <AcoesRodape acoes={[{ id: 'ler', rotulo: lerRotulo, icone: 'auto_awesome', onClick: () => void ler(), loading: !!lendo, disabled: !fotos.length }]} />}
          </>
        )}
      >
        {!conferindo ? (
          <div className="space-y-4">
            <button
              type="button" onClick={() => input.current?.click()} disabled={!!lendo}
              className="w-full border-2 border-dashed border-line rounded-xl py-8 flex flex-col items-center justify-center gap-2 text-ink-3 hover:border-navy hover:text-navy transition-colors bg-paper/50 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[40px]" aria-hidden="true">photo_camera</span>
              <span className="text-sm font-semibold">Tirar foto ou selecionar imagem</span>
              <span className="text-xs opacity-60">{isDesktop ? 'Galeria · Arquivos · Colar (Ctrl+V)' : 'Câmera · Galeria · Arquivos'}</span>
            </button>
            <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={e => { adicionar(Array.from(e.target.files || [])); e.target.value = ''; }} />

            {fotos.length > 0 && (
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2" aria-label="Fotos">
                {fotos.map((f, i) => (
                  <li key={f.id} className="relative">
                    <img src={f.url} alt={`Foto ${i + 1}`} className="w-full aspect-video object-cover rounded-lg border border-line bg-thead" />
                    <span className="absolute top-1.5 left-1.5 bg-navy/75 text-white text-xs font-bold px-1.5 py-0.5 rounded">{i + 1}</span>
                    {!lendo && (
                      <button
                        type="button" onClick={() => remover(f.id)} aria-label={`Remover foto ${i + 1}`}
                        className="absolute top-1 right-1 bg-wine text-white rounded-full w-11 h-11 flex items-center justify-center hover:bg-wine-dark shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {erroLeitura && <p role="alert" className="text-sm font-semibold text-wine">{erroLeitura}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {erroLeitura && <p role="alert" className="text-sm font-semibold text-wine">{erroLeitura}</p>}
            {itens!.map(it => (
              <CartaoIS
                key={it.numero} item={it} atual={atualDe(it.numero)} militar={militares.find(m => m.id === it.militarId) ?? null}
                peritos={peritos} config={config} bloqueios={bloqueios} ocupados={ocupadosSem(it.numero)}
                gruposMenu={gruposMenu} achar={achar} opcoesRestricoes={opcoesRestricoes} erros={errosPorItem[it.numero] ?? {}}
                status={statusDoItem(it, atualDe(it.numero))} amp={ampDe(it, achar(it.campos.finalidade))}
                podeCadastrar={podeCadastrarInspecionado && !!it.fotoDados}
                onCampos={(p, campo) => mudarCampos(it.numero, p, campo)}
                onAlternar={() => mudar(it.numero, { aberto: !it.aberto })}
                onCadastrar={() => setCadastrando(it.numero)}
              />
            ))}
            {naoReconhecidas.length > 0 && (
              <div className="rounded-lg border border-wine/40 bg-wine/5 p-3">
                <p className="text-xs font-semibold text-wine mb-2" role="alert">{naoReconhecidas.length === 1 ? 'Foto não reconhecida' : `${naoReconhecidas.length} fotos não reconhecidas`}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {naoReconhecidas.map(f => <img key={f.id} src={f.url} alt="Foto não reconhecida" className="w-full aspect-video object-cover rounded border border-line" />)}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {itemCadastro?.fotoDados && (
        <MilitarCadastroForm
          printInicial={itemCadastro.fotoDados.arquivo}
          onClose={() => setCadastrando(null)}
          onCriado={(_nome, id) => {
            setCadastrando(null);
            // O mesmo inspecionado pode estar em outras IS do lote.
            const nip = itemCadastro.proposta?.nip;
            setItens(l => l?.map(it => (it.numero === itemCadastro.numero || (nip && it.proposta?.nip === nip && !it.militarId) ? { ...it, militarId: id, militarNovo: true } : it)) ?? l);
          }}
        />
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Cartão de uma IS do lote
// ---------------------------------------------------------------------------

interface CartaoProps {
  item: Item;
  atual: InspecaoRecord | null;
  militar: MilitarRecord | null;
  peritos: PeritoIS[];
  config: ConfigAgenda;
  bloqueios: BloqueioAgenda[];
  ocupados: Set<string>;
  gruposMenu: ReturnType<typeof useFinalidadesIS>['gruposMenu'];
  achar: ReturnType<typeof useFinalidadesIS>['achar'];
  opcoesRestricoes: string[];
  erros: Erros;
  status: StatusIS;
  amp: AmpIS | '';
  podeCadastrar: boolean;
  onCampos: (patch: Partial<Campos>, campo?: string) => void;
  onAlternar: () => void;
  onCadastrar: () => void;
}

const CartaoIS: React.FC<CartaoProps> = ({ item, atual, militar, peritos, config, bloqueios, ocupados, gruposMenu, achar, opcoesRestricoes, erros, status, amp, podeCadastrar, onCampos, onAlternar, onCadastrar }) => {
  const c = item.campos;
  const p = item.proposta;
  const st = STATUS_IS[status];
  const achada = achar(c.finalidade);
  const peritosDoAmpAtual = amp ? peritosDoAmp(peritos, amp) : [];
  const reservar = !!c.data && c.data >= hojeISO() && STATUS_DE_AGENDA.includes(status);
  const temErros = Object.values(erros).some(Boolean);
  const idCorpo = `is-foto-${item.numero}`;

  if (item.erro || !p) {
    return (
      <div className="rounded-xl border border-wine/40 bg-wine/5 p-3">
        <p className="text-sm font-bold text-ink">IS {item.numero}</p>
        <p className="text-xs font-semibold text-wine" role="alert">{item.erro}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border bg-white ${item.gravada ? 'border-green-700/40' : temErros || item.erroGravar ? 'border-wine/50' : 'border-line'}`}>
      <button
        type="button" onClick={onAlternar} aria-expanded={item.aberto} aria-controls={idCorpo} disabled={item.gravada}
        className="w-full flex items-start gap-3 p-3 text-left min-h-[44px]"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-ink">IS {item.numero}</span>
            {item.gravada ? <StatusTag tone="success">Gravada</StatusTag> : <StatusTag tone={st.tom}>{st.rotulo}</StatusTag>}
            {!item.gravada && atual && <StatusTag tone="neutral" dot={false}>Atualizar</StatusTag>}
          </span>
          <span className="block text-sm font-bold text-navy break-words">
            {militar ? militar.inspecionado : item.militarId ? 'Carregando…' : <span className="text-wine">Inspecionado não cadastrado</span>}
          </span>
          <span className="block text-xs text-ink-3 truncate">{achada?.finalidade || p.finalidadeLida || 'Finalidade não identificada'}</span>
        </span>
        {!item.gravada && <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">{item.aberto ? 'expand_less' : 'expand_more'}</span>}
      </button>

      {item.erroGravar && <p className="px-3 pb-2 text-xs font-semibold text-wine" role="alert">{item.erroGravar}</p>}

      {item.aberto && !item.gravada && (
        <div id={idCorpo} className="border-t border-line p-3 space-y-4">
          {item.militarNovo && <p className="text-xs font-semibold text-green-700">Inspecionado cadastrado agora.</p>}
          {!militar && !item.militarId && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-wine" role="alert">{erros.militar || 'Cadastre o inspecionado.'}</p>
              {podeCadastrar && <Button variant="secondary" icon="person_add" onClick={onCadastrar}>Cadastrar</Button>}
            </div>
          )}
          {p.avisos.length > 0 && (
            <ul className="space-y-0.5 text-xs text-ink-2 list-disc pl-5">
              {p.avisos.map(a => <li key={a}>{a}</li>)}
            </ul>
          )}

          <CampoFinalidadeIS required value={c.finalidade} onChange={v => onCampos({ finalidade: v }, 'finalidade')} gruposMenu={gruposMenu} erro={erros.finalidade} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Data de abertura" required error={erros.dataAbertura}>
              {a => <input {...a} type="date" max={hojeISO()} value={c.dataAbertura} onChange={e => onCampos({ dataAbertura: e.target.value }, 'dataAbertura')} />}
            </Field>
            <Field label="Data da entrevista">
              {a => <input {...a} type="date" value={c.data} onChange={e => onCampos({ data: e.target.value, hora: '' }, 'hora')} />}
            </Field>
          </div>

          {c.data && amp && (
            peritosDoAmpAtual.length === 0
              ? <p role="alert" className="text-sm font-semibold text-wine">Não há perito ativo para o AMP {amp}.</p>
              : (
                <AvatarRadioGroup<string>
                  label={`Perito (${amp})`} error={erros.perito}
                  value={c.peritoUid} onChange={v => onCampos(reservar && v !== c.peritoUid ? { peritoUid: v, hora: '' } : { peritoUid: v }, 'perito')}
                  options={peritosDoAmpAtual.map(opcaoAvatarDoPerito)}
                />
              )
          )}

          {c.data && (reservar ? (
            <SeletorHorario
              semCampoData duracao={duracaoDoGrupo(achada?.grupo)} peritoUid={c.peritoUid} data={c.data} onData={d => onCampos({ data: d })}
              hora={c.hora} onHora={h => onCampos({ hora: h }, 'hora')} config={config} bloqueios={bloqueios} ocupados={ocupados} erro={erros.hora}
            />
          ) : (
            <Field label="Horário da entrevista" required error={erros.hora}>
              {a => <input {...a} type="time" step={600} value={c.hora} onChange={e => onCampos({ hora: e.target.value }, 'hora')} />}
            </Field>
          ))}

          {p.temConclusao && (
            <fieldset className="border border-line rounded-xl p-3 space-y-4">
              <legend className="px-1 text-xs font-bold text-ink-3">Conclusão</legend>
              <Field label="Laudo">
                {a => <textarea {...a} value={c.laudo} onChange={e => onCampos({ laudo: e.target.value })} className={`${a.className} min-h-[72px]`} />}
              </Field>
              {c.laudo.trim() && (
                <>
                  <Field label="Data do laudo">
                    {a => <input {...a} type="date" max={hojeISO()} value={c.dataLaudo} onChange={e => onCampos({ dataLaudo: e.target.value })} />}
                  </Field>
                  {achada && mostraRestricoes({ grupoFinalidade: achada.grupo }) && (
                    <MultiSelectCombobox
                      label="Restrições" opcoes={Array.from(new Set([...opcoesRestricoes, ...separarRestricoes(c.restricoes)]))}
                      selecionadas={separarRestricoes(c.restricoes)} onChange={l => onCampos({ restricoes: juntarRestricoes(l) })}
                    />
                  )}
                  {p.temDados && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Nº do TIS">
                        {a => <input {...a} type="text" value={c.tis} onChange={e => onCampos({ tis: e.target.value.trim() })} className={`${a.className} font-mono`} autoComplete="off" />}
                      </Field>
                      <Field label="DS-1a">
                        {a => <input {...a} type="text" value={c.ds1a} disabled={!c.tis.trim()} onChange={e => onCampos({ ds1a: e.target.value.trim().toUpperCase() })} className={`${a.className} font-mono uppercase`} autoComplete="off" />}
                      </Field>
                    </div>
                  )}
                </>
              )}
            </fieldset>
          )}

          {item.fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {item.fotos.map(f => <img key={f.id} src={f.url} alt={`Foto da IS ${item.numero}`} className="w-full aspect-video object-cover rounded border border-line" />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
