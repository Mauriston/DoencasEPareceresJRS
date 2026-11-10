import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/app.css';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { AcoesRodape } from '../ui/AcoesRodape';

const n = new URLSearchParams(location.search).get('n') === '1' ? 1 : 3;
const acoes = [
  { id: 'a', rotulo: 'Gerar Termo de Recurso', icone: 'gavel', onClick: () => alert('a') },
  { id: 'b', rotulo: 'Registro de Eventos', icone: 'history', variante: 'secondary' as const, onClick: () => {} },
  { id: 'c', rotulo: 'Limpar', icone: 'ink_eraser', variante: 'destructive' as const, onClick: () => {} },
].slice(0, n);

const App = () => (
  <Drawer title="Detalhes da IS" icon="assignment_ind" onClose={() => {}} tituloExtra={<span className="text-xs font-bold bg-green-50 text-green-800 rounded-full px-2 py-0.5">APTO</span>}
    footer={<><Button variant="secondary" className="max-md:hidden">Cancelar</Button><AcoesRodape acoes={acoes} /></>}>
    {Array.from({ length: 30 }, (_, i) => <p key={i} className="py-2 border-b border-line">Linha de conteúdo {i + 1}</p>)}
  </Drawer>
);
createRoot(document.getElementById('root')!).render(<App />);
