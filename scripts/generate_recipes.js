/**
 * generate_recipes.js — Générateur de manifest.json
 *
 * Scanne les dossiers plaisir/, batch/ et la racine recipes/.
 * Fusionne les données du frontmatter .md avec les champs JSON-only
 * du manifest existant (notamment l'array `ingredients` des recettes batch).
 *
 * Auto-parsing ingrédients : si une recette batch (scalable: true) n'a pas
 * encore d'ingrédients dans le manifest, le script lit la table
 * "### 📊 Matrice des Ingrédients" du fichier .md et génère l'array automatiquement.
 * Les ingrédients déjà présents dans le manifest sont TOUJOURS préservés
 * (les saisies manuelles ont priorité sur l'auto-parse).
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
        .replace(/[̀-ͯ]/g, '')
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

// ─── Auto-parse ingrédients depuis la table Markdown ─────────────────────────

/**
 * Normalise un texte pour la comparaison : minuscules, sans accents.
 */
function norm(s) {
    // NFD ne décompose PAS les ligatures œ/æ : on les remplace explicitement,
    // sinon "Œufs" ne matche jamais le mot-clé "oeuf".
    return (s || '')
        .toLowerCase()
        .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .trim();
}

/**
 * Mappe le texte de rôle d'un ingrédient vers l'enum interne.
 * Utilise le texte de la colonne "Rôle" ET le nom de l'ingrédient comme fallback.
 */
function mapRole(roleText, ingName) {
    const rt = norm(roleText);
    const nm = norm(ingName);

    // Féculent explicite ("Féculent") — prioritaire
    if (rt.includes('feculent'))
        return 'feculent';

    // Protéine (avec glucides associés) — AVANT le test "glucides", sinon
    // "Protéine + Glucides" serait classé féculent (thon/poulet/lentilles dans
    // les féculents de la liste de courses).
    // NB : les haricots VERTS sont un légume, pas une légumineuse.
    const isHaricotSec = nm.includes('haricot') && !nm.includes('vert');
    if (rt.includes('proteine') || rt.includes('protein') ||
        /\bpst\b/.test(nm) || nm.includes('edamame') ||
        nm.includes('lentille') || nm.includes('pois chiche') || isHaricotSec ||
        nm.includes('thon') || nm.includes('poulet') || nm.includes('dinde') ||
        nm.includes('boeuf') || nm.includes('oeuf'))
        return 'protein_glu';

    // Féculent implicite (rôle "Glucidique" / "Glucides")
    if (rt.includes('glucidique') || rt.includes('glucides'))
        return 'feculent';

    // Lipides (matières grasses, produits laitiers gras, fromages)
    if (rt.includes('lipide') || rt.includes('corps gras') || rt.includes('onctu') ||
        rt.includes('porn food') || rt.includes('topping fondant') || rt.includes('gourmand') ||
        nm.includes('huile') || nm.includes('beurre') || nm.includes('creme') ||
        nm.includes('cheddar') || nm.includes('parmesan') || nm.includes('mozzarella') ||
        nm.includes('grana') || nm.includes('fromage') || nm.includes('lait'))
        return 'lipide';

    // Légumes & sauces à base de légumes
    if (rt.includes('legume') || rt.includes('legumineuse') || rt.includes('fraicheur') ||
        rt.includes('touche sucree') || rt.includes('corps de la sauce') ||
        nm.includes('tomate') || nm.includes('carotte') || nm.includes('courgette') ||
        nm.includes('mais') || nm.includes('courge') || nm.includes('butternut') ||
        nm.includes('potimarron') || nm.includes('cerise') || nm.includes('patate douce'))
        return 'legume';

    return 'aromatique';
}

/**
 * Parse la table "📊 Matrice des Ingrédients" d'un fichier .md batch.
 * Retourne un array d'objets ingrédients compatible manifest.json.
 * Retourne [] si la table est absente ou mal formée.
 *
 * Format attendu :
 * | Ingrédient | Qty Base | Unité | Kcal/100g | Prot | Lip | Glu | Rôle |
 */
/**
 * Détecte, depuis le protocole, quels types d'ingrédients sont PRÉ-CUITS à part.
 * Conservateur : uniquement mots-clés explicites (pré-cuire / réhydrater / préalablement cuit).
 * Ne flague PAS les légumineuses mises sèches dans la sauce (corail, conserve).
 * Retourne un Set de mots-clés : 'lentille', 'pst', 'pois chiche'.
 */
