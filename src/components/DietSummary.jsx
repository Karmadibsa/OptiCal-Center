import React from 'react';
import { calculatePlan, PAL_OPTIONS, getSocleItems } from '../utils/dietAlgo';
import {
    Printer, FlaskConical, Target, BookOpen,
    Pill, Dumbbell, Info
} from 'lucide-react';

// ─── Helper ──────────────────────────────────────────────────────────────────
const r = (n, d = 0) => {
    const f = Math.pow(10, d);
    return Math.round((n || 0) * f) / f;
};

// ─── Sous-composant : tableau socle par personne ──────────────────────────────
// Reflète le modèle ACTUEL : socle fixe (getSocleItems) + budget des repas batch
// = cible calorique. Les anciennes lignes Pâtes Protein+ / PST / Fromage blanc
// ont été retirées : elles décrivaient la diète d'avant le batch cooking.
const SocleTable = ({ planKey, plan, profiles }) => {
    const isAxel = planKey === 'axel';
    const accent = isAxel ? '#38bdf8' : '#818cf8';

    // Socle fixe = exactement ce qui est mangé hors recettes (source unique)
    const { items, total } = getSocleItems(planKey, profiles);

    const batchMidi = plan.batch_midi_budget || 0;
    const batchSoir = plan.batch_soir_budget || 0;
    const batchKcal = batchMidi + batchSoir;

    // Ce que les recettes doivent apporter pour atteindre les objectifs macros
    const needProt = Math.max(0, r(plan.prot_goal - total.prot, 1));
    const needLip  = Math.max(0, r(plan.lip_goal  - total.lip,  1));
    const needGlu  = Math.max(0, r((plan.glu_goal || 0) - total.glu, 1));

    const grandTotal = {
        kcal: r(total.kcal + batchKcal),
        prot: r(plan.prot_goal, 1),
        lip:  r(plan.lip_goal, 1),
        glu:  r(plan.glu_goal || 0, 1),
    };

    const pct = {
        prot: grandTotal.kcal > 0 ? r(((grandTotal.prot * 4) / grandTotal.kcal) * 100) : 0,
        lip:  grandTotal.kcal > 0 ? r(((grandTotal.lip  * 9) / grandTotal.kcal) * 100) : 0,
        glu:  grandTotal.kcal > 0 ? r(((grandTotal.glu  * 4) / grandTotal.kcal) * 100) : 0,
    };

    return (
        <div className="ds-table-wrap">
            <div className="ds-table-head" style={{ color: accent }}>
                <span>{isAxel ? '🔵 Axel' : '🟣 Prisca'}</span>
                <span className="ds-table-kcal">{r(plan.target_daily)} kcal cible</span>
            </div>
            <div className="ds-table-scroll">
                <table className="diet-table">
                    <thead>
                        <tr>
                            <th>Aliment</th>
                            <th>Quantité</th>
                            <th>Kcal</th>
                            <th>Prot (g)</th>
                            <th>Lip (g)</th>
                            <th>Glu (g)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((row, i) => (
                            <tr key={i}>
                                <td className="ds-td-name">
                                    <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{row.moment} · </span>
                                    {row.name}
                                </td>
                                <td className="ds-td-detail">{row.detail}</td>
                                <td><span className="ds-val">{r(row.kcal)}</span></td>
                                <td><span className="ds-val ds-prot">{r(row.prot, 1)}</span></td>
                                <td><span className="ds-val ds-lip">{r(row.lip, 1)}</span></td>
                                <td><span className="ds-val ds-glu">{r(row.glu, 1)}</span></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="ds-tfoot-sub">
                            <td colSpan="2">Sous-total Socle Fixe</td>
                            <td>{r(total.kcal)}</td>
                            <td className="ds-prot">{r(total.prot, 1)}</td>
                            <td className="ds-lip">{r(total.lip, 1)}</td>
                            <td className="ds-glu">{r(total.glu, 1)}</td>
                        </tr>
                        <tr className="ds-tfoot-var">
                            <td colSpan="2">
                                + Repas Batch (midi {batchMidi} + soir {batchSoir} kcal)
                                <span style={{ color: '#64748b', fontSize: '0.75rem' }}> — à couvrir par les recettes</span>
                            </td>
                            <td>{r(batchKcal)}</td>
                            <td className="ds-prot">{needProt}</td>
                            <td className="ds-lip">{needLip}</td>
                            <td className="ds-glu">{needGlu}</td>
                        </tr>
                        <tr className="ds-tfoot-total">
                            <td colSpan="2">TOTAL / JOUR = CIBLE</td>
                            <td>{grandTotal.kcal}</td>
                            <td className="ds-prot">{grandTotal.prot} <span style={{fontSize:'0.75rem', opacity:0.7}}>({pct.prot}%)</span></td>
                            <td className="ds-lip">{grandTotal.lip} <span style={{fontSize:'0.75rem', opacity:0.7}}>({pct.lip}%)</span></td>
                            <td className="ds-glu">{grandTotal.glu} <span style={{fontSize:'0.75rem', opacity:0.7}}>({pct.glu}%)</span></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

// ─── Composant principal ──────────────────────────────────────────────────────
const DietSummary = ({ profiles, data = [] }) => {
    const planAxel   = calculatePlan('axel',   profiles);
    const planPrisca = calculatePlan('prisca', profiles);
    const suppRows   = data.filter(row => row.Type === 'Supplement');

    const persons = [
        { key: 'axel',   label: 'Axel',   plan: planAxel,   color: '#38bdf8', glow: 'rgba(56,189,248,0.1)' },
        { key: 'prisca', label: 'Prisca', plan: planPrisca, color: '#818cf8', glow: 'rgba(129,140,248,0.1)' },
    ];

    return (
        <div className="section-container animate-fade-in ds-page" id="diet-summary-page">

            {/* ── En-tête ── */}
            <div className="ds-header">
                <div>
                    <h2><BookOpen size={26} /> Récapitulatif Diététique</h2>
                    <p className="ds-subtitle">Document de suivi — généré dynamiquement depuis vos profils actuels</p>
                </div>
                <button className="btn ds-print-btn no-print" id="btn-print-pdf" onClick={() => window.print()}>
                    <Printer size={17} /> Imprimer en PDF
                </button>
            </div>

            {/* ─────────────── SECTION 1 : Formules ─────────────── */}
            <section className="ds-section">
                <h3 className="ds-section-title"><FlaskConical size={19} /> Méthode de Calcul</h3>

                <div className="ds-formula-box">
                    <p className="ds-formula-label">Formule BMR — Mifflin-St Jeor (1990)</p>
                    <code className="ds-formula">BMR = (10 × Poids<sub>kg</sub>) + (6.25 × Taille<sub>cm</sub>) − (5 × Âge) + S</code>
                    <p className="ds-formula-note">S = <strong>+5</strong> (homme) &nbsp;|&nbsp; <strong>−161</strong> (femme)</p>
                    <code className="ds-formula">TDEE = BMR × PAL <span className="ds-formula-comment">(niveau d'activité, budget stable 7j/7)</span></code>
                    <code className="ds-formula">Cible / jour = TDEE − Déficit</code>
                    <code className="ds-formula">Budget Repas Batch = Cible − Socle Fixe &nbsp;<span className="ds-formula-comment">(midi 55% · soir 45%)</span></code>
                </div>

                {/* Valeurs calculées */}
                <div className="ds-calc-grid">
                    {persons.map(({ key, label, plan, color }) => (
                        <div key={key} className="ds-calc-card" style={{ borderColor: `${color}33` }}>
                            <div className="ds-calc-name" style={{ color }}>{label}</div>
                            {[
                                { label: 'Poids',           val: `${profiles[key].weight} kg` },
                                { label: 'Taille',          val: `${profiles[key].height} cm` },
                                { label: 'Âge (calculé)',   val: `${plan.computed_age} ans`, accent: color },
                                { label: 'BMR (repos)',      val: `${r(plan.bmr)} kcal`, accent: color },
                                { label: 'PAL (activité)',  val: `×${profiles[key].pal}`, accent: color },
                                { label: 'TDEE Final',      val: `${r(plan.tdee_final)} kcal`, accent: color },
                                { label: 'Déficit',         val: `−${profiles[key].deficit} kcal`, accent: '#f59e0b' },
                                { label: 'Objectif / jour', val: `${r(plan.target_daily)} kcal`, accent: color, bold: true },
                            ].map((row, i) => (
                                <div key={i} className={`ds-calc-row${row.bold ? ' ds-calc-row-bold' : ''}`}>
                                    <span>{row.label}</span>
                                    <span style={{ color: row.accent || 'var(--text-main)' }}>{row.val}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Table PAL */}
                <h4 className="ds-section-title-sm"><Dumbbell size={15} /> Niveaux d'Activité (PAL)</h4>
                <div className="ds-table-scroll">
                    <table className="diet-table ds-met-table">
                        <thead>
                            <tr>
                                <th>Niveau</th>
                                <th>Multiplicateur</th>
                                <th>Description</th>
                                <th style={{ color: '#38bdf8' }}>Axel</th>
                                <th style={{ color: '#818cf8' }}>Prisca</th>
                            </tr>
                        </thead>
                        <tbody>
                            {PAL_OPTIONS.map(opt => {
                                const isAxel   = profiles.axel.pal   === opt.value;
                                const isPrisca = profiles.prisca.pal === opt.value;
                                return (
                                    <tr key={opt.value} className={!isAxel && !isPrisca ? 'ds-row-inactive' : ''}>
                                        <td style={{ fontWeight: (isAxel || isPrisca) ? 700 : 400 }}>{opt.label}</td>
                                        <td><span className="ds-val">×{opt.value}</span></td>
                                        <td style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{opt.desc}</td>
                                        <td><span className="ds-val" style={{ color: '#38bdf8' }}>{isAxel   ? '✓' : '—'}</span></td>
                                        <td><span className="ds-val" style={{ color: '#818cf8' }}>{isPrisca ? '✓' : '—'}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ─────────────── SECTION 2 : Macros Cibles ─────────────── */}
            <section className="ds-section">
                <h3 className="ds-section-title"><Target size={19} /> Macros Cibles Par Jour</h3>
                <div className="card-grid">
                    {persons.map(({ key, label, plan, color, glow }) => {
                        // Ce que le socle apporte déjà, et ce qu'il reste aux recettes à couvrir
                        const socle = getSocleItems(key, profiles).total;
                        return (
                            <div key={key} className="card ds-macro-card" style={{ background: glow, borderColor: `${color}30` }}>
                                <div className="ds-macro-name" style={{ color }}>{label}</div>
                                <div className="ds-macro-grid">
                                    {[
                                        { label: 'Poids actuel',          val: `${profiles[key].weight} kg`,                       color },
                                        { label: 'Poids de forme',        val: `${plan.goal_weight || profiles[key].weight} kg`,   color },
                                        { label: 'TDEE (BMR × PAL)',      val: `${r(plan.tdee_final)} kcal`,                       color },
                                        { label: 'Déficit appliqué',      val: `−${profiles[key].deficit} kcal`,                   color: '#f59e0b' },
                                        { label: 'Objectif calorique',    val: `${r(plan.target_daily)} kcal/j`,                   color },
                                        { label: 'Protéines cible',       val: `${r(plan.prot_goal, 1)} g/j (${profiles[key].prot_ratio} g/kg)`, color: '#4ade80' },
                                        { label: 'Lipides cible',         val: `${r(plan.lip_goal, 1)} g/j (${profiles[key].lip_ratio ?? 0.9} g/kg)`, color: '#fb923c' },
                                        { label: 'Glucides cible',        val: `${r(plan.glu_goal || 0)} g/j`,                     color: '#facc15' },
                                        { label: 'Apporté par le socle',  val: `${r(socle.kcal)} kcal · ${r(socle.prot, 1)}g P`,   color: '#94a3b8' },
                                        { label: 'Reste aux recettes',    val: `${r(plan.batch_midi_budget + plan.batch_soir_budget)} kcal · ${r(Math.max(0, plan.prot_goal - socle.prot), 1)}g P`, color },
                                    ].map((item, i) => (
                                        <div key={i} className="ds-macro-item">
                                            <span className="ds-macro-label">{item.label}</span>
                                            <span className="ds-macro-val" style={{ color: item.color }}>{item.val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ─────────────── SECTION 3 : Structure Alimentaire ─────────────── */}
            <section className="ds-section">
                <h3 className="ds-section-title">🍽️ Structure Alimentaire Journalière</h3>
                <p className="ds-section-desc">
                    Le <em>Socle Fixe</em> est constant. Les <strong>Variables</strong> (surlignées en jaune/bleu)
                    sont recalculées dynamiquement par l'algorithme.
                </p>
                <div className="ds-tables-wrap">
                    <SocleTable planKey="axel"   plan={planAxel}   profiles={profiles} />
                    <SocleTable planKey="prisca" plan={planPrisca} profiles={profiles} />
                </div>
                <div className="ds-legumes-note" style={{ marginTop: '1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', padding: '1rem', borderRadius: '8px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', marginBottom: '0.5rem', fontSize: '1rem' }}>
                        <Info size={18} /> Note sur l'Algorithme Mathématique
                    </h4>
                    <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                        🚨 L’algorithme vise la perfection automatique sur <strong>DEUX</strong> objectifs : les Calories Totales et ton Ratio de Protéines.
                        Mathématiquement, avec deux variables d'ajustements (PST et Pâtes), on ne peut satisfaire simultanément que deux équations.
                        Les Lipides et Glucides ne sont donc PAS des cibles bloquantes, mais les totaux estimés des ingrédients choisis pour calquer l'objectif Kcal+Prot.
                    </p>
                </div>
            </section>

            {/* ─────────────── SECTION 4 : Compléments ─────────────── */}
            <section className="ds-section">
                <h3 className="ds-section-title"><Pill size={19} /> Compléments Alimentaires</h3>
                {suppRows.length > 0 ? (
                    <div className="ds-table-scroll">
                        <table className="diet-table">
                            <thead>
                                <tr>
                                    <th>Moment</th>
                                    <th>Supplément</th>
                                    <th style={{ color: '#38bdf8' }}>Axel</th>
                                    <th style={{ color: '#818cf8' }}>Prisca</th>
                                    <th>Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppRows.map((row, i) => (
                                    <tr key={i}>
                                        <td><span className="ds-moment-badge">{row.Section}</span></td>
                                        <td className="ds-td-name">{row.Item}</td>
                                        <td style={{ color: '#38bdf8' }}>{row.Axel}</td>
                                        <td style={{ color: '#818cf8' }}>{row.Prisca}</td>
                                        <td className="ds-td-detail">{row.Note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="ds-section-desc">Aucun supplément chargé depuis supplements.csv.</p>
                )}
            </section>

        </div>
    );
};

export default DietSummary;
