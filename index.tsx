import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { consumirTokenDaUrl } from './services/handoff';
import './styles/app.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// O login por QR code chega como "#h=<token>". Como a URL do app usa o hash
// para as rotas (HashRouter), o token precisa ser lido e removido da barra de
// endereço ANTES de o roteador ler o hash.
const handoffToken = consumirTokenDaUrl();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <App handoffToken={handoffToken} />
    </HashRouter>
  </React.StrictMode>
);
