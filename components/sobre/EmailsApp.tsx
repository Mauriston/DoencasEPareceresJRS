// Ficheiro: components/sobre/EmailsApp.tsx
// Bloco "Comunicados prontos" da página "Sobre o app" (auditoria v3, 6f) — o MESMO nas versões interna e
// pública: o que os e-mails têm em comum, um card por e-mail (quando sai, assunto e destinatários em texto,
// prévia do modelo com esmaecido e "Ver e-mail inteiro"), os anexos em PDF e o visualizador (anterior/
// próximo; no celular, pinça para ampliar). Sem botão para o app.
// Desktop (≥ @split): 3 colunas. Celular: chips com os 6 e-mails e um card por vez (deslizar troca).
// As imagens são os modelos reais montados com dados fictícios (scripts/sobre/gerar-emails.ts).
import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { GradeCards } from '../ui/Grade';
import { EMAILS_SOBRE, type EmailSobre } from '../../config/sobre';
import { TIPOS_EMAIL } from '../../config/emails';
import { ImagemSobre } from './Imagem';
import { IconeSecao } from './LinhaArea';

const RESERVA_EMAIL = { w: 860, h: 1400 };
const RESERVA_ANEXO = { w: 1123, h: 794 };

const COMUNS = [
  { icone: 'send', titulo: 'Remetente único', texto: 'Todos saem da conta Google da JRS como “JRS/HNRe”; as respostas vão para a caixa da JRS.' },
  { icone: 'edit_note', titulo: 'Modelos fixos, destinatários ajustáveis', texto: 'O texto segue o modelo aprovado; o Admin ajusta destinatários fixos, assinaturas e saudações em Configurações.' },
  { icone: 'verified', titulo: 'Sem duplicar', texto: 'Cada envio fica registrado na IS ou no candidato; o app não manda o mesmo comunicado duas vezes.' },
  { icone: 'science', titulo: 'Teste antes', texto: 'Cada modelo pode ser enviado em teste, com dados fictícios, só para a lista de teste.' },
];

const assuntoDe = (e: EmailSobre) => TIPOS_EMAIL.find(t => t.tipo === e.tipo)?.assunto ?? '';
const altDe = (e: EmailSobre) => `Modelo do e-mail “${e.titulo}”, preenchido com dados fictícios`;

interface ItemVisualizador { chave: string; titulo: string; alt: string; reserva: { w: number; h: number } }

const ITENS_EMAILS: ItemVisualizador[] = EMAILS_SOBRE.map(e => ({ chave: `emails/${e.tipo}`, titulo: e.titulo, alt: altDe(e), reserva: RESERVA_EMAIL }));
const ITENS_ANEXOS: ItemVisualizador[] = EMAILS_SOBRE.filter(e => e.anexo).map(e => ({
  chave: `emails/${e.anexo!.imagem}`, titulo: e.anexo!.rotulo, alt: `${e.anexo!.rotulo}, com dados fictícios`, reserva: RESERVA_ANEXO,
}));

const TagModo: React.FC<{ modo: EmailSobre['modo'] }> = ({ modo }) => (
  modo === 'automatico' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy text-white text-xs font-bold whitespace-nowrap">
      <span className="material-symbols-outlined text-[15px]" aria-hidden="true">schedule</span>Automático
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-navy text-navy text-xs font-bold whitespace-nowrap">
      <span className="material-symbols-outlined text-[15px]" aria-hidden="true">touch_app</span>Um clique
    </span>
  )
);

/** Prévia: o topo do modelo com esmaecido e o botão que abre o e-mail inteiro. */
const Previa: React.FC<{ item: ItemVisualizador; onAbrir: () => void; altura?: string }> = ({ item, onAbrir, altura = 'h-[360px]' }) => (
  <div className={`relative ${altura} rounded-xl overflow-hidden border border-line bg-surface-2`}>
    <ImagemSobre chave={item.chave} alt={item.alt} reserva={item.reserva} icone="mail" />
    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-surface-2" aria-hidden="true" />
    <span className="absolute left-1/2 bottom-3 -translate-x-1/2">
      <Button variant="secondary" size="sm" icon="open_in_full" onClick={onAbrir} aria-label={`Ver e-mail inteiro: ${item.titulo}`}>
        Ver e-mail inteiro
      </Button>
    </span>
  </div>
);

