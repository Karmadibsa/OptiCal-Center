import React, { useState, useEffect } from 'react';
import { BookMarked, ExternalLink, Search, Tag, Scale, X, ChevronDown, Euro } from 'lucide-react';
import { getMealBudget } from '../utils/dietAlgo';

// ─── Poids MAX par ingrédient (par recette id), en grammes et par personne ──────
// Ingrédients "volume" quasi 0 kcal (konjac) ou incompressibles (patate douce du
// wrap) : ils BLOQUENT à leur max, et les calories restantes sont redistribuées
// automatiquement sur les autres ingrédients (toppings / protéines).
const MAX_G_MAP = {
    '730017': { konjac: { axel: 350, prisca: 200 } }, // Carbonara konjac
    '730018': { konjac: { axel: 350, prisca: 200 } }, // Ramen konjac
    '730019': { konjac: { axel: 350, prisca: 200 } }, // Pad thaï konjac
    '730015': { 'patate douce': { axel: 300, prisca: 220 } }, // Wrap patate douce
};
const getMaxG = (recipeId, ingName, personKey) => {
    const rec = MAX_G_MAP[String(recipeId)];
    if (!rec) return null;
    const n = (ingName || '').toLowerCase();
    const kw = Object.keys(rec).find(k => n.includes(k));
    return kw ? rec[kw][personKey] : null;
};

// ─── Badge macros ─────────────────────────────────────────────────────────────
const MacroBadge = ({ val, unit, color, label }) => (
    <div className="ri-macro-badge">
        <span className="ri-macro-val" style={{ color }}>{val}</span>
        <span className="ri-macro-unit">{unit}</span>
        <span className="ri-macro-label">{label}</span>
    </div>
);

// ─── Parseur Markdown ──────────────────────────────────────────────────────────
const parseMarkdownSections = (text) => {
    const body = text.replace(/^---[\s\S]*?---\s*\n/, '');
    const sections = [];
    let current = null;
    for (const line of body.split('\n')) {
        if (line.startsWith('### ')) {
            if (current) sections.push(current);
            current = { title: line.replace('### ', '').trim(), items: [] };
        } else if (current && line.trim()) {
            current.items.push(line);
        }
    }
    if (current) sections.push(current);
    return sections;
};

const parseMarkdownTable = (items) => {
    const tableLines = items.filter(l => l.trim().startsWith('|') && !l.includes(':---'));
    if (tableLines.length < 2) return null; // data lines minus separator
    const header = items.find(l => l.trim().startsWith('|')).split('|').map(s => s.trim()).filter(Boolean);
    const dataObj = [];
    for (const line of items) {
        if (!line.trim().startsWith('|') || line.includes(':---')) continue;
        const row = line.split('|').map(s => s.trim()).filter(Boolean);
        if (row.length === header.length && row[0].toLowerCase() !== 'ingrédient') {
            dataObj.push({
                ingredient: row[0],
                qty: parseFloat(row[1]) || 0,
                unit: row[2],
                kcal: parseFloat(row[3]) || 0,
                prot: parseFloat(row[4]) || 0,
                lip: parseFloat(row[5]) || 0,
                glu: parseFloat(row[6]) || 0,
                divisible: row[7] || 'oui',
                volCooked: (row[8] || 'non').toLowerCase().includes('oui'),
                itemPrice: parseFloat(row[9]) || null
            });
        }
    }
    return dataObj.length > 0 ? dataObj : null;
};

// Prix : "- Farine T65 (500g) : 0.55€" → [{ label, price }]
const parsePriceLines = (items) =>
    items
        .filter(l => l.startsWith('- '))
        .map(l => {
            const m = l.match(/^-\s+(.+?)\s*:\s*([\d.]+)€/);
            return m ? { label: m[1].trim(), price: parseFloat(m[2]) } : null;
        })
        .filter(Boolean);

// Portions : "- **Axel** : 140g de pain..." → [{ name, value }]
const parsePortionLines = (items) =>
    items
        .filter(l => l.startsWith('- '))
        .map(l => {
            const m = l.match(/^-\s+\*\*(.+?)\*\*\s*:\s*(.+)/);
            return m ? { name: m[1].trim(), value: m[2].trim() } : null;
        })
        .filter(Boolean);

// "140g de pain + 30g Cancoillotte + 3 Œufs (matin)" → "140g"
const extractQty = (val) => val.match(/^(\d+\s*g)/i)?.[1] || val.split('+')[0].trim();

// Formater une ligne markdown (bold, italic)
const formatLine = (line) => {
    const cleaned = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
    const parts = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let last = 0; let m;
    while ((m = regex.exec(cleaned)) !== null) {
        if (m.index > last) parts.push(cleaned.slice(last, m.index));
        if (m[1]) parts.push(<strong key={m.index} style={{ color: '#e2e8f0' }}>{m[1]}</strong>);
        else parts.push(<em key={m.index} style={{ color: '#94a3b8' }}>{m[2]}</em>);
        last = m.index + m[0].length;
    }
    if (last < cleaned.length) parts.push(cleaned.slice(last));
    return parts;
};

const PERSON_COLORS = { axel: '#38bdf8', prisca: '#a78bfa' };
const getPersonColor = (name) => PERSON_COLORS[name.toLowerCase()] || '#94a3b8';

