import fs from 'fs';
import path from 'path';

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            filelist = walkSync(filepath, filelist);
        } else {
            filelist.push(filepath);
        }
    });
    return filelist;
};

const files = walkSync('./components/resumos-dgpm');
files.forEach(f => {
    if (f.endsWith('.tsx') || f.endsWith('.ts')) {
        let content = fs.readFileSync(f, 'utf8');
        content = content.replace(/<div className="w-full text-left">\n/g, ''); // Removes the stray injected div
        content = content.replace(/<div className="w-full text-left">/g, ''); // Safety net
        fs.writeFileSync(f, content, 'utf8');
    }
});
console.log('Cleanup Fix Done!');
