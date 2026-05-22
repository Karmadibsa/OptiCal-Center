// ─── Calcul de l'âge depuis la date de naissance ───────────────────────────
export const computeAge = (birthdate) => {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};
// ─── Multiplicateurs d'activité PAL (Physical Activity Level) ─────────────────
// Recommandation diététicienne : budget stable 7j/7, pas de variation par séance
export const PAL_OPTIONS = [
    { value: 1.2,   label: 'Sédentaire',  desc: 'Bureau, peu de déplacements' },
    { value: 1.375, label: 'Peu actif',   desc: '1–3 séances légères / semaine' },
    { value: 1.55,  label: 'Actif',       desc: '3–5 séances / semaine' },
    { value: 1.725, label: 'Très actif',  desc: '6–7 séances intenses / semaine' },
];

export const PASTA_REF = {
    name: "Pâtes Barilla Protein+",
    kcal: 360, // per 100g
    prot: 20   // per 100g
};

export const LIP_MIN_RATIO    = 0.8;  // g lipides / kg — seuil sécurité hormonale
export const LIP_TARGET_RATIO = 0.9;  // g lipides / kg — cible diéto
export const LIP_MAX_RATIO    = 1.0;  // g lipides / kg — plafond indicatif

// Fraction des kcal totales allouées aux repas du déjeuner et dîner (batch cooking).
// Le socle (pain matin, whey, collations) occupe les 35% restants.
export const MEAL_PCT = 0.65;

// Minimum fonctionnel de glucides/j pour le cerveau (OMS / ANSES)
export const GLU_CRITICAL_MIN = 130;

// ─── Oméga-3 Zenement ─────────────────────────────────────────────────────────
// Dose : 2 gélules/soir · 700 mg EPA + 500 mg DHA = 1 200 mg Oméga-3
// Impact macros : 2 g de lipides (≈ 18 kcal) → déduits de la cible lipides cuisine
export const OMEGA3_ZENEMENT = {
    brand:           'Zenement',
    gel_per_dose:    2,      // gélules par jour
    moment:          'soir', // à prendre pendant le dîner
    epa_mg:          700,    // mg EPA par dose (2 gélules)
    dha_mg:          500,    // mg DHA par dose
    total_omega3_mg: 1200,   // mg Oméga-3 total par dose
    lip_per_dose:    2,      // g de lipides par dose (2 000 mg d'huile de poisson)
    kcal_per_dose:   18,     // 2 g × 9 kcal/g
};

export const SOCLE_DATA = {
    common: {
        collation_whey: { kcal: 110, prot: 25 },
        collation_fruit: { kcal: 105, prot: 1 },
        midi_creme: { kcal: 90, prot: 1 },
        soir_creme: { kcal: 90, prot: 1 },
        legumes: { kcal: 100, prot: 4 },
        fromage_unit: { kcal: 4, prot: 0.25 },
    },
    axel: {
        pain_matin: { kcal: 400, prot: 16 },
        matin_whey: { kcal: 110, prot: 25 },
    },
    prisca: {
        pain_matin: { kcal: 232, prot: 10 },
        matin_whey: { kcal: 0, prot: 0 },
    }
};

// ─── Estimations lipides / glucides ───────────────
export const MACRO_EST = {
    pain_axel_lip: 5,    // 140g pain + 30g cancoillotte
    pain_axel_glu: 68,
    pain_prisca_lip: 3,  // 80g pain + 20g cancoillotte
    pain_prisca_glu: 40,
    whey_lip_per: 2,     // par scoop
    whey_glu_per: 3,
    oeuf_lip: 5,         // par œuf entier
    creme_lip_per_30g: 9,// 30% crème fraîche
    // Légumes : ~225g × 2 = 450g/j
    legumes_kcal_jours: 190,
    legumes_prot_jour: 12,
    legumes_glu_jour: 30,
    creme_glu: 1,
    banane_kcal: 105,
    banane_prot: 1,
    banane_glu: 25,
    fromage_unit_lip: 0.33,
    pasta_lip_per_100g: 2,
    pasta_glu_per_100g: 62,
    fb_glu_per_g: 0.04,
    pst_lip: 0.05,
    pst_glu: 0.3,
};


