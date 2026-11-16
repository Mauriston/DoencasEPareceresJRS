// Ficheiro: components/periciaMenor/PericiaMenorPainel.tsx
// Detalhe de uma perícia menor com as abas "Esta perícia · Histórico N" (auditoria v3, 5b/5c — PM1–PM7,
// PMD1, PMD2). O MESMO conteúdo em três cascas:
//   - 'lateral'   (≥ 1280 px): painel fixo ao lado da tabela (mestre-detalhe), sem backdrop;
//   - 'flutuante' (768–1279 px): painel de 576 px à direita, NÃO modal (não escurece nem fecha ao
//     clicar na tabela); Esc fecha (tratado pela lista);
//   - 'sheet'     (< 768 px): bottom sheet (Drawer do DS);
//   - 'inline'    (Ficha do inspecionado): só "Esta perícia" no painel principal da página (CascaPainelFicha) —
//     o histórico fica no painel de apoio da ficha; as ações vão para a barra inferior da aba (`acoes`).
// "Esta perícia" responde primeiro "até quando?" (contagem + barra de dias), depois dispensas em chips,
// CID com o código em destaque, o PDF com rótulo próprio e o resto recolhido. "Histórico" traz os dois
// números de 12 meses, o CID que se repete e os registros — tocar num registro troca o conteúdo.
// Ação do painel: criar já preenchido ("Nova perícia para ele"), nunca navegar (PMD2).
import React from 'react';
import { Link } from 'react-router-dom';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { LinkPdf } from '../ui/LinkPdf';
import { StatusTag } from '../ui/StatusTag';
import { AbasSublinhadas, BarraDias, CidCodigo, SaldoAcumulado, TagTipoPericia, TextoContagem, classeContagem } from './partes';
import { dataBR, type PericiaMenorRecord } from '../../services/firestorePericiasMenores';
import { extrairNomeInspecionado, formatNip } from '../../utils/format';
import { medicoDaPericia } from '../../utils/periciaMenorLista';
import { saldoAcumulado } from '../../utils/periciaMenorRegras';
import {
  ROTULO_TIPO_PERICIA, contagemTermino, diaMes, diasDecorridos, partesCid, postoDoInspecionado, repeticaoCid, resumoPericias, tipoDaPericia,
} from '../../utils/periciaMenorResumo';
import type { TermosPericia } from '../../config/termosPericia';
import type { AcaoRodape } from '../ui/AcoesRodape';
import { CascaPainelFicha } from '../ficha/CascaPainelFicha';

export type AbaPericia = 'esta' | 'historico';
export type ModoPainel = 'lateral' | 'flutuante' | 'sheet' | 'inline';

interface Props {
  pericia: PericiaMenorRecord;
  /** Todas as perícias do mesmo militar (incluindo esta), da mais recente para a mais antiga. */
  historico: PericiaMenorRecord[];
  hoje: string;
  cidAbrev: ReadonlyMap<string, string> | null;
  modo: ModoPainel;
  aba: AbaPericia;
  onAba: (aba: AbaPericia) => void;
  /** Troca a perícia mostrada (registro do histórico). */
  onSelecionar: (id: string) => void;
  onFechar: () => void;
  /** "Nova perícia para ele" (só com pericia-menor.novo). */
  onNova?: () => void;
  /** Ficha do inspecionado (⤢), quando há NIP e o perfil acessa. */
  fichaHref?: string;
  termos: TermosPericia;
  /** Só no modo 'inline': botões da barra inferior da aba da ficha. */
  acoes?: AcaoRodape[];
}

const dias = (n: number) => `${n} dia${n !== 1 ? 's' : ''}`;
const Linha: React.FC<{ rotulo: string; valor?: string }> = ({ rotulo, valor }) => (
  <div><dt className="text-xs font-semibold text-ink-3">{rotulo}</dt><dd className="text-sm text-ink break-words">{valor || '—'}</dd></div>
);

