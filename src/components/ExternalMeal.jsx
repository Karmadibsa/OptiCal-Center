import React from 'react';
import { calculatePlan, SOCLE_DATA, PASTA_REF } from '../utils/dietAlgo';
import {
    Utensils, ChefHat, CheckCircle, Info,
    TrendingDown, ShieldCheck, Salad, Sun, Moon,
    Copy, ClipboardCheck
} from 'lucide-react';

// ─── Helper ──────────────────────────────────────────────────────────────────
const r = (n, d = 0) => {
    const f = Math.pow(10, d);
    return Math.round((n || 0) * f) / f;
};

// ─── Budget SOIR ─────────────────────────────────────────────────────────────
const calcEveningBudget = (key, profiles) => {
    const plan        = calculatePlan(key, profiles);
    const p           = profiles[key];
    const optFromage  = Math.max(0, Number(p.opt_fromage)  || 0);
    const optFbSoir   = Boolean(p.opt_fb_soir);

    const items = [
        {
            name: 'Pâtes Protein+',
            detail: `${r(plan.pasta_soir)}g cru`,
            kcal: r(plan.pasta_soir * PASTA_REF.kcal / 100),
            prot: r(plan.pasta_soir * PASTA_REF.prot / 100, 1),
            lip:  r(plan.pasta_soir * 2   / 100, 1),
            glu:  r(plan.pasta_soir * 62  / 100, 1),
        },
        {
            name: `Œufs entiers (×${plan.oeuf_qty_per_meal})`,
            detail: '—',
            kcal: plan.oeuf_qty_per_meal * 80,
            prot: plan.oeuf_qty_per_meal * 6,
            lip:  plan.oeuf_qty_per_meal * 5,
            glu:  0,
        },
        {
            name: 'Crème Fraîche 30%',
            detail: '30g',
            kcal: SOCLE_DATA.common.soir_creme.kcal,
            prot: SOCLE_DATA.common.soir_creme.prot,
            lip:  9,
            glu:  1,
        },
    ];

    if (optFromage > 0) {
        items.push({
            name: 'Option Fromage',
            detail: `${optFromage}g`,
            kcal: r(optFromage * 4),
            prot: r(optFromage * 0.25, 1),
            lip:  r(optFromage * 0.33, 1),
            glu:  0,
        });
    }

    // Fromage Blanc — toujours affiché, grisé si désactivé
    items.push({
        name: 'Fromage Blanc 0%',
        detail: optFbSoir
            ? (plan.fb_qty > 0 ? `${r(plan.fb_qty)}g` : '0g (pas de déficit prot.)')
            : 'Option désactivée',
        kcal: optFbSoir ? r(plan.fb_qty * 0.48) : 0,
        prot: optFbSoir ? r(plan.fb_qty * 0.08, 1) : 0,
        lip:  0,
        glu:  optFbSoir ? r(plan.fb_qty * 0.04, 1) : 0,
        disabled: !optFbSoir,
    });

    const activeItems = items.filter(it => !it.disabled);
    const total = activeItems.reduce(
        (acc, it) => ({
            kcal: acc.kcal + it.kcal,
            prot: acc.prot + it.prot,
            lip:  acc.lip  + it.lip,
            glu:  acc.glu  + it.glu,
        }),
        { kcal: 0, prot: 0, lip: 0, glu: 0 }
    );

    return {
        items,
        total: { kcal: r(total.kcal), prot: r(total.prot, 1), lip: r(total.lip, 1), glu: r(total.glu, 1) },
        plan,
    };
};