export const DEFAULT_PROFILES = {
    axel: {
        weight: 110,
        form_weight: 95,   // poids de forme (cible) — utilisé pour protéines & lipides
        height: 183,
        birthdate: '1999-07-03', // 3 juillet 1999
        gender: 'male',
        // Objectif protéines libre en g/kg (ex: 1.6, 2.0, 1.8...)
        prot_ratio: 1.6,
        lip_ratio:  0.9,  // g lipides / kg — cible diéto (0.8-1.0)
        pal: 1.375,        // Physical Activity Level — budget identique 7j/7
        deficit: 300,
        opt_fromage: 0,
        opt_fb_soir: false,
        glu_target: 0,          // 0 = calculé auto (résiduel kcal) ; >0 = cible manuelle
        last_weighed: '',       // date ISO 'YYYY-MM-DD' de la dernière pesée
        opt_whey_matin:     true, // shaker du matin (Axel uniquement)
        opt_whey_collation: true, // shaker de 16h — peut être supprimé si batch couvre les prot.
        opt_omega3:         true, // 2 gélules Zenement le soir (700 EPA + 500 DHA)
    },
    prisca: {
        weight: 62,
        form_weight: 62,   // poids de forme (= poids actuel pour Prisca)
        height: 160,
        birthdate: '1999-04-04', // 4 avril 1999
        gender: 'female',
        prot_ratio: 1.6,
        lip_ratio:  0.9,
        pal: 1.375,        // Physical Activity Level — budget identique 7j/7
        deficit: 300,
        opt_fromage: 0,
        opt_fb_soir: false,
        glu_target: 0,          // 0 = calculé auto (résiduel kcal) ; >0 = cible manuelle
        last_weighed: '',
        opt_whey_matin:     false, // pas de whey matin pour Prisca (absent dans le plan)
        opt_whey_collation: true,
        opt_omega3:         true, // 2 gélules Zenement le soir (700 EPA + 500 DHA)
    }
};