/** "CB-MO · 12.3456.78 · EAMPE". */
export const linhaIdentificacao = (p: Pick<PericiaMenorRecord, 'inspecionado' | 'militarId' | 'om'>): string => {
  const nome = extrairNomeInspecionado(p.inspecionado);
  return [postoDoInspecionado(p.inspecionado, nome), p.militarId ? formatNip(p.militarId) : '', p.om].filter(Boolean).join(' · ');
};

const EstaPericia: React.FC<{ p: PericiaMenorRecord; historico: PericiaMenorRecord[]; hoje: string; cidAbrev: Props['cidAbrev']; termos: TermosPericia }> = ({ p, historico, hoje, cidAbrev, termos }) => {
  const contagem = contagemTermino(p.dataTermino, hoje);
  const { decorridos, total } = diasDecorridos(p, hoje);
  const cid = partesCid(p, cidAbrev);
  const saldo = saldoAcumulado(historico, hoje);
  const vigente = contagem.tom !== 'passado';
  const unidade = p.homologacao ? 'homologados' : 'de dispensa';
  const atestado = termos.singular === 'atestado';
  return (
    <div className="space-y-5">
      <section aria-label="Prazo" className="rounded-xl border border-line bg-surface-2 p-3 space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className={`text-h2 font-extrabold ${vigente ? classeContagem(contagem) : 'text-navy'}`}>{contagem.titulo}</span>
          {p.dataTermino && vigente && <span className="text-sm text-ink-3 tabular-nums">até {diaMes(p.dataTermino)}</span>}
        </div>
        <BarraDias
          atual={vigente ? decorridos : total} total={total}
          rotulo={<>{vigente ? `${decorridos} de ${total}` : total} dias {unidade} · atestado de {diaMes(p.dataAtestado)}</>}
        />
      </section>

      {vigente && <SaldoAcumulado usados={saldo.usados} restante={saldo.restante} />}

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-ink-3">Dispensas</p>
        {(p.dispensas ?? []).length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Dispensas">
            {p.dispensas.map(d => <li key={d}><StatusTag tone="navyOutline" dot={false}>{d}</StatusTag></li>)}
          </ul>
        ) : <p className="text-sm text-ink-3">Sem dispensas registradas</p>}
        {p.vdf && <p className="text-xs font-semibold text-navy pt-1">Encaminhado para IS de VDF</p>}
      </div>

      <div className="space-y-0.5">
        <p className="text-xs font-semibold text-ink-3">CID</p>
        <p className="text-sm text-ink"><CidCodigo codigo={cid.codigo} descricao={cid.descricao} /></p>
      </div>

      {p.pdfUrl && (
        <LinkPdf
          url={p.pdfUrl} tituloPdf={`Atestado de ${dataBR(p.dataAtestado)} — ${extrairNomeInspecionado(p.inspecionado)}`}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-line hover:border-navy text-left transition-colors"
        >
          <span className="material-symbols-outlined text-[26px] text-navy shrink-0" aria-hidden="true">picture_as_pdf</span>
          <span className="min-w-0 flex-1 text-sm font-bold text-navy">Atestado de {diaMes(p.dataAtestado)}</span>
          <span className="text-sm font-bold text-blue underline underline-offset-2">Abrir</span>
        </LinkPdf>
      )}

      <details className="group border-t border-line">
        <summary className="flex items-center justify-between gap-2 py-2.5 min-h-10 cursor-pointer list-none text-sm font-bold text-navy [&::-webkit-details-marker]:hidden">
          Emissor, perito e registro
          <span className="material-symbols-outlined text-[22px] text-ink-3 transition-transform group-open:rotate-180" aria-hidden="true">expand_more</span>
        </summary>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pb-2">
          <Linha rotulo="OM" valor={p.om} />
          {p.servico && <Linha rotulo="Serviço do HNRe" valor={p.servico} />}
          <Linha rotulo="Data do atestado" valor={dataBR(p.dataAtestado)} />
          {p.homologacao !== undefined && <Linha rotulo="Homologação" valor={p.homologacao ? 'Sim' : 'Não'} />}
          <Linha rotulo="Tempo do atestado" valor={dias(p.tempoAtestado)} />
          {p.homologacao !== false && <Linha rotulo="Tempo homologado" valor={dias(p.tempoHomologado)} />}
          {p.medicoEmissor && <Linha rotulo="Médico emissor" valor={p.medicoEmissor} />}
          {p.crmEmissor && <Linha rotulo="CRM" valor={p.crmEmissor} />}
          <Linha rotulo="Término" valor={dataBR(p.dataTermino)} />
          <Linha rotulo="Perito" valor={medicoDaPericia(p) || p.peritoUsuario || p.peritoNome} />
          <Linha rotulo={atestado ? 'Registrado em' : 'Registrada em'} valor={p.criadoEm?.toDate?.().toLocaleDateString('pt-BR')} />
        </dl>
      </details>
    </div>
  );
};

