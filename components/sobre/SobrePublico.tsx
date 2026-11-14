// Ficheiro: components/sobre/SobrePublico.tsx
// Versão pública (sem login) da página "Sobre o app" — #/publico/sobre (auditoria v3, 6e). Carregada sob
// demanda (React.lazy em components/publico/AppPublico.tsx): não inicia o Firebase (nem Auth, nem Firestore)
// e não baixa o app. Sem nenhum caminho para dentro do app: o ShellPublico vai na variante "informativo"
// (sem "Acessar o app"), o cabeçalho só navega dentro da página (Funções · Segurança · Acesso), não há
// "Abrir…" nem "Entrar". Conteúdo para quem está de fora: todas as áreas, sem filtro de perfil, com o
// `textoPublico` de config/sobre.ts. Fora dos buscadores (robots noindex,nofollow, aplicado enquanto a
// página está aberta); título e descrição próprios.
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShellPublico } from '../publico/ShellPublico';
import { Container } from '../ui/Page';
import { AREAS_SOBRE } from '../../config/sobre';
import { PUBLICO_DOENCAS, PUBLICO_PORTARIA } from '../../config/routes';
import { LinhaArea, IconeSecao } from './LinhaArea';
import { TambemNoApp } from './TambemNoApp';
import { EmailsApp } from './EmailsApp';
import { rolarPara } from './Indice';

const TITULO = 'O app da Junta Regular de Saúde do HNRe';
const DESCRICAO = 'Inspeções de Saúde, perícias menores, concursos e pareceres num só lugar — com a IA lendo os documentos e o app conferindo prazos e limites.';