// --- CORE ALGORITHM ---
export const calculatePlan = (key, profiles) => {
    const raw = profiles[key];

    // FIX #11 : guards NaN — toutes les valeurs numériques sont sécurisées
    // Calcul âge dynamique depuis la date de naissance si disponible
    const computedAge = raw.birthdate ? computeAge(raw.birthdate) : Math.max(0, Number(raw.age) || 0);

    const p = {
        ...raw,
        weight:      Math.max(0, Number(raw.weight)  || 0),
        height:      Math.max(0, Number(raw.height)  || 0),
        age:         Math.max(0, computedAge || 0),
        deficit:     Math.max(0, Number(raw.deficit) || 0),
        opt_fromage: Math.max(0, Number(raw.opt_fromage) || 0),
        opt_fb_soir:  Boolean(raw.opt_fb_soir),
        // Poids de forme : utilisé pour les objectifs macros (protéines, lipides)
        // Si absent/nul, fallback sur le poids actuel
        form_weight: Math.max(0, Number(raw.form_weight) || Number(raw.weight) || 0),
        // Objectif protéines en g/kg — si absent ou invalide, défaut à 1.6
        prot_ratio:  Math.max(0.5, Number(raw.prot_ratio) || 1.6),
        // Objectif lipides en g/kg — si absent ou invalide, défaut à 0.9
        lip_ratio:   Math.max(0.3, Number(raw.lip_ratio)  || LIP_TARGET_RATIO),
        // PAL : si l'ancienne structure activities existe encore, fallback sur 1.375
        pal: [1.2, 1.375, 1.55, 1.725].includes(Number(raw.pal))
            ? Number(raw.pal)
            : 1.375,
    };

    const socle = { ...SOCLE_DATA.common, ...SOCLE_DATA[key] };

    // Poids de référence pour les objectifs macros (≠ poids actuel pour BMR/sport)
    const goal_weight = p.form_weight > 0 ? p.form_weight : p.weight;

    // Garde : si les données de base sont nulles, tout retourner à 0
    if (p.weight === 0 || p.height === 0) {
        return {
            bmr: 0, tdee_final: 0, target_daily: 0,
            fixed_cal: 0, fixed_prot: 0, fixed_prot_socle: 0, remaining_cal: 0,
            pasta_grams_day: 0, pasta_midi: 0, pasta_soir: 0,
            total_prot: 0, prot_goal: 0, prot_warning: false,
            lip_goal: 0, lip_warning: false, lip_critical: false,
            glu_goal: 0, glu_warning: false, glu_critical: false,
            total_lip: 0, total_glu: 0,
            pst_qty: 0, oeuf_qty_per_meal: 0, total_estimated: 0,
            fb_qty: 0, computed_age: computedAge,
            batch_midi_budget: 0, batch_soir_budget: 0,
            omega3_lip: 0, use_omega3: false,
            goal_weight: 0, fixed_lip_socle: 0, glu_formula: 0,
        };
    }

    // Étape 1 : BMR (Mifflin-St Jeor)
    let bmr = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
    bmr += p.gender === 'male' ? 5 : -161;

    // Étape 2 : TDEE = BMR × PAL (budget constant, identique 7j/7)
    // Recommandation diététicienne : pas de variation journalière selon les séances
    const tdee_final = bmr * p.pal;

    // Étape 3 : Cible = TDEE − déficit
    const target_daily = tdee_final - p.deficit;

    // ── Budget Batch Cooking ──────────────────────────────────────────────────
    // 65% des kcal totales sont allouées aux repas (midi + soir) afin que les
    // recettes de batch représentent la fraction principale du plan alimentaire.
    // Le socle fixe (pain matin, whey, collations, etc.) occupe les ~35% restants.
    const batch_total_budget = Math.max(0, target_daily) * MEAL_PCT;
    const batch_midi_budget  = batch_total_budget * 0.55;  // 55% des repas → midi
    const batch_soir_budget  = batch_total_budget * 0.45;  // 45% des repas → soir

    // Étape 3 : Socle Fixe SANS les PST
    let fixed_cal_sans_pst = 0;
    let fixed_prot_sans_pst = 0;

    // Œufs du soir : verrouillés — Axel = 3 (> 80 kg), Prisca = 2
    const oeuf_qty_per_meal = p.weight > 80 ? 3 : 2;
    const total_oeufs_day   = oeuf_qty_per_meal * 2; // matin + soir

    // Whey : toggleable pour s'ajuster quand le batch cooking couvre les protéines
    const isAxel             = key === 'axel';
    const use_whey_matin     = isAxel && (p.opt_whey_matin     !== false); // Axel only
    const use_whey_collation =            p.opt_whey_collation !== false;  // les deux

    const oeuf_cal  = total_oeufs_day * 80;
    const oeuf_prot = total_oeufs_day * 6;

    const items = [
        socle.pain_matin,
        use_whey_matin     ? socle.matin_whey     : { kcal: 0, prot: 0 },
        use_whey_collation ? socle.collation_whey : { kcal: 0, prot: 0 },
        socle.collation_fruit,
        socle.midi_creme,
        { kcal: oeuf_cal, prot: oeuf_prot },
        socle.soir_creme,
        socle.legumes,
    ];
    items.forEach(i => {
        fixed_cal_sans_pst  += i.kcal;
        fixed_prot_sans_pst += i.prot;
    });

    // wheyNb sert à estimer les lipides / glucides du socle
    const wheyNb = (use_whey_matin ? 1 : 0) + (use_whey_collation ? 1 : 0);

    // Oméga-3 Zenement : 2 gélules/soir → 18 kcal + 2 g lipides déjà couverts par le complément
    const use_omega3  = p.opt_omega3 !== false;
    const omega3_lip  = use_omega3 ? OMEGA3_ZENEMENT.lip_per_dose  : 0;
    const omega3_kcal = use_omega3 ? OMEGA3_ZENEMENT.kcal_per_dose : 0;
    fixed_cal_sans_pst += omega3_kcal;

    let fixed_lip_sans_pst =
        (isAxel ? MACRO_EST.pain_axel_lip : MACRO_EST.pain_prisca_lip) +
        (wheyNb * MACRO_EST.whey_lip_per) +
        (total_oeufs_day * MACRO_EST.oeuf_lip) +
        (MACRO_EST.creme_lip_per_30g * 2) + 1 + // Légumes lip = 1
        omega3_lip;

    let fixed_glu_sans_pst =
        (isAxel ? MACRO_EST.pain_axel_glu : MACRO_EST.pain_prisca_glu) +
        (wheyNb * MACRO_EST.whey_glu_per) +
        (2) + // crème glu
        (MACRO_EST.legumes_glu_jour) +
        (MACRO_EST.banane_glu);

    if (p.opt_fromage > 0) {
        fixed_cal_sans_pst += p.opt_fromage * SOCLE_DATA.common.fromage_unit.kcal;
        fixed_prot_sans_pst += p.opt_fromage * SOCLE_DATA.common.fromage_unit.prot;
        fixed_lip_sans_pst += p.opt_fromage * MACRO_EST.fromage_unit_lip;
    }

    // Étape 4 : Résoudre dynamiquement PST + Pâtes
    // Objectif protéines : prot_ratio × poids de FORME (pas le poids actuel)
    const prot_goal = goal_weight * p.prot_ratio;

    // Ce qu'il reste à couvrir après le socle fixe
    const remaining_cal_target = target_daily - fixed_cal_sans_pst;
    const remaining_prot_target = prot_goal - fixed_prot_sans_pst;

    // Résolution du système d'équations :
    // PST  : 3.3 kcal/g | 0.5g prot/g  → (3.3x + 3.6y = remaining_cal_target)
    // Pâtes: 3.6 kcal/g | 0.2g prot/g  → (0.5x + 0.2y = remaining_prot_target)
    // → x (PST) = (18 * remaining_prot_target - remaining_cal_target) / 5.7
    const raw_pst_qty = (18 * remaining_prot_target - remaining_cal_target) / 5.7;
    let pst_qty = Math.max(0, Math.round(raw_pst_qty));
    pst_qty = Math.min(pst_qty, 85); // cap à 85g — le FB soir prend le relais

    const pst_cal = pst_qty * 3.3;
    const pst_prot = pst_qty * 0.5;

    // Les pâtes comblent le reste des calories
    const remaining_cal_for_pasta = remaining_cal_target - pst_cal;
    let pasta_grams_day = Math.max(0, remaining_cal_for_pasta / 3.6);

    // Étape 5 : Fromage Blanc 0% — filet de sécurité protéique post-cap PST
    // Valeurs nutritionnelles : 0.48 kcal/g | 0.08 g prot/g
    const current_prot_before_fb = fixed_prot_sans_pst + pst_prot + (pasta_grams_day * 0.2);
    const prot_deficit = Math.round(prot_goal - current_prot_before_fb);

    let fb_qty = 0;
    if (p.opt_fb_soir && prot_deficit > 0) {
        fb_qty = Math.round(prot_deficit / 0.08);
        // On retire les calories du FB au budget pâtes pour rester dans la cible
        const fb_cal = fb_qty * 0.48;
        pasta_grams_day = Math.max(0, pasta_grams_day - (fb_cal / 3.6));
    }

    const pasta_midi = pasta_grams_day * 0.55;
    const pasta_soir = pasta_grams_day * 0.45;

    // Totaux réels (avec FB)
    const pasta_prot = (pasta_grams_day / 100) * PASTA_REF.prot;
    const fixed_cal = fixed_cal_sans_pst + pst_cal;
    const fixed_prot = fixed_prot_sans_pst + pst_prot;
    const final_total_prot = fixed_prot + pasta_prot + (fb_qty * 0.08);
    const prot_warning = final_total_prot < prot_goal * 0.95; // tolérance ±5%

    const remaining_cal = remaining_cal_target;
    const total_estimated = fixed_cal_sans_pst + pst_cal + (remaining_cal_for_pasta > 0 ? remaining_cal_for_pasta : 0);

    // Calcul final des lipides et glucides
    const total_lip = fixed_lip_sans_pst +
                      (pst_qty * MACRO_EST.pst_lip) +
                      (pasta_grams_day * MACRO_EST.pasta_lip_per_100g / 100);

    const total_glu = fixed_glu_sans_pst +
                      (pst_qty * MACRO_EST.pst_glu) +
                      (pasta_grams_day * MACRO_EST.pasta_glu_per_100g / 100) +
                      (fb_qty * MACRO_EST.fb_glu_per_g);

    // Cible lipides : poids de FORME × ratio
    // lip_critical = jamais en dessous du plancher absolu 0.8g/kg (risque hormonal)
    // lip_warning  = sous la cible mais au-dessus du plancher (on note, pas d'alarme)
    const lip_goal     = goal_weight * p.lip_ratio;
    const lip_critical = total_lip < goal_weight * LIP_MIN_RATIO;          // < 0.8g/kg strict
    const lip_warning  = !lip_critical && total_lip < lip_goal * 0.95;     // ≥5% sous cible, mild

    // Glucides = variable d'ajustement calorique
    // Cal résiduelles après protéines (4 kcal/g) + lipides (9 kcal/g)
    const glu_kcal    = Math.max(0, target_daily - (prot_goal * 4) - (lip_goal * 9));
    const glu_formula = Math.round(glu_kcal / 4);                                     // valeur auto (pour le bouton "Ajuster")
    const glu_goal    = (p.glu_target > 0) ? p.glu_target : glu_formula;              // utilisé partout
    const glu_warning  = total_glu < glu_goal * 0.65;  // orange si −35% cible
    const glu_critical = total_glu < glu_goal * 0.80;  // rouge si −20% cible individuelle

    return {
        bmr,
        tdee_final,
        target_daily,
        fixed_cal,
        fixed_prot,
        fixed_prot_socle: fixed_prot_sans_pst, // socle sans PST — utilisé pour scaleRecipeForMeal
        fixed_lip_socle:  fixed_lip_sans_pst,  // socle lipides — pour calculer le boost huile batch
        goal_weight,                           // poids de forme (pour affichage et lip boost)
        remaining_cal,
        // ── Budgets Batch Cooking (65% kcal totales) ─────────────────────────
        batch_midi_budget: Math.round(batch_midi_budget),
        batch_soir_budget: Math.round(batch_soir_budget),
        pasta_grams_day,
        pasta_midi,
        pasta_soir,
        total_prot: final_total_prot,
        total_lip,
        total_glu,
        prot_goal,
        prot_warning,
        lip_goal,
        lip_critical,
        lip_warning,
        glu_formula,  // valeur auto (résiduel kcal) — pour le bouton "Ajuster selon Kcal"
        glu_goal,
        glu_warning,
        glu_critical,
        pst_qty,
        fb_qty,
        oeuf_qty_per_meal,
        use_whey_matin,     // bool — état actuel du shaker matin
        use_whey_collation, // bool — état actuel du shaker 16h
        use_omega3,         // bool — Oméga-3 Zenement actif
        omega3_lip,         // g de lipides déjà couverts par le complément
        total_estimated,
        pal: p.pal,         // PAL actif — pour affichage dans SmartDiet
        computed_age: p.age, // âge calculé dynamiquement depuis birthdate
    };
};

