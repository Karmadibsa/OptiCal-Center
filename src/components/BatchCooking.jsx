import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChefHat, ShoppingCart, Copy, Check, Shuffle, Upload, Download, BookOpen, X } from 'lucide-react';
import { scaleRecipeForMeal, calculatePlan, computeGlycemic, getSocleItems, getRecipeTags, GL_MEAL_LOW, GL_MEAL_MID } from '../utils/dietAlgo';

// Émoji par tag pour la barre de filtres
const TAG_META = {
    chaud: '🔥', froid: '❄️', 'pâtes': '🍝', riz: '🍚', ebly: '🌾', gnocchis: '🥟',
    'patate douce': '🍠', PST: '🫛', 'légumineuses': '🫘', thon: '🐟',
};

// Groupes de filtres (affichés triés par catégorie)
const TAG_GROUPS = [
    { label: 'Température', tags: ['chaud', 'froid'] },
    { label: 'Féculent',    tags: ['pâtes', 'riz', 'ebly', 'gnocchis', 'patate douce'] },
    { label: 'Protéine',    tags: ['PST', 'légumineuses', 'thon'] },
];

// Couleur d'un niveau de charge glycémique (CG lissée d'un repas)
const glColor = (gl) => gl <= GL_MEAL_LOW ? '#4ade80' : gl <= GL_MEAL_MID ? '#fbbf24' : '#f87171';

const DAYS  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MAX_RECIPES = 5; // nombre max de plats différents sélectionnables par semaine
const MEALS = ['midi', 'soir'];
const LS_KEY = 'batch_cooking_v2';

// ─── Persistance localStorage ────────────────────────────────────────────────
const loadState = () => {
    try {
        const s = localStorage.getItem(LS_KEY);
        if (s) return JSON.parse(s);
    } catch (_) {}
    return { selectedIds: [], weekPlan: {}, measuredCooked: {}, disabledSlots: {} };
};
const saveState = (selectedIds, weekPlan, measuredCooked, disabledSlots) => {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify({ selectedIds, weekPlan, measuredCooked, disabledSlots }));
    } catch (_) {}
};

// ─── Formatte l'affichage d'un ingrédient selon son type ─────────────────────
// Oignon (unit='pc') → pièces · Huile → c.à.s (1=13.5g) · Épices (fixed_qty) → c.à.c (1≈3g) · reste → g
const fmtIng = (name, raw_g, unit, g_per_pc, fixed_qty) => {
    // Unit générique : si unit défini et non 'g', on affiche en unités (gousses, L, pc...)
    if (unit && unit !== 'g' && g_per_pc)
        return `${Math.max(1, Math.round(raw_g / g_per_pc))} ${unit}`;
    const nl = (name || '').toLowerCase();
    if (nl.includes('huile'))
        return `${(raw_g / 13.5).toFixed(1)} c.à.s`;
    if (fixed_qty)
        return `${Math.max(1, Math.round(raw_g / 3))} c.à.c`;
    return `${Math.round(raw_g)} g`;
};

// ─── Normalisation nom d'ingrédient pour déduplication liste de courses ──────
// Supprime les parenthèses et met en minuscules pour fusionner "Riz (cru)" et "Riz"
const normalizeIngName = (name) =>
    name.toLowerCase().replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();

// ─── Noms canoniques : homogénéise les variantes d'un même ingrédient ────────
// Ex : "Riz basmati (cru)", "Riz long grain", "Riz (cru)" → un seul "Riz" (on
// n'utilise qu'un seul type). Sert à fusionner les lignes de la liste de courses.
// Règles ordonnées (mot-clé sans accent → nom canonique), 1re correspondance gagne.
const CANON_RULES = [
    ['maizena', 'Maïzena'],
    ['riz', 'Riz'],
    ['gnocchi', 'Gnocchis'],
    ['ebly', 'Ebly'],
    ['pate complet', 'Pâtes complètes'], ['pates complet', 'Pâtes complètes'], ['pate', 'Pâtes'],
    ['pst', 'PST'],
    ['carotte', 'Carottes'],
    ['courgette', 'Courgettes'],
    ['mais', 'Maïs'],
    ['epice', 'Épices'],
];
const canonIngredientName = (name) => {
    const n = normalizeIngName(name).normalize('NFD').replace(/[̀-ͯ]/g, '');
    for (const [kw, canon] of CANON_RULES) if (n.includes(kw)) return canon;
    return name;
};

// ─── Groupes féculents / à pré-cuire (à cuire séparément, à peser cuit) ───────
const FECULENT_GK = new Set(['riz', 'pates', 'ebly']);

// Groupes synthétiques de pré-cuisson (ingrédients precook:true) + leurs labels
const PRECOOK_GK = { pst: 'precuisson_pst', legumineuses: 'precuisson_legumineuses' };
const COOK_FIRST_LABELS = {
    precuisson_pst:          '🫛 PST à réhydrater — À FAIRE D\'ABORD',
    precuisson_legumineuses: '🫘 Légumineuses sèches à cuire — À FAIRE D\'ABORD',
};
// Un groupe "à cuire d'abord" = féculent à peser OU pré-cuisson
const isCookFirst = (gk) => FECULENT_GK.has(gk) || gk.startsWith('precuisson_');

