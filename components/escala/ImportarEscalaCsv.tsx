// Ficheiro: components/escala/ImportarEscalaCsv.tsx
// "Enviar escala" (só Admin): lê o CSV da escala do SPA — o modelo (DATA;SERVICO;MEDICOS;RETEM) ou o CSV
// exportado da aba "Agenda" da planilha —, mostra a prévia (meses, dias, linhas com erro) e grava no
// Firestore (coleção "escalaSpa", um documento por dia, mesclando com o que já existe).
import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { gravarEscala } from '../../services/firestoreEscala';
import { lerCsvEscala, MODELO_CSV_ESCALA, COLUNAS_CSV_ESCALA, nomeExibicao, type ResultadoCsvEscala } from '../../utils/escalaSpa';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotuloMes = (am: string) => { const [a, m] = am.split('-'); return `${MESES[Number(m) - 1]}/${a}`; };

export const baixarModeloEscala = () => {
  const url = URL.createObjectURL(new Blob(['﻿' + MODELO_CSV_ESCALA], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'modelo_escala_spa.csv'; a.click();
  URL.revokeObjectURL(url);
};

interface Props {
  onClose: () => void;
  onImportado: (dias: number, meses: string[]) => void;
}

export const ImportarEscalaCsv: React.FC<Props> = ({ onClose, onImportado }) => {
  const [arquivo, setArquivo] = useState('');
  const [resultado, setResultado] = useState<ResultadoCsvEscala | null>(null);
  const [erro, setErro] = useState('');
  const [gravando, setGravando] = useState(false);

  const ler = async (f: File | null) => {
    setErro(''); setResultado(null); setArquivo(f?.name ?? '');
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      // CSV salvo pelo Excel em PT-BR costuma vir em Windows-1252; o do Google Sheets, em UTF-8.
      let t = new TextDecoder('utf-8').decode(buf);
      if (t.includes('�')) t = new TextDecoder('windows-1252').decode(buf);
      const r = lerCsvEscala(t);
      if (r.dias.length === 0) throw new Error('Nenhuma linha válida no arquivo.');
      setResultado(r);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível ler o CSV.');
    }
  };

  const gravar = async () => {
    if (!resultado) return;
    setGravando(true); setErro('');
    try {
      onImportado(await gravarEscala(resultado.dias), resultado.meses);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível gravar a escala.');
      setGravando(false);
    }
  };

  const contar = (f: (d: ResultadoCsvEscala['dias'][number]) => boolean) => resultado?.dias.filter(f).length ?? 0;

  return (
    <Dialog
      title="Enviar escala (CSV)" icon="upload_file" size="lg" travado={gravando} onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={gravando}>Cancelar</Button>
          <Button icon="save" onClick={gravar} loading={gravando} disabled={!resultado}>Gravar {resultado ? `${resultado.dias.length} dia${resultado.dias.length !== 1 ? 's' : ''}` : ''}</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="text-ink-3 space-y-1">
          <p>
            Uma linha por serviço, com as colunas {COLUNAS_CSV_ESCALA.map((c, i) => <React.Fragment key={c}>{i > 0 && ', '}<code className="font-mono text-navy">{c}</code></React.Fragment>)}.
            <strong className="text-ink"> SERVICO</strong>: Supervisão, DIA ou NOITE; nos plantões, os dois médicos separados por vírgula.
          </p>
          <p>Também aceita o CSV exportado da aba <strong className="text-ink">Agenda</strong> da planilha (colunas Início, SVC, Medico e Retens). Dias já registrados são atualizados; o restante é mantido.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-bold bg-navy text-white border border-navy hover:bg-navy-hover cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">upload_file</span>
            {arquivo ? 'Trocar arquivo' : 'Selecionar CSV'}
            <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" disabled={gravando} onChange={e => { void ler(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </label>
          <Button variant="ghost" icon="download" onClick={baixarModeloEscala}>Baixar modelo</Button>
          {arquivo && <span className="text-xs text-ink-3 break-all">{arquivo}</span>}
        </div>
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
        {resultado && (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {[
                ['Meses', resultado.meses.map(rotuloMes).join(', ')],
                ['Dias', String(resultado.dias.length)],
                ['Com supervisão', String(contar(d => !!d.supervisor))],
                ['Com plantões', String(contar(d => !!(d.dia?.length || d.noite?.length)))],
              ].map(([r, v]) => (
                <div key={r} className="rounded-lg bg-thead p-2"><dt className="text-xs text-ink-3">{r}</dt><dd className="text-sm font-bold text-navy break-words">{v}</dd></div>
              ))}
            </dl>
            {resultado.erros.length > 0 && (
              <div className="rounded-lg border border-wine/30 bg-wine/5 p-3">
                <p className="text-xs font-bold text-wine mb-1">{resultado.erros.length} linha{resultado.erros.length !== 1 ? 's' : ''} ignorada{resultado.erros.length !== 1 ? 's' : ''}:</p>
                <ul className="text-xs text-ink-2 space-y-0.5 max-h-32 overflow-y-auto">
                  {resultado.erros.slice(0, 50).map(e => <li key={e.linha}>Linha {e.linha}: {e.motivo}</li>)}
                </ul>
              </div>
            )}
            <div className="border border-line rounded-lg overflow-auto max-h-[35vh]">
              <table className="w-full text-xs">
                <thead className="bg-thead text-ink-3 sticky top-0">
                  <tr>{['Data', 'Supervisão', 'Retém', 'Dia', 'Noite'].map(h => <th key={h} scope="col" className="px-2 py-1.5 text-left font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {resultado.dias.slice(0, 62).map(d => (
                    <tr key={d.data}>
                      <td className="px-2 py-1 whitespace-nowrap">{d.data.split('-').reverse().join('/')}</td>
                      <td className="px-2 py-1 font-semibold text-navy">{nomeExibicao(d.supervisor) || '—'}</td>
                      <td className="px-2 py-1">{nomeExibicao(d.retemSupervisao) || '—'}</td>
                      <td className="px-2 py-1">{(d.dia ?? []).map(nomeExibicao).join(' - ') || '—'}</td>
                      <td className="px-2 py-1">{(d.noite ?? []).map(nomeExibicao).join(' - ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