/** Linha de um registro do histórico (também usada na Ficha do inspecionado). */
export const LinhaRegistroPericia: React.FC<{ p: PericiaMenorRecord; hoje: string; cidAbrev: Props['cidAbrev']; atual?: boolean; onAbrir: () => void }> = ({ p, hoje, cidAbrev, atual = false, onAbrir }) => {
  const cid = partesCid(p, cidAbrev);
  const contagem = contagemTermino(p.dataTermino, hoje);
  return (
    <button type="button" onClick={onAbrir} aria-current={atual || undefined}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${atual ? 'border-gold bg-thead' : 'border-line hover:border-navy'}`}>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-bold text-navy tabular-nums">{dataBR(p.dataAtestado)}</span>
          {atual && <span className="text-xs font-semibold text-ink-3">esta</span>}
          {contagem.tom !== 'passado' && <TextoContagem contagem={contagem} />}
        </span>
        <span className="block text-xs text-ink-3 break-words">
          {dias(p.tempoHomologado)} · {ROTULO_TIPO_PERICIA[tipoDaPericia(p.dispensas)]}{cid.codigo || cid.descricao ? ' · ' : ''}<CidCodigo codigo={cid.codigo} descricao={cid.descricao} />
        </span>
      </span>
      <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">chevron_right</span>
    </button>
  );
};

const Historico: React.FC<{ p: PericiaMenorRecord; historico: PericiaMenorRecord[]; hoje: string; cidAbrev: Props['cidAbrev']; termos: TermosPericia; onSelecionar: (id: string) => void; fichaHref?: string }> = ({ p, historico, hoje, cidAbrev, termos, onSelecionar, fichaHref }) => {
  const r = resumoPericias(historico, hoje);
  const repete = repeticaoCid(historico, termos.plural, cidAbrev);
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line p-3 flex flex-col-reverse">
          <dt className="text-xs text-ink-3">dias de dispensa nos últimos 12 meses</dt>
          <dd className="text-kpi text-navy tabular-nums">{r.dispensa.m12}</dd>
        </div>
        <div className="rounded-xl border border-line p-3 flex flex-col-reverse">
          <dt className="text-xs text-ink-3">dias de restrições nos últimos 12 meses</dt>
          <dd className="text-kpi text-navy tabular-nums">{r.restricoes.m12}</dd>
        </div>
      </dl>
      {repete && <p className="text-sm text-ink">{repete}</p>}
      <ul className="space-y-2" aria-label={`Histórico de ${termos.plural}`}>
        {historico.map(h => (
          <li key={h.id}><LinhaRegistroPericia p={h} hoje={hoje} cidAbrev={cidAbrev} atual={h.id === p.id} onAbrir={() => onSelecionar(h.id)} /></li>
        ))}
      </ul>
      {fichaHref && <Link to={fichaHref} className="inline-flex items-center gap-1 text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Abrir ficha do inspecionado</Link>}
    </div>
  );
};

export const PericiaMenorPainel: React.FC<Props> = ({ pericia: p, historico, hoje, cidAbrev, modo, aba, onAba, onSelecionar, onFechar, onNova, fichaHref, termos, acoes }) => {
  const nome = extrairNomeInspecionado(p.inspecionado);
  const idBase = `pm-${modo}`;
  const atestado = termos.singular === 'atestado';
  if (modo === 'inline') {
    const tipo = tipoDaPericia(p.dispensas);
    return (
      <CascaPainelFicha
        titulo={`${atestado ? 'Atestado' : 'Perícia menor'} de ${dataBR(p.dataAtestado)}`} icone="personal_injury"
        tituloExtra={<TagTipoPericia tipo={tipo} />} subtitulo={linhaIdentificacao(p)} acoes={acoes}
      >
        <EstaPericia p={p} historico={historico} hoje={hoje} cidAbrev={cidAbrev} termos={termos} />
      </CascaPainelFicha>
    );
  }
  const abas = (
    <AbasSublinhadas<AbaPericia>
      rotulo={`Detalhe ${atestado ? 'do atestado' : 'da perícia'}`} idBase={idBase} ativa={aba} onChange={onAba}
      altura="sm" distribuir="sempre" className="-mx-5"
      abas={[{ id: 'esta', rotulo: atestado ? 'Este atestado' : 'Esta perícia' }, { id: 'historico', rotulo: 'Histórico', contagem: historico.length }]}
    />
  );
  const corpo = (
    <div id={`${idBase}-painel`} role="tabpanel" aria-labelledby={`${idBase}-aba-${aba}`} className="pt-4">
      {aba === 'esta'
        ? <EstaPericia p={p} historico={historico} hoje={hoje} cidAbrev={cidAbrev} termos={termos} />
        : <Historico p={p} historico={historico} hoje={hoje} cidAbrev={cidAbrev} termos={termos} fichaHref={fichaHref} onSelecionar={id => { onSelecionar(id); onAba('esta'); }} />}
    </div>
  );
  const nova = onNova ? <Button icon="add" fullWidth onClick={onNova}>{atestado ? 'Novo atestado para ele' : 'Nova perícia para ele'}</Button> : null;
  const linha2 = linhaIdentificacao(p);

  if (modo === 'sheet') {
    return (
      <Drawer title={nome} onClose={onFechar} footer={nova}>
        <div className="-mt-2">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-xs text-ink-3 tabular-nums">{linha2}</p>
            {fichaHref && <Link to={fichaHref} className="shrink-0 text-xs font-bold text-blue underline underline-offset-2">Abrir ficha</Link>}
          </div>
          {abas}
          {corpo}
        </div>
      </Drawer>
    );
  }

  const conteudo = (
    <>
      <div className="px-5 pt-4 pb-0 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-h2 font-extrabold text-navy break-words">{nome}</h2>
            <p className="text-xs text-ink-3 tabular-nums mt-0.5">{linha2}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0 -mr-2">
            {fichaHref && (
              <Link to={fichaHref} aria-label="Abrir ficha do inspecionado" title="Abrir ficha do inspecionado"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-ink hover:bg-thead hover:text-navy transition-colors">
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">open_in_full</span>
              </Link>
            )}
            <IconButton icon="close" label="Fechar" variant="ghost" onClick={onFechar} />
          </div>
        </div>
        <div className="mt-3">{abas}</div>
      </div>
      <div className="px-5 pb-5 overflow-y-auto flex-1 min-h-0">{corpo}</div>
      {nova && <div className="px-5 py-3 border-t border-line shrink-0">{nova}</div>}
    </>
  );
  const rotulo = `${atestado ? 'Atestado' : 'Perícia menor'} de ${nome}`;

  if (modo === 'flutuante') {
    return (
      <section aria-label={rotulo}
        className="fixed right-0 top-0 h-full w-full max-w-[576px] z-drawer bg-white border-l border-line shadow-lg flex flex-col animate-drawer-in">
        {conteudo}
      </section>
    );
  }
  return (
    <section aria-label={rotulo} className="bg-white border border-line rounded-xl flex flex-col overflow-hidden sticky top-4 max-h-[calc(100dvh-7rem)]">
      {conteudo}
    </section>
  );
};
