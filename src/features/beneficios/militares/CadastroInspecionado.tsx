// Ficheiro: components/militares/CadastroInspecionado.tsx
// "Cadastrar novo" da base de inspecionados: barra lateral com duas abas no topo —
// Militares (formulário em cascata já existente) e Dep/Pens. (Dependente ou Pensionista).
// Usado pela página Inspecionados e por quem precisa cadastrar um inspecionado "na hora"
// (Novo parecer, Inspeções de Saúde).
import React, { useState } from 'react';
import { Segmented } from '@/components/ui/Segmented';
import { MilitarCadastroForm } from './MilitarCadastroForm';
import { DepPensCadastroForm } from './DepPensCadastroForm';

type Aba = 'militar' | 'deppens';

interface Props {
  onClose: () => void;
  onCriado: (nome: string, id: string) => void;
}

export const CadastroInspecionado: React.FC<Props> = ({ onClose, onCriado }) => {
  const [aba, setAba] = useState<Aba>('militar');
  const abas = (
    <Segmented<Aba>
      ariaLabel="Tipo de cadastro" fullWidth value={aba} onChange={setAba}
      options={[{ value: 'militar', label: 'Militares', icon: 'military_tech' }, { value: 'deppens', label: 'Dep/Pens.', icon: 'family_restroom' }]}
    />
  );
  return aba === 'militar'
    ? <MilitarCadastroForm tabs={abas} onClose={onClose} onCriado={onCriado} />
    : <DepPensCadastroForm tabs={abas} onClose={onClose} onCriado={onCriado} />;
};
