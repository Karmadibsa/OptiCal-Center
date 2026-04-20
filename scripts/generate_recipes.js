import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECIPES_DIR = path.join(__dirname, '../public/recipes');
const MANIFEST_FILE = path.join(RECIPES_DIR, 'manifest.json');

function generateSlug(str) {
    if (!str) return 'recette_inconnue';
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Retire les accents
        .replace(/[^a-z0-9]+/g, "_")     // Remplace les caractères non-alphanumériques par '_'
        .replace(/(^_|_$)/g, "");        // Retire les '_' au début et à la fin
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString().substring(0, 6); // Renvoyer un identifiant positif sur 6 chiffres max
}

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

    return { data, fullYaml: yaml, matchText: match[0], contentBody: content.slice(match[0].length) };
}

function generateManifest() {
    if (!fs.existsSync(RECIPES_DIR)) {
        console.error("Dossier recipes introuvable :", RECIPES_DIR);
        return;
    }

    const files = fs.readdirSync(RECIPES_DIR).filter(file => file.endsWith('.md'));
    const manifest = [];
    let renamedCount = 0;

    files.forEach(file => {
        const oldFilePath = path.join(RECIPES_DIR, file);
        let content = fs.readFileSync(oldFilePath, 'utf-8');
        const parsed = parseFrontmatter(content);

        if (parsed && parsed.data.name) {
            // Slug & ID
            const slug = generateSlug(parsed.data.name);
            const expectedId = hashString(slug);
            let finalFilename = file;
            let currentYaml = parsed.fullYaml;
            let fileChanged = false;

            // Update ID in Frontmatter if it doesn't match or is missing
            if (String(parsed.data.id) !== expectedId) {
                const idRegex = /^id:.*$/m;
                if (idRegex.test(currentYaml)) {
                    currentYaml = currentYaml.replace(idRegex, `id: ${expectedId}`);
                } else {
                    currentYaml = `id: ${expectedId}\n` + currentYaml;
                }
                parsed.data.id = expectedId;
                fileChanged = true;
            }

            // Rewrite file content if YAML changed
            if (fileChanged) {
                const newContent = `---\n${currentYaml}\n---` + parsed.contentBody;
                fs.writeFileSync(oldFilePath, newContent);
                content = newContent; // update content references
            }

            // Rename file if needed
            const expectedFilename = `${slug}.md`;
            if (file !== expectedFilename) {
                const newFilePath = path.join(RECIPES_DIR, expectedFilename);
                if (!fs.existsSync(newFilePath) || oldFilePath === newFilePath) {
                    fs.renameSync(oldFilePath, newFilePath);
                    console.log(`Renommé: "${file}" -> "${expectedFilename}"`);
                    finalFilename = expectedFilename;
                    renamedCount++;
                } else {
                    console.warn(`⚠️ Impossible de renommer "${file}" en "${expectedFilename}" car le fichier cible existe déjà.`);
                }
            }

            // Add to manifest
            manifest.push({
                file: finalFilename,
                ...parsed.data
            });
        } else if (parsed) {
            // Add to manifest even without name
            manifest.push({
                file: file,
                ...parsed.data
            });
        }
    });

    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
    console.log(`Manifest généré avec succès ! (${manifest.length} recettes)`);
    if (renamedCount > 0) {
        console.log(`${renamedCount} fichier(s) renommé(s).`);
    }
}

generateManifest();
