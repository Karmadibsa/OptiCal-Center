// MET values from the Compendium of Physical Activities (Ainsworth et al.)
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
        galettes_2x: { kcal: 334, prot: 13.4 }
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

export const DEFAULT_PROFILES = {
    axel: {
        weight: 110,
        height: 183,
        age: 27,
        gender: 'male',
        // Objectif protéines libre en g/kg (ex: 1.8, 2.0, 1.6...)
        prot_ratio: 1.8,
        activities: { ...DEFAULT_ACTIVITIES },
        deficit: 300,
        opt_galettes: false,
        opt_fromage: 0
    },
    prisca: {
        weight: 62,
        height: 160,
        age: 25,
        gender: 'female',
        prot_ratio: 1.2,
        activities: { ...DEFAULT_ACTIVITIES },
        deficit: 300,
        opt_galettes: false,
        opt_fromage: 0
    }
};

// --- CORE ALGORITHM ---
export const calculatePlan = (key, profiles) => {
    const raw = profiles[key];

    // FIX #11 : guards NaN — toutes les valeurs numériques sont sécurisées
    const p = {
        ...raw,
        weight:      Math.max(0, Number(raw.weight)  || 0),
        height:      Math.max(0, Number(raw.height)  || 0),
        age:         Math.max(0, Number(raw.age)     || 0),
        deficit:     Math.max(0, Number(raw.deficit) || 0),
        opt_fromage: Math.max(0, Number(raw.opt_fromage) || 0),
        opt_galettes: Boolean(raw.opt_galettes),
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
            pst_qty: 0, oeuf_qty_per_meal: 0, total_estimated: 0,
            sport_cal_week: 0, sport_day: 0, total_sport_min: 0,
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

    // Étape 3 : Socle Fixe
    let fixed_cal = 0;
    let fixed_prot = 0;

    const pst_qty = Math.max(0, Math.round(p.weight - 25));
    const pst_cal = (pst_qty / 100) * 330;
    const pst_prot = (pst_qty / 100) * 50;

    const oeuf_qty_per_meal = p.weight > 80 ? 3 : 2;
    const total_oeufs_day = oeuf_qty_per_meal * 2;
    const oeuf_cal = total_oeufs_day * 80;
    const oeuf_prot = total_oeufs_day * 6;

    const items = [
        socle.pain_matin,
        socle.collation_whey,
        socle.collation_fruit,
        { kcal: pst_cal, prot: pst_prot },
        socle.midi_creme,
        { kcal: oeuf_cal, prot: oeuf_prot },
        socle.soir_creme,
        socle.legumes,
        socle.matin_whey
    ];
    items.forEach(i => {
        fixed_cal += i.kcal;
        fixed_prot += i.prot;
    });

    if (p.opt_galettes) {
        fixed_cal += SOCLE_DATA.common.galettes_2x.kcal;
        fixed_prot += SOCLE_DATA.common.galettes_2x.prot;
    }

    if (p.opt_fromage > 0) {
        fixed_cal += p.opt_fromage * SOCLE_DATA.common.fromage_unit.kcal;
        fixed_prot += p.opt_fromage * SOCLE_DATA.common.fromage_unit.prot;
    }

    // Étape 4 : Pâtes (variable)
    const remaining_cal = target_daily - fixed_cal;
    const pasta_grams_day = remaining_cal > 0 ? (remaining_cal / PASTA_REF.kcal) * 100 : 0;
    const pasta_midi = pasta_grams_day * 0.55;
    const pasta_soir = pasta_grams_day * 0.45;

    // Objectif protéines libre : prot_ratio g/kg (ex: 1.8)
    const pasta_prot = (pasta_grams_day / 100) * PASTA_REF.prot;
    const total_prot = fixed_prot + pasta_prot;
    const prot_goal = p.weight * p.prot_ratio;
    const prot_warning = total_prot < prot_goal;

    const total_estimated = fixed_cal + (remaining_cal > 0 ? remaining_cal : 0);

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
        total_prot,
        prot_goal,
        prot_warning,
        pst_qty,
        oeuf_qty_per_meal,
        total_estimated,
        sport_cal_week,
        sport_day,
        total_sport_min,
    };
};
