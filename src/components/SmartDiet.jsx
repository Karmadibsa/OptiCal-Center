import React, { useState, useEffect } from 'react';
import {
    Settings,
    Activity,
    Utensils,
    AlertTriangle,
    CheckCircle,
    Download,
    Scale
} from 'lucide-react';
import {
    MET_DEFAULT,
    PASTA_REF,
    SOCLE_DATA,
    DEFAULT_PROFILES,
    calculatePlan
} from '../utils/dietAlgo';

const SmartDiet = ({ csvData }) => {
    // --- 1. CONSTANTS & DATA ---
    // Moved to ../utils/dietAlgo.js

    // --- 2. STATE ---
    const [profiles, setProfiles] = useState(() => {
        // Init from localStorage first (temporary fallback), will be overridden by CSV if available
        const saved = localStorage.getItem('smart_diet_profiles_v2');
        return saved ? JSON.parse(saved) : DEFAULT_PROFILES;
    });

    const [activeTab, setActiveTab] = useState('axel');

    const [batchConfig, setBatchConfig] = useState({
        days: 6,
        potWeight: 1930,
        totalWeighed: 0
    });

    // --- LOAD CONFIG FROM CSV (Source of Truth) ---
    useEffect(() => {
        if (!csvData || csvData.length === 0) return;

        // Check for Config rows
        const configRows = csvData.filter(row => row.Type === 'Config');

        if (configRows.length > 0) {
            const newProfiles = { ...profiles };
            let hasChanges = false;

            configRows.forEach(row => {
                const param = row.Item; // Weight, Height, SportMin, etc
                const valAxel = row.Axel;
                const valPrisca = row.Prisca;

                if (param === 'Weight') {
                    newProfiles.axel.weight = parseFloat(valAxel);
                    newProfiles.prisca.weight = parseFloat(valPrisca);
                    hasChanges = true;
                }
                if (param === 'Height') {
                    newProfiles.axel.height = parseFloat(valAxel);
                    newProfiles.prisca.height = parseFloat(valPrisca);
                    hasChanges = true;
                }
                if (param === 'Age') {
                    newProfiles.axel.age = parseFloat(valAxel);
                    newProfiles.prisca.age = parseFloat(valPrisca);
                    hasChanges = true;
                }
                if (param === 'SportMin') {
                    newProfiles.axel.sport_min = parseFloat(valAxel);
                    newProfiles.prisca.sport_min = parseFloat(valPrisca);
                    hasChanges = true;
                }
                if (param === 'Deficit') {
                    newProfiles.axel.deficit = parseFloat(valAxel);
                    newProfiles.prisca.deficit = parseFloat(valPrisca);
                    hasChanges = true;
                }
                if (param === 'Opt_Galettes') {
                    newProfiles.axel.opt_galettes = valAxel === 'true';
                    newProfiles.prisca.opt_galettes = valPrisca === 'true';
                    hasChanges = true;
                }
                if (param === 'Opt_Fromage') {
                    newProfiles.axel.opt_fromage = parseFloat(valAxel);
                    newProfiles.prisca.opt_fromage = parseFloat(valPrisca);
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                setProfiles(newProfiles);
                // Also update localStorage to stay in sync
                localStorage.setItem('smart_diet_profiles_v2', JSON.stringify(newProfiles));
            }
        }
    }, [csvData]); // Config loads ONLY when CSV changes

    useEffect(() => {
        localStorage.setItem('smart_diet_profiles_v2', JSON.stringify(profiles));
    }, [profiles]);

    // --- 3. CORE ALGORITHM (The Engine) ---
    // Moved to ../utils/dietAlgo.js

    const resAxel = calculatePlan('axel', profiles);
    const resPrisca = calculatePlan('prisca', profiles);

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

    // --- 5. CSV EXPORT ---
    const generateCSV = () => {
        const header = ['Type', 'Section', 'Item', 'Axel', 'Prisca', 'Note'];

        // PREPARE CONFIG ROWS
        const configRows = [
            ['Config', 'Profile', 'Weight', profiles.axel.weight, profiles.prisca.weight, 'System Config'],
            ['Config', 'Profile', 'Height', profiles.axel.height, profiles.prisca.height, 'System Config'],
            ['Config', 'Profile', 'Age', profiles.axel.age, profiles.prisca.age, 'System Config'],
            ['Config', 'Profile', 'SportMin', profiles.axel.sport_min, profiles.prisca.sport_min, 'System Config'],
            ['Config', 'Profile', 'Deficit', profiles.axel.deficit, profiles.prisca.deficit, 'System Config'],
            ['Config', 'Profile', 'Opt_Galettes', profiles.axel.opt_galettes, profiles.prisca.opt_galettes, 'System Config'],
            ['Config', 'Profile', 'Opt_Fromage', profiles.axel.opt_fromage, profiles.prisca.opt_fromage, 'System Config'],
        ];

        const dataRows = [
            // DIET - MATIN
            ['Diet', 'Matin', 'Pain + Cancoillotte + Œufs', '140g Pain + 30g Canc. + 3 Œufs', '80g Pain + 20g Canc. + 2 Œufs', 'Base fixe'],
            ['Diet', 'Matin', 'Whey', '1 Shaker de Whey (30g)', 'Rien', ''],

            // DIET - MIDI
            ['Diet', 'Midi', 'Pâtes Protein+ (Cru)', `${Math.round(resAxel.pasta_midi)}g`, `${Math.round(resPrisca.pasta_midi)}g`, 'Calculé (55%)'],
            ['Diet', 'Midi', 'PST (Cru)', `${resAxel.pst_qty}g`, `${resPrisca.pst_qty}g`, 'Source Protéines (Poids - 25)'],
            ['Diet', 'Midi', 'Légumes', 'À volonté', 'À volonté', 'Volume'],
            ['Diet', 'Midi', 'Crème Fraîche', '30g (1 c.à.s)', '30g (1 c.à.s)', 'Lipides'],

            // DIET - 16H
            ['Diet', '16H00', 'Banane', '1 Banane', '1 Banane', 'Glucides rapides'],
            ['Diet', '16H00', 'Whey', '1 Shaker de Whey (30g)', '1 Shaker de Whey (25g)', 'Récupération'],

            // DIET - SOIR
            ['Diet', 'Soir', 'Pâtes Protein+ (Cru)', `${Math.round(resAxel.pasta_soir)}g`, `${Math.round(resPrisca.pasta_soir)}g`, 'Ajustement (45%)'],
            ['Diet', 'Soir', 'Œufs', `${resAxel.oeuf_qty} (Plat/Mollet)`, `${resPrisca.oeuf_qty} (Plat/Mollet)`, 'OBLIGATOIRE'],
            ['Diet', 'Soir', 'Légumes + Crème', 'Légumes + 30g Crème', 'Légumes + 30g Crème', ''],
            ['Diet', 'Soir', 'Option Galettes', profiles.axel.opt_galettes ? "2 Galettes Iglo" : "-", profiles.prisca.opt_galettes ? "2 Galettes Iglo" : "-", 'Si activé, pâtes réduites'],
            ['Diet', 'Soir', 'Option Fromage', profiles.axel.opt_fromage > 0 ? `${profiles.axel.opt_fromage}g` : "-", profiles.prisca.opt_fromage > 0 ? `${profiles.prisca.opt_fromage}g` : "-", 'Extra variable'],
        ];

        // Combine: Header -> Config -> Data
        const rows = [header, ...configRows, ...dataRows];

        // Convert to CSV string
        const csvContent = rows.map(row => row.join(',')).join('\n');
        return csvContent;
    };

    const handleCopyCSV = () => {
        const csv = generateCSV();
        navigator.clipboard.writeText(csv).then(() => {
            alert("CSV copié ! Collez-le dans public/diet.csv pour mettre à jour la diète (les suppléments sont dans un fichier à part).");
        });
    };

    // --- 6. RENDER HELPERS ---
    const PlanRow = ({ label, axelVal, priscaVal, note, isHeader = false }) => (
        <div className={`plan-row ${isHeader ? 'header-row' : ''}`}>
            <div className="col-item">{label}</div>
            <div className="col-val axel">{axelVal}</div>
            <div className="col-val prisca">{priscaVal}</div>
            <div className="col-note">{note}</div>
        </div>
    );

    // --- BATCH CALCULATION ---
    const totalRawDaily = resAxel.pasta_midi + resAxel.pasta_soir + resPrisca.pasta_midi + resPrisca.pasta_soir;
    const totalRawBatch = totalRawDaily * batchConfig.days;
    // Safety check just in case
    const netCooked = Math.max(0, batchConfig.totalWeighed - batchConfig.potWeight);
    const cookCoef = (totalRawBatch > 0 && netCooked > 0) ? netCooked / totalRawBatch : 0;


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

            <button
                onClick={handleCopyCSV}
                className="action-btn"
                style={{ marginTop: '1rem', width: '100%', background: 'rgba(255, 255, 255, 0.1)', border: '1px dashed #94a3b8' }}
            >
                <Download size={18} /> Copier Configuration CSV
            </button>

            {/* --- TABLEAU FINAL --- */}
            <h2 className="section-title" style={{ marginTop: '3rem' }}>
                <Utensils className="icon-mr" /> Plan Alimentaire (Lissé)
            </h2>

            <div className="plan-table">
                <PlanRow isHeader label="ITEM" axelVal="AXEL" priscaVal="PRISCA" note="NOTE" />

                {/* MATIN */}
                <div className="section-divider">MATIN</div>
                <PlanRow
                    label="Pain + Cancoillotte + Œufs"
                    axelVal="140g Pain + 30g Canc. + 3 Œufs"
                    priscaVal="80g Pain + 20g Canc. + 2 Œufs"
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

            {/* --- BATCH COOKING SECTION --- */}
            <h2 className="section-title" style={{ marginTop: '3rem', color: '#10b981' }}>
                <Scale className="icon-mr" /> Batch Cooking (Dimanche)
            </h2>

            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="inputs-grid">
                    <div className="input-group">
                        <label>Jours de Batch</label>
                        <input
                            type="number"
                            value={batchConfig.days}
                            onChange={(e) => setBatchConfig({ ...batchConfig, days: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="input-group">
                        <label>Poids Casserole (Vide)</label>
                        <input
                            type="number"
                            value={batchConfig.potWeight}
                            onChange={(e) => setBatchConfig({ ...batchConfig, potWeight: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="input-group">
                        <label style={{ color: '#fbbf24', fontWeight: 'bold' }}>POIDS TOTAL (Casserole + Pâtes)</label>
                        <input
                            type="number"
                            value={batchConfig.totalWeighed}
                            onChange={(e) => setBatchConfig({ ...batchConfig, totalWeighed: parseFloat(e.target.value) || 0 })}
                            style={{ borderColor: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)' }}
                            placeholder="Ex: 5800"
                        />
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: '#94a3b8' }}>
                            Total Cru Semaine: <strong>{Math.round(totalRawBatch)}g</strong> ({batchConfig.days} jours)
                        </span>
                        <span style={{ fontSize: '1.1rem', color: '#10b981' }}>
                            Coef Cuisson: <strong>x{cookCoef.toFixed(2)}</strong>
                        </span>
                    </div>

                    <div className="plan-table">
                        <div className="plan-row header-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
                            <div className="col-item">BOÎTES À PRÉPARER</div>
                            <div className="col-val">POIDS CUIT / BOÎTE</div>
                        </div>

                        {/* AXEL */}
                        <div className="plan-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
                            <div className="col-item" style={{ color: '#38bdf8' }}>Axel MIDI (x{batchConfig.days})</div>
                            <div className="col-val">{Math.round(resAxel.pasta_midi * cookCoef)}g</div>
                        </div>
                        <div className="plan-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
                            <div className="col-item" style={{ color: '#38bdf8' }}>Axel SOIR (x{batchConfig.days})</div>
                            <div className="col-val">{Math.round(resAxel.pasta_soir * cookCoef)}g</div>
                        </div>

                        {/* PRISCA */}
                        <div className="plan-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
                            <div className="col-item" style={{ color: '#a78bfa' }}>Prisca MIDI (x{batchConfig.days})</div>
                            <div className="col-val">{Math.round(resPrisca.pasta_midi * cookCoef)}g</div>
                        </div>
                        <div className="plan-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
                            <div className="col-item" style={{ color: '#a78bfa' }}>Prisca SOIR (x{batchConfig.days})</div>
                            <div className="col-val">{Math.round(resPrisca.pasta_soir * cookCoef)}g</div>
                        </div>
                    </div>
                </div>
            </div>

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

                .action-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .action-btn:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }

                @media (max-width: 768px) {
                    .plan-row {
                        grid-template-columns: 1fr 1fr;
                        gap: 0.5rem;
                    }
                    .col-item { grid-column: 1 / -1; margin-bottom: 0.25rem; font-size: 1rem; color: #fff; }
                    .col-note { grid-column: 1 / -1; margin-top: 0.25rem; text-align: left; opacity: 0.7; }
                    .col-val { text-align: left; padding: 0.25rem 0; }
                }
            `}</style>
        </div>
    );
};

export default SmartDiet;
