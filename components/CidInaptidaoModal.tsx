// Ficheiro: components/CidInaptidaoModal.tsx
// Modal exibido ao marcar um candidato como Inapto (e ao clicar nas Observações
// de um Inapto ainda editável): o usuário busca o CID que justificou a
// inaptidão (autocomplete em public/cid.json) e, ao clicar numa opção, o
// DESCRABREV escolhido é entregue a quem abriu o modal (vira as Observações).
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface CidItem {
  SUBCAT: string;
  DESCRICAO: string;
  DESCRABREV: string;
}

interface CidIndexado extends CidItem {
  subcatNorm: string;
  descNorm: string;
}

const MAX_RESULTADOS = 50;

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface TabelaCid {
  lista: CidIndexado[];
  /** true quando o cid.json está truncado e só as entradas íntegras foram aproveitadas. */
  incompleta: boolean;
}

const indexar = (lista: CidItem[]): CidIndexado[] =>
  lista.map(c => ({ ...c, subcatNorm: normalizar(c.SUBCAT), descNorm: normalizar(c.DESCRICAO) }));

// Se o arquivo vier cortado no meio (upload/transferência truncados), descarta
// a última entrada incompleta e fecha o array, em vez de perder a tabela toda.
const parseCidJson = (texto: string): TabelaCid => {
  try {
    return { lista: indexar(JSON.parse(texto) as CidItem[]), incompleta: false };
  } catch {
    const fim = texto.lastIndexOf('},');
    if (fim === -1) throw new Error('Não foi possível ler a tabela de CID.');
    const lista = JSON.parse(`${texto.slice(0, fim + 1)}]`) as CidItem[];
    return { lista: indexar(lista), incompleta: true };
  }
};

// Cache de módulo: o cid.json (~2 MB) só é baixado/indexado uma vez.
let cidPromise: Promise<TabelaCid> | null = null;
const carregarCids = (): Promise<TabelaCid> => {
  if (!cidPromise) {
    cidPromise = fetch(`${import.meta.env.BASE_URL}cid.json`)
      .then(res => {
        if (!res.ok) throw new Error('Não foi possível carregar a tabela de CID.');
        return res.text();
      })
      .then(parseCidJson)
      .catch(e => {
        cidPromise = null;
        throw e;
      });
  }
  return cidPromise;
};

interface CidPickerProps {
  candidatoNome: string;
  /** Chamado ao clicar numa opção da lista, com o DESCRABREV do CID escolhido. */
  onSelect: (descrAbrev: string) => void;
  /** Usado só se a tabela de CID não puder ser carregada (botão "Fechar"). */
  onClose: () => void;
}

/** Texto + busca + lista de CIDs, sem moldura: usado no modal (desktop) e dentro do bottom sheet (mobile). */
export const CidPicker: React.FC<CidPickerProps> = ({ candidatoNome, onSelect, onClose }) => {
  const [tabela, setTabela] = useState<TabelaCid | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregarCids().then(setTabela).catch(e => setErro(e?.message || 'Erro ao carregar a tabela de CID.'));
  }, []);

  const cids = tabela?.lista ?? null;

  useEffect(() => { inputRef.current?.focus(); }, [cids]);

  const resultados = useMemo(() => {
    const q = normalizar(busca).trim();
    if (!cids || q.length < 2) return [];
    const qCodigo = q.replace(/[.\s]/g, '');
    const porCodigo: CidIndexado[] = [];
    const porDescricao: CidIndexado[] = [];
    for (const c of cids) {
      if (c.subcatNorm.startsWith(qCodigo)) porCodigo.push(c);
      else if (c.descNorm.includes(q) || c.subcatNorm.includes(qCodigo)) porDescricao.push(c);
      if (porCodigo.length >= MAX_RESULTADOS) break;
    }
    return [...porCodigo, ...porDescricao].slice(0, MAX_RESULTADOS);
  }, [busca, cids]);

  const mostrarLista = busca.trim().length >= 2;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700 leading-relaxed">
        Informe o CID da inaptidão do candidato (a) <strong>{candidatoNome}</strong>
      </p>

      {erro ? (
        <p className="text-sm text-red-700 font-semibold">{erro}</p>
      ) : (
        <>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3 pointer-events-none">search</span>
            <input
              ref={inputRef}
              type="text"
              value={busca}
              disabled={!cids}
              onChange={e => setBusca(e.target.value)}
              placeholder={cids ? 'Digite o código ou a descrição do CID...' : 'Carregando tabela de CID...'}
              className="w-full pl-10 pr-3 py-3 text-sm font-semibold rounded-xl border border-gray-300 focus:outline-none focus:border-navy disabled:bg-gray-50"
            />
          </div>

          {tabela?.incompleta && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              A tabela de CID está incompleta (arquivo truncado): alguns códigos, como os do capítulo Z, podem não aparecer na busca.
            </p>
          )}

          {mostrarLista && (
            <ul className="max-h-[40vh] overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white">
              {resultados.length === 0 ? (
                <li className="px-4 py-3 text-xs text-gray-500">Nenhum CID encontrado.</li>
              ) : resultados.map(c => (
                <li key={c.SUBCAT}>
                  <button type="button" onClick={() => onSelect(c.DESCRABREV)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none">
                    <span className="block text-sm font-bold text-navy">{c.SUBCAT}</span>
                    <span className="block text-xs text-gray-500 leading-snug">{c.DESCRICAO}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {erro && (
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Fechar</button>
        </div>
      )}
    </div>
  );
};

interface CidInaptidaoModalProps {
  candidatoNome: string;
  onSelect: (descrAbrev: string) => void;
  /** Quando true (primeira marcação como Inapto), o modal não tem como ser dispensado. */
  obrigatorio: boolean;
  onClose: () => void;
}

export const CidInaptidaoModal: React.FC<CidInaptidaoModalProps> = ({ candidatoNome, onSelect, obrigatorio, onClose }) => (
  <div
    className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-[8vh] animate-fade-in"
    onClick={obrigatorio ? undefined : onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg max-h-[84vh] flex flex-col overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-4 bg-navy text-white flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-[20px] text-gold">medical_information</span>
          <h3 className="font-heading font-bold text-sm">CID da inaptidão</h3>
        </div>
        {!obrigatorio && (
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>
      <div className="p-5 overflow-y-auto">
        <CidPicker candidatoNome={candidatoNome} onSelect={onSelect} onClose={onClose} />
      </div>
    </div>
  </div>
);
