import React, { useState, useEffect } from 'react';
import { BookMarked, ExternalLink, Search, Tag, Scale, X, ChevronDown, Euro } from 'lucide-react';
import { getMealBudget } from '../utils/dietAlgo';

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
const RecipeDetailModal = ({ recipe, onClose }) => {
    const [sections, setSections] = useState([]);
    const [loadingMd, setLoadingMd] = useState(true);

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

    // Sections contenu (hors prix et portions)
    const contentSections = sections.filter(s =>
        !/prix/i.test(s.title) && !/portions/i.test(s.title)
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
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'rgba(15,23,42,0.99)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px 20px 0 0',
                width: '100%', maxWidth: '760px',
                maxHeight: '92dvh', overflowY: 'auto',
                boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
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
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>⏱ {recipe.prep}</span>
                                    {totalCost > 0 && (
                                        <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                            <Euro size={10} /> {totalCost.toFixed(2)}€ recette
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

                            {/* Section Prix */}
                            {priceItems.length > 0 && (
                                <div style={{
                                    marginTop: '0.5rem',
                                    background: 'rgba(16,185,129,0.06)',
                                    border: '1px solid rgba(16,185,129,0.2)',
                                    borderRadius: '12px', padding: '1rem'
                                }}>
                                    <h3 style={{
                                        fontSize: '0.78rem', fontWeight: 800, color: '#10b981',
                                        letterSpacing: '1px', textTransform: 'uppercase',
                                        marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
                                    }}>
                                        <Euro size={13} /> Coût des ingrédients
                                    </h3>
                                    {priceItems.map((item, i) => (
                                        <div key={i} style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            fontSize: '0.83rem'
                                        }}>
                                            <span style={{ color: '#94a3b8' }}>{item.label}</span>
                                            <span style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>{item.price.toFixed(2)}€</span>
                                        </div>
                                    ))}
                                    <div style={{ paddingTop: '0.65rem', marginTop: '0.25rem', borderTop: '2px solid rgba(16,185,129,0.3)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                                            <span style={{ color: '#e2e8f0' }}>
                                                Total recette
                                                {recipe.recipe_yield && (
                                                    <span style={{ color: '#64748b', fontWeight: 400, fontSize: '0.78rem' }}> · {recipe.recipe_yield}</span>
                                                )}
                                            </span>
                                            <span style={{ color: '#10b981' }}>{totalCost.toFixed(2)}€</span>
                                        </div>
                                        {autoPrice !== null && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                                <span style={{ color: '#64748b' }}>Prix / {recipe.base_unit} (calculé)</span>
                                                <span style={{ color: '#34d399', fontFamily: 'monospace', fontWeight: 700 }}>~{autoPrice.toFixed(2)}€</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!recipe.file && (
                                <p style={{ color: '#475569', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                                    Pas de fiche détaillée disponible pour cette recette.
                                </p>
                            )}
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
                        <span className="ri-prep-time">⏱ {recipe.prep}</span>
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
    const [activeTag,    setActiveTag]    = useState(null);
    const [loading,      setLoading]      = useState(true);
    const [targetMeal,   setTargetMeal]   = useState('midi');
    const [detailRecipe, setDetailRecipe] = useState(null);

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

                setRecipes(data.map((row, i) => {
                    const sections = mdTexts[i] ? parseMarkdownSections(mdTexts[i]) : [];

                    // Prix auto depuis "### Prix des ingrédients"
                    const priceSection = sections.find(s => /prix/i.test(s.title));
                    const priceItems   = priceSection ? parsePriceLines(priceSection.items) : [];
                    const totalCost    = priceItems.reduce((sum, p) => sum + p.price, 0);

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
                        description:  row.description || '',
                        tips:         row.tips || '',
                        link:         row.link || '',
                        emoji:        row.emoji || '🍽️',
                        accent:       ACCENTS[i % ACCENTS.length]
                    };
                }));
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

    const allCategories = [...new Set(recipes.flatMap(r => r.category))].sort();

    const filtered = recipes.filter(r => {
        const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
                            r.description.toLowerCase().includes(search.toLowerCase());
        return matchSearch && (!activeTag || r.category.includes(activeTag));
    });

    if (loading) return (
        <div className="section-container" style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            Chargement des recettes...
        </div>
    );

    const budgetAxel   = profiles?.axel   ? getMealBudget('axel',   profiles, targetMeal) : null;
    const budgetPrisca = profiles?.prisca ? getMealBudget('prisca', profiles, targetMeal) : null;

    return (
        <div className="section-container animate-fade-in">
            {detailRecipe && (
                <RecipeDetailModal recipe={detailRecipe} onClose={() => setDetailRecipe(null)} />
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
                    <button className={`ri-tag-btn ${!activeTag ? 'ri-tag-active' : ''}`} onClick={() => setActiveTag(null)}>Toutes</button>
                    {allCategories.map(cat => (
                        <button key={cat} className={`ri-tag-btn ${activeTag === cat ? 'ri-tag-active' : ''}`}
                            onClick={() => setActiveTag(activeTag === cat ? null : cat)}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <p className="ri-count">
                {filtered.length} recette{filtered.length > 1 ? 's' : ''}
                {activeTag ? ` · ${activeTag}` : ''}{search ? ` · "${search}"` : ''}
            </p>

            {filtered.length > 0 ? (
                <div className="ri-grid">
                    {filtered.map(recipe => (
                        <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            budgetAxel={budgetAxel}
                            budgetPrisca={budgetPrisca}
                            onDetail={setDetailRecipe}
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
