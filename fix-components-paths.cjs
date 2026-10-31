const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const srcDir = path.join(projectRoot, 'src');

// Map of old import suffixes to new import suffixes
const replacements = [
    // Auth
    ['@/components/Login', '@/features/auth/Login'],
    ['@/components/Perfil', '@/features/auth/Perfil'],
    ['@/components/UsuariosManagement', '@/features/auth/UsuariosManagement'],

    // Pericia Menor
    ['@/components/PericiaMenor', '@/features/pericia-menor/PericiaMenor'],
    ['@/components/PericiaMenorDetalhe', '@/features/pericia-menor/PericiaMenorDetalhe'],
    ['@/components/ResponsavelTermoModal', '@/features/pericia-menor/ResponsavelTermoModal'],
    ['@/components/periciaMenor', '@/features/pericia-menor/periciaMenor'],
    
    // Concursos
    ['@/components/ConcursosGuide', '@/features/concursos/ConcursosGuide'],
    ['@/components/ConcursosJRS', '@/features/concursos/ConcursosJRS'],
    ['@/components/concursos', '@/features/concursos/concursos'],
    
    // Pareceres
    ['@/components/Pareceres', '@/features/pareceres/Pareceres'],
    ['@/components/pareceres', '@/features/pareceres/pareceres'],
    
    // Estudo
    ['@/components/DiseaseGuide', '@/features/estudo/DiseaseGuide'],
    ['@/components/CasosPericiais', '@/features/estudo/CasosPericiais'],
    ['@/components/ExamesGuide', '@/features/estudo/ExamesGuide'],
    ['@/components/Infograficos', '@/features/estudo/Infograficos'],
    ['@/components/Videos', '@/features/estudo/Videos'],
    ['@/components/Apresentacoes', '@/features/estudo/Apresentacoes'],
    
    // Normas
    ['@/components/PortariaGuide', '@/features/normas/PortariaGuide'],
    ['@/components/DGPM406Guide', '@/features/normas/DGPM406Guide'],
    ['@/components/LawReference', '@/features/normas/LawReference'],
    ['@/components/LegislacaoForm', '@/features/normas/LegislacaoForm'],
    
    // Beneficios
    ['@/components/Inspecoes', '@/features/beneficios/Inspecoes'],
    ['@/components/inspecoes', '@/features/beneficios/inspecoes'],
    ['@/components/CidInaptidaoModal', '@/features/beneficios/CidInaptidaoModal'],
    ['@/components/MotivoIdmModal', '@/features/beneficios/MotivoIdmModal'],
    ['@/components/Militares', '@/features/beneficios/Militares'],
    ['@/components/militares', '@/features/beneficios/militares'],
    
    // App
    ['@/components/Home', '@/app/Home'],
    ['@/components/Raiz', '@/app/Raiz'],
    ['@/components/ErroFatal', '@/app/ErroFatal'],
    
    // Layout and UI
    ['@/components/shell', '@/components/layout'],
    ['@/components/ui', '@/components/ui'], // No change, but some imports might still have it wrong if they were relative
];

function processFile(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Fix the `@/components/...` imports
    for (const [oldPath, newPath] of replacements) {
        // we use a regex to ensure we match the exact string or string prefix
        const regex = new RegExp(`from\\s+['"]${oldPath.replace(/\//g, '\\/')}['"]`, 'g');
        content = content.replace(regex, `from '${newPath}'`);
        
        // Also catch dynamic imports
        const dynRegex = new RegExp(`import\\(['"]${oldPath.replace(/\//g, '\\/')}['"]\\)`, 'g');
        content = content.replace(dynRegex, `import('${newPath}')`);
        
        // Also catch subpath imports like @/components/concursos/X
        const subRegex = new RegExp(`from\\s+['"]${oldPath.replace(/\//g, '\\/')}/([^'"]+)['"]`, 'g');
        content = content.replace(subRegex, `from '${newPath}/$1'`);
        
        // And dynamic subpaths
        const subDynRegex = new RegExp(`import\\(['"]${oldPath.replace(/\//g, '\\/')}/([^'"]+)['"]\\)`, 'g');
        content = content.replace(subDynRegex, `import('${newPath}/$1')`);
    }
    
    // 2. Fix the firebase-applet-config.json
    // It was `../firebase-applet-config.json` inside src/services/, which is now `@/../firebase-applet-config.json` 
    // or we can just replace it with `../../firebase-applet-config.json`
    content = content.replace(/from\s+['"]\.\.\/firebase-applet-config\.json['"]/g, `from '../../firebase-applet-config.json'`);
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules') continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else {
            processFile(fullPath);
        }
    }
}

walkDir(srcDir);
// Also process scripts/ and server.ts
walkDir(path.join(projectRoot, 'scripts'));
processFile(path.join(projectRoot, 'server.ts'));
processFile(path.join(projectRoot, 'src/index.tsx')); // Just in case it was missed

console.log('Done mapping components!');
