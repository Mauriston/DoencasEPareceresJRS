// Ficheiro: scripts/documentos/gerar-guias-exemplo.ts
// Gera um PDF de exemplo das GUIAS DE EXAMES (dados fictícios) para conferência visual do layout
// (servidor/documentos/guiasExames/documento.ts): todas as páginas de uma inspecionada de 45 anos em
// "Serviço com explosivos" (laboratoriais, audiometria, odontológico, oftalmologia especial, laudo
// ginecológico, exames de imagem e outros exames).
// Uso: CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx scripts/documentos/gerar-guias-exemplo.ts [saida.pdf]
// Para ver as páginas: pdftoppm -r 60 -png saida.pdf pagina
import { writeFileSync } from 'node:fs';
import { htmlParaPdf } from '../../servidor/documentos/gerarPdf';
import { htmlGuiasExames } from '../../servidor/documentos/guiasExames/documento';
import { examesDasGuias, paginasDasGuias } from '../../utils/guiasExames';

const saida = process.argv[2] || 'exemplo-guias.pdf';
const finalidade = process.argv[3] || 'Serviço com explosivos';
const paginas = paginasDasGuias(examesDasGuias(finalidade, 'Feminino', 45));
const pdf = await htmlParaPdf(htmlGuiasExames({
  numeroIS: 260123,
  inspecionado: process.env.NOME_EXEMPLO || '1T (T) 12.3456.78 MARIA DA SILVA EXEMPLO',
  finalidade,
  paginas,
  presidenteNome: 'Mauriston Renan Martins Silva',
  presidentePosto: 'Capitão-Tenente (Md)',
}));
writeFileSync(saida, pdf);
console.log(`${saida}: ${paginas.length} páginas`);
process.exit(0);