// ─── Scaleur de Recette (Midi ou Soir) ───────────────────────────────────────
// recipe : objet manifest.json avec `ingredients` (qty_g, kcal_100, prot_100, lip_100, glu_100)
// meal   : 'midi' (55% budget) | 'soir' (45% budget)
// Règle soir + has_pst : les ingrédients is_pst sont exclus (protéines = œufs du socle)
export const scaleRecipeForMeal = (key, profiles, recipe, meal = 'midi') => {
    if (!recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) return null;

    const plan = calculatePlan(key, profiles);

    // Budget kcal du repas : 65% des kcal totales (midi 55% / soir 45% de ce total).
    // On abandonne l'approche "calories restantes après socle" qui sous-allouait les repas.
    const meal_kcal_budget = meal === 'midi' ? plan.batch_midi_budget : plan.batch_soir_budget;

    // Protéines encore nécessaires (au-delà de ce que fournit le socle fixe)
    const meal_ratio       = meal === 'midi' ? 0.55 : 0.45;
    const meal_prot_needed = (plan.prot_goal - plan.fixed_prot_socle) * meal_ratio;

    const hasPstSwap      = false;
    const activeIngredients = recipe.ingredients;

    if (activeIngredients.length === 0) return null;

    const base = activeIngredients.reduce((acc, ing) => ({
        kcal: acc.kcal + (ing.qty_g * ing.kcal_100 / 100),
        prot: acc.prot + (ing.qty_g * ing.prot_100 / 100),
        lip:  acc.lip  + (ing.qty_g * ing.lip_100  / 100),
        glu:  acc.glu  + (ing.qty_g * ing.glu_100  / 100),
    }), { kcal: 0, prot: 0, lip: 0, glu: 0 });

    if (base.kcal === 0) return null;

    const scale = Math.max(0.3, meal_kcal_budget / base.kcal);

    const scaledIngredients = activeIngredients.map(ing => {
        // fixed_qty: true → ingrédient non scalé (épices, herbes, sel…)
        const effectiveQty = ing.fixed_qty ? ing.qty_g : Math.round(ing.qty_g * scale);
        return {
            name:       ing.name,
            role:       ing.role       || 'autre',
            unit:       ing.unit       || 'g',    // 'g' | 'pc' — pour l'affichage
            g_per_pc:   ing.g_per_pc   || null,   // grammes / pièce (si unit='pc')
            cook_group: ing.cook_group || null,   // groupe de cuisson pour BatchCooking
            fixed_qty:  !!ing.fixed_qty,          // passthrough pour affichage BatchCooking
            kcal_100:   ing.kcal_100,             // conservé pour le lip boost
            lip_100:    ing.lip_100,              // conservé pour le lip boost
            raw_g:      effectiveQty,
            kcal:       Math.round(effectiveQty * ing.kcal_100 / 100),
            prot:       +((effectiveQty * ing.prot_100 / 100).toFixed(1)),
            lip:        +((effectiveQty * ing.lip_100  / 100).toFixed(1)),
            glu:        +((effectiveQty * ing.glu_100  / 100).toFixed(1)),
        };
    });

    // ── Lip boost : combler automatiquement le déficit lipides en augmentant l'huile ──
    // Budget lipides = part batch (lip_goal − socle_fixe) × fraction du repas
    const batch_lip_budget = Math.max(0, plan.lip_goal - (plan.fixed_lip_socle || 0));
    const meal_lip_budget  = batch_lip_budget * (meal === 'midi' ? 0.55 : 0.45);
    const meal_lip_actual  = scaledIngredients.reduce((s, i) => s + i.lip, 0);
    const lip_deficit_g    = meal_lip_budget - meal_lip_actual;

    if (lip_deficit_g > 1) { // seuil minimum 1g pour éviter les micro-ajustements
        const boost_g = Math.min(Math.round(lip_deficit_g), 25); // cap 25g/repas
        // Chercher un ingrédient lipide de type huile à booster
        const oilIdx = scaledIngredients.findIndex(i =>
            i.role === 'lipide' && i.name.toLowerCase().includes('huile')
        );
        if (oilIdx >= 0) {
            const oil     = scaledIngredients[oilIdx];
            const kPerG   = oil.raw_g > 0 ? oil.kcal / oil.raw_g : 8.84;
            const lipPerG = oil.lip_100 ? oil.lip_100 / 100 : (oil.raw_g > 0 ? oil.lip / oil.raw_g : 1.0);
            scaledIngredients[oilIdx] = {
                ...oil,
                raw_g: oil.raw_g + boost_g,
                kcal:  Math.round(oil.kcal + boost_g * kPerG),
                lip:   +(oil.lip + boost_g * lipPerG).toFixed(1),
            };
        }
        // (si pas d'huile dans la recette, le déficit est signalé via lip_deficit dans le retour)
    }

    const total_raw_g    = scaledIngredients.reduce((s, i) => s + i.raw_g, 0);
    const cookCoef       = parseFloat(recipe.cook_coef) || 1;
    const total_cooked_g = Math.round(total_raw_g * cookCoef);
    const total_prot     = +(base.prot * scale).toFixed(1);
    const prot_deficit   = Math.max(0, Math.round(meal_prot_needed - total_prot));

    return {
        meal,
        scale:            +scale.toFixed(2),
        ingredients:      scaledIngredients,
        hasPstSwap,
        total_raw_g,
        total_cooked_g,
        total_kcal:       Math.round(base.kcal * scale),
        total_prot,
        total_lip:        +(base.lip * scale).toFixed(1),
        total_glu:        +(base.glu * scale).toFixed(1),
        prot_deficit,
        lip_deficit:      Math.max(0, +(lip_deficit_g).toFixed(1)),
        meal_kcal_budget: Math.round(meal_kcal_budget),
    };
};

