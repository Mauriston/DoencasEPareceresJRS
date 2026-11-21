// Ficheiro: components/inspecoes/conclusao/LaudoAssistidoIS.tsx
// Assistência ao campo Laudo da Conclusão da IS (formas de conclusão da DGPM-406 — data/formasConclusaoIS.json):
//  - Validação (sempre): o texto digitado, colado do SINAIS (Ctrl+V) ou lido dos prints é conferido pelas regras
//    de utils/validacaoLaudo.ts com o contexto da IS (utils/contextoLaudo.ts: cadastro + histórico de IS do
//    inspecionado). Os achados (erro/alerta + fonte) aparecem abaixo do campo; nada é reescrito.
//  - Montador (só com a conclusão editável): tipo de conclusão → laudo cabível → campos → pré-visualização →
//    "Usar este laudo" (preenche o campo pelas mesmas regras do autosave).
//  - "Conferir com IA" (opcional): segunda opinião (services/laudoIA.ts); apontamentos, nunca reescrita.
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { observarMilitar, type MilitarRecord } from '../../../services/firestoreMilitares';
import { observarInspecoesDoInspecionado, type InspecaoRecord } from '../../../services/firestoreInspecoes';
import { revisarLaudoComIA, type ApontamentoIA } from '../../../services/laudoIA';
import { derivarContexto, type ContextoLaudo } from '../../../utils/contextoLaudo';
import {
  camposPendentes, carregarFormasConclusao, montarLaudo, partesDoModelo, validarLaudo,
  type AchadoLaudo, type CampoLaudo, type FormasConclusao, type ParteModelo, type ValoresLaudo,
} from '../../../utils/validacaoLaudo';

interface Props {
  isNumero: number;
  inspecionadoId: string;
  finalidade: string;
  dataAbertura?: string;
  dataEntrevista?: string;
  laudo: string;
  restricoes?: string;
  cid?: string;
  /** Com a conclusão editável: mostra o montador e grava o laudo escolhido. */
  onUsarLaudo?: (texto: string) => void;
}

const ROTULO_CATEGORIA: Record<string, string> = {
  apto: 'Apto', apto_restricoes: 'Apto com restrições', inapto: 'Inapto', incapaz_temporario: 'Incapaz temporário',
  incapaz_definitivo: 'Incapaz definitivo', beneficio: 'Benefício (positivo)', beneficio_negativo: 'Benefício (negativo)',
  dependente: 'Dependente', sufixo: 'Complemento', outro: 'Outro',
};

const Achado: React.FC<{ a: { severidade: 'erro' | 'alerta'; mensagem: string; fonte?: string } }> = ({ a }) => (
  <li className={`flex gap-2 text-xs rounded px-2 py-1.5 ${a.severidade === 'erro' ? 'bg-wine/10 text-wine' : 'bg-gold/20 text-ink'}`}>
    <span className="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">{a.severidade === 'erro' ? 'error' : 'warning'}</span>
    <span>{a.mensagem}{a.fonte ? <span className="text-ink-3"> (DGPM-406, {a.fonte})</span> : null}</span>
  </li>
);

/** Hook: formas de conclusão + contexto da IS (cadastro e histórico observados). */
const useContextoLaudo = (inspecionadoId: string, isNumero: number, dataAbertura?: string, dataEntrevista?: string) => {
  const [formas, setFormas] = useState<FormasConclusao | null>(null);
  const [militar, setMilitar] = useState<MilitarRecord | null | undefined>(undefined);
  const [historico, setHistorico] = useState<InspecaoRecord[]>([]);
  useEffect(() => { carregarFormasConclusao().then(setFormas).catch(() => setFormas(null)); }, []);
  useEffect(() => (inspecionadoId ? observarMilitar(inspecionadoId, setMilitar, () => setMilitar(null)) : undefined), [inspecionadoId]);
  useEffect(() => (inspecionadoId ? observarInspecoesDoInspecionado(inspecionadoId, setHistorico, () => setHistorico([])) : undefined), [inspecionadoId]);
  const contexto = useMemo<ContextoLaudo | null>(() => (militar === undefined ? null
    : derivarContexto(militar, historico, { is: isNumero, dataAbertura, dataEntrevista })), [militar, historico, isNumero, dataAbertura, dataEntrevista]);
  return { formas, contexto };
};