const BatchCooking = ({ profiles }) => {
    const init = loadState();
    const [recipes,        setRecipes]        = useState([]);   // batch (scalable uniquement)
    const [loading,        setLoading]        = useState(true);
    const [selectedIds,    setSelectedIds]    = useState(init.selectedIds    || []);
    const [weekPlan,       setWeekPlan]       = useState(init.weekPlan       || {});
    const [measuredCooked, setMeasuredCooked] = useState(init.measuredCooked || {});
    const [disabledSlots,  setDisabledSlots]  = useState(init.disabledSlots  || {});
    const [activeView,     setActiveView]     = useState('shopping');
    const [copied,         setCopied]         = useState(false);
    const [fsCopied,       setFsCopied]       = useState(false);
    const [filterTags,     setFilterTags]     = useState([]);     // filtres tags actifs (multi-sélection)
    const [importCode,     setImportCode]     = useState('');
    const [syncMsg,        setSyncMsg]        = useState('');
    const [showSync,       setShowSync]       = useState(false);
    const [previewRecipe,  setPreviewRecipe]  = useState(null);   // recette prévisualisée
    const [previewMd,      setPreviewMd]      = useState('');     // contenu markdown brut
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [priceDb,        setPriceDb]        = useState([]);     // base de données des prix
    const [doneCookGroups,  setDoneCookGroups]  = useState({});    // cuisson : étapes cochées
    const [checkedShopItems, setCheckedShopItems] = useState({});  // courses : items cochés
    const [doneSteps, setDoneSteps] = useState(() => {             // protocole : étapes cochées (persisté)
        try { return JSON.parse(localStorage.getItem('bc_done_steps') || '{}'); } catch { return {}; }
    });
    useEffect(() => { localStorage.setItem('bc_done_steps', JSON.stringify(doneSteps)); }, [doneSteps]);
    const [recipeSteps, setRecipeSteps] = useState({});           // id → étapes du protocole (pour "prochaine étape")

    // Helper : slot désactivé ?
    const isSlotDisabled = (day, meal) => !!disabledSlots[`${day}_${meal}`];
    const toggleSlot = (day, meal) => {
        const key = `${day}_${meal}`;
        setDisabledSlots(prev => { const n = { ...prev }; if (n[key]) delete n[key]; else n[key] = true; return n; });
    };

    // ── Chargement recettes scalables + base prix ────────────────────────────
    useEffect(() => {
        const base = import.meta.env.BASE_URL || '/';
        Promise.all([
            fetch(`${base}recipes/manifest.json`).then(r => r.json()),
            fetch(`${base}recipes/ingredients_prix.json`).then(r => r.json()).catch(() => []),
        ]).then(([manifest, prix]) => {
            setRecipes(manifest.filter(r => r.scalable === true || r.scalable === 'true'));
            setPriceDb(prix);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    // ── Chargement des protocoles des recettes du plan (pour "prochaine étape") ──
    useEffect(() => {
        if (recipes.length === 0) return;
        const base = import.meta.env.BASE_URL || '/';
        const ids = new Set();
        DAYS.forEach(d => MEALS.forEach(m => { if (!disabledSlots[`${d}_${m}`]) { const id = weekPlan[d]?.[m]; if (id) ids.add(id); } }));
        const missing = [...ids].filter(id => !recipeSteps[id]);
        if (missing.length === 0) return;
        const parseProto = (md) => {
            const steps = []; let inSec = false;
            (md || '').split('\n').forEach(line => {
                if (/^###\s+Protocole/.test(line)) { inSec = true; return; }
                if (inSec && /^###/.test(line)) inSec = false;
                if (inSec && /^\d+\./.test(line.trim())) steps.push(line.trim().replace(/^\d+\.\s*/, ''));
            });
            return steps;
        };
        Promise.all(missing.map(id => {
            const r = recipes.find(x => x.id === id);
            if (!r?.file) return Promise.resolve([id, []]);
            return fetch(`${base}recipes/${r.file}`).then(res => res.text()).then(t => [id, parseProto(t)]).catch(() => [id, []]);
        })).then(pairs => setRecipeSteps(prev => { const n = { ...prev }; pairs.forEach(([id, s]) => { n[id] = s; }); return n; }));
    }, [weekPlan, disabledSlots, recipes]); // eslint-disable-line

    // ── Sync localStorage ─────────────────────────────────────────────────────
    useEffect(() => {
        saveState(selectedIds, weekPlan, measuredCooked, disabledSlots);
    }, [selectedIds, weekPlan, measuredCooked, disabledSlots]);

    // ── Fetch markdown quand on ouvre la prévisualisation ─────────────────────
    useEffect(() => {
        if (!previewRecipe?.file) { setPreviewMd(''); return; }
        setLoadingPreview(true);
        const base = import.meta.env.BASE_URL || '/';
        fetch(`${base}recipes/${previewRecipe.file}`)
            .then(r => r.text())
            .then(text => { setPreviewMd(text); setLoadingPreview(false); })
            .catch(() => { setPreviewMd(''); setLoadingPreview(false); });
    }, [previewRecipe]);

    // ── Nettoyage plan si recette désélectionnée ──────────────────────────────
    const cleanPlan = useCallback((ids, plan) => {
        const next = {};
        DAYS.forEach(day => {
            const d = plan[day] || {};
            next[day] = {};
            MEALS.forEach(m => { if (d[m] && ids.includes(d[m])) next[day][m] = d[m]; });
        });
        return next;
    }, []);

    // ── Sélection recette (max MAX_RECIPES) ───────────────────────────────────
    const toggleRecipe = (id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                const next = prev.filter(x => x !== id);
                setWeekPlan(wp => cleanPlan(next, wp));
                return next;
            }
            if (prev.length >= MAX_RECIPES) return prev;
            return [...prev, id];
        });
    };

    // ── Slot jour+repas ───────────────────────────────────────────────────────
    const setSlot = (day, meal, id) => {
        setWeekPlan(prev => {
            const next = { ...prev, [day]: { ...(prev[day] || {}) } };
            if (id === '') delete next[day][meal];
            else next[day][meal] = id;
            return next;
        });
    };

    // ── Sélection aléatoire de recettes ──────────────────────────────────────
    const randomSelect = () => {
        if (recipes.length === 0) return;
        const shuffled = [...recipes].sort(() => Math.random() - 0.5);
        const picked   = shuffled.slice(0, Math.min(MAX_RECIPES, shuffled.length));
        const ids      = picked.map(r => r.id);
        setSelectedIds(ids);
        setWeekPlan(wp => cleanPlan(ids, wp));
    };

    // ── Auto-dispatch ─────────────────────────────────────────────────────────
    const autoDispatch = () => {
        if (selectedIds.length === 0) return;
        const n    = selectedIds.length;
        const next = {};
        DAYS.forEach((day, d) => {
            next[day] = {
                midi: selectedIds[(d * 2)     % n],
                soir: selectedIds[(d * 2 + 1) % n],
            };
        });
        setWeekPlan(next);
    };

    // ── Scalage mémoïsé ───────────────────────────────────────────────────────
    const getScaled = useCallback((recipeId, personKey, meal) => {
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return null;
        return scaleRecipeForMeal(personKey, profiles, recipe, meal);
    }, [recipes, profiles]);

    // ── Utilitaires comptage ──────────────────────────────────────────────────
    const countAssignedSlots = () => {
        let n = 0;
        DAYS.forEach(d => MEALS.forEach(m => { if (!isSlotDisabled(d, m) && weekPlan[d]?.[m]) n++; }));
        return n;
    };
    const getDaysForRecipeMeal = (recipeId, meal) =>
        DAYS.filter(day => weekPlan[day]?.[meal] === recipeId);

    // ── ÉTAPE 1 : Liste de courses (avec déduplication par normalisation) ─────
    const buildShoppingList = () => {
        const ROLE_TO_GROUP = {
            protein_glu: 'protein', protein: 'protein',
            feculent: 'feculent', legume: 'legume',
            lipide: 'lipide', aromatique: 'aromatique', autre: 'aromatique',
        };
        const GROUP_ORDER = ['protein', 'feculent', 'legume', 'lipide', 'aromatique'];
        const GROUP_META  = {
            protein:    { label: '🫘 Protéines & Légumineuses', color: '#4ade80' },
            feculent:   { label: '🌾 Féculents',                color: '#fbbf24' },
            legume:     { label: '🥦 Légumes',                  color: '#86efac' },
            lipide:     { label: '🫒 Matières Grasses',         color: '#fb923c' },
            aromatique: { label: '🧅 Aromates & Épices',        color: '#94a3b8' },
        };

        // agg[normalizedName] = { display_name, total_g, role, unit, g_per_pc }
        const agg = {};

        DAYS.forEach(day => {
            const plan = weekPlan[day] || {};
            MEALS.forEach(meal => {
                if (isSlotDisabled(day, meal)) return;
                const recipeId = plan[meal];
                if (!recipeId) return;
                const recipe = recipes.find(r => r.id === recipeId);
                if (!recipe) return;
                ['axel', 'prisca'].forEach(person => {
                    const scaled = getScaled(recipeId, person, meal);
                    if (!scaled) return;
                    scaled.ingredients.forEach(ing => {
                        const canon = canonIngredientName(ing.name);
                        const key = normalizeIngName(canon);
                        if (!agg[key]) agg[key] = {
                            display_name: canon,
                            total_g:  0,
                            role:     ing.role    || 'aromatique',
                            unit:     ing.unit    || 'g',
                            g_per_pc: ing.g_per_pc || null,
                        };
                        agg[key].total_g += ing.raw_g;
                    });
                });
            });
        });

        const groups = {};
        Object.values(agg).forEach(({ display_name, total_g, role, unit, g_per_pc }) => {
            const g = ROLE_TO_GROUP[role] || 'aromatique';
            if (!groups[g]) groups[g] = [];
            const raw_g   = Math.round(total_g);
            const display = (unit && unit !== 'g' && g_per_pc)
                ? `${Math.ceil(total_g / g_per_pc)} ${unit}${Math.ceil(total_g / g_per_pc) > 1 && unit === 'pc' ? 's' : ''}`
                : `${raw_g}g`;
            groups[g].push({ name: display_name, raw_g, display });
        });
        Object.values(groups).forEach(arr => arr.sort((a, b) => b.raw_g - a.raw_g));

        return {
            sections: GROUP_ORDER
                .filter(g => groups[g])
                .map(g => ({ group: g, ...GROUP_META[g], items: groups[g] })),
        };
    };

    // ── ÉTAPE 2+3+4 : Données de cuisson par recette×repas ───────────────────
    const buildCuissonData = () => {
        const map = {};

        DAYS.forEach(day => {
            const plan = weekPlan[day] || {};
            MEALS.forEach(meal => {
                if (isSlotDisabled(day, meal)) return;
                const recipeId = plan[meal];
                if (!recipeId) return;
                const recipe = recipes.find(r => r.id === recipeId);
                if (!recipe) return;

                const key = `${recipeId}_${meal}`;
                if (!map[key]) {
                    map[key] = {
                        recipe, meal, count: 0, days: [],
                        axel_scaled:   getScaled(recipeId, 'axel',   meal),
                        prisca_scaled: getScaled(recipeId, 'prisca', meal),
                    };
                }
                map[key].count += 1;
                map[key].days.push(day);
            });
        });

        return Object.values(map).map(entry => {
            const { recipe, meal, count, axel_scaled, prisca_scaled } = entry;

            // Ingrédients totaux (2 personnes × count jours), normalisés pour dédup
            const ingTotalMap = {};
            [axel_scaled, prisca_scaled].forEach(scaled => {
                if (!scaled) return;
                scaled.ingredients.forEach(ing => {
                    const nk = normalizeIngName(ing.name);
                    if (!ingTotalMap[nk]) ingTotalMap[nk] = { name: ing.name, total_g: 0, role: ing.role };
                    ingTotalMap[nk].total_g += ing.raw_g * count;
                });
            });

            const axel_raw_g    = axel_scaled   ? axel_scaled.total_raw_g   * count : 0;
            const prisca_raw_g  = prisca_scaled  ? prisca_scaled.total_raw_g * count : 0;
            const total_raw_g   = axel_raw_g + prisca_raw_g;
            const cook_coef     = parseFloat(recipe.cook_coef) || 1;
            const est_cooked_g  = Math.round(total_raw_g * cook_coef);

            return {
                ...entry,
                ingTotals:    Object.values(ingTotalMap),
                axel_raw_g,
                prisca_raw_g,
                total_raw_g,
                est_cooked_g,
            };
        });
    };

    // ── Cuisson groupée : agréger par cook_group à travers toutes les recettes ──
    const buildCookGroupData = useCallback(() => {
        // Recenser les recipe×meal uniques et leur nombre de jours
        const rmSeen = {}; // `${recipeId}_${meal}` → count
        DAYS.forEach(day => {
            MEALS.forEach(meal => {
                if (isSlotDisabled(day, meal)) return;
                const rid = weekPlan[day]?.[meal];
                if (!rid) return;
                const rk = `${rid}_${meal}`;
                rmSeen[rk] = (rmSeen[rk] || 0) + 1;
            });
        });

        const groups = {}; // groupKey → { gk, label, per_prm, ings, total_g }
        Object.entries(rmSeen).forEach(([rk, count]) => {
            const sepIdx = rk.indexOf('_');
            const recipeId = rk.slice(0, sepIdx);
            const meal     = rk.slice(sepIdx + 1);
            const recipe   = recipes.find(r => r.id === recipeId);
            if (!recipe) return;

            ['axel', 'prisca'].forEach(person => {
                const scaled = getScaled(recipeId, person, meal);
                if (!scaled) return;
                scaled.ingredients.forEach(ing => {
                    // Ingrédient à pré-cuire → sorti de sa sauce vers un groupe "à cuire d'abord"
                    let gk;
                    if (ing.precook) {
                        const n = normalizeIngName(ing.name);
                        gk = (/\bpst\b/.test(n) || n.includes('pst')) ? PRECOOK_GK.pst : PRECOOK_GK.legumineuses;
                    } else {
                        gk = ing.cook_group || rk;
                    }
                    if (!groups[gk]) groups[gk] = { gk, label: COOK_FIRST_LABELS[gk] || gk.replace(/_/g, ' '), cookFirst: isCookFirst(gk), per_prm: {}, ings: {}, total_g: 0 };
                    const grp = groups[gk];

                    // Accumulate per-person per-recipe×meal totals
                    const prmKey = `${person}_${rk}`;
                    if (!grp.per_prm[prmKey]) grp.per_prm[prmKey] = { person, recipe, meal, count, g_per_day: 0 };
                    grp.per_prm[prmKey].g_per_day += ing.raw_g;

                    // Accumulate ingredient totals (nom canonique pour fusionner les variantes)
                    const canon = canonIngredientName(ing.name);
                    const ik = normalizeIngName(canon);
                    if (!grp.ings[ik]) grp.ings[ik] = { name: canon, total_g: 0, unit: ing.unit || 'g', g_per_pc: ing.g_per_pc, fixed_qty: ing.fixed_qty, role: ing.role };
                    grp.ings[ik].total_g += ing.raw_g * count;
                    grp.total_g += ing.raw_g * count;
                });
            });
        });
        // ── Companions : pour chaque groupe sauce, trouver le féculent partenaire ──
        Object.values(groups).forEach(grp => {
            if (isCookFirst(grp.gk)) { grp.companions = []; return; }
            const compSet = new Set();
            Object.values(grp.per_prm).forEach(({ recipe: r, meal }) => {
                (r.ingredients || []).forEach(ing => {
                    if (FECULENT_GK.has(ing.cook_group)) {
                        const fecLabel = ing.cook_group === 'riz' ? 'Riz'
                                       : ing.cook_group === 'pates' ? 'Pâtes' : 'Ebly';
                        compSet.add(`${fecLabel} · ${meal === 'midi' ? 'MIDI' : 'SOIR'}`);
                    }
                });
            });
            grp.companions = [...compSet];
        });

        // ── Tri : "à cuire d'abord" (pré-cuisson + féculents) en tête, puis le reste ──
        const rank = (gk) => gk.startsWith('precuisson_') ? 0 : FECULENT_GK.has(gk) ? 1 : 2;
        return Object.values(groups).sort((a, b) => rank(a.gk) - rank(b.gk));
    }, [weekPlan, disabledSlots, recipes, profiles]); // eslint-disable-line

    // ── Couverture protéines (pour panneau info) ──────────────────────────────
    const computeBatchProteinPerDay = () => {
        const total = { axel: 0, prisca: 0, slots: 0 };
        DAYS.forEach(day => {
            MEALS.forEach(meal => {
                if (isSlotDisabled(day, meal)) return;
                const id = weekPlan[day]?.[meal];
                if (!id) return;
                total.slots++;
                ['axel', 'prisca'].forEach(person => {
                    const s = getScaled(id, person, meal);
                    if (s) total[person] += s.total_prot;
                });
            });
        });
        if (total.slots === 0) return null;
        return {
            axel:   +(total.axel   / DAYS.length).toFixed(1),
            prisca: +(total.prisca / DAYS.length).toFixed(1),
        };
    };

    // ── Charge glycémique par jour (lissage / équilibrage sur la semaine) ──────
    // Somme la CG "lissée" des repas actifs (midi + soir) par jour et par personne,
    // puis calcule la moyenne hebdo pour repérer les jours en "pic" (déséquilibre).
    const computeGlycemicPerDay = () => {
        const days = [];
        DAYS.forEach(day => {
            let axel = 0, prisca = 0, hasMeal = false;
            MEALS.forEach(meal => {
                if (isSlotDisabled(day, meal)) return;
                const id = weekPlan[day]?.[meal];
                if (!id) return;
                hasMeal = true;
                const sa = getScaled(id, 'axel', meal);
                const sp = getScaled(id, 'prisca', meal);
                const ga = sa && computeGlycemic(sa);
                const gp = sp && computeGlycemic(sp);
                if (ga) axel   += ga.gl_smoothed;
                if (gp) prisca += gp.gl_smoothed;
            });
            if (hasMeal) days.push({ day, axel: Math.round(axel), prisca: Math.round(prisca) });
        });
        if (days.length === 0) return null;
        const avgAxel   = Math.round(days.reduce((s, d) => s + d.axel,   0) / days.length);
        const avgPrisca = Math.round(days.reduce((s, d) => s + d.prisca, 0) / days.length);
        return { days, avgAxel, avgPrisca };
    };

    // ── Copie liste de courses (clipboard) ───────────────────────────────────
    const copyShoppingList = () => {
        const { sections } = buildShoppingList();
        const assignedSlots = countAssignedSlots();
        const lines = [`🛒 LISTE DE COURSES — Batch Cooking`, `${assignedSlots} repas × 2 personnes`, ''];
        sections.forEach(sec => {
            const unchecked = sec.items.filter(i => !checkedShopItems[normalizeIngName(i.name)]);
            if (unchecked.length === 0) return;
            lines.push(sec.label);
            unchecked.forEach(i => lines.push(`  • ${i.name} : ${i.display}`));
            lines.push('');
        });
        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    // ── FatSecret : socle fixe + plats par jour, macros complètes par personne ──
    const buildFatSecretData = () => {
        const people = [
            { key: 'axel',   label: 'Axel',   color: '#38bdf8' },
            { key: 'prisca', label: 'Prisca', color: '#a78bfa' },
        ];
        const dayShort = { Lundi: 'Lun', Mardi: 'Mar', Mercredi: 'Mer', Jeudi: 'Jeu', Vendredi: 'Ven', Samedi: 'Sam', Dimanche: 'Dim' };
        return people.map(({ key, label, color }) => {
            const socle = getSocleItems(key, profiles);
            const plan  = calculatePlan(key, profiles);
            // Déduplication : un plat identique (même recette + même repas) n'apparaît
            // qu'UNE fois, avec la liste des jours où il revient (mêmes quantités).
            const dishMap = {};
            DAYS.forEach(day => {
                MEALS.forEach(meal => {
                    if (isSlotDisabled(day, meal)) return;
                    const id = weekPlan[day]?.[meal];
                    if (!id) return;
                    const dk = `${id}_${meal}`;
                    if (!dishMap[dk]) {
                        const recipe = recipes.find(r => r.id === id);
                        const s = getScaled(id, key, meal);
                        if (!recipe || !s) return;
                        dishMap[dk] = { meal, name: recipe.name, emoji: recipe.emoji, days: [],
                            kcal: s.total_kcal, prot: s.total_prot, lip: s.total_lip, glu: s.total_glu };
                    }
                    dishMap[dk].days.push(dayShort[day] || day.slice(0, 3));
                });
            });
            // Tri : midi avant soir, puis par nom
            const dishes = Object.values(dishMap).sort((a, b) =>
                a.meal === b.meal ? a.name.localeCompare(b.name) : (a.meal === 'midi' ? -1 : 1));
            return { key, label, color, socle, dishes, target: Math.round(plan.target_daily) };
        });
    };

    const copyFatSecret = () => {
        const L = [];
        buildFatSecretData().forEach(pd => {
            L.push(`===== ${pd.label.toUpperCase()} — cible ${pd.target} kcal/j =====`);
            L.push('-- Fixe chaque jour --');
            pd.socle.items.forEach(i => L.push(`  ${i.moment} · ${i.name} (${i.detail}) : ${Math.round(i.kcal)} kcal · ${i.prot}P ${i.lip}L ${i.glu}G`));
            L.push(`  = Sous-total fixe : ${Math.round(pd.socle.total.kcal)} kcal · ${pd.socle.total.prot.toFixed(1)}P ${pd.socle.total.lip.toFixed(1)}L ${pd.socle.total.glu.toFixed(1)}G`);
            L.push('');
            L.push('-- Plats (une fois chacun) --');
            pd.dishes.forEach(d => {
                L.push(`  ${d.meal === 'midi' ? 'Midi' : 'Soir'} · ${d.name} [${d.days.join(', ')}] : ${d.kcal} kcal · ${d.prot}P ${d.lip}L ${d.glu}G`);
            });
            L.push('');
        });
        navigator.clipboard.writeText(L.join('\n')).then(() => {
            setFsCopied(true);
            setTimeout(() => setFsCopied(false), 2500);
        });
    };

    // ── Export / Import plan — format compact v2 ─────────────────────────────
    // Format : "v2:{id1,id2,...}|{slots midi/soir par jour: index 0-4 ou -}|{disabled slot indices}"
    // Exemple : "v2:600001,600002|01-1-10-1-...|5,9" — compact vs base64
    const exportPlan = () => {
        try {
            const slots = DAYS.flatMap(d => MEALS.map(m => {
                const id = weekPlan[d]?.[m];
                return id ? String(selectedIds.indexOf(id)) : '-';
            })).join('');
            const disIdx = DAYS.flatMap((d, di) => MEALS.map((m, mi) =>
                isSlotDisabled(d, m) ? String(di * 2 + mi) : null
            )).filter(Boolean).join(',');
            const code = `v2:${selectedIds.join(',')}|${slots}|${disIdx}`;
            navigator.clipboard.writeText(code).then(() => {
                setSyncMsg('✅ Code copié ! Collez-le sur l\'autre appareil.');
                setTimeout(() => setSyncMsg(''), 4000);
            });
        } catch (_) { setSyncMsg('❌ Impossible de copier.'); }
    };
    const importPlan = () => {
        try {
            const raw = importCode.trim();
            if (raw.startsWith('v2:')) {
                // Nouveau format compact
                const [idsPart, slotsPart, disPart] = raw.slice(3).split('|');
                const ids = idsPart ? idsPart.split(',').filter(Boolean) : [];
                const wp  = {};
                if (slotsPart) {
                    [...slotsPart].forEach((ch, i) => {
                        const day  = DAYS[Math.floor(i / 2)];
                        const meal = MEALS[i % 2];
                        if (!wp[day]) wp[day] = {};
                        if (ch !== '-' && ids[Number(ch)]) wp[day][meal] = ids[Number(ch)];
                    });
                }
                const dis = {};
                if (disPart) {
                    disPart.split(',').filter(Boolean).forEach(idx => {
                        const n = Number(idx);
                        const key = `${DAYS[Math.floor(n / 2)]}_${MEALS[n % 2]}`;
                        dis[key] = true;
                    });
                }
                setSelectedIds(ids);
                setWeekPlan(wp);
                setDisabledSlots(dis);
            } else {
                // Ancien format base64 (compat)
                const data = JSON.parse(atob(raw));
                if (Array.isArray(data.selectedIds))                   setSelectedIds(data.selectedIds);
                if (data.weekPlan && typeof data.weekPlan === 'object') setWeekPlan(data.weekPlan);
            }
            setSyncMsg('✅ Plan importé avec succès !');
            setImportCode('');
            setTimeout(() => setSyncMsg(''), 3000);
        } catch (_) {
            setSyncMsg('❌ Code invalide, vérifiez et réessayez.');
            setTimeout(() => setSyncMsg(''), 3000);
        }
    };

    // ── Helpers prix ingrédients ─────────────────────────────────────────────
    // Normalise un nom : minuscules, sans accents, sans parenthèses, espaces simples
    const normIngName = (s) => (s || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    // Cherche le prix dans la DB et retourne le coût en € pour qty_g grammes (ou null si absent)
    const lookupIngPrice = (name, qty_g, db, ing_unit, ing_g_per_pc) => {
        if (!db || db.length === 0 || !qty_g) return null;
        const norm = normIngName(name);
        const entry = db.find(e => {
            const n = normIngName(e.name);
            if (n === norm || n.includes(norm) || norm.includes(n)) return true;
            return (e.aliases || []).some(a => {
                const na = normIngName(a);
                return na === norm || na.includes(norm) || norm.includes(na);
            });
        });
        if (!entry) return null;
        const price = entry.price_per_unit ?? entry.price_per_kg;
        if (price == null) return null;
        const buyUnit = entry.buy_unit || 'kg';
        if (buyUnit === 'L') {
            // Liquide : qty_g / densité (g/mL) / 1000 = volume en L
            const density = entry.density || 1.0;
            return (qty_g / density / 1000) * price;
        }
        if (buyUnit === 'gousse' || buyUnit === 'pc') {
            // Achat à la pièce : qty_g / g_par_piece
            const gPerUnit = entry.g_per_unit || ing_g_per_pc || 5;
            return (qty_g / gPerUnit) * price;
        }
        // Default : achat au kg
        return qty_g * price / 1000;
    };

    // ── Extraction du protocole depuis le markdown ───────────────────────────
    const extractProtocol = (mdText) => {
        if (!mdText) return [];
        const lines = mdText.split('\n');
        let inSection = false;
        const steps = [];
        for (const line of lines) {
            if (/^###\s+Protocole/.test(line)) { inSection = true; continue; }
            if (inSection && /^###/.test(line)) break;
            if (inSection && /^\d+\./.test(line.trim())) steps.push(line.trim());
        }
        return steps;
    };

    // Transforme **gras** et _italique_ en JSX
    const renderInline = (text) => {
        const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
        return parts.map((p, i) => {
            if (p.startsWith('**') && p.endsWith('**'))
                return <strong key={i}>{p.slice(2, -2)}</strong>;
            if (p.startsWith('_') && p.endsWith('_'))
                return <em key={i}>{p.slice(1, -1)}</em>;
            return p;
        });
    };

    // ── États de chargement / vide ────────────────────────────────────────────
    if (loading) return (
        <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
            Chargement des recettes…
        </div>
    );
    if (recipes.length === 0) return (
        <div className="animate-fade-in section-container" style={{ textAlign: 'center', padding: '4rem 2rem', color: '#475569' }}>
            <ChefHat size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
            <p>Aucune recette scalable dans le manifest.</p>
        </div>
    );

    const assignedSlots  = countAssignedSlots();
    const { sections: shoppingItems } = buildShoppingList();
    const cuissonData    = buildCuissonData();
    const cookGroupData  = buildCookGroupData();

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="animate-fade-in section-container">
            <h2 style={S.pageTitle}><ChefHat size={24} /> Batch Cooking Hebdomadaire</h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                Sélectionne jusqu'à {MAX_RECIPES} recettes · Assigne midi et soir · Génère la liste et les boîtes.
            </p>

            {/* ── Sync cross-device ── */}
            <div style={{ marginBottom: '2rem' }}>
                <button onClick={() => setShowSync(s => !s)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.38rem 0.85rem',
                    background: showSync ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${showSync ? '#38bdf8' : '#334155'}`,
                    borderRadius: '7px', color: showSync ? '#38bdf8' : '#64748b',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                }}>
                    <Upload size={12} /> Synchroniser / Partager
                </button>

                {showSync && (
                    <div style={{ marginTop: '0.6rem', background: 'rgba(15,23,42,0.8)', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem 1.1rem' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '0.8rem' }}>
                            SYNC CROSS-APPAREIL
                        </div>
                        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
                            <button onClick={exportPlan} style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.45rem 1rem', flexShrink: 0,
                                background: 'rgba(56,189,248,0.1)', border: '1px solid #38bdf8',
                                borderRadius: '7px', color: '#38bdf8', cursor: 'pointer',
                                fontWeight: 600, fontSize: '0.83rem',
                            }}>
                                <Upload size={13} /> Exporter (copier le code)
                            </button>
                            <div style={{ display: 'flex', gap: '0.4rem', flex: 1, minWidth: '180px' }}>
                                <input
                                    value={importCode}
                                    onChange={e => setImportCode(e.target.value)}
                                    placeholder="Coller un code ici…"
                                    style={{
                                        flex: 1, background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid #334155', borderRadius: '7px',
                                        color: '#e2e8f0', padding: '0.45rem 0.6rem', fontSize: '0.82rem', minWidth: 0,
                                    }}
                                />
                                <button onClick={importPlan} disabled={!importCode.trim()} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                                    padding: '0.45rem 0.8rem', flexShrink: 0,
                                    background: importCode.trim() ? 'rgba(74,222,128,0.1)' : 'rgba(0,0,0,0.1)',
                                    border: `1px solid ${importCode.trim() ? '#4ade80' : '#1e293b'}`,
                                    borderRadius: '7px',
                                    color: importCode.trim() ? '#4ade80' : '#334155',
                                    cursor: importCode.trim() ? 'pointer' : 'not-allowed',
                                    fontWeight: 600, fontSize: '0.83rem',
                                }}>
                                    <Download size={13} /> Importer
                                </button>
                            </div>
                        </div>
                        {syncMsg && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.81rem', color: syncMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>
                                {syncMsg}
                            </div>
                        )}
                        <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#475569' }}>
                            Desktop → "Exporter" copie un code · Téléphone → coller le code puis "Importer"
                        </div>
                    </div>
                )}
            </div>

            {/* ── ÉTAPE 1 : Recettes ── */}
            <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={S.stepLabel}>ÉTAPE 1 — RECETTES BATCH COOKING ({selectedIds.length}/{MAX_RECIPES})</div>
                    <button onClick={randomSelect} style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.38rem 0.85rem',
                        background: 'rgba(167,139,250,0.1)', border: '1px solid #a78bfa',
                        borderRadius: '7px', color: '#a78bfa',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                        touchAction: 'manipulation',
                    }}>
                        <Shuffle size={13} /> Sélection aléatoire
                    </button>
                </div>

                {/* ── Filtres par tag (multi-sélection, triés par catégorie) ── */}
                {(() => {
                    const present = new Set();
                    recipes.forEach(r => getRecipeTags(r).forEach(t => present.add(t)));
                    if (present.size === 0) return null;
                    const toggle = (t) => setFilterTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
                    const nbFiltered = recipes.filter(r => { const rt = getRecipeTags(r); return filterTags.every(t => rt.includes(t)); }).length;
                    const chip = (label, active, onClick, key) => (
                        <button key={key} onClick={onClick} style={{
                            padding: '0.26rem 0.65rem', borderRadius: '999px', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700,
                            background: active ? 'rgba(56,189,248,0.18)' : 'rgba(15,23,42,0.6)',
                            border: `1px solid ${active ? '#38bdf8' : '#334155'}`,
                            color: active ? '#38bdf8' : '#94a3b8', textTransform: 'capitalize',
                        }}>{label}</button>
                    );
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1rem' }}>
                            {TAG_GROUPS.map(grp => {
                                const tags = grp.tags.filter(t => present.has(t));
                                if (tags.length === 0) return null;
                                return (
                                    <div key={grp.label} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 800, letterSpacing: '0.6px', width: '78px', flexShrink: 0 }}>{grp.label.toUpperCase()}</span>
                                        {tags.map(t => chip(`${TAG_META[t] || ''} ${t}`, filterTags.includes(t), () => toggle(t), t))}
                                    </div>
                                );
                            })}
                            {filterTags.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.1rem' }}>
                                    {chip('✕ Réinitialiser', false, () => setFilterTags([]), '_reset')}
                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{nbFiltered} recette{nbFiltered > 1 ? 's' : ''}</span>
                                </div>
                            )}
                        </div>
                    );
                })()}

                <div style={S.recipeGrid}>
                    {recipes.filter(r => { const rt = getRecipeTags(r); return filterTags.every(t => rt.includes(t)); }).map(recipe => {
                        const sel = selectedIds.includes(recipe.id);
                        const dis = !sel && selectedIds.length >= MAX_RECIPES;
                        const tags = getRecipeTags(recipe);
                        return (
                            <div key={recipe.id}
                                onClick={() => !dis && toggleRecipe(recipe.id)}
                                style={{ ...S.recipeCard,
                                    background: sel ? 'rgba(56,189,248,0.12)' : 'rgba(15,23,42,0.6)',
                                    border: `2px solid ${sel ? '#38bdf8' : dis ? '#1e293b' : '#334155'}`,
                                    opacity: dis ? 0.35 : 1,
                                    cursor: dis ? 'not-allowed' : 'pointer',
                                    display: 'flex', flexDirection: 'column',
                                }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                                    <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>{recipe.emoji}</span>
                                    <span style={{ fontWeight: 700, color: sel ? '#38bdf8' : '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.25 }}>
                                        {recipe.name}
                                    </span>
                                </div>
                                <div style={S.recipeMacros}>
                                    <span>{recipe.kcal} kcal</span>
                                    <span style={{ color: '#4ade80' }}>{recipe.prot}g P</span>
                                    <span style={{ color: '#fb923c' }}>{recipe.lip}g L</span>
                                    <span style={{ color: '#a78bfa' }}>{recipe.glu}g G</span>
                                </div>
                                {/* Tags */}
                                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', margin: '0.35rem 0 0.1rem' }}>
                                    {tags.map(t => (
                                        <span key={t} style={{
                                            fontSize: '0.62rem', padding: '0.05rem 0.4rem', borderRadius: '999px',
                                            background: t === 'froid' ? 'rgba(56,189,248,0.12)' : t === 'chaud' ? 'rgba(251,146,60,0.12)' : 'rgba(148,163,184,0.1)',
                                            color: t === 'froid' ? '#38bdf8' : t === 'chaud' ? '#fb923c' : '#94a3b8',
                                            border: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap',
                                        }}>{TAG_META[t] || ''} {t}</span>
                                    ))}
                                </div>
                                {/* Bouton voir la recette */}
                                <button
                                    onClick={e => { e.stopPropagation(); setPreviewRecipe(recipe); }}
                                    style={{
                                        marginTop: 'auto',
                                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                                        background: 'none', border: 'none', padding: '0.45rem 0',
                                        color: sel ? '#93c5fd' : '#475569',
                                        cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                        width: '100%',
                                        transition: 'color 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'}
                                    onMouseLeave={e => e.currentTarget.style.color = sel ? '#93c5fd' : '#475569'}
                                >
                                    <BookOpen size={12} /> Voir la recette
                                </button>
                            </div>
                        );
                    })}
                </div>

            </div>

            {/* ── ÉTAPE 2 : Planificateur ── */}
            {selectedIds.length > 0 && (
                <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={S.stepLabel}>ÉTAPE 2 — SEMAINE ({assignedSlots}/{DAYS.length * MEALS.length} slots)</div>
                        <button onClick={autoDispatch} style={S.autoBtn}>
                            <Shuffle size={14} /> Auto-dispatch
                        </button>
                    </div>
                    <div style={S.weekGrid}>
                        {DAYS.map(day => {
                            const plan = weekPlan[day] || {};
                            return (
                                <div key={day} style={S.dayCard}>
                                    <div style={S.dayLabel}>{day.toUpperCase()}</div>
                                    {MEALS.map(meal => {
                                        const recipeId = plan[meal];
                                        const disabled = isSlotDisabled(day, meal);
                                        const scaled_a = (!disabled && recipeId) ? getScaled(recipeId, 'axel',   meal) : null;
                                        const scaled_p = (!disabled && recipeId) ? getScaled(recipeId, 'prisca', meal) : null;
                                        const recipe   = (!disabled && recipeId) ? recipes.find(r => r.id === recipeId) : null;
                                        const gly_a    = scaled_a ? computeGlycemic(scaled_a) : null;
                                        const gly_p    = scaled_p ? computeGlycemic(scaled_p) : null;
                                        return (
                                            <div key={meal} style={{ marginBottom: meal === 'midi' ? '0.6rem' : 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: disabled ? '#334155' : meal === 'midi' ? '#fbbf24' : '#818cf8', letterSpacing: '1.5px' }}>
                                                        {meal === 'midi' ? 'MIDI' : 'SOIR'}
                                                    </span>
                                                    <button onClick={() => toggleSlot(day, meal)} title={disabled ? 'Réactiver ce repas' : 'Désactiver ce repas'} style={{
                                                        fontSize: '0.58rem', padding: '0.08rem 0.3rem',
                                                        background: disabled ? 'rgba(248,113,113,0.1)' : 'transparent',
                                                        border: `1px solid ${disabled ? '#ef4444' : '#1e293b'}`,
                                                        borderRadius: '3px', color: disabled ? '#ef4444' : '#334155',
                                                        cursor: 'pointer', lineHeight: 1.3,
                                                    }}>
                                                        {disabled ? 'OFF' : '✓'}
                                                    </button>
                                                </div>
                                                <select value={recipeId || ''} onChange={e => setSlot(day, meal, e.target.value)}
                                                    style={{ ...S.daySelect, opacity: disabled ? 0.35 : 1 }}>
                                                    <option value="">—</option>
                                                    {selectedIds.map(id => {
                                                        const r = recipes.find(rec => rec.id === id);
                                                        return r ? <option key={id} value={id}>{r.emoji} {r.name}</option> : null;
                                                    })}
                                                </select>
                                                {recipe && scaled_a && (
                                                    <div style={S.dayMacros}>
                                                        <span style={{ color: '#38bdf8' }}>
                                                            Axel {scaled_a.total_kcal} kcal · {scaled_a.total_prot}g P · {scaled_a.total_lip}g L · {scaled_a.total_glu}g G
                                                            {gly_a && <span title={`CG brute ${gly_a.gl} · IG ${gly_a.gi} → lissé −${gly_a.reduction}%`} style={{ color: glColor(gly_a.gl_smoothed) }}> · CG {gly_a.gl_smoothed} · IG {gly_a.gi_smoothed}</span>}
                                                        </span>
                                                        {scaled_p && <span style={{ color: '#a78bfa' }}>
                                                            Prisca {scaled_p.total_kcal} kcal · {scaled_p.total_prot}g P · {scaled_p.total_lip}g L · {scaled_p.total_glu}g G
                                                            {gly_p && <span title={`CG brute ${gly_p.gl} · IG ${gly_p.gi} → lissé −${gly_p.reduction}%`} style={{ color: glColor(gly_p.gl_smoothed) }}> · CG {gly_p.gl_smoothed} · IG {gly_p.gi_smoothed}</span>}
                                                        </span>}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── ÉTAPE 3 : Résultats (tabs 4 vues) ── */}
            {assignedSlots > 0 && (
                <>
                    {/* ── Panneau couverture protéines ── */}
                    {(() => {
                        const bpd = computeBatchProteinPerDay();
                        if (!bpd) return null;
                        const pGoalAxel   = Math.round(calculatePlan('axel',   profiles).prot_goal);
                        const pGoalPrisca = Math.round(calculatePlan('prisca', profiles).prot_goal);
                        const axelOk   = bpd.axel   >= pGoalAxel   * 0.85;
                        const priscaOk = bpd.prisca >= pGoalPrisca * 0.85;
                        if (!axelOk && !priscaOk) return null;
                        return (
                            <div style={{ marginBottom: '1.25rem', padding: '0.7rem 1rem', background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', fontSize: '0.82rem' }}>
                                <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.3rem', fontSize: '0.72rem', letterSpacing: '0.8px' }}>💪 COUVERTURE PROTÉINES BATCH</div>
                                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: '#cbd5e1' }}>
                                    <span style={{ color: axelOk ? '#4ade80' : '#f87171' }}>
                                        Axel : {bpd.axel}g/j batch / {pGoalAxel}g cible {axelOk && '✅'}
                                    </span>
                                    <span style={{ color: priscaOk ? '#4ade80' : '#f87171' }}>
                                        Prisca : {bpd.prisca}g/j batch / {pGoalPrisca}g cible {priscaOk && '✅'}
                                    </span>
                                </div>
                                {(axelOk || priscaOk) && (
                                    <div style={{ marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.76rem' }}>
                                        💡 Les repas couvrent ≥ 85% de l'objectif → dans <strong>Macro Plan</strong>, vous pouvez décocher le Whey 16h.
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* ── Panneau charge glycémique / lissage sur la semaine ── */}
                    {(() => {
                        const gpd = computeGlycemicPerDay();
                        if (!gpd) return null;
                        // Seuil de "pic" : +25% au-dessus de la moyenne hebdo de la personne
                        const spikeAxel   = gpd.avgAxel   * 1.25;
                        const spikePrisca = gpd.avgPrisca * 1.25;
                        return (
                            <div style={{ marginBottom: '1.25rem', padding: '0.7rem 1rem', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: '8px', fontSize: '0.82rem' }}>
                                <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: '0.4rem', fontSize: '0.72rem', letterSpacing: '0.8px' }}>
                                    📈 CHARGE GLYCÉMIQUE — LISSAGE SUR LA SEMAINE
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                                    <span>Moyenne <strong style={{ color: '#38bdf8' }}>Axel</strong> : {gpd.avgAxel} CG/j</span>
                                    <span>Moyenne <strong style={{ color: '#a78bfa' }}>Prisca</strong> : {gpd.avgPrisca} CG/j</span>
                                </div>
                                {/* Barres par jour — Axel (bleu) + Prisca (violet), pic = +25% vs moyenne perso */}
                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                    {gpd.days.map(d => {
                                        const spikeA = d.axel   > spikeAxel;
                                        const spikeP = d.prisca > spikePrisca;
                                        const anySpike = spikeA || spikeP;
                                        return (
                                            <div key={d.day} title={`${d.day} — Axel ${d.axel}${spikeA ? ' ⚠️' : ''} · Prisca ${d.prisca}${spikeP ? ' ⚠️' : ''} CG`} style={{
                                                flex: '1 1 62px', textAlign: 'center', padding: '0.3rem 0.2rem', borderRadius: '6px',
                                                background: anySpike ? 'rgba(248,113,113,0.10)' : 'rgba(74,222,128,0.07)',
                                                border: `1px solid ${anySpike ? '#f87171' : 'rgba(74,222,128,0.22)'}`,
                                            }}>
                                                <div style={{ fontSize: '0.6rem', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '0.15rem' }}>{d.day.slice(0, 3).toUpperCase()}</div>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: spikeA ? '#f87171' : '#38bdf8' }}>{d.axel}{spikeA && ' ⚠️'}</div>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: spikeP ? '#f87171' : '#a78bfa' }}>{d.prisca}{spikeP && ' ⚠️'}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.66rem', color: '#64748b' }}>
                                    <span><span style={{ color: '#38bdf8', fontWeight: 800 }}>■</span> Axel (haut)</span>
                                    <span><span style={{ color: '#a78bfa', fontWeight: 800 }}>■</span> Prisca (bas)</span>
                                </div>
                                <div style={{ marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.72rem', lineHeight: 1.5 }}>
                                    💡 Chiffres = CG <em>lissée</em> par jour (atténuée par lipides/protéines). Un chiffre en <span style={{ color: '#f87171' }}>rouge ⚠️</span> dépasse de +25% la moyenne de la personne → permute un plat riche en féculents vers un jour plus léger pour <strong>lisser la semaine</strong>. IG/CG = estimations (tables de référence).
                                </div>
                            </div>
                        );
                    })()}

                    {/* Sélecteur de vue */}
                    <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        {[
                            { key: 'shopping',   label: '🛒 Courses',      num: '1' },
                            { key: 'cuisson_cru',label: '🍳 Cuisson Cru',  num: '2' },
                            { key: 'repartition',label: '📦 Répartition',  num: '3' },
                            { key: 'fatsecret',  label: '🧾 FatSecret',    num: '4' },
                        ].map(tab => (
                            <button key={tab.key} onClick={() => setActiveView(tab.key)} style={{
                                ...S.tabBtn,
                                background: activeView === tab.key ? 'rgba(56,189,248,0.18)' : 'rgba(15,23,42,0.6)',
                                borderColor: activeView === tab.key ? '#38bdf8' : '#334155',
                                color: activeView === tab.key ? '#38bdf8' : '#94a3b8',
                            }}>
                                <span style={{ fontSize: '0.65rem', color: activeView === tab.key ? '#38bdf8' : '#475569', fontWeight: 900, marginRight: '0.1rem' }}>{tab.num}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ─────────────── VUE 1 : COURSES ─────────────── */}
                    {activeView === 'shopping' && (
                        <div style={S.panel}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={S.panelTitle}>COURSES — {assignedSlots} REPAS × 2 PERSONNES</div>
                                <button onClick={copyShoppingList} style={{
                                    ...S.copyBtn,
                                    background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(56,189,248,0.12)',
                                    borderColor: copied ? '#4ade80' : '#38bdf8',
                                    color: copied ? '#4ade80' : '#38bdf8',
                                }}>
                                    {copied ? <Check size={13} /> : <Copy size={13} />}
                                    {copied ? 'Copié !' : 'Copier'}
                                </button>
                            </div>

                            <div style={{ display: 'grid', gap: '1.1rem' }}>
                                {shoppingItems.map(section => (
                                    <div key={section.group}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.8px', color: section.color, paddingBottom: '0.3rem', marginBottom: '0.35rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                            {section.label}
                                        </div>
                                        <div style={{ display: 'grid', gap: '0.2rem' }}>
                                            {section.items.map((item, i) => {
                                                const shopKey   = normalizeIngName(item.name);
                                                const isChecked = !!checkedShopItems[shopKey];
                                                return (
                                                    <div key={item.name}
                                                        onClick={() => setCheckedShopItems(prev => ({ ...prev, [shopKey]: !prev[shopKey] }))}
                                                        style={{
                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                            padding: '0.38rem 0.65rem',
                                                            background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent',
                                                            borderRadius: '5px',
                                                            opacity: isChecked ? 0.38 : 1,
                                                            cursor: 'pointer',
                                                            transition: 'opacity 0.15s',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                                                            <span style={{
                                                                width: '15px', height: '15px', flexShrink: 0,
                                                                border: `1.5px solid ${isChecked ? '#4ade80' : '#334155'}`,
                                                                borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                background: isChecked ? 'rgba(74,222,128,0.15)' : 'transparent',
                                                                color: '#4ade80', fontSize: '0.6rem', fontWeight: 900,
                                                            }}>
                                                                {isChecked && '✓'}
                                                            </span>
                                                            <span style={{ color: '#e2e8f0', fontWeight: 500, fontSize: '0.88rem', textDecoration: isChecked ? 'line-through' : 'none' }}>
                                                                {item.name}
                                                            </span>
                                                        </div>
                                                        <span style={{ color: section.color, fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.9rem', textDecoration: isChecked ? 'line-through' : 'none' }}>
                                                            {item.display}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Estimation prix semaine (base de données ingredients_prix.json) ── */}
                            {(() => {
                                // Pour chaque slot actif, on récupère les ingrédients scalés
                                // et on les matche dans la priceDb pour un prix au gramme réel.
                                const lineMap = {};
                                let totalMatched = 0;
                                let totalIngs    = 0;

                                DAYS.forEach(day => {
                                    MEALS.forEach(meal => {
                                        if (isSlotDisabled(day, meal)) return;
                                        const id = weekPlan[day]?.[meal];
                                        if (!id) return;
                                        const recipe = recipes.find(r => r.id === id);
                                        if (!recipe) return;

                                        const key = `${id}_${meal}`;
                                        if (!lineMap[key]) {
                                            // Calcul une seule fois par recette×repas,
                                            // on multipliera par le nb de jours ensuite
                                            let dayCost    = 0;
                                            let dayMatched = 0;
                                            let dayTotal   = 0;

                                            ['axel', 'prisca'].forEach(person => {
                                                const scaled = getScaled(id, person, meal);
                                                if (!scaled) return;
                                                scaled.ingredients.forEach(ing => {
                                                    dayTotal++;
                                                    const cost = lookupIngPrice(ing.name, ing.raw_g, priceDb, ing.unit, ing.g_per_pc);
                                                    if (cost !== null) {
                                                        dayCost += cost;
                                                        dayMatched++;
                                                    }
                                                });
                                            });

                                            // Fallback si 0 ingrédient trouvé : prix manifest × 2 pers
                                            const fallback = dayMatched === 0;
                                            lineMap[key] = {
                                                recipe, meal,
                                                costPerDay: fallback ? (parseFloat(recipe.price) || 0) * 2 : dayCost,
                                                matched: dayMatched,
                                                total:   dayTotal,
                                                fallback,
                                                days: 0,
                                            };
                                        }
                                        lineMap[key].days++;
                                    });
                                });

                                const lines = Object.values(lineMap);
                                if (lines.length === 0) return null;

                                lines.forEach(l => {
                                    totalMatched += l.matched;
                                    totalIngs    += l.total;
                                });

                                const total  = lines.reduce((s, l) => s + l.costPerDay * l.days, 0);
                                const perDay = total / DAYS.length;
                                const coverage = totalIngs > 0 ? Math.round(totalMatched / totalIngs * 100) : 0;
                                const fullCoverage = coverage >= 95;

                                return (
                                    <div style={{ marginTop: '1.25rem', padding: '1rem 1.1rem', background: 'rgba(74,222,128,0.06)', border: `1px solid ${fullCoverage ? 'rgba(74,222,128,0.18)' : 'rgba(251,191,36,0.2)'}`, borderRadius: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4ade80', letterSpacing: '1.5px' }}>
                                                💶 ESTIMATION BUDGET SEMAINE (2 personnes)
                                            </div>
                                            <div style={{ fontSize: '0.68rem', color: fullCoverage ? '#4ade80' : '#fbbf24', fontWeight: 600 }}>
                                                {fullCoverage
                                                    ? `✓ ${totalMatched} ingrédients pricés`
                                                    : `⚠ ${totalMatched}/${totalIngs} ingrédients · ${coverage}% couvert`
                                                }
                                            </div>
                                        </div>

                                        {/* Détail par recette×repas */}
                                        <div style={{ display: 'grid', gap: '0.22rem', marginBottom: '0.85rem' }}>
                                            {lines.map(({ recipe, meal, costPerDay, days, fallback, matched, total: tot }) => (
                                                <div key={`${recipe.id}_${meal}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                                                    <span style={{ color: '#94a3b8' }}>
                                                        {recipe.emoji} {recipe.name}
                                                        <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', fontWeight: 700, color: meal === 'midi' ? '#fbbf24' : '#818cf8' }}>
                                                            {meal === 'midi' ? 'MIDI' : 'SOIR'}
                                                        </span>
                                                        <span style={{ marginLeft: '0.3rem', color: '#475569', fontSize: '0.72rem' }}>
                                                            × {days}j
                                                        </span>
                                                        {fallback && <span style={{ marginLeft: '0.3rem', color: '#f59e0b', fontSize: '0.66rem' }}>(estimé)</span>}
                                                    </span>
                                                    <span style={{ fontFamily: 'monospace', color: fallback ? '#f59e0b' : '#cbd5e1', fontWeight: 600, whiteSpace: 'nowrap', paddingLeft: '0.75rem' }}>
                                                        {(costPerDay * days).toFixed(2)} €
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Total + par jour */}
                                        <div style={{ borderTop: `1px solid ${fullCoverage ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)'}`, paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                ≈ <strong style={{ color: '#94a3b8' }}>{perDay.toFixed(2)} €</strong> / jour · 2 personnes
                                                <span style={{ fontSize: '0.7rem', marginLeft: '0.4rem', color: '#334155' }}>(hors socle : pain, whey, œufs…)</span>
                                            </div>
                                            <div style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 900, color: fullCoverage ? '#4ade80' : '#fbbf24' }}>
                                                ~{total.toFixed(2)} €
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* ─────────────── VUE 2 : CUISSON CRU ─────────────── */}
                    {activeView === 'cuisson_cru' && (
                        <div style={S.panel}>
                            <div style={{ ...S.panelTitle, marginBottom: '0.4rem' }}>
                                🍳 POIDS CRU À PRÉPARER — groupés par mode de cuisson
                            </div>
                            <p style={{ fontSize: '0.76rem', color: '#475569', marginBottom: '1.25rem' }}>
                                Les ingrédients cuisinés ensemble sont regroupés. 🔀 = cuisson commune à plusieurs recettes.
                            </p>

                            {/* ── Prochaine étape par plat (sans ouvrir la fiche) ── */}
                            {(() => {
                                const ids = [...new Set(DAYS.flatMap(d => MEALS.map(m => (!isSlotDisabled(d, m) ? weekPlan[d]?.[m] : null))).filter(Boolean))];
                                const cards = ids.map(id => {
                                    const r = recipes.find(x => x.id === id);
                                    const steps = recipeSteps[id] || [];
                                    if (!r || steps.length === 0) return null;
                                    const nextIdx = steps.findIndex((_, i) => !doneSteps[`${id}_${i}`]);
                                    const done = nextIdx === -1;
                                    return { r, steps, nextIdx, done };
                                }).filter(Boolean);
                                if (cards.length === 0) return null;
                                return (
                                    <div style={{ marginBottom: '1.4rem', padding: '0.8rem 1rem', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.8px', marginBottom: '0.6rem' }}>👉 PROCHAINE ÉTAPE PAR PLAT</div>
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            {cards.map(({ r, steps, nextIdx, done }) => (
                                                <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>{r.emoji}</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#cbd5e1' }}>{r.name} <span style={{ color: '#475569', fontWeight: 400 }}>· {done ? '✅ terminé' : `étape ${nextIdx + 1}/${steps.length}`}</span></div>
                                                        {!done && <div style={{ fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.5, marginTop: '0.15rem' }}>{renderInline(steps[nextIdx])}</div>}
                                                    </div>
                                                    {!done && (
                                                        <button onClick={() => setDoneSteps(prev => ({ ...prev, [`${r.id}_${nextIdx}`]: true }))} style={{
                                                            flexShrink: 0, fontSize: '0.66rem', fontWeight: 700, padding: '0.3rem 0.55rem', borderRadius: '6px', cursor: 'pointer',
                                                            background: 'rgba(74,222,128,0.12)', border: '1px solid #4ade80', color: '#4ade80',
                                                        }}>✓ Fait</button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            <div style={{ display: 'grid', gap: '1.1rem' }}>
                                {cookGroupData.map(({ gk, label, per_prm, ings, total_g }) => {
                                    const prmList    = Object.values(per_prm);
                                    const recipeIds  = [...new Set(prmList.map(p => p.recipe.id))];
                                    const isShared   = recipeIds.length > 1;
                                    const ingList    = Object.values(ings).filter(i => i.total_g >= 1).sort((a, b) => b.total_g - a.total_g);

                                    const isDone2 = !!doneCookGroups[gk];
                                    const isPrecook2 = gk.startsWith('precuisson_');
                                    const displayTitle2 = FECULENT_GK.has(gk)
                                        ? (gk === 'riz' ? 'Riz' : gk === 'pates' ? 'Pâtes' : 'Ebly')
                                        : isPrecook2 ? label
                                        : isShared ? 'Cuisson commune'
                                        : `Accompagnement · ${prmList[0]?.recipe?.name || ''}`;
                                    return (
                                        <div key={gk} style={{ ...S.boxCard, opacity: isDone2 ? 0.38 : 1, transition: 'opacity 0.2s' }}>
                                            {/* En-tête groupe */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, color: isShared ? '#38bdf8' : '#e2e8f0', fontSize: '0.92rem', textDecoration: isDone2 ? 'line-through' : 'none' }}>
                                                        {isShared && '🔀 '}{displayTitle2}
                                                    </div>
                                                    {isShared && (
                                                        <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.1rem' }}>
                                                            {recipeIds.map(id => recipes.find(r => r.id === id)?.name).join(' + ')}
                                                        </div>
                                                    )}
                                                    {!isShared && (
                                                        <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.1rem' }}>
                                                            {prmList[0]?.recipe.emoji} {prmList[0]?.recipe.name}
                                                            {' · '}<strong style={{ color: prmList[0]?.meal === 'midi' ? '#fbbf24' : '#818cf8', fontSize: '0.72rem' }}>{prmList[0]?.meal === 'midi' ? 'MIDI' : 'SOIR'}</strong>
                                                            {' · '}{prmList[0]?.count} jour{prmList[0]?.count > 1 ? 's' : ''}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Bouton voir la recette */}
                                                {!isShared && (
                                                    <button
                                                        onClick={() => setPreviewRecipe(prmList[0]?.recipe)}
                                                        title="Voir la recette"
                                                        style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '0.15rem', flexShrink: 0, transition: 'color 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'}
                                                        onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                                                    >
                                                        <BookOpen size={14} />
                                                    </button>
                                                )}
                                                <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#fb923c', fontSize: '1rem', flexShrink: 0 }}>
                                                    {Math.round(total_g)} g
                                                </span>
                                                {/* Checkbox fait */}
                                                <button
                                                    onClick={() => setDoneCookGroups(prev => ({ ...prev, [gk]: !prev[gk] }))}
                                                    title={isDone2 ? 'Marquer comme à faire' : 'Marquer comme fait'}
                                                    style={{
                                                        width: '24px', height: '24px', flexShrink: 0,
                                                        background: isDone2 ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
                                                        border: `1.5px solid ${isDone2 ? '#4ade80' : '#334155'}`,
                                                        borderRadius: '6px', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    {isDone2 && <Check size={12} color="#4ade80" />}
                                                </button>
                                            </div>

                                            {/* Liste des ingrédients */}
                                            <div style={{ display: 'grid', gap: '0.2rem', marginBottom: ingList.length && isShared ? '0.65rem' : 0 }}>
                                                {ingList.map(ing => {
                                                    const col = ing.role === 'protein' || ing.role === 'protein_glu' ? '#4ade80'
                                                              : ing.role === 'feculent' ? '#fbbf24'
                                                              : ing.role === 'lipide'   ? '#fb923c' : '#94a3b8';
                                                    return (
                                                        <div key={ing.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.2rem 0.4rem', borderRadius: '4px', background: 'rgba(0,0,0,0.12)' }}>
                                                            <span style={{ color: '#cbd5e1', fontSize: '0.84rem' }}>
                                                                {ing.name}
                                                                {ing.fixed_qty && <span style={{ color: '#334155', fontSize: '0.7rem' }}> (fixe)</span>}
                                                            </span>
                                                            <strong style={{ color: col, fontFamily: 'monospace', fontSize: '0.88rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                                                                {fmtIng(ing.name, ing.total_g, ing.unit, ing.g_per_pc, ing.fixed_qty)}
                                                            </strong>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Breakdown par recette si cuisson commune */}
                                            {isShared && (() => {
                                                // Sum both persons for each recipe×meal
                                                const breakdown = {};
                                                prmList.forEach(prm => {
                                                    const k = `${prm.recipe.id}_${prm.meal}`;
                                                    if (!breakdown[k]) breakdown[k] = { recipe: prm.recipe, meal: prm.meal, count: prm.count, g: 0 };
                                                    breakdown[k].g += prm.g_per_day * prm.count;
                                                });
                                                return (
                                                    <div style={{ padding: '0.45rem 0.65rem', background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.1)', borderRadius: '6px', fontSize: '0.78rem' }}>
                                                        <div style={{ color: '#475569', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.5px', marginBottom: '0.3rem' }}>DONT (à cuire ensemble)</div>
                                                        {Object.values(breakdown).map(({ recipe, meal, g }) => (
                                                            <div key={`${recipe.id}_${meal}`} style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', padding: '0.1rem 0' }}>
                                                                <span>{recipe.emoji} {recipe.name} <strong style={{ color: meal === 'midi' ? '#fbbf24' : '#818cf8', fontSize: '0.68rem' }}>{meal === 'midi' ? 'MIDI' : 'SOIR'}</strong></span>
                                                                <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{Math.round(g)} g</strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ─────────────── VUE 3 : RÉPARTITION ─────────────── */}
                    {activeView === 'repartition' && (
                        <div style={S.panel}>
                            <div style={{ ...S.panelTitle, marginBottom: '0.4rem' }}>📦 RÉPARTITION DANS LES BOÎTES</div>
                            <p style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '1.5rem' }}>
                                ⚖️ Féculents (riz, pâtes, ebly) : pesez une fois cuit pour calibrer les portions.
                                🥣 Sauces & mélanges : estimation en louches — répartir équitablement.
                            </p>

                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                {cookGroupData.map(({ gk, label, per_prm, ings, companions }) => {
                                    const prmList     = Object.values(per_prm);
                                    const totalRaw    = prmList.reduce((s, p) => s + p.g_per_day * p.count, 0);
                                    const isWeighable = FECULENT_GK.has(gk);
                                    const firstRecipe = prmList[0]?.recipe;
                                    const estCoef     = parseFloat(firstRecipe?.cook_coef) || 1.0;
                                    const estCooked   = Math.round(totalRaw * estCoef);

                                    // Group by recipe×meal
                                    const rmMap = {};
                                    prmList.forEach(prm => {
                                        const k = `${prm.recipe.id}_${prm.meal}`;
                                        if (!rmMap[k]) rmMap[k] = { recipe: prm.recipe, meal: prm.meal, count: prm.count, persons: {} };
                                        rmMap[k].persons[prm.person] = prm.g_per_day;
                                    });
                                    const rmList     = Object.values(rmMap);
                                    const totalBoxes = rmList.reduce((s, rg) => s + rg.count * Object.keys(rg.persons).length, 0);

                                    // Calibration (féculents)
                                    const measured   = isWeighable ? measuredCooked[gk] : null;
                                    const mVal       = measured ? Math.max(1, parseInt(measured) || 0) : 0;
                                    const effectCoef = mVal > 0 && totalRaw > 0 ? mVal / totalRaw : estCoef;

                                    // Texte d'accompagnement (sauces)
                                    const perBoxGApprox = totalBoxes > 0 ? Math.round(totalRaw * estCoef / totalBoxes) : 0;
                                    const companionStr  = (companions || []).join(' + ');

                                    const recipeIdsV3 = [...new Set(prmList.map(p => p.recipe.id))];
                                    const isSharedV3  = recipeIdsV3.length > 1;
                                    const isDone3 = !!doneCookGroups[gk];
                                    const titleCap = isWeighable
                                        ? (gk === 'riz' ? 'Riz' : gk === 'pates' ? 'Pâtes' : 'Ebly')
                                        : isSharedV3 ? 'Cuisson commune'
                                        : `Accompagnement · ${firstRecipe?.name || ''}`;

                                    return (
                                        <div key={gk} style={{ ...S.boxCard, opacity: isDone3 ? 0.38 : 1, transition: 'opacity 0.2s' }}>
                                            {/* En-tête */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                                                <span style={{ fontSize: '1.1rem' }}>{isWeighable ? '⚖️' : '🥣'}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, color: isWeighable ? '#fbbf24' : '#e2e8f0', fontSize: '0.92rem', textDecoration: isDone3 ? 'line-through' : 'none' }}>
                                                        {titleCap}
                                                    </div>
                                                    <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.1rem' }}>
                                                        {isWeighable ? 'Féculent — à peser' : `${firstRecipe?.emoji || ''} ${firstRecipe?.name || 'Accompagnement'}`} · {totalBoxes} boîtes
                                                    </div>
                                                </div>
                                                {/* Bouton voir la recette */}
                                                {!isWeighable && !isSharedV3 && firstRecipe && (
                                                    <button
                                                        onClick={() => setPreviewRecipe(firstRecipe)}
                                                        title="Voir la recette"
                                                        style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '0.15rem', flexShrink: 0, transition: 'color 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'}
                                                        onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                                                    >
                                                        <BookOpen size={14} />
                                                    </button>
                                                )}
                                                <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.8rem' }}>{Math.round(totalRaw)} g cru</span>
                                                {/* Checkbox fait */}
                                                <button
                                                    onClick={() => setDoneCookGroups(prev => ({ ...prev, [gk]: !prev[gk] }))}
                                                    title={isDone3 ? 'Marquer comme à faire' : 'Marquer comme fait'}
                                                    style={{
                                                        width: '24px', height: '24px', flexShrink: 0,
                                                        background: isDone3 ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
                                                        border: `1.5px solid ${isDone3 ? '#4ade80' : '#334155'}`,
                                                        borderRadius: '6px', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    {isDone3 && <Check size={12} color="#4ade80" />}
                                                </button>
                                            </div>

                                            {/* Calibration (féculents seulement) */}
                                            {isWeighable && (
                                                <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: '8px', padding: '0.6rem 0.8rem', marginBottom: '0.8rem' }}>
                                                    <div style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.4rem' }}>⚖️ POIDS CUIT RÉEL</div>
                                                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <input type="number" min="1" placeholder={String(estCooked)} value={measured || ''}
                                                            onChange={e => setMeasuredCooked(prev => ({ ...prev, [gk]: e.target.value }))}
                                                            style={{ width: '90px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${measured ? '#4ade80' : '#334155'}`, borderRadius: '6px', color: measured ? '#4ade80' : '#e2e8f0', padding: '0.4rem 0.55rem', fontSize: '0.9rem', fontFamily: 'monospace' }} />
                                                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>g cuit</span>
                                                        {measured && <button onClick={() => setMeasuredCooked(prev => { const n = {...prev}; delete n[gk]; return n; })} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.76rem' }}>✕</button>}
                                                        <span style={{ fontSize: '0.74rem', color: measured ? '#4ade80' : '#475569' }}>
                                                            {measured ? `×${effectCoef.toFixed(2)} cuit/cru` : `Estimé ~${estCooked} g (×${estCoef})`}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Instruction répartition (sauces) */}
                                            {!isWeighable && (
                                                <div style={{ background: 'rgba(148,163,184,0.05)', border: '1px solid #1e293b', borderRadius: '7px', padding: '0.5rem 0.7rem', marginBottom: '0.8rem', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6 }}>
                                                    🥄 Répartir <strong style={{ color: '#e2e8f0' }}>{firstRecipe ? `${firstRecipe.emoji} ${firstRecipe.name}` : 'cet accompagnement'}</strong> équitablement dans les{' '}
                                                    <strong style={{ color: '#38bdf8' }}>{totalBoxes} boîtes</strong>{' '}
                                                    (~<strong style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{perBoxGApprox} g</strong>/boîte)
                                                    {companionStr && (
                                                        <div style={{ marginTop: '0.25rem', color: '#64748b', fontSize: '0.78rem' }}>
                                                            🍱 S'accompagne de{' '}
                                                            <strong style={{ color: '#fbbf24' }}>{companionStr}</strong>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Tableau visuel : Recette → Axel g / Prisca g */}
                                            <div style={{ display: 'grid', gap: '0.25rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', padding: '0 0.4rem 0.3rem', fontSize: '0.62rem', color: '#334155', fontWeight: 700, letterSpacing: '0.5px' }}>
                                                    <span>RECETTE</span>
                                                    <span style={{ color: '#38bdf8', textAlign: 'center' }}>↓ AXEL</span>
                                                    <span style={{ color: '#a78bfa', textAlign: 'center' }}>↓ PRISCA</span>
                                                </div>
                                                {rmList.map(({ recipe, meal, count, persons }) => {
                                                    const axelG   = Math.round((persons.axel   || 0) * effectCoef);
                                                    const priscaG = Math.round((persons.prisca || 0) * effectCoef);
                                                    return (
                                                        <div key={`${recipe.id}_${meal}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', alignItems: 'center', background: 'rgba(0,0,0,0.12)', borderRadius: '6px', padding: '0.4rem 0.45rem' }}>
                                                            <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.3 }}>
                                                                {recipe.emoji} {recipe.name.split(/[\s—–-]/)[0]}
                                                                <br />
                                                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: meal === 'midi' ? '#fbbf24' : '#818cf8', letterSpacing: '1px' }}>{meal === 'midi' ? 'MIDI' : 'SOIR'}</span>{' '}
                                                                <span style={{ fontSize: '0.66rem', color: '#475569' }}>× {count}j</span>
                                                            </div>
                                                            <div style={{ textAlign: 'center' }}>
                                                                <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#38bdf8', fontSize: '1.05rem', lineHeight: 1 }}>{axelG}g</div>
                                                                <div style={{ fontSize: '0.62rem', color: '#334155' }}>×{count} = {axelG * count}g</div>
                                                            </div>
                                                            <div style={{ textAlign: 'center' }}>
                                                                <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#a78bfa', fontSize: '1.05rem', lineHeight: 1 }}>{priscaG}g</div>
                                                                <div style={{ fontSize: '0.62rem', color: '#334155' }}>×{count} = {priscaG * count}g</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ─────────────── VUE 4 : FATSECRET ─────────────── */}
                    {activeView === 'fatsecret' && (
                        <div style={S.panel}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={S.panelTitle}>🧾 À SAISIR DANS FATSECRET</div>
                                <button onClick={copyFatSecret} style={{
                                    ...S.copyBtn,
                                    background: fsCopied ? 'rgba(74,222,128,0.15)' : 'rgba(56,189,248,0.12)',
                                    borderColor: fsCopied ? '#4ade80' : '#38bdf8',
                                    color: fsCopied ? '#4ade80' : '#38bdf8',
                                }}>
                                    {fsCopied ? <Check size={13} /> : <Copy size={13} />}
                                    {fsCopied ? 'Copié !' : 'Copier tout'}
                                </button>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '1rem', lineHeight: 1.5 }}>
                                Chaque plat est listé <strong>une seule fois</strong> (mêmes quantités quel que soit le jour) : crée-le une fois dans FatSecret, applique-le aux jours indiqués. Le « fixe chaque jour » = petit-déj + collation 16h + œufs du soir (+ fromage).
                                ⚠️ Les recettes batch contiennent déjà leur crème / légumes / huile — ne les recompte pas.
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.25rem' }}>
                                {buildFatSecretData().map(pd => (
                                    <div key={pd.key} style={{ border: `1px solid ${pd.color}30`, borderRadius: '10px', padding: '0.9rem' }}>
                                        <div style={{ color: pd.color, fontWeight: 800, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{pd.label}</span>
                                            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>cible {pd.target} kcal/j</span>
                                        </div>

                                        <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.8px', margin: '0.4rem 0 0.25rem' }}>FIXE CHAQUE JOUR</div>
                                        <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
                                            <tbody>
                                                {pd.socle.items.map((i, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '0.2rem 0.3rem', color: '#cbd5e1' }}>{i.name}<span style={{ color: '#475569' }}> · {i.detail}</span></td>
                                                        <td style={{ padding: '0.2rem 0.3rem', textAlign: 'right', fontFamily: 'monospace', color: '#e2e8f0' }}>{Math.round(i.kcal)}</td>
                                                        <td style={{ padding: '0.2rem 0.3rem', textAlign: 'right', fontFamily: 'monospace', color: '#4ade80' }}>{i.prot}P</td>
                                                        <td style={{ padding: '0.2rem 0.3rem', textAlign: 'right', fontFamily: 'monospace', color: '#fb923c' }}>{i.lip}L</td>
                                                        <td style={{ padding: '0.2rem 0.3rem', textAlign: 'right', fontFamily: 'monospace', color: '#facc15' }}>{i.glu}G</td>
                                                    </tr>
                                                ))}
                                                <tr style={{ fontWeight: 800 }}>
                                                    <td style={{ padding: '0.3rem', color: '#94a3b8' }}>Sous-total fixe</td>
                                                    <td style={{ padding: '0.3rem', textAlign: 'right', fontFamily: 'monospace' }}>{Math.round(pd.socle.total.kcal)}</td>
                                                    <td style={{ padding: '0.3rem', textAlign: 'right', fontFamily: 'monospace', color: '#4ade80' }}>{pd.socle.total.prot.toFixed(0)}P</td>
                                                    <td style={{ padding: '0.3rem', textAlign: 'right', fontFamily: 'monospace', color: '#fb923c' }}>{pd.socle.total.lip.toFixed(0)}L</td>
                                                    <td style={{ padding: '0.3rem', textAlign: 'right', fontFamily: 'monospace', color: '#facc15' }}>{pd.socle.total.glu.toFixed(0)}G</td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.8px', margin: '0.9rem 0 0.4rem' }}>PLATS — UNE FOIS CHACUN</div>
                                        {pd.dishes.length === 0 && <div style={{ fontSize: '0.72rem', color: '#475569' }}>Assigne des recettes aux jours (étape 2).</div>}
                                        {pd.dishes.map((d, di) => (
                                            <div key={di} style={{ marginBottom: '0.6rem', padding: '0.5rem 0.6rem', background: 'rgba(15,23,42,0.5)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.25 }}>{d.emoji} {d.name}</span>
                                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: d.meal === 'midi' ? '#fbbf24' : '#818cf8', letterSpacing: '0.5px', flexShrink: 0 }}>{d.meal === 'midi' ? 'MIDI' : 'SOIR'}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                    <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{d.kcal} kcal</span>
                                                    <span style={{ color: '#4ade80' }}>{d.prot}g P</span>
                                                    <span style={{ color: '#fb923c' }}>{d.lip}g L</span>
                                                    <span style={{ color: '#facc15' }}>{d.glu}g G</span>
                                                </div>
                                                <div style={{ fontSize: '0.64rem', color: '#64748b', marginTop: '0.25rem' }}>
                                                    Jours : {d.days.join(' · ')} <span style={{ opacity: 0.7 }}>({d.days.length}×)</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* État vide */}
            {selectedIds.length === 0 && (
                <div style={S.emptyState}>
                    <ChefHat size={36} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.25 }} />
                    <p>Sélectionne des recettes ci-dessus pour commencer</p>
                </div>
            )}

            {/* ── Modal détail recette ── */}
            {previewRecipe && createPortal(
                <div
                    onClick={() => setPreviewRecipe(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                        padding: '2rem 1rem', overflowY: 'auto',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '100%', maxWidth: '640px',
                            background: '#0f172a', border: '1px solid #1e293b',
                            borderRadius: '16px', overflow: 'hidden',
                        }}
                    >
                        {/* ── Header ── */}
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{previewRecipe.emoji}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.3 }}>{previewRecipe.name}</h3>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem', fontSize: '0.78rem' }}>
                                    <span style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '4px', padding: '0.1rem 0.45rem', fontWeight: 700 }}>{previewRecipe.kcal} kcal</span>
                                    <span style={{ background: 'rgba(74,222,128,0.1)',  border: '1px solid #4ade80', color: '#4ade80',  borderRadius: '4px', padding: '0.1rem 0.45rem', fontWeight: 700 }}>{previewRecipe.prot}g P</span>
                                    <span style={{ background: 'rgba(251,146,60,0.1)',  border: '1px solid #fb923c', color: '#fb923c',  borderRadius: '4px', padding: '0.1rem 0.45rem', fontWeight: 700 }}>{previewRecipe.lip}g L</span>
                                    <span style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid #a78bfa', color: '#a78bfa',  borderRadius: '4px', padding: '0.1rem 0.45rem', fontWeight: 700 }}>{previewRecipe.glu}g G</span>
                                    <span style={{ color: '#64748b', padding: '0.1rem 0.2rem', fontSize: '0.72rem' }}>
                                        🕒 {previewRecipe.prep_active} actif · {previewRecipe.prep_inactive} cuisson &nbsp;·&nbsp; 💶 {previewRecipe.price}€/portion
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setPreviewRecipe(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '0.2rem', flexShrink: 0 }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* ── Corps ── */}
                        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                            {/* Description + tip */}
                            <div>
                                <p style={{ margin: '0 0 0.5rem', color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.6 }}>{previewRecipe.description}</p>
                                {previewRecipe.tips && (
                                    <p style={{ margin: 0, color: '#fbbf24', fontSize: '0.82rem', fontStyle: 'italic', paddingLeft: '0.75rem', borderLeft: '2px solid #fbbf24' }}>
                                        💡 {previewRecipe.tips}
                                    </p>
                                )}
                            </div>

                            {/* Tableau ingrédients */}
                            {Array.isArray(previewRecipe.ingredients) && previewRecipe.ingredients.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '1.5px', marginBottom: '0.6rem' }}>📊 INGRÉDIENTS (1 PORTION)</div>
                                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #1e293b' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', background: 'rgba(0,0,0,0.4)', padding: '0.45rem 0.75rem', fontSize: '0.62rem', fontWeight: 700, color: '#475569', letterSpacing: '0.5px', gap: '0.5rem' }}>
                                            <span>INGRÉDIENT</span>
                                            <span style={{ textAlign: 'right', color: '#38bdf8' }}>QUANTITÉ</span>
                                            <span style={{ textAlign: 'right', color: '#4ade80' }}>PROT</span>
                                            <span style={{ textAlign: 'right', color: '#fb923c' }}>LIP</span>
                                            <span style={{ textAlign: 'right', color: '#a78bfa' }}>GLU</span>
                                        </div>
                                        {previewRecipe.ingredients.map((ing, i) => {
                                            const prot = Math.round(ing.qty_g * ing.prot_100 / 100 * 10) / 10;
                                            const lip  = Math.round(ing.qty_g * ing.lip_100  / 100 * 10) / 10;
                                            const glu  = Math.round(ing.qty_g * ing.glu_100  / 100 * 10) / 10;
                                            const qty  = fmtIng(ing.name, ing.qty_g, ing.unit, ing.g_per_pc, ing.fixed_qty);
                                            const isPst = ing.is_pst;
                                            return (
                                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', alignItems: 'center', padding: '0.4rem 0.75rem', gap: '0.5rem', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <span style={{ color: isPst ? '#fbbf24' : '#e2e8f0', fontSize: '0.83rem', fontWeight: isPst ? 700 : 400 }}>
                                                        {ing.name}{isPst ? ' ★' : ''}
                                                    </span>
                                                    <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.82rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{qty}</span>
                                                    <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: '0.78rem', textAlign: 'right' }}>{prot}g</span>
                                                    <span style={{ color: '#fb923c', fontFamily: 'monospace', fontSize: '0.78rem', textAlign: 'right' }}>{lip}g</span>
                                                    <span style={{ color: '#a78bfa', fontFamily: 'monospace', fontSize: '0.78rem', textAlign: 'right' }}>{glu}g</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Protocole — étapes cochables + prochaine étape mise en avant */}
                            {(() => {
                                const steps = extractProtocol(previewMd);
                                const rid = previewRecipe.id;
                                const isDone = (i) => !!doneSteps[`${rid}_${i}`];
                                const doneCount = steps.filter((_, i) => isDone(i)).length;
                                const nextIdx = steps.findIndex((_, i) => !isDone(i));
                                const toggleStep = (i) => setDoneSteps(prev => {
                                    const k = `${rid}_${i}`; const n = { ...prev };
                                    if (n[k]) delete n[k]; else n[k] = true; return n;
                                });
                                return (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '1.5px' }}>👨‍🍳 PROTOCOLE</div>
                                            {steps.length > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.72rem', color: doneCount === steps.length ? '#4ade80' : '#64748b', fontWeight: 700 }}>{doneCount}/{steps.length}</span>
                                                    {doneCount > 0 && <button onClick={() => setDoneSteps(prev => { const n = { ...prev }; steps.forEach((_, i) => delete n[`${rid}_${i}`]); return n; })} style={{ fontSize: '0.62rem', background: 'none', border: '1px solid #334155', borderRadius: '4px', color: '#64748b', cursor: 'pointer', padding: '0.1rem 0.4rem' }}>Réinitialiser</button>}
                                                </div>
                                            )}
                                        </div>
                                        {loadingPreview ? (
                                            <p style={{ color: '#475569', fontSize: '0.85rem' }}>Chargement…</p>
                                        ) : steps.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                {steps.map((step, i) => {
                                                    const text = step.replace(/^\d+\.\s*/, '');
                                                    const done = isDone(i);
                                                    const isNext = i === nextIdx;
                                                    return (
                                                        <button key={i} onClick={() => toggleStep(i)} style={{
                                                            display: 'flex', gap: '0.6rem', alignItems: 'flex-start', textAlign: 'left', width: '100%',
                                                            background: isNext ? 'rgba(56,189,248,0.10)' : 'transparent',
                                                            border: `1px solid ${isNext ? '#38bdf8' : 'transparent'}`,
                                                            borderRadius: '8px', padding: '0.5rem 0.6rem', cursor: 'pointer',
                                                        }}>
                                                            <span style={{
                                                                flexShrink: 0, width: '20px', height: '20px', borderRadius: '5px', marginTop: '0.1rem',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem',
                                                                background: done ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
                                                                border: `1.5px solid ${done ? '#4ade80' : isNext ? '#38bdf8' : '#334155'}`,
                                                                color: '#4ade80',
                                                            }}>{done ? '✓' : i + 1}</span>
                                                            <span style={{ flex: 1 }}>
                                                                {isNext && <span style={{ display: 'block', fontSize: '0.58rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.8px', marginBottom: '0.15rem' }}>👉 PROCHAINE ÉTAPE</span>}
                                                                <span style={{ color: done ? '#475569' : '#cbd5e1', fontSize: '0.86rem', lineHeight: 1.55, textDecoration: done ? 'line-through' : 'none' }}>
                                                                    {renderInline(text)}
                                                                </span>
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p style={{ color: '#475569', fontSize: '0.85rem' }}>Protocole non disponible.</p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
    pageTitle:   { fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fff' },
    stepLabel:   { fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '0.75rem' },
    recipeGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 230px), 1fr))', gap: '0.75rem', marginTop: '0.75rem' },
    recipeCard:  { borderRadius: '12px', padding: '0.9rem 1rem', textAlign: 'left', transition: 'all 0.15s', touchAction: 'manipulation' },
    recipeMacros:{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.15rem' },
    autoBtn:     { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', background: 'rgba(56,189,248,0.1)', border: '1px solid #38bdf8', borderRadius: '7px', color: '#38bdf8', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', touchAction: 'manipulation' },
    weekGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '0.75rem' },
    dayCard:     { background: 'rgba(15,23,42,0.6)', border: '1px solid #1e293b', borderRadius: '10px', padding: '0.9rem 1rem' },
    dayLabel:    { fontWeight: 700, color: '#475569', fontSize: '0.7rem', letterSpacing: '1.5px', marginBottom: '0.6rem' },
    daySelect:   { width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', padding: '0.35rem 0.5rem', fontSize: '0.82rem', marginBottom: '0.25rem' },
    dayMacros:   { fontSize: '0.73rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', paddingLeft: '0.25rem' },
    tabBtn:      { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', border: '1px solid', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', touchAction: 'manipulation', transition: 'all 0.15s' },
    panel:       { background: 'rgba(15,23,42,0.6)', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem' },
    panelTitle:  { fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '1.5px' },
    copyBtn:     { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.38rem 0.9rem', border: '1px solid', borderRadius: '6px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600, touchAction: 'manipulation', transition: 'all 0.2s' },
    boxCard:     { background: 'rgba(0,0,0,0.2)', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem 1.1rem' },
    emptyState:  { textAlign: 'center', color: '#475569', padding: '3rem 2rem', background: 'rgba(15,23,42,0.4)', borderRadius: '12px', border: '1px dashed #1e293b' },
};

export default BatchCooking;