// Alias backward-compat
export const scaleRecipeForMidi = (key, profiles, recipe) => scaleRecipeForMeal(key, profiles, recipe, 'midi');

// ─── Extracteur Budgets Repas (Midi / Soir) ──────────────────────────────────
export const getMealBudget = (key, profiles, meal) => {
    const plan = calculatePlan(key, profiles);
    const p = profiles[key];
    const optFromage  = Math.max(0, Number(p.opt_fromage)  || 0);
    const optFbSoir   = Boolean(p.opt_fb_soir);

    const r = (n, d = 0) => {
        const f = Math.pow(10, d);
        return Math.round((n || 0) * f) / f;
    };

    let total = { kcal: 0, prot: 0, lip: 0, glu: 0 };

    if (meal === 'soir') {
        const pasta = {
            kcal: plan.pasta_soir * PASTA_REF.kcal / 100,
            prot: plan.pasta_soir * PASTA_REF.prot / 100,
            lip:  plan.pasta_soir * MACRO_EST.pasta_lip_per_100g / 100,
            glu:  plan.pasta_soir * MACRO_EST.pasta_glu_per_100g / 100,
        };
        const oeufs = {
            kcal: plan.oeuf_qty_per_meal * 80,
            prot: plan.oeuf_qty_per_meal * 6,
            lip:  plan.oeuf_qty_per_meal * MACRO_EST.oeuf_lip,
            glu:  0,
        };
        const creme = {
            kcal: SOCLE_DATA.common.soir_creme.kcal,
            prot: SOCLE_DATA.common.soir_creme.prot,
            lip:  MACRO_EST.creme_lip_per_30g,
            glu:  MACRO_EST.creme_glu,
        };

        total.kcal += pasta.kcal + oeufs.kcal + creme.kcal;
        total.prot += pasta.prot + oeufs.prot + creme.prot;
        total.lip  += pasta.lip  + oeufs.lip  + creme.lip;
        total.glu  += pasta.glu  + oeufs.glu  + creme.glu;

        if (optFromage > 0) {
            total.kcal += optFromage * SOCLE_DATA.common.fromage_unit.kcal;
            total.prot += optFromage * SOCLE_DATA.common.fromage_unit.prot;
            total.lip  += optFromage * MACRO_EST.fromage_unit_lip;
        }

        if (optFbSoir) {
            total.kcal += plan.fb_qty * 0.48;
            total.prot += plan.fb_qty * 0.08;
            total.glu  += plan.fb_qty * MACRO_EST.fb_glu_per_g;
        }

    } else if (meal === 'midi') {
        const pasta = {
            kcal: plan.pasta_midi * PASTA_REF.kcal / 100,
            prot: plan.pasta_midi * PASTA_REF.prot / 100,
            lip:  plan.pasta_midi * MACRO_EST.pasta_lip_per_100g / 100,
            glu:  plan.pasta_midi * MACRO_EST.pasta_glu_per_100g / 100,
        };
        const pst = {
            kcal: plan.pst_qty * 3.3,
            prot: plan.pst_qty * 0.5,
            lip:  plan.pst_qty * MACRO_EST.pst_lip,
            glu:  plan.pst_qty * MACRO_EST.pst_glu,
        };
        const creme = {
            kcal: SOCLE_DATA.common.midi_creme.kcal,
            prot: SOCLE_DATA.common.midi_creme.prot,
            lip:  MACRO_EST.creme_lip_per_30g,
            glu:  MACRO_EST.creme_glu,
        };
        // Legumes midi (moitié jour)
        const legumes = {
            kcal: MACRO_EST.legumes_kcal_jours / 2,
            prot: MACRO_EST.legumes_prot_jour / 2,
            lip:  0.5,
            glu:  MACRO_EST.legumes_glu_jour / 2,
        };

        total.kcal += pasta.kcal + pst.kcal + creme.kcal + legumes.kcal;
        total.prot += pasta.prot + pst.prot + creme.prot + legumes.prot;
        total.lip  += pasta.lip  + pst.lip  + creme.lip  + legumes.lip;
        total.glu  += pasta.glu  + pst.glu  + creme.glu  + legumes.glu;

        if (optFromage > 0) {
            total.kcal += optFromage * SOCLE_DATA.common.fromage_unit.kcal;
            total.prot += optFromage * SOCLE_DATA.common.fromage_unit.prot;
            total.lip  += optFromage * MACRO_EST.fromage_unit_lip;
        }
    }

    return {
        kcal: r(total.kcal),
        prot: r(total.prot, 1),
        lip:  r(total.lip, 1),
        glu:  r(total.glu, 1)
    };
};
