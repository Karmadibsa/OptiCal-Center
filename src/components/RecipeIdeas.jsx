import React, { useState, useEffect, useCallback } from 'react';
import { BookMarked, ExternalLink, Search, Tag, Scale, X, ChevronDown, ChevronUp, Euro } from 'lucide-react';
import { getMealBudget } from '../utils/dietAlgo';

// ─── Badge macros ────────────────────────────────────────────────────────────
const MacroBadge = ({ val, unit, color, label }) => (
    <div className="ri-macro-badge">
        <span className="ri-macro-val" style={{ color }}>{val}</span>
        <span className="ri-macro-unit">{unit}</span>
        <span className="ri-macro-label">{label}</span>
    </div>
);

// ─── Parseur Markdown simple ─────────────────────────────────────────────────
// Retourne un tableau de sections { title, items: string[] }
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

// Extrait les lignes de prix depuis une section "Prix des ingrédients"
// Format attendu : "- Ingrédient (quantité) : 0.50€"
const parsePriceLines = (items) =>
    items
        .filter(l => l.startsWith('- '))
        .map(l => {
            const m = l.match(/^-\s+(.+?)\s*:\s*([\d.]+)€/);
            return m ? { label: m[1].trim(), price: parseFloat(m[2]) } : null;
        })
        .filter(Boolean);

