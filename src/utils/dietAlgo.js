export const MET_DEFAULT = 8; // Running/Renfo average

export const PASTA_REF = {
    name: "Pâtes Barilla Protein+",
    kcal: 360, // per 100g
    prot: 20   // per 100g
};

export const SOCLE_DATA = {
    common: {
        // Pancakes moved to specific profiles
        collation_whey: { kcal: 110, prot: 25 },
        collation_fruit: { kcal: 105, prot: 1 },
        // Removed static PST/Oefs - now dynamic
        midi_creme: { kcal: 90, prot: 1 },
        soir_creme: { kcal: 90, prot: 1 },
        legumes: { kcal: 100, prot: 4 }, // Estimate
        fromage_unit: { kcal: 4, prot: 0.25 }, // 4kcal/g approx
        galettes_2x: { kcal: 334, prot: 13.4 } // 2 Galettes (Standardized)
    },
    axel: {
        pain_matin: { kcal: 400, prot: 16 }, // 140g pain + 30g cancoillotte
        matin_whey: { kcal: 110, prot: 25 },
    },
    prisca: {
        pain_matin: { kcal: 232, prot: 10 }, // 80g pain + 20g cancoillotte
        matin_whey: { kcal: 0, prot: 0 },
    }
};

export const DEFAULT_PROFILES = {
    axel: {
        weight: 110,
        height: 183,
        age: 27,
        gender: 'male',
        sport_min: 190,
        deficit: 300,
        opt_galettes: false,
        opt_fromage: 0 // grams
    },
    prisca: {
        weight: 62,
        height: 160,
        age: 25,
        gender: 'female',
        sport_min: 120,
        deficit: 300,
        opt_galettes: false,
        opt_fromage: 0
    }
};

// --- CORE ALGORITHM (The Engine) ---
export const calculatePlan = (key, profiles) => {
    const p = profiles[key];
    const socle = { ...SOCLE_DATA.common, ...SOCLE_DATA[key] };

    // Étape 1 : TDEE Lissée
    let bmr = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
    bmr += p.gender === 'male' ? 5 : -161;

    const sedentary = bmr * 1.2;

    // Sport average per day
    const sport_cal_week = p.weight * (p.sport_min / 60) * MET_DEFAULT;
    const sport_day = sport_cal_week / 7;

    const tdee_final = sedentary + sport_day;

    // Étape 2 : Cible
    const target_daily = tdee_final - p.deficit;

    // Étape 3 : Socle Fixe (Summing calories & proteins)
    let fixed_cal = 0;
    let fixed_prot = 0;

    // DYNAMIC ITEMS LOGIC
    // PST: Poids - 25g. Val nutritionnelle: 330kcal/50g prot pour 100g
    const pst_qty = Math.max(0, Math.round(p.weight - 25));
    const pst_cal = (pst_qty / 100) * 330;
    const pst_prot = (pst_qty / 100) * 50;

// OEUFS: Matin ET Soir (Multiplié par 2)
    const oeuf_qty_per_meal = p.weight > 80 ? 3 : 2;
    const total_oeufs_day = oeuf_qty_per_meal * 2;
    const oeuf_cal = total_oeufs_day * 80;
    const oeuf_prot = total_oeufs_day * 6;

    // List of fixed items (STATIC + DYNAMIC)
    const items = [
        socle.pain_matin, // <-- Remplacer socle.pancakes par socle.pain_matin
        socle.collation_whey,
        socle.collation_fruit,
        { kcal: pst_cal, prot: pst_prot }, 
        socle.midi_creme,
        { kcal: oeuf_cal, prot: oeuf_prot }, // Utilise maintenant le total sur la journée
        socle.soir_creme,
        socle.legumes,
        socle.matin_whey 
    ];
    items.forEach(i => {
        fixed_cal += i.kcal;
        fixed_prot += i.prot;
    });

    // Options
    if (p.opt_galettes) {
        fixed_cal += SOCLE_DATA.common.galettes_2x.kcal;
        fixed_prot += SOCLE_DATA.common.galettes_2x.prot;
    }

    if (p.opt_fromage > 0) {
        const cheese_cal = p.opt_fromage * SOCLE_DATA.common.fromage_unit.kcal;
        const cheese_prot = p.opt_fromage * SOCLE_DATA.common.fromage_unit.prot;
        fixed_cal += cheese_cal;
        fixed_prot += cheese_prot;
    }

    // Étape 4 : Variable (Pâtes)
    const remaining_cal = target_daily - fixed_cal;

    // Safety: don't go negative
    const pasta_grams_day = remaining_cal > 0
        ? (remaining_cal / PASTA_REF.kcal) * 100
        : 0;

    // Étape 5 : Répartition
    const pasta_midi = pasta_grams_day * 0.55; // 55%
    const pasta_soir = pasta_grams_day * 0.45; // 45%

    // Étape 6 : Check Protéines
    const pasta_prot = (pasta_grams_day / 100) * PASTA_REF.prot;
    const total_prot = fixed_prot + pasta_prot;
    const prot_goal = p.weight * 1.6;
    const prot_warning = total_prot < prot_goal;

    // Total calories in the plan = Fixed items + Options + Calculated Pasta
    const total_estimated = fixed_cal + (remaining_cal > 0 ? remaining_cal : 0);

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
        // Exposed Dynamic Vars
        pst_qty,
        oeuf_qty_per_meal,
        total_estimated
    };
};
