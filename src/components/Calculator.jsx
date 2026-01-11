import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Calculator as CalcIcon, ShoppingCart, User, Users } from 'lucide-react';

const Calculator = ({ csvData }) => {
    // State for selected meals: { "Monday-Midi": { axel: true, prisca: true } }
    const [schedule, setSchedule] = useState({});
    const [totals, setTotals] = useState({});

    const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const MEALS = ['Midi', 'Soir'];

    // Helper to extract numeric value from string like "115g" or "35-40g"
    const parseGram = (str) => {
        if (!str) return 0;
        const matches = str.match(/(\d+)/g);
        if (!matches) return 0;

        // If range 92-100, take average? Or max? Let's take average for accuracy to 0
        if (matches.length > 1) {
            const v1 = parseFloat(matches[0]);
            const v2 = parseFloat(matches[1]);
            return (v1 + v2) / 2;
        }
        return parseFloat(matches[0]);
    };

    // Identify ingredients from the CSV data automatically if possible, 
    // but for the calculator logic we need to know WHICH item maps to Lunch/Dinner carboydrates.
    // We can hardcode the mapping based on the known "Item" names in the CSV to be safe.
    // CSV Items: "Riz (cru)", "Pâtes (cru)", "PST (cru)", "Crème Fraîche", "Œufs"

    const INGREDIENTS_MAP = {
        'Midi': ['Riz (cru)', 'PST (cru)', 'Crème Fraîche'],
        'Soir': ['Pâtes (cru)', 'Œufs', 'Crème Fraîche']
    };

    useEffect(() => {
        calculateTotals();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schedule, csvData]);

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

    const selectMonFri = () => {
        const newSchedule = {};
        const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
        weekDays.forEach(day => {
            MEALS.forEach(meal => {
                newSchedule[`${day}-${meal}`] = { axel: true, prisca: true };
            });
        });
        setSchedule(newSchedule);
    };

    const resetSchedule = () => {
        setSchedule({}); // Clear all
    };

    const calculateTotals = () => {
        if (!csvData || csvData.length === 0) return;

        const newTotals = {};

        // Helper to find amount in CSV
        const getAmount = (itemName, person) => {
            const row = csvData.find(r => r.Item === itemName && r.Type === 'Diet');
            if (!row) return 0;
            return parseGram(row[person === 'axel' ? 'Axel' : 'Prisca']);
        };

        Object.entries(schedule).forEach(([key, people]) => {
            const [_day, mealType] = key.split('-');
            const ingredients = INGREDIENTS_MAP[mealType];

            if (ingredients) {
                ingredients.forEach(ing => {
                    // Filter out unwanted items from totals
                    if (ing.includes('Crème') || ing.includes('Œufs')) return;

                    if (!newTotals[ing]) newTotals[ing] = 0;

                    if (people.axel) newTotals[ing] += getAmount(ing, 'axel');
                    if (people.prisca) newTotals[ing] += getAmount(ing, 'prisca');
                });
            }
        });

        setTotals(newTotals);
    };

    const getDayState = (day, meal) => {
        const key = `${day}-${meal}`;
        return schedule[key] || { axel: false, prisca: false };
    };

    return (
        <div className="section-container animate-fade-in">
            <h2><CalcIcon className="icon-mr" /> Calculateur de Batch Cooking</h2>
            <p className="subtitle">Coche les repas prévus pour calculer les quantités totales à cuire.</p>

            <div className="calc-controls">
                <button onClick={selectAll} className="btn-small">Tout Sélectionner</button>
                <button onClick={selectMonFri} className="btn-small">Lundi - Vendredi</button>
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
                    <p className="empty-state">Sélectionne des repas pour voir les quantités (Riz, Pâtes, PST uniquement).</p>
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
