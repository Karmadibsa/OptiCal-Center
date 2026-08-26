import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Settings,
    Download,
} from 'lucide-react';
import {
    PAL_OPTIONS,
    calculatePlan,
    getSocleItems,
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
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.6rem 0.5rem', margin: '-0.6rem -0.3rem', color: '#4f6374', fontSize: '0.95rem', lineHeight: 1 }}
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

    const resAxel = calculatePlan('axel', profiles);
    const resPrisca = calculatePlan('prisca', profiles);

    // --- HANDLERS ---
    // Champs numériques : weight, height, age, deficit, opt_fromage, prot_ratio
    // Champs string : gender
    const NUMERIC_FIELDS = new Set(['weight', 'form_weight', 'height', 'age', 'deficit', 'opt_fromage', 'prot_ratio', 'lip_ratio', 'glu_target',
        'pain_matin_g', 'cancoillotte_g', 'skyr_g', 'oeuf_matin', 'oeuf_soir', 'banane_qty', 'pomme_qty', 'glu_pct']);

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
            ['Config', 'Profile', 'Pain_Matin_G',   resAxel.pain_g,     resPrisca.pain_g,     'Petit-déj (g pain)'],
            ['Config', 'Profile', 'Cancoillotte_G', resAxel.canc_g,     resPrisca.canc_g,     'Petit-déj (g cancoillotte)'],
            ['Config', 'Profile', 'Skyr_G',         resAxel.skyr_g,     resPrisca.skyr_g,     'Petit-déj (g skyr/fromage blanc)'],
            ['Config', 'Profile', 'Oeuf_Matin',     resAxel.oeuf_matin, resPrisca.oeuf_matin, 'Œufs le matin'],
            ['Config', 'Profile', 'Oeuf_Soir',      resAxel.oeuf_soir,  resPrisca.oeuf_soir,  'Œufs le soir'],
            ['Config', 'Profile', 'Banane_Qty',     resAxel.banane_qty, resPrisca.banane_qty, 'Bananes / jour'],
            ['Config', 'Profile', 'Pomme_Qty',      resAxel.pomme_qty,  resPrisca.pomme_qty,  'Pommes / jour'],            ['Config', 'Sport', 'PAL',
                profiles.axel.pal || 1.375,
                profiles.prisca.pal || 1.375,
                'Niveau d\'activité (Physical Activity Level)'
            ]
        ];

        // Lignes informatives : reflètent le plan réel (socle + repas batch).
        // Aucune n'est relue par le code — seules les lignes "Config" le sont.
        const fmtPetitDej = (res) => [
            `${res.pain_g}g Pain`,
            res.canc_g > 0 ? `${res.canc_g}g Canc.` : null,
            res.skyr_g > 0 ? `${res.skyr_g}g Skyr` : null,
            res.oeuf_matin > 0 ? `${res.oeuf_matin} Œufs` : null,
        ].filter(Boolean).join(' + ');
        const fmtFruits = (res) => [
            res.banane_qty > 0 ? `${res.banane_qty} Banane` : null,
            res.pomme_qty  > 0 ? `${res.pomme_qty} Pomme`  : null,
        ].filter(Boolean).join(' + ') || '-';

        const dataRows = [
            ['Diet', 'Matin', 'Petit-déjeuner', fmtPetitDej(resAxel), fmtPetitDej(resPrisca), 'Socle fixe'],
            ['Diet', 'Matin', 'Whey', resAxel.use_whey_matin ? '1 Shaker' : '-', resPrisca.use_whey_matin ? '1 Shaker' : '-', ''],

            ['Diet', 'Midi', 'Repas Batch', `${resAxel.batch_midi_budget} kcal`, `${resPrisca.batch_midi_budget} kcal`, 'Recette de la semaine (55% du budget repas)'],

            ['Diet', '16H00', 'Fruits', fmtFruits(resAxel), fmtFruits(resPrisca), 'Glucides'],
            ['Diet', '16H00', 'Whey', resAxel.use_whey_collation ? '1 Shaker' : '-', resPrisca.use_whey_collation ? '1 Shaker' : '-', 'Récupération'],

            ['Diet', 'Soir', 'Repas Batch', `${resAxel.batch_soir_budget} kcal`, `${resPrisca.batch_soir_budget} kcal`, 'Recette de la semaine (45% du budget repas)'],
            ['Diet', 'Soir', 'Œufs', resAxel.oeuf_soir > 0 ? `${resAxel.oeuf_soir}` : '-', resPrisca.oeuf_soir > 0 ? `${resPrisca.oeuf_soir}` : '-', ''],
            ['Diet', 'Soir', 'Option Fromage', profiles.axel.opt_fromage > 0 ? `${profiles.axel.opt_fromage}g` : '-', profiles.prisca.opt_fromage > 0 ? `${profiles.prisca.opt_fromage}g` : '-', 'Extra variable'],

            ['Diet', 'Total', 'Cible / jour', `${Math.round(resAxel.target_daily)} kcal`, `${Math.round(resPrisca.target_daily)} kcal`, 'Socle + repas batch'],
        ];

        const rows = [header, ...configRows, ...dataRows];
        return rows.map(row => row.map(escapeCSV).join(',')).join('\n');
    };

    const handleCopyCSV = () => {
        navigator.clipboard.writeText(generateCSV()).then(() => {
            alert("CSV copié ! Collez-le dans public/diet.csv pour sauvegarder la configuration.");
        });
    };

    // Styles pour la liste verticale de checkboxes
    const S_cb = {
        row:   { display: 'flex', alignItems: 'center', gap: '0.7rem', cursor: 'pointer', padding: '0.5rem 0', minHeight: '44px', userSelect: 'none' },
        input: { flexShrink: 0, width: '22px', height: '22px', accentColor: activeTab === 'axel' ? '#38bdf8' : '#a78bfa' },
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
                                    <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#4ade80', fontFamily: 'monospace' }}>
                                        → <strong>{Math.round(res.prot_goal)} g/jour</strong> <span style={{ color: '#475569' }}>({res.goal_weight || profiles[key].weight}kg forme)</span>
                                    </div>
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
                                    <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#fb923c', fontFamily: 'monospace' }}>
                                        → <strong>{Math.round(res.lip_goal)} g/jour</strong> <span style={{ color: '#475569' }}>({res.goal_weight || profiles[key].weight}kg forme)</span>
                                    </div>
                                </div>
                                {/* Glucides cible — en g OU en % des kcal */}
                                <div className="input-group">
                                    <label htmlFor={`profile-${key}-glu`}>
                                        Glucides cible
                                        <span className="unit-badge">g ou %</span>
                                        <InfoTooltip text="OMS : 45–65% des kcal. 3 modes : Auto (résiduel kcal), en grammes, ou en % des kcal (ex. 50%). Le % est prioritaire s'il est renseigné. ⚠️ Orange si < 65% de la cible, 🚨 rouge si < 80%." />
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
                                        {/* Champ grammes */}
                                        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.2rem', flex: '1 1 90px' }}>
                                            <input
                                                id={`profile-${key}-glu`}
                                                type="number" min="0" step="5"
                                                value={(profiles[key].glu_target || 0) === 0 ? '' : profiles[key].glu_target}
                                                placeholder={String(res.glu_formula)}
                                                onChange={(e) => { handleInput(key, 'glu_target', e.target.value); handleInput(key, 'glu_pct', 0); }}
                                                style={{ width: '100%', border: `1px solid ${res.glu_pct > 0 ? '#1e293b' : '#334155'}`, color: res.glu_pct > 0 ? '#475569' : '#a78bfa', fontFamily: 'monospace', fontWeight: 700 }}
                                            />
                                            <span style={{ alignSelf: 'center', fontSize: '0.72rem', color: '#64748b' }}>g</span>
                                        </div>
                                        {/* Champ pourcentage */}
                                        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.2rem', flex: '1 1 70px' }}>
                                            <input
                                                type="number" min="0" max="100" step="1"
                                                value={(profiles[key].glu_pct || 0) === 0 ? '' : profiles[key].glu_pct}
                                                placeholder="%"
                                                onChange={(e) => { handleInput(key, 'glu_pct', e.target.value); handleInput(key, 'glu_target', 0); }}
                                                style={{ width: '100%', border: `1px solid ${res.glu_pct > 0 ? '#38bdf8' : '#334155'}`, color: res.glu_pct > 0 ? '#38bdf8' : '#64748b', fontFamily: 'monospace', fontWeight: 700 }}
                                            />
                                            <span style={{ alignSelf: 'center', fontSize: '0.72rem', color: '#64748b' }}>%</span>
                                        </div>
                                        <button
                                            onClick={() => { handleInput(key, 'glu_target', res.glu_formula); handleInput(key, 'glu_pct', 0); }}
                                            title="Calcule les glucides résiduels (kcal − Prot×4 − Lip×9) ÷ 4"
                                            style={{ flexShrink: 0, padding: '0 0.9rem', minHeight: '44px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '6px', color: '#a78bfa', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', lineHeight: 1.2 }}
                                        >
                                            Auto
                                        </button>
                                    </div>
                                    {/* Feedback valeur active */}
                                    <div style={{ marginTop: '0.25rem', fontSize: '0.71rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {res.glu_pct > 0
                                            ? <span style={{ color: '#38bdf8' }}>Mode % : {res.glu_pct}% des kcal = <strong>{res.glu_goal}g</strong></span>
                                            : profiles[key].glu_target > 0
                                                ? <span style={{ color: '#a78bfa' }}>Manuel : {profiles[key].glu_target}g · Auto serait {res.glu_formula}g</span>
                                                : <span style={{ color: '#475569' }}>Auto : {res.glu_formula}g (résiduel kcal)</span>
                                        }
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
                                        style={{ width: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', padding: '0.5rem', borderRadius: '6px', color: '#fff', textAlign: 'right', fontSize: '16px', minHeight: '44px' }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>g</span>
                                </div>
                            </div>

                            {/* ── Petit-déjeuner / collation (ajustable) ── */}
                            <div style={{ marginTop: '1.5rem' }}>
                                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '1px', display: 'block', marginBottom: '0.6rem' }}>
                                    PETIT-DÉJEUNER / COLLATION
                                    <InfoTooltip text="Ajuste ce que tu manges hors recettes batch. Tout se répercute sur le socle fixe, la feuille FatSecret et la taille des plats batch (moins de petit-déj = plats plus gros, et inversement)." />
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.7rem' }}>
                                    {[
                                        { field: 'pain_matin_g',   label: 'Pain (matin)',      unit: 'g',  step: 5 },
                                        { field: 'cancoillotte_g', label: 'Cancoillotte',      unit: 'g',  step: 5 },
                                        { field: 'skyr_g',         label: 'Skyr / from. blanc',unit: 'g',  step: 10 },
                                        { field: 'oeuf_matin',     label: 'Œufs matin',        unit: 'nb', step: 1 },
                                        { field: 'oeuf_soir',      label: 'Œufs soir',         unit: 'nb', step: 1 },
                                        { field: 'banane_qty',     label: 'Bananes / jour',    unit: 'nb', step: 1 },
                                        { field: 'pomme_qty',      label: 'Pommes / jour',     unit: 'nb', step: 1 },
                                    ].map(({ field, label, unit, step }) => (
                                        <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{label} <span style={{ fontSize: '0.65rem', color: '#64748b' }}>({unit})</span></span>
                                            <input
                                                type="number" min="0" step={step}
                                                value={profiles[key][field] === '' || profiles[key][field] === undefined ? '' : profiles[key][field]}
                                                placeholder="0"
                                                onChange={(e) => handleInput(key, field, e.target.value)}
                                                style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', padding: '0.6rem 0.5rem', borderRadius: '6px', color: '#fff', textAlign: 'right', fontSize: '16px', fontFamily: 'monospace', minHeight: '44px' }}
                                            />
                                        </div>
                                    ))}
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

                            {(() => {
                                // Modèle actuel : on affiche l'objectif, ce que le socle apporte déjà,
                                // et ce qu'il reste aux recettes batch à couvrir.
                                const socle = getSocleItems(key, profiles).total;
                                const reste = (goal, s) => Math.max(0, Math.round(goal - s));
                                return (
                            <div className="stats-mini">
                                <span>TDEE: {Math.round(res.tdee_final)} kcal</span>
                                <span> | </span>
                                <span>Cible: {Math.round(res.target_daily)} kcal</span>
                                <span> | </span>
                                <span style={{ color: '#38bdf8' }}>
                                    Batch Midi: {res.batch_midi_budget} kcal · Soir: {res.batch_soir_budget} kcal
                                </span>
                                <br />
                                <span style={{ color: '#64748b', fontSize: '0.85em' }}>
                                    Socle fixe : {socle.kcal} kcal · {socle.prot}g P · {socle.lip}g L · {socle.glu}g G
                                </span>
                                <br />
                                {/* Protéines */}
                                <span style={{ color: '#4ade80' }}>
                                    Protéines: objectif {Math.round(res.prot_goal)}g
                                    {' → '}{profiles[key].prot_ratio}g/kg × {res.goal_weight ?? profiles[key].weight}kg
                                    <span style={{ color: '#475569', fontSize: '0.8em' }}> (forme)</span>
                                    <span style={{ color: '#94a3b8' }}> · socle {socle.prot}g · reste {reste(res.prot_goal, socle.prot)}g aux recettes</span>
                                </span>
                                <br />
                                {/* Lipides */}
                                <span style={{ color: res.lip_critical ? '#f87171' : '#fb923c' }}>
                                    Lipides: objectif {Math.round(res.lip_goal)}g
                                    {' → '}{(profiles[key].lip_ratio ?? 0.9)}g/kg × {res.goal_weight ?? profiles[key].weight}kg
                                    {res.use_omega3 && <span style={{ color: '#64748b' }}> (dont {res.omega3_lip}g Ω3)</span>}
                                    <span style={{ color: '#94a3b8' }}> · socle {socle.lip}g · reste {reste(res.lip_goal, socle.lip)}g</span>
                                    {(profiles[key].lip_ratio ?? 0.9) < LIP_MIN_RATIO && <span style={{ color: '#f87171' }}> 🚨 cible &lt;{LIP_MIN_RATIO}g/kg (plancher !)</span>}
                                </span>
                                <br />
                                {/* Glucides */}
                                <span style={{ color: '#a78bfa' }}>
                                    Glucides: objectif {res.glu_goal}g
                                    {res.glu_pct > 0 ? ` (${res.glu_pct}% des kcal)` : ' (résiduel calorique)'}
                                    <span style={{ color: '#94a3b8' }}> · socle {socle.glu}g · reste {reste(res.glu_goal, socle.glu)}g</span>
                                </span>
                            </div>
                                );
                            })()}

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

            <style>{`
                .section-title { font-size: 1.5rem; margin-bottom: 1.5rem; display: flex; align-items: center; color: #fff; }

                .tabs { display: flex; gap: 1rem; margin-bottom: 1rem; }
                .tab-btn { padding: 0.5rem 2rem; border: 1px solid #334155; background: transparent; color: #64748b; border-radius: 8px; cursor: pointer; font-weight: 600; }
                .tab-btn.active.axel { background: rgba(14,165,233,0.2); border-color: #0ea5e9; color: #38bdf8; }
                .tab-btn.active.prisca { background: rgba(139,92,246,0.2); border-color: #8b5cf6; color: #a78bfa; }
                .inputs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem; }
                .input-group label { display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.5rem; }
                .input-group input[type="number"],
                .input-group input[type="date"] { width: 100%; background: rgba(0,0,0,0.2); border: 1px solid #334155; padding: 0.6rem 0.5rem; border-radius: 6px; color: #fff;
                    min-height: 44px; font-size: 16px; }  /* 16px : évite le zoom auto iOS au focus */
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