// ─── Modal ─────────────────────────────────────────────────────────────────────
const InteractiveRecipeScaler = ({ ingredientsConfig, budgetAxel, budgetPrisca, totalCostRaw, onTotalCoefChange, recipeId }) => {
    const totalKcalBase = ingredientsConfig.reduce((acc, i) => acc + i.kcal, 0) || 1;
    
    // Coef de reference (auto) = ce qu'il faut pour atteindre la cible calorique du
    // repas. Les ingrédients plafonnés (konjac, patate douce) bloquent à leur max et
    // les calories restantes sont redistribuées sur les autres (toppings/protéines).
    const targetAxel = budgetAxel ? budgetAxel.kcal / totalKcalBase : 1;
    const targetPrisca = budgetPrisca ? budgetPrisca.kcal / totalKcalBase : 1;
    
    const [coefAxel, setCoefAxel] = useState(targetAxel);
    const [coefPrisca, setCoefPrisca] = useState(targetPrisca);

    const [overridesAxel, setOverridesAxel] = useState({});
    const [overridesPrisca, setOverridesPrisca] = useState({});
    const [cookedWeights, setCookedWeights] = useState({});
    const [globalWeight, setGlobalWeight] = useState('');
    const [calcCru, setCalcCru] = useState('');
    const [calcCuit, setCalcCuit] = useState('');
    const [calcPart, setCalcPart] = useState('');

    useEffect(() => {
        setCoefAxel(targetAxel);
        setCoefPrisca(targetPrisca);
        setOverridesAxel({});
        setOverridesPrisca({});
    }, [targetAxel, targetPrisca]);

    useEffect(() => {
        if (onTotalCoefChange) onTotalCoefChange(coefAxel + coefPrisca);
    }, [coefAxel, coefPrisca, onTotalCoefChange]);

    const calculateValues = (coef, overrides, personKey) => {
        // Pass 1 : quantités de base + application des plafonds (max_g)
        const rows = ingredientsConfig.map((ing, idx) => {
            const isDivisible = ing.divisible.toLowerCase().includes('oui') || ing.divisible.toLowerCase().includes('yes');
            let baseStep = 1;
            if (!isDivisible) {
                const matchStep = ing.divisible.match(/([\d.]+)/);
                if (matchStep) baseStep = parseFloat(matchStep[1]);
            }
            const overridden = overrides[idx] !== undefined;
            let qty = overridden ? overrides[idx] : ing.qty * coef;
            const maxG = getMaxG(recipeId, ing.ingredient, personKey);
            const capped = !overridden && maxG != null && qty > maxG;
            if (capped) qty = maxG;
            else if (!overridden) qty = isDivisible ? Math.round(qty) : Math.round(qty / baseStep) * baseStep;
            return { ing, idx, isDivisible, qty, capped, overridden };
        });

        // Pass 2 : les calories "économisées" par les plafonds sont redistribuées
        // sur les ingrédients non plafonnés (toppings / protéines) pour tenir la cible.
        if (rows.some(r => r.capped)) {
            const targetKcal = coef * totalKcalBase;
            const fixedKcal  = rows.filter(r => r.capped || r.overridden)
                .reduce((s, r) => s + (r.ing.qty > 0 ? r.qty / r.ing.qty : 0) * r.ing.kcal, 0);
            const freeBase   = rows.filter(r => !r.capped && !r.overridden)
                .reduce((s, r) => s + r.ing.kcal, 0);
            if (freeBase > 0) {
                const boost = Math.max(0, (targetKcal - fixedKcal) / freeBase);
                rows.forEach(r => { if (!r.capped && !r.overridden) r.qty = Math.round(r.ing.qty * boost); });
            }
        }

        return rows.map(r => {
            const ratio = r.ing.qty > 0 ? r.qty / r.ing.qty : 0;
            return {
                ...r.ing,
                scaledQty: r.qty,
                scaledKcal: ratio * r.ing.kcal,
                scaledProt: ratio * r.ing.prot,
                scaledLip: ratio * r.ing.lip,
                scaledGlu: ratio * r.ing.glu,
                capped: r.capped,
            };
        });
    };

    const scaledAxel = calculateValues(coefAxel, overridesAxel, 'axel');
    const scaledPrisca = calculateValues(coefPrisca, overridesPrisca, 'prisca');

    const handleOverride = (personKey, idx, val) => {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0) return;
        if (personKey === 'axel') {
            setOverridesAxel(prev => ({ ...prev, [idx]: num }));
        } else {
            setOverridesPrisca(prev => ({ ...prev, [idx]: num }));
        }
    };
    
    const renderTable = (personName, scaledData, color, setCoef, currentCoef, baseCoef, overrides, setOverrides, budgetStr, totalCostRaw) => {
        const tKcal = scaledData.reduce((s, i) => s + i.scaledKcal, 0);
        const tProt = scaledData.reduce((s, i) => s + i.scaledProt, 0);
        const tLip = scaledData.reduce((s, i) => s + i.scaledLip, 0);
        const tGlu = scaledData.reduce((s, i) => s + i.scaledGlu, 0);
        
        const renderDiff = (act, trg, isProt) => {
            if (!trg) return null;
            const diff = act - trg;
            const pct = (diff / trg) * 100;
            if (Math.abs(diff) < 2) return null;
            
            let c = '#94a3b8';
            if (isProt) {
                if (pct >= -10 && diff < 0) c = '#fb923c'; 
                else if (pct < -10) c = '#f87171'; 
                else c = '#4ade80';
            } else {
                if (pct <= 10 && diff > 0) c = '#fb923c'; 
                else if (pct > 10) c = '#f87171';
                else c = '#4ade80'; 
            }
            return <span style={{ fontSize: '0.65rem', background: `${c}20`, color: c, border: `1px solid ${c}50`, borderRadius: '4px', padding: '1px 4px', marginLeft: '0.3rem', fontWeight: 700 }}>{diff > 0 ? '+' : ''}{Math.round(diff)}</span>;
        };
        
        return (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}30`, borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ color, fontWeight: 800, fontSize: '1.2rem' }}>{personName}</div>
                    
                    {/* Bloc Ajuster Portions avec boutons + / - */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.2)', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Coeff :</span>
                        <button onClick={() => { setCoef(c => Math.max(0.1, c - 0.1)); setOverrides({}); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                        <input type="number" step="0.1" min="0.1" 
                            className="ri-hide-spin"
                            value={Number(currentCoef).toFixed(1)} 
                            onChange={e => { const v = parseFloat(e.target.value); if(!isNaN(v)) { setCoef(v); setOverrides({}); } }}
                            style={{ width: '35px', outline: 'none', textAlign: 'center', background: 'transparent', border: 'none', color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }} />
                        <button onClick={() => { setCoef(c => c + 0.1); setOverrides({}); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>

                        {/* Bouton Reco : cale le coef sur ta cible calorique du repas */}
                        <button onClick={() => { setCoef(baseCoef); setOverrides({}); }}
                            title="Règle le coefficient pour atteindre ta cible calorique du repas"
                            style={{ background: `${color}22`, border: `1px solid ${color}`, color, borderRadius: '5px', cursor: 'pointer', fontSize: '0.68rem', padding: '0.25rem 0.5rem', marginLeft: '0.3rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            🎯 Reco {Number(baseCoef).toFixed(1)}
                        </button>
                    </div>
                </div>

                {/* Combien de portions pour le repas de cette personne */}
                {budgetStr?.kcal && totalKcalBase > 0 && (() => {
                    const portions = budgetStr.kcal / totalKcalBase;
                    return (
                        <div style={{ marginBottom: '0.85rem', padding: '0.5rem 0.7rem', background: `${color}12`, border: `1px solid ${color}33`, borderRadius: '8px', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                            🍽️ Recette de base <strong>{Math.round(totalKcalBase)} kcal</strong> → {personName} peut en manger <strong style={{ color }}>≈ {portions.toFixed(1)} portion{portions >= 2 ? 's' : ''}</strong> pour un repas (cible ~{Math.round(budgetStr.kcal)} kcal).
                        </div>
                    );
                })()}

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <tbody>
                        {scaledData.map((ing, idx) => {
                            const displayQty = parseFloat(ing.scaledQty.toFixed(1));
                            
                            return (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '0.6rem 0', color: '#e2e8f0', lineHeight: 1.4 }}>
                                        <div style={{ fontWeight: 600 }}>
                                            {ing.ingredient}
                                            {ing.capped && <span title="Plafonné : les calories vont sur les autres ingrédients" style={{ fontSize: '0.6rem', fontWeight: 800, background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid #fb923c55', borderRadius: '4px', padding: '1px 4px', marginLeft: '0.4rem' }}>MAX</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.6rem 0', textAlign: 'right', verticalAlign: 'top' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                                            <input 
                                                className="ri-hide-spin"
                                                type="number" 
                                                value={displayQty}
                                                onChange={e => handleOverride(personName.toLowerCase(), idx, e.target.value)}
                                                style={{ width: '60px', outline: 'none', textAlign: 'right', background: 'rgba(0,0,0,0.3)', border: `1px solid ${overrides[idx] !== undefined ? color : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', color: overrides[idx] !== undefined ? color : '#fff', fontWeight: 'bold', padding: '0.2rem', fontSize: '0.85rem' }} 
                                            />
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '15px' }}>{ing.unit}</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                
                    <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{color: '#64748b', fontSize: '0.65rem', fontWeight: 800}}>⚡ KCAL {renderDiff(tKcal, budgetStr?.kcal)}</span>
                            <span style={{color: color, fontWeight: 900, fontSize: '0.9rem'}}>{Math.round(tKcal)}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{color: '#64748b', fontSize: '0.65rem', fontWeight: 800}}>🥩 PROT {renderDiff(tProt, budgetStr?.prot, true)}</span>
                            <span style={{color: '#4ade80', fontWeight: 900, fontSize: '0.9rem'}}>{Math.round(tProt)}g</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{color: '#64748b', fontSize: '0.65rem', fontWeight: 800}}>🥑 LIP {renderDiff(tLip, budgetStr?.lip)}</span>
                            <span style={{color: '#fb923c', fontWeight: 900, fontSize: '0.9rem'}}>{Math.round(tLip)}g</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{color: '#64748b', fontSize: '0.65rem', fontWeight: 800}}>🍞 GLU {renderDiff(tGlu, budgetStr?.glu)}</span>
                            <span style={{color: '#facc15', fontWeight: 900, fontSize: '0.9rem'}}>{Math.round(tGlu)}g</span>
                        </div>
                    </div>
            </div>
        );
    };

    const totalData = scaledAxel.map((ing, i) => ({
        ...ing,
        totalQty: parseFloat((ing.scaledQty + scaledPrisca[i].scaledQty).toFixed(1))
    }));
    const tKcalAxel = scaledAxel.reduce((s, i) => s + i.scaledKcal, 0);
    const tKcalPrisca = scaledPrisca.reduce((s, i) => s + i.scaledKcal, 0);
    const ratioKcalAxel = tKcalAxel / (tKcalAxel + tKcalPrisca) || 0.5;

    return (
        <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <style dangerouslySetInnerHTML={{__html: `
                .ri-hide-spin::-webkit-outer-spin-button, 
                .ri-hide-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                .ri-hide-spin { -moz-appearance: textfield; }
            `}} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    ⚖️ Balance Magique 
                </h3>
            </div>
            
            {/* PANNEAU TOTAL CUISINE */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1.5rem', position: 'relative' }}>
                <button onClick={(e) => {
                        let txt = `🔥 REPAS CUISINE:\n${totalData.map(i => `- ${i.totalQty}${i.unit} ${i.ingredient}`).join('\n')}\n\n`;
                        txt += `⚖️ ASSIETTE AXEL:\n${scaledAxel.map(i => `- ${i.scaledQty}${i.unit} ${i.ingredient}`).join('\n')}\n\n`;
                        txt += `⚖️ ASSIETTE PRISCA:\n${scaledPrisca.map(i => `- ${i.scaledQty}${i.unit} ${i.ingredient}`).join('\n')}\n`;
                        navigator.clipboard.writeText(txt);
                        const btn = e.currentTarget;
                        const old = btn.innerText; btn.innerText = "✓ Copié"; setTimeout(()=>btn.innerText=old, 2000);
                    }} 
                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem', padding: '0.25rem 0.5rem', fontWeight: 'bold' }}>
                    📝 Copier Grammages
                </button>
                
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem' }}>🔥 Total pour la Cuisine :</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {totalData.map((ing, i) => {
                        const isVolCooked = ing.volCooked;
                        const ratioAxelIng = ing.totalQty > 0 ? scaledAxel[i].scaledQty / ing.totalQty : 0.5;
                        return (
                            <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column' }}>
                                <div>
                                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{ing.totalQty} {ing.unit}</span> <span style={{ color: '#94a3b8' }}>{ing.ingredient}</span>
                                    {ing.itemPrice && (
                                        <span style={{ color: '#10b981', fontSize: '0.7rem', marginLeft: '0.4rem' }}>{((ing.totalQty / ing.qty) * ing.itemPrice).toFixed(2)}€</span>
                                    )}
                                </div>
                                {isVolCooked && (
                                    <div style={{display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.3rem'}}>
                                        <input type="number" 
                                            className="ri-hide-spin"
                                            placeholder="Poids Cuit (g)" 
                                            value={cookedWeights[i] || ''}
                                            onChange={e => setCookedWeights({...cookedWeights, [i]: e.target.value})}
                                            style={{ width: '80px', outline: 'none', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', color: '#f59e0b', fontSize: '0.75rem', padding: '0.2rem' }}
                                        />
                                        {cookedWeights[i] && !isNaN(parseFloat(cookedWeights[i])) && (
                                            <span style={{fontSize: '0.7rem', color: '#94a3b8'}}>
                                                ➔ <span style={{color: '#38bdf8'}}>{Math.round(parseFloat(cookedWeights[i]) * ratioAxelIng)}g</span> · <span style={{color: '#a78bfa'}}>{Math.round(parseFloat(cookedWeights[i]) * (1 - ratioAxelIng))}g</span>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Calculateur de poele complet */}
                <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                    <div style={{fontSize: '0.75rem', color: '#fcd34d', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                        🥘 PLAT UNIQUE ? (TOUT MÉLANGÉ)
                    </div>
                    <div style={{color: '#64748b', fontSize: '0.65rem', fontStyle: 'italic', marginBottom: '0.4rem', marginTop: '0.2rem'}}>Répartition calculée selon les besoins caloriques de chacun.</div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="number" 
                            className="ri-hide-spin"
                            placeholder="Poids total (g)" 
                            value={globalWeight} 
                            onChange={e => setGlobalWeight(e.target.value)} 
                            style={{ width: '130px', outline: 'none', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', padding: '0.4rem 0.5rem', fontWeight: 'bold' }}
                        />
                        {globalWeight && !isNaN(parseFloat(globalWeight)) && parseFloat(globalWeight) > 0 && (
                            <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>
                                ➔ Axel: <b style={{color: '#38bdf8'}}>{Math.round(parseFloat(globalWeight) * ratioKcalAxel)}g</b> | Prisca: <b style={{color: '#a78bfa'}}>{Math.round(parseFloat(globalWeight) * (1 - ratioKcalAxel))}g</b>
                            </span>
                        )}
                    </div>
                </div>

                {/* Calculateur Cru/Cuit Type PST */}
                <div style={{ marginTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
                    <div style={{fontSize: '0.75rem', color: '#38bdf8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                        ⚖️ RATIO CRU ➔ CUIT MANUEL (Ex: PST, Pâtes)
                    </div>
                    <div style={{color: '#64748b', fontSize: '0.65rem', fontStyle: 'italic', marginBottom: '0.4rem', marginTop: '0.2rem'}}>Idéal pour les produits dont le volume change selon cuisson.</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.4rem' }}>
                        <input type="number" className="ri-hide-spin" placeholder="Poids Cru total (g)" value={calcCru} onChange={e => setCalcCru(e.target.value)} style={{ width: '120px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.3)', color: '#fff', padding: '0.35rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }} />
                        <span style={{color: '#64748b', fontSize: '0.75rem'}}>donne</span>
                        <input type="number" className="ri-hide-spin" placeholder="Poids Cuit pesé (g)" value={calcCuit} onChange={e => setCalcCuit(e.target.value)} style={{ width: '130px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.3)', color: '#fff', padding: '0.35rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }} />
                        {calcCru && calcCuit && !isNaN(parseFloat(calcCuit)/parseFloat(calcCru)) && parseFloat(calcCru) !== 0 && (
                            <span style={{fontSize: '0.75rem', color: '#38bdf8', fontWeight: 'bold'}}>
                                (Ratio: {(parseFloat(calcCuit)/parseFloat(calcCru)).toFixed(2)}x)
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.4rem' }}>
                        <input type="number" className="ri-hide-spin" placeholder="Part crue requise (g)" value={calcPart} onChange={e => setCalcPart(e.target.value)} style={{ width: '140px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.35rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }} />
                        {calcCru && calcCuit && calcPart && parseFloat(calcCru) !== 0 && (
                            <span style={{fontSize: '0.8rem', color: '#e2e8f0'}}>
                                ➔ Sert <b style={{color: '#38bdf8'}}>{Math.round(parseFloat(calcPart) * (parseFloat(calcCuit)/parseFloat(calcCru)))}g</b> dans l'assiette.
                            </span>
                        )}
                    </div>
                </div>

                {totalData.some(ing => ing.itemPrice > 0) && (
                    <div style={{ marginTop: '1.25rem', borderTop: '1px dotted rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                        <h4 style={{fontSize: '0.75rem', color: '#10b981', margin: '0 0 0.5rem 0'}}>💶 DÉTAIL DES COURSES (POUR CE REPAS)</h4>
                        {totalData.map((ing, i) => ing.itemPrice > 0 ? (
                            <div key={i} style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.02)', padding: '0.25rem 0'}}>
                                <span>{ing.totalQty}{ing.unit} {ing.ingredient}</span>
                                <span style={{color: '#10b981'}}>{((ing.totalQty / ing.qty) * ing.itemPrice).toFixed(2)}€</span>
                            </div>
                        ) : null)}
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold', paddingTop: '0.5rem', borderTop: '1px solid rgba(16,185,129,0.3)', marginTop: '0.3rem'}}>
                            <span>COÛT TOTAL :</span>
                            <span style={{color: '#10b981', fontSize: '0.9rem'}}>{(totalCostRaw * (coefAxel + coefPrisca)).toFixed(2)}€</span>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {renderTable('Axel', scaledAxel, '#38bdf8', setCoefAxel, coefAxel, targetAxel, overridesAxel, setOverridesAxel, budgetAxel, totalCostRaw)}
                {renderTable('Prisca', scaledPrisca, '#a78bfa', setCoefPrisca, coefPrisca, targetPrisca, overridesPrisca, setOverridesPrisca, budgetPrisca, totalCostRaw)}
            </div>
        </div>
    );
};

// ─── Modal ─────────────────────────────────────────────────────────────────────
const RecipeDetailModal = ({ recipe, budgetAxel, budgetPrisca, onClose }) => {
    const [sections, setSections] = useState([]);
    const [loadingMd, setLoadingMd] = useState(true);
    const [totalCoef, setTotalCoef] = useState(0);

    useEffect(() => {
        if (!recipe.file) { setLoadingMd(false); return; }
        fetch(`/recipes/${recipe.file}`)
            .then(r => r.text())
            .then(text => { setSections(parseMarkdownSections(text)); setLoadingMd(false); })
            .catch(() => setLoadingMd(false));
    }, [recipe.file]);

    // Prix : re-parser pour affichage détaillé (markdown déjà en cache navigateur)
    const priceSection = sections.find(s => /prix/i.test(s.title));
    const priceItems   = priceSection ? parsePriceLines(priceSection.items) : [];
    // Utilise totalCost pré-calculé à l'init (ou recalcule si nécessaire)
    const totalCost    = recipe.totalCost ?? priceItems.reduce((s, p) => s + p.price, 0);

    // Parsing de la Matrice Intelligente
    const matrixSection = sections.find(s => /matrice|ingrédient/i.test(s.title) && s.items.some(l => l.includes('| Kcal |') || l.includes('| Divisible |')));
    const ingredientsMatrix = matrixSection ? parseMarkdownTable(matrixSection.items) : null;

    // Sections contenu (hors prix, portions et matrice)
    const contentSections = sections.filter(s =>
        !/prix/i.test(s.title) && !/portions/i.test(s.title) && s !== matrixSection
    );

    // Portions depuis l'objet recipe (pré-chargées à l'init)
    const portionItems = recipe.portionData || [];

    // Prix par base_unit auto-calculé depuis recipe_yield
    // recipe_yield = "1500g" → poids total du pain
    // base_unit   = "100g"  → 1 portion nutritionnelle
    // → prix/100g = 1.93 / (1500/100) = 0.13€
    const yieldGrams = recipe.recipe_yield ? parseFloat(recipe.recipe_yield) : null;
    const baseGrams  = recipe.base_unit    ? parseFloat(recipe.base_unit)    : null;
    const autoPrice  = (yieldGrams && baseGrams && baseGrams > 0 && totalCost > 0)
        ? totalCost / (yieldGrams / baseGrams)
        : null;

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem'
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'rgba(15,23,42,0.99)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                width: '100%', maxWidth: '780px',
                maxHeight: '85vh', overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}>
                {/* Poignée */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 0 0.25rem' }}>
                    <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
                </div>

                {/* Header sticky */}
                <div style={{
                    padding: '0.75rem 1.25rem',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    position: 'sticky', top: 0,
                    background: 'rgba(15,23,42,0.99)', zIndex: 1
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '2rem', lineHeight: 1 }}>{recipe.emoji}</span>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem', lineHeight: 1.2 }}>
                                    {recipe.name}
                                </h2>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {recipe.prep_active ? (
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>🧑‍🍳 {recipe.prep_active} <span style={{opacity: 0.5}}>(actif)</span> {recipe.prep_inactive && ` · ⏳ ${recipe.prep_inactive} (repos)`}</span>
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>⏱ {recipe.prep}</span>
                                    )}
                                    {totalCost > 0 && totalCoef > 0 && (
                                        <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                            <Euro size={10} /> {(totalCost * totalCoef).toFixed(2)}€ pour ce repas
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.07)', border: 'none', color: '#94a3b8',
                            width: '34px', height: '34px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', flexShrink: 0, touchAction: 'manipulation'
                        }}>
                            <X size={17} />
                        </button>
                    </div>
                </div>

                <div style={{ padding: '1.25rem 1.25rem 2.5rem' }}>
                    {loadingMd ? (
                        <p style={{ color: '#475569', textAlign: 'center', padding: '2rem' }}>Chargement...</p>
                    ) : (
                        <>
                            {/* Scaler Intelligent dynamique */}
                            {ingredientsMatrix && budgetAxel && budgetPrisca && (
                                <InteractiveRecipeScaler
                                    ingredientsConfig={ingredientsMatrix}
                                    budgetAxel={budgetAxel}
                                    budgetPrisca={budgetPrisca}
                                    totalCostRaw={totalCost}
                                    onTotalCoefChange={setTotalCoef}
                                    recipeId={recipe.id}
                                />
                            )}
                            {/* Portions habituelles */}
                            {portionItems.length > 0 && (
                                <div style={{
                                    marginBottom: '1.5rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px', padding: '1rem'
                                }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                        🍽️ Portions habituelles
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {portionItems.map((p, i) => {
                                            const color = getPersonColor(p.name);
                                            return (
                                                <div key={i} style={{
                                                    display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                                                    background: `${color}12`, border: `1px solid ${color}30`,
                                                    borderRadius: '8px', padding: '0.6rem 0.75rem'
                                                }}>
                                                    <span style={{ color, fontWeight: 800, fontSize: '0.85rem', flexShrink: 0, minWidth: '50px' }}>{p.name}</span>
                                                    <span style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.4 }}>{p.value}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Sections recette */}
                            {contentSections.map(section => (
                                <div key={section.title} style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{
                                        fontSize: '0.78rem', fontWeight: 800, color: '#0ea5e9',
                                        letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.6rem'
                                    }}>
                                        {section.title}
                                    </h3>
                                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        {section.items.map((item, i) => (
                                            <li key={i} style={{
                                                display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
                                                fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5,
                                                padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)'
                                            }}>
                                                <span style={{ color: '#334155', flexShrink: 0, marginTop: '0.1rem' }}>
                                                    {/^\d+\./.test(item) ? item.match(/^(\d+)\./)?.[1] + '.' : '•'}
                                                </span>
                                                <span>{formatLine(item)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}



                            {!recipe.file && (
                                <p style={{ color: '#475569', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                                    Pas de fiche détaillée disponible pour cette recette.
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '2rem' }}>
                                <button
                                    onClick={() => {
                                        const textD = `Recette: ${recipe.name}\n${recipe.link || ''}\n${recipe.description}`;
                                        if (navigator.share) navigator.share({ title: recipe.name, text: textD, url: recipe.link || window.location.href }).catch(()=>{});
                                        else navigator.clipboard.writeText(textD);
                                        const btn = document.activeElement;
                                        if (btn) { const old = btn.innerText; btn.innerText = "✓ Partagé !"; setTimeout(()=>btn.innerText=old, 2000); }
                                    }}
                                    style={{ flex: 1, padding: '0.75rem', background: '#38bdf820', color: '#38bdf8', border: '1px solid #38bdf840', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s', touchAction: 'manipulation' }}
                                >
                                    📤 Partager la recette
                                </button>
                                {recipe.link && recipe.link.split(' ').map((lnk, idx) => (
                                    <a key={idx} href={lnk} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        <ExternalLink size={15} /> Voir l'original
                                    </a>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Carte Recette ─────────────────────────────────────────────────────────────
const RecipeCard = ({ recipe, budgetAxel, budgetPrisca, onDetail }) => {
    // Si la recette a des portions fixes → les afficher directement
    // Sinon → calculer selon le budget calorique du repas sélectionné
    const hasFixedPortions = recipe.portionData && recipe.portionData.length > 0;
    const isTarget         = !hasFixedPortions && !!budgetAxel && !!budgetPrisca;

    const coefAxel   = isTarget && recipe.kcal > 0 ? budgetAxel.kcal   / recipe.kcal : 1;
    const coefPrisca = isTarget && recipe.kcal > 0 ? budgetPrisca.kcal / recipe.kcal : 1;
    const links      = recipe.link ? recipe.link.split(' ').filter(Boolean) : [];

    const formatPortion = coef =>
        Math.abs(coef - Math.round(coef)) < 0.1 ? Math.round(coef) : coef.toFixed(1);

    // Prix par gramme (pour portions fixes et portions calorie-based)
    const yieldGrams   = recipe.recipe_yield ? parseFloat(recipe.recipe_yield) : null;
    const baseGrams    = recipe.base_unit    ? parseFloat(recipe.base_unit)    : null;
    const pricePerGram = (yieldGrams && yieldGrams > 0 && recipe.totalCost)
        ? recipe.totalCost / yieldGrams
        : null;
    const pricePerBase = (pricePerGram && baseGrams)
        ? pricePerGram * baseGrams
        : null;

    return (
        <div className="card ri-card" style={{ borderTop: `3px solid ${recipe.accent}`, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{recipe.emoji}</span>
                <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', margin: 0, lineHeight: 1.3 }}>{recipe.name}</h3>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.3rem', alignItems: 'center' }}>
                        {recipe.prep_active ? (
                            <span className="ri-prep-time">🧑‍🍳 {recipe.prep_active} {recipe.prep_inactive && `· ⏳ ${recipe.prep_inactive}`}</span>
                        ) : (
                            <span className="ri-prep-time">⏱ {recipe.prep}</span>
                        )}
                        {recipe.totalCost !== null && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '2px',
                                background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                padding: '0.1rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem'
                            }}>
                                <Euro size={10} /> {recipe.totalCost.toFixed(2)}€ recette
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 0.75rem', flexGrow: 1 }}>{recipe.description}</p>

            {/* ── Portions fixes (pain, recettes habituelles) ── */}
            {hasFixedPortions && (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.65rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                    <div style={{ color: '#64748b', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        🍽️ Portions habituelles
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {recipe.portionData.map(p => {
                            const color    = getPersonColor(p.name);
                            const qty      = extractQty(p.value);
                            const qtyNum   = parseFloat(qty);
                            const portionPrice = (pricePerGram && !isNaN(qtyNum))
                                ? qtyNum * pricePerGram
                                : null;
                            return (
                                <div key={p.name} style={{
                                    background: `${color}12`, border: `1px solid ${color}30`,
                                    borderRadius: '6px', padding: '0.4rem 0.75rem', textAlign: 'center',
                                    minWidth: '70px'
                                }}>
                                    <div style={{ color, fontSize: '0.72rem', marginBottom: '0.15rem' }}>{p.name}</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{qty}</div>
                                    {portionPrice !== null && (
                                        <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '0.1rem' }}>
                                            ~{portionPrice.toFixed(2)}€
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Portions calculées selon budget calorique (recettes génériques) ── */}
            {isTarget && (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.65rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                    <div style={{ color: recipe.accent, fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                        <Scale size={12} /> Portions à préparer
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        {[
                            { label: 'Axel',   color: '#38bdf8', coef: coefAxel,   bg: 'rgba(56,189,248,0.08)',   bd: 'rgba(56,189,248,0.25)'   },
                            { label: 'Prisca', color: '#a78bfa', coef: coefPrisca, bg: 'rgba(167,139,250,0.08)', bd: 'rgba(167,139,250,0.25)' }
                        ].map(({ label, color, coef, bg, bd }) => (
                            <div key={label} style={{ background: bg, padding: '0.45rem', borderRadius: '6px', border: `1px solid ${bd}`, textAlign: 'center' }}>
                                <div style={{ color, fontSize: '0.72rem', marginBottom: '0.15rem' }}>{label}</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>{formatPortion(coef)} × {recipe.base_unit}</div>
                                {pricePerBase !== null && (
                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>~{(coef * pricePerBase).toFixed(2)}€</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Macros */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.4rem', textAlign: 'center' }}>
                    Pour {recipe.base_unit}
                </div>
                <div className="ri-macros">
                    <MacroBadge val={Math.round(recipe.kcal)} unit="kcal" color={recipe.accent} label="Énergie" />
                    <MacroBadge val={Math.round(recipe.prot)} unit="g"    color="#4ade80" label="Prot." />
                    <MacroBadge val={Math.round(recipe.lip)}  unit="g"    color="#fb923c" label="Lip." />
                    <MacroBadge val={Math.round(recipe.glu)}  unit="g"    color="#facc15" label="Glu." />
                </div>
            </div>

            {/* Tags */}
            <div className="ri-tags" style={{ marginBottom: '0.6rem' }}>
                {recipe.category.map(cat => <span key={cat} className="ri-tag">{cat}</span>)}
            </div>

            {recipe.tips && (
                <div className="ri-tip" style={{ marginBottom: '0.75rem' }}>
                    <span>💡</span><span>{recipe.tips}</span>
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                <button
                    onClick={() => onDetail(recipe)}
                    style={{
                        flex: '1 1 120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                        padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer',
                        background: `${recipe.accent}1a`, border: `1px solid ${recipe.accent}55`,
                        color: recipe.accent, fontFamily: 'inherit', fontSize: '0.84rem', fontWeight: 600,
                        transition: 'all 0.2s', touchAction: 'manipulation'
                    }}
                >
                    <ChevronDown size={15} /> Voir la recette
                </button>
                {links.map((lnk, idx) => (
                    <a key={idx} href={lnk} target="_blank" rel="noopener noreferrer"
                        className="ri-link-btn" style={{ flex: '1 1 120px' }}>
                        <ExternalLink size={15} />
                        {links.length > 1 ? `Lien ${idx + 1}` : 'Lien externe'}
                    </a>
                ))}
            </div>
        </div>
    );
};

// ─── Composant Principal ───────────────────────────────────────────────────────
const RecipeIdeas = ({ profiles }) => {
    const [recipes,      setRecipes]      = useState([]);
    const [search,       setSearch]       = useState('');
    const [activeTags,   setActiveTags]   = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [targetMeal,   setTargetMeal]   = useState('soir');
    const [detailRecipe, setDetailRecipe] = useState(null);
    const [showBatch,    setShowBatch]    = useState(false); // recettes batch masquées par défaut

    const ACCENTS = ['#38bdf8','#818cf8','#f59e0b','#4ade80','#fb923c','#f87171','#a78bfa','#fbbf24'];

    useEffect(() => {
        const loadAll = async () => {
            try {
                const data = await fetch('/recipes/manifest.json').then(r => r.json());

                // Pré-charger tous les markdowns en parallèle
                // → permet d'auto-calculer les prix et les portions fixes sans attendre l'ouverture du modal
                const mdTexts = await Promise.all(
                    data.map(row =>
                        row.file
                            ? fetch(`/recipes/${row.file}`).then(r => r.text()).catch(() => '')
                            : Promise.resolve('')
                    )
                );

                const loadedRecipes = data.map((row, i) => {
                    const sections = mdTexts[i] ? parseMarkdownSections(mdTexts[i]) : [];

                    // Prix auto depuis "### Prix des ingrédients"
                    const priceSection = sections.find(s => /prix/i.test(s.title));
                    const priceItems   = priceSection ? parsePriceLines(priceSection.items) : [];
                    let totalCost      = priceItems.reduce((sum, p) => sum + p.price, 0);

                    // Si pas de section de prix (nouveau format), on prend le row.price global
                    if (totalCost === 0 && row.price) {
                        totalCost = parseFloat(row.price);
                    }

                    // Portions fixes depuis "### Portions consommées"
                    const portionSection = sections.find(s => /portions/i.test(s.title));
                    const portionData    = portionSection ? parsePortionLines(portionSection.items) : [];

                    return {
                        id:           row.id || i,
                        file:         row.file || null,
                        name:         row.name || 'Recette sans nom',
                        category:     row.category ? row.category.split('|').map(s => s.trim()) : [],
                        base_unit:    row.base_unit || '1 portion',
                        recipe_yield: row.recipe_yield || null,
                        kcal:  Number(row.kcal) || 0,
                        prot:  Number(row.prot) || 0,
                        lip:   Number(row.lip)  || 0,
                        glu:   Number(row.glu)  || 0,
                        totalCost:  totalCost > 0 ? totalCost : null,
                        portionData,
                        prep:         row.prep || '',
                        prep_active:  row.prep_active || '',
                        prep_inactive:row.prep_inactive || '',
                        description:  row.description || '',
                        tips:         row.tips || '',
                        link:         row.link || '',
                        emoji:        row.emoji || '🍽️',
                        isBatch:      row.scalable === true || row.scalable === 'true',
                        accent:       ACCENTS[i % ACCENTS.length]
                    };
                });
                setRecipes(loadedRecipes);
                const hashMatch = window.location.hash.match(/#recipe-(.+)/);
                if (hashMatch) {
                    const r = loadedRecipes.find(x => String(x.id) === hashMatch[1]);
                    if (r) setDetailRecipe(r);
                }
            } catch {
                setRecipes([]);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, []);

    // Escape pour fermer
    useEffect(() => {
        if (!detailRecipe) return;
        const handler = e => { if (e.key === 'Escape') setDetailRecipe(null); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [detailRecipe]);

    // Bloquer scroll body quand modal ouvert
    useEffect(() => {
        document.body.style.overflow = detailRecipe ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [detailRecipe]);

    const handleDetail = (recipe) => {
        window.history.replaceState(null, null, `#recipe-${recipe.id}`);
        setDetailRecipe(recipe);
    };

    const handleCloseModal = () => {
        window.history.replaceState(null, null, ' ');
        setDetailRecipe(null);
    };

    // Filtres
    const addFilter = (tag) => {
        if (activeTags.includes(tag)) setActiveTags(activeTags.filter(t => t !== tag));
        else setActiveTags([...activeTags, tag]);
    };

    const isFast = r => /10\s*min|15\s*min/i.test(r.prep_active || r.prep);
    const isProtéiné  = r => r.prot >= 90; // Pour la recette de base
    const isCheap = r => r.totalCost !== null && r.totalCost <= 6;

    const allCategories = [...new Set(recipes.flatMap(r => r.category))].sort();

    const filtered = recipes.filter(r => {
        if (r.isBatch && !showBatch) return false;        // masquer batch par défaut
        const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
                            r.description.toLowerCase().includes(search.toLowerCase());
        const matchTags = activeTags.length === 0 || activeTags.every(t => {
            if (t === 'Rapide') return isFast(r);
            if (t === 'Protéiné') return isProtéiné(r);
            if (t === 'Pas cher') return isCheap(r);
            return r.category.includes(t);
        });
        return matchSearch && matchTags;
    });
    const batchCount = recipes.filter(r => r.isBatch).length;

    if (loading) return null;

    const budgetAxel   = profiles?.axel   ? getMealBudget('axel',   profiles, targetMeal) : null;
    const budgetPrisca = profiles?.prisca ? getMealBudget('prisca', profiles, targetMeal) : null;

    return (
        <div className="section-container animate-fade-in">
            {detailRecipe && (
                <RecipeDetailModal 
                    recipe={detailRecipe} 
                    budgetAxel={budgetAxel} 
                    budgetPrisca={budgetPrisca} 
                    onClose={handleCloseModal} 
                />
            )}

            <div style={{ marginBottom: '1rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    <BookMarked size={22} /> Idées Recettes
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                    Choisis le repas pour voir les portions à préparer à la place du plan habituel.
                </p>
            </div>

            {/* Sélecteur Repas Midi / Soir */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <div style={{
                    display: 'flex', gap: '0.4rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', padding: '0.35rem'
                }}>
                    {[
                        { key: 'midi', label: '☀️ Repas Midi', activeColor: '#38bdf8', activeBorder: 'rgba(14,165,233,0.3)' },
                        { key: 'soir', label: '🌙 Repas Soir', activeColor: '#a78bfa', activeBorder: 'rgba(139,92,246,0.3)'  },
                    ].map(({ key, label, activeColor, activeBorder }) => (
                        <button key={key} onClick={() => setTargetMeal(key)} style={{
                            padding: '0.55rem 1.2rem', borderRadius: '8px', cursor: 'pointer',
                            background: targetMeal === key ? 'var(--bg-deep, #0a0f1a)' : 'transparent',
                            border: targetMeal === key ? `1px solid ${activeBorder}` : '1px solid transparent',
                            color: targetMeal === key ? activeColor : '#64748b',
                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.88rem',
                            display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s',
                            whiteSpace: 'nowrap', touchAction: 'manipulation'
                        }}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Recherche + Filtres */}
            <div className="ri-controls">
                <div className="ri-search-wrap">
                    <Search size={16} className="ri-search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher une recette..."
                        className="ri-search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="ri-tags-filter">
                    <Tag size={13} style={{ color: '#64748b', flexShrink: 0 }} />
                    <button className={`ri-tag-btn ${activeTags.length === 0 ? 'ri-tag-active' : ''}`} onClick={() => setActiveTags([])}>Toutes</button>
                    {['Rapide', 'Protéiné', 'Pas cher', ...allCategories].map(cat => (
                        <button key={cat} className={`ri-tag-btn ${activeTags.includes(cat) ? 'ri-tag-active' : ''}`}
                            onClick={() => addFilter(cat)}>
                            {cat}
                        </button>
                    ))}
                    {/* Toggle recettes Batch */}
                    {batchCount > 0 && (
                        <button
                            onClick={() => setShowBatch(s => !s)}
                            style={{
                                padding: '0.22rem 0.65rem', borderRadius: '20px', fontSize: '0.73rem',
                                fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                                border: `1px solid ${showBatch ? '#38bdf8' : '#334155'}`,
                                background: showBatch ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
                                color: showBatch ? '#38bdf8' : '#475569',
                                transition: 'all 0.15s',
                            }}
                        >
                            🧑‍🍳 Batch{showBatch ? ` (${batchCount})` : ` +${batchCount}`}
                        </button>
                    )}
                </div>
            </div>

            <p className="ri-count">
                {filtered.length} recette{filtered.length > 1 ? 's' : ''}
                {activeTags.length > 0 ? ` · ${activeTags.join(', ')}` : ''}{search ? ` · "${search}"` : ''}
                {!showBatch && batchCount > 0 && (
                    <span style={{ color: '#334155', marginLeft: '0.5rem', fontSize: '0.82em' }}>
                        · {batchCount} batch masquée{batchCount > 1 ? 's' : ''}
                    </span>
                )}
            </p>

            {filtered.length > 0 ? (
                <div className="ri-grid">
                    {filtered.map(recipe => (
                        <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            budgetAxel={budgetAxel}
                            budgetPrisca={budgetPrisca}
                            onDetail={handleDetail}
                        />
                    ))}
                </div>
            ) : (
                <div className="ri-empty">
                    <span>🔍</span>
                    <p>Aucune recette trouvée. Essayez un autre mot-clé.</p>
                </div>
            )}
        </div>
    );
};

export default RecipeIdeas;