/** Metas da página enquanto ela está aberta (SPA com hash: o index.html é um só); restaura ao sair. */
const useMetasPagina = () => {
  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = `Sobre o app · JRS/HNRe`;
    const criadas: HTMLMetaElement[] = [];
    const anteriores: { el: HTMLMetaElement; content: string }[] = [];
    const definir = (atributo: 'name' | 'property', chave: string, valor: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${atributo}="${chave}"]`);
      if (el) anteriores.push({ el, content: el.content });
      else { el = document.createElement('meta'); el.setAttribute(atributo, chave); document.head.appendChild(el); criadas.push(el); }
      el.content = valor;
    };
    definir('name', 'robots', 'noindex, nofollow');
    definir('name', 'description', DESCRICAO);
    definir('property', 'og:title', TITULO);
    definir('property', 'og:description', DESCRICAO);
    return () => {
      document.title = tituloAnterior;
      criadas.forEach(el => el.remove());
      anteriores.forEach(({ el, content }) => { el.content = content; });
    };
  }, []);
};

const FAIXA = [
  { icone: 'groups', rotulo: 'Para quem', texto: 'JRS, MPI, Secretaria e médicos do HNRe que atuam na perícia' },
  { icone: 'devices', rotulo: 'Onde', texto: 'No computador e no celular, instalável como app (PWA)' },
  { icone: 'lock', rotulo: 'Acesso', texto: 'Restrito a usuários cadastrados pela JRS, com perfil por função' },
];

const SEGURANCA = [
  { icone: 'verified_user', titulo: 'Cada um vê só o que a função exige', texto: 'Perfis de acesso por função; dados de saúde só para quem atua na perícia.' },
  { icone: 'history', titulo: 'Ações registradas', texto: 'Exclusões, documentos gerados e mudanças de configuração ficam registrados com autor e data.' },
  { icone: 'image', titulo: 'Imagens desta página', texto: 'As telas e os e-mails mostrados usam dados fictícios — nenhum inspecionado real aparece aqui.' },
];

const NAV = [
  { id: 'funcoes', rotulo: 'Funções' },
  { id: 'seguranca', rotulo: 'Segurança' },
  { id: 'acesso', rotulo: 'Acesso' },
];

const Navegacao: React.FC = () => (
  <nav aria-label="Nesta página" className="shrink-0">
    <ul className="flex items-center gap-1">
      {NAV.map(n => (
        <li key={n.id}>
          <button
            type="button"
            onClick={() => rolarPara(n.id)}
            className="min-h-[44px] px-2 md:px-3 rounded-lg text-sm font-bold text-white hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            {n.rotulo}
          </button>
        </li>
      ))}
    </ul>
  </nav>
);

const Rodape: React.FC = () => (
  <div className="mx-auto w-full max-w-data flex flex-col gap-2">
    <p className="text-sm font-bold text-navy">Hospital Naval de Recife · Marinha do Brasil</p>
    <p className="text-xs text-ink-3 leading-relaxed">
      Página informativa sobre o app da Junta Regular de Saúde. Não contém dados de inspecionados nem informação
      clínica individual.
    </p>
    <p className="text-xs text-ink-3">
      Consultas públicas:{' '}
      <Link to={PUBLICO_DOENCAS} className="font-bold text-blue underline underline-offset-2 hover:text-navy">Doenças previstas em lei</Link>
      {' · '}
      <Link to={PUBLICO_PORTARIA} className="font-bold text-blue underline underline-offset-2 hover:text-navy">Portaria GM-MD nº 3.551/2021</Link>
    </p>
  </div>
);

const SobrePublico: React.FC = () => {
  useMetasPagina();
  const destaques = AREAS_SOBRE.filter(a => a.destaque);
  const outras = AREAS_SOBRE.filter(a => !a.destaque);

  return (
    <ShellPublico variante="informativo" navegacao={<Navegacao />} rodape={<Rodape />}>
      <Container size="data" className="py-8 md:py-12 flex flex-col gap-16">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 max-w-[820px]">
            <h1 className="text-h1 md:text-display text-navy">{TITULO}</h1>
            <p className="text-base md:text-[17px] text-ink">{DESCRICAO}</p>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4" aria-label="Para quem, onde e acesso">
            {FAIXA.map(f => (
              <li key={f.rotulo} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-line">
                <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">{f.icone}</span>
                <span className="text-sm text-ink"><strong className="block text-navy">{f.rotulo}</strong>{f.texto}</span>
              </li>
            ))}
          </ul>
        </header>

        <div id="funcoes" className="scroll-mt-6 flex flex-col gap-16">
          <h2 id="funcoes-titulo" tabIndex={-1} className="sr-only">Funções do app</h2>
          {destaques.map((area, i) => (
            <LinhaArea key={area.id} id={`publico-${area.id}`} area={area} texto={area.textoPublico} indice={i} />
          ))}
          <TambemNoApp
            id="publico-tambem"
            cards={outras.map(a => ({ id: a.id, titulo: a.titulo, icone: a.icone, texto: a.textoPublico.resumoCurto }))}
          />
        </div>

        <EmailsApp id="publico-emails" />

        <section id="seguranca" aria-labelledby="seguranca-titulo" className="scroll-mt-6 flex flex-col gap-4">
          <IconeSecao icone="shield_lock" />
          <h2 id="seguranca-titulo" tabIndex={-1} className="text-h1 text-navy focus:outline-none">Segurança e sigilo</h2>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SEGURANCA.map(s => (
              <li key={s.titulo} className="flex flex-col gap-1.5 p-4 rounded-xl bg-white border border-line">
                <span className="material-symbols-outlined text-[24px] text-navy" aria-hidden="true">{s.icone}</span>
                <span className="text-h3 text-navy">{s.titulo}</span>
                <span className="text-sm text-ink">{s.texto}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-3">
            O uso do app é medido só em contagens — páginas abertas e ações por usuário, sem nenhum dado de
            inspecionado —, visíveis apenas ao Administrador e guardadas por 12 meses.
          </p>
        </section>

        <section id="acesso" aria-labelledby="acesso-titulo" className="scroll-mt-6 flex flex-col gap-4 p-5 md:p-8 rounded-xl bg-white border border-line">
          <h2 id="acesso-titulo" tabIndex={-1} className="text-h1 text-navy focus:outline-none">Como ter acesso</h2>
          <p className="text-base text-ink max-w-[820px]">
            O app é de uso interno. O cadastro é feito pela Secretaria da JRS para militares e servidores com função na
            perícia do HNRe; o perfil de acesso acompanha a função.
          </p>
          <div className="text-sm text-ink border-t border-line pt-4">
            <p className="font-bold text-navy">CT (Md) Mauriston</p>
            <p>Presidente da Junta Regular de Saúde do Hospital Naval de Recife (JRS/HNRe) e desenvolvedor do app</p>
            <p className="mt-2">
              Junta Regular de Saúde do HNRe ·{' '}
              <a href="tel:+558130369073" className="font-bold text-blue underline underline-offset-2 hover:text-navy">(81) 3036-9073</a>
              {' · '}
              <a href="mailto:hnre.jrs@marinha.mil.br" className="font-bold text-blue underline underline-offset-2 hover:text-navy">hnre.jrs@marinha.mil.br</a>
            </p>
          </div>
        </section>
      </Container>
    </ShellPublico>
  );
};

export default SobrePublico;
