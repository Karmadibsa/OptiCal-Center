/**
 * generate_recipes.js — Générateur de manifest.json
 *
 * Scanne les dossiers plaisir/, batch/ et la racine recipes/.
 * Fusionne les données du frontmatter .md avec les champs JSON-only
 * du manifest existant (notamment l'array `ingredients` des recettes batch).
 *
 * Ordre de sortie : plaisir → racine → batch
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const RECIPES_DIR   = path.join(__dirname, '../public/recipes');
const MANIFEST_FILE = path.join(RECIPES_DIR, 'manifest.json');

// Dossiers à scanner, dans l'ordre d'apparition dans le manifest final
const SCAN_FOLDERS = [
    { subdir: 'plaisir', prefix: 'plaisir/' },
    { subdir: '',        prefix: ''         },   // racine (pain, recettes spéciales…)
    { subdir: 'batch',   prefix: 'batch/'   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSlug(str) {
    if (!str) return 'recette_inconnue';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString().substring(0, 6);
}

/**
 * Parse le bloc frontmatter YAML entre les --- d'un fichier .md.
 * Renvoie { data: {key: stringValue, ...} } ou null si pas de frontmatter.
 */
function parseFrontmatter(content) {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return null;

    const data = {};
    match[1].split('\n').forEach(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) return;
        const key   = line.slice(0, colonIdx).trim();
        let   value = line.slice(colonIdx + 1).trim();
        // Retirer les guillemets optionnels
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        data[key] = value;
    });

    return data;
}

/**
 * Convertit les valeurs string du frontmatter en types corrects pour le manifest.
 * Préserve les champs JSON-only de l'entrée existante (ingredients, etc.).
 */
function buildEntry(filePath, frontmatter, existingEntry) {
    // ── Champs booléens ──────────────────────────────────────────────────────
    const boolFields = ['scalable', 'has_pst'];

    // ── Champs texte/string ──────────────────────────────────────────────────
    const stringFields = [
        'name', 'category', 'cook_coef',
        'kcal', 'prot', 'lip', 'glu', 'price',
        'prep_active', 'prep_inactive', 'prep',
        'description', 'tips', 'emoji',
        'base_unit', 'recipe_yield',
    ];

    const entry = { file: filePath };

    // ID : préserver celui du frontmatter, sinon celui du manifest existant,
    //      sinon générer un hash (ne jamais écraser un ID 6000xx existant)
    const fmId  = frontmatter.id && frontmatter.id !== 'undefined' ? String(frontmatter.id) : null;
    const exId  = existingEntry?.id ? String(existingEntry.id) : null;
    entry.id    = fmId || exId || hashString(generateSlug(frontmatter.name || filePath));

    // Champs booléens
    boolFields.forEach(f => {
        if (f in frontmatter) entry[f] = frontmatter[f] === 'true';
    });

    // Champs string
    stringFields.forEach(f => {
        if (frontmatter[f] !== undefined) entry[f] = frontmatter[f];
    });

    // ── Champs JSON-only (pas dans le .md) : préserver depuis l'existant ─────
    // ingredients : array complet des ingrédients batch (cook_group, role, qty_g, macros…)
    if (existingEntry?.ingredients) {
        entry.ingredients = existingEntry.ingredients;
    }

    return entry;
}

// ─── Script principal ─────────────────────────────────────────────────────────

function generateManifest() {
    if (!fs.existsSync(RECIPES_DIR)) {
        console.error('❌ Dossier recipes introuvable :', RECIPES_DIR);
        process.exit(1);
    }

    // Charger le manifest existant (pour préserver ingredients, etc.)
    let existing = [];
    if (fs.existsSync(MANIFEST_FILE)) {
        try {
            existing = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
        } catch (e) {
            console.warn('⚠️  manifest.json illisible, il sera entièrement reconstruit.');
        }
    }
    // Index par chemin de fichier relatif
    const existingByFile = {};
    existing.forEach(e => { if (e.file) existingByFile[e.file] = e; });

    const manifest = [];
    let total = 0;
    let skipped = 0;

    for (const { subdir, prefix } of SCAN_FOLDERS) {
        const folderPath = subdir
            ? path.join(RECIPES_DIR, subdir)
            : RECIPES_DIR;

        if (!fs.existsSync(folderPath)) continue;

        // Lister les .md du dossier courant (non-récursif, exclut les fichiers _ et les sous-dossiers)
        const files = fs.readdirSync(folderPath)
            .filter(f => {
                if (!f.endsWith('.md') || f.startsWith('_')) return false;
                // Pour la racine : exclure les dossiers qui se terminent en .md (peu probable mais sûr)
                const stat = fs.statSync(path.join(folderPath, f));
                return stat.isFile();
            })
            .sort();

        if (files.length === 0) continue;

        console.log(`\n📁 ${subdir || 'racine'}/  (${files.length} fichier(s))`);

        for (const file of files) {
            const absPath  = path.join(folderPath, file);
            const relPath  = prefix + file;   // ex: "batch/bolognaise_lentilles.md"
            const content  = fs.readFileSync(absPath, 'utf-8');
            const fm       = parseFrontmatter(content);

            if (!fm) {
                console.warn(`  ⚠️  Pas de frontmatter : ${relPath} (ignoré)`);
                skipped++;
                continue;
            }
            if (!fm.name) {
                console.warn(`  ⚠️  Champ "name" manquant : ${relPath} (ignoré)`);
                skipped++;
                continue;
            }

            const existingEntry = existingByFile[relPath];
            const entry = buildEntry(relPath, fm, existingEntry);

            manifest.push(entry);
            total++;

            const isNew = !existingEntry ? ' [NEW]' : '';
            console.log(`  ✓ ${entry.id}  ${entry.name}${isNew}`);
        }
    }

    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

    console.log('\n' + '─'.repeat(50));
    console.log(`✅ manifest.json mis à jour`);
    console.log(`   ${total} recette(s) générée(s)${skipped ? ` · ${skipped} ignorée(s)` : ''}`);
    console.log(`   Batch   : ${manifest.filter(r => r.scalable === true).length}`);
    console.log(`   Plaisir : ${manifest.filter(r => !r.scalable && r.category?.startsWith('plats')).length}`);
    console.log('─'.repeat(50));
}

generateManifest();