// ─── Modal Détail Recette ────────────────────────────────────────────────────
const RecipeDetailModal = ({ recipe, onClose }) => {
    const [sections, setSections] = useState([]);
    const [loadingMd, setLoadingMd] = useState(true);

    useEffect(() => {
        if (!recipe.file) { setLoadingMd(false); return; }
        fetch(`/recipes/${recipe.file}`)
            .then(r => r.text())
            .then(text => {
                setSections(parseMarkdownSections(text));
                setLoadingMd(false);
            })
            .catch(() => setLoadingMd(false));
    }, [recipe.file]);

    const priceSection = sections.find(s => /prix/i.test(s.title));
    const priceItems   = priceSection ? parsePriceLines(priceSection.items) : [];
    const totalCost    = priceItems.reduce((s, p) => s + p.price, 0);
    const contentSections = sections.filter(s => !/prix/i.test(s.title));

    // Formater une ligne markdown basique : **bold**, *italic*, texte libre
    const formatLine = (line) => {
        const cleaned = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
        const parts = [];
        const regex = /\*\*(.+?)\*\*|\*(.+?)\*|\*(.+?)\*/g;
        let last = 0; let m;
        while ((m = regex.exec(cleaned)) !== null) {
            if (m.index > last) parts.push(cleaned.slice(last, m.index));
            if (m[1]) parts.push(<strong key={m.index} style={{ color: '#e2e8f0' }}>{m[1]}</strong>);
            else parts.push(<em key={m.index} style={{ color: '#94a3b8' }}>{m[2] || m[3]}</em>);
            last = m.index + m[0].length;
        }
        if (last < cleaned.length) parts.push(cleaned.slice(last));
        return parts;
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem'
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '20px', maxWidth: '760px', width: '100%',
                    maxHeight: '90vh', overflowY: 'auto', position: 'relative',
                    boxShadow: '0 30px 80px rgba(0,0,0,0.6)'
                }}
            >
                {/* Header */}
                <div style={{ padding: '1.75rem 2rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, background: 'rgba(15,23,42,0.98)', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{recipe.emoji}</span>
                            <div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>{recipe.name}</h2>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>⏱ {recipe.prep}</span>
                                    {recipe.price && (
                                        <span style={{ fontSize: '0.78rem', color: '#10b981' }}>
                                            <Euro size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {recipe.price}€ / {recipe.base_unit}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: '#94a3b8', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div style={{ padding: '1.5rem 2rem 2rem' }}>
                    {loadingMd ? (
                        <p style={{ color: '#475569', textAlign: 'center', padding: '2rem' }}>Chargement de la recette...</p>
                    ) : (
                        <>
                            {/* Sections de la recette */}
                            {contentSections.map(section => (
                                <div key={section.title} style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0ea5e9', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                        {section.title}
                                    </h3>
                                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        {section.items.map((item, i) => (
                                            <li key={i} style={{
                                                display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
                                                fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5,
                                                padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)'
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
                                <div style={{ marginTop: '1.5rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '1.25rem' }}>
                                    <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Euro size={14} /> Coût des ingrédients
                                    </h3>
                                    {priceItems.map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                                            <span style={{ color: '#94a3b8' }}>{item.label}</span>
                                            <span style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>{item.price.toFixed(2)}€</span>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', marginTop: '0.25rem', borderTop: '2px solid rgba(16,185,129,0.3)', fontWeight: 800, fontSize: '0.95rem' }}>
                                        <span style={{ color: '#e2e8f0' }}>TOTAL recette</span>
                                        <span style={{ color: '#10b981' }}>{totalCost.toFixed(2)}€</span>
                                    </div>
                                    {recipe.price && (
                                        <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                            → {recipe.price}€ / {recipe.base_unit} · Modifiable dans le fichier <code style={{ color: '#94a3b8' }}>{recipe.file}</code>
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Pas de détail dispo */}
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

// ─── Carte Recette ───────────────────────────────────────────────────────────
const RecipeCard = ({ recipe, budgetAxel, budgetPrisca, onDetail }) => {
    const isTarget   = !!budgetAxel && !!budgetPrisca;
    const coefAxel   = isTarget && recipe.kcal > 0 ? (budgetAxel.kcal   / recipe.kcal) : 1;
    const coefPrisca = isTarget && recipe.kcal > 0 ? (budgetPrisca.kcal / recipe.kcal) : 1;
    const links      = recipe.link ? recipe.link.split(' ').filter(Boolean) : [];

    const formatPortion = coef =>
        Math.abs(coef - Math.round(coef)) < 0.1 ? Math.round(coef) : coef.toFixed(1);

    return (
        <div className="card ri-card" style={{ borderTop: `3px solid ${recipe.accent}`, display: 'flex', flexDirection: 'column' }}>
            <div className="ri-card-emoji">{recipe.emoji}</div>
            <div className="ri-card-header">
                <h3 className="ri-card-name">{recipe.name}</h3>
                <div className="ri-card-meta">
                    <span className="ri-prep-time">⏱ {recipe.prep}</span>
                    {recipe.price && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '0.4rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem' }}>
                            <Euro size={11} /> {recipe.price}€/{recipe.base_unit}
                        </span>
                    )}
                </div>
            </div>

            <p className="ri-card-desc" style={{ flexGrow: 1 }}>{recipe.description}</p>

            {/* Portions calculées */}
            {isTarget && (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <div style={{ color: recipe.accent, fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', fontSize: '0.85rem' }}>
                        <Scale size={14} /> Portions à préparer :
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                        {[
                            { label: 'Axel', color: '#38bdf8', coef: coefAxel, bgColor: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.3)' },
                            { label: 'Prisca', color: '#a78bfa', coef: coefPrisca, bgColor: 'rgba(167,139,250,0.1)', borderColor: 'rgba(167,139,250,0.3)' }
                        ].map(({ label, color, coef, bgColor, borderColor }) => (
                            <div key={label} style={{ background: bgColor, padding: '0.5rem', borderRadius: '6px', border: `1px solid ${borderColor}` }}>
                                <div style={{ color, fontSize: '0.78rem', marginBottom: '0.2rem' }}>{label}</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>{formatPortion(coef)} × {recipe.base_unit}</div>
                                {recipe.price && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>~{(coef * recipe.price).toFixed(2)}€</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Macros */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.5rem', textAlign: 'center' }}>
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
            <div className="ri-tags" style={{ marginBottom: '0.75rem' }}>
                {recipe.category.map(cat => <span key={cat} className="ri-tag">{cat}</span>)}
            </div>

            {recipe.tips && (
                <div className="ri-tip" style={{ marginBottom: '1rem' }}>
                    <span>💡</span><span>{recipe.tips}</span>
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                {/* Bouton détail interne */}
                <button
                    onClick={() => onDetail(recipe)}
                    style={{
                        flex: '1 1 120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                        padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer',
                        background: `${recipe.accent}1a`, border: `1px solid ${recipe.accent}55`,
                        color: recipe.accent, fontFamily: 'inherit', fontSize: '0.84rem', fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    <ChevronDown size={15} /> Voir la recette
                </button>
                {/* Liens externes */}
                {links.map((lnk, idx) => (
                    <a key={idx} href={lnk} target="_blank" rel="noopener noreferrer"
                        className="ri-link-btn" style={{ flex: '1 1 120px', minWidth: '110px' }}>
                        <ExternalLink size={15} />
                        {links.length > 1 ? `Lien ${idx + 1}` : 'Lien externe'}
                    </a>
                ))}
            </div>
        </div>
    );
};

// ─── Composant Principal ─────────────────────────────────────────────────────
const RecipeIdeas = ({ profiles }) => {
    const [recipes,     setRecipes]     = useState([]);
    const [search,      setSearch]      = useState('');
    const [activeTag,   setActiveTag]   = useState(null);
    const [loading,     setLoading]     = useState(true);
    const [targetMeal,  setTargetMeal]  = useState('midi');
    const [detailRecipe, setDetailRecipe] = useState(null);

    const ACCENTS = ['#38bdf8','#818cf8','#f59e0b','#4ade80','#fb923c','#f87171','#a78bfa','#fbbf24'];

    useEffect(() => {
        fetch('/recipes/manifest.json')
            .then(r => r.json())
            .then(data => {
                setRecipes(data.map((row, i) => ({
                    id:          row.id || i,
                    file:        row.file || null,
                    name:        row.name || 'Recette sans nom',
                    category:    row.category ? row.category.split('|').map(s => s.trim()) : [],
                    base_unit:   row.base_unit || '1 portion',
                    kcal:  Number(row.kcal)  || 0,
                    prot:  Number(row.prot)  || 0,
                    lip:   Number(row.lip)   || 0,
                    glu:   Number(row.glu)   || 0,
                    price: row.price ? Number(row.price) : null,
                    prep:        row.prep || '',
                    description: row.description || '',
                    tips:        row.tips || '',
                    link:        row.link || '',
                    emoji:       row.emoji || '🍽️',
                    accent:      ACCENTS[i % ACCENTS.length]
                })));
                setLoading(false);
            })
            .catch(() => { setRecipes([]); setLoading(false); });
    }, []);

    // Fermer le modal avec Escape
    useEffect(() => {
        if (!detailRecipe) return;
        const handler = e => { if (e.key === 'Escape') setDetailRecipe(null); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
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
            {/* Modal détail */}
            {detailRecipe && (
                <RecipeDetailModal recipe={detailRecipe} onClose={() => setDetailRecipe(null)} />
            )}

            <div className="ds-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h2><BookMarked size={26} /> Idées Recettes & Portions Cibles</h2>
                    <p className="ds-subtitle">
                        Sélectionne le repas concerné pour voir combien de portions préparer à la place du plan habituel.
                    </p>
                </div>
            </div>

            {/* Sélecteur Repas Midi / Soir */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '0.4rem' }}>
                    <button
                        onClick={() => setTargetMeal('midi')}
                        style={{
                            padding: '0.6rem 1.4rem', borderRadius: '8px', cursor: 'pointer',
                            background: targetMeal === 'midi' ? 'var(--bg-deep)' : 'transparent',
                            border: targetMeal === 'midi' ? '1px solid rgba(14,165,233,0.3)' : '1px solid transparent',
                            color: targetMeal === 'midi' ? '#38bdf8' : '#64748b',
                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s'
                        }}
                    >
                        ☀️ Repas Midi
                    </button>
                    <button
                        onClick={() => setTargetMeal('soir')}
                        style={{
                            padding: '0.6rem 1.4rem', borderRadius: '8px', cursor: 'pointer',
                            background: targetMeal === 'soir' ? 'var(--bg-deep)' : 'transparent',
                            border: targetMeal === 'soir' ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                            color: targetMeal === 'soir' ? '#a78bfa' : '#64748b',
                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s'
                        }}
                    >
                        🌙 Repas Soir
                    </button>
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
                    <Tag size={14} style={{ color: '#64748b', flexShrink: 0 }} />
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