export const LaudoAssistidoIS: React.FC<Props> = ({ isNumero, inspecionadoId, finalidade, dataAbertura, dataEntrevista, laudo, restricoes, cid, onUsarLaudo }) => {
  const { formas, contexto } = useContextoLaudo(inspecionadoId, isNumero, dataAbertura, dataEntrevista);
  const [montando, setMontando] = useState(false);
  const [ia, setIa] = useState<{ carregando: boolean; itens: ApontamentoIA[] | null; erro: string }>({ carregando: false, itens: null, erro: '' });
  useEffect(() => { setIa({ carregando: false, itens: null, erro: '' }); }, [laudo]);

  const resultado = useMemo(() => (formas && contexto ? validarLaudo(formas, { finalidade, laudo, restricoes, contexto }) : null), [formas, contexto, finalidade, laudo, restricoes]);
  if (!formas || !contexto || !resultado?.regra) return null;

  const conferirIA = async () => {
    setIa({ carregando: true, itens: null, erro: '' });
    try {
      const itens = await revisarLaudoComIA({ formas, regra: resultado.regra!, finalidade, laudo, restricoes: restricoes || '', cid, contexto, achados: resultado.achados });
      setIa({ carregando: false, itens, erro: '' });
    } catch (e: any) { setIa({ carregando: false, itens: null, erro: e?.message || 'Não foi possível conferir com a IA.' }); }
  };

  const temTexto = !!laudo.trim();
  const ok = temTexto && !resultado.achados.length;
  return (
    <div className="space-y-1.5" aria-live="polite">
      {temTexto && (ok
        ? <p className="flex items-center gap-1 text-xs text-ink-3"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">check_circle</span>
            Laudo conforme as formas de conclusão da DGPM-406{resultado.laudo ? ` (${formas.laudos[resultado.laudo.id]?.fonte})` : ''}.</p>
        : <ul className="space-y-1">{resultado.achados.map(a => <Achado key={a.id} a={a} />)}</ul>)}
      {temTexto && resultado.parecido && (
        <p className="text-xs text-ink-3">Modelo mais próximo: “{formas.laudos[resultado.parecido].modelo}”</p>
      )}
      {ia.itens && (ia.itens.length
        ? <ul className="space-y-1"><li className="text-xs font-semibold text-ink-3">Conferência pela IA (revise antes de aceitar):</li>{ia.itens.map((a, i) => <Achado key={i} a={a} />)}</ul>
        : <p className="text-xs text-ink-3">Conferência pela IA: nenhum apontamento adicional.</p>)}
      {ia.erro && <p className="text-xs text-wine">{ia.erro}</p>}
      <div className="flex flex-wrap gap-2">
        {onUsarLaudo && <Button type="button" size="sm" variant="secondary" icon="edit_note" onClick={() => setMontando(true)}>Montar laudo</Button>}
        {temTexto && <Button type="button" size="sm" variant="ghost" icon="smart_toy" loading={ia.carregando} onClick={conferirIA}>Conferir com IA</Button>}
      </div>
      {montando && onUsarLaudo && (
        <MontadorLaudo formas={formas} regra={resultado.regra} finalidade={finalidade} contexto={contexto}
          onClose={() => setMontando(false)} onUsar={t => { onUsarLaudo(t); setMontando(false); }} />
      )}
    </div>
  );
};

// ------------------------------------------------------------------ montador (etapa 3)

