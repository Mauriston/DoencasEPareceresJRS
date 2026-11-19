// Ficheiro: scripts/sobre/gerar-emails.ts
// Gera as imagens dos e-mails do app para a página "Sobre o app" (bloco "Comunicados prontos", nas versões
// interna e pública): cada modelo é montado por montarEmailTeste (servidor/email/teste.ts) — as mesmas funções
// e templates do envio real — com dados FICTÍCIOS (gerador com semente fixa, para a imagem não mudar à toa) e
// fotografado no Chromium do Playwright. Não precisa de emuladores, Firestore nem conta Google.
//
//   npx tsx scripts/sobre/gerar-emails.ts
//
// Saída: public/sobre/emails/<tipo>.webp e <tipo>@2x.webp (+ anexo-agendaIS / anexo-nac) e as dimensões em
// components/sobre/imagens.gerado.ts. Rode de novo sempre que um template de e-mail mudar.
//
// Sigilo: além dos dados fictícios, a imagem da assinatura manuscrita do Presidente (anexo do NAC) é trocada
// por um traço neutro — a página é pública e não deve exibir assinatura digitalizada.
import fs from 'node:fs';
import path from 'node:path';
import type { Browser } from 'playwright';
import { montarEmailTeste, TIPOS_TESTE, type Aleatorio } from '../../servidor/email/teste';
import { assinaturaSemSignatario } from '../../servidor/email/comum';
import { ASSINATURA_PRESIDENTE_DATA_URI } from '../../servidor/email/recursosAnexo';
import { mesclarConfigEmails, type TipoEmail } from '../../config/emails';
import { abrirChromium, atualizarManifesto, gravarWebp, pngParaWebp, RAIZ, type DimensaoImagem } from './util';

const APP_URL = (process.env.APP_URL || 'https://mauriston.github.io/DoencasEPareceresJRS/').replace(/\/?$/, '/');

// Mesmo gerador com semente dos testes (utils/__tests__/emailNac.test.ts).
const semente = (n: number): Aleatorio => () => { n = (n * 1103515245 + 12345) % 2147483648; return n / 2147483648; };

// Semente de cada tipo: escolhida para listas de tamanho médio (o e-mail mostra o modelo sem ficar enorme).
const SEMENTES: Record<TipoEmail, number> = {
  resultadoIS: 7, agendaIS: 11, agendamentoIS: 3, faltasHNRe: 5, inaptosConcurso: 9, nac: 4,
  aberturaIS: 1, guiasInspecionado: 1, guiasSecretaria: 1, documentoSecretaria: 1, agendamentoGeral: 2, agendamentoBeneficios: 6, resultadoBeneficios: 8,
  feedbackRecebido: 1, feedbackSolucionado: 1,
};

type Montado = { assunto: string; html: string; htmlAnexo?: string; variante?: string; modelo?: string };

// Nos tipos com variantes (sorteadas pelo gerador), a página mostra a principal: abertura com guias de exames,
// agendamento (não o reagendamento) e o não enquadramento de Benefícios.
const SERVE: Partial<Record<TipoEmail, (r: Montado) => boolean>> = {
  agendaIS: r => (r.html.match(/<tr/g) || []).length > 14, // agenda vazia não ilustra
  aberturaIS: r => r.variante === 'exames',
  agendamentoIS: r => r.variante === 'agendamento',
  agendamentoGeral: r => r.variante === 'agendamento',
  agendamentoBeneficios: r => r.variante === 'agendamento',
  resultadoBeneficios: r => r.modelo === 'nao_enquadramento',
};

// Anexos sem prévia na página: as guias de exames levam a rubrica do Presidente e várias páginas A4.
const SEM_IMAGEM_DO_ANEXO: TipoEmail[] = ['guiasInspecionado', 'guiasSecretaria', 'documentoSecretaria'];

