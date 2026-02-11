import React, { useState, useEffect } from 'react';
import {
    Settings,
    Activity,
    Utensils,
    AlertTriangle,
    CheckCircle,
    Download
} from 'lucide-react';

const SmartDiet = () => {
    // --- 1. CONSTANTS & DATA ---
    const MET_DEFAULT = 8; // Running/Renfo average

    const PASTA_REF = {
        name: "Pâtes Barilla Protein+",
        kcal: 360, // per 100g
        prot: 20   // per 100g
    };

    const SOCLE_DATA = {
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
            pancakes: { kcal: 550, prot: 15 }, // 3 Pancakes + Garniture
            matin_whey: { kcal: 110, prot: 25 },
        },
        prisca: {
            pancakes: { kcal: 366, prot: 10 }, // 2 Pancakes + Garniture (Valeur ajustée)
            matin_whey: { kcal: 0, prot: 0 },
        }
    };

    const DEFAULT_PROFILES = {
        axel: {
            weight: 105,
            height: 183,
            age: 27,
            gender: 'male',
            sport_min: 190,
            deficit: 300,
            opt_galettes: false,
            opt_fromage: 0 // grams
        },
        prisca: {
            weight: 70,
            height: 165,
            age: 25,
            gender: 'female',
            sport_min: 120,
            deficit: 300,
            opt_galettes: false,
            opt_fromage: 0
        }
    };

    // --- 2. STATE ---
    const [profiles, setProfiles] = useState(() => {
        const saved = localStorage.getItem('smart_diet_profiles_v2');
        return saved ? JSON.parse(saved) : DEFAULT_PROFILES;
    });

    const [activeTab, setActiveTab] = useState('axel');

    useEffect(() => {
        localStorage.setItem('smart_diet_profiles_v2', JSON.stringify(profiles));
    }, [profiles]);

    // --- 3. CORE ALGORITHM (The Engine) ---
    const calculatePlan = (key) => {
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

        // OEUFS: Si > 80kg alors 3, sinon 2. Val: ~80kcal/6g prot par unité
        const oeuf_qty = p.weight > 80 ? 3 : 2;
        const oeuf_cal = oeuf_qty * 80;
        const oeuf_prot = oeuf_qty * 6;

        // List of fixed items (STATIC + DYNAMIC)
        const items = [
            socle.pancakes,
            socle.collation_whey,
            socle.collation_fruit,
            { kcal: pst_cal, prot: pst_prot }, // Dynamic PST
            socle.midi_creme,
            { kcal: oeuf_cal, prot: oeuf_prot }, // Dynamic Oeufs
            socle.soir_creme,
            socle.legumes,
            socle.matin_whey // specific
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
        // Note: remaining_cal represents the calories allocated to pasta.
        // So total_estimated should be very close to target_daily.
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
            oeuf_qty,
            total_estimated
        };
    };

    const resAxel = calculatePlan('axel');
    const resPrisca = calculatePlan('prisca');

    // --- 4. HANDLERS ---
    const handleInput = (key, field, val) => {
        setProfiles(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: val
            }
        }));
    };

    // --- 5. RENDER HELPERS ---
    const PlanRow = ({ label, axelVal, priscaVal, note, isHeader = false }) => (
        <div className={`plan-row ${isHeader ? 'header-row' : ''}`}>
            <div className="col-item">{label}</div>
            <div className="col-val axel">{axelVal}</div>
            <div className="col-val prisca">{priscaVal}</div>
            <div className="col-note">{note}</div>
        </div>
    );

    return (
        <div className="animate-fade-in section-container">

            {/* --- CONFIGURATION (Tabs) --- */}
            <h2 className="section-title"><Settings className="icon-mr" /> Configuration Hebdomadaire</h2>

            <div className="tabs">
                <button
                    className={`tab-btn ${activeTab === 'axel' ? 'active axel' : ''}`}
                    onClick={() => setActiveTab('axel')}
                >
                    Axel
                </button>
                <button
                    className={`tab-btn ${activeTab === 'prisca' ? 'active prisca' : ''}`}
                    onClick={() => setActiveTab('prisca')}
                >
                    Prisca
                </button>
            </div>

            <div className="config-card card">
                {['axel', 'prisca'].map(key => (
                    <div key={key} style={{ display: activeTab === key ? 'block' : 'none' }}>
                        <div className="inputs-grid">
                            <div className="input-group">
                                <label>Poids (kg)</label>
                                <input
                                    type="number"
                                    value={profiles[key].weight}
                                    onChange={(e) => handleInput(key, 'weight', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="input-group">
                                <label>Sport Hebdo (min)</label>
                                <input
                                    type="number"
                                    value={profiles[key].sport_min}
                                    onChange={(e) => handleInput(key, 'sport_min', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="input-group">
                                <label>Déficit Cible (kcal)</label>
                                <input
                                    type="number"
                                    value={profiles[key].deficit}
                                    onChange={(e) => handleInput(key, 'deficit', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="input-group checkbox">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={profiles[key].opt_galettes}
                                        onChange={(e) => handleInput(key, 'opt_galettes', e.target.checked)}
                                    />
                                    Option Galettes Soir
                                </label>
                            </div>
                            <div className="input-group">
                                <label>Option Fromage (g)</label>
                                <input
                                    type="number"
                                    value={profiles[key].opt_fromage}
                                    onChange={(e) => handleInput(key, 'opt_fromage', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        {/* DEBUG / INFO STATS */}
                        <div className="stats-mini">
                            <span>TDEE: {Math.round(key === 'axel' ? resAxel.tdee_final : resPrisca.tdee_final)} kcal</span>
                            <span> | </span>
                            <span>Cible: {Math.round(key === 'axel' ? resAxel.target_daily : resPrisca.target_daily)} kcal</span>
                            <span> | </span>
                            <span style={{ color: '#fbbf24' }}>Estimé: {Math.round(key === 'axel' ? resAxel.total_estimated : resPrisca.total_estimated)} kcal</span>
                            <br />
                            <span style={{ color: (key === 'axel' ? resAxel.prot_warning : resPrisca.prot_warning) ? '#f87171' : '#4ade80' }}>
                                Protéines: {Math.round(key === 'axel' ? resAxel.total_prot : resPrisca.total_prot)}g
                                {(key === 'axel' ? resAxel.prot_warning : resPrisca.prot_warning) && " (⚠️ Trop bas !)"}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- TABLEAU FINAL --- */}
            <h2 className="section-title" style={{ marginTop: '3rem' }}>
                <Utensils className="icon-mr" /> Plan Alimentaire (Lissé)
            </h2>

            <div className="plan-table">
                <PlanRow isHeader label="ITEM" axelVal="AXEL" priscaVal="PRISCA" note="NOTE" />

                {/* MATIN */}
                <div className="section-divider">MATIN</div>
                <PlanRow
                    label="Pancakes"
                    axelVal="3 Pancakes (+ PB/Confi)"
                    priscaVal="2 Pancakes (+ PB/Confi)"
                    note="Base fixe"
                />
                <PlanRow
                    label="Whey"
                    axelVal="1 Shaker (30g)"
                    priscaVal="-"
                    note=""
                />

                {/* MIDI */}
                <div className="section-divider">MIDI</div>
                <PlanRow
                    label="Pâtes Protein+ (Cru)"
                    axelVal={`${Math.round(resAxel.pasta_midi)}g`}
                    priscaVal={`${Math.round(resPrisca.pasta_midi)}g`}
                    note="Calculé (55%)"
                />
                <PlanRow
                    label="PST (Cru)"
                    axelVal={`${resAxel.pst_qty}g`}
                    priscaVal={`${resPrisca.pst_qty}g`}
                    note="Source Protéines (Poids - 25)"
                />
                <PlanRow
                    label="Légumes"
                    axelVal="À volonté"
                    priscaVal="À volonté"
                    note="Volume"
                />
                <PlanRow
                    label="Crème Fraîche"
                    axelVal="30g (1 c.à.s)"
                    priscaVal="30g (1 c.à.s)"
                    note="Lipides"
                />

                {/* 16H */}
                <div className="section-divider">COLLATION (16H)</div>
                <PlanRow
                    label="Banane"
                    axelVal="1 Banane"
                    priscaVal="1 Banane"
                    note="Glucides rapides"
                />
                <PlanRow
                    label="Whey"
                    axelVal="1 Shaker (30g)"
                    priscaVal="1 Shaker (25g)"
                    note="Récupération"
                />

                {/* SOIR */}
                <div className="section-divider">SOIR</div>
                <PlanRow
                    label="Pâtes Protein+ (Cru)"
                    axelVal={`${Math.round(resAxel.pasta_soir)}g`}
                    priscaVal={`${Math.round(resPrisca.pasta_soir)}g`}
                    note="Ajustement (45%)"
                />
                <PlanRow
                    label="Œufs"
                    axelVal={`${resAxel.oeuf_qty} (Plat/Mollet)`}
                    priscaVal={`${resPrisca.oeuf_qty} (Plat/Mollet)`}
                    note="OBLIGATOIRE"
                />
                <PlanRow
                    label="Légumes + Crème"
                    axelVal="Légumes + 30g Crème"
                    priscaVal="Légumes + 30g Crème"
                    note=""
                />
                <PlanRow
                    label="Option Galettes"
                    axelVal={profiles.axel.opt_galettes ? "2 Galettes Iglo" : "-"}
                    priscaVal={profiles.prisca.opt_galettes ? "2 Galettes Iglo" : "-"}
                    note="Si activé, pâtes réduites"
                />
                <PlanRow
                    label="Option Fromage"
                    axelVal={profiles.axel.opt_fromage > 0 ? `${profiles.axel.opt_fromage}g` : "-"}
                    priscaVal={profiles.prisca.opt_fromage > 0 ? `${profiles.prisca.opt_fromage}g` : "-"}
                    note="Extra variable"
                />
            </div>

            {/* ALERTS */}
            {(resAxel.prot_warning || resPrisca.prot_warning) && (
                <div className="alert-box">
                    <AlertTriangle size={24} />
                    <div>
                        {resAxel.prot_warning && <div><strong>Axel :</strong> Déficit Protéique ! Ajoutez 1 dose de Whey.</div>}
                        {resPrisca.prot_warning && <div><strong>Prisca :</strong> Déficit Protéique ! Ajoutez 1 dose de Whey.</div>}
                    </div>
                </div>
            )}

            {/* DEBUG / LOGS SECTION */}
            <div style={{ marginTop: '4rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={18} /> Détails de Calcul (Logs)
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontSize: '0.85rem', fontFamily: 'monospace', color: '#cbd5e1' }}>
                    {/* AXEL LOGS */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px' }}>
                        <h4 style={{ color: '#38bdf8', marginBottom: '1rem' }}>LOGS AXEL</h4>
                        <p>Poids: {profiles.axel.weight}kg | Taille: {profiles.axel.height}cm | Age: {profiles.axel.age}</p>
                        <p>BMR (Mifflin): {Math.round(resAxel.bmr)} kcal</p>
                        <p>Facteur Sédentaire (1.2): {Math.round(resAxel.bmr * 1.2)} kcal</p>
                        <p>Sport Hebdo: {profiles.axel.sport_min} min (x{MET_DEFAULT} MET)</p>
                        <p>Sport Moyen/Jour: +{Math.round(resAxel.tdee_final - (resAxel.bmr * 1.2))} kcal</p>
                        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                        <p><strong>TDEE Final: {Math.round(resAxel.tdee_final)} kcal</strong></p>
                        <p>Cible (-{profiles.axel.deficit}): {Math.round(resAxel.target_daily)} kcal</p>
                        <br />
                        <p>Socle Fixe (PST/Oeufs/etc): -{Math.round(resAxel.fixed_cal)} kcal</p>
                        <p>Reste pour Pâtes: {Math.round(resAxel.remaining_cal)} kcal</p>
                        <p>-&gt; Division par 3.6 (360kcal/100g)</p>
                        <p><strong>= {Math.round(resAxel.pasta_grams_day)}g Pâtes (Cru)</strong></p>
                    </div>

                    {/* PRISCA LOGS */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px' }}>
                        <h4 style={{ color: '#a78bfa', marginBottom: '1rem' }}>LOGS PRISCA</h4>
                        <p>Poids: {profiles.prisca.weight}kg | Taille: {profiles.prisca.height}cm | Age: {profiles.prisca.age}</p>
                        <p>BMR (Mifflin): {Math.round(resPrisca.bmr)} kcal</p>
                        <p>Facteur Sédentaire (1.2): {Math.round(resPrisca.bmr * 1.2)} kcal</p>
                        <p>Sport Hebdo: {profiles.prisca.sport_min} min (x{MET_DEFAULT} MET)</p>
                        <p>Sport Moyen/Jour: +{Math.round(resPrisca.tdee_final - (resPrisca.bmr * 1.2))} kcal</p>
                        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                        <p><strong>TDEE Final: {Math.round(resPrisca.tdee_final)} kcal</strong></p>
                        <p>Cible (-{profiles.prisca.deficit}): {Math.round(resPrisca.target_daily)} kcal</p>
                        <br />
                        <p>Socle Fixe (PST/Oeufs/etc): -{Math.round(resPrisca.fixed_cal)} kcal</p>
                        <p>Reste pour Pâtes: {Math.round(resPrisca.remaining_cal)} kcal</p>
                        <p>-&gt; Division par 3.6 (360kcal/100g)</p>
                        <p><strong>= {Math.round(resPrisca.pasta_grams_day)}g Pâtes (Cru)</strong></p>
                    </div>
                </div>
            </div>

            <style>{`
                .section-title {
                    font-size: 1.5rem;
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    color: #fff;
                }
                .tabs {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                .tab-btn {
                    padding: 0.5rem 2rem;
                    border: 1px solid #334155;
                    background: transparent;
                    color: #64748b;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                }
                .tab-btn.active.axel { background: rgba(14, 165, 233, 0.2); border-color: #0ea5e9; color: #38bdf8; }
                .tab-btn.active.prisca { background: rgba(139, 92, 246, 0.2); border-color: #8b5cf6; color: #a78bfa; }
                
                .inputs-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 1.5rem;
                }
                .input-group label {
                    display: block;
                    font-size: 0.8rem;
                    color: #94a3b8;
                    margin-bottom: 0.5rem;
                }
                .input-group input[type="number"] {
                    width: 100%;
                    background: rgba(0,0,0,0.2);
                    border: 1px solid #334155;
                    padding: 0.5rem;
                    border-radius: 6px;
                    color: #fff;
                }
                .input-group.checkbox {
                    display: flex;
                    align-items: center;
                }
                .input-group.checkbox input {
                    margin-right: 0.5rem;
                    transform: scale(1.2);
                }

                .stats-mini {
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    font-size: 0.9rem;
                    color: #cbd5e1;
                    font-family: monospace;
                    text-align: center;
                }

                /* TABLE STYLES */
                .plan-table {
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                }
                .plan-row {
                    display: grid;
                    grid-template-columns: 2fr 1.5fr 1.5fr 2fr;
                    padding: 1rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    align-items: center;
                }
                .plan-row:last-child { border-bottom: none; }
                .header-row {
                    background: rgba(0, 0, 0, 0.3);
                    font-weight: 800;
                    color: #fff;
                    letter-spacing: 1px;
                }
                .section-divider {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 0.5rem 1rem;
                    font-size: 0.8rem;
                    font-weight: 800;
                    color: #94a3b8;
                    letter-spacing: 2px;
                }
                .col-item { font-weight: 600; color: #e2e8f0; }
                .col-val { font-family: monospace; font-size: 1.1rem; text-align: center;}
                .col-val.axel { color: #38bdf8; }
                .col-val.prisca { color: #a78bfa; }
                .col-note { font-size: 0.8rem; color: #64748b; font-style: italic; text-align: right; }

                .alert-box {
                    margin-top: 2rem;
                    background: rgba(248, 113, 113, 0.2);
                    border: 1px solid #f87171;
                    color: #fca5a5;
                    padding: 1rem;
                    border-radius: 8px;
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                }

                @media (max-width: 768px) {
                    .plan-row {
                        grid-template-columns: 1fr 1fr;
                        gap: 0.5rem;
                    }
                    .col-item { grid-column: 1 / -1; margin-bottom: 0.25rem; }
                    .col-note { grid-column: 1 / -1; margin-top: 0.25rem; text-align: left; }
                    .col-val { text-align: left; }
                }
            `}</style>
        </div>
    );
};

export default SmartDiet;
