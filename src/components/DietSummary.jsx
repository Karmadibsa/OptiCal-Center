import React from 'react';
import { calculatePlan, ACTIVITIES, SOCLE_DATA, PASTA_REF, MACRO_EST as EST } from '../utils/dietAlgo';
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
const SocleTable = ({ planKey, plan, profiles }) => {
    const p        = profiles[planKey];
    const isAxel   = planKey === 'axel';
    const socle    = { ...SOCLE_DATA.common, ...SOCLE_DATA[planKey] };
    const accent   = isAxel ? '#38bdf8' : '#818cf8';
    const optFromage  = Math.max(0, Number(p.opt_fromage) || 0);
    const optGalettes = Boolean(p.opt_galettes);
    const optFbSoir   = Boolean(p.opt_fb_soir);

    const wheyKcal = socle.matin_whey.kcal + socle.collation_whey.kcal;
    const wheyProt = socle.matin_whey.prot + socle.collation_whey.prot;
    const wheyNb   = isAxel ? 2 : 1;
    const totalOeufs = plan.oeuf_qty_per_meal * 2;

    // ─── Socle FIXE (vraiment constants, jamais recalculés) ───────────────
    const fixedRows = [
        {
            name: 'Pain + Cancoillotte (matin)',
            detail: isAxel ? '140g pain + 30g canc.' : '80g pain + 20g canc.',
            kcal: socle.pain_matin.kcal,
            prot: socle.pain_matin.prot,
            lip: isAxel ? EST.pain_axel_lip : EST.pain_prisca_lip,
            glu: isAxel ? EST.pain_axel_glu : EST.pain_prisca_glu,
        },
        {
            name: 'Whey Protéinée',
            detail: `×${wheyNb} shaker${wheyNb > 1 ? 's' : ''} / jour`,
            kcal: wheyKcal,
            prot: wheyProt,
            lip: wheyNb * EST.whey_lip_per,
            glu: wheyNb * EST.whey_glu_per,
        },
        {
            name: 'Œufs entiers',
            detail: `×${totalOeufs} / jour (${plan.oeuf_qty_per_meal} × 2 repas)`,
            kcal: totalOeufs * 80,
            prot: totalOeufs * 6,
            lip: totalOeufs * EST.oeuf_lip,
            glu: 0,
        },
        {
            name: 'Crème Fraîche 30%',
            detail: '30g × 2 repas',
            kcal: socle.midi_creme.kcal + socle.soir_creme.kcal,
            prot: socle.midi_creme.prot + socle.soir_creme.prot,
            lip: EST.creme_lip_per_30g * 2,
            glu: 2,
        },
        {
            name: 'Légumes (à volonté)',
            detail: '~225g × 2 repas ≈ 450g/j',
            kcal: EST.legumes_kcal_jours,
            prot: EST.legumes_prot_jour,
            lip: 1,
            glu: EST.legumes_glu_jour,
        },
        {
            name: 'Banane (collation 16h)',
            detail: '1 banane',
            kcal: EST.banane_kcal,
            prot: EST.banane_prot,
            lip: 0,
            glu: EST.banane_glu,
        },
    ];

    // Options passées dans les variables, plus dans fixedRows

    // Sous-total fixe (sans PST, pâtes, FB)
    const sub = fixedRows.reduce(
        (a, row) => ({ kcal: a.kcal + row.kcal, prot: a.prot + row.prot, lip: a.lip + row.lip, glu: a.glu + row.glu }),
        { kcal: 0, prot: 0, lip: 0, glu: 0 }
    );

    // ─── Variables dynamiques ─────────────────────────────────────────────
    const pstKcal = r(plan.pst_qty * 3.3);
    const pstProt = r(plan.pst_qty * 0.5, 1);
    const pstLip  = r(plan.pst_qty * 0.05, 1);
    const pstGlu  = r(plan.pst_qty * 0.3, 1);

    const pastaKcal = r(plan.pasta_grams_day * PASTA_REF.kcal / 100);
    const pastaProt = r(plan.pasta_grams_day * PASTA_REF.prot / 100, 1);
    const pastaLip  = r(plan.pasta_grams_day * EST.pasta_lip_per_100g / 100, 1);
    const pastaGlu  = r(plan.pasta_grams_day * EST.pasta_glu_per_100g / 100, 1);

    const fbKcal = r(plan.fb_qty * 0.48);
    const fbProt = r(plan.fb_qty * 0.08, 1);
    const fbGlu  = r(plan.fb_qty * EST.fb_glu_per_g, 1);

    const fromageKcal = optFromage > 0 ? r(optFromage * 4) : 0;
    const fromageProt = optFromage > 0 ? r(optFromage * 0.25, 1) : 0;
    const fromageLip  = optFromage > 0 ? r(optFromage * EST.fromage_unit_lip, 1) : 0;

    const galettesKcal = optGalettes ? SOCLE_DATA.common.galettes_150g.kcal : 0;
    const galettesProt = optGalettes ? SOCLE_DATA.common.galettes_150g.prot : 0;
    const galettesLip  = optGalettes ? EST.galettes_lip : 0;
    const galettesGlu  = optGalettes ? EST.galettes_glu : 0;

    const grandTotal = {
        kcal: r(sub.kcal + pstKcal + pastaKcal + fbKcal + fromageKcal + galettesKcal),
        prot: r(sub.prot + pstProt + pastaProt + fbProt + fromageProt + galettesProt, 1),
        lip:  r(sub.lip  + pstLip  + pastaLip + fromageLip + galettesLip, 1),
        glu:  r(sub.glu  + pstGlu  + pastaGlu + fbGlu + galettesGlu, 1),
    };

    const pct = {
        prot: grandTotal.kcal > 0 ? r(((grandTotal.prot * 4) / grandTotal.kcal) * 100) : 0,
        lip:  grandTotal.kcal > 0 ? r(((grandTotal.lip * 9)  / grandTotal.kcal) * 100) : 0,
        glu:  grandTotal.kcal > 0 ? r(((grandTotal.glu * 4)  / grandTotal.kcal) * 100) : 0,
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
                        {fixedRows.map((row, i) => (
                            <tr key={i}>
                                <td className="ds-td-name">{row.name}</td>
                                <td className="ds-td-detail">{row.detail}</td>
                                <td><span className="ds-val">{row.kcal}</span></td>
                                <td><span className="ds-val ds-prot">{row.prot}</span></td>
                                <td><span className="ds-val ds-lip">{row.lip}</span></td>
                                <td><span className="ds-val ds-glu">{row.glu}</span></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="ds-tfoot-sub">
                            <td colSpan="2">Sous-total Socle Fixe</td>
                            <td>{r(sub.kcal)}</td>
                            <td className="ds-prot">{r(sub.prot, 1)}</td>
                            <td className="ds-lip">{r(sub.lip, 1)}</td>
                            <td className="ds-glu">{r(sub.glu, 1)}</td>
                        </tr>
                        {/* Variables dynamiques */}
                        <tr className="ds-tfoot-var">
                            <td colSpan="2">+ PST Soja ({plan.pst_qty}g cru)</td>
                            <td>{pstKcal}</td>
                            <td className="ds-prot">{pstProt}</td>
                            <td className="ds-lip">{pstLip}</td>
                            <td className="ds-glu">{pstGlu}</td>
                        </tr>
                        <tr className="ds-tfoot-var">
                            <td colSpan="2">+ Pâtes Protein+ ({r(plan.pasta_grams_day)}g cru / jour)</td>
                            <td>{pastaKcal}</td>
                            <td className="ds-prot">{pastaProt}</td>
                            <td className="ds-lip">{pastaLip}</td>
                            <td className="ds-glu">{pastaGlu}</td>
                        </tr>
                        <tr className={`ds-tfoot-var ${!optFbSoir || plan.fb_qty === 0 ? 'ds-row-inactive' : ''}`}>
                            <td colSpan="2">
                                + Fromage Blanc 0% ({optFbSoir ? `${r(plan.fb_qty)}g` : '0g'})
                            </td>
                            <td>{optFbSoir ? fbKcal : '—'}</td>
                            <td className="ds-prot">{optFbSoir ? fbProt : '—'}</td>
                            <td className="ds-lip">0</td>
                            <td className="ds-glu">{optFbSoir ? fbGlu : '—'}</td>
                        </tr>
                        <tr className={`ds-tfoot-var ${!optGalettes ? 'ds-row-inactive' : ''}`}>
                            <td colSpan="2">+ Galettes de Légumes (150g le soir)</td>
                            <td>{optGalettes ? galettesKcal : '—'}</td>
                            <td className="ds-prot">{optGalettes ? galettesProt : '—'}</td>
                            <td className="ds-lip">{optGalettes ? galettesLip : '—'}</td>
                            <td className="ds-glu">{optGalettes ? galettesGlu : '—'}</td>
                        </tr>
                        <tr className={`ds-tfoot-var ${optFromage === 0 ? 'ds-row-inactive' : ''}`}>
                            <td colSpan="2">+ Option Fromage ({optFromage}g)</td>
                            <td>{optFromage > 0 ? fromageKcal : '—'}</td>
                            <td className="ds-prot">{optFromage > 0 ? fromageProt : '—'}</td>
                            <td className="ds-lip">{optFromage > 0 ? fromageLip : '—'}</td>
                            <td className="ds-glu">{optFromage > 0 ? '0' : '—'}</td>
                        </tr>
                        <tr className="ds-tfoot-total">
                            <td colSpan="2">TOTAL ESTIMÉ / JOUR</td>
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
                    <code className="ds-formula">TDEE = BMR × 1.2 <span className="ds-formula-comment">(coefficient sédentaire)</span> + Calories Sport</code>
                    <code className="ds-formula">Calories Sport = MET × Poids<sub>kg</sub> × Durée<sub>h</sub> &nbsp;<span className="ds-formula-comment">(sommé/7 pour ramener au jour)</span></code>
                    <code className="ds-formula">Objectif Journalier = TDEE − Déficit</code>
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
                                { label: 'Sport / jour',    val: `+${r(plan.sport_day)} kcal`, accent: color },
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

                {/* Table METs */}
                <h4 className="ds-section-title-sm"><Dumbbell size={15} /> Facteurs d'Activité (METs)</h4>
                <div className="ds-table-scroll">
                    <table className="diet-table ds-met-table">
                        <thead>
                            <tr>
                                <th>Activité</th>
                                <th>MET</th>
                                <th style={{ color: '#38bdf8' }}>Axel (min/sem)</th>
                                <th style={{ color: '#818cf8' }}>Prisca (min/sem)</th>
                                <th style={{ color: '#38bdf8' }}>Axel (kcal/sem)</th>
                                <th style={{ color: '#818cf8' }}>Prisca (kcal/sem)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ACTIVITIES.map(act => {
                                const mA = Number(profiles.axel.activities[act.id])   || 0;
                                const mP = Number(profiles.prisca.activities[act.id]) || 0;
                                const cA = r(profiles.axel.weight   * (mA / 60) * act.met);
                                const cP = r(profiles.prisca.weight * (mP / 60) * act.met);
                                return (
                                    <tr key={act.id} className={mA === 0 && mP === 0 ? 'ds-row-inactive' : ''}>
                                        <td>{act.label}</td>
                                        <td><span className="ds-val">{act.met}</span></td>
                                        <td><span className="ds-val" style={{ color: '#38bdf8' }}>{mA || '—'}</span></td>
                                        <td><span className="ds-val" style={{ color: '#818cf8' }}>{mP || '—'}</span></td>
                                        <td><span className="ds-val" style={{ color: '#38bdf8' }}>{mA ? cA : '—'}</span></td>
                                        <td><span className="ds-val" style={{ color: '#818cf8' }}>{mP ? cP : '—'}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ─────────────── SECTION 2 : Macros Cibles ─────────────── */}
            <section className="ds-section">
                <h3 className="ds-section-title"><Target size={19} /> Macros Cibles Estimees Par Jour</h3>
                <div className="card-grid">
                    {persons.map(({ key, label, plan, color, glow }) => {
                        const ratioReel = r(plan.total_prot / (profiles[key].weight || 1), 2);
                        const ratioOk = !plan.prot_warning;
                        return (
                            <div key={key} className="card ds-macro-card" style={{ background: glow, borderColor: `${color}30` }}>
                                <div className="ds-macro-name" style={{ color }}>{label}</div>
                                <div className="ds-macro-grid">
                                    {[
                                        { label: 'Poids actuel',         val: `${profiles[key].weight} kg`,          color },
                                        { label: 'Objectif calorique',   val: `${r(plan.target_daily)} kcal/j`,      color },
                                        { label: 'Protéines cible',      val: `${r(plan.prot_goal, 1)} g/j`,         color },
                                        { label: 'Ratio cible',          val: `${profiles[key].prot_ratio} g/kg`,    color },
                                        { label: 'Protéines estimées',   val: `${r(plan.total_prot, 1)} g/j`,        color: ratioOk ? '#4ade80' : '#f87171' },
                                        { label: 'Ratio réel atteint',   val: `${ratioReel} g/kg`,                   color: ratioOk ? '#4ade80' : '#fb923c' },
                                        { label: 'Lipides estimées',     val: `${r(plan.total_lip, 1)} g/j`,         color: '#fb923c' },
                                        { label: 'Glucides estimées',    val: `${r(plan.total_glu, 1)} g/j`,         color: '#facc15' },
                                        { label: 'Déficit appliqué',     val: `−${profiles[key].deficit} kcal`,      color: '#f59e0b' },
                                        { label: 'Sport / semaine',      val: `${r(plan.sport_cal_week)} kcal`,      color },
                                    ].map((item, i) => (
                                        <div key={i} className="ds-macro-item">
                                            <span className="ds-macro-label">{item.label}</span>
                                            <span className="ds-macro-val" style={{ color: item.color }}>{item.val}</span>
                                        </div>
                                    ))}
                                </div>
                                {plan.prot_warning && (
                                    <div className="ds-warn-badge">
                                        ⚠️ Objectif non atteint — écart : {r(plan.prot_goal - plan.total_prot, 1)}g
                                        &nbsp;({r(plan.prot_ratio - ratioReel, 2)} g/kg manquants)
                                    </div>
                                )}
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