const ASSINATURA_NEUTRA = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="264" viewBox="0 0 440 264"><path d="M60 170 C120 120 160 200 220 150 S320 120 380 160" fill="none" stroke="#9aa1b5" stroke-width="4" stroke-linecap="round"/></svg>',
).toString('base64')}`;

const BANNER_SUBSTITUTO = '<svg xmlns="http://www.w3.org/2000/svg" width="820" height="120" viewBox="0 0 820 120">'
  + '<rect width="820" height="120" fill="#050F41"/><rect y="114" width="820" height="6" fill="#FAB932"/>'
  + '<text x="410" y="56" fill="#ffffff" font-family="Montserrat,Arial,sans-serif" font-size="24" font-weight="800" letter-spacing="3" text-anchor="middle">HOSPITAL NAVAL DE RECIFE</text>'
  + '<text x="410" y="86" fill="#FAB932" font-family="Montserrat,Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="3" text-anchor="middle">JUNTA REGULAR DE SAÚDE</text></svg>';

/** Escolhe a semente: a fixa do tipo, ou a 1ª a partir dela cujo e-mail sirva (SERVE). */
const montar = (tipo: TipoEmail): Montado => {
  // Só a assinatura institucional do Presidente aparece; o supervisor de serviço vira um nome genérico.
  const padrao = mesclarConfigEmails(undefined);
  const config = { ...padrao, assinatura: { ...padrao.assinatura, supervisorNome: 'Nome do Supervisor', supervisorPosto: 'Posto/Graduação' } };
  for (let n = SEMENTES[tipo]; n < SEMENTES[tipo] + 50; n++) {
    const r = montarEmailTeste(tipo, assinaturaSemSignatario(config), config, semente(n)) as Montado;
    if (!SERVE[tipo] || SERVE[tipo]!(r)) return r;
  }
  return montarEmailTeste(tipo, assinaturaSemSignatario(config), config, semente(SEMENTES[tipo])) as Montado;
};

/** Fotografa o HTML na largura dada, página inteira, em 1× e 2×. */
const fotografar = async (navegador: Browser, html: string, largura: number, nome: string): Promise<DimensaoImagem> => {
  let dim: DimensaoImagem = { w: largura, h: 0 };
  for (const escala of [1, 2] as const) {
    const contexto = await navegador.newContext({ viewport: { width: largura, height: 400 }, deviceScaleFactor: escala });
    const pagina = await contexto.newPage();
    // Imagens do próprio app (logo, brasão) vêm de public/; o resto (banner externo) tenta a rede e, se não houver, segue sem.
    await pagina.route('**/*', async rota => {
      const url = rota.request().url();
      if (url.startsWith(APP_URL)) {
        const arquivo = path.join(RAIZ, 'public', url.slice(APP_URL.length).split('?')[0]);
        if (fs.existsSync(arquivo)) return rota.fulfill({ path: arquivo });
      }
      if (url.startsWith('data:')) return rota.continue();
      try {
        return await rota.fulfill({ response: await rota.fetch({ timeout: 8_000 }) });
      } catch {
        // Sem rede para o banner externo (ex.: imgur bloqueado): faixa institucional equivalente, para a
        // imagem não mostrar um ícone de imagem quebrada. Com rede, sai o banner real.
        return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url) ? rota.fulfill({ contentType: 'image/svg+xml', body: BANNER_SUBSTITUTO }) : rota.abort();
      }
    });
    await pagina.setContent(html, { waitUntil: 'load', timeout: 20_000 }).catch(() => { /* banner externo lento: segue */ });
    await pagina.evaluate(() => document.fonts?.ready);
    const png = await pagina.screenshot({ fullPage: true, type: 'png' });
    if (escala === 1) dim = { w: largura, h: await pagina.evaluate(() => Math.ceil(document.documentElement.scrollHeight)) };
    gravarWebp(`emails/${nome}`, escala, await pngParaWebp(navegador, png));
    await contexto.close();
  }
  console.log(`  ${nome}: ${dim.w}×${dim.h}`);
  return dim;
};

const navegador = await abrirChromium();
const manifesto: Record<string, DimensaoImagem> = {};
try {
  for (const tipo of TIPOS_TESTE) {
    const r = montar(tipo);
    manifesto[`emails/${tipo}`] = await fotografar(navegador, r.html, 860, tipo);
    if (r.htmlAnexo && !SEM_IMAGEM_DO_ANEXO.includes(tipo)) {
      const anexo = r.htmlAnexo.split(ASSINATURA_PRESIDENTE_DATA_URI).join(ASSINATURA_NEUTRA);
      manifesto[`emails/anexo-${tipo}`] = await fotografar(navegador, anexo, 1123, `anexo-${tipo}`);
    }
  }
} finally {
  await navegador.close();
}
atualizarManifesto(manifesto);
console.log('Imagens dos e-mails gravadas em public/sobre/emails/.');
