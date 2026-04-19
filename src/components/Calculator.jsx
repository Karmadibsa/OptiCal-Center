import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, ShoppingCart } from 'lucide-react';
import { calculatePlan } from '../utils/dietAlgo';

const Calculator = ({ profiles }) => {
    const [schedule, setSchedule] = useState({});
    const [totals, setTotals] = useState({});

    const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const MEALS = ['Midi', 'Soir'];

    useEffect(() => {
        calculateTotals();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schedule, profiles]);

    const toggleMeal = (day, meal, person) => {
        const key = `${day}-${meal}`;
        setSchedule(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [person]: !prev[key]?.[person]
            }
        }));
    };

    const selectAll = () => {
        const newSchedule = {};
        DAYS.forEach(day => {
            MEALS.forEach(meal => {
                newSchedule[`${day}-${meal}`] = { axel: true, prisca: true };
            });
        });
        setSchedule(newSchedule);
    };

    const selectMonSat = () => {
        const newSchedule = {};
        ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].forEach(day => {
            MEALS.forEach(meal => {
                newSchedule[`${day}-${meal}`] = { axel: true, prisca: true };
            });
        });
        setSchedule(newSchedule);
    };

    const resetSchedule = () => setSchedule({});

    const calculateTotals = () => {
        const resAxel = calculatePlan('axel', profiles);
        const resPrisca = calculatePlan('prisca', profiles);

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

    return (
        <div className="section-container animate-fade-in">
            <h2><CalcIcon className="icon-mr" /> Planificateur de Repas (Semaine)</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Coche les repas du Midi et du Soir pour calculer les quantités totales à cuisiner.
            </p>

            <div className="calc-controls">
                <button onClick={selectAll} className="btn-small">Tout Sélectionner</button>
                <button onClick={selectMonSat} className="btn-small">Lundi – Samedi</button>
                <button onClick={resetSchedule} className="btn-small btn-outline">Reset</button>
            </div>

            <div className="calculator-grid">
                {DAYS.map(day => (
                    <div key={day} className="day-card">
                        <h3>{day}</h3>
                        {MEALS.map(meal => (
                            <div key={meal} className="meal-row">
                                {/* Badge coloré Midi / Soir */}
                                <span className={`meal-badge meal-badge-${meal.toLowerCase()}`}>
                                    {meal}
                                </span>
                                <div className="checkbox-group">
                                    <label className={`check-btn ${getDayState(day, meal).axel ? 'active-axel' : ''}`}>
                                        <input
                                            type="checkbox"
                                            onChange={() => toggleMeal(day, meal, 'axel')}
                                            checked={getDayState(day, meal).axel || false}
                                        />
                                        Axel
                                    </label>
                                    <label className={`check-btn ${getDayState(day, meal).prisca ? 'active-prisca' : ''}`}>
                                        <input
                                            type="checkbox"
                                            onChange={() => toggleMeal(day, meal, 'prisca')}
                                            checked={getDayState(day, meal).prisca || false}
                                        />
                                        Prisca
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

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

            <style>{`
                .meal-badge {
                    display: inline-block;
                    padding: 0.25rem 0.7rem;
                    border-radius: 6px;
                    font-size: 0.78rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    min-width: 44px;
                    text-align: center;
                }
                .meal-badge-midi {
                    background: rgba(56,189,248,0.12);
                    color: #38bdf8;
                    border: 1px solid rgba(56,189,248,0.25);
                }
                .meal-badge-soir {
                    background: rgba(167,139,250,0.12);
                    color: #a78bfa;
                    border: 1px solid rgba(167,139,250,0.25);
                }
            `}</style>
        </div>
    );
};

export default Calculator;
