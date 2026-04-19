// MET values from the Compendium of Physical Activities (Ainsworth et al.)

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
export const ACTIVITIES = [
    { id: 'hiit',        label: 'HIIT',                  met: 10.0 },
    { id: 'calisthenics',label: 'Calisthenics',           met: 8.0  },
    { id: 'muscu_pdc',   label: 'Muscu / Poids de Corps', met: 5.0  },
    { id: 'course',      label: 'Course à pied',          met: 9.0  },
    { id: 'velo',        label: 'Vélo',                   met: 8.0  },
    { id: 'escalade',    label: 'Escalade',               met: 8.0  },
    { id: 'rando',       label: 'Randonnée',              met: 5.5  },
    { id: 'pilates',     label: 'Pilates',                met: 3.0  },
    { id: 'marche',      label: 'Marche',                 met: 3.5  },
];

export const DEFAULT_ACTIVITIES = Object.fromEntries(ACTIVITIES.map(a => [a.id, 0]));

export const PASTA_REF = {
    name: "Pâtes Barilla Protein+",
    kcal: 360, // per 100g
    prot: 20   // per 100g
};

export const SOCLE_DATA = {
    common: {
        collation_whey: { kcal: 110, prot: 25 },
        collation_fruit: { kcal: 105, prot: 1 },
        midi_creme: { kcal: 90, prot: 1 },
        soir_creme: { kcal: 90, prot: 1 },
        legumes: { kcal: 100, prot: 4 },
        fromage_unit: { kcal: 4, prot: 0.25 },
        galettes_150g: { kcal: 327, prot: 13.4 }
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
    galettes_lip: 16.5,
    galettes_glu: 30,
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
        height: 183,
        birthdate: '1999-07-03', // 3 juillet 1999
        gender: 'male',
        // Objectif protéines libre en g/kg (ex: 1.8, 2.0, 1.6...)
        prot_ratio: 1.8,
        activities: { ...DEFAULT_ACTIVITIES },
        deficit: 300,
        opt_galettes: false,
        opt_fromage: 0,
        opt_fb_soir: false
    },
    prisca: {
        weight: 62,
        height: 160,
        birthdate: '1999-04-04', // 4 avril 1999
        gender: 'female',
        prot_ratio: 1.2,
        activities: { ...DEFAULT_ACTIVITIES },
        deficit: 300,
        opt_galettes: false,
        opt_fromage: 0,
        opt_fb_soir: false
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
        opt_galettes: Boolean(raw.opt_galettes),
        opt_fb_soir:  Boolean(raw.opt_fb_soir),
        // Objectif protéines en g/kg — si absent ou invalide, défaut à 1.8
        prot_ratio:  Math.max(0.5, Number(raw.prot_ratio) || 1.8),
        activities:  raw.activities || {},
    };

    const socle = { ...SOCLE_DATA.common, ...SOCLE_DATA[key] };

    // Garde : si les données de base sont nulles, tout retourner à 0
    if (p.weight === 0 || p.height === 0) {
        return {
            bmr: 0, tdee_final: 0, target_daily: 0,
            fixed_cal: 0, fixed_prot: 0, remaining_cal: 0,
            pasta_grams_day: 0, pasta_midi: 0, pasta_soir: 0,
            total_prot: 0, prot_goal: 0, prot_warning: false,
            total_lip: 0, total_glu: 0,
            pst_qty: 0, oeuf_qty_per_meal: 0, total_estimated: 0,
            sport_cal_week: 0, sport_day: 0, total_sport_min: 0,
            fb_qty: 0, computed_age: computedAge,
        };
    }

    // Étape 1 : BMR (Mifflin-St Jeor)
    let bmr = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
    bmr += p.gender === 'male' ? 5 : -161;

    const sedentary = bmr * 1.2;

    // FIX #7 (déjà correct) : Sport : Calories = MET × Poids(kg) × Durée(h)
    const sport_cal_week = ACTIVITIES.reduce((total, act) => {
        const mins = Number(p.activities[act.id]) || 0;
        return total + p.weight * (mins / 60) * act.met;
    }, 0);
    const sport_day = sport_cal_week / 7;

    const tdee_final = sedentary + sport_day;

    // Étape 2 : Cible
    const target_daily = tdee_final - p.deficit;

    // Étape 3 : Socle Fixe SANS les PST
    let fixed_cal_sans_pst = 0;
    let fixed_prot_sans_pst = 0;

    const oeuf_qty_per_meal = p.weight > 80 ? 3 : 2;
    const total_oeufs_day = oeuf_qty_per_meal * 2;
    const oeuf_cal = total_oeufs_day * 80;
    const oeuf_prot = total_oeufs_day * 6;

    const items = [
        socle.pain_matin,
        socle.collation_whey,
        socle.collation_fruit,
        socle.midi_creme,
        { kcal: oeuf_cal, prot: oeuf_prot },
        socle.soir_creme,
        socle.legumes,
        socle.matin_whey
    ];
    items.forEach(i => {
        fixed_cal_sans_pst += i.kcal;
        fixed_prot_sans_pst += i.prot;
    });

    const isAxel = key === 'axel';
    const wheyNb = isAxel ? 2 : 1;

    let fixed_lip_sans_pst =
        (isAxel ? MACRO_EST.pain_axel_lip : MACRO_EST.pain_prisca_lip) +
        (wheyNb * MACRO_EST.whey_lip_per) +
        (total_oeufs_day * MACRO_EST.oeuf_lip) +
        (MACRO_EST.creme_lip_per_30g * 2) + 1; // Légumes lip = 1

    let fixed_glu_sans_pst =
        (isAxel ? MACRO_EST.pain_axel_glu : MACRO_EST.pain_prisca_glu) +
        (wheyNb * MACRO_EST.whey_glu_per) +
        (2) + // crème glu
        (MACRO_EST.legumes_glu_jour) +
        (MACRO_EST.banane_glu);

    if (p.opt_galettes) {
        fixed_cal_sans_pst += SOCLE_DATA.common.galettes_150g.kcal;
        fixed_prot_sans_pst += SOCLE_DATA.common.galettes_150g.prot;
        fixed_lip_sans_pst += MACRO_EST.galettes_lip;
        fixed_glu_sans_pst += MACRO_EST.galettes_glu;
    }

    if (p.opt_fromage > 0) {
        fixed_cal_sans_pst += p.opt_fromage * SOCLE_DATA.common.fromage_unit.kcal;
        fixed_prot_sans_pst += p.opt_fromage * SOCLE_DATA.common.fromage_unit.prot;
        fixed_lip_sans_pst += p.opt_fromage * MACRO_EST.fromage_unit_lip;
    }

    // Étape 4 : Résoudre dynamiquement PST + Pâtes
    // Objectif protéines : prot_ratio g/kg
    const prot_goal = p.weight * p.prot_ratio;

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
    const prot_warning = Math.round(final_total_prot) < Math.round(prot_goal);

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

    // Stats sport pour l'affichage
    const total_sport_min = ACTIVITIES.reduce((sum, act) => sum + (Number(p.activities[act.id]) || 0), 0);

    return {
        bmr,
        tdee_final,
        target_daily,
        fixed_cal,
        fixed_prot,
        remaining_cal,
        pasta_grams_day,
        pasta_midi,
        pasta_soir,
        total_prot: final_total_prot,
        total_lip,
        total_glu,
        prot_goal,
        prot_warning,
        pst_qty,
        fb_qty,
        oeuf_qty_per_meal,
        total_estimated,
        sport_cal_week,
        sport_day,
        total_sport_min,
        computed_age: p.age, // âge calculé dynamiquement depuis birthdate
    };
};

// ─── Extracteur Budgets Repas (Midi / Soir) ──────────────────────────────────
export const getMealBudget = (key, profiles, meal) => {
    const plan = calculatePlan(key, profiles);
    const p = profiles[key];
    const optFromage  = Math.max(0, Number(p.opt_fromage)  || 0);
    const optGalettes = Boolean(p.opt_galettes);
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

        if (optGalettes) {
            total.kcal += SOCLE_DATA.common.galettes_150g.kcal;
            total.prot += SOCLE_DATA.common.galettes_150g.prot;
            total.lip  += MACRO_EST.galettes_lip;
            total.glu  += MACRO_EST.galettes_glu;
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