// ─── Budget MIDI ──────────────────────────────────────────────────────────────
const calcLunchBudget = (key, profiles) => {
    const plan       = calculatePlan(key, profiles);
    const optFromage = Math.max(0, Number(profiles[key].opt_fromage) || 0);

    const items = [
        {
            name: 'PST (Soja Texturé)',
            detail: `${plan.pst_qty}g cru`,
            kcal: r(plan.pst_qty * 3.3),
            prot: r(plan.pst_qty * 0.5, 1),
            lip:  r(plan.pst_qty * 0.05, 1),
            glu:  r(plan.pst_qty * 0.30, 1),
        },
        {
            name: 'Pâtes Protein+',
            detail: `${r(plan.pasta_midi)}g cru (55%)`,
            kcal: r(plan.pasta_midi * PASTA_REF.kcal / 100),
            prot: r(plan.pasta_midi * PASTA_REF.prot / 100, 1),
            lip:  r(plan.pasta_midi * 2 / 100, 1),
            glu:  r(plan.pasta_midi * 62 / 100, 1),
        },
        {
            name: 'Crème Fraîche 30%',
            detail: '30g',
            kcal: SOCLE_DATA.common.midi_creme.kcal,
            prot: SOCLE_DATA.common.midi_creme.prot,
            lip:  9,
            glu:  1,
        },
        {
            name: 'Légumes (à volonté)',
            detail: '~225g',
            kcal: 90,   // 225g × 40kcal/100g
            prot: 6,    // ~2.5g/100g × 225g
            lip:  0,
            glu:  15,
        },
    ];

    if (optFromage > 0) {
        items.push({
            name: 'Option Fromage',
            detail: `${optFromage}g`,
            kcal: r(optFromage * 4),
            prot: r(optFromage * 0.25, 1),
            lip:  r(optFromage * 0.33, 1),
            glu:  0,
        });
    }

    const total = items.reduce(
        (acc, it) => ({ kcal: acc.kcal + it.kcal, prot: acc.prot + it.prot, lip: acc.lip + it.lip, glu: acc.glu + it.glu }),
        { kcal: 0, prot: 0, lip: 0, glu: 0 }
    );

    return {
        items,
        total: { kcal: r(total.kcal), prot: r(total.prot, 1), lip: r(total.lip, 1), glu: r(total.glu, 1) },
        plan,
    };
};

