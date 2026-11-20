import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/app.css';
import { ScannerDocumento } from './components/scanner/ScannerDocumento';
const dims = (src: string) => new Promise<string>(r => { const i = new Image(); i.onload = () => r(`${i.naturalWidth}x${i.naturalHeight}`); i.src = src; });
const App = () => {
  const [res, setRes] = useState<string | null>(null);
  return res ? <div id="ok">{res}</div> : <ScannerDocumento filtro={false} onCancelar={() => setRes('cancel')} onConcluir={async ps => setRes((await Promise.all(ps.map(dims))).join(' | '))} />;
};
ReactDOM.createRoot(document.getElementById('r')!).render(<App />);
