import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECIPES_DIR = path.join(__dirname, '../public/recipes');
const MANIFEST_FILE = path.join(RECIPES_DIR, 'manifest.json');

function parseFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    
    if (!match) return null;
    
    const yaml = match[1];
    const data = {};
    
    yaml.split('\n').forEach(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
            const key = line.slice(0, colonIdx).trim();
            let value = line.slice(colonIdx + 1).trim();
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            data[key] = value;
        }
    });

    // Content without frontmatter
    const markdownContent = content.slice(match[0].length).trim();
    
    return { data, content: markdownContent };
}

function generateManifest() {
    if (!fs.existsSync(RECIPES_DIR)) {
        console.error("Dossier recipes introuvable :", RECIPES_DIR);
        return;
    }

    const files = fs.readdirSync(RECIPES_DIR).filter(file => file.endsWith('.md'));
    const manifest = [];

    files.forEach(file => {
        const filePath = path.join(RECIPES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = parseFrontmatter(content);

        if (parsed) {
            manifest.push({
                file: file,
                ...parsed.data
            });
        }
    });

    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
    console.log(`Manifest généré avec succès ! (${manifest.length} recettes)`);
}

generateManifest();