// ─── Barre macro ──────────────────────────────────────────────────────────────
const MacroBar = ({ label, val, unit, max, color }) => {
    const pct = Math.min(100, Math.round(((val || 0) / (max || 1)) * 100));
    return (
        <div className="em-macro-row">
            <div className="em-macro-labels">
                <span>{label}</span>
                <span style={{ color, fontWeight: 700 }}>{val}{unit}</span>
            </div>
            <div className="macro-bar">
                <div className="macro-bar-fill" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}80` }} />
            </div>
            <span className="em-bar-pct">{pct}%</span>
        </div>
    );
};

// ─── Panneau budget (midi ou soir) ────────────────────────────────────────────
const BudgetPanel = ({ label, budget, color, glow, profileKey, meal }) => {
    const { items, total, plan } = budget;
    const [open, setOpen] = React.useState(false);

    return (
        <div className="card em-panel" style={{ borderTop: `3px solid ${color}`, background: glow }}>
            <div className="em-panel-header">
                <span className="em-panel-name" style={{ color }}>{label}</span>
                <span className="em-panel-kcal" style={{ color }}>{total.kcal} <small>kcal</small></span>
            </div>

            <div className="em-macro-bars">
                <MacroBar label="Calories"  val={total.kcal} unit=" kcal" max={plan.target_daily} color={color} />
                <MacroBar label="Protéines" val={total.prot} unit="g"     max={plan.prot_goal}    color="#4ade80" />
                <MacroBar label="Lipides"   val={total.lip}  unit="g"     max={meal === 'midi' ? 60 : 80} color="#fb923c" />
                <MacroBar label="Glucides"  val={total.glu}  unit="g"     max={meal === 'midi' ? 150 : 150} color="#facc15" />
            </div>

            <div className="em-targets">
                <div className="em-target-row">
                    <ShieldCheck size={14} style={{ color: '#4ade80' }} />
                    <span>Protéines min.</span>
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>≥ {total.prot}g</span>
                </div>
                <div className="em-target-row">
                    <TrendingDown size={14} style={{ color: '#fb923c' }} />
                    <span>Lipides max.</span>
                    <span style={{ color: '#fb923c', fontWeight: 700 }}>≤ {r(total.lip + 10, 0)}g</span>
                </div>
            </div>

            <button
                id={`btn-detail-${profileKey}-${meal}`}
                className="em-toggle-btn"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
            >
                <span>{open ? 'Masquer' : 'Voir le détail du repas théorique'}</span>
                <span className={`em-chevron ${open ? 'em-chevron-open' : ''}`}>▾</span>
            </button>

            {open && (
                <div className="em-detail-wrap animate-fade-in">
                    <table className="diet-table em-detail-table">
                        <thead>
                            <tr><th>Aliment</th><th>Qté</th><th>Kcal</th><th>Prot</th><th>Lip</th><th>Glu</th></tr>
                        </thead>
                        <tbody>
                            {items.map((it, i) => (
                                <tr key={i} style={{ opacity: it.disabled ? 0.35 : 1 }}>
                                    <td className="ds-td-name">{it.name}</td>
                                    <td className="ds-td-detail">{it.detail}</td>
                                    <td>{it.disabled ? '—' : it.kcal}</td>
                                    <td style={{ color: '#4ade80' }}>{it.disabled ? '—' : `${it.prot}g`}</td>
                                    <td style={{ color: '#fb923c' }}>{it.disabled ? '—' : `${it.lip}g`}</td>
                                    <td style={{ color: '#facc15' }}>{it.disabled ? '—' : `${it.glu}g`}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="ds-tfoot-total">
                                <td colSpan="2">TOTAL {meal.toUpperCase()}</td>
                                <td>{total.kcal}</td>
                                <td style={{ color: '#4ade80' }}>{total.prot}g</td>
                                <td style={{ color: '#fb923c' }}>{total.lip}g</td>
                                <td style={{ color: '#facc15' }}>{total.glu}g</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};

// ─── Données statiques ────────────────────────────────────────────────────────
const TIPS = [
    { icon: '🥩', title: 'Protéines maigres en priorité',   text: 'Poulet grillé, poisson blanc, crevettes, tofu ferme — les meilleures sources sans exploser les lipides.' },
    { icon: '🚫', title: 'Limiter les sauces grasses',       text: 'Béarnaise, crème, beurre blanc : jusqu\'à +300 kcal invisibles. Demandez la sauce à part.' },
    { icon: '🥗', title: 'Entrée légume en volume',          text: 'Salade verte ou soupe légère pour saturer l\'appétit avant le plat principal.' },
    { icon: '🍝', title: 'Féculents simples, pas en sauce',  text: 'Riz nature, pasta al dente, patate douce — éviter les gratins et risottos au beurre.' },
    { icon: '🍷', title: 'Maîtriser l\'alcool',              text: '1 verre de vin ≈ 85 kcal "vides". 1 coupe de champagne max, sinon eau pétillante.' },
    { icon: '📏', title: 'Contrôler les portions',           text: 'Assiette = ½ légumes + ¼ protéine + ¼ féculent. Éviter le pain en attendant le plat.' },
];

const EXAMPLES_SOIR = [
    {
        context: '🍽️ Restaurant classique', tag: 'Idéal', tagColor: '#4ade80',
        dishes: ['Salade verte ou œufs mimosa (pas de croûtons)', 'Filet poulet / poisson + légumes vapeur', 'Yaourt nature ou fromage blanc dessert'],
        comment: 'Option la plus facile à contrôler — protéines excellentes.',
    },
    {
        context: '🍕 Soirée pizza / chez des amis', tag: 'Acceptable', tagColor: '#facc15',
        dishes: ['2 parts de pizza Margherita (≈ 560 kcal, 22g prot)', 'Salade verte en accompagnement', 'Refuser le dessert sucré'],
        comment: 'Un peu juste en protéines — compenser le lendemain midi.',
    },
    {
        context: '🥩 Steak house / barbecue', tag: 'Excellent', tagColor: '#38bdf8',
        dishes: ['Steak 200g + haricots verts (≈ 400 kcal, 42g prot)', 'Éviter frites et sauces', 'Un petit fromage si budget restant'],
        comment: 'Option protéique par excellence — surveiller uniquement les lipides.',
    },
];

const EXAMPLES_MIDI = [
    {
        context: '🥗 Fast food / sandwicherie', tag: 'Correct', tagColor: '#facc15',
        dishes: ['Bowl poulet/riz + légumes (≈ 550 kcal, 38g prot)', 'Éviter les sauces crémeuses', 'Eau ou boisson sans sucre'],
        comment: 'Le bowl est votre meilleur allié en fast food.',
    },
    {
        context: '🍱 Bento / sushis', tag: 'Bon', tagColor: '#4ade80',
        dishes: ['12 pièces sushi/maki (≈ 450 kcal, 25g prot)', 'Soupe miso en entrée (faible cal.)', 'Edamame pour les protéines manquantes'],
        comment: 'Attention aux sauces sucrées et aux tempura.',
    },
    {
        context: '🧆 Resto libanais / méditerranéen', tag: 'Idéal', tagColor: '#38bdf8',
        dishes: ['Assiette houmous + crudités + brochette chicken', 'Taboulé (portion modérée)', 'Éviter les pains/pitas en excès'],
        comment: 'Cuisine naturellement équilibrée — excellent choix midi.',
    },
];

// ─── Composant principal ──────────────────────────────────────────────────────
const ExternalMeal = ({ profiles }) => {
    const [meal,   setMeal]   = React.useState('soir');
    const [copied, setCopied] = React.useState(null);

    const budgetFn = meal === 'soir' ? calcEveningBudget : calcLunchBudget;

    const budgetAxel   = budgetFn('axel',   profiles);
    const budgetPrisca = budgetFn('prisca', profiles);

    const examples = meal === 'soir' ? EXAMPLES_SOIR : EXAMPLES_MIDI;

    // ── Génère les prompts IA ──────────────────────────────────────────────────
    const generateRestaurantPrompt = () => {
        const mealLabel = meal === 'midi' ? 'du midi' : 'du soir';
        const ba = budgetAxel.total;
        const bp = budgetPrisca.total;
        return [
            `Je cherche des idées de repas ${mealLabel} adaptés aux besoins nutritionnels de deux personnes.`,
            ``,
            `👤 Axel :`,
            `• Calories cibles : ${ba.kcal} kcal`,
            `• Protéines : ≥ ${ba.prot}g`,
            `• Lipides : ≤ ${r(ba.lip + 10, 0)}g`,
            `• Glucides : ~${ba.glu}g`,
            ``,
            `👤 Prisca :`,
            `• Calories cibles : ${bp.kcal} kcal`,
            `• Protéines : ≥ ${bp.prot}g`,
            `• Lipides : ≤ ${r(bp.lip + 10, 0)}g`,
            `• Glucides : ~${bp.glu}g`,
            ``,
            `⚠️ Important : Prisca mange la même chose qu'Axel, en quantité réduite. Propose un seul repas pour les deux — pas deux repas différents. Les portions s'adaptent, l'assiette reste la même.`,
            ``,
            `Propose 3 à 5 idées de repas (cuisine maison, un peu porn food, simple à faire) adaptés à ces macros.`,
            `Les repas doivent être rassasiants et cohérents — évite les suggestions insuffisantes comme "1 part de pizza" ou "une petite salade" pour quelqu'un qui a ${ba.kcal} kcal à couvrir.`,
            ``,
            `Pour chaque idée, donne :`,
            `- Le nom du plat`,
            `- Les quantités pour Axel et pour Prisca`,
            `- Une estimation des macros (kcal, prot, lip, glu) pour chacun`,
            `- Une estimation du prix (pour les deux)`,
            `- Une estimation du temps de préparation`,
            ``,
            `Contexte : régime de prise de masse / rééquilibrage avec déficit calorique modéré.`,
        ].join('\n');
    };

    const generateRecipePrompt = () => {
        const mealLabel = meal === 'midi' ? 'MIDI' : 'SOIR';
        const ba = budgetAxel.total;
        const bp = budgetPrisca.total;
        const totalKcal = Math.round(ba.kcal + bp.kcal);
        
        return `Agis en tant que nutritionniste et chef culinaire spécialisé dans les macros (diète sportive et rééquilibrage). 
Je souhaite créer une bibliothèque de recettes saines, savoureuses (un peu "porn food" mais healthy) pour les ajouter directement sur mon site web.

Je cherche 3 idées de recettes pour le ${mealLabel}.

### CONTEXTE ET OBJECTIF GLOBAL
L'application calculera dynamiquement les quantités pour Axel (qui a gros appétit) et Prisca (petit appétit).
Tu dois donc imaginer **UN SEUL PLAT GLOBAL** dont le but calorique cumulé (la poêle pleine) approche les **${totalKcal} kcal au total** (soit environ ${ba.kcal}kcal pour Axel + ${bp.kcal}kcal pour Prisca).
- Ratio du plat attendu : Riche en protéines (viande, tofu, poisson), lipides contrôlés, féculents sains.

### CONTRAINTES DE LA RECETTE
1. Simple et sans prise de tête (max 30 min de préparation active).
2. Invoquer de bonnes sources de protéines maigres, et ne pas exploser le compteur de lipides.
3. Données réalistes : inclure une estimation du coût global et du temps.

### FORMAT DE SORTIE ATTENDU
Pour chaque recette, tu dois me livrer le code EXHAUSTIF au format "Markdown avec Frontmatter YAML", copiable directement.
Utilise ce template strict avec le Frontmatter suivant :

---
id: [un nombre aléatoire entre 200 et 900]
name: [Nom sexy de la recette]
category: plats|viande (ou plats|vege, plats|poisson)
kcal: [kcal total de la base de la recette] 
prot: [prot total]
lip: [lip total]
glu: [glu total]
price: [prix total estimé de la base de la recette, ex: 8.50]
prep_active: [temps actif aux fourneaux, ex: 15 min]
prep_inactive: [temps de repos/cuisson seul, ex: 20 min (laisser vide si <5m)]
description: [Courte description donnant envie]
tips: [Une petite astuce de cuisson ou de conservation]
emoji: [Un emoji représentant le plat]
---

### 📊 Matrice des Ingrédients (Obligatoire, respecte ce format de tableau !)
*(Ajoute les macros pour chaque ligne pour LA PORTION BASE que tu as définie)*
| Ingrédient | Qty Base | Unité | Kcal | Prot | Lip | Glu | Divisible | Vol. Cuit | Prix estimé (€) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Poulet | 200 | g | 220 | 44 | 4 | 0 | oui | non | 2.50 |
| Riz cru | 100 | g | 350 | 8 | 1 | 78 | oui | oui | 0.35 |
| Galette Blé | 2 | u | 160 | 10 | 4 | 20 | non (0.5 minimum) | non | 0.80 |

### Protocole
1. **Étape 1** — ...
2. **Étape 2** — ...
3. **Étape 3** — ...`;
    };

    const handleCopyRestaurant = () => {
        navigator.clipboard.writeText(generateRestaurantPrompt()).then(() => {
            setCopied('restaurant');
            setTimeout(() => setCopied(null), 3000);
        });
    };

    const handleCopyRecipe = () => {
        navigator.clipboard.writeText(generateRecipePrompt()).then(() => {
            setCopied('recipe');
            setTimeout(() => setCopied(null), 3000);
        });
    };

    return (
        <div className="section-container animate-fade-in">
            <div className="ds-header">
                <div>
                    <h2><Utensils size={26} /> Guide Repas Externe</h2>
                    <p className="ds-subtitle">Budgets pour remplacer un repas à l'extérieur sans casser la diète.</p>
                </div>
            </div>

            {/* ── Sélecteur Midi / Soir ── */}
            <div className="em-meal-tabs">
                <button
                    id="btn-tab-midi"
                    className={`em-meal-tab ${meal === 'midi' ? 'em-meal-tab-active' : ''}`}
                    onClick={() => setMeal('midi')}
                >
                    <Sun size={16} /> Repas du Midi
                </button>
                <button
                    id="btn-tab-soir"
                    className={`em-meal-tab ${meal === 'soir' ? 'em-meal-tab-active' : ''}`}
                    onClick={() => setMeal('soir')}
                >
                    <Moon size={16} /> Repas du Soir
                </button>
            </div>

            {/* ── Boutons Copier prompts IA ── */}
            <div className="em-prompt-buttons" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={handleCopyRestaurant}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                        width: '100%', padding: '0.9rem',
                        borderRadius: '12px', cursor: 'pointer',
                        background: copied === 'restaurant' ? 'rgba(74,222,128,0.1)' : 'rgba(129,140,248,0.08)',
                        border: `1px solid ${copied === 'restaurant' ? 'rgba(74,222,128,0.4)' : 'rgba(129,140,248,0.3)'}`,
                        color: copied === 'restaurant' ? '#4ade80' : '#a78bfa',
                        fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9rem',
                        transition: 'all 0.3s', touchAction: 'manipulation',
                    }}
                >
                    {copied === 'restaurant'
                        ? <><ClipboardCheck size={18} /> Demande d'idées copiée !</>
                        : <><Copy size={18} /> Copier demande d'idées (Resto)</>
                    }
                </button>
                <button
                    onClick={handleCopyRecipe}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                        width: '100%', padding: '0.9rem',
                        borderRadius: '12px', cursor: 'pointer',
                        background: copied === 'recipe' ? 'rgba(74,222,128,0.1)' : 'rgba(234,179,8,0.08)',
                        border: `1px solid ${copied === 'recipe' ? 'rgba(74,222,128,0.4)' : 'rgba(234,179,8,0.3)'}`,
                        color: copied === 'recipe' ? '#4ade80' : '#eab308',
                        fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9rem',
                        transition: 'all 0.3s', touchAction: 'manipulation',
                    }}
                >
                    {copied === 'recipe'
                        ? <><ClipboardCheck size={18} /> Format Markdown copié !</>
                        : <><ChefHat size={18} /> Générer de nouvelles recettes</>
                    }
                </button>
            </div>

            {/* ── Bannière info ── */}
            <div className="em-info-banner">
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>
                    Ces valeurs correspondent aux macros que vous auriez mangées <strong>à la maison {meal === 'soir' ? 'le soir' : 'à midi'}</strong>.
                    Restez dans cette fourchette pour que la journée reste équilibrée.
                    Les chiffres se mettent à jour si vous modifiez poids ou sport dans <em>Macro Plan</em>.
                    {!profiles.axel.opt_fb_soir && !profiles.prisca.opt_fb_soir && meal === 'soir' && (
                        <><br /><strong style={{ color: '#f59e0b' }}>💡 Option Fromage Blanc désactivée pour les deux — activez-la dans Macro Plan si besoin.</strong></>
                    )}
                </span>
            </div>

            {/* ── Panneaux budget ── */}
            <div className="card-grid em-panels" style={{ marginBottom: '3rem' }}>
                <BudgetPanel label="🔵 Axel"   budget={budgetAxel}   color="#38bdf8" glow="rgba(56,189,248,0.06)"   profileKey="axel"   meal={meal} />
                <BudgetPanel label="🟣 Prisca" budget={budgetPrisca} color="#818cf8" glow="rgba(129,140,248,0.06)" profileKey="prisca" meal={meal} />
            </div>

            {/* ── Conseils ── */}
            <section className="ds-section">
                <h3 className="ds-section-title"><ChefHat size={19} /> Conseils de Sélection</h3>
                <div className="em-tips-grid">
                    {TIPS.map((tip, i) => (
                        <div key={i} className="em-tip-card">
                            <span className="em-tip-icon">{tip.icon}</span>
                            <div>
                                <strong className="em-tip-title">{tip.title}</strong>
                                <p className="em-tip-text">{tip.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Exemples ── */}
            <section className="ds-section">
                <h3 className="ds-section-title"><Salad size={19} /> Exemples de Repas Adaptés — {meal === 'soir' ? 'Soir' : 'Midi'}</h3>
                <div className="em-examples-grid">
                    {examples.map((ex, i) => (
                        <div key={i} className="em-example-card">
                            <div className="em-example-header">
                                <span className="em-example-context">{ex.context}</span>
                                <span className="em-example-tag" style={{ background: `${ex.tagColor}20`, color: ex.tagColor, borderColor: `${ex.tagColor}40` }}>
                                    {ex.tag}
                                </span>
                            </div>
                            <ul className="em-example-list">
                                {ex.dishes.map((d, j) => (
                                    <li key={j}>
                                        <CheckCircle size={13} className="em-check-icon" />
                                        <span>{d}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="em-example-comment">{ex.comment}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default ExternalMeal;