const CampoValor: React.FC<{ campo: CampoLaudo; valor: string; onChange: (v: string) => void }> = ({ campo, valor, onChange }) => {
  const cls = 'w-full rounded border border-line bg-white px-2 py-1.5 text-sm';
  const rotulo = campo.descricao ? `${campo.nome.replace(/_/g, ' ')} — ${campo.descricao}` : campo.nome.replace(/_/g, ' ');
  return (
    <label className="block text-xs text-ink-3">
      <span className="block mb-0.5">{rotulo}</span>
      {campo.tipo === 'enum' && campo.valores ? (
        <select className={cls} value={valor} onChange={e => onChange(e.target.value)}>
          <option value="">Selecione</option>
          {campo.valores.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      ) : campo.tipo === 'data' ? (
        <input className={cls} type="date" value={valor} onChange={e => onChange(e.target.value)} />
      ) : campo.tipo === 'inteiro' ? (
        <input className={cls} type="number" min={1} inputMode="numeric" value={valor} onChange={e => onChange(e.target.value)} />
      ) : (
        <input className={cls} type="text" value={valor} onChange={e => onChange(e.target.value)} />
      )}
    </label>
  );
};

const dataBr = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : iso);

const Opcoes: React.FC<{ partes: ParteModelo[]; valores: ValoresLaudo; set: (k: string, v: string) => void }> = ({ partes, valores, set }) => {
  const itens: React.ReactNode[] = [];
  const percorrer = (ps: ParteModelo[], contexto: string) => ps.forEach((p, i) => {
    const antes = ps.slice(Math.max(0, i - 1), i).map(x => (x.tipo === 'texto' ? x.texto : '')).join('').trim().split(' ').slice(-4).join(' ');
    if (p.tipo === 'nao') itens.push(
      <label key={`n${p.indice}`} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={valores[`nao_${p.indice}`] === '1'} onChange={e => set(`nao_${p.indice}`, e.target.checked ? '1' : '')} />
        Incluir “não” {contexto}{antes ? ` após “…${antes}”` : ''}</label>);
    if (p.tipo === 'opcional') {
      const texto = p.partes.map(x => (x.tipo === 'texto' ? x.texto : x.tipo === 'campo' ? `{{${x.nome}}}` : '')).join('').trim();
      itens.push(<label key={`o${p.indice}`} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={valores[`opcional_${p.indice}`] === '1'} onChange={e => set(`opcional_${p.indice}`, e.target.checked ? '1' : '')} />
        Incluir “{texto}”</label>);
      percorrer(p.partes, '(no trecho opcional)');
    }
  });
  percorrer(partes, '');
  return itens.length ? <div className="space-y-1">{itens}</div> : null;
};

