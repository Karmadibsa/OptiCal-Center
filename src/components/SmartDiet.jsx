import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Settings,
    Activity,
    Utensils,
    AlertTriangle,
    Download,
} from 'lucide-react';
import {
    PAL_OPTIONS,
    calculatePlan,
    LIP_MIN_RATIO,
    OMEGA3_ZENEMENT,
} from '../utils/dietAlgo';

// ─────────────────────────────────────────────────────────────────────────────
// InfoTooltip : icône ⓘ avec tooltip au survol (recommandations OMS / ACSM)
// Déclaré hors du composant principal pour éviter les re-créations.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// InfoTooltip — positionnement adaptatif (gauche / centre / droite) pour
// rester visible sur mobile sans déborder de l'écran.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// InfoTooltip — position: fixed calculée via getBoundingClientRect()
// Échappe les overflow:hidden et stacking contexts de la config-card.
// ─────────────────────────────────────────────────────────────────────────────
const InfoTooltip = ({ text }) => {
    const [show,  setShow]  = useState(false);
    const [rect,  setRect]  = useState(null);
    const btnRef   = useRef(null);
    const timerRef = useRef(null);

    const computeRect = () => {
        if (!btnRef.current) return;
        setRect(btnRef.current.getBoundingClientRect());
    };

    const open  = () => { clearTimeout(timerRef.current); computeRect(); setShow(true);  };
    const close = () => { timerRef.current = setTimeout(() => setShow(false), 150); };

    // Calcul de la position fixed du tooltip à partir du rect du bouton
    const getStyle = () => {
        if (!rect) return { display: 'none' };
        const width  = Math.min(240, window.innerWidth * 0.82);
        const top    = rect.top - 10;   // juste au-dessus du bouton
        const vw     = window.innerWidth;

        // Alignement horizontal : centre, gauche ou droite selon la position du bouton
        let left;
        const center = rect.left + rect.width / 2;
        if (center - width / 2 < 8)            left = 8;
        else if (center + width / 2 > vw - 8)  left = vw - width - 8;
        else                                    left = center - width / 2;

        // Position de la flèche (relative au bord gauche du tooltip)
        const arrowLeft = Math.max(8, Math.min(center - left - 6, width - 20));

        return { bubbleStyle: { left, top, width }, arrowLeft };
    };

    const { bubbleStyle, arrowLeft } = getStyle() || {};

    return (
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginLeft: '0.2rem' }}>
            <button
                ref={btnRef}
                onMouseEnter={open}
                onMouseLeave={close}
                onFocus={open}
                onBlur={close}
                onClick={e => { e.preventDefault(); computeRect(); setShow(s => !s); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.1rem', color: '#4f6374', fontSize: '0.8rem', lineHeight: 1 }}
                aria-label="Recommandations"
                tabIndex={-1}
            >ⓘ</button>
            {show && bubbleStyle && createPortal(
                <div style={{
                    position: 'fixed',
                    top:  bubbleStyle.top,
                    left: bubbleStyle.left,
                    width: bubbleStyle.width,
                    transform: 'translateY(-100%)',
                    background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
                    padding: '0.65rem 0.8rem',
                    fontSize: '0.74rem', color: '#cbd5e1', lineHeight: 1.6,
                    zIndex: 9999, boxShadow: '0 8px 28px rgba(0,0,0,0.75)',
                    whiteSpace: 'normal', pointerEvents: 'none',
                }}>
                    {text}
                    <span style={{
                        position: 'absolute', top: '100%', left: arrowLeft,
                        borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
                        borderTop: '6px solid #334155',
                    }} />
                </div>,
                document.body
            )}
        </span>
    );
};


// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const SmartDiet = ({ profiles, setProfiles }) => {

    const [activeTab,       setActiveTab]       = useState('axel');
    const [showLegacyPlan,  setShowLegacyPlan]  = useState(false);

    const resAxel = calculatePlan('axel', profiles);
    const resPrisca = calculatePlan('prisca', profiles);

    // --- HANDLERS ---
    // Champs numériques : weight, height, age, deficit, opt_fromage, prot_ratio
    // Champs string : gender
    const NUMERIC_FIELDS = new Set(['weight', 'form_weight', 'height', 'age', 'deficit', 'opt_fromage', 'prot_ratio', 'lip_ratio', 'glu_target']);

    const handleInput = (key, field, val) => {
        setProfiles(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                // Pour les champs numériques : accepter '' (saisie en cours) ou parser
                // Pour les autres (goal, booléens…) : stocker la valeur brute directement
                [field]: NUMERIC_FIELDS.has(field)
                    ? (val === '' ? '' : (parseFloat(val) || 0))
                    : val
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
            ['Config', 'Profile', 'Opt_Fromage', profiles.axel.opt_fromage, profiles.prisca.opt_fromage, 'System Config'],
            ['Config', 'Profile', 'Opt_Fb_Soir', profiles.axel.opt_fb_soir || false, profiles.prisca.opt_fb_soir || false, 'System Config'],
            ['Config', 'Sport', 'PAL',
                profiles.axel.pal || 1.375,
                profiles.prisca.pal || 1.375,
                'Niveau d\'activité (Physical Activity Level)'
            ]
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
            ['Diet', 'Soir', 'Option Fromage', profiles.axel.opt_fromage > 0 ? `${profiles.axel.opt_fromage}g` : "-", profiles.prisca.opt_fromage > 0 ? `${profiles.prisca.opt_fromage}g` : "-", 'Extra variable'],
            ['Diet', 'Soir', 'Fromage Blanc 0%', resAxel.fb_qty > 0 ? `${resAxel.fb_qty}g` : "-", resPrisca.fb_qty > 0 ? `${resPrisca.fb_qty}g` : "-", 'Compensation prot. soir'],
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

    // Styles pour la liste verticale de checkboxes
    const S_cb = {
        row:   { display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.3rem 0', userSelect: 'none' },
        input: { flexShrink: 0, transform: 'scale(1.15)', accentColor: activeTab === 'axel' ? '#38bdf8' : '#a78bfa' },
        label: { fontSize: '0.88rem', color: '#cbd5e1' },
    };

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
                    const fromageId = `profile-${key}-fromage`;

                    return (
                        <div key={key} style={{ display: activeTab === key ? 'block' : 'none' }}>
                            <div className="inputs-grid">
                                <div className="input-group">
                                    <label htmlFor={weightId}>
                                        Poids actuel <span className="unit-badge">kg</span>
                                        <InfoTooltip text="Poids réel utilisé pour le calcul BMR/TDEE et les calories sport." />
                                    </label>
                                    <input
                                        id={weightId}
                                        type="number"
                                        value={profiles[key].weight === 0 ? '' : profiles[key].weight}
                                        placeholder="0"
                                        onChange={(e) => handleInput(key, 'weight', e.target.value)}
                                    />
                                </div>
                                <div className="input-group">
                                    <label htmlFor={`profile-${key}-fw`}>
                                        Poids de forme <span className="unit-badge">kg</span>
                                        <InfoTooltip text="Poids cible (masse musculaire visée) utilisé pour calculer les objectifs protéines et lipides. Recommandation diéto : Axel 95 kg, Prisca 62 kg." />
                                    </label>
                                    <input
                                        id={`profile-${key}-fw`}
                                        type="number"
                                        value={(profiles[key].form_weight || 0) === 0 ? '' : profiles[key].form_weight}
                                        placeholder={profiles[key].weight}
                                        onChange={(e) => handleInput(key, 'form_weight', e.target.value)}
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
                                {/* Protéines cible */}
                                <div className="input-group">
                                    <label htmlFor={`profile-${key}-prot`}>
                                        Protéines cible
                                        <span className="unit-badge">g/kg</span>
                                        <InfoTooltip text="ACSM : 1.2–2.0 g/kg pour sportifs actifs. Optimum prise de masse : 1.6–2.2 g/kg (méta-analyses 2017). OMS minimum : 0.8 g/kg pour sédentaires. Au-delà de 2.2 g/kg, bénéfice marginal." />
                                    </label>
                                    <input
                                        id={`profile-${key}-prot`}
                                        type="number"
                                        min="0.5"
                                        max="3"
                                        step="0.1"
                                        value={profiles[key].prot_ratio === 0 ? '' : profiles[key].prot_ratio}
                                        placeholder="1.6"
                                        onChange={(e) => handleInput(key, 'prot_ratio', e.target.value)}
                                    />
                                </div>
                                {/* Lipides cible */}
                                <div className="input-group">
                                    <label htmlFor={`profile-${key}-lip`}>
                                        Lipides cible
                                        <span className="unit-badge">g/kg</span>
                                        <InfoTooltip text="OMS : 20–35% des kcal. Minimum santé hormonale : ~0.8 g/kg. Cible sportif : 0.9–1.0 g/kg. ⚠️ < 0.8 g/kg = risque hormonal. Qualité : privilégier huile de colza, noix, maquereau / sardine / hareng (Oméga-3 DHA/EPA)." />
                                    </label>
                                    <input
                                        id={`profile-${key}-lip`}
                                        type="number"
                                        min="0.3"
                                        max="2"
                                        step="0.05"
                                        value={profiles[key].lip_ratio === 0 ? '' : (profiles[key].lip_ratio ?? 0.9)}
                                        placeholder="0.9"
                                        onChange={(e) => handleInput(key, 'lip_ratio', e.target.value)}
                                    />
                                </div>
                                {/* Glucides cible — éditable + bouton Ajuster selon Kcal */}
                                <div className="input-group">
                                    <label htmlFor={`profile-${key}-glu`}>
                                        Glucides cible
                                        <span className="unit-badge">g/j</span>
                                        <InfoTooltip text="OMS : 45–65% des kcal. Par défaut : résiduel calorique (kcal − P×4 − L×9) ÷ 4. Vous pouvez fixer une valeur manuelle ou cliquer 'Ajuster' pour recalculer depuis la cible kcal. ⚠️ Orange si < 65%. 🚨 Rouge si < 80%." />
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'stretch' }}>
                                        <input
                                            id={`profile-${key}-glu`}
                                            type="number"
                                            min="0"
                                            step="5"
                                            value={(profiles[key].glu_target || 0) === 0 ? '' : profiles[key].glu_target}
                                            placeholder={String(res.glu_formula)}
                                            onChange={(e) => handleInput(key, 'glu_target', e.target.value)}
                                            style={{
                                                flex: 1,
                                                border: `1px solid ${res.glu_critical ? 'rgba(248,113,113,0.5)' : res.glu_warning ? 'rgba(251,191,36,0.4)' : '#334155'}`,
                                                color: res.glu_critical ? '#f87171' : res.glu_warning ? '#fbbf24' : '#a78bfa',
                                                fontFamily: 'monospace', fontWeight: 700,
                                            }}
                                        />
                                        <button
                                            onClick={() => handleInput(key, 'glu_target', res.glu_formula)}
                                            title="Calcule les glucides pour atteindre exactement la cible calorique (kcal − Prot×4 − Lip×9) ÷ 4"
                                            style={{
                                                flexShrink: 0, padding: '0 0.65rem',
                                                background: 'rgba(167,139,250,0.1)',
                                                border: '1px solid rgba(167,139,250,0.35)',
                                                borderRadius: '6px', color: '#a78bfa',
                                                cursor: 'pointer', fontSize: '0.73rem', fontWeight: 700,
                                                whiteSpace: 'nowrap', lineHeight: 1.2,
                                            }}
                                        >
                                            Ajuster<br/>selon Kcal
                                        </button>
                                    </div>
                                    {/* Feedback valeur active */}
                                    <div style={{ marginTop: '0.25rem', fontSize: '0.71rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {profiles[key].glu_target > 0
                                            ? <span style={{ color: '#a78bfa' }}>Manuel : {profiles[key].glu_target}g · Auto serait {res.glu_formula}g</span>
                                            : <span style={{ color: '#475569' }}>Auto : {res.glu_formula}g (résiduel kcal)</span>
                                        }
                                        {res.glu_critical && <span style={{ color: '#f87171', fontWeight: 700 }}>🚨 −20%</span>}
                                        {!res.glu_critical && res.glu_warning && <span style={{ color: '#fbbf24' }}>⚠️ Faible</span>}
                                    </div>
                                </div>
                                {/* Dernière pesée */}
                                <div className="input-group">
                                    <label htmlFor={`profile-${key}-weighed`}>
                                        Dernière pesée
                                        <InfoTooltip text="La diéto conseille de recalculer le plan tous les 1–3 mois. Un rappel orange s'affiche après 30 jours sans mise à jour." />
                                    </label>
                                    <input
                                        id={`profile-${key}-weighed`}
                                        type="date"
                                        value={profiles[key].last_weighed || ''}
                                        onChange={(e) => handleInput(key, 'last_weighed', e.target.value)}
                                        style={{ colorScheme: 'dark' }}
                                    />
                                    {profiles[key].last_weighed && (() => {
                                        const days = Math.floor((Date.now() - new Date(profiles[key].last_weighed).getTime()) / 86_400_000);
                                        return (
                                            <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: days > 30 ? '#fb923c' : '#64748b' }}>
                                                {days === 0 ? "Aujourd'hui" : `Il y a ${days} jour${days > 1 ? 's' : ''}`}
                                                {days > 30 && ' ⚠️'}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* ── Options (liste verticale) ── */}
                            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.2rem' }}>OPTIONS</div>

                                {/* Whey */}
                                <label style={S_cb.row}>
                                    <input type="checkbox"
                                        id={`profile-${key}-whey16h`}
                                        checked={profiles[key].opt_whey_collation !== false}
                                        onChange={(e) => handleInput(key, 'opt_whey_collation', e.target.checked)}
                                        style={S_cb.input}
                                    />
                                    <span style={S_cb.label}>Whey 16h (Collation)</span>
                                    <InfoTooltip text="Shaker de récupération à 16h. Décochez si les recettes Batch couvrent déjà l'objectif protéines — les calories économisées agrandissent les repas." />
                                </label>

                                {key === 'axel' && (
                                    <label style={S_cb.row}>
                                        <input type="checkbox"
                                            id="profile-axel-whey-matin"
                                            checked={profiles[key].opt_whey_matin !== false}
                                            onChange={(e) => handleInput(key, 'opt_whey_matin', e.target.checked)}
                                            style={S_cb.input}
                                        />
                                        <span style={S_cb.label}>Whey Matin (Axel)</span>
                                        <InfoTooltip text="Shaker du matin. À désactiver si les repas + Whey 16h couvrent déjà l'objectif protéines." />
                                    </label>
                                )}

                                <label style={S_cb.row}>
                                    <input type="checkbox"
                                        id={`profile-${key}-fb`}
                                        checked={profiles[key].opt_fb_soir || false}
                                        onChange={(e) => handleInput(key, 'opt_fb_soir', e.target.checked)}
                                        style={S_cb.input}
                                    />
                                    <span style={S_cb.label}>Fromage Blanc 0% le soir</span>
                                </label>

                                {/* Oméga-3 Zenement — toggle inline par personne */}
                                <label style={S_cb.row}>
                                    <input type="checkbox"
                                        id={`profile-${key}-omega3`}
                                        checked={profiles[key].opt_omega3 !== false}
                                        onChange={(e) => handleInput(key, 'opt_omega3', e.target.checked)}
                                        style={S_cb.input}
                                    />
                                    <span style={S_cb.label}>🐟 Oméga-3 Zenement</span>
                                    <InfoTooltip text={`${OMEGA3_ZENEMENT.brand} — ${OMEGA3_ZENEMENT.gel_per_dose} gélules/soir pendant le dîner. ${OMEGA3_ZENEMENT.epa_mg} mg EPA + ${OMEGA3_ZENEMENT.dha_mg} mg DHA = ${OMEGA3_ZENEMENT.total_omega3_mg} mg Oméga-3/j. Impact : +${OMEGA3_ZENEMENT.lip_per_dose} g lipides (${OMEGA3_ZENEMENT.kcal_per_dose} kcal) déjà comptabilisés — la cible lipides cuisine est réduite d'autant.`} />
                                    {profiles[key].opt_omega3 !== false && (
                                        <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 'auto', fontFamily: 'monospace' }}>
                                            −{OMEGA3_ZENEMENT.lip_per_dose}g lip
                                        </span>
                                    )}
                                </label>

                                {/* Option fromage + quantité inline */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Fromage</span>
                                    <input
                                        id={fromageId}
                                        type="number"
                                        value={profiles[key].opt_fromage === 0 ? '' : profiles[key].opt_fromage}
                                        placeholder="0"
                                        onChange={(e) => handleInput(key, 'opt_fromage', e.target.value)}
                                        style={{ width: '70px', background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', padding: '0.3rem 0.5rem', borderRadius: '6px', color: '#fff', textAlign: 'right', fontSize: '0.9rem' }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>g</span>
                                </div>
                            </div>

                            {/* ── Niveau d'activité PAL ── */}
                            <div style={{ marginTop: '1.5rem' }}>
                                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '1px', display: 'block', marginBottom: '0.6rem' }}>
                                    NIVEAU D'ACTIVITÉ
                                    <InfoTooltip text="Budget calorique stable 7j/7 (recommandation diététicienne). Le multiplicateur PAL reflète ton niveau général d'activité sur la semaine." />
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                                    {PAL_OPTIONS.map(opt => {
                                        const active = (profiles[key].pal || 1.375) === opt.value;
                                        const color  = key === 'axel' ? '#38bdf8' : '#a78bfa';
                                        return (
                                            <button key={opt.value}
                                                onClick={() => handleInput(key, 'pal', opt.value)}
                                                style={{
                                                    padding: '0.55rem 0.6rem', borderRadius: '8px', cursor: 'pointer',
                                                    textAlign: 'left', fontFamily: 'inherit',
                                                    background: active ? `${color}18` : 'rgba(0,0,0,0.2)',
                                                    border: `1px solid ${active ? color : '#334155'}`,
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: active ? color : '#94a3b8' }}>
                                                    {opt.label}
                                                    <span style={{ fontFamily: 'monospace', marginLeft: '0.35rem', color: active ? color : '#475569', fontSize: '0.78rem' }}>×{opt.value}</span>
                                                </div>
                                                <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.15rem' }}>{opt.desc}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#475569', fontFamily: 'monospace' }}>
                                    TDEE : {Math.round(res.bmr)} × {profiles[key].pal || 1.375} = <strong style={{ color: '#94a3b8' }}>{Math.round(res.tdee_final)} kcal/j</strong>
                                </div>
                            </div>

                            <div className="stats-mini">
                                <span>TDEE: {Math.round(res.tdee_final)} kcal</span>
                                <span> | </span>
                                <span>Cible: {Math.round(res.target_daily)} kcal</span>
                                <span> | </span>
                                <span style={{ color: '#38bdf8' }}>
                                    Batch Midi: {res.batch_midi_budget} kcal · Soir: {res.batch_soir_budget} kcal
                                </span>
                                <br />
                                {/* Protéines */}
                                <span style={{ color: res.prot_warning ? '#f87171' : '#4ade80' }}>
                                    Protéines: {Math.round(res.total_prot)}g / {Math.round(res.prot_goal)}g
                                    {' → '}{profiles[key].prot_ratio}g/kg × {res.goal_weight ?? profiles[key].weight}kg
                                    <span style={{ color: '#475569', fontSize: '0.8em' }}> (forme)</span>
                                    {res.prot_warning && ' ⚠️'}
                                </span>
                                <br />
                                {/* Lipides */}
                                <span style={{ color: res.lip_critical ? '#f87171' : res.lip_warning ? '#fbbf24' : '#fb923c' }}>
                                    Lipides: {res.total_lip.toFixed(1)}g / {Math.round(res.lip_goal)}g
                                    {' → '}{(profiles[key].lip_ratio ?? 0.9)}g/kg × {res.goal_weight ?? profiles[key].weight}kg
                                    {res.use_omega3 && <span style={{ color: '#64748b' }}> (dont {res.omega3_lip}g Ω3)</span>}
                                    {res.lip_critical && <span style={{ color: '#f87171' }}> 🚨 &lt;{LIP_MIN_RATIO}g/kg (plancher !)</span>}
                                    {res.lip_warning  && <span style={{ color: '#fbbf24' }}> ⚠️ sous cible</span>}
                                </span>
                                <br />
                                {/* Glucides */}
                                <span style={{ color: res.glu_critical ? '#f87171' : res.glu_warning ? '#fbbf24' : '#a78bfa' }}>
                                    Glucides: {Math.round(res.total_glu)}g / {res.glu_goal}g
                                    {' → '}ajustement calorique
                                    {res.glu_critical && ' 🚨 −20%'}
                                    {!res.glu_critical && res.glu_warning && ' ⚠️ Faible'}
                                </span>
                            </div>

                            {/* Rappel pesée > 30 jours (banner) */}
                            {(() => {
                                const lw = profiles[key].last_weighed;
                                if (!lw) return null;
                                const days = Math.floor((Date.now() - new Date(lw).getTime()) / 86_400_000);
                                if (days <= 30) return null;
                                return (
                                    <div style={{ marginTop: '0.75rem', padding: '0.55rem 0.8rem', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: '7px', fontSize: '0.8rem', color: '#fb923c' }}>
                                        ⚖️ Dernière pesée il y a <strong>{days} jours</strong> — pensez à recalculer votre plan (tous les 1–3 mois selon la diéto).
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })}
            </div>

            <button onClick={handleCopyCSV} className="action-btn"
                style={{ marginTop: '1.5rem', width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px dashed #94a3b8' }}>
                <Download size={18} /> Copier Configuration CSV
            </button>

            {/* --- TABLEAU DE RÉFÉRENCE LEGACY (collapsible) --- */}
            <div style={{ marginTop: '3rem' }}>
                <button
                    onClick={() => setShowLegacyPlan(s => !s)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'none', border: '1px solid #1e293b', borderRadius: '8px',
                        padding: '0.5rem 1rem', color: '#475569', cursor: 'pointer',
                        fontSize: '0.83rem', fontWeight: 600, width: '100%',
                    }}
                >
                    <Utensils size={14} />
                    Plan Alimentaire — Référence Pâtes/PST (ancien système)
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#334155' }}>
                        {showLegacyPlan ? '▲ Masquer' : '▼ Afficher'}
                    </span>
                </button>

                {showLegacyPlan && (
                    <>
                        <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.9rem', background: 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: '7px', fontSize: '0.78rem', color: '#fb923c' }}>
                            ⚠️ Ce tableau utilise l'<strong>ancien système Pâtes+PST</strong>. Pour la variété recommandée par la diéto, utilisez l'onglet <strong>Batch Cooking</strong> qui calcule automatiquement les bonnes quantités.
                        </div>

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
                <PlanRow label="Fromage" axelVal={profiles.axel.opt_fromage > 0 ? `${profiles.axel.opt_fromage}g` : "-"} priscaVal={profiles.prisca.opt_fromage > 0 ? `${profiles.prisca.opt_fromage}g` : "-"} note="Extra variable" />
                <PlanRow
                    label="Fromage Blanc 0%"
                    axelVal={resAxel.fb_qty > 0 ? `${resAxel.fb_qty}g` : "-"}
                    priscaVal={resPrisca.fb_qty > 0 ? `${resPrisca.fb_qty}g` : "-"}
                    note="Compensation prot. soir"
                />
            </div>
                    </>
                )}
            </div>{/* fin bloc legacy */}

            {(resAxel.prot_warning || resPrisca.prot_warning) && (
                <div className="alert-box">
                    <AlertTriangle size={24} />
                    <div>
                        {resAxel.prot_warning && (
                            <div>
                                <strong>Axel :</strong> {Math.round(resAxel.total_prot)}g / {Math.round(resAxel.prot_goal)}g
                                {' — '}déficit de <strong style={{ color: '#fca5a5' }}>{Math.round(resAxel.prot_goal - resAxel.total_prot)}g</strong> de protéines.
                            </div>
                        )}
                        {resPrisca.prot_warning && (
                            <div>
                                <strong>Prisca :</strong> {Math.round(resPrisca.total_prot)}g / {Math.round(resPrisca.prot_goal)}g
                                {' — '}déficit de <strong style={{ color: '#fca5a5' }}>{Math.round(resPrisca.prot_goal - resPrisca.total_prot)}g</strong> de protéines.
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                            <p style={{ color: '#fbbf24' }}>PAL ×{profiles[key].pal} → TDEE {Math.round(res.tdee_final)} kcal</p>
                            <p style={{ color: '#94a3b8', paddingLeft: '0.75rem' }}>↳ {PAL_OPTIONS.find(o => o.value === profiles[key].pal)?.label || '?'} — {PAL_OPTIONS.find(o => o.value === profiles[key].pal)?.desc || ''}</p>
                            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                            <p><strong>TDEE Final: {Math.round(res.tdee_final)} kcal</strong></p>
                            <p>Cible (-{profiles[key].deficit}): {Math.round(res.target_daily)} kcal</p>
                            <br />
                            <p>Socle Fixe (sans PST): -{Math.round(res.fixed_cal - res.pst_qty * 3.3)} kcal</p>
                            <p>PST: {res.pst_qty}g → -{Math.round(res.pst_qty * 3.3)} kcal | +{Math.round(res.pst_qty * 0.5)}g prot</p>
                            {res.fb_qty > 0 && <p style={{ color: '#a78bfa' }}>FB 0%: {res.fb_qty}g → +{Math.round(res.fb_qty * 0.08)}g prot | -{Math.round(res.fb_qty * 0.48)} kcal/pâtes</p>}
                            <p>Reste pour Pâtes: {Math.round(res.remaining_cal - res.pst_qty * 3.3)} kcal</p>
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
