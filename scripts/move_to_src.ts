import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

// We need to add all .ts and .tsx files, but exclude node_modules
project.addSourceFilesAtPaths([
  './components/**/*.ts', './components/**/*.tsx',
  './context/**/*.ts', './context/**/*.tsx',
  './hooks/**/*.ts', './hooks/**/*.tsx',
  './utils/**/*.ts', './utils/**/*.tsx',
  './services/**/*.ts', './services/**/*.tsx',
  './data/**/*.ts', './data/**/*.tsx',
  './types/**/*.ts', './types/**/*.tsx',
  './styles/**/*.ts', './styles/**/*.tsx',
  './config/**/*.ts', './config/**/*.tsx',
  './App.tsx', './index.tsx', './constants.ts', './types.ts'
]);

// create all destination directories
const dirsToCreate = [
  'src',
  'src/app',
  'src/features',
  'src/features/auth',
  'src/features/beneficios',
  'src/features/concursos',
  'src/features/pareceres',
  'src/features/pericia-menor',
  'src/features/normas',
  'src/features/estudo',
  'src/features/inspecoes',
  'src/features/publico',
  'src/features/usuarios',
  'src/components',
  'src/components/shell',
  'src/components/ui',
  'src/context',
  'src/hooks',
  'src/utils',
  'src/services',
  'src/data',
  'src/types',
  'src/styles',
  'src/config'
];

dirsToCreate.forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

function moveTo(sourcePath, destDirPath) {
    const file = project.getSourceFile(sourcePath);
    if (file) {
        file.moveToDirectory(destDirPath);
    } else {
        console.warn('Could not find file: ' + sourcePath);
    }
}

function moveDirContents(sourceDirStr, destDirStr) {
    const sourceDir = project.getDirectory(sourceDirStr);
    if (!sourceDir) {
        console.warn('Could not find directory: ' + sourceDirStr);
        return;
    }
    const destDir = project.getDirectory(destDirStr) || project.createDirectory(destDirStr);
    sourceDir.getSourceFiles().forEach(f => f.moveToDirectory(destDirStr));
    sourceDir.getDirectories().forEach(d => {
        const destSubDir = destDirStr + '/' + d.getBaseName();
        if (!fs.existsSync(destSubDir)) {
          fs.mkdirSync(destSubDir, { recursive: true });
        }
        moveDirContents(sourceDirStr + '/' + d.getBaseName(), destSubDir);
    });
}

// Root files
moveTo('App.tsx', 'src/app');
moveTo('index.tsx', 'src');
moveTo('constants.ts', 'src');
moveTo('types.ts', 'src');

// Features mapping
const authFiles = ['Login.tsx'];
const beneficiosFiles = ['Militares.tsx']; 
const concursosFiles = ['ConcursosGuide.tsx', 'ConcursosJRS.tsx'];
const pareceresFiles = ['Pareceres.tsx'];
const periciaMenorFiles = ['PericiaMenor.tsx', 'PericiaMenorDetalhe.tsx', 'CidInaptidaoModal.tsx', 'MotivoIdmModal.tsx', 'ResponsavelTermoModal.tsx', 'SolicitacaoModais.tsx'];
const normasFiles = ['LawReference.tsx', 'LegislacaoForm.tsx', 'PortariaGuide.tsx', 'DGPM406Guide.tsx', 'RoteiroJRS.tsx'];
const estudoFiles = ['DiseaseGuide.tsx', 'ExamesGuide.tsx', 'Infograficos.tsx', 'CasosPericiais.tsx'];
const inspecoesFiles = ['Inspecoes.tsx'];
const usuariosFiles = ['Perfil.tsx', 'UsuariosManagement.tsx'];
const publicoFiles = ['Home.tsx', 'Raiz.tsx'];

authFiles.forEach(f => moveTo(`components/${f}`, 'src/features/auth'));
beneficiosFiles.forEach(f => moveTo(`components/${f}`, 'src/features/beneficios'));
concursosFiles.forEach(f => moveTo(`components/${f}`, 'src/features/concursos'));
pareceresFiles.forEach(f => moveTo(`components/${f}`, 'src/features/pareceres'));
periciaMenorFiles.forEach(f => moveTo(`components/${f}`, 'src/features/pericia-menor'));
normasFiles.forEach(f => moveTo(`components/${f}`, 'src/features/normas'));
estudoFiles.forEach(f => moveTo(`components/${f}`, 'src/features/estudo'));
inspecoesFiles.forEach(f => moveTo(`components/${f}`, 'src/features/inspecoes'));
usuariosFiles.forEach(f => moveTo(`components/${f}`, 'src/features/usuarios'));
publicoFiles.forEach(f => moveTo(`components/${f}`, 'src/features/publico'));

moveDirContents('components/militares', 'src/features/beneficios');
moveDirContents('components/concursos', 'src/features/concursos');
moveDirContents('components/pareceres', 'src/features/pareceres');
moveDirContents('components/periciaMenor', 'src/features/pericia-menor');
moveDirContents('components/inspecoes', 'src/features/inspecoes');
moveDirContents('components/publico', 'src/features/publico');

// Generic components
moveDirContents('components/shell', 'src/components/shell');
moveDirContents('components/ui', 'src/components/ui');

const genericComponents = ['Apresentacoes.tsx', 'ErroFatal.tsx', 'ImageScanner.tsx', 'MarkdownContent.tsx', 'MarkdownDocPage.tsx', 'PdfFullscreenModal.tsx', 'StoragePdfButtons.tsx', 'Videos.tsx', 'Mensagens.tsx', 'InstallAppQrDialog.tsx', 'InstallAppTutorial.tsx', 'NotificacoesConvite.tsx', 'NotificacoesPainel.tsx'];
genericComponents.forEach(f => moveTo(`components/${f}`, 'src/components'));

// Move root level dirs
['context', 'hooks', 'utils', 'services', 'data', 'types', 'styles', 'config'].forEach(dir => {
    moveDirContents(dir, `src/${dir}`);
});

console.log('Saving project...');
project.saveSync();
console.log('Done.');