const MontadorLaudo: React.FC<{
  formas: FormasConclusao; regra: string; finalidade: string; contexto: ContextoLaudo; onClose: () => void; onUsar: (t: string) => void;
}> = ({ formas, regra, finalidade, contexto, onClose, onUsar }) => {
  const permitidos = formas.regras[regra]?.laudosPermitidos || [];
  const categorias: string[] = Array.from(new Set(permitidos.map(id => formas.laudos[id]?.categoria || 'outro')));
  const [categoria, setCategoria] = useState(categorias[0] || '');
  const doTipo = permitidos.filter(id => (formas.laudos[id]?.categoria || 'outro') === categoria);
  const [laudoId, setLaudoId] = useState('');
  const id = doTipo.includes(laudoId) ? laudoId : doTipo[0] || '';
  const modelo = formas.laudos[id];
  const termino = /^t[ée]rmino/i.test(finalidade.trim());
  const sugereProrrogacao = !!modelo?.admiteEmProrrogacao && termino && contexto.ltsAnterior === true && contexto.apresentadoNoPrazo !== false;
  const [valores, setValores] = useState<ValoresLaudo>({});
  const [prorrogacao, setProrrogacao] = useState<boolean | null>(null);
  useEffect(() => { setValores({}); setProrrogacao(null); }, [id]);
  const emProrrogacao = prorrogacao ?? sugereProrrogacao;
  const set = (k: string, v: string) => setValores(o => ({ ...o, [k]: v }));
  const valoresTexto = useMemo<ValoresLaudo>(() => Object.fromEntries(Object.entries(valores).map(([k, v]: [string, string]) => {
    const campo = modelo?.campos?.find(c => c.nome === k);
    return [k, campo?.tipo === 'data' ? dataBr(v) : v];
  })), [valores, modelo]);
  const texto = modelo ? montarLaudo(modelo.modelo, valoresTexto, !!modelo.admiteEmProrrogacao && emProrrogacao) : '';
  const pendentes = camposPendentes(texto);
  const validacao = useMemo(() => (texto && !pendentes.length ? validarLaudo(formas, { finalidade, laudo: texto, contexto }) : null), [texto, pendentes.length, formas, finalidade, contexto]);
  const avisos: AchadoLaudo[] = (validacao?.achados || []).filter(a => a.id !== 'RESTRICOES_SEM_LISTA');

  return (
    <Dialog title="Montar laudo" icon="edit_note" size="lg" onClose={onClose}
      footer={<div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="button" icon="check" disabled={!texto || pendentes.length > 0} onClick={() => onUsar(texto)}>Usar este laudo</Button>
      </div>}>
      <div className="space-y-3">
        <p className="text-xs text-ink-3">Laudos cabíveis para <strong>{finalidade}</strong> ({formas.regras[regra]?.fonte}). O texto segue o modelo da DGPM-406.</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de conclusão">
          {categorias.map(c => (
            <button key={c} type="button" role="radio" aria-checked={c === categoria} onClick={() => setCategoria(c)}
              className={`rounded-full border px-3 py-1 text-xs ${c === categoria ? 'bg-navy text-white border-navy' : 'border-line text-ink'}`}>{ROTULO_CATEGORIA[c] || c}</button>
          ))}
        </div>
        <div className="space-y-1">
          {doTipo.map(lid => {
            const l = formas.laudos[lid];
            return (
              <label key={lid} className={`block rounded border px-2 py-1.5 text-xs cursor-pointer ${lid === id ? 'border-navy bg-thead' : 'border-line'}`}>
                <input type="radio" className="mr-2" checked={lid === id} onChange={() => setLaudoId(lid)} />
                {l.modelo} <span className="text-ink-3">({l.fonte})</span>
                {l.aplicarQuando && <span className="block text-ink-3 mt-0.5">Quando: {l.aplicarQuando}</span>}
              </label>
            );
          })}
        </div>
        {modelo && (
          <div className="space-y-2">
            {(modelo.campos || []).filter(c => c.tipo !== 'booleano' && c.tipo !== 'laudoRef').map(c => (
              <CampoValor key={c.nome} campo={c} valor={valores[c.nome] || ''} onChange={v => set(c.nome, v)} />
            ))}
            {(modelo.campos || []).filter(c => c.tipo === 'laudoRef').map(c => (
              <CampoValor key={c.nome} campo={{ ...c, tipo: 'texto', descricao: 'texto do laudo do Cap. 6 que complementa (ex.: “Apto para o SAM (com restrições) (por 30 dias)”)' }} valor={valores[c.nome] || ''} onChange={v => set(c.nome, v)} />
            ))}
            <Opcoes partes={partesDoModelo(modelo.modelo)} valores={valores} set={set} />
            {modelo.admiteEmProrrogacao && (
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={emProrrogacao} onChange={e => setProrrogacao(e.target.checked)} />
                Em prorrogação{sugereProrrogacao ? ' (sugerido: LTS anterior vigente no histórico)' : ''}</label>
            )}
            {modelo.textoComplementar && <p className="text-xs text-ink-3">Texto complementar ({modelo.textoComplementar.quando}): “{modelo.textoComplementar.texto}”</p>}
            {(modelo.observacoes || []).map((o, i) => <p key={i} className="text-xs text-ink-3">• {o}</p>)}
          </div>
        )}
        {texto && (
          <div>
            <p className="text-xs font-semibold text-ink-3 mb-1">Pré-visualização</p>
            <p className="rounded border border-line bg-surface-2 px-2 py-2 text-sm whitespace-pre-line">{texto}</p>
            {pendentes.length > 0 && <p className="text-xs text-wine mt-1">Preencha: {pendentes.map(p => p.replace(/_/g, ' ')).join(', ')}.</p>}
            {avisos.length > 0 && <ul className="space-y-1 mt-1">{avisos.map(a => <Achado key={a.id} a={a} />)}</ul>}
          </div>
        )}
      </div>
    </Dialog>
  );
};

