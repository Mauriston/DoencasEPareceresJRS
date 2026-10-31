// Ficheiro: components/periciaMenor/ServicoMilitarForm.tsx
// "Cadastrar Serviço": edição do cadastro do militar com um único campo, o Serviço do HNRe
// (servico_label), aberta a partir do formulário de Nova Perícia Menor.
import React, { useEffect, useMemo, useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Autocomplete, type OpcaoAutocomplete } from '@/components/ui/Autocomplete';
import { carregarServicosHnre, normalizarBusca, type ServicoHnre } from '@/utils/corposQuadros';
import { atualizarMilitar, type MilitarRecord } from '@/services/firestoreMilitares';

interface Props {
  militar: MilitarRecord;
  onClose: () => void;
  onSalvo: () => void;
}

export const ServicoMilitarForm: React.FC<Props> = ({ militar, onClose, onSalvo }) => {
  const [servicos, setServicos] = useState<ServicoHnre[]>([]);
  const [texto, setTexto] = useState('');
  const [escolhido, setEscolhido] = useState<ServicoHnre | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregarServicosHnre().then(setServicos).catch(() => setErro('Não foi possível carregar os serviços do HNRe.')); }, []);
  const opcoes: OpcaoAutocomplete[] = useMemo(() => servicos.map(s => ({
    chave: s.servico_id, principal: s.servico, secundaria: s.servico_id, busca: normalizarBusca(`${s.servico_id} ${s.servico}`),
  })), [servicos]);

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!escolhido) { setErro('Escolha o serviço na lista.'); return; }
    setSalvando(true);
    try {
      await atualizarMilitar(militar.id, { servico_label: escolhido.servico_label });
      onSalvo();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar o serviço.');
      setSalvando(false);
    }
  };

  return (
    <Drawer
      title="Cadastrar serviço"
      icon="apartment"
      onClose={() => { if (!salvando) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button type="submit" form="form-servico-militar" icon="check" loading={salvando}>Salvar</Button>
        </>
      )}
    >
      <form id="form-servico-militar" onSubmit={salvar} noValidate className="space-y-4">
        <p className="text-sm text-ink-2">Serviço (setor) do HNRe em que <strong className="text-navy">{militar.inspecionado}</strong> serve.</p>
        <Autocomplete
          label="Serviço do HNRe" required error={erro} placeholder="Digite o nome ou o código do serviço"
          valor={texto} opcoes={opcoes}
          onDigitar={t => { setTexto(t); setEscolhido(null); setErro(''); }}
          onSelecionar={o => { const s = servicos.find(x => x.servico_id === o.chave); if (s) { setEscolhido(s); setTexto(s.servico_label); setErro(''); } }}
        />
      </form>
    </Drawer>
  );
};
