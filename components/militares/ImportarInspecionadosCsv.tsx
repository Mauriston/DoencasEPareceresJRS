// Ficheiro: components/militares/ImportarInspecionadosCsv.tsx
// "Importar CSV" da página Inspecionados (exclusivo do Admin): cadastra novos militares em lote a partir
// de um CSV com as colunas do cadastro (utils/importarInspecionados.ts): dados básicos, Serviço do HNRe e
// "Informações adicionais" dos oficiais médicos do HNRe. Mostra uma prévia
// (novos, a completar, já cadastrados, repetidos no arquivo e com erro) antes de gravar. Grava os novos e, nos já
// cadastrados, só preenche os campos que estão vazios no banco (nada é sobrescrito); os demais são ignorados.
import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { StatusTag, type StatusTone } from '../ui/StatusTag';
import { criarMilitaresEmLote, atualizarMilitaresEmLote, type MilitarDoc, type MilitarRecord } from '../../services/firestoreMilitares';
import { carregarCorposQuadros, carregarOms, carregarServicosHnre, type CorposQuadros, type ServicoHnre } from '../../utils/corposQuadros';
import {
  interpretarCsvInspecionados, MODELO_CSV_INSPECIONADOS, COLUNAS_OBRIGATORIAS_CSV,
  type ResultadoImportacao, type SituacaoLinha,
} from '../../utils/importarInspecionados';

interface Props {
  existentes: MilitarRecord[];
  onClose: () => void;
  /** Quantos foram cadastrados e quantos tiveram dados completados. */
  onImportado: (novos: number, atualizados: number) => void;
}

const ROTULO: Record<SituacaoLinha, { texto: string; tone: StatusTone }> = {
  novo: { texto: 'Novo', tone: 'success' },
  atualizar: { texto: 'Completar dados', tone: 'navyOutline' },
  existente: { texto: 'Já cadastrado', tone: 'muted' },
  duplicado: { texto: 'Repetido no arquivo', tone: 'attention' },
  erro: { texto: 'Erro', tone: 'danger' },
};
const ORDEM: SituacaoLinha[] = ['erro', 'duplicado', 'novo', 'atualizar', 'existente'];
const ROTULO_CAMPO: Partial<Record<keyof MilitarDoc, string>> = {
  dataNascimento: 'data de nascimento', email: 'e-mail', celular: 'celular', servico_label: 'serviço do HNRe',
  nomeGuerra: 'nome de guerra', especialidade: 'especialidade', rqe: 'RQE', crm: 'CRM', emailPessoal: 'e-mail pessoal',
  cpf: 'CPF', identidadeMilitar: 'identidade militar',
};
const MAX_PREVIA = 300;