const CardEmail: React.FC<{ email: EmailSobre; onAbrir: () => void; as?: 'li' | 'div' }> = ({ email, onAbrir, as: Comp = 'li' }) => (
  <Comp className="h-full flex flex-col gap-3 p-4 rounded-xl bg-white border border-line min-w-0">
    <div className="flex items-start justify-between gap-2">
      <h3 className="text-h3 text-navy">{email.titulo}</h3>
      <TagModo modo={email.modo} />
    </div>
    <Previa item={ITENS_EMAILS[EMAILS_SOBRE.indexOf(email)]} onAbrir={onAbrir} />
    {email.anexo && (
      <p className="flex items-center gap-2 text-xs text-ink-3">
        <span className="material-symbols-outlined text-[18px] text-navy" aria-hidden="true">picture_as_pdf</span>PDF anexo
      </p>
    )}
    <p className="text-sm text-ink">{email.quando}</p>
    <dl className="mt-auto pt-3 border-t border-line grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
      <dt className="font-bold text-ink-3">Assunto</dt>
      <dd className="text-ink break-words">{assuntoDe(email)}</dd>
      <dt className="font-bold text-ink-3">Para</dt>
      <dd className="text-ink">{email.para}</dd>
    </dl>
  </Comp>
);

/** Visualizador do modelo inteiro, com anterior/próximo (setas do teclado também). */
const Visualizador: React.FC<{ itens: ItemVisualizador[]; inicio: number; onFechar: () => void }> = ({ itens, inicio, onFechar }) => {
  const [i, setI] = useState(inicio);
  const total = itens.length;
  const ir = (passo: number) => setI(atual => (atual + passo + total) % total);
  const item = itens[i];
  useEffect(() => {
    if (total < 2) return undefined;
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setI(a => (a - 1 + total) % total);
      if (e.key === 'ArrowRight') setI(a => (a + 1) % total);
    };
    window.addEventListener('keydown', aoTecla);
    return () => window.removeEventListener('keydown', aoTecla);
  }, [total]);
  return (
    <Dialog
      title={total > 1 ? `${item.titulo} · ${i + 1} de ${total}` : item.titulo}
      icon="mail"
      size="xl"
      onClose={onFechar}
      footer={total > 1 ? (
        <>
          <Button variant="secondary" icon="chevron_left" onClick={() => ir(-1)}>Anterior</Button>
          <Button variant="secondary" onClick={() => ir(1)}>
            Próximo<span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
          </Button>
        </>
      ) : undefined}
    >
      <div
        className="-m-5 bg-surface-2 [touch-action:pan-x_pan-y_pinch-zoom]"
      >
        <p className="sr-only" aria-live="polite">{item.titulo}, {i + 1} de {total}</p>
        <p className="md:hidden px-4 pt-3 text-xs text-ink-3 text-center">Use a pinça para ampliar.</p>
        <div className="p-4 md:p-5">
          <div className="mx-auto max-w-[860px] rounded-lg overflow-hidden border border-line bg-placa">
            <ImagemSobre key={item.chave} chave={item.chave} alt={item.alt} reserva={item.reserva} icone="mail" imediata />
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export const EmailsApp: React.FC<{ id?: string }> = ({ id = 'sobre-emails' }) => {
  const [visualizar, setVisualizar] = useState<{ itens: ItemVisualizador[]; inicio: number } | null>(null);
  const [atual, setAtual] = useState(0);
  const toque = useRef<number | null>(null);
  const abrirEmail = (i: number) => setVisualizar({ itens: ITENS_EMAILS, inicio: i });
  const trocar = (passo: number) => setAtual(a => Math.min(EMAILS_SOBRE.length - 1, Math.max(0, a + passo)));

  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-24">
      <div className="@container flex flex-col gap-6 @split:gap-8">
        <div className="flex flex-col gap-3 max-w-[820px]">
          <IconeSecao icone="mail" />
          <h2 id={`${id}-titulo`} tabIndex={-1} className="text-h1 text-navy focus:outline-none">Comunicados prontos, no padrão da JRS</h2>
          <p className="text-base text-ink">
            Seis e-mails saem do app a partir de modelos aprovados: um automático, todo fim de tarde, e cinco com um clique
            depois da ação que os justifica. As imagens abaixo são os modelos reais, preenchidos com dados fictícios.
          </p>
        </div>

        <GradeCards as="ul" aria-label="O que todos os e-mails têm em comum">
          {COMUNS.map(c => (
            <li key={c.titulo} className="h-full flex flex-col gap-1.5 p-4 rounded-xl bg-surface-2 border border-line">
              <span className="material-symbols-outlined text-[24px] text-navy" aria-hidden="true">{c.icone}</span>
              <span className="text-sm font-bold text-navy">{c.titulo}</span>
              <span className="text-xs text-ink">{c.texto}</span>
            </li>
          ))}
        </GradeCards>

        {/* Desktop e container médio: todos os cards (3 colunas em @split, 2 no médio). */}
        <ul className="hidden @lg:grid grid-cols-2 @split:grid-cols-3 gap-5" aria-label="E-mails do app">
          {EMAILS_SOBRE.map((e, i) => <CardEmail key={e.tipo} email={e} onAbrir={() => abrirEmail(i)} />)}
        </ul>

        {/* Celular: chips com os seis e-mails e um card por vez. */}
        <div className="@lg:hidden flex flex-col gap-3">
          <div className="-mx-4 px-4 overflow-x-auto">
            <ul className="flex gap-2 w-max" aria-label="Escolha o e-mail">
              {EMAILS_SOBRE.map((e, i) => (
                <li key={e.tipo}>
                  <button
                    type="button"
                    aria-pressed={atual === i}
                    onClick={() => setAtual(i)}
                    className={`h-9 px-3 rounded-full border text-sm font-bold whitespace-nowrap transition-colors ${atual === i ? 'bg-navy border-navy text-white' : 'bg-white border-line text-navy hover:bg-thead'}`}
                  >
                    {e.titulo}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div
            aria-live="polite"
            onTouchStart={ev => { toque.current = ev.touches[0].clientX; }}
            onTouchEnd={ev => {
              if (toque.current === null) return;
              const dx = ev.changedTouches[0].clientX - toque.current;
              toque.current = null;
              if (Math.abs(dx) > 48) trocar(dx < 0 ? 1 : -1);
            }}
          >
            <CardEmail key={EMAILS_SOBRE[atual].tipo} as="div" email={EMAILS_SOBRE[atual]} onAbrir={() => abrirEmail(atual)} />
          </div>
          <p className="text-xs text-ink-3 text-center">{atual + 1} de {EMAILS_SOBRE.length} · deslize para o lado para trocar</p>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3 text-navy">Anexos em PDF</h3>
          <ul className="grid grid-cols-1 @lg:grid-cols-2 gap-5">
            {ITENS_ANEXOS.map((a, i) => (
              <li key={a.chave} className="flex flex-col gap-2">
                <Previa item={a} altura="h-[240px]" onAbrir={() => setVisualizar({ itens: ITENS_ANEXOS, inicio: i })} />
                <span className="text-sm text-ink">{a.titulo}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-ink-3">
          Além desses, o app envia à caixa de impressão da JRS os pedidos de parecer, os Termos de Recurso e as solicitações
          de concurso — são documentos para imprimir, não comunicados.
        </p>
      </div>
      {visualizar && <Visualizador itens={visualizar.itens} inicio={visualizar.inicio} onFechar={() => setVisualizar(null)} />}
    </section>
  );
};
