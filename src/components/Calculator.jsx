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
        // Calcul temps réel depuis les profils — même source de vérité que SmartDiet
        const resAxel = calculatePlan('axel', profiles);
        const resPrisca = calculatePlan('prisca', profiles);

        const PASTA = 'Pâtes Protein+ (Cru)';
        const PST = 'PST (Cru)';

        const newTotals = { [PASTA]: 0, [PST]: 0 };

        Object.entries(schedule).forEach(([key, people]) => {
            const [, mealType] = key.split('-');

            if (mealType === 'Midi') {
                if (people.axel) {
                    newTotals[PASTA] += resAxel.pasta_midi;
                    newTotals[PST] += resAxel.pst_qty;
                }
                if (people.prisca) {
                    newTotals[PASTA] += resPrisca.pasta_midi;
                    newTotals[PST] += resPrisca.pst_qty;
                }
            } else if (mealType === 'Soir') {
                if (people.axel) newTotals[PASTA] += resAxel.pasta_soir;
                if (people.prisca) newTotals[PASTA] += resPrisca.pasta_soir;
            }
        });

        // Ne pas afficher les ingrédients à zéro
        if (newTotals[PASTA] === 0) delete newTotals[PASTA];
        if (newTotals[PST] === 0) delete newTotals[PST];

        setTotals(newTotals);
    };

    const getDayState = (day, meal) => schedule[`${day}-${meal}`] || { axel: false, prisca: false };

    return (
        <div className="section-container animate-fade-in">
            <h2><CalcIcon className="icon-mr" /> Calculateur de Batch Cooking</h2>
            <p className="subtitle">Coche les repas prévus pour calculer les quantités totales à cuire.</p>

            <div className="calc-controls">
                <button onClick={selectAll} className="btn-small">Tout Sélectionner</button>
                <button onClick={selectMonSat} className="btn-small">Lundi - Samedi</button>
                <button onClick={resetSchedule} className="btn-small btn-outline">Reset</button>
            </div>

            <div className="calculator-grid">
                {DAYS.map(day => (
                    <div key={day} className="day-card">
                        <h3>{day}</h3>
                        {MEALS.map(meal => (
                            <div key={meal} className="meal-row">
                                <span className="meal-label">{meal}</span>
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
                <h3>
                    <ShoppingCart className="icon-mr" /> Liste de Courses / Cuisson (Totaux)
                    <button
                        onClick={() => {
                            const text = Object.entries(totals).map(([k, v]) => `${k}: ${Math.round(v)}g`).join('\n');
                            navigator.clipboard.writeText(text);
                            alert('Liste copiée !');
                        }}
                        className="btn-small"
                        style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                    >
                        Copier
                    </button>
                </h3>
                {Object.keys(totals).length === 0 ? (
                    <p className="empty-state">Sélectionne des repas pour voir les quantités (Pâtes, PST uniquement).</p>
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
        </div>
    );
};

export default Calculator;
