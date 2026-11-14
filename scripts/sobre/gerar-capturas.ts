// Ficheiro: scripts/sobre/gerar-capturas.ts
// Gera as capturas das telas da página "Sobre o app" (public/sobre/telas/): Início, Inspeções, Perícias
// Menores e Concursos, no desktop (1280×800) e no celular (390×844), claro e escuro, WebP 1× e 2×.
// Roda o app de verdade (server.ts + Vite) contra os EMULADORES do Firebase, semeados só com dados
// FICTÍCIOS (e2e/dados.mjs + os registros abaixo) — nunca contra a produção, nunca com inspecionados reais.
//
//   npx firebase emulators:exec --only auth,firestore --project demo-jrs "npx tsx scripts/sobre/gerar-capturas.ts"
//
// Precisa das portas 8080 (Firestore), 9099 (Auth) e 3101 (app) livres. Depois de gerar, as dimensões vão
// para components/sobre/imagens.gerado.ts e a página troca a moldura pela imagem.
import { spawn } from 'node:child_process';
import type { Browser, BrowserContext, Page } from 'playwright';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
// @ts-expect-error módulo .mjs sem tipos (dados do E2E)
import { semear, semearTelas, MEDICO, SENHA, HOJE } from '../../e2e/dados.mjs';
import { abrirChromium, atualizarManifesto, gravarWebp, pngParaWebp, type DimensaoImagem } from './util';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('Rode dentro de `firebase emulators:exec` (ver o cabeçalho deste arquivo): o script só usa os emuladores.');
  process.exit(1);
}

const PORTA = 3101;
const BASE = `http://127.0.0.1:${PORTA}/DoencasEPareceresJRS/`;

const TELAS = [
  { nome: 'inicio', rota: '#/' },
  { nome: 'inspecoes', rota: '#/inspecoes' },
  { nome: 'pericias', rota: '#/pericia-menor' },
  { nome: 'concursos', rota: '#/concursos' },
];
const APARELHOS = {
  desktop: { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false },
  celular: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
} as const;

/** Registros FICTÍCIOS a mais, para as telas não ficarem vazias. */
const semearExtras = async () => {
  const db = getFirestore(initializeApp({ projectId: 'demo-jrs' }, 'sobre'));
  const agora = new Date();
  const pessoas = [
    ['13:00', 'MN-SE 10.1010.10 MARCOS A. FERREIRA', 'Verificação de Deficiência Funcional'],
    ['13:20', 'CB-EL 20.2020.20 JULIANA R. COSTA', 'Término de Restrições'],
    ['14:00', '3SG-PT 30.3030.30 LUCIANA PIRES', 'Término de Incapacidade'],
    ['15:00', '2SG-ES 40.4040.40 CARLOS E. MOURA', 'Verificação de Deficiência Funcional'],
  ];
  for (const [i, [hora, inspecionado, finalidade]] of pessoas.entries()) {
    const numero = 9100 + i;
    await db.doc(`inspecoes/${numero}`).set({
      is: numero, dataAbertura: HOJE, dataEntrevista: `${HOJE}T${hora}`, finalidade, grupoFinalidade: 'Verificações e Términos', amp: 'JRS',
      peritoUid: MEDICO.uid, peritoNome: MEDICO.usuario, peritoGmail: '', inspecionadoId: `fict-${numero}`, inspecionado,
      situacao: 'andamento', status: 'agendada', dataLaudo: '', laudo: '', observacoes: '', restricoes: '', tis: '', ds1a: '',
      criadoPor: MEDICO.usuario, criadoEm: agora,
    });
  }
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const pericias = [['RICARDO A. BEZERRA', 'CB-MO 12.3456.78', 'M54.5 - Dor lombar baixa', 2], ['ANA P. DE OLIVEIRA', '3SG-EF 23.4567.89', 'S93.4 - Entorse do tornozelo', 0], ['PEDRO H. LIMA', 'MN 34.5678.90', 'J06.9 - Infecção aguda das vias aéreas superiores', 1]] as const;
  for (const [i, [nome, posto, cid, dias]] of pericias.entries()) {
    await db.doc(`periciasMenores/sobre-${i}`).set({
      militarId: `fict-pm-${i}`, inspecionado: `${posto} ${nome}`, om: ['EAMPE', 'Com3ºDN', 'CIAMPE'][i], cid, dispensas: [],
      dataAtestado: HOJE, tempoAtestado: 3, tempoHomologado: 3, dataTermino: iso(new Date(Date.now() + dias * 86_400_000)), vdf: false,
      peritoUsuario: MEDICO.usuario, peritoNome: MEDICO.nome, peritoUid: MEDICO.uid, pdfUrl: '', criadoEm: agora,
    });
  }
};

