// Ficheiro: components/ficha/CadastroDrawer.tsx
// Drawer lateral (à direita no desktop; bottom sheet no celular — ui/Drawer) da Ficha do inspecionado: abre ao tocar no
// nome do inspecionado e mostra os dados cadastrais (o que antes era o card "Cadastro" da coluna de apoio e, depois, um top sheet).
import React from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';

export interface DadoCadastro { rotulo: string; valor?: string | null }

interface Props {
  titulo: string;
  /** Linha de identificação (posto · NIP · OM). */
  subtitulo?: React.ReactNode;
  dados: DadoCadastro[];
  /** Sem cadastro completo (perfil sem acesso a Inspecionados ou sem documento em "militares"). */
  aviso?: string;
  onEditar?: () => void;
  onClose: () => void;
}

export const CadastroDrawer: React.FC<Props> = ({ titulo, subtitulo, dados, aviso, onEditar, onClose }) => {
  const visiveis = dados.filter(d => d.valor);
  return (
    <Drawer
      title={titulo} icon="badge" onClose={onClose}
      acoesTopo={onEditar && <Button variant="ghost" size="sm" icon="edit" onClick={onEditar}>Editar</Button>}
    >
      {subtitulo && <div className="text-sm text-ink-3 -mt-1 mb-4">{subtitulo}</div>}
      {aviso && <p className="text-sm text-ink-3 mb-3">{aviso}</p>}
      {visiveis.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {visiveis.map(d => (
            <div key={d.rotulo} className="min-w-0">
              <dt className="text-xs font-semibold text-ink-3">{d.rotulo}</dt>
              <dd className="text-sm text-ink break-words">{d.valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </Drawer>
  );
};
