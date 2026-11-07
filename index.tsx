import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Raiz } from './components/Raiz';
import { ErroFatal } from './components/ErroFatal';
import { consumirTokenDaUrl } from './services/handoff';
import './styles/app.css';

// Depois de uma nova publicação, uma aba aberta com a versão anterior não encontra mais os arquivos
// (com hash no nome) dos módulos carregados sob demanda ("Failed to fetch dynamically imported module").
// Recarrega uma vez para pegar a versão nova; a trava evita laço de recarregamentos.
const CHAVE_RECARGA = 'app:recarga-por-versao';
window.addEventListener('vite:preloadError', evento => {
  evento.preventDefault();
  try {
    if (sessionStorage.getItem(CHAVE_RECARGA)) return;
    sessionStorage.setItem(CHAVE_RECARGA, '1');
  } catch { /* sem sessionStorage: recarrega mesmo assim */ }
  window.location.reload();
});
window.addEventListener('load', () => {
  window.setTimeout(() => { try { sessionStorage.removeItem(CHAVE_RECARGA); } catch { /* ignora */ } }, 10000);
});

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
    <ErroFatal>
      <HashRouter>
        <Raiz handoffToken={handoffToken} />
      </HashRouter>
    </ErroFatal>
  </React.StrictMode>
);
