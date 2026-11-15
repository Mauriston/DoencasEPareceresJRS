// Ficheiro: components/inspecoes/conclusao/CampoCidIS.tsx
// Campo "CID" da Conclusão da IS (detalhe da IS, finalidades de Verificações e Términos — obrigatório para
// finalizar): autocomplete no public/cid.json, como o CID da Perícia Menor (components/ui/Autocomplete).
// Escolher uma opção grava na hora o DESCRABREV ("M54.5 Dor lombar baixa") em `cid` e o SUBCAT em `cidCodigo`;
// apagar o texto e sair do campo apaga o CID. A tabela (~2 MB) só é carregada quando o campo aparece.
import React, { useEffect, useMemo, useState } from 'react';
import { Autocomplete, type OpcaoAutocomplete } from '../../ui/Autocomplete';
import { carregarCid, normalizarBusca, type CidItem } from '../../../utils/corposQuadros';

interface Props {
  /** CID gravado (DESCRABREV). */
  valor: string;
  onEscolher: (cid: CidItem | null) => void;
  erro?: string;
  disabled?: boolean;
}

export const CampoCidIS: React.FC<Props> = ({ valor, onEscolher, erro, disabled }) => {
  const [cids, setCids] = useState<CidItem[]>([]);
  const [erroTabela, setErroTabela] = useState('');
  const [texto, setTexto] = useState(valor);
  useEffect(() => { setTexto(valor); }, [valor]);
  useEffect(() => {
    let vivo = true;
    carregarCid().then(l => { if (vivo) setCids(l); }).catch(() => { if (vivo) setErroTabela('Não foi possível carregar a tabela de CID.'); });
    return () => { vivo = false; };
  }, []);

  const opcoes: OpcaoAutocomplete[] = useMemo(() => cids.map(c => ({
    chave: c.SUBCAT, principal: c.DESCRABREV, secundaria: c.DESCRICAO, busca: normalizarBusca(`${c.SUBCAT} ${c.DESCRABREV} ${c.DESCRICAO}`),
  })), [cids]);

  return (
    <div
      onBlur={e => {
        // Saiu do campo com o texto apagado: apaga o CID; com texto que não é uma opção: volta ao gravado.
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        if (!texto.trim() && valor) onEscolher(null);
        else if (texto !== valor) setTexto(valor);
      }}
    >
      <Autocomplete
        label="CID" required disabled={disabled} error={erro || erroTabela}
        placeholder={cids.length ? 'Digite o código ou a descrição do CID' : 'Carregando a tabela de CID…'}
        valor={texto} opcoes={opcoes}
        onDigitar={setTexto}
        onSelecionar={o => { const c = cids.find(x => x.SUBCAT === o.chave); if (c) { setTexto(c.DESCRABREV); onEscolher(c); } }}
      />
    </div>
  );
};