export const ImportarInspecionadosCsv: React.FC<Props> = ({ existentes, onClose, onImportado }) => {
  const [postos, setPostos] = useState<CorposQuadros['postos']>();
  const [oms, setOms] = useState<Set<string>>();
  const [servicos, setServicos] = useState<ServicoHnre[]>();
  const [texto, setTexto] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState('');
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [filtro, setFiltro] = useState<SituacaoLinha | 'todos'>('todos');

  useEffect(() => { carregarCorposQuadros().then(d => setPostos(d.postos)).catch(() => { /* sem validação de posto */ }); }, []);
  useEffect(() => { carregarServicosHnre().then(setServicos).catch(() => { /* grava o serviço como veio */ }); }, []);
  useEffect(() => { carregarOms().then(l => setOms(new Set(l.map(o => o.sigla)))).catch(() => { /* sem validação de OM */ }); }, []);

  const ids = useMemo(() => new Map<string, MilitarRecord>(existentes.map(m => [m.id, m])), [existentes]);

  // Reinterpreta quando chegam as listas de referência ou a base muda (NIPs "já cadastrados").
  const { resultado, erroLeitura } = useMemo<{ resultado: ResultadoImportacao | null; erroLeitura: string }>(() => {
    if (texto === null) return { resultado: null, erroLeitura: '' };
    try {
      return { resultado: interpretarCsvInspecionados(texto, { existentes: ids, postos, omsConhecidas: oms, servicosHnre: servicos }), erroLeitura: '' };
    } catch (e: any) {
      return { resultado: null, erroLeitura: e?.message || 'Não foi possível ler o CSV.' };
    }
  }, [texto, ids, postos, oms, servicos]);

  const lerArquivo = async (f: File | null) => {
    setErro(''); setTexto(null); setFiltro('todos'); setArquivo(f?.name ?? '');
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      // CSV salvo pelo Excel em PT-BR costuma vir em Windows-1252; tenta UTF-8 e recai no 1252.
      let t = new TextDecoder('utf-8').decode(buf);
      if (t.includes('�')) t = new TextDecoder('windows-1252').decode(buf);
      setTexto(t);
    } catch {
      setErro('Não foi possível abrir o arquivo.');
    }
  };

  const baixarModelo = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + MODELO_CSV_INSPECIONADOS], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'modelo_inspecionados.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const importar = async () => {
    if (!resultado || totalGravar === 0) return;
    setGravando(true); setErro(''); setProgresso(0);
    try {
      const n = resultado.novos.length ? await criarMilitaresEmLote(resultado.novos, setProgresso) : 0;
      if (resultado.atualizacoes.length) {
        await atualizarMilitaresEmLote(resultado.atualizacoes);
        setProgresso(n + resultado.atualizacoes.length);
      }
      onImportado(n, resultado.atualizacoes.length);
    } catch (e: any) {
      setErro(e?.message || 'Falha ao gravar. Parte do lote pode ter sido gravada — reabra a importação para conferir.');
    } finally {
      setGravando(false);
    }
  };

  const linhas = useMemo(() => {
    if (!resultado) return [];
    const base = filtro === 'todos' ? resultado.linhas : resultado.linhas.filter(l => l.situacao === filtro);
    return [...base].sort((a, b) => ORDEM.indexOf(a.situacao) - ORDEM.indexOf(b.situacao) || a.linha - b.linha);
  }, [resultado, filtro]);
  const totalNovos = resultado?.novos.length ?? 0;
  const totalAtualizar = resultado?.atualizacoes.length ?? 0;
  const totalGravar = totalNovos + totalAtualizar;
  const rotuloGravar = [
    totalNovos && `${totalNovos} novo${totalNovos !== 1 ? 's' : ''}`,
    totalAtualizar && `completar ${totalAtualizar}`,
  ].filter(Boolean).join(' e ') || 'nada';

  return (
    <Dialog
      title="Importar inspecionados (CSV)"
      icon="upload_file"
      size="xl"
      travado={gravando}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={gravando}>Cancelar</Button>
          <Button icon="group_add" onClick={importar} loading={gravando} disabled={totalGravar === 0}>
            {gravando ? `Gravando ${progresso}/${totalGravar}…` : `Importar ${rotuloGravar}`}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="text-ink-3 space-y-1">
          <p>
            Cadastra militares em lote. Baixe o modelo: ele traz todas as colunas do cadastro (separador ponto e vírgula).
            Obrigatórias:{' '}
            {COLUNAS_OBRIGATORIAS_CSV.map((c, i) => <React.Fragment key={c}>{i > 0 && ', '}<code className="font-mono text-navy">{c}</code></React.Fragment>)}.
            {' '}<strong>vinculo</strong>: Carreira, Temporário ou Inativo; <strong>posto</strong>: P/G/Q como no cadastro (ex.: GR, CB-EF, CT (Md));
            {' '}<strong>nasc</strong> (data de nascimento): DD/MM/AAAA; <strong>situacao</strong>: RM1 ou Refº (só Inativo).
          </p>
          <p>
            <strong>servicoHnre</strong> só vale para a OM HNRe (ex.: <code className="font-mono text-navy">JRS (HNRe-02.2)</code>). As
            Informações adicionais (nome de guerra, especialidade, RQE, CRM, e-mail pessoal, CPF e identidade militar) só valem
            para oficial médico do HNRe; nos demais são ignoradas com aviso.
          </p>
          <p>
            Os novos entram como <strong>ativos</strong>. NIP já cadastrado: a linha é ignorada, salvo se trouxer dados que
            faltam no cadastro (ex.: data de nascimento, e-mail, celular) — aí só esses campos são preenchidos; nada do que já
            está gravado é alterado. Linhas com erro são ignoradas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-bold bg-navy text-white border border-navy hover:bg-navy-hover cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">upload_file</span>
            {arquivo ? 'Trocar arquivo' : 'Selecionar CSV'}
            <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" disabled={gravando} onChange={e => { void lerArquivo(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </label>
          <Button variant="ghost" icon="download" onClick={baixarModelo}>Baixar modelo</Button>
          {arquivo && <span className="text-xs text-ink-3 break-all">{arquivo}</span>}
        </div>

        {(erro || erroLeitura) && <p role="alert" className="text-sm font-semibold text-wine">{erro || erroLeitura}</p>}

        {resultado && (
          <>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar prévia">
              {(['todos', ...ORDEM] as const).map(s => {
                const n = s === 'todos' ? resultado.linhas.length : resultado.totais[s];
                const ativo = filtro === s;
                return (
                  <button key={s} type="button" aria-pressed={ativo} onClick={() => setFiltro(s)}
                    className={`min-h-[36px] px-3 rounded-full border text-xs font-bold transition-colors ${ativo ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-line hover:bg-thead'}`}>
                    {s === 'todos' ? 'Todas as linhas' : ROTULO[s].texto} ({n})
                  </button>
                );
              })}
            </div>

            <div className="border border-line rounded-lg overflow-x-auto max-h-[45vh]">
              <table className="w-full text-xs">
                <thead className="bg-thead text-ink-3 sticky top-0">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Linha</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Situação</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">NIP</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">P/G/Q</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Nome</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">OM</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {linhas.slice(0, MAX_PREVIA).map(l => (
                    <tr key={l.linha}>
                      <td className="px-3 py-1.5 text-ink-3">{l.linha}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap"><StatusTag tone={ROTULO[l.situacao].tone}>{ROTULO[l.situacao].texto}</StatusTag></td>
                      <td className="px-3 py-1.5 font-mono whitespace-nowrap">{l.nip}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">{l.pgq}</td>
                      <td className="px-3 py-1.5 font-semibold text-navy">{l.nome}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">{l.om}</td>
                      <td className="px-3 py-1.5">
                        {l.patch && <span className="block text-navy font-semibold">Preenche: {Object.keys(l.patch).map(c => ROTULO_CAMPO[c as keyof MilitarDoc] ?? c).join(', ')}.</span>}
                        {l.erros.map(e => <span key={e} className="block text-wine font-semibold">{e}</span>)}
                        {l.avisos.map(a => <span key={a} className="block text-ink-3">{a}</span>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {linhas.length === 0 && <p className="p-4 text-center text-ink-3">Nenhuma linha nesta categoria.</p>}
            </div>
            {linhas.length > MAX_PREVIA && <p className="text-xs text-ink-3">Prévia mostra as primeiras {MAX_PREVIA} de {linhas.length} linhas.</p>}
          </>
        )}
      </div>
    </Dialog>
  );
};