const subirServidor = async () => {
  const servidor = spawn('npx', ['tsx', 'server.ts'], {
    env: { ...process.env, PORT: String(PORTA), NODE_ENV: 'development', FIREBASE_PROJECT_ID: 'demo-jrs', GCLOUD_PROJECT: 'demo-jrs', VITE_FIREBASE_EMULATORS: '1', ALLOWED_ORIGIN: `http://127.0.0.1:${PORTA}` },
    stdio: ['ignore', 'inherit', 'inherit'], detached: true,
  });
  const derrubar = () => { try { process.kill(-servidor.pid!, 'SIGTERM'); } catch { /* já saiu */ } };
  for (let i = 0; ; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ }
    if (i > 120) { derrubar(); throw new Error('O servidor do app não subiu em 60 s.'); }
    await new Promise(r => setTimeout(r, 500));
  }
  return derrubar;
};

const entrar = async (pagina: Page) => {
  await pagina.goto(BASE);
  await pagina.getByLabel('Toque para continuar').click({ timeout: 10_000 }).catch(() => { /* sem splash */ });
  await pagina.getByLabel('NIP').fill(MEDICO.nip.replace(/\D/g, ''));
  await pagina.getByLabel('Senha').fill(SENHA);
  await pagina.getByRole('button', { name: /entrar/i }).click();
  await pagina.getByLabel('Senha').waitFor({ state: 'detached', timeout: 30_000 });
  await pagina.waitForTimeout(1500);
};

const fechar = async (pagina: Page) => {
  for (const nome of ['Entendi', 'Agora não', 'Fechar']) {
    await pagina.getByRole('button', { name: nome }).first().click({ timeout: 800 }).catch(() => { /* nada aberto */ });
  }
};

const capturar = async (navegador: Browser) => {
  const manifesto: Record<string, DimensaoImagem> = {};
  for (const [aparelho, opcoes] of Object.entries(APARELHOS)) {
    for (const escala of [1, 2] as const) {
      const contexto: BrowserContext = await navegador.newContext({ ...opcoes, deviceScaleFactor: escala, locale: 'pt-BR', timezoneId: 'America/Recife' });
      const pagina = await contexto.newPage();
      pagina.setDefaultTimeout(20_000);
      await entrar(pagina);
      for (const tema of ['claro', 'escuro'] as const) {
        await pagina.evaluate(t => localStorage.setItem('jrs-tema', JSON.stringify({ modo: t, variante: 'marinho' })), tema);
        for (const tela of TELAS) {
          await pagina.goto(`${BASE}${tela.rota}`);
          await pagina.reload();
          await pagina.waitForLoadState('networkidle').catch(() => { /* listeners abertos */ });
          await pagina.waitForTimeout(2000);
          await fechar(pagina);
          const png = await pagina.screenshot({ type: 'png' });
          const chave = `telas/${tela.nome}-${aparelho}`;
          gravarWebp(`${chave}-${tema}`, escala, await pngParaWebp(navegador, png));
          manifesto[chave] = { w: opcoes.viewport.width, h: opcoes.viewport.height, escuro: true };
          console.log(`  ${chave}-${tema} ${escala}×`);
        }
      }
      await contexto.close();
    }
  }
  return manifesto;
};

await semear();
await semearTelas();
await semearExtras();
const derrubar = await subirServidor();
const navegador = await abrirChromium();
try {
  atualizarManifesto(await capturar(navegador));
  console.log('Capturas gravadas em public/sobre/telas/.');
} finally {
  await navegador.close();
  derrubar();
}
process.exit(0);