function detectPrecookKeywords(content) {
    const kws = new Set();
    const protoMatch = content.match(/### Protocole[\s\S]*?(?=\n###|$)/);
    const np = norm(protoMatch ? protoMatch[0] : '');
    if (/(pre-?cui|prealablement cuit)[^.]{0,60}lentille|lentille[^.]{0,60}(pre-?cui|prealablement cuit)|cuisez les lentilles|cuire les lentilles/.test(np)) kws.add('lentille');
    if (/rehydrat[^.]{0,40}pst|pst[^.]{0,40}rehydrat|rehydratation des pst/.test(np)) kws.add('pst');
    if (/(pre-?cui|prealablement cuit|bouilli)[^.]{0,60}pois chiche|pois chiche[^.]{0,60}(cuire|bouilli)[^.]{0,40}(reserv|egoutt)/.test(np)) kws.add('pois chiche');
    return kws;
}

function parseIngredientTable(content, recipeName) {
    if (!content) return [];

    const precookKw = detectPrecookKeywords(content);
    const lines = content.split('\n');

    // Trouver l'en-tête : ligne contenant "Qty Base" et "Kcal"
    let headerIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Qty Base') && lines[i].includes('Kcal')) {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx === -1) return [];

    // Groupe sauce dérivé des 2 premiers mots du nom de la recette
    const slug       = generateSlug(recipeName || '');
    const sauceGroup = 'sauce_' + slug.split('_').slice(0, 2).join('_');

    const ingredients = [];

    for (let i = headerIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('|')) break;               // Fin de table
        if (/^\|[\s|:\-]+\|$/.test(line)) continue;    // Ligne séparateur ---

        // Découper par | (ignorer les cellules vides de début/fin)
        const cells = line.split('|')
            .map(c => c.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

        if (cells.length < 7) continue;

        const [rawName, qtyStr, , kcalStr, protStr, lipStr, gluStr, roleText] = cells;
        const name  = rawName.trim();
        const qty_g = parseFloat(qtyStr) || 0;
        if (!name || qty_g === 0) continue;

        const kcal_100 = parseFloat(kcalStr) || 0;
        const prot_100 = parseFloat(protStr) || 0;
        const lip_100  = parseFloat(lipStr)  || 0;
        const glu_100  = parseFloat(gluStr)  || 0;

        const role   = mapRole(roleText || '', name);
        const is_pst = /\bpst\b/i.test(name);

        // ── Cook group ────────────────────────────────────────────────────────
        let cook_group;
        if (role === 'feculent') {
            const nl = norm(name);
            if (nl.includes('riz') || nl.includes('basmati'))             cook_group = 'riz';
            else if (nl.includes('pate') || nl.includes('pasta') ||
                     nl.includes('coquillette') || nl.includes('penne'))  cook_group = 'pates';
            else if (nl.includes('ebly') || nl.includes('ble precuit'))   cook_group = 'ebly';
            else if (nl.includes('gnocchi'))                               cook_group = 'gnocchis';
            else                                                           cook_group = sauceGroup;
        } else {
            cook_group = sauceGroup;
        }

        // fixed_qty : épices/aromates en petite quantité (≤ 10g) — non scalés
        const fixed_qty = (role === 'aromatique' && qty_g <= 10);

        const ing = { name, qty_g, kcal_100, prot_100, lip_100, glu_100, role, cook_group, is_pst };
        if (fixed_qty) ing.fixed_qty = true;
        // precook : légumineuse sèche / PST détectée comme pré-cuite dans le protocole
        const nl = norm(name);
        if ([...precookKw].some(kw => nl.includes(kw))) ing.precook = true;
        ingredients.push(ing);
    }

    return ingredients;
}

// ─── Construire une entrée manifest ──────────────────────────────────────────

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
    // ingredients : toujours préservé depuis le manifest (saisie manuelle ou auto-parse précédent)
    if (existingEntry?.ingredients && existingEntry.ingredients.length > 0) {
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
    let total         = 0;
    let skipped       = 0;
    let autoParsed    = 0;
    const missingIngs = [];   // recettes scalables sans ingrédients après tentative

    for (const { subdir, prefix } of SCAN_FOLDERS) {
        const folderPath = subdir
            ? path.join(RECIPES_DIR, subdir)
            : RECIPES_DIR;

        if (!fs.existsSync(folderPath)) continue;

        // Lister les .md du dossier courant (non-récursif, exclut les fichiers _ et les sous-dossiers)
        const files = fs.readdirSync(folderPath)
            .filter(f => {
                if (!f.endsWith('.md') || f.startsWith('_')) return false;
                const stat = fs.statSync(path.join(folderPath, f));
                return stat.isFile();
            })
            .sort();

        if (files.length === 0) continue;

        console.log(`\n📁 ${subdir || 'racine'}/  (${files.length} fichier(s))`);

        for (const file of files) {
            const absPath  = path.join(folderPath, file);
            const relPath  = prefix + file;
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
            const entry         = buildEntry(relPath, fm, existingEntry);

            // ── Auto-parse ingrédients si manquants ──────────────────────────
            // Ne s'applique qu'aux recettes batch scalables sans ingrédients existants.
            const isScalable = entry.scalable === true || entry.scalable === 'true';
            if (isScalable && (!entry.ingredients || entry.ingredients.length === 0)) {
                const autoIng = parseIngredientTable(content, fm.name || '');
                if (autoIng.length > 0) {
                    entry.ingredients = autoIng;
                    autoParsed++;
                    console.log(`  ✓ ${entry.id}  ${entry.name}  📊 ${autoIng.length} ingrédients auto-parsés`);
                } else {
                    missingIngs.push(entry.name);
                    console.log(`  ✓ ${entry.id}  ${entry.name}  ⚠️  table ingrédients introuvable`);
                }
            } else {
                const isNew = !existingEntry ? ' [NEW]' : '';
                console.log(`  ✓ ${entry.id}  ${entry.name}${isNew}`);
            }

            manifest.push(entry);
            total++;
        }
    }

    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

    console.log('\n' + '─'.repeat(50));
    console.log(`✅ manifest.json mis à jour`);
    console.log(`   ${total} recette(s) générée(s)${skipped ? ` · ${skipped} ignorée(s)` : ''}`);
    console.log(`   Batch   : ${manifest.filter(r => r.scalable === true).length}`);
    console.log(`   Plaisir : ${manifest.filter(r => !r.scalable && r.category?.startsWith('plats')).length}`);
    if (autoParsed > 0) {
        console.log(`   📊 ${autoParsed} recette(s) avec ingrédients auto-parsés depuis le .md`);
    }
    if (missingIngs.length > 0) {
        console.log(`\n⚠️  Table ingrédients manquante pour :`);
        missingIngs.forEach(n => console.log(`   • ${n}`));
        console.log(`   → Ajoutez "### 📊 Matrice des Ingrédients" dans le fichier .md`);
    }
    console.log('─'.repeat(50));
}

generateManifest();
