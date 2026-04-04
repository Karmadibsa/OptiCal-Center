import React, { useState } from 'react';
import {
    Settings,
    Activity,
    Utensils,
    AlertTriangle,
    Download,
    Scale,
    Flame
} from 'lucide-react';
import {
    ACTIVITIES,
    calculatePlan
} from '../utils/dietAlgo';

// ─────────────────────────────────────────────────────────────────────────────
// FIX #8 / #4 : ActivityGrid est déclaré HORS de SmartDiet pour éviter que
// React le recrée à chaque re-render (perte de focus sur les inputs).
// ─────────────────────────────────────────────────────────────────────────────
const ActivityGrid = ({ profileKey, profiles, res, handleActivity }) => {
    const acts = profiles[profileKey].activities || {};
    const color = profileKey === 'axel' ? '#38bdf8' : '#a78bfa';

    return (
        <div style={{ marginTop: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.75rem' }}>
                ACTIVITÉS HEBDOMADAIRES
            </div>
            {/* FIX #5 : grid resserré, gap réduit pour meilleur alignement label/input */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 70px', gap: '0.35rem 0.75rem', alignItems: 'center' }}>
                {/* Header */}
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Activité (MET)</span>
                {/* FIX #10 : ajout de l'unité "min" */}
                <span style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'right' }}>min/sem</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'right' }}>kcal/sem</span>

                {ACTIVITIES.map(act => {
                    const mins = acts[act.id] || 0;
                    const kcal = Math.round(profiles[profileKey].weight * (mins / 60) * act.met);
                    const inputId = `act-${profileKey}-${act.id}`;
                    return (
                        <React.Fragment key={act.id}>
                            {/* FIX #10 : htmlFor lié à l'id de l'input */}
                            <label
                                htmlFor={inputId}
                                style={{
                                    fontSize: '0.85rem',
                                    color: mins > 0 ? '#e2e8f0' : '#475569',
                                    cursor: 'pointer',
                                    lineHeight: 1.3
                                }}
                            >
                                {act.label} <span style={{ color: '#64748b', fontSize: '0.75rem' }}>× {act.met}</span>
                            </label>
                            <input
                                id={inputId}
                                type="number"
                                min="0"
                                // FIX #11 : affiche '' si 0 pour ne pas bloquer la saisie
                                value={mins === 0 ? '' : mins}
                                placeholder="0"
                                onChange={(e) => handleActivity(profileKey, act.id, e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.25)',
                                    border: `1px solid ${mins > 0 ? color : '#334155'}`,
                                    padding: '0.3rem 0.4rem',
                                    borderRadius: '5px',
                                    color: mins > 0 ? color : '#94a3b8',
                                    textAlign: 'right',
                                    fontSize: '0.9rem'
                                }}
                            />
                            <span style={{ fontSize: '0.82rem', color: mins > 0 ? '#fbbf24' : '#334155', textAlign: 'right', fontFamily: 'monospace' }}>
                                {mins > 0 ? `+${kcal}` : '—'}
                            </span>
                        </React.Fragment>
                    );
                })}

                {/* Totaux */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700 }}>
                    TOTAL
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', textAlign: 'right', color, fontFamily: 'monospace', fontWeight: 700 }}>
                    {res.total_sport_min} min
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', textAlign: 'right', color: '#fbbf24', fontFamily: 'monospace', fontWeight: 700 }}>
                    +{Math.round(res.sport_cal_week)} kcal
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const SmartDiet = ({ profiles, setProfiles }) => {

    const [activeTab, setActiveTab] = useState('axel');

    const [batchConfig, setBatchConfig] = useState({
        days: 6,
        potWeight: 1930,
        totalWeighed: 0
    });

    const resAxel = calculatePlan('axel', profiles);
    const resPrisca = calculatePlan('prisca', profiles);

    // --- HANDLERS ---
    // Champs numériques : weight, height, age, deficit, opt_fromage, prot_ratio
    // Champs string : gender
    // Champs boolean : opt_galettes
    const NUMERIC_FIELDS = new Set(['weight', 'height', 'age', 'deficit', 'opt_fromage', 'prot_ratio']);

    const handleInput = (key, field, val) => {
        setProfiles(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                // Pour les champs numériques : accepter '' (saisie en cours) ou parser
                // Pour les autres (goal, opt_galettes…) : stocker la valeur brute directement
                [field]: NUMERIC_FIELDS.has(field)
                    ? (val === '' ? '' : (parseFloat(val) || 0))
                    : val
            }
        }));
    };


    const handleActivity = (key, actId, mins) => {
        setProfiles(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                activities: {
                    ...prev[key].activities,
                    // FIX #11 : éviter NaN si le champ est vidé
                    [actId]: mins === '' ? 0 : (parseFloat(mins) || 0)
                }
            }
        }));
    };

    // --- CSV EXPORT ---
    const escapeCSV = (val) => {
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const generateCSV = () => {
        const header = ['Type', 'Section', 'Item', 'Axel', 'Prisca', 'Note'];

        const configRows = [
            ['Config', 'Profile', 'Weight', profiles.axel.weight, profiles.prisca.weight, 'System Config'],
            ['Config', 'Profile', 'Height', profiles.axel.height, profiles.prisca.height, 'System Config'],
            ['Config', 'Profile', 'Age', profiles.axel.age, profiles.prisca.age, 'System Config'],
            ['Config', 'Profile', 'Deficit', profiles.axel.deficit, profiles.prisca.deficit, 'System Config'],
            ['Config', 'Profile', 'Prot_Ratio', profiles.axel.prot_ratio, profiles.prisca.prot_ratio, 'System Config'],
            ['Config', 'Profile', 'Opt_Galettes', profiles.axel.opt_galettes, profiles.prisca.opt_galettes, 'System Config'],
            ['Config', 'Profile', 'Opt_Fromage', profiles.axel.opt_fromage, profiles.prisca.opt_fromage, 'System Config'],
            ...ACTIVITIES.map(act => [
                'Config', 'Sport', act.id,
                profiles.axel.activities?.[act.id] || 0,
                profiles.prisca.activities?.[act.id] || 0,
                `${act.label} - MET ${act.met}`
            ])
        ];

        const dataRows = [
            ['Diet', 'Matin', 'Pain + Cancoillotte + Œufs', '140g Pain + 30g Canc. + 3 Œufs', '80g Pain + 20g Canc. + 2 Œufs', 'Base fixe'],
            ['Diet', 'Matin', 'Whey', '1 Shaker de Whey (30g)', 'Rien', ''],

            ['Diet', 'Midi', 'Pâtes Protein+ (Cru)', `${Math.round(resAxel.pasta_midi)}g`, `${Math.round(resPrisca.pasta_midi)}g`, 'Calculé (55%)'],
            ['Diet', 'Midi', 'PST (Cru)', `${resAxel.pst_qty}g`, `${resPrisca.pst_qty}g`, 'Source Protéines (Poids - 25)'],
            ['Diet', 'Midi', 'Légumes', 'À volonté', 'À volonté', 'Volume'],
            ['Diet', 'Midi', 'Crème Fraîche', '30g (1 c.à.s)', '30g (1 c.à.s)', 'Lipides'],

            ['Diet', '16H00', 'Banane', '1 Banane', '1 Banane', 'Glucides rapides'],
            ['Diet', '16H00', 'Whey', '1 Shaker de Whey (30g)', '1 Shaker de Whey (25g)', 'Récupération'],

            ['Diet', 'Soir', 'Pâtes Protein+ (Cru)', `${Math.round(resAxel.pasta_soir)}g`, `${Math.round(resPrisca.pasta_soir)}g`, 'Ajustement (45%)'],
            ['Diet', 'Soir', 'Œufs', `${resAxel.oeuf_qty_per_meal} (Plat/Mollet)`, `${resPrisca.oeuf_qty_per_meal} (Plat/Mollet)`, 'OBLIGATOIRE'],
            ['Diet', 'Soir', 'Légumes + Crème', 'Légumes + 30g Crème', 'Légumes + 30g Crème', ''],
            ['Diet', 'Soir', 'Option Galettes', profiles.axel.opt_galettes ? "2 Galettes Iglo" : "-", profiles.prisca.opt_galettes ? "2 Galettes Iglo" : "-", 'Si activé, pâtes réduites'],
            ['Diet', 'Soir', 'Option Fromage', profiles.axel.opt_fromage > 0 ? `${profiles.axel.opt_fromage}g` : "-", profiles.prisca.opt_fromage > 0 ? `${profiles.prisca.opt_fromage}g` : "-", 'Extra variable'],
        ];

        const rows = [header, ...configRows, ...dataRows];
        return rows.map(row => row.map(escapeCSV).join(',')).join('\n');
    };

    const handleCopyCSV = () => {
        navigator.clipboard.writeText(generateCSV()).then(() => {
            alert("CSV copié ! Collez-le dans public/diet.csv pour sauvegarder la configuration.");
        });
    };

    // --- RENDER HELPERS ---
    const PlanRow = ({ label, axelVal, priscaVal, note, isHeader = false }) => (
        <div className={`plan-row ${isHeader ? 'header-row' : ''}`}>
            <div className="col-item">{label}</div>
            <div className="col-val axel">{axelVal}</div>
            <div className="col-val prisca">{priscaVal}</div>
            <div className="col-note">{note}</div>
        </div>
    );

    // --- BATCH ---
    const totalRawDaily = resAxel.pasta_midi + resAxel.pasta_soir + resPrisca.pasta_midi + resPrisca.pasta_soir;
    const totalRawBatch = totalRawDaily * batchConfig.days;
    const netCooked = Math.max(0, batchConfig.totalWeighed - batchConfig.potWeight);
    const cookCoef = (totalRawBatch > 0 && netCooked > 0) ? netCooked / totalRawBatch : 0;

    return (
        <div className="animate-fade-in section-container">

            <h2 className="section-title"><Settings className="icon-mr" /> Configuration Hebdomadaire</h2>

            <div className="tabs">
                <button className={`tab-btn ${activeTab === 'axel' ? 'active axel' : ''}`} onClick={() => setActiveTab('axel')}>Axel</button>
                <button className={`tab-btn ${activeTab === 'prisca' ? 'active prisca' : ''}`} onClick={() => setActiveTab('prisca')}>Prisca</button>
            </div>

            <div className="config-card card">
                {['axel', 'prisca'].map(key => {
                    const res = key === 'axel' ? resAxel : resPrisca;
                    const weightId = `profile-${key}-weight`;
                    const deficitId = `profile-${key}-deficit`;
                    const galettesId = `profile-${key}-galettes`;
                    const fromageId = `profile-${key}-fromage`;

                    return (
                        <div key={key} style={{ display: activeTab === key ? 'block' : 'none' }}>
                            <div className="inputs-grid">
                                <div className="input-group">
                                    {/* FIX #10 : unités dans le label + htmlFor */}
                                    <label htmlFor={weightId}>Poids <span className="unit-badge">kg</span></label>
                                    <input
                                        id={weightId}
                                        type="number"
                                        // FIX #11 : affiche '' si 0 pour permettre la saisie naturelle
                                        value={profiles[key].weight === 0 ? '' : profiles[key].weight}
                                        placeholder="0"
                                        onChange={(e) => handleInput(key, 'weight', e.target.value)}
                                    />
                                </div>
                                <div className="input-group">
                                    <label htmlFor={deficitId}>Déficit cible <span className="unit-badge">kcal</span></label>
                                    <input
                                        id={deficitId}
                                        type="number"
                                        value={profiles[key].deficit === 0 ? '' : profiles[key].deficit}
                                        placeholder="0"
                                        onChange={(e) => handleInput(key, 'deficit', e.target.value)}
                                    />
                                </div>
                                {/* Objectif protéines : input numérique libre */}
                                <div className="input-group">
                                    <label htmlFor={`profile-${key}-prot`}>
                                        Protéines cible
                                        <span className="unit-badge">g/kg</span>
                                    </label>
                                    <input
                                        id={`profile-${key}-prot`}
                                        type="number"
                                        min="0.5"
                                        max="3"
                                        step="0.1"
                                        value={profiles[key].prot_ratio === 0 ? '' : profiles[key].prot_ratio}
                                        placeholder="1.8"
                                        onChange={(e) => handleInput(key, 'prot_ratio', e.target.value)}
                                    />
                                </div>
                                <div className="input-group checkbox">
                                    <label htmlFor={galettesId}>
                                        <input
                                            id={galettesId}
                                            type="checkbox"
                                            checked={profiles[key].opt_galettes}
                                            onChange={(e) => handleInput(key, 'opt_galettes', e.target.checked)}
                                        />
                                        Option Galettes Soir
                                    </label>
                                </div>
                                <div className="input-group">
                                    <label htmlFor={fromageId}>Option Fromage <span className="unit-badge">g</span></label>
                                    <input
                                        id={fromageId}
                                        type="number"
                                        value={profiles[key].opt_fromage === 0 ? '' : profiles[key].opt_fromage}
                                        placeholder="0"
                                        onChange={(e) => handleInput(key, 'opt_fromage', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* ActivityGrid extrait HORS du composant (fix #8/#4) — passé par props */}
                            <ActivityGrid
                                profileKey={key}
                                profiles={profiles}
                                res={res}
                                handleActivity={handleActivity}
                            />

                            <div className="stats-mini">
                                <span>TDEE: {Math.round(res.tdee_final)} kcal</span>
                                <span> | </span>
                                <span>Cible: {Math.round(res.target_daily)} kcal</span>
                                <span> | </span>
                                <span style={{ color: '#fbbf24' }}>Estimé: {Math.round(res.total_estimated)} kcal</span>
                                <br />
                                {/* FIX #12 : afficher l'objectif protéines dynamique */}
                                <span style={{ color: res.prot_warning ? '#f87171' : '#4ade80' }}>
                                    Protéines: {Math.round(res.total_prot)}g / {Math.round(res.prot_goal)}g
                                    {' → '}{profiles[key].prot_ratio}g/kg × {profiles[key].weight}kg
                                    {res.prot_warning && " (⚠️ Trop bas !)"}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button onClick={handleCopyCSV} className="action-btn"
                style={{ marginTop: '1rem', width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px dashed #94a3b8' }}>
                <Download size={18} /> Copier Configuration CSV
            </button>

            {/* --- TABLEAU FINAL --- */}
            <h2 className="section-title" style={{ marginTop: '3rem' }}>
                <Utensils className="icon-mr" /> Plan Alimentaire (Lissé)
            </h2>

            <div className="plan-table">
                <PlanRow isHeader label="ITEM" axelVal="AXEL" priscaVal="PRISCA" note="NOTE" />

                <div className="section-divider">MATIN</div>
                <PlanRow label="Pain + Cancoillotte + Œufs" axelVal="140g Pain + 30g Canc. + 3 Œufs" priscaVal="80g Pain + 20g Canc. + 2 Œufs" note="Base fixe" />
                <PlanRow label="Whey" axelVal="1 Shaker (30g)" priscaVal="-" note="" />

                <div className="section-divider">MIDI</div>
                <PlanRow label="Pâtes Protein+ (Cru)" axelVal={`${Math.round(resAxel.pasta_midi)}g`} priscaVal={`${Math.round(resPrisca.pasta_midi)}g`} note="Calculé (55%)" />
                <PlanRow label="PST (Cru)" axelVal={`${resAxel.pst_qty}g`} priscaVal={`${resPrisca.pst_qty}g`} note="Poids - 25" />
                <PlanRow label="Légumes" axelVal="À volonté" priscaVal="À volonté" note="Volume" />
                <PlanRow label="Crème Fraîche" axelVal="30g (1 c.à.s)" priscaVal="30g (1 c.à.s)" note="Lipides" />

                <div className="section-divider">COLLATION (16H)</div>
                <PlanRow label="Banane" axelVal="1 Banane" priscaVal="1 Banane" note="Glucides rapides" />
                <PlanRow label="Whey" axelVal="1 Shaker (30g)" priscaVal="1 Shaker (25g)" note="Récupération" />

                <div className="section-divider">SOIR</div>
                <PlanRow label="Pâtes Protein+ (Cru)" axelVal={`${Math.round(resAxel.pasta_soir)}g`} priscaVal={`${Math.round(resPrisca.pasta_soir)}g`} note="Ajustement (45%)" />
                <PlanRow label="Œufs" axelVal={`${resAxel.oeuf_qty_per_meal} (Plat/Mollet)`} priscaVal={`${resPrisca.oeuf_qty_per_meal} (Plat/Mollet)`} note="OBLIGATOIRE" />
                <PlanRow label="Légumes + Crème" axelVal="Légumes + 30g Crème" priscaVal="Légumes + 30g Crème" note="" />
                <PlanRow label="Option Galettes" axelVal={profiles.axel.opt_galettes ? "2 Galettes Iglo" : "-"} priscaVal={profiles.prisca.opt_galettes ? "2 Galettes Iglo" : "-"} note="Si activé, pâtes réduites" />
                <PlanRow label="Option Fromage" axelVal={profiles.axel.opt_fromage > 0 ? `${profiles.axel.opt_fromage}g` : "-"} priscaVal={profiles.prisca.opt_fromage > 0 ? `${profiles.prisca.opt_fromage}g` : "-"} note="Extra variable" />
            </div>

            {(resAxel.prot_warning || resPrisca.prot_warning) && (
                <div className="alert-box">
                    <AlertTriangle size={24} />
                    <div>
                        {resAxel.prot_warning && <div><strong>Axel :</strong> Déficit Protéique ! Ajoutez 1 dose de Whey.</div>}
                        {resPrisca.prot_warning && <div><strong>Prisca :</strong> Déficit Protéique ! Ajoutez 1 dose de Whey.</div>}
                    </div>
                </div>
            )}

            {/* --- BATCH COOKING --- */}
            <h2 className="section-title" style={{ marginTop: '3rem', color: '#10b981' }}>
                <Scale className="icon-mr" /> Batch Cooking (Dimanche)
            </h2>

            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="inputs-grid">
                    <div className="input-group">
                        <label htmlFor="batch-days">Jours de Batch</label>
                        <input
                            id="batch-days"
                            type="number"
                            value={batchConfig.days === 0 ? '' : batchConfig.days}
                            placeholder="6"
                            onChange={(e) => setBatchConfig({ ...batchConfig, days: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="input-group">
                        {/* FIX #10 : unité g dans le label */}
                        <label htmlFor="batch-pot">Poids Casserole (Vide) <span className="unit-badge">g</span></label>
                        <input
                            id="batch-pot"
                            type="number"
                            value={batchConfig.potWeight === 0 ? '' : batchConfig.potWeight}
                            placeholder="1930"
                            onChange={(e) => setBatchConfig({ ...batchConfig, potWeight: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="batch-total" style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                            POIDS TOTAL (Casserole + Pâtes) <span className="unit-badge">g</span>
                        </label>
                        <input
                            id="batch-total"
                            type="number"
                            value={batchConfig.totalWeighed === 0 ? '' : batchConfig.totalWeighed}
                            onChange={(e) => setBatchConfig({ ...batchConfig, totalWeighed: parseFloat(e.target.value) || 0 })}
                            style={{ borderColor: '#fbbf24', background: 'rgba(251,191,36,0.1)' }}
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
                        <div className="plan-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
                            <div className="col-item" style={{ color: '#38bdf8' }}>Axel MIDI (x{batchConfig.days})</div>
                            <div className="col-val">{Math.round(resAxel.pasta_midi * cookCoef)}g</div>
                        </div>
                        <div className="plan-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
                            <div className="col-item" style={{ color: '#38bdf8' }}>Axel SOIR (x{batchConfig.days})</div>
                            <div className="col-val">{Math.round(resAxel.pasta_soir * cookCoef)}g</div>
                        </div>
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

            {/* --- LOGS --- */}
            <div style={{ marginTop: '4rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={18} /> Détails de Calcul (Logs)
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '2rem', fontSize: '0.85rem', fontFamily: 'monospace', color: '#cbd5e1' }}>
                    {[{ key: 'axel', res: resAxel, color: '#38bdf8', label: 'AXEL' }, { key: 'prisca', res: resPrisca, color: '#a78bfa', label: 'PRISCA' }].map(({ key, res, color, label }) => (
                        <div key={key} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px' }}>
                            <h4 style={{ color, marginBottom: '1rem' }}>LOGS {label}</h4>
                            <p>Poids: {profiles[key].weight}kg | Taille: {profiles[key].height}cm | Age: {profiles[key].age}</p>
                            <p>Protéines cible: <strong style={{ color }}>{profiles[key].prot_ratio}g/kg → {Math.round(res.prot_goal)}g/jour</strong></p>
                            <p>BMR (Mifflin): {Math.round(res.bmr)} kcal</p>
                            <p>Facteur Sédentaire (×1.2): {Math.round(res.bmr * 1.2)} kcal</p>
                            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                            <p style={{ color: '#fbbf24' }}>Sport ({res.total_sport_min} min/sem) :</p>
                            {ACTIVITIES.filter(act => (profiles[key].activities?.[act.id] || 0) > 0).map(act => {
                                const mins = profiles[key].activities?.[act.id] || 0;
                                const kcal = Math.round(profiles[key].weight * (mins / 60) * act.met);
                                return <p key={act.id} style={{ paddingLeft: '0.75rem', color: '#94a3b8' }}>↳ {act.label}: {mins}min × {act.met} MET = +{kcal} kcal/sem</p>;
                            })}
                            <p>Sport Moyen/Jour: +{Math.round(res.sport_day)} kcal</p>
                            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                            <p><strong>TDEE Final: {Math.round(res.tdee_final)} kcal</strong></p>
                            <p>Cible (-{profiles[key].deficit}): {Math.round(res.target_daily)} kcal</p>
                            <br />
                            <p>Socle Fixe: -{Math.round(res.fixed_cal)} kcal</p>
                            <p>Reste pour Pâtes: {Math.round(res.remaining_cal)} kcal</p>
                            <p><strong>= {Math.round(res.pasta_grams_day)}g Pâtes (Cru)</strong></p>
                            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                            <p style={{ color: res.prot_warning ? '#f87171' : '#4ade80' }}>
                                Protéines: {Math.round(res.total_prot)}g / {Math.round(res.prot_goal)}g ({profiles[key].prot_ratio}g/kg)
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .section-title { font-size: 1.5rem; margin-bottom: 1.5rem; display: flex; align-items: center; color: #fff; }
                .tabs { display: flex; gap: 1rem; margin-bottom: 1rem; }
                .tab-btn { padding: 0.5rem 2rem; border: 1px solid #334155; background: transparent; color: #64748b; border-radius: 8px; cursor: pointer; font-weight: 600; }
                .tab-btn.active.axel { background: rgba(14,165,233,0.2); border-color: #0ea5e9; color: #38bdf8; }
                .tab-btn.active.prisca { background: rgba(139,92,246,0.2); border-color: #8b5cf6; color: #a78bfa; }
                .inputs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem; }
                .input-group label { display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.5rem; }
                .input-group input[type="number"] { width: 100%; background: rgba(0,0,0,0.2); border: 1px solid #334155; padding: 0.5rem; border-radius: 6px; color: #fff; }
                .input-group.checkbox { display: flex; align-items: center; }
                .input-group.checkbox input { margin-right: 0.5rem; transform: scale(1.2); }
                .unit-badge { font-size: 0.7rem; color: #64748b; background: rgba(255,255,255,0.07); padding: 0.1rem 0.35rem; border-radius: 4px; font-family: monospace; margin-left: 0.25rem; }
                .goal-toggle { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
                .goal-btn { 
                    flex: 1; 
                    padding: 0.5rem 0.25rem; 
                    border: 1px solid #334155; 
                    background: transparent; 
                    color: #64748b; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    font-size: 0.85rem; 
                    font-weight: 700; 
                    transition: all 0.2s;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0;
                    line-height: 1.1;
                }
                .goal-btn.active-sport { background: rgba(56,189,248,0.15); border-color: #38bdf8; color: #38bdf8; }
                .goal-btn.active-sante { background: rgba(16,185,129,0.15); border-color: #10b981; color: #10b981; }
                .stats-mini { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.9rem; color: #cbd5e1; font-family: monospace; text-align: center; }
                .plan-table { background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; }
                .plan-row { display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 2fr; padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center; }
                .plan-row:last-child { border-bottom: none; }
                .header-row { background: rgba(0,0,0,0.3); font-weight: 800; color: #fff; letter-spacing: 1px; }
                .section-divider { background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; font-size: 0.8rem; font-weight: 800; color: #94a3b8; letter-spacing: 2px; }
                .col-item { font-weight: 600; color: #e2e8f0; }
                .col-val { font-family: monospace; font-size: 1.1rem; text-align: center; }
                .col-val.axel { color: #38bdf8; }
                .col-val.prisca { color: #a78bfa; }
                .col-note { font-size: 0.8rem; color: #64748b; font-style: italic; text-align: right; }
                .alert-box { margin-top: 2rem; background: rgba(248,113,113,0.2); border: 1px solid #f87171; color: #fca5a5; padding: 1rem; border-radius: 8px; display: flex; gap: 1rem; align-items: center; }
                .action-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .action-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                @media (max-width: 768px) {
                    .plan-row { grid-template-columns: 1fr 1fr; gap: 0.5rem; }
                    .col-item { grid-column: 1 / -1; margin-bottom: 0.25rem; font-size: 1rem; color: #fff; }
                    .col-note { grid-column: 1 / -1; margin-top: 0.25rem; text-align: left; opacity: 0.7; }
                    .col-val { text-align: left; padding: 0.25rem 0; }
                }
            `}</style>
        </div>
    );
};

export default SmartDiet;
