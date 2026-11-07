// Ficheiro: scripts/documentos/comparar-com-template.mts
// Gera os termos em HTML+CSS com os MESMOS textos dos templates do Google Docs ({{campos}}) e
// compara a posição de cada linha (pdftotext -bbox) com o PDF exportado do template.
// Uso: npx tsx scripts/documentos/comparar-com-template.mts <pasta com recurso.pdf e cientificacao.pdf>
// Requer poppler-utils (pdftotext) e um Chromium (CHROMIUM_PATH ou /opt/pw-browsers/chromium).
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { htmlTermoRecurso, htmlTermoCientificacao } from '../../servidor/documentos/termosConcurso';
import { htmlParaPdf } from '../../servidor/documentos/gerarPdf';

const pasta = process.argv[2] || '.';
type Linha = { x0: number; y0: number; x1: number; texto: string };
const linhas = (pdf: string): Linha[] => {
  const html = execFileSync('pdftotext', ['-bbox-layout', pdf, '-'], { encoding: 'utf8' });
  return [...html.matchAll(/<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="[\d.]+">([\s\S]*?)<\/line>/g)]
    .map(m => ({ x0: +m[1], y0: +m[2], x1: +m[3], texto: [...m[4].matchAll(/>([^<]+)<\/word>/g)].map(w => w[1]).join(' ') }));
};
const chave = (t: string) => t.replace(/[\s​]+/g, ' ').trim().slice(0, 25);

const comparar = (nome: string, original: string, novo: string) => {
  const a = linhas(original), b = linhas(novo);
  let pior = 0;
  console.log(`\n== ${nome}`);
  for (const la of a) {
    const perto = (xs: Linha[]) => xs.sort((p, q) => Math.abs(p.y0 - la.y0) - Math.abs(q.y0 - la.y0))[0];
    const lb = perto(b.filter(x => chave(x.texto) === chave(la.texto))) ?? perto(b.filter(x => chave(x.texto).slice(0, 12) === chave(la.texto).slice(0, 12)));
    if (!lb) { console.log(`  ausente: ${la.texto.slice(0, 50)}`); continue; }
    const dy = lb.y0 - la.y0, dx0 = lb.x0 - la.x0, dx1 = lb.x1 - la.x1;
    pior = Math.max(pior, Math.abs(dy), Math.abs(dx0));
    const alerta = Math.abs(dy) > 1 || Math.abs(dx0) > 1 || Math.abs(dx1) > 2 ? ' <==' : '';
    console.log(`  dy=${dy.toFixed(1).padStart(5)} dx=${dx0.toFixed(1).padStart(5)} dxFim=${dx1.toFixed(1).padStart(5)}  ${la.texto.slice(0, 55)}${alerta}`);
  }
  console.log(`  maior desvio (y / x inicial): ${pior.toFixed(2)} pt`);
};

const ph = { candidatoId: '{{candidatoId}}', candidatoNome: '{{candidatoNome}}', nomeConcurso: '{{nomeConcurso}}', dataEmissao: '{{DATA_HOJE}}' };
const rec = join(pasta, 'novo-recurso.pdf');
writeFileSync(rec, await htmlParaPdf(htmlTermoRecurso({ ...ph, dataLaudo: '{{dataLaudo}}', nomeUsuario: '{{nomeUsuario}}', postoGraduacao: '{{postoGraduacao}}', cargo: '{{cargo}}' })));
comparar('Termo de Recurso', join(pasta, 'recurso.pdf'), rec);
const cie = join(pasta, 'novo-cientificacao.pdf');
writeFileSync(cie, await htmlParaPdf(htmlTermoCientificacao({ ...ph, status: 'APTO' })));
comparar('Termo de Cientificação', join(pasta, 'cientificacao.pdf'), cie);
process.exit(0);
