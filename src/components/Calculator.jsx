import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, ShoppingCart, Scale } from 'lucide-react';
import { calculatePlan } from '../utils/dietAlgo';

const InputGroup = ({ label, value, placeholder, onChange, highlight }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.8rem', color: highlight ? '#fbbf24' : '#94a3b8', fontWeight: highlight ? 700 : 600 }}>
            {label}
        </label>
        <input
            type="number"
            value={value === 0 ? '' : value}
            placeholder={placeholder}
            onChange={onChange}
            style={{
                background: highlight ? 'rgba(251,191,36,0.07)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${highlight ? '#fbbf24' : '#334155'}`,
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                width: '100%'
            }}
        />
    </div>
);

const Calculator = ({ profiles }) => {
    const [schedule, setSchedule] = useState({});
    const [totals, setTotals] = useState({});

    // Batch Pâtes
    const [pastaBatch, setPastaBatch] = useState({ days: 6, potWeight: 1930, totalWeighed: 0 });
    // Batch PST
    const [pstBatch, setPstBatch] = useState({ days: 6, bowlWeight: 683, totalWeighed: 0 });

    const DAYS  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const MEALS = ['Midi', 'Soir'];

    const resAxel   = calculatePlan('axel',   profiles);
    const resPrisca = calculatePlan('prisca', profiles);

    useEffect(() => {
        calculateTotals();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schedule, profiles]);

    const toggleMeal = (day, meal, person) => {
        const key = `${day}-${meal}`;
        setSchedule(prev => ({
            ...prev,
            [key]: { ...prev[key], [person]: !prev[key]?.[person] }
        }));
    };

    const selectAll = () => {
        const s = {};
        DAYS.forEach(d => MEALS.forEach(m => { s[`${d}-${m}`] = { axel: true, prisca: true }; }));
        setSchedule(s);
    };

    const selectMonSat = () => {
        const s = {};
        ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].forEach(d =>
            MEALS.forEach(m => { s[`${d}-${m}`] = { axel: true, prisca: true }; })
        );
        setSchedule(s);
    };

    const resetSchedule = () => setSchedule({});

    const calculateTotals = () => {
        const PASTA = 'Pâtes Protein+ (Cru)';
        const PST   = 'PST (Cru)';
        const newTotals = { [PASTA]: 0, [PST]: 0 };

        Object.entries(schedule).forEach(([key, people]) => {
            const [, mealType] = key.split('-');
            if (mealType === 'Midi') {
                if (people.axel)   { newTotals[PASTA] += resAxel.pasta_midi;   newTotals[PST] += resAxel.pst_qty; }
                if (people.prisca) { newTotals[PASTA] += resPrisca.pasta_midi; newTotals[PST] += resPrisca.pst_qty; }
            } else if (mealType === 'Soir') {
                if (people.axel)   newTotals[PASTA] += resAxel.pasta_soir;
                if (people.prisca) newTotals[PASTA] += resPrisca.pasta_soir;
            }
        });

        if (newTotals[PASTA] === 0) delete newTotals[PASTA];
        if (newTotals[PST]   === 0) delete newTotals[PST];
        setTotals(newTotals);
    };

    const getDayState = (day, meal) => schedule[`${day}-${meal}`] || { axel: false, prisca: false };

    // ── Calculs batch Pâtes ──────────────────────────────────────────────────
    const totalPastaRaw   = (resAxel.pasta_midi + resAxel.pasta_soir + resPrisca.pasta_midi + resPrisca.pasta_soir) * pastaBatch.days;
    const netPastaCooked  = Math.max(0, pastaBatch.totalWeighed - pastaBatch.potWeight);
    const pastaCoef       = (totalPastaRaw > 0 && netPastaCooked > 0) ? netPastaCooked / totalPastaRaw : 0;

    // ── Calculs batch PST ────────────────────────────────────────────────────
    const totalPstRaw     = (resAxel.pst_qty + resPrisca.pst_qty) * pstBatch.days;
    const netPstCooked    = Math.max(0, pstBatch.totalWeighed - pstBatch.bowlWeight);
    const pstCoef         = (totalPstRaw > 0 && netPstCooked > 0) ? netPstCooked / totalPstRaw : 0;

    const inputsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' };
    const planRowStyle    = { display: 'grid', gridTemplateColumns: '2fr 1fr', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' };

    return (
        <div className="section-container animate-fade-in">
            <h2><CalcIcon className="icon-mr" /> Planificateur de Repas (Semaine)</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Coche les repas du Midi et du Soir pour calculer les quantités totales à cuisiner.
            </p>

            <div className="calc-controls">
                <button onClick={selectAll}    className="btn-small">Tout Sélectionner</button>
                <button onClick={selectMonSat} className="btn-small">Lundi – Samedi</button>
                <button onClick={resetSchedule} className="btn-small btn-outline">Reset</button>
            </div>

            <div className="calculator-grid">
                {DAYS.map(day => (
                    <div key={day} className="day-card">
                        <h3>{day}</h3>
                        {MEALS.map(meal => (
                            <div key={meal} className="meal-row">
                                <span className={`meal-badge meal-badge-${meal.toLowerCase()}`}>{meal}</span>
                                <div className="checkbox-group">
                                    <label className={`check-btn ${getDayState(day, meal).axel   ? 'active-axel'   : ''}`}>
                                        <input type="checkbox" onChange={() => toggleMeal(day, meal, 'axel')}
                                            checked={getDayState(day, meal).axel || false} />
                                        Axel
                                    </label>
                                    <label className={`check-btn ${getDayState(day, meal).prisca ? 'active-prisca' : ''}`}>
                                        <input type="checkbox" onChange={() => toggleMeal(day, meal, 'prisca')}
                                            checked={getDayState(day, meal).prisca || false} />
                                        Prisca
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Totaux courses */}
            <div className="totals-panel">
                <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <ShoppingCart size={20} /> Liste de Courses / Cuisson (Totaux)
                    <button
                        onClick={() => {
                            const text = Object.entries(totals).map(([k, v]) => `${k}: ${Math.round(v)}g`).join('\n');
                            navigator.clipboard.writeText(text);
                            alert('Liste copiée !');
                        }}
                        className="btn-small"
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                    >
                        Copier
                    </button>
                </h3>
                {Object.keys(totals).length === 0 ? (
                    <p style={{ color: '#475569', fontStyle: 'italic' }}>
                        Sélectionne des repas pour voir les quantités (Pâtes + PST).
                    </p>
                ) : (
                    <div className="totals-grid">
                        {Object.entries(totals).map(([item, amount]) => (
                            <div key={item} className="total-card">
                                <span className="total-name">{item}</span>
                                <span className="total-amount">{Math.round(amount)} g</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ══════════════════ BATCH COOKING — PÂTES ══════════════════ */}
            <div className="card" style={{ marginTop: '2.5rem', borderTop: '3px solid #10b981' }}>
                <h3 style={{ color: '#10b981', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                    <Scale size={18} /> Batch Cooking — Pâtes Protein+
                </h3>

                <div style={inputsGridStyle}>
                    <InputGroup label="Jours de Batch" value={pastaBatch.days}      placeholder="6"    onChange={e => setPastaBatch(c => ({ ...c, days:        parseFloat(e.target.value) || 0 }))} />
                    <InputGroup label="Poids Casserole Vide (g)" value={pastaBatch.potWeight}   placeholder="1930" onChange={e => setPastaBatch(c => ({ ...c, potWeight:   parseFloat(e.target.value) || 0 }))} />
                    <InputGroup label="POIDS TOTAL Casserole + Pâtes (g)" value={pastaBatch.totalWeighed} placeholder="Ex: 5800" highlight onChange={e => setPastaBatch(c => ({ ...c, totalWeighed: parseFloat(e.target.value) || 0 }))} />
                </div>

                {totalPastaRaw > 0 && (
                    <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                            <span style={{ color: '#94a3b8' }}>
                                Total Cru à cuire : <strong style={{ color: '#10b981', fontSize: '1.15rem' }}>{Math.round(totalPastaRaw)}g</strong>
                                <span style={{ color: '#64748b', fontSize: '0.85rem' }}> ({pastaBatch.days} jours)</span>
                            </span>
                            <span style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>
                                Coef Cuisson : ×{pastaCoef.toFixed(2)}
                            </span>
                        </div>

                        {pastaCoef > 0 && (
                            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ ...planRowStyle, background: 'rgba(0,0,0,0.3)', fontWeight: 800, fontSize: '0.82rem', color: '#94a3b8', letterSpacing: '1px' }}>
                                    <span>TUPPERWARE</span><span style={{ textAlign: 'center' }}>POIDS CUIT / BOÎTE</span>
                                </div>
                                {[
                                    { label: `Axel MIDI (×${pastaBatch.days})`,   color: '#38bdf8', val: Math.round(resAxel.pasta_midi   * pastaCoef) },
                                    { label: `Axel SOIR (×${pastaBatch.days})`,   color: '#38bdf8', val: Math.round(resAxel.pasta_soir   * pastaCoef) },
                                    { label: `Prisca MIDI (×${pastaBatch.days})`, color: '#a78bfa', val: Math.round(resPrisca.pasta_midi * pastaCoef) },
                                    { label: `Prisca SOIR (×${pastaBatch.days})`, color: '#a78bfa', val: Math.round(resPrisca.pasta_soir * pastaCoef) },
                                ].map(({ label, color, val }) => (
                                    <div key={label} style={planRowStyle}>
                                        <span style={{ color, fontWeight: 600 }}>{label}</span>
                                        <span style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '1.05rem', color: '#e2e8f0' }}>{val}g</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ══════════════════ BATCH COOKING — PST ══════════════════ */}
            <div className="card" style={{ marginTop: '1.5rem', borderTop: '3px solid #f97316' }}>
                <h3 style={{ color: '#f97316', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                    <Scale size={18} /> Batch Cooking — PST (Midis)
                </h3>

                <div style={inputsGridStyle}>
                    <InputGroup label="Jours de Batch" value={pstBatch.days}       placeholder="6"    onChange={e => setPstBatch(c => ({ ...c, days:        parseFloat(e.target.value) || 0 }))} />
                    <InputGroup label="Poids Cul-de-poule Vide (g)" value={pstBatch.bowlWeight}   placeholder="683"  onChange={e => setPstBatch(c => ({ ...c, bowlWeight:  parseFloat(e.target.value) || 0 }))} />
                    <InputGroup label="POIDS TOTAL Bol + PST (g)" value={pstBatch.totalWeighed} placeholder="Ex: 1500" highlight onChange={e => setPstBatch(c => ({ ...c, totalWeighed: parseFloat(e.target.value) || 0 }))} />
                </div>

                {totalPstRaw > 0 && (
                    <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #f97316' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                            <span style={{ color: '#94a3b8' }}>
                                Total PST Cru : <strong style={{ color: '#f97316', fontSize: '1.15rem' }}>{Math.round(totalPstRaw)}g</strong>
                                <span style={{ color: '#64748b', fontSize: '0.85rem' }}> ({pstBatch.days} jours)</span>
                            </span>
                            <span style={{ color: '#f97316', fontFamily: 'monospace', fontWeight: 700 }}>
                                Coef Chauffe : ×{pstCoef.toFixed(2)}
                            </span>
                        </div>

                        {pstCoef > 0 && (
                            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ ...planRowStyle, background: 'rgba(0,0,0,0.3)', fontWeight: 800, fontSize: '0.82rem', color: '#94a3b8', letterSpacing: '1px' }}>
                                    <span>TUPPERWARE</span><span style={{ textAlign: 'center' }}>POIDS CHAUFFÉ / BOÎTE</span>
                                </div>
                                {[
                                    { label: `Axel MIDI (×${pstBatch.days})`,   color: '#38bdf8', val: Math.round(resAxel.pst_qty   * pstCoef) },
                                    { label: `Prisca MIDI (×${pstBatch.days})`, color: '#a78bfa', val: Math.round(resPrisca.pst_qty * pstCoef) },
                                ].map(({ label, color, val }) => (
                                    <div key={label} style={planRowStyle}>
                                        <span style={{ color, fontWeight: 600 }}>{label}</span>
                                        <span style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '1.05rem', color: '#e2e8f0' }}>{val}g</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                .meal-badge {
                    display: inline-block; padding: 0.25rem 0.7rem;
                    border-radius: 6px; font-size: 0.78rem; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.5px; min-width: 44px; text-align: center;
                }
                .meal-badge-midi { background: rgba(56,189,248,0.12); color: #38bdf8; border: 1px solid rgba(56,189,248,0.25); }
                .meal-badge-soir { background: rgba(167,139,250,0.12); color: #a78bfa; border: 1px solid rgba(167,139,250,0.25); }
            `}</style>
        </div>
    );
};

export default Calculator;
